import { useState, useCallback } from "react";
import { Sparkles, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import BeforeAfterCard from "@/components/BeforeAfterCard";
import EnhancePresetTabs from "@/components/EnhancePresetTabs";
import { enhanceImageCanvas } from "@/lib/enhanceImage";
import { ENHANCE_PRESETS } from "@/lib/enhancePresets";

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
      const enhanced = await enhanceImageCanvas(image!.originalSrc, preset.options);

      setImages((prev) =>
        prev.map((img) =>
          img.id === imageId
            ? { ...img, enhancedSrc: enhanced, isProcessing: false }
            : img
        )
      );
      toast.success(`Enhanced ${image?.fileName}`);
    } catch (err: any) {
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

    setIsEnhancingAll(true);
    for (const img of unenhanced) {
      await enhanceImage(img.id);
    }
    setIsEnhancingAll(false);
    toast.success("All images enhanced!");
  }, [images, enhanceImage]);

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
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Art Upgrader</h1>
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
          <h2 className="font-graffiti text-5xl md:text-7xl text-accent drop-shadow-[0_0_30px_hsl(45,90%,55%,0.4)]">
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
              <Button
                onClick={enhanceAll}
                disabled={isEnhancingAll || images.every((i) => i.enhancedSrc)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isEnhancingAll ? "Enhancing..." : "Enhance All"}
              </Button>
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
