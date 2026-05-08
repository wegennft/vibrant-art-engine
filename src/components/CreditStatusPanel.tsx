import { AlertTriangle, CheckCircle2, Coins, Crown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CreditStatusPanelProps {
  isAdmin: boolean;
  balance: number | null;
  loading: boolean;
  isAiPreset: boolean;
  costPerEnhance: number;
  onBuyClick: () => void;
}

const CreditStatusPanel = ({
  isAdmin,
  balance,
  loading,
  isAiPreset,
  costPerEnhance,
  onBuyClick,
}: CreditStatusPanelProps) => {
  if (!isAiPreset) return null;

  if (isAdmin) {
    return (
      <div className="carbon-surface border border-accent/40 rounded-lg p-4 flex items-center gap-3">
        <Crown className="w-5 h-5 text-accent" />
        <div>
          <p
            className="text-sm uppercase tracking-widest"
            style={{ fontFamily: "'Russo One', sans-serif", color: "hsl(45 95% 65%)" }}
          >
            Admin — Unlimited
          </p>
          <p
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            Using shared AI balance
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="carbon-surface border border-border rounded-lg p-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground"
          style={{ fontFamily: "'Orbitron', sans-serif" }}>
          Loading credits...
        </p>
      </div>
    );
  }

  const bal = balance ?? 0;
  const exhausted = bal < costPerEnhance;

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
            className="text-sm uppercase tracking-widest flex items-center gap-2"
            style={{
              fontFamily: "'Russo One', sans-serif",
              color: exhausted ? "hsl(var(--destructive))" : "hsl(45 95% 65%)",
            }}
          >
            <Coins className="w-4 h-4" />
            {bal} Credits
          </p>
          <p
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground mt-1"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            {exhausted
              ? `Need ${costPerEnhance} credits per enhance — top up to continue`
              : `${costPerEnhance} credits per enhance · ~${Math.floor(bal / costPerEnhance)} enhancements left`}
          </p>
        </div>
      </div>
      <Button
        onClick={onBuyClick}
        className="font-display text-xs uppercase tracking-wider text-accent-foreground"
        style={{
          fontFamily: "'Russo One', sans-serif",
          background: "linear-gradient(135deg, hsl(270 85% 55%), hsl(45 95% 50%))",
        }}
      >
        <Plus className="w-4 h-4 mr-2" />
        Buy Credits
      </Button>
    </div>
  );
};

export default CreditStatusPanel;
