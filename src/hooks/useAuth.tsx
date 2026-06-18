import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser((prev) => {
          const nextId = newSession?.user?.id ?? null;
          const prevId = prev?.id ?? null;
          // Keep the same user reference across token refreshes to avoid re-renders that kick the user
          if (prevId === nextId) return prev;
          return newSession?.user ?? null;
        });
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const userId = user?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    const checkAdmin = async () => {
      if (!userId) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });

      if (cancelled) return;

      if (error) {
        console.error("checkAdmin rpc error:", error);
        setIsAdmin(false);
      } else {
        setIsAdmin(!!data);
      }
    };

    checkAdmin();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
