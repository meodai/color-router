import { parse, interpolate, formatHex } from 'culori';
import type { FunctionRenderer } from '../ColorRenderer';

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
