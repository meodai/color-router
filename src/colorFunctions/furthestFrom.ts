import { parse, converter } from 'culori';
import type { ColorRouter } from '../ColorRouter';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Calculates the distance between two colors in LAB color space
 */
function colorDistance(color1: string, color2: string): number {
  try {
    const toLab = converter('lab');
    const lab1 = toLab(parse(color1));
    const lab2 = toLab(parse(color2));

    if (!lab1 || !lab2) return 0;

    // Calculate Euclidean distance in LAB space
    const deltaL = (lab1.l || 0) - (lab2.l || 0);
    const deltaA = (lab1.a || 0) - (lab2.a || 0);
    const deltaB = (lab1.b || 0) - (lab2.b || 0);

    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  } catch (e) {
    return 0;
  }
}

/**
 * Finds the color that is furthest apart from all other colors in a palette
 * @param paletteName - The palette name to search for the most isolated color
 * @returns The color with the highest average distance to all other colors
 */
export function furthestFrom(this: ColorRouter, paletteName: string): string {
  // Get all colors from the specified palette
  if (!this.getAllPalettes().find((p) => p.name === paletteName)) {
    console.warn(`Palette "${paletteName}" not found, returning black`);
    return '#000000';
  }

  const paletteKeys = this.getAllKeysForPalette(paletteName);
  if (paletteKeys.length === 0) {
    console.warn(`Palette "${paletteName}" has no colors, returning black`);
    return '#000000';
  }

  if (paletteKeys.length === 1) {
    // Only one color in palette, return it
    try {
      const color = this.resolve(paletteKeys[0]);
      return color !== 'invalid' ? color : '#000000';
    } catch (e) {
      return '#000000';
    }
  }

  // Resolve all colors first and filter out invalid ones
  const validColors: { key: string; color: string }[] = [];
  for (const key of paletteKeys) {
    try {
      const color = this.resolve(key);
      if (color && color !== 'invalid') {
        validColors.push({ key, color });
      }
    } catch (e) {
      // Skip invalid colors
      continue;
    }
  }

  if (validColors.length === 0) {
    return '#000000';
  }

  if (validColors.length === 1) {
    return validColors[0].color;
  }

  let furthestColor: string = validColors[0].color;
  let maxAverageDistance = 0;

  // Calculate average distance for each color to all others
  for (const { color: currentColor } of validColors) {
    let totalDistance = 0;
    let comparisonCount = 0;

    for (const { color: otherColor } of validColors) {
      if (currentColor !== otherColor) {
        totalDistance += colorDistance(currentColor, otherColor);
        comparisonCount++;
      }
    }

    const averageDistance = comparisonCount > 0 ? totalDistance / comparisonCount : 0;

    if (averageDistance > maxAverageDistance) {
      maxAverageDistance = averageDistance;
      furthestColor = currentColor;
    }
  }

  return furthestColor;
}

/**
 * Renderer functions for different output formats
 */
export const furthestFromRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    // CSS doesn't have native furthest-from function, use computed value
    return '';
  },

  scss: (_args: any[]): string => {
    // SCSS doesn't have native furthest-from function, use computed value
    return '';
  },

  json: (_args: any[]): string => {
    // For JSON, always use computed values
    return '';
  },
};
