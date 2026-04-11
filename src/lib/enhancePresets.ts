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
    id: "pastel-dream",
    name: "Pastel Dream",
    description: "Lightens tones and reduces saturation for a soft pastel look",
    options: {
      saturationBoost: 0.15,
      brightnessBoost: 0.30,
      contrastBoost: 0.05,
    },
  },
  {
    id: "1990s-cartoon",
    name: "1990's",
    description: "High-saturation, high-contrast pop inspired by 90s cel-animated cartoons — bold, punchy, Nickelodeon vibes",
    options: {
      saturationBoost: 0.92,
      brightnessBoost: 0.06,
      contrastBoost: 0.45,
    },
  },
];
