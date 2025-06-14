import { parse, converter } from 'culori';
import type { ColorRouter } from '../ColorRouter';
import type { FunctionRenderer } from '../ColorRenderer';

function colorDistance(color1: string, color2: string): number {
  try {
    const toLab = converter('lab');
    const lab1 = toLab(parse(color1));
    const lab2 = toLab(parse(color2));

    if (!lab1 || !lab2) return 0;

    const deltaL = (lab1.l || 0) - (lab2.l || 0);
    const deltaA = (lab1.a || 0) - (lab2.a || 0);
    const deltaB = (lab1.b || 0) - (lab2.b || 0);

    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  } catch (e) {
    return 0;
  }
}

export function furthestFrom(this: ColorRouter, paletteName: string): string {
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
    try {
      const color = this.resolve(paletteKeys[0]);
      return color !== 'invalid' ? color : '#000000';
    } catch (e) {
      return '#000000';
    }
  }

  const validColors: { key: string; color: string }[] = [];
  for (const key of paletteKeys) {
    try {
      const color = this.resolve(key);
      if (color && color !== 'invalid') {
        validColors.push({ key, color });
      }
    } catch (e) {
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

export const furthestFromRenderers: Record<string, FunctionRenderer> = {
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
