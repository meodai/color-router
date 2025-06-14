import { wcagContrast, parse } from 'culori';
import type { ColorRouter } from '../ColorRouter';
import type { FunctionRenderer } from '../ColorRenderer';

export function minContrastWith(this: ColorRouter, targetColor: string, paletteName?: string, minRatio = 4.5): string {
  if (!parse(targetColor)) return '#000000';

  if (!paletteName) {
    const whiteContrast = wcagContrast('#fff', targetColor);
    const blackContrast = wcagContrast('#000', targetColor);

    if (whiteContrast >= minRatio) return '#ffffff';
    if (blackContrast >= minRatio) return '#000000';

    return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
  }

  if (!this.getAllPalettes().find((p) => p.name === paletteName)) {
    console.warn(`Palette "${paletteName}" not found, falling back to black/white`);
    const whiteContrast = wcagContrast('#fff', targetColor);
    const blackContrast = wcagContrast('#000', targetColor);

    if (whiteContrast >= minRatio) return '#ffffff';
    if (blackContrast >= minRatio) return '#000000';

    return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
  }

  const paletteKeys = this.getAllKeysForPalette(paletteName);
  if (paletteKeys.length === 0) {
    console.warn(`Palette "${paletteName}" has no colors, falling back to black/white`);
    const whiteContrast = wcagContrast('#fff', targetColor);
    const blackContrast = wcagContrast('#000', targetColor);

    if (whiteContrast >= minRatio) return '#ffffff';
    if (blackContrast >= minRatio) return '#000000';

    return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
  }

  let bestColor: string | null = null;
  let closestContrast = Infinity;

  for (const key of paletteKeys) {
    try {
      const candidateColor = this.resolve(key);
      if (candidateColor && candidateColor !== 'invalid') {
        const contrast = wcagContrast(candidateColor, targetColor);

        if (contrast >= minRatio && contrast < closestContrast) {
          closestContrast = contrast;
          bestColor = candidateColor;
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (bestColor) {
    return bestColor;
  }

  let fallbackColor: string | null = null;
  let bestContrast = 0;

  for (const key of paletteKeys) {
    try {
      const candidateColor = this.resolve(key);
      if (candidateColor && candidateColor !== 'invalid') {
        const contrast = wcagContrast(candidateColor, targetColor);
        if (contrast > bestContrast) {
          bestContrast = contrast;
          fallbackColor = candidateColor;
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (fallbackColor) {
    return fallbackColor;
  }

  for (const key of paletteKeys) {
    try {
      const candidateColor = this.resolve(key);
      if (candidateColor && candidateColor !== 'invalid') {
        return candidateColor;
      }
    } catch (e) {
      continue;
    }
  }

  return '#000000';
}

export const minContrastWithRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    return '';
  },

  scss: (_args: any[]): string => {
    return '';
  },

  json: (_args: any[]): string => {
    return '';
  },
};
