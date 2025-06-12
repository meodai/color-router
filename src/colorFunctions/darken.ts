import { parse, formatHex, converter } from 'culori';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Darkens a color by the specified amount
 * @param color - The color to darken
 * @param amount - Amount to darken (0-1, where 0.1 = 10% darker)
 * @returns The darkened color as a hex string
 */
export function darken(color: string, amount: number): string {
  try {
    const c = parse(color);
    if (!c) return color;
    
    const toHsl = converter('hsl');
    const hslColor = toHsl(c);
    if (hslColor && typeof hslColor.l === 'number') {
      hslColor.l = Math.max(0, hslColor.l - amount);
      return formatHex(hslColor);
    }
    return color;
  } catch (e) {
    return color;
  }
}

/**
 * Renderer functions for different output formats
 */
export const darkenRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (args: any[]): string => {
    const [color, amount] = args;
    const percentage = Math.round(parseFloat(amount) * 100);
    return `color-mix(in oklch, ${color} ${100 - percentage}%, black)`;
  },
  
  'scss': (args: any[]): string => {
    const [color, amount] = args;
    const percentage = Math.round(parseFloat(amount) * 100);
    return `darken(${color}, ${percentage}%)`;
  },
  
  'json': (_args: any[]): string => {
    // For JSON, always use computed values
    return '';
  }
};
