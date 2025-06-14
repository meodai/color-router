import { parse, interpolate, formatHex } from 'culori';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Mixes two colors together in a specified color space.
 *
 * @param color1 The first color string (e.g., "#RRGGBB", "rgb(r,g,b)").
 * @param color2 The second color string.
 * @param ratio The mixing ratio, a number between 0 and 1 (default is 0.5). 
 *              If a string is provided, it's parsed as a percentage (e.g., "50%" becomes 0.5).
 *              A ratio of 0 results in `color1`, a ratio of 1 results in `color2`.
 * @param colorSpace The color space for interpolation (e.g., 'lab', 'lch', 'rgb'). Defaults to 'lab'.
 * @returns The resulting mixed color as a hex string. Returns `color1` if parsing fails or an error occurs.
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
    const ratioNum = typeof ratio === 'string' ? parseFloat(ratio) / 100 : ratio;
    return formatHex(interpolator(ratioNum));
  } catch (e) {
    return color1;
  }
}

/**
 * An object containing renderer functions for the `colorMix` color function.
 * These renderers provide format-specific string representations for CSS variables and SCSS.
 * The JSON renderer returns an empty string, indicating `colorMix` should be resolved to its final value for JSON output.
 */
export const colorMixRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (args: any[]): string => {
    const [color1, color2, ratio = 0.5, colorSpace = 'lab'] = args;
    const ratioNum = typeof ratio === 'string' && ratio.includes('%') ? parseFloat(ratio) : parseFloat(ratio) * 100;
    const color1Percentage = 100 - ratioNum;
    return `color-mix(in ${colorSpace}, ${color1} ${color1Percentage}%, ${color2})`;
  },

  scss: (args: any[]): string => {
    const [color1, color2, ratio = 0.5] = args;
    const weight = typeof ratio === 'string' && ratio.includes('%') ? parseFloat(ratio) : parseFloat(ratio) * 100;
    return `mix(${color2}, ${color1}, ${weight}%)`;
  },

  json: (_args: any[]): string => {
    return '';
  },
};
