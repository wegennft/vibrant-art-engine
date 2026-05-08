import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ENHANCE_PRESETS } from "@/lib/enhancePresets";

interface EnhancePresetTabsProps {
  selectedPreset: string;
  onPresetChange: (presetId: string) => void;
  aiPrompt: string;
  onAiPromptChange: (value: string) => void;
  disabled?: boolean;
}

const EnhancePresetTabs = ({
  selectedPreset,
  onPresetChange,
  aiPrompt,
  onAiPromptChange,
  disabled,
}: EnhancePresetTabsProps) => {
  const current = ENHANCE_PRESETS.find((p) => p.id === selectedPreset);
  const showAiPrompt = !!current?.options.aiGenerate;

  return (
    <div className="space-y-3">
      <Tabs value={selectedPreset} onValueChange={onPresetChange}>
        <TabsList className="flex flex-wrap h-auto gap-1 carbon-surface p-1 border border-border rounded-none" style={{ clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))' }}>
          {ENHANCE_PRESETS.map((preset) => (
            <TabsTrigger
              key={preset.id}
              value={preset.id}
              disabled={disabled}
              className="text-xs uppercase tracking-wider"
              style={{ fontFamily: "'Russo One', sans-serif" }}
            >
              {preset.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {current && (
        <p className="text-xs text-muted-foreground">{current.description}</p>
      )}
      {showAiPrompt && (
        <div className="space-y-2 carbon-surface border border-border rounded-none p-3">
          <Label
            htmlFor="ai-prompt"
            className="text-xs uppercase tracking-widest text-accent"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            AI Prompt (optional)
          </Label>
          <Textarea
            id="ai-prompt"
            value={aiPrompt}
            onChange={(e) => onAiPromptChange(e.target.value)}
            disabled={disabled}
            placeholder="e.g. Boost neon glow on the trim, keep the rest untouched. Leave blank for default saturation/brightness boost."
            className="min-h-[80px] text-sm bg-background/40 border-border"
          />
        </div>
      )}
    </div>
  );
};

export default EnhancePresetTabs;
