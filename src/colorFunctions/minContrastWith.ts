import { wcagContrast, parse } from 'culori';
import type { ColorRouter } from '../ColorRouter';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Finds the first color from a palette that meets the minimum contrast ratio against the target color
 * @param targetColor - The color to find contrast against
 * @param paletteName - Palette name to search for qualifying colors
 * @param minRatio - Minimum contrast ratio required (default: 4.5)
 * @returns The first color from the palette that meets the minimum contrast requirement
 */
export function minContrastWith(this: ColorRouter, targetColor: string, paletteName?: string, minRatio = 4.5): string {
  if (!parse(targetColor)) return '#000000';
  
  // If no palette specified, use simple black/white contrast
  if (!paletteName) {
    const whiteContrast = wcagContrast('#fff', targetColor);
    const blackContrast = wcagContrast('#000', targetColor);
    
    if (whiteContrast >= minRatio) return '#ffffff';
    if (blackContrast >= minRatio) return '#000000';
    
    return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
  }
  
  // Get all colors from the specified palette
  if (!this.getAllPalettes().find(p => p.name === paletteName)) {
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
        
        // Find the color with the lowest contrast that still meets the minimum requirement
        if (contrast >= minRatio && contrast < closestContrast) {
          closestContrast = contrast;
          bestColor = candidateColor;
        }
      }
    } catch (e) {
      // Skip invalid colors
      continue;
    }
  }
  
  // If we found a color that meets the minimum contrast, return it
  if (bestColor) {
    return bestColor;
  }
  
  // If no colors meet the minimum contrast, return the best available contrast from the palette
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
  
  // Return the best color found, or fallback to first valid color
  if (fallbackColor) {
    return fallbackColor;
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
  
  // Ultimate fallback
  return '#000000';
}

/**
 * Renderer functions for different output formats
 */
export const minContrastWithRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    // CSS doesn't have native min-contrast function, use computed value
    return '';
  },
  
  'scss': (_args: any[]): string => {
    // SCSS doesn't have native min-contrast function, use computed value
    return '';
  },
  
  'json': (_args: any[]): string => {
    // For JSON, always use computed values
    return '';
  }
};
