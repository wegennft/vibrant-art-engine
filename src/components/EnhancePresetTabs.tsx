import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ENHANCE_PRESETS, type EnhancePreset } from "@/lib/enhancePresets";

interface EnhancePresetTabsProps {
  selectedPreset: string;
  onPresetChange: (presetId: string) => void;
  disabled?: boolean;
}

const EnhancePresetTabs = ({ selectedPreset, onPresetChange, disabled }: EnhancePresetTabsProps) => {
  const current = ENHANCE_PRESETS.find((p) => p.id === selectedPreset);

  return (
    <div className="space-y-2">
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
    </div>
  );
};

export default EnhancePresetTabs;
