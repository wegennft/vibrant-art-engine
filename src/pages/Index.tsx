import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Download, Trash2, StopCircle, Flame, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import BeforeAfterCard from "@/components/BeforeAfterCard";
import EnhancePresetTabs from "@/components/EnhancePresetTabs";
import { enhanceImageCanvas } from "@/lib/enhanceImage";
import { ENHANCE_PRESETS } from "@/lib/enhancePresets";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";

interface AlphaDiffStats {
  totalPixels: number;
  transparentOriginal: number;
  pixelsCleared: number;
  violatingPixels: number;
}

const TRANSPARENT_ALPHA = 0;
const FULLY_OPAQUE_ALPHA = 255;
const EDGE_PROTECTION_RADIUS = 2;

interface ImageItem {
  id: string;
  fileName: string;
  originalSrc: string;
  enhancedSrc: string | null;
  isProcessing: boolean;
  error?: string;
  alphaDiff?: AlphaDiffStats;
}

const resizeToMatchOriginal = (originalSrc: string, aiSrc: string, transparencyThreshold = 0.005): Promise<{ dataUrl: string; alphaDiff: AlphaDiffStats }> =>
  new Promise((resolve, reject) => {
    const origImg = new Image();
    origImg.onload = () => {
      const aiImg = new Image();
      aiImg.onload = () => {
        const ow = origImg.naturalWidth;
        const oh = origImg.naturalHeight;
        const canvas = document.createElement("canvas");
        canvas.width = ow;
        canvas.height = oh;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("Canvas context failed")); return; }
        ctx.drawImage(aiImg, 0, 0, ow, oh);
        const origCanvas = document.createElement("canvas");
        origCanvas.width = ow;
        origCanvas.height = oh;
        const origCtx = origCanvas.getContext("2d");
        if (!origCtx) { reject(new Error("Canvas context failed")); return; }
        origCtx.drawImage(origImg, 0, 0);
        const origData = origCtx.getImageData(0, 0, ow, oh);
        const aiData = ctx.getImageData(0, 0, ow, oh);
        const totalPixels = ow * oh;
        let transparentOriginal = 0;
        for (let i = 3; i < origData.data.length; i += 4) {
          if (origData.data[i] < FULLY_OPAQUE_ALPHA) transparentOriginal++;
        }
        const transparencyRatio = transparentOriginal / totalPixels;
        const isTraitLayer = transparencyRatio > transparencyThreshold;
        console.log(`[AI Art] Transparency ratio: ${(transparencyRatio * 100).toFixed(2)}%, isTraitLayer: ${isTraitLayer}`);
        const isNearTransparency = (pixelIndex: number) => {
          if (!isTraitLayer) return false;
          const pixel = pixelIndex / 4;
          const x = pixel % ow;
          const y = Math.floor(pixel / ow);
          for (let dy = -EDGE_PROTECTION_RADIUS; dy <= EDGE_PROTECTION_RADIUS; dy++) {
            const ny = y + dy;
            if (ny < 0 || ny >= oh) continue;
            for (let dx = -EDGE_PROTECTION_RADIUS; dx <= EDGE_PROTECTION_RADIUS; dx++) {
              const nx = x + dx;
              if (nx < 0 || nx >= ow) continue;
              const neighborAlpha = origData.data[(ny * ow + nx) * 4 + 3];
              if (neighborAlpha < FULLY_OPAQUE_ALPHA) return true;
            }
          }
          return false;
        };
        let pixelsCleared = 0;
        for (let i = 0; i < origData.data.length; i += 4) {
          const originalAlpha = origData.data[i + 3];
          const aiAlpha = aiData.data[i + 3];
          if (originalAlpha === TRANSPARENT_ALPHA) {
            if (aiAlpha !== TRANSPARENT_ALPHA) pixelsCleared++;
            aiData.data[i] = 0;
            aiData.data[i + 1] = 0;
            aiData.data[i + 2] = 0;
          } else if (isTraitLayer && (originalAlpha < FULLY_OPAQUE_ALPHA || isNearTransparency(i))) {
            aiData.data[i] = origData.data[i];
            aiData.data[i + 1] = origData.data[i + 1];
            aiData.data[i + 2] = origData.data[i + 2];
          }
          aiData.data[i + 3] = originalAlpha;
        }
        ctx.putImageData(aiData, 0, 0);
        const repairedData = ctx.getImageData(0, 0, ow, oh);
        let violatingPixels = 0;
        for (let i = 3; i < origData.data.length; i += 4) {
          if (origData.data[i] === TRANSPARENT_ALPHA && repairedData.data[i] !== TRANSPARENT_ALPHA) {
            violatingPixels++;
          }
        }
        const alphaDiff: AlphaDiffStats = { totalPixels, transparentOriginal, pixelsCleared, violatingPixels };
        console.log(`[AI Art] Alpha diff:`, alphaDiff);
        resolve({ dataUrl: canvas.toDataURL("image/png"), alphaDiff });
      };
      aiImg.onerror = () => reject(new Error("Failed to load AI image"));
      aiImg.src = aiSrc;
    };
    origImg.onerror = () => reject(new Error("Failed to load original image"));
    origImg.src = originalSrc;
  });

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Index = () => {
  const { user, isAdmin, signOut } = useAuth();
  const { settings } = useSiteSettings();
  const navigate = useNavigate();
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isEnhancingAll, setIsEnhancingAll] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(ENHANCE_PRESETS[0].id);
  const [customAiPrompt, setCustomAiPrompt] = useState<string>(
    ENHANCE_PRESETS.find((p) => p.id === "ai-art")?.options.aiPrompt ?? ""
  );
  const [transparencyThreshold, setTransparencyThreshold] = useState(0.5);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleImagesSelected = useCallback(async (files: File[]) => {
    const BATCH_SIZE = 5;
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE);
      const newImages: ImageItem[] = await Promise.all(
        batch.map(async (file) => ({
          id: crypto.randomUUID(),
          fileName: file.name,
          originalSrc: await fileToBase64(file),
          enhancedSrc: null,
          isProcessing: false,
        }))
      );
      setImages((prev) => [...prev, ...newImages]);
      // Yield to the browser between batches to prevent UI freeze
      if (i + BATCH_SIZE < files.length) {
        await new Promise((r) => setTimeout(r, 50));
      }
    }
  }, []);

  const enhanceImage = useCallback(async (imageId: string) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, isProcessing: true, error: undefined } : img
      )
    );
    const image = images.find((img) => img.id === imageId) ||
      (await new Promise<ImageItem>((resolve) => {
        setImages((prev) => {
          const found = prev.find((img) => img.id === imageId);
          if (found) resolve(found);
          return prev;
        });
      }));
    try {
      const preset = ENHANCE_PRESETS.find((p) => p.id === selectedPreset) || ENHANCE_PRESETS[0];
      let enhanced: string;
      let alphaDiffStats: AlphaDiffStats | undefined;
      if (preset.options.aiGenerate) {
        // Calculate original dimensions and transparency percentage
        const origInfo = await new Promise<{ width: number; height: number; transparentPercent: number }>((res) => {
          const img = new Image();
          img.onload = () => {
            const c = document.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            const cx = c.getContext("2d");
            if (!cx) { res({ width: img.naturalWidth, height: img.naturalHeight, transparentPercent: 0 }); return; }
            cx.drawImage(img, 0, 0);
            const d = cx.getImageData(0, 0, c.width, c.height).data;
            let transparent = 0;
            for (let i = 3; i < d.length; i += 4) { if (d[i] === 0) transparent++; }
            res({ width: img.naturalWidth, height: img.naturalHeight, transparentPercent: (transparent / (c.width * c.height)) * 100 });
          };
          img.src = image!.originalSrc;
        });
        // Downscale large images before sending to AI to avoid payload limits
        const downscaleForAI = (src: string, maxDim = 1024): Promise<string> => {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
              const { naturalWidth: w, naturalHeight: h } = img;
              if (w <= maxDim && h <= maxDim) { resolve(src); return; }
              const scale = maxDim / Math.max(w, h);
              const nw = Math.round(w * scale);
              const nh = Math.round(h * scale);
              const c = document.createElement("canvas");
              c.width = nw; c.height = nh;
              const cx = c.getContext("2d")!;
              cx.drawImage(img, 0, 0, nw, nh);
              resolve(c.toDataURL("image/png"));
            };
            img.src = src;
          });
        };

        const invokeAI = async (prompt: string) => {
          const smallBase64 = await downscaleForAI(image!.originalSrc);
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enhance-image`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            signal: abortControllerRef.current?.signal,
            body: JSON.stringify({
              imageBase64: smallBase64,
              fileName: image!.fileName,
              prompt,
              width: origInfo.width,
              height: origInfo.height,
              transparentPercent: origInfo.transparentPercent,
            }),
          });
          const data = await response.json().catch(() => null);
          if (!response.ok) throw new Error(data?.error || `AI enhancement failed (${response.status})`);
          if (data?.fallback) throw new Error(data.error || "AI could not process this image");
          if (data?.error) throw new Error(data.error);
          return data.enhancedImage.startsWith("data:")
            ? data.enhancedImage
            : `data:image/png;base64,${data.enhancedImage}`;
        };
        const basePrompt = customAiPrompt || preset.options.aiPrompt || "";
        const aiResult = await invokeAI(basePrompt);
        const result = await resizeToMatchOriginal(image!.originalSrc, aiResult, transparencyThreshold / 100);
        enhanced = result.dataUrl;
        alphaDiffStats = result.alphaDiff;
      } else {
        enhanced = await enhanceImageCanvas(image!.originalSrc, preset.options, abortControllerRef.current?.signal);
      }
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, enhancedSrc: enhanced, isProcessing: false, alphaDiff: alphaDiffStats }
            : img
        )
      );
      toast.success(`Enhanced ${image?.fileName}`);
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      const message = err?.message || "Failed to enhance image";
      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, isProcessing: false, error: message }
            : img
        )
      );
      toast.error(message);
    }
  }, [images, selectedPreset, customAiPrompt, transparencyThreshold]);

  const enhanceAll = useCallback(async () => {
    const unenhanced = images.filter((img) => !img.enhancedSrc && !img.isProcessing);
    if (unenhanced.length === 0) {
      toast.info("All images already enhanced!");
      return;
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsEnhancingAll(true);
    for (const img of unenhanced) {
      if (controller.signal.aborted) break;
      await enhanceImage(img.id);
    }
    setIsEnhancingAll(false);
    abortControllerRef.current = null;
    if (!controller.signal.aborted) {
      toast.success("All images enhanced!");
    }
  }, [images, enhanceImage]);

  const stopEnhancing = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsEnhancingAll(false);
    setImages((prev) =>
      prev.map((img) =>
        img.isProcessing ? { ...img, isProcessing: false } : img
      )
    );
    toast.info("Enhancement stopped");
  }, []);

  const downloadAll = useCallback(async () => {
    const enhanced = images.filter((img) => img.enhancedSrc);
    const safe = enhanced.filter((img) => !img.alphaDiff || img.alphaDiff.violatingPixels === 0);
    const blocked = enhanced.length - safe.length;
    for (let i = 0; i < safe.length; i++) {
      const img = safe[i];
      const a = document.createElement("a");
      a.href = img.enhancedSrc!;
      a.download = `enhanced_${img.fileName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (i < safe.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    if (blocked > 0) {
      toast.warning(`${blocked} image(s) skipped due to alpha violations`);
    }
    toast.success(`Downloaded ${safe.length} images`);
  }, [images]);

  const enhancedCount = images.filter((img) => img.enhancedSrc).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="graffiti-border border-b border-border carbon-surface backdrop-blur-sm">
        <div className="container max-w-6xl mx-auto py-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-12 h-12 object-contain" />
              ) : (
                <div
                  className="w-12 h-12 flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                    clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  }}
                >
                  <Flame className="w-6 h-6 text-accent-foreground" />
                </div>
              )}
              <div>
                <h1
                  className="text-2xl font-display uppercase tracking-widest text-gold-metallic"
                  style={{ fontFamily: "'Russo One', sans-serif" }}
                >
                  {settings.site_title}
                </h1>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground font-heading"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  NFT Trait Enhancement Engine
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/admin")}
                  className="uppercase tracking-wider text-xs border-accent/30 text-accent hover:border-accent"
                  style={{ fontFamily: "'Russo One', sans-serif" }}
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Admin
                </Button>
              )}
              {user && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="uppercase tracking-wider text-xs text-muted-foreground hover:text-foreground"
                  style={{ fontFamily: "'Orbitron', sans-serif" }}
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Sign Out
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
        {/* Hero Title */}
        <div className="text-center py-10 relative">
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[500px] h-32 bg-primary/10 blur-[80px]" />
          </div>
          <h2
            className="text-6xl md:text-8xl lg:text-9xl uppercase tracking-wider relative"
            style={{
              fontFamily: "'Russo One', sans-serif",
              color: 'transparent',
              background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextStroke: '1px hsl(45 95% 55% / 0.3)',
              filter: 'drop-shadow(0 0 20px hsl(270 85% 55% / 0.5)) drop-shadow(0 0 40px hsl(45 95% 55% / 0.2))',
              letterSpacing: '0.08em',
            }}
          >
            {settings.site_title}
          </h2>
          <p
            className="mt-3 text-lg md:text-xl uppercase tracking-[0.4em] relative"
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontWeight: 700,
              color: 'hsl(45 95% 65%)',
              textShadow: '0 0 15px hsl(45 95% 55% / 0.4)',
            }}
          >
            Level Up Your NFT Game
          </p>
          {/* Decorative angular lines */}
          <div className="flex justify-center mt-4 gap-1">
            <div className="w-16 h-[2px] bg-gradient-to-r from-transparent to-primary" />
            <div className="w-8 h-[2px] bg-accent" />
            <div className="w-16 h-[2px] bg-gradient-to-l from-transparent to-primary" />
          </div>
        </div>

        {/* Uploader */}
        <ImageUploader
          onImagesSelected={handleImagesSelected}
          isProcessing={isEnhancingAll}
        />

        {/* Enhancement Presets */}
        <EnhancePresetTabs
          selectedPreset={selectedPreset}
          onPresetChange={(id) => {
            setSelectedPreset(id);
            setImages((prev) => prev.map((img) => ({ ...img, enhancedSrc: null, error: undefined })));
          }}
          disabled={isEnhancingAll}
          customPrompt={customAiPrompt}
          onCustomPromptChange={setCustomAiPrompt}
          transparencyThreshold={transparencyThreshold}
          onTransparencyThresholdChange={setTransparencyThreshold}
        />

        {images.length > 0 && (
          <div className="flex items-center justify-between flex-wrap gap-3 carbon-surface border border-border rounded-lg p-4">
            <p
              className="text-sm uppercase tracking-widest font-heading"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: 'hsl(45 95% 65%)',
              }}
            >
              {images.length} image{images.length !== 1 ? "s" : ""} •{" "}
              {enhancedCount} enhanced
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setImages([])}
                className="font-display text-xs uppercase tracking-wider border-primary/30 hover:border-primary hover:shadow-[0_0_15px_hsl(270,85%,55%,0.3)]"
                style={{ fontFamily: "'Russo One', sans-serif" }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
              {enhancedCount > 0 && (
                <Button
                  variant="outline"
                  onClick={downloadAll}
                  className="font-display text-xs uppercase tracking-wider border-accent/30 text-accent hover:border-accent hover:shadow-[0_0_15px_hsl(45,95%,55%,0.3)]"
                  style={{ fontFamily: "'Russo One', sans-serif" }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
              )}
              {isEnhancingAll ? (
                <Button
                  variant="destructive"
                  onClick={stopEnhancing}
                  className="font-display text-xs uppercase tracking-wider"
                  style={{ fontFamily: "'Russo One', sans-serif" }}
                >
                  <StopCircle className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={enhanceAll}
                  disabled={images.every((i) => i.enhancedSrc)}
                  className="font-display text-xs uppercase tracking-wider text-accent-foreground hover:shadow-[0_0_25px_hsl(270,85%,55%,0.5)] transition-shadow"
                  style={{
                    fontFamily: "'Russo One', sans-serif",
                    background: 'linear-gradient(135deg, hsl(270 85% 55%), hsl(45 95% 50%))',
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enhance All
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Grid */}
        {images.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {images.map((img) => (
              <BeforeAfterCard
                key={img.id}
                fileName={img.fileName}
                originalSrc={img.originalSrc}
                enhancedSrc={img.enhancedSrc}
                isProcessing={img.isProcessing}
                error={img.error}
                alphaDiff={img.alphaDiff}
                onRemove={() => setImages((prev) => prev.filter((i) => i.id !== img.id))}
                onRetry={() => {
                  setImages((prev) =>
                    prev.map((i) =>
                      i.id === img.id ? { ...i, enhancedSrc: null, error: undefined, alphaDiff: undefined } : i
                    )
                  );
                  enhanceImage(img.id);
                }}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && (
          <div className="text-center py-16">
            <p
              className="text-base uppercase tracking-[0.3em]"
              style={{
                fontFamily: "'Orbitron', sans-serif",
                color: 'hsl(270 30% 40%)',
              }}
            >
              Drop your NFT trait images to get started
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-border">
        <p
          className="text-xs uppercase tracking-[0.3em]"
          style={{
            fontFamily: "'Orbitron', sans-serif",
            color: 'hsl(270 20% 25%)',
          }}
        >
          Built for Creators
        </p>
      </footer>
    </div>
  );
};

export default Index;
