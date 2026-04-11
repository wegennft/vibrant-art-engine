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

        // Wider neutral detection to prevent greys/near-whites getting tinted
        const isShadowNeutral = l < 0.35 && channelSpread < 30;
        const isHighlightNeutral =
          (l > 0.55 && avgChannel > 150 && channelSpread < 55) ||
          (l > 0.65 && minChannel > 140 && channelSpread < 70) ||
          (l > 0.75 && channelSpread < 85) ||
          (l > 0.85 && channelSpread < 100);
        // Also catch mid-range greys (e.g. concrete, metal textures)
        const isMidGrey = s < 0.15 && channelSpread < 35;
        const isNeutral = s < 0.10 || isShadowNeutral || isHighlightNeutral || isMidGrey;

        // Gradual neutrality factor: even pixels that aren't fully neutral get reduced
        // boost when they're close to neutral (prevents spots on textured greys)
        const neutralityFactor = isNeutral ? 0 : Math.min(1, Math.max(0, (channelSpread - 25) / 40));

        // Fade vibrancy out more aggressively near black and near white.
        const darkFade = l < 0.40 ? Math.max(0, (l - 0.18) / 0.22) : 1;
        const lightFade = l > 0.55 ? Math.max(0, (0.90 - l) / 0.35) : 1;
        const effectiveSatBoost = saturationBoost * darkFade * lightFade * neutralityFactor;
        const boostedS = Math.min(1, s + effectiveSatBoost * (1 - s));
        const newS = isShadowNeutral || isHighlightNeutral || isMidGrey ? 0 : boostedS;

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

        if (isShadowNeutral || isHighlightNeutral || isMidGrey) {
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
