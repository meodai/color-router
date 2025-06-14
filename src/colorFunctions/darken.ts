import { parse, formatHex, converter } from 'culori';
import type { FunctionRenderer } from '../ColorRenderer';

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

export const darkenRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (args: any[]): string => {
    const [color, amount] = args;
    const percentage = Math.round(parseFloat(amount) * 100);
    return `color-mix(in oklch, ${color} ${100 - percentage}%, black)`;
  },

  scss: (args: any[]): string => {
    const [color, amount] = args;
    const percentage = Math.round(parseFloat(amount) * 100);
    return `darken(${color}, ${percentage}%)`;
  },

  json: (_args: any[]): string => {
    return '';
  },
};
