import { wcagContrast, parse } from 'culori';
import type { TokenEngine } from '../engine/TokenEngine';
import type { FunctionRenderer } from '../renderers';

/**
 * Finds the color from a specified scope (or black/white as a fallback) that has the best WCAG contrast ratio against a target color.
 *
 * @param engine The TokenEngine instance to access tokens from.
 * @param targetColorStr The target color string (e.g., "#RRGGBB", "rgb(r,g,b)") to contrast against.
 * @param scopeName Optional. The name of the scope to search for the contrasting color.
 *                  If not provided, or if the scope is not found or is empty,
 *                  it defaults to choosing between black ("#000000") and white ("#ffffff").
 * @returns The color string from the scope (or black/white) that has the highest contrast ratio with the target color.
 *          Returns black ("#000000") if the target color string is invalid.
 */
export function bestContrastWith(engine: TokenEngine, targetColorStr: string, scopeName?: string): string {
  const parsedTargetColor = parse(targetColorStr);
  if (!parsedTargetColor) {
    return '#000000';
  }

  if (!scopeName) {
    return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
  }

  const scopeKeys = engine.getAllTokensForScope(scopeName);
  if (scopeKeys.length === 0) {
    console.warn(`Scope "${scopeName}" has no tokens, falling back to black/white contrast.`);
    return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
  }

  let bestColor: string | null = null;
  let bestContrast = -1;

  for (const key of scopeKeys) {
    try {
      const candidateColor = engine.resolve(key);
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
    `No suitable contrasting color found in scope "${scopeName}" for target "${targetColorStr}". Falling back to black/white contrast.`,
  );
  return wcagContrast('#fff', targetColorStr) >= wcagContrast('#000', targetColorStr) ? '#ffffff' : '#000000';
}

/**
 * An object containing placeholder renderer functions for the `bestContrastWith` color function.
 * These renderers currently return empty strings, indicating that `bestContrastWith` should be resolved to its final value
 * rather than being represented as a function call in CSS.
 */
export const bestContrastWithRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (_args: any[]): string => {
    return '';
  },

  json: (_args: any[]): string => {
    return '';
  },
};
