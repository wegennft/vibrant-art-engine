import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  primary_color: string;
  accent_color: string;
  background_color: string;
  foreground_color: string;
  logo_url: string | null;
  banner_url: string | null;
  site_title: string;
}

const defaults: SiteSettings = {
  primary_color: "270 85% 55%",
  accent_color: "45 95% 55%",
  background_color: "0 0% 8%",
  foreground_color: "45 80% 90%",
  logo_url: null,
  banner_url: null,
  site_title: "ART UPGRADER",
};

export const useSiteSettings = () => {
  const [settings, setSettings] = useState<SiteSettings>(defaults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("primary_color, accent_color, background_color, foreground_color, logo_url, banner_url, site_title")
        .limit(1)
        .single();
      if (data) setSettings(data);
      setLoading(false);
    };
    fetch();
  }, []);

  // Apply CSS custom properties whenever settings change
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", settings.primary_color);
    root.style.setProperty("--accent", settings.accent_color);
    root.style.setProperty("--background", settings.background_color);
    root.style.setProperty("--foreground", settings.foreground_color);
    // Derived colors
    root.style.setProperty("--ring", settings.primary_color);
    root.style.setProperty("--glow-primary", settings.primary_color);
    root.style.setProperty("--glow-accent", settings.accent_color);
  }, [settings]);

  return { settings, loading };
};
