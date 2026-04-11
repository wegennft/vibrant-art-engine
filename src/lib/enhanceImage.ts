/**
 * Programmatic image enhancement via canvas pixel manipulation.
 * Boosts saturation and brightness while preserving exact pixel positions,
 * dimensions, and alpha channel — guaranteeing perfect layer alignment.
 */

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1/3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1/3) * 255),
  ];
}

export interface EnhanceOptions {
  saturationBoost: number;  // 0 to 1, how much to increase saturation
  brightnessBoost: number;  // 0 to 1, how much to increase lightness
  contrastBoost: number;    // 0 to 1, how much to increase contrast
}

const DEFAULT_OPTIONS: EnhanceOptions = {
  saturationBoost: 0.80,
  brightnessBoost: 0.12,
  contrastBoost: 0.20,
};

export function enhanceImageCanvas(
  imageSrc: string,
  options: Partial<EnhanceOptions> = {}
): Promise<string> {
  const { saturationBoost, brightnessBoost, contrastBoost } = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return reject(new Error("Canvas context unavailable"));

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue; // skip fully transparent pixels

        const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
        
        // Treat near-neutral shadows/highlights as neutral so they stay black/white.
        // HSL saturation is noisy in very dark/bright pixels, so inspect raw RGB spread too.
        const sourceR = data[i];
        const sourceG = data[i + 1];
        const sourceB = data[i + 2];
        const maxChannel = Math.max(sourceR, sourceG, sourceB);
        const minChannel = Math.min(sourceR, sourceG, sourceB);
        const avgChannel = (sourceR + sourceG + sourceB) / 3;
        const channelSpread = maxChannel - minChannel;
        const isShadowNeutral = l < 0.32 && channelSpread < 24;
        const isHighlightNeutral =
          (l > 0.65 && avgChannel > 180 && channelSpread < 50) ||
          (l > 0.75 && minChannel > 170 && channelSpread < 65) ||
          (l > 0.85 && channelSpread < 80);
        const isNeutral = s < 0.08 || isShadowNeutral || isHighlightNeutral;

        // Fade vibrancy out more aggressively near black and near white.
        const darkFade = l < 0.38 ? Math.max(0, (l - 0.20) / 0.18) : 1;
        const lightFade = l > 0.60 ? Math.max(0, (0.88 - l) / 0.28) : 1;
        const effectiveSatBoost = isNeutral ? 0 : saturationBoost * darkFade * lightFade;
        const boostedS = Math.min(1, s + effectiveSatBoost * (1 - s));
        const newS = isShadowNeutral || isHighlightNeutral ? 0 : boostedS;

        // Keep shadows dark, brighten highlights, and only lift midtones.
        let newL: number;
        if (l < 0.30) {
          newL = Math.max(0, l + (l - 0.5) * (contrastBoost * 1.35));
        } else if (l > 0.78) {
          newL = Math.min(1, l + (1 - l) * 0.72);
        } else {
          const contrastL = l + (l - 0.5) * contrastBoost;
          const clampedL = Math.max(0, Math.min(1, contrastL));
          const midtoneBrightness = l > 0.68 ? brightnessBoost * 0.35 : brightnessBoost;
          newL = Math.min(1, clampedL + midtoneBrightness * (1 - clampedL));
        }

        let r: number;
        let g: number;
        let b: number;

        if (isShadowNeutral || isHighlightNeutral) {
          const neutral = Math.round(newL * 255);
          r = neutral;
          g = neutral;
          b = neutral;
        } else {
          [r, g, b] = hslToRgb(h, newS, newL);
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        // alpha unchanged — exact same transparency
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });
}
