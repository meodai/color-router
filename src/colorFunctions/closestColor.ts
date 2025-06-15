import { parse, differenceEuclidean } from 'culori';
import type { TokenEngine } from '../engine/TokenEngine';
import type { FunctionRenderer } from '../renderers';

/**
 * Finds the color in a specified scope that is perceptually closest to a target color.
 * @param engine The TokenEngine instance to access tokens from.
 * @param targetColorValue The target color (e.g., 'red', '#FF0000').
 * @param scopeName The name of the scope to search within.
 * @param _options Optional additional parameters.
 * @returns The hex string of the closest color found in the scope, or transparent black if errors occur.
 */
export function closestColor(
  engine: TokenEngine,
  targetColorValue: string,
  scopeName: string,
  ..._options: any[]
): string {
  if (typeof targetColorValue !== 'string') {
    console.error('[closestColor] targetColorValue must be a string.');
    return '#00000000';
  }

  if (typeof scopeName !== 'string') {
    console.error('[closestColor] scopeName must be a string.');
    return '#00000000';
  }

  const targetColorParsed = parse(targetColorValue);
  if (!targetColorParsed) {
    console.error(`[closestColor] Could not parse targetColorValue: ${targetColorValue}`);
    return '#00000000';
  }

  let scopeKeys: string[];
  try {
    scopeKeys = engine.getAllTokensForScope(scopeName);
  } catch (error) {
    console.error(`[closestColor] Error getting keys for scope '${scopeName}':`, error);
    return '#00000000';
  }

  if (!scopeKeys || scopeKeys.length === 0) {
    return '#00000000';
  }

  let closestColorHex = '';
  let minDifference = Infinity;

  const differenceFn = differenceEuclidean('rgb');

  for (const key of scopeKeys) {
    const scopeColorValue = engine.resolve(key);

    if (!scopeColorValue || scopeColorValue === 'invalid') {
      continue;
    }

    const scopeColorParsed = parse(scopeColorValue);
    if (!scopeColorParsed) {
      continue;
    }

    try {
      const difference = differenceFn(targetColorParsed, scopeColorParsed);
      if (difference < minDifference) {
        minDifference = difference;
        closestColorHex = scopeColorValue;
      }
    } catch (e) {
      // console.error(`[closestColor] Error calculating difference for ${targetColorValue} and ${scopeColorValue}:`, e);
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
