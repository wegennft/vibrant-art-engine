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
    id: "ai-art",
    name: "AI Art",
    description: "AI-powered artistic re-imagination — generates a stylized version of each trait while keeping the same dimensions",
    options: {
      saturationBoost: 0,
      brightnessBoost: 0,
      contrastBoost: 0,
      aiGenerate: true,
      aiPrompt: "Re-imagine this image as a stylized digital art piece. Keep the same subject, pose, and composition. Make it vibrant, polished, and visually striking. Maintain the EXACT same pixel dimensions. Preserve transparent areas (alpha=0) — do NOT add any background. Output as PNG.",
    },
  },
];
