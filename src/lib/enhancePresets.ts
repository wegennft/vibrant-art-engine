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
    id: "soft-glow",
    name: "Soft Glow",
    description: "Gentle brightness lift with subtle saturation for a warm feel",
    options: {
      saturationBoost: 0.30,
      brightnessBoost: 0.20,
      contrastBoost: 0.08,
    },
  },
  {
    id: "high-contrast",
    name: "High Contrast",
    description: "Deep darks and bright lights with moderate color boost",
    options: {
      saturationBoost: 0.45,
      brightnessBoost: 0.05,
      contrastBoost: 0.50,
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
    id: "neon-punch",
    name: "Neon Punch",
    description: "Maximum saturation and contrast for electric, bold colors",
    options: {
      saturationBoost: 1.0,
      brightnessBoost: 0.08,
      contrastBoost: 0.35,
    },
  },
];
