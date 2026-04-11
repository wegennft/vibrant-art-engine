import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeAfterCardProps {
  fileName: string;
  originalSrc: string;
  enhancedSrc: string | null;
  isProcessing: boolean;
  error?: string;
}

const BeforeAfterCard = ({
  fileName,
  originalSrc,
  enhancedSrc,
  isProcessing,
  error,
}: BeforeAfterCardProps) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const handleDownload = () => {
    if (!enhancedSrc) return;
    const a = document.createElement("a");
    a.href = enhancedSrc;
    a.download = `enhanced_${fileName}`;
    a.click();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !enhancedSrc) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPos(Math.max(0, Math.min(100, x)));
  };

  return (
    <div className="bg-card rounded-lg border border-border overflow-hidden animate-slide-up">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-medium text-foreground truncate">
          {fileName}
        </span>
        {enhancedSrc && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="text-accent hover:text-accent shrink-0"
          >
            <Download className="w-4 h-4 mr-1" />
            Download
          </Button>
        )}
      </div>

      <div
        className="relative aspect-square select-none cursor-col-resize"
        onMouseDown={() => enhancedSrc && setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Original (full) */}
        <img
          src={originalSrc}
          alt={`Original ${fileName}`}
          className="absolute inset-0 w-full h-full object-contain bg-secondary"
        />

        {/* Enhanced (clipped) */}
        {enhancedSrc && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <img
              src={enhancedSrc}
              alt={`Enhanced ${fileName}`}
              className="absolute inset-0 w-full h-full object-contain bg-secondary"
            />
          </div>
        )}

        {/* Slider line */}
        {enhancedSrc && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary shadow-[0_0_8px_hsl(var(--glow-primary))]"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
              <span className="text-primary-foreground text-xs font-bold">⟷</span>
            </div>
          </div>
        )}

        {/* Labels */}
        {enhancedSrc && (
          <>
            <span className="absolute top-3 left-3 bg-background/80 text-foreground text-xs px-2 py-1 rounded">
              Before
            </span>
            <span className="absolute top-3 right-3 bg-primary/80 text-primary-foreground text-xs px-2 py-1 rounded">
              After
            </span>
          </>
        )}

        {/* Loading overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-foreground mt-2">Enhancing...</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 bg-destructive/10 flex items-center justify-center">
            <p className="text-sm text-destructive bg-background/80 px-3 py-2 rounded">
              {error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BeforeAfterCard;
