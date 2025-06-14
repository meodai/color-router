import { parse, interpolate, formatHex } from 'culori';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Mixes two colors using the specified ratio and color space
 * @param color1 - First color to mix
 * @param color2 - Second color to mix
 * @param ratio - Mix ratio (0-1 or percentage string). 0.5 means 50% of each color
 * @param colorSpace - Color space for mixing (default: 'lab')
 * @returns The mixed color as a hex string
 */
export function colorMix(
  color1: string,
  color2: string,
  ratio: number | string = 0.5,
  colorSpace: string = 'lab',
): string {
  try {
    const parsed1 = parse(color1);
    const parsed2 = parse(color2);
    if (!parsed1 || !parsed2) return color1;

    const interpolator = interpolate([parsed1, parsed2], colorSpace as any);
    // Handle both numeric (0-1) and percentage string inputs
    const ratioNum = typeof ratio === 'string' ? parseFloat(ratio) / 100 : ratio;
    return formatHex(interpolator(ratioNum));
  } catch (e) {
    return color1;
  }
}

/**
 * Renderer functions for different output formats
 */
export const colorMixRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (args: any[]): string => {
    const [color1, color2, ratio = 0.5, colorSpace = 'lab'] = args;
    // Convert ratio to percentage if it's a decimal
    const ratioNum = typeof ratio === 'string' && ratio.includes('%') ? parseFloat(ratio) : parseFloat(ratio) * 100;
    // CSS color-mix syntax: color-mix(in space, color1 percentage, color2)
    // Our colorMix(color1, color2, ratio) means: ratio% of color2 mixed with color1
    // So we need to use (100 - ratio)% for color1 and ratio% for color2
    const color1Percentage = 100 - ratioNum;
    return `color-mix(in ${colorSpace}, ${color1} ${color1Percentage}%, ${color2})`;
  },

  scss: (args: any[]): string => {
    const [color1, color2, ratio = 0.5] = args;
    const weight = typeof ratio === 'string' && ratio.includes('%') ? parseFloat(ratio) : parseFloat(ratio) * 100;
    // SCSS mix(color1, color2, weight) means weight% of color1 mixed with color2
    // Our colorMix(color1, color2, ratio) means ratio% of color2 mixed with color1
    // So we use: mix(color2, color1, weight) to get weight% of color2 mixed with color1
    return `mix(${color2}, ${color1}, ${weight}%)`;
  },

  json: (_args: any[]): string => {
    // For JSON, always use computed values
    return '';
  },
};
