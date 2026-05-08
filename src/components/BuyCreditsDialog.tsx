import { useCallback, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Sparkles, Coins, Zap, Crown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface BuyCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Pack {
  priceId: string;
  name: string;
  credits: number;
  price: string;
  perCredit: string;
  icon: typeof Coins;
  highlight?: boolean;
}

const PACKS: Pack[] = [
  { priceId: "credits_starter_5usd", name: "Starter", credits: 50, price: "$5", perCredit: "$0.10/credit", icon: Coins },
  { priceId: "credits_value_10usd", name: "Value", credits: 120, price: "$10", perCredit: "$0.083/credit", icon: Zap, highlight: true },
  { priceId: "credits_pro_25usd", name: "Pro", credits: 350, price: "$25", perCredit: "$0.071/credit", icon: Crown },
];

const BuyCreditsDialog = ({ open, onOpenChange }: BuyCreditsDialogProps) => {
  const { user } = useAuth();
  const [selectedPack, setSelectedPack] = useState<Pack | null>(null);
  const [loadingPack, setLoadingPack] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async (): Promise<string> => {
    if (!selectedPack) throw new Error("No pack selected");
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Not signed in");

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          priceId: selectedPack.priceId,
          environment: getStripeEnvironment(),
          returnUrl: `${window.location.origin}/?checkout=success`,
        }),
      }
    );
    const data = await response.json();
    if (!response.ok || !data.clientSecret) {
      throw new Error(data?.error || "Failed to start checkout");
    }
    return data.clientSecret;
  }, [selectedPack]);

  const handleSelectPack = async (pack: Pack) => {
    if (!user) {
      toast.error("Sign in to buy credits");
      return;
    }
    setLoadingPack(pack.priceId);
    setSelectedPack(pack);
    setLoadingPack(null);
  };

  const handleClose = (next: boolean) => {
    if (!next) setSelectedPack(null);
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl carbon-surface border-primary/30">
        <DialogHeader>
          <DialogTitle
            className="text-2xl uppercase tracking-widest text-gold-metallic"
            style={{ fontFamily: "'Russo One', sans-serif" }}
          >
            Top Up AI Credits
          </DialogTitle>
          <DialogDescription
            className="text-xs uppercase tracking-[0.2em] text-muted-foreground"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            2 credits per AI enhancement
          </DialogDescription>
        </DialogHeader>

        {!selectedPack ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {PACKS.map((pack) => {
              const Icon = pack.icon;
              return (
                <button
                  key={pack.priceId}
                  onClick={() => handleSelectPack(pack)}
                  disabled={loadingPack === pack.priceId}
                  className={`relative carbon-surface border rounded-lg p-6 flex flex-col items-center gap-3 transition-all hover:shadow-[0_0_25px_hsl(270,85%,55%,0.4)] hover:border-primary text-left disabled:opacity-50 ${
                    pack.highlight ? "border-accent/60" : "border-border"
                  }`}
                >
                  {pack.highlight && (
                    <span
                      className="absolute -top-2 right-4 text-[10px] uppercase tracking-wider px-2 py-0.5 bg-accent text-accent-foreground"
                      style={{ fontFamily: "'Russo One', sans-serif" }}
                    >
                      Best Value
                    </span>
                  )}
                  <Icon className={`w-8 h-8 ${pack.highlight ? "text-accent" : "text-primary"}`} />
                  <div
                    className="text-sm uppercase tracking-widest text-gold-metallic"
                    style={{ fontFamily: "'Russo One', sans-serif" }}
                  >
                    {pack.name}
                  </div>
                  <div
                    className="text-3xl font-bold"
                    style={{ fontFamily: "'Russo One', sans-serif", color: "hsl(45 95% 65%)" }}
                  >
                    {pack.credits}
                  </div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground"
                    style={{ fontFamily: "'Orbitron', sans-serif" }}>
                    Credits
                  </div>
                  <div
                    className="text-2xl mt-2"
                    style={{ fontFamily: "'Russo One', sans-serif", color: "hsl(var(--foreground))" }}
                  >
                    {pack.price}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {pack.perCredit}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="pt-4">
            <Button
              variant="ghost"
              onClick={() => setSelectedPack(null)}
              className="mb-3 text-xs uppercase tracking-wider"
              style={{ fontFamily: "'Orbitron', sans-serif" }}
            >
              ← Back to packs
            </Button>
            <div id="checkout" className="bg-white rounded-lg overflow-hidden">
              <EmbeddedCheckoutProvider
                stripe={getStripe()}
                options={{ fetchClientSecret }}
              >
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BuyCreditsDialog;
