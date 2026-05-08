import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserCredits {
  balance: number;
  total_purchased: number;
  total_used: number;
}

export const useUserCredits = () => {
  const { user, isAdmin } = useAuth();
  const [credits, setCredits] = useState<UserCredits | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCredits = useCallback(async () => {
    if (!user || isAdmin) {
      setCredits(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("user_credits")
      .select("balance, total_purchased, total_used")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!error && data) setCredits(data);
    setLoading(false);
  }, [user, isAdmin]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Realtime updates so balance refreshes after purchase / deduction
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`credits-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_credits",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new) {
            setCredits({
              balance: (payload.new as any).balance,
              total_purchased: (payload.new as any).total_purchased,
              total_used: (payload.new as any).total_used,
            });
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { credits, loading, isAdmin, refetch: fetchCredits };
};
