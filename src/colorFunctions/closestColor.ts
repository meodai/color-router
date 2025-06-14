import { parse, differenceEuclidean } from 'culori';
import type { ColorRouter } from '../router';
import type { FunctionRenderer } from '../renderers';

/**
 * Finds the color in a specified palette that is perceptually closest to a target color.
 * @param this The ColorRouter instance.
 * @param targetColorValue The target color (e.g., 'red', '#FF0000').
 * @param paletteName The name of the palette to search within.
 * @param _options Optional additional parameters.
 * @returns The hex string of the closest color found in the palette, or transparent black if errors occur.
 */
export function closestColor(
  this: ColorRouter,
  targetColorValue: string,
  paletteName: string,
  ..._options: any[]
): string {
  if (typeof targetColorValue !== 'string') {
    console.error('[closestColor] targetColorValue must be a string.');
    return '#00000000';
  }

  if (typeof paletteName !== 'string') {
    console.error('[closestColor] paletteName must be a string.');
    return '#00000000';
  }

  const targetColorParsed = parse(targetColorValue);
  if (!targetColorParsed) {
    console.error(`[closestColor] Could not parse targetColorValue: ${targetColorValue}`);
    return '#00000000';
  }

  let paletteKeys: string[];
  try {
    paletteKeys = this.getAllKeysForPalette(paletteName);
  } catch (error) {
    console.error(`[closestColor] Error getting keys for palette '${paletteName}':`, error);
    return '#00000000';
  }

  if (!paletteKeys || paletteKeys.length === 0) {
    return '#00000000';
  }

  let closestColorHex = '';
  let minDifference = Infinity;

  const differenceFn = differenceEuclidean('rgb');

  for (const key of paletteKeys) {
    const paletteColorValue = this.resolve(key);

    if (!paletteColorValue || paletteColorValue === 'invalid') {
      continue;
    }

    const paletteColorParsed = parse(paletteColorValue);
    if (!paletteColorParsed) {
      continue;
    }

    try {
      const difference = differenceFn(targetColorParsed, paletteColorParsed);
      if (difference < minDifference) {
        minDifference = difference;
        closestColorHex = paletteColorValue;
      }
    } catch (e) {
      // console.error(`[closestColor] Error calculating difference for ${targetColorValue} and ${paletteColorValue}:`, e);
    }
  }

  if (minDifference === Infinity) {
    return '#00000000';
  }

  return closestColorHex;
}

/**
 * Renderer functions for different output formats
 */
export const closestColorRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    return '';
  },

  json: (_args: any[]): string => {
    return '';
  },
};
