import { wcagContrast, parse } from 'culori';
import type { ColorRouter } from '../router';
import type { FunctionRenderer } from '../renderers';

/**
 * Finds the color from a specified palette (or black/white as a fallback) that has the best WCAG contrast ratio against a target color.
 *
 * The `this` context must be bound to a `ColorRouter` instance.
 *
 * @param this The ColorRouter instance.
 * @param targetColorStr The target color string (e.g., "#RRGGBB", "rgb(r,g,b)") to contrast against.
 * @param paletteName Optional. The name of the palette to search for the contrasting color.
 *                    If not provided, or if the palette is not found or is empty,
 *                    it defaults to choosing between black ("#000000") and white ("#ffffff").
 * @returns The color string from the palette (or black/white) that has the highest contrast ratio with the target color.
 *          Returns black ("#000000") if the target color string is invalid.
 */
export function bestContrastWith(this: ColorRouter, targetColorStr: string, paletteName?: string): string {
  const parsedTargetColor = parse(targetColorStr);
  if (!parsedTargetColor) {
    return '#000000';
  }

  if (!paletteName) {
    return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
  }

  if (!this.getAllPalettes().find((p) => p.name === paletteName)) {
    console.warn(`Palette "${paletteName}" not found, falling back to black/white contrast.`);
    return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
  }

  const paletteKeys = this.getAllKeysForPalette(paletteName);
  if (paletteKeys.length === 0) {
    console.warn(`Palette "${paletteName}" has no colors, falling back to black/white contrast.`);
    return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
  }

  let bestColor: string | null = null;
  let bestContrast = -1;

  for (const key of paletteKeys) {
    try {
      const candidateColor = this.resolve(key);
      if (candidateColor && candidateColor !== 'invalid' && parse(candidateColor)) {
        const contrast = wcagContrast(candidateColor, targetColorStr);
        if (contrast > bestContrast) {
          bestContrast = contrast;
          bestColor = candidateColor;
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (bestColor !== null) {
    return bestColor;
  }

  console.warn(
    `No suitable contrasting color found in palette "${paletteName}" for target "${targetColorStr}". Falling back to black/white contrast.`,
  );
  return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
}

/**
 * An object containing placeholder renderer functions for the `bestContrastWith` color function.
 * These renderers currently return empty strings, indicating that `bestContrastWith` should be resolved to its final value
 * rather than being represented as a function call in CSS or SCSS.
 */
export const bestContrastWithRenderers: Record<string, FunctionRenderer> = {
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
