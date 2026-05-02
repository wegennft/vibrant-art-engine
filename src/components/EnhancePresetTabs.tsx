import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ENHANCE_PRESETS, type EnhancePreset } from "@/lib/enhancePresets";

interface EnhancePresetTabsProps {
  selectedPreset: string;
  onPresetChange: (presetId: string) => void;
  disabled?: boolean;
  customPrompt?: string;
  onCustomPromptChange?: (prompt: string) => void;
}

const EnhancePresetTabs = ({
  selectedPreset,
  onPresetChange,
  disabled,
  customPrompt,
  onCustomPromptChange,
}: EnhancePresetTabsProps) => {
  const current = ENHANCE_PRESETS.find((p) => p.id === selectedPreset);
  const isAiPreset = current?.options.aiGenerate;

  return (
    <div className="space-y-3">
      <Tabs value={selectedPreset} onValueChange={onPresetChange}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          {ENHANCE_PRESETS.map((preset) => (
            <TabsTrigger
              key={preset.id}
              value={preset.id}
              disabled={disabled}
              className="text-xs sm:text-sm"
            >
              {preset.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {current && (
        <p className="text-xs text-muted-foreground">{current.description}</p>
      )}
      {isAiPreset && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            AI Prompt (customize the style)
          </label>
          <Textarea
            value={customPrompt ?? current?.options.aiPrompt ?? ""}
            onChange={(e) => onCustomPromptChange?.(e.target.value)}
            disabled={disabled}
            placeholder="Describe how you want the AI to transform your images..."
            className="min-h-[80px] text-sm bg-muted/30 border-border"
          />
        </div>
      )}
    </div>
  );
};

export default EnhancePresetTabs;
