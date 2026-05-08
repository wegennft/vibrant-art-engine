import { AlertTriangle, CheckCircle2, RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditStatusPanelProps {
  exhausted: boolean;
  isAiPreset: boolean;
  onReset: () => void;
}

const CreditStatusPanel = ({ exhausted, isAiPreset, onReset }: CreditStatusPanelProps) => {
  if (!isAiPreset) return null;

  return (
    <div
      className={`carbon-surface border rounded-lg p-4 flex items-center justify-between flex-wrap gap-3 ${
        exhausted ? "border-destructive/50" : "border-accent/30"
      }`}
    >
      <div className="flex items-center gap-3">
        {exhausted ? (
          <AlertTriangle className="w-5 h-5 text-destructive" />
        ) : (
          <CheckCircle2 className="w-5 h-5 text-accent" />
        )}
        <div>
          <p
            className="text-sm uppercase tracking-widest"
            style={{
              fontFamily: "'Russo One', sans-serif",
              color: exhausted ? "hsl(var(--destructive))" : "hsl(45 95% 65%)",
            }}
          >
            {exhausted ? "AI Credits Exhausted" : "AI Credits Available"}
          </p>
          <p
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            {exhausted
              ? "Top up Lovable AI balance in Workspace settings to re-enable"
              : "Ready to enhance with AI"}
          </p>
        </div>
      </div>
      {exhausted && (
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="font-display text-xs uppercase tracking-wider border-accent/30 text-accent hover:border-accent"
          style={{ fontFamily: "'Russo One', sans-serif" }}
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          Recheck
        </Button>
      )}
      {!exhausted && (
        <div className="flex items-center gap-1 text-accent">
          <Zap className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default CreditStatusPanel;
