import { parse, formatHex, converter } from 'culori';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Lightens a color by the specified amount
 * @param color - The color to lighten
 * @param amount - Amount to lighten (0-1, where 0.1 = 10% lighter)
 * @returns The lightened color as a hex string
 */
export function lighten(color: string, amount: number): string {
  try {
    const c = parse(color);
    if (!c) return color;

    const toHsl = converter('hsl');
    const hslColor = toHsl(c);
    if (hslColor && typeof hslColor.l === 'number') {
      hslColor.l = Math.min(1, hslColor.l + amount);
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
export const lightenRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (args: any[]): string => {
    const [color, amount] = args;
    const percentage = Math.round(parseFloat(amount) * 100);
    return `color-mix(in oklch, ${color} ${100 - percentage}%, white)`;
  },

  scss: (args: any[]): string => {
    const [color, amount] = args;
    const percentage = Math.round(parseFloat(amount) * 100);
    return `lighten(${color}, ${percentage}%)`;
  },

  json: (_args: any[]): string => {
    // For JSON, always use computed values
    return '';
  },
};
