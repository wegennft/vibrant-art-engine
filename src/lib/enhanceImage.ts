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
  saturationBoost: number;  // -1 to 1, negative = desaturate
  brightnessBoost: number;  // -1 to 1, how much to adjust lightness
  contrastBoost: number;    // 0 to 1, how much to increase contrast
  grain?: number;           // 0 to 1, film grain intensity
  vignette?: number;        // 0 to 1, vignette darkness
  warmShift?: number;       // 0 to 1, warm color temperature shift
  preserveHue?: [number, number]; // [min, max] hue range in degrees to keep colored, rest goes B&W
}

const DEFAULT_OPTIONS: EnhanceOptions = {
  saturationBoost: 0.55,
  brightnessBoost: 0.10,
  contrastBoost: 0.15,
};

export function enhanceImageCanvas(
  imageSrc: string,
  options: Partial<EnhanceOptions> = {},
  signal?: AbortSignal
): Promise<string> {
  const { saturationBoost, brightnessBoost, contrastBoost, grain = 0, vignette = 0, warmShift = 0, preserveHue } = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
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

      // B&W mode: full desaturation with dramatic contrast curve
      const isBW = saturationBoost <= -1;

      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue; // skip fully transparent pixels

        const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);

        if (isBW) {
          // Full desaturation
          const newS = 0;
          // Dramatic S-curve for crushed blacks & piercing highlights
          let newL: number;
          if (l < 0.15) {
            // Crush blacks hard
            newL = l * 0.4;
          } else if (l < 0.45) {
            // Bold shadows — push darks down
            newL = Math.max(0, l - (0.45 - l) * contrastBoost * 0.8);
          } else if (l > 0.75) {
            // Piercing highlights — push brights up aggressively
            newL = Math.min(1, l + (l - 0.75) * contrastBoost * 1.5 + brightnessBoost);
          } else {
            // Midtones get moderate contrast
            newL = l + (l - 0.5) * contrastBoost * 0.6;
          }
          newL = Math.max(0, Math.min(1, newL));

          const [r, g, b] = hslToRgb(h, newS, newL);
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          continue;
        }

        // Selective color: desaturate everything except the preserved hue range
        if (preserveHue) {
          const hueDeg = h * 360;
          const [hMin, hMax] = preserveHue;
          const inRange = hMin <= hMax
            ? (hueDeg >= hMin && hueDeg <= hMax)
            : (hueDeg >= hMin || hueDeg <= hMax); // wraps around 360

          if (inRange && s > 0.08) {
            // Keep color — apply mild saturation boost
            const boostedS = Math.min(1, s * (1 + saturationBoost * 0.5));
            const newL = Math.max(0, Math.min(1, l + (l - 0.5) * contrastBoost * 0.3 + brightnessBoost * 0.3));
            const [r, g, b] = hslToRgb(h, boostedS, newL);
            data[i] = r; data[i + 1] = g; data[i + 2] = b;
          } else {
            // Desaturate to B&W with contrast
            const newL = Math.max(0, Math.min(1, l + (l - 0.5) * contrastBoost * 0.4));
            const [r, g, b] = hslToRgb(h, 0, newL);
            data[i] = r; data[i + 1] = g; data[i + 2] = b;
          }
          continue;
        }

        const hueDegrees = h * 360;
        
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
        const isShadowNeutral = l < 0.25 && channelSpread < 18;
        const isHighlightNeutral =
          (l > 0.80 && avgChannel > 210 && channelSpread < 20) ||
          (l > 0.90 && channelSpread < 35);
        // Also catch mid-range greys (e.g. concrete, metal textures)
        const isMidGrey = s < 0.08 && channelSpread < 18;
        const isNeutral = s < 0.06 || isShadowNeutral || isHighlightNeutral || isMidGrey;

        // Gradual neutrality factor: even pixels that aren't fully neutral get reduced
        // boost when they're close to neutral (prevents spots on textured greys)
        // Use a smooth ramp instead of a hard cutoff to avoid grainy transitions
        const rawNeutralityFactor = Math.min(1, Math.max(0, (channelSpread - 12) / 35));
        // Also factor in HSL saturation for a smoother signal
        const satFactor = Math.min(1, s / 0.12);
        const neutralityFactor = isNeutral ? 0 : Math.min(rawNeutralityFactor, satFactor);

        // Protect earthy browns from shifting toward vivid reds/oranges.
        const isWarmHue = hueDegrees >= 8 && hueDegrees <= 55;
        const hasBrownChannelBalance = sourceR > sourceG && sourceG >= sourceB;
        const hasControlledBlue = sourceB <= sourceG * 0.92;
        const isBrownLightness = l >= 0.16 && l <= 0.52;
        const isBrownSaturation = s >= 0.18 && s <= 0.75;
        const isEarthTone =
          isWarmHue &&
          hasBrownChannelBalance &&
          hasControlledBlue &&
          isBrownLightness &&
          isBrownSaturation;

        const brownProtection = isEarthTone
          ? Math.max(0.2, Math.min(0.65, 1 - ((0.52 - l) * 0.9 + s * 0.25)))
          : 1;

        // Fade vibrancy out more aggressively near black and near white.
        const darkFade = l < 0.40 ? Math.max(0, (l - 0.18) / 0.22) : 1;
        const lightFade = l > 0.55 ? Math.max(0, (0.90 - l) / 0.35) : 1;
        const effectiveSatBoost = saturationBoost * darkFade * lightFade * neutralityFactor * brownProtection;
        // Proportional boost: multiply existing saturation rather than pushing toward 1.0
        const boostedS = Math.min(1, s * (1 + effectiveSatBoost) );
        // Smoothly blend toward zero saturation for near-neutral pixels instead of hard cutoff
        const desatBlend = isShadowNeutral || isHighlightNeutral || isMidGrey
          ? Math.min(1, Math.max(0.15, channelSpread / 15))
          : 1;
        const newS = boostedS * desatBlend;

        // Keep shadows dark, brighten highlights, and only lift midtones.
        let newL: number;
        if (l < 0.30) {
          const shadowContrast = contrastBoost * (isEarthTone ? 0.6 : 0.9);
          newL = Math.max(0, l + (l - 0.5) * shadowContrast);
        } else if (l > 0.78) {
          newL = Math.min(1, l + (1 - l) * 0.45);
        } else {
          const contrastL = l + (l - 0.5) * contrastBoost * (isEarthTone ? 0.82 : 1);
          const clampedL = Math.max(0, Math.min(1, contrastL));
          const midtoneBrightness = l > 0.68 ? brightnessBoost * 0.35 : brightnessBoost * (isEarthTone ? 0.88 : 1);
          newL = Math.min(1, clampedL * (1 + midtoneBrightness * 0.5) + midtoneBrightness * 0.3 * (1 - clampedL));
        }

        const [r, g, b] = hslToRgb(h, newS, newL);

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
        // alpha unchanged — exact same transparency
      }

      // Warm color temperature shift
      if (warmShift > 0) {
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue;
          // Boost reds/yellows, reduce blues for warm sunlight feel
          data[i] = Math.min(255, data[i] + warmShift * 18);       // R up
          data[i + 1] = Math.min(255, data[i + 1] + warmShift * 6); // G slight up
          data[i + 2] = Math.max(0, data[i + 2] - warmShift * 14);  // B down
        }
        ctx.putImageData(imageData, 0, 0);
      } else {
        ctx.putImageData(imageData, 0, 0);
      }

      // Film grain overlay
      if (grain > 0) {
        const grainData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const gd = grainData.data;
        for (let i = 0; i < gd.length; i += 4) {
          if (gd[i + 3] === 0) continue;
          const noise = (Math.random() - 0.5) * grain * 80;
          gd[i] = Math.max(0, Math.min(255, gd[i] + noise));
          gd[i + 1] = Math.max(0, Math.min(255, gd[i + 1] + noise));
          gd[i + 2] = Math.max(0, Math.min(255, gd[i + 2] + noise));
        }
        ctx.putImageData(grainData, 0, 0);
      }

      // Vignette overlay
      if (vignette > 0) {
        const cx = canvas.width / 2;
        const cy = canvas.height / 2;
        const maxR = Math.sqrt(cx * cx + cy * cy);
        const gradient = ctx.createRadialGradient(cx, cy, maxR * 0.35, cx, cy, maxR);
        gradient.addColorStop(0, `rgba(0,0,0,0)`);
        gradient.addColorStop(1, `rgba(0,0,0,${vignette * 0.7})`);
        ctx.fillStyle = gradient;
        ctx.globalCompositeOperation = "multiply";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = "source-over";
      }

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = imageSrc;
  });
}
