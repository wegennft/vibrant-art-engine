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
  saturationBoost: 0.65,
  brightnessBoost: 0.10,
  contrastBoost: 0.15,
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
        const newS = Math.min(1, s + saturationBoost * (1 - s)); // boost toward full saturation
        const newL = Math.min(1, l + brightnessBoost * (1 - l)); // gentle brightness lift
        const [r, g, b] = hslToRgb(h, newS, newL);

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
