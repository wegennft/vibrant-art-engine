import { useState } from "react";
import { Download, Loader2, RefreshCw, ShieldAlert, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface AlphaDiffStats {
  totalPixels: number;
  transparentOriginal: number;
  pixelsCleared: number;
  violatingPixels: number;
}

interface BeforeAfterCardProps {
  fileName: string;
  originalSrc: string;
  enhancedSrc: string | null;
  isProcessing: boolean;
  error?: string;
  alphaDiff?: AlphaDiffStats;
  onRetry?: () => void;
  onRemove?: () => void;
}

const BeforeAfterCard = ({
  fileName,
  originalSrc,
  enhancedSrc,
  isProcessing,
  error,
  alphaDiff,
  onRetry,
  onRemove,
}: BeforeAfterCardProps) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const hasViolation = alphaDiff && alphaDiff.violatingPixels > 0;
  const hasRepairs = alphaDiff && alphaDiff.pixelsCleared > 0;

  const handleDownload = () => {
    if (!enhancedSrc) return;
    if (hasViolation) {
      toast.error(`Download blocked: ${alphaDiff!.violatingPixels} transparent pixels became opaque in AI output`);
      return;
    }
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
        <div className="flex items-center gap-2 shrink-0">
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={isProcessing}
              className="text-muted-foreground hover:text-destructive"
              title="Remove image"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
          {enhancedSrc && onRetry && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              disabled={isProcessing}
              className="text-muted-foreground hover:text-foreground"
              title="Retry enhancement"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          )}
          {enhancedSrc && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className={hasViolation ? "text-destructive hover:text-destructive" : "text-accent hover:text-accent"}
              title={hasViolation ? "Download blocked — alpha violation" : "Download enhanced image"}
            >
              <Download className="w-4 h-4 mr-1" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Alpha diff stats bar */}
      {alphaDiff && enhancedSrc && (
        <div className={`px-3 py-2 border-b border-border text-xs flex items-center gap-2 ${hasViolation ? "bg-destructive/10" : "bg-accent/10"}`}>
          {hasViolation ? (
            <ShieldAlert className="w-3.5 h-3.5 text-destructive shrink-0" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-accent shrink-0" />
          )}
          <span className="text-muted-foreground">
            {alphaDiff.violatingPixels > 0 ? (
              <span className="text-destructive font-medium">
                ⚠ {alphaDiff.violatingPixels.toLocaleString()} transparent→opaque pixels (blocked)
              </span>
            ) : hasRepairs ? (
              <span className="text-accent">
                ✓ Alpha mask repaired {alphaDiff.pixelsCleared.toLocaleString()} AI background pixels
              </span>
            ) : (
              <span className="text-accent">✓ Alpha mask intact</span>
            )}
            {" · "}
            {alphaDiff.transparentOriginal.toLocaleString()} transparent of {alphaDiff.totalPixels.toLocaleString()} total
          </span>
        </div>
      )}

      <div
        className="relative select-none cursor-col-resize"
        style={{ width: "100%", aspectRatio: "1 / 1" }}
        onMouseDown={() => enhancedSrc && setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Checkerboard background for transparency */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(-45deg, hsl(var(--muted)) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, hsl(var(--muted)) 75%), linear-gradient(-45deg, transparent 75%, hsl(var(--muted)) 75%)",
            backgroundSize: "20px 20px",
            backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          }}
        />

        <img
          src={originalSrc}
          alt={`Original ${fileName}`}
          className="absolute inset-0 w-full h-full object-contain"
          draggable={false}
        />

        {enhancedSrc && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <img
              src={enhancedSrc}
              alt={`Enhanced ${fileName}`}
              className="absolute inset-0 w-full h-full object-contain"
              draggable={false}
            />
          </div>
        )}

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

        {isProcessing && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-foreground mt-2">Enhancing...</p>
          </div>
        )}

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
