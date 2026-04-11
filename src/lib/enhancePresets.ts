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
    id: "bw",
    name: "B&W",
    description: "Crushed blacks, piercing highlights, bold shadows & hard lighting",
    options: {
      saturationBoost: -1,
      brightnessBoost: 0.05,
      contrastBoost: 0.50,
    },
  },
];
