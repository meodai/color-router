import { wcagContrast } from 'culori';
import { parse } from 'culori';
import type { ColorRouter } from '../ColorRouter';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Finds the best contrast color from a specified palette against a target color
 * @param targetColor - The color to find contrast against
 * @param paletteName - Optional palette name to search for contrast colors
 * @returns The color with the best contrast ratio
 */
export function bestContrastWith(this: ColorRouter, targetColor: string, paletteName?: string): string {
  if (!parse(targetColor)) return '#000000';
  
  // If no palette specified, use simple black/white contrast
  if (!paletteName) {
    return wcagContrast('#fff', targetColor) >= wcagContrast('#000', targetColor) ? '#ffffff' : '#000000';
  }
  
  // Get all colors from the specified palette
  if (!this.getAllPalettes().find(p => p.name === paletteName)) {
    console.warn(`Palette "${paletteName}" not found, falling back to black/white`);
    return wcagContrast('#fff', targetColor) >= wcagContrast('#000', targetColor) ? '#ffffff' : '#000000';
  }
  
  const paletteKeys = this.getAllKeysForPalette(paletteName);
  if (paletteKeys.length === 0) {
    console.warn(`Palette "${paletteName}" has no colors, falling back to black/white`);
    return wcagContrast('#fff', targetColor) >= wcagContrast('#000', targetColor) ? '#ffffff' : '#000000';
  }
  
  let bestColor: string | null = null;
  let bestContrast = 0;
  
  for (const key of paletteKeys) {
    try {
      const candidateColor = this.resolve(key);
      if (candidateColor && candidateColor !== 'invalid') {
        const contrast = wcagContrast(candidateColor, targetColor);
        if (contrast > bestContrast) {
          bestContrast = contrast;
          bestColor = candidateColor;
        }
      }
    } catch (e) {
      // Skip invalid colors
      continue;
    }
  }
  
  // Return the best color found, or fallback to first valid color if no good contrast found
  if (bestColor) {
    return bestColor;
  }
  
  // If no colors had good contrast, just return the first valid color
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
  
  // Ultimate fallback if palette has no valid colors
  return '#000000';
}

/**
 * Renderer functions for different output formats
 */
export const bestContrastWithRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    // For CSS, we fall back to computed values since there's no native best-contrast function
    return ''; // This will trigger fallback to computed value
  },
  
  'scss': (_args: any[]): string => {
    // For SCSS, we fall back to computed values since there's no native best-contrast function
    return ''; // This will trigger fallback to computed value
  },
  
  'json': (_args: any[]): string => {
    // For JSON, always use computed values
    return ''; // This will trigger fallback to computed value
  }
};
