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
  {
    id: "bw-film-noir",
    name: "B&W Film Noir",
    description: "Cinematic still, moody shadows, low key lighting, grain texture, vignette",
    options: {
      saturationBoost: -1,
      brightnessBoost: -0.08,
      contrastBoost: 0.70,
      grain: 0.35,
      vignette: 0.6,
    },
  },
  {
    id: "fall-time",
    name: "Fall Time",
    description: "Warm sunlight, vibrant fall colors, burnt orange & hunter green tones",
    options: {
      saturationBoost: 0.65,
      brightnessBoost: 0.08,
      contrastBoost: 0.18,
      warmShift: 0.35,
    },
  },
  {
    id: "green-pop",
    name: "Green Pop",
    description: "Black & white with only green shades preserved in full color",
    options: {
      saturationBoost: 0,
      brightnessBoost: 0.05,
      contrastBoost: 0.20,
      preserveHue: [80, 160],
    },
  },
];
