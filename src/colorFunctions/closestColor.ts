import { parse, differenceEuclidean } from 'culori';
import type { ColorRouter } from '../ColorRouter';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Finds the color in a specified palette that is perceptually closest to a target color.
 * @param this The ColorRouter instance.
 * @param targetColorValue The target color (e.g., 'red', '#FF0000').
 * @param paletteName The name of the palette to search within.
 * @param _options Optional additional parameters (currently ignored).
 * @returns The hex string of the closest color found in the palette, or transparent black if errors occur.
 */
export function closestColor(
  this: ColorRouter,
  targetColorValue: string,
  paletteName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ..._options: any[] // Allows for extra parameters like the '0' in the example
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
    // This isn't necessarily an error, the palette might be legitimately empty.
    // Depending on desired behavior, could return targetColorValue or a specific default.
    // console.warn(`[closestColor] No keys found for palette: ${paletteName}`);
    return '#00000000';
  }

  let closestColorHex = '';
  let minDifference = Infinity;

  // Using 'lab' for differenceEuclidean is a common choice for perceptual distance.
  // For higher accuracy, deltaE2000 could be used if available and preferred.
  // const differenceFn = differenceDeltaE2000; // If using culori/fn for deltaE2000
  const differenceFn = differenceEuclidean('rgb'); // Or 'lab' for better perceptual results: differenceEuclidean('lab')

  for (const key of paletteKeys) {
    const paletteColorValue = this.resolve(key); // Already returns a normalized hex or 'invalid'

    if (!paletteColorValue || paletteColorValue === 'invalid') {
      // console.warn(`[closestColor] Skipping invalid color for key ${key} in palette ${paletteName}`);
      continue;
    }

    const paletteColorParsed = parse(paletteColorValue);
    if (!paletteColorParsed) {
      // console.warn(`[closestColor] Could not parse palette color value: ${paletteColorValue} for key ${key}`);
      continue;
    }

    try {
      const difference = differenceFn(targetColorParsed, paletteColorParsed);
      if (difference < minDifference) {
        minDifference = difference;
        closestColorHex = paletteColorValue; // This is already a hex string from resolve()
      }
    } catch (e) {
      // console.error(`[closestColor] Error calculating difference for ${targetColorValue} and ${paletteColorValue}:`, e);
    }
  }

  if (minDifference === Infinity) {
    // console.warn(`[closestColor] No comparable colors found in palette '${paletteName}' for target '${targetColorValue}'.`);
    return '#00000000'; // Fallback if no valid colors were compared
  }

  return closestColorHex;
}

/**
 * Renderer functions for different output formats
 */
export const closestColorRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    // CSS doesn't have native closest-color function, use computed value
    return '';
  },

  scss: (_args: any[]): string => {
    // SCSS doesn't have native closest-color function, use computed value
    return '';
  },

  json: (_args: any[]): string => {
    // For JSON, always use computed values
    return '';
  },
};
