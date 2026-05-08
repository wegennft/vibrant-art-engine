import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ENHANCE_PRESETS, type EnhancePreset } from "@/lib/enhancePresets";

interface EnhancePresetTabsProps {
  selectedPreset: string;
  onPresetChange: (presetId: string) => void;
  disabled?: boolean;
}

const EnhancePresetTabs = ({
  selectedPreset,
  onPresetChange,
  disabled,
}: EnhancePresetTabsProps) => {
  const current = ENHANCE_PRESETS.find((p) => p.id === selectedPreset);

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
    </div>
  );
};

export default EnhancePresetTabs;
