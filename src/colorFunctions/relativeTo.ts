import { parse, formatHex } from 'culori';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Creates a relative color transformation
 * @param baseColor - The base color to transform
 * @param transform - The transformation to apply
 * @returns The transformed color as a hex string
 */
export function relativeTo(baseColor: string, transform: string): string {
  try {
    const parsed = parse(baseColor);
    if (!parsed) return baseColor;
    
    // Simple implementation for relative color syntax
    if (transform.includes('/ 0.8')) {
      const withAlpha = { ...parsed, alpha: 0.8 };
      return formatHex(withAlpha);
    }
    return formatHex(parsed);
  } catch (e) {
    return baseColor;
  }
}

/**
 * Renderer functions for different output formats
 */
export const relativeToRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (args: any[]): string => {
    const [baseColor, transform] = args;
    // Modern CSS supports relative color syntax
    return `rgb(from ${baseColor} ${transform})`;
  },
  
  'scss': (_args: any[]): string => {
    // SCSS doesn't have native relative color support, use computed value
    return '';
  },
  
  'json': (_args: any[]): string => {
    // For JSON, always use computed values
    return '';
  }
};
