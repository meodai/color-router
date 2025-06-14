import { wcagContrast, parse } from 'culori';
import type { ColorRouter } from '../ColorRouter';
import type { FunctionRenderer } from '../ColorRenderer';

export function bestContrastWith(this: ColorRouter, targetColorStr: string, paletteName?: string): string {
  const parsedTargetColor = parse(targetColorStr);
  if (!parsedTargetColor) {
    return '#000000';
  }

  if (!paletteName) {
    return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
  }

  if (!this.getAllPalettes().find((p) => p.name === paletteName)) {
    console.warn(`Palette "${paletteName}" not found, falling back to black/white contrast.`);
    return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
  }

  const paletteKeys = this.getAllKeysForPalette(paletteName);
  if (paletteKeys.length === 0) {
    console.warn(`Palette "${paletteName}" has no colors, falling back to black/white contrast.`);
    return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
  }

  let bestColor: string | null = null;
  let bestContrast = -1;

  for (const key of paletteKeys) {
    try {
      const candidateColor = this.resolve(key);
      if (candidateColor && candidateColor !== 'invalid' && parse(candidateColor)) {
        const contrast = wcagContrast(candidateColor, targetColorStr);
        if (contrast > bestContrast) {
          bestContrast = contrast;
          bestColor = candidateColor;
        }
      }
    } catch (e) {
      continue;
    }
  }

  if (bestColor !== null) {
    return bestColor;
  }

  console.warn(
    `No suitable contrasting color found in palette "${paletteName}" for target "${targetColorStr}". Falling back to black/white contrast.`,
  );
  return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
}

export const bestContrastWithRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    return '';
  },

  scss: (_args: any[]): string => {
    return '';
  },

  json: (_args: any[]): string => {
    return '';
  },
};
