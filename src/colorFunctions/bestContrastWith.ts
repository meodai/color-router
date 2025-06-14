import { wcagContrast, parse } from 'culori';
import type { ColorRouter } from '../ColorRouter';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Finds the best contrast color from a specified palette against a target color
 * @param targetColorStr - The color to find contrast against
 * @param paletteName - Optional palette name to search for contrast colors
 * @returns The color with the best contrast ratio
 */
export function bestContrastWith(this: ColorRouter, targetColorStr: string, paletteName?: string): string {
  const parsedTargetColor = parse(targetColorStr);
  if (!parsedTargetColor) {
    // Maintain original behavior for invalid targetColor: return black
    return '#000000';
  }

  // If no palette specified, use simple black/white contrast
  if (!paletteName) {
    return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
  }

  // Get all colors from the specified palette
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
  let bestContrast = -1; // Initialize to -1 to ensure any valid contrast (>=1) is chosen

  for (const key of paletteKeys) {
    try {
      const candidateColor = this.resolve(key);
      // Ensure candidateColor is a valid color string before using in wcagContrast
      if (candidateColor && candidateColor !== 'invalid' && parse(candidateColor)) {
        const contrast = wcagContrast(candidateColor, targetColorStr);
        if (contrast > bestContrast) {
          bestContrast = contrast;
          bestColor = candidateColor;
        }
      }
    } catch (e) {
      // Skip invalid or problematic colors
      // console.warn(`Error processing key "${key}" in palette "${paletteName}" for contrast:`, e); // Optional: for debugging
      continue;
    }
  }

  // Return the best color found from the palette
  if (bestColor !== null) {
    return bestColor;
  }

  // If no suitable color was found in the palette, fall back to black/white contrast.
  console.warn(
    `No suitable contrasting color found in palette "${paletteName}" for target "${targetColorStr}". Falling back to black/white contrast.`,
  );
  return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
}

/**
 * Renderer functions for different output formats
 */
export const bestContrastWithRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    // For CSS, we fall back to computed values since there's no native best-contrast function
    return ''; // This will trigger fallback to computed value
  },

  scss: (_args: any[]): string => {
    // For SCSS, we fall back to computed values since there's no native best-contrast function
    return ''; // This will trigger fallback to computed value
  },

  json: (_args: any[]): string => {
    // For JSON, always use computed values
    return ''; // This will trigger fallback to computed value
  },
};
