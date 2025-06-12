import { FunctionRenderer } from '../ColorRenderer';
/**
 * Finds a color that meets the minimum contrast ratio against the target color
 * @param targetColor - The color to find contrast against
 * @param minRatio - Minimum contrast ratio required (default: 1.5)
 * @returns A color that meets the minimum contrast requirement
 */
export declare function minContrastWith(targetColor: string, minRatio?: number): string;
/**
 * Renderer functions for different output formats
 */
export declare const minContrastWithRenderers: Record<string, FunctionRenderer>;
//# sourceMappingURL=minContrastWith.d.ts.map