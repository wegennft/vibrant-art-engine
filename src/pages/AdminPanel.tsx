import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Save, Upload, Palette, Image, Type, Loader2 } from "lucide-react";

interface SiteSettings {
  id: string;
  primary_color: string;
  accent_color: string;
  background_color: string;
  foreground_color: string;
  logo_url: string | null;
  banner_url: string | null;
  site_title: string;
}

const AdminPanel = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate("/");
      return;
    }
    fetchSettings();
  }, [user, isAdmin, authLoading]);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from("site_settings")
      .select("*")
      .limit(1)
      .single();
    if (error) {
      toast.error("Failed to load settings");
    } else {
      setSettings(data);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        primary_color: settings.primary_color,
        accent_color: settings.accent_color,
        background_color: settings.background_color,
        foreground_color: settings.foreground_color,
        logo_url: settings.logo_url,
        banner_url: settings.banner_url,
        site_title: settings.site_title,
      })
      .eq("id", settings.id);
    setSaving(false);
    if (error) {
      toast.error("Failed to save settings");
    } else {
      toast.success("Settings saved!");
    }
  };

  const handleFileUpload = async (type: "logos" | "banners", e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(type);
    const ext = file.name.split(".").pop();
    const path = `${type}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("site-assets")
      .upload(path, file, { upsert: true });
    if (error) {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(null);
      return;
    }
    const { data: { publicUrl } } = supabase.storage
      .from("site-assets")
      .getPublicUrl(path);
    setSettings((prev) =>
      prev
        ? { ...prev, [type === "logos" ? "logo_url" : "banner_url"]: publicUrl }
        : prev
    );
    setUploading(null);
    toast.success(`${type === "logos" ? "Logo" : "Banner"} uploaded!`);
  };

  const updateField = (field: keyof SiteSettings, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!settings) return null;

  const colorPreview = (color: string) => {
    try {
      return `hsl(${color})`;
    } catch {
      return "#888";
    }
  };

  return (
    <div className="min-h-screen">
      <header className="graffiti-border border-b border-border carbon-surface">
        <div className="container max-w-4xl mx-auto py-4 px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl uppercase tracking-widest text-gold-metallic" style={{ fontFamily: "'Russo One', sans-serif" }}>
              Admin Panel
            </h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="uppercase tracking-wider text-accent-foreground"
            style={{
              fontFamily: "'Russo One', sans-serif",
              background: 'linear-gradient(135deg, hsl(270 85% 55%), hsl(45 95% 50%))',
            }}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save
          </Button>
        </div>
      </header>

      <main className="container max-w-4xl mx-auto py-8 px-4 space-y-8">
        {/* Site Title */}
        <Section icon={<Type className="w-5 h-5 text-accent" />} title="Site Title">
          <Input
            value={settings.site_title}
            onChange={(e) => updateField("site_title", e.target.value)}
            className="bg-background/50 border-border text-lg"
            style={{ fontFamily: "'Russo One', sans-serif" }}
          />
        </Section>

        {/* Color Scheme */}
        <Section icon={<Palette className="w-5 h-5 text-accent" />} title="Color Scheme">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ColorField label="Primary" value={settings.primary_color} onChange={(v) => updateField("primary_color", v)} preview={colorPreview(settings.primary_color)} />
            <ColorField label="Accent" value={settings.accent_color} onChange={(v) => updateField("accent_color", v)} preview={colorPreview(settings.accent_color)} />
            <ColorField label="Background" value={settings.background_color} onChange={(v) => updateField("background_color", v)} preview={colorPreview(settings.background_color)} />
            <ColorField label="Foreground" value={settings.foreground_color} onChange={(v) => updateField("foreground_color", v)} preview={colorPreview(settings.foreground_color)} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-2" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            Format: HSL values like "270 85% 55%"
          </p>
        </Section>

        {/* Logo & Banner */}
        <Section icon={<Image className="w-5 h-5 text-accent" />} title="Logo & Banner">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UploadField
              label="Logo"
              url={settings.logo_url}
              uploading={uploading === "logos"}
              onUpload={(e) => handleFileUpload("logos", e)}
              onClear={() => updateField("logo_url", "")}
            />
            <UploadField
              label="Banner"
              url={settings.banner_url}
              uploading={uploading === "banners"}
              onUpload={(e) => handleFileUpload("banners", e)}
              onClear={() => updateField("banner_url", "")}
            />
          </div>
        </Section>

        {/* Live Preview */}
        <Section icon={<Palette className="w-5 h-5 text-accent" />} title="Live Preview">
          <div
            className="rounded p-6 border border-border"
            style={{ backgroundColor: colorPreview(settings.background_color), color: colorPreview(settings.foreground_color) }}
          >
            <div className="flex items-center gap-3 mb-4">
              {settings.logo_url && <img src={settings.logo_url} alt="Logo" className="w-10 h-10 object-contain" />}
              <h3 style={{ fontFamily: "'Russo One', sans-serif", color: colorPreview(settings.accent_color) }} className="text-xl uppercase tracking-wider">
                {settings.site_title}
              </h3>
            </div>
            {settings.banner_url && (
              <img src={settings.banner_url} alt="Banner" className="w-full h-32 object-cover rounded mb-4" />
            )}
            <div className="flex gap-3">
              <div className="px-4 py-2 rounded text-sm" style={{ backgroundColor: colorPreview(settings.primary_color), color: colorPreview(settings.foreground_color), fontFamily: "'Russo One', sans-serif" }}>
                Primary Button
              </div>
              <div className="px-4 py-2 rounded text-sm" style={{ backgroundColor: colorPreview(settings.accent_color), color: colorPreview(settings.background_color), fontFamily: "'Russo One', sans-serif" }}>
                Accent Button
              </div>
            </div>
          </div>
        </Section>
      </main>
    </div>
  );
};

const Section = ({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) => (
  <div
    className="carbon-surface border border-border p-6 space-y-4"
    style={{ clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))' }}
  >
    <div className="flex items-center gap-3">
      {icon}
      <h2 className="text-sm uppercase tracking-widest text-foreground" style={{ fontFamily: "'Russo One', sans-serif" }}>
        {title}
      </h2>
    </div>
    {children}
  </div>
);

const ColorField = ({ label, value, onChange, preview }: { label: string; value: string; onChange: (v: string) => void; preview: string }) => (
  <div className="space-y-1">
    <label className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Orbitron', sans-serif" }}>
      {label}
    </label>
    <div className="flex items-center gap-2">
      <div className="w-8 h-8 rounded border border-border shrink-0" style={{ backgroundColor: preview }} />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="bg-background/50 border-border font-mono text-sm" />
    </div>
  </div>
);

const UploadField = ({ label, url, uploading, onUpload, onClear }: { label: string; url: string | null; uploading: boolean; onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void; onClear: () => void }) => (
  <div className="space-y-2">
    <label className="text-xs uppercase tracking-wider text-muted-foreground" style={{ fontFamily: "'Orbitron', sans-serif" }}>
      {label}
    </label>
    {url && (
      <div className="relative">
        <img src={url} alt={label} className="w-full h-24 object-contain bg-background/50 rounded border border-border" />
        <button onClick={onClear} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded px-2 py-0.5 text-xs">Remove</button>
      </div>
    )}
    <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded p-3 cursor-pointer hover:border-primary/50 transition-colors">
      {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
      <span className="text-xs uppercase tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
        {uploading ? "Uploading..." : `Upload ${label}`}
      </span>
      <input type="file" accept="image/*" onChange={onUpload} className="hidden" disabled={uploading} />
    </label>
  </div>
);

export default AdminPanel;
