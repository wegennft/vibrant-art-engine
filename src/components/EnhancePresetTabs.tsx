import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { ENHANCE_PRESETS, type EnhancePreset } from "@/lib/enhancePresets";

interface EnhancePresetTabsProps {
  selectedPreset: string;
  onPresetChange: (presetId: string) => void;
  disabled?: boolean;
  customPrompt?: string;
  onCustomPromptChange?: (prompt: string) => void;
  transparencyThreshold?: number;
  onTransparencyThresholdChange?: (value: number) => void;
}

const EnhancePresetTabs = ({
  selectedPreset,
  onPresetChange,
  disabled,
  customPrompt,
  onCustomPromptChange,
  transparencyThreshold = 0.5,
  onTransparencyThresholdChange,
}: EnhancePresetTabsProps) => {
  const current = ENHANCE_PRESETS.find((p) => p.id === selectedPreset);
  const isAiPreset = current?.options.aiGenerate;

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
      {isAiPreset && (
        <div className="space-y-4">
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-muted-foreground">
                Trait Layer Threshold
              </label>
              <span className="text-xs font-mono text-accent">
                {transparencyThreshold.toFixed(1)}%
              </span>
            </div>
            <Slider
              value={[transparencyThreshold]}
              onValueChange={([v]) => onTransparencyThresholdChange?.(v)}
              min={0}
              max={10}
              step={0.1}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-[10px] text-muted-foreground/70">
              Images with more than {transparencyThreshold.toFixed(1)}% transparent pixels are treated as trait layers (edge protection on). Lower = more images treated as full art.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancePresetTabs;
