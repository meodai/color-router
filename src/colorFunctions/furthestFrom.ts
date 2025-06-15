import { parse, converter } from 'culori';
import type { TokenEngine } from '../engine/TokenEngine';
import type { FunctionRenderer } from '../renderers';

/**
 * Calculates the CIELAB Delta E (Euclidean distance) between two colors.
 * @param color1 The first color string.
 * @param color2 The second color string.
 * @returns The perceptual distance between the two colors. Returns 0 if parsing fails or an error occurs.
 */
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

/**
 * Finds the color within a specified scope that has the greatest average perceptual distance
 * to all other colors in the same scope. The distance is calculated in the CIELAB color space.
 *
 * @param engine The TokenEngine instance to access tokens from.
 * @param scopeName The name of the scope to search within.
 * @returns The hex string of the color that is, on average, furthest from other colors in the scope.
 *          Returns black ("#000000") if the scope is not found, is empty, or contains no valid/resolvable colors.
 */
export function furthestFrom(engine: TokenEngine, scopeName: string): string {
  const scopeKeys = engine.getAllTokensForScope(scopeName);
  if (scopeKeys.length === 0) {
    console.warn(`Scope "${scopeName}" has no tokens, returning black`);
    return '#000000';
  }

  if (scopeKeys.length === 1) {
    try {
      const color = engine.resolve(scopeKeys[0]);
      return color !== 'invalid' ? color : '#000000';
    } catch (e) {
      return '#000000';
    }
  }

  const validColors: { key: string; color: string }[] = [];
  for (const key of scopeKeys) {
    try {
      const color = engine.resolve(key);
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

/**
 * An object containing placeholder renderer functions for the `furthestFrom` color function.
 * These renderers currently return empty strings, indicating that `furthestFrom` should be resolved to its final value
 * rather than being represented as a function call in CSS.
 */
export const furthestFromRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    return '';
  },

  json: (_args: any[]): string => {
    return '';
  },
};
