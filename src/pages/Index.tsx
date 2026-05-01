import { useState, useCallback, useRef } from "react";
import { Sparkles, Download, Trash2, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import BeforeAfterCard from "@/components/BeforeAfterCard";
import EnhancePresetTabs from "@/components/EnhancePresetTabs";
import { enhanceImageCanvas } from "@/lib/enhanceImage";
import { ENHANCE_PRESETS } from "@/lib/enhancePresets";
import { supabase } from "@/integrations/supabase/client";

interface ImageItem {
  id: string;
  fileName: string;
  originalSrc: string;
  enhancedSrc: string | null;
  isProcessing: boolean;
  error?: string;
}

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Index = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isEnhancingAll, setIsEnhancingAll] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState(ENHANCE_PRESETS[0].id);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleImagesSelected = useCallback(async (files: File[]) => {
    const newImages: ImageItem[] = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        originalSrc: await fileToBase64(file),
        enhancedSrc: null,
        isProcessing: false,
      }))
    );
    setImages((prev) => [...prev, ...newImages]);
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

      if (preset.options.aiGenerate) {
        // Route through AI edge function
        const { data, error } = await supabase.functions.invoke('enhance-image', {
          body: {
            imageBase64: image!.originalSrc,
            fileName: image!.fileName,
            prompt: preset.options.aiPrompt,
          },
        });
        if (error) throw new Error(error.message || "AI enhancement failed");
        if (data?.error) throw new Error(data.error);
        enhanced = data.enhancedImage.startsWith("data:")
          ? data.enhancedImage
          : `data:image/png;base64,${data.enhancedImage}`;
      } else {
        enhanced = await enhanceImageCanvas(image!.originalSrc, preset.options, abortControllerRef.current?.signal);
      }

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, enhancedSrc: enhanced, isProcessing: false }
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
  }, [images, selectedPreset]);

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
    // Reset any currently processing images
    setImages((prev) =>
      prev.map((img) =>
        img.isProcessing ? { ...img, isProcessing: false } : img
      )
    );
    toast.info("Enhancement stopped");
  }, []);

  const downloadAll = useCallback(async () => {
    const enhanced = images.filter((img) => img.enhancedSrc);
    for (let i = 0; i < enhanced.length; i++) {
      const img = enhanced[i];
      const a = document.createElement("a");
      a.href = img.enhancedSrc!;
      a.download = `enhanced_${img.fileName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      if (i < enhanced.length - 1) {
        await new Promise((r) => setTimeout(r, 300));
      }
    }
    toast.success(`Downloaded ${enhanced.length} images`);
  }, [images]);

  const enhancedCount = images.filter((img) => img.enhancedSrc).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container max-w-6xl mx-auto py-6 px-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-2xl font-graffiti text-primary">Art Upgrader</h1>
              <p className="text-sm text-muted-foreground">
                Make your NFT trait art brighter & more vibrant
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto py-8 px-4 space-y-8">
        {/* Hero Title */}
        <div className="text-center py-6">
          <h2
            className="text-6xl md:text-8xl tracking-wide animate-[neon-pulse_2s_ease-in-out_infinite]"
            style={{
              fontFamily: "'Rubik Spray Paint', 'Permanent Marker', cursive",
              color: 'hsl(270, 80%, 60%)',
              WebkitTextStroke: '1px hsl(45, 90%, 55%)',
              textShadow: '3px 3px 0 hsl(45, 90%, 45%, 0.6), 0 0 20px hsl(270, 80%, 60%, 0.8), 0 0 40px hsl(270, 80%, 55%, 0.6), 0 0 80px hsl(270, 70%, 50%, 0.4), 0 0 120px hsl(270, 80%, 55%, 0.3)',
              transform: 'rotate(-2deg)',
            }}
          >
            Art Upgrader
          </h2>
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
            // Clear enhanced results when switching presets
            setImages((prev) => prev.map((img) => ({ ...img, enhancedSrc: null, error: undefined })));
          }}
          disabled={isEnhancingAll}
        />


        {images.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {images.length} image{images.length !== 1 ? "s" : ""} •{" "}
              {enhancedCount} enhanced
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setImages([])}>
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
              {enhancedCount > 0 && (
                <Button variant="outline" onClick={downloadAll}>
                  <Download className="w-4 h-4 mr-2" />
                  Download All
                </Button>
              )}
              {isEnhancingAll ? (
                <Button variant="destructive" onClick={stopEnhancing}>
                  <StopCircle className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              ) : (
                <Button
                  onClick={enhanceAll}
                  disabled={images.every((i) => i.enhancedSrc)}
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
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Upload your NFT trait images to get started
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
