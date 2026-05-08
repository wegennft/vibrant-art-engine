import { EnhanceOptions } from "./enhanceImage";

export interface EnhancePreset {
  id: string;
  name: string;
  description: string;
  options: EnhanceOptions;
}

export const ENHANCE_PRESETS: EnhancePreset[] = [
  {
    id: "vibrant-pop",
    name: "Vibrant Pop",
    description: "Boosts saturation & brightness for vivid, eye-catching colors",
    options: {
      saturationBoost: 0.80,
      brightnessBoost: 0.12,
      contrastBoost: 0.20,
    },
  },
  {
    id: "trait-pop",
    name: "Trait Pop",
    description: "Stronger local color, brightness, and contrast pass that preserves pixel alignment and transparency",
    options: {
      saturationBoost: 1.05,
      brightnessBoost: 0.18,
      contrastBoost: 0.30,
    },
  },
];
