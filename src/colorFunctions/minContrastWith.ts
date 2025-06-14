import { wcagContrast, parse } from 'culori';
import type { ColorRouter } from '../router';
import type { FunctionRenderer } from '../renderers';

/**
 * Finds a color from a specified palette (or black/white as a fallback) that meets a minimum WCAG contrast ratio
 * against a target color. If multiple colors meet the criteria, it returns the one closest to the minimum ratio.
 * If no color meets the minimum ratio, it returns the color with the highest contrast.
 * If the palette is empty or no valid colors are found, it defaults to black or white.
 *
 * The `this` context must be bound to a `ColorRouter` instance.
 *
 * @param this The ColorRouter instance.
 * @param targetColor The target color string (e.g., "#RRGGBB", "rgb(r,g,b)") to contrast against.
 * @param paletteName Optional. The name of the palette to search. If not provided or invalid,
 *                    defaults to checking black and white.
 * @param minRatio The minimum WCAG contrast ratio required (default is 4.5).
 * @returns The hex string of the color that meets the criteria. Returns black ("#000000") if `targetColor` is invalid
 *          or if no suitable color can be determined.
 */
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

/**
 * An object containing placeholder renderer functions for the `minContrastWith` color function.
 * These renderers currently return empty strings, indicating that `minContrastWith` should be resolved to its final value
 * rather than being represented as a function call in CSS.
 */
export const minContrastWithRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    return '';
  },

  json: (_args: any[]): string => {
    return '';
  },
};
