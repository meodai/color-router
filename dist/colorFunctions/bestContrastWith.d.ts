import { ColorRouter } from '../ColorRouter';
import { FunctionRenderer } from '../ColorRenderer';
/**
 * Finds the best contrast color from a specified palette against a target color
 * @param targetColor - The color to find contrast against
 * @param paletteName - Optional palette name to search for contrast colors
 * @returns The color with the best contrast ratio
 */
export declare function bestContrastWith(this: ColorRouter, targetColor: string, paletteName?: string): string;
/**
 * Renderer functions for different output formats
 */
export declare const bestContrastWithRenderers: Record<string, FunctionRenderer>;
//# sourceMappingURL=bestContrastWith.d.ts.map