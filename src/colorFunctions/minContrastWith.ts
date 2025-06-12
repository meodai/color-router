import { wcagContrast, parse } from 'culori';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Finds a color that meets the minimum contrast ratio against the target color
 * @param targetColor - The color to find contrast against
 * @param minRatio - Minimum contrast ratio required (default: 1.5)
 * @returns A color that meets the minimum contrast requirement
 */
export function minContrastWith(targetColor: string, minRatio = 1.5): string {
  if (!parse(targetColor)) return '#000000';
  const whiteContrast = wcagContrast('#fff', targetColor);
  const blackContrast = wcagContrast('#000', targetColor);
  
  if (whiteContrast >= minRatio) return '#ffffff';
  if (blackContrast >= minRatio) return '#000000';
  
  return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
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
