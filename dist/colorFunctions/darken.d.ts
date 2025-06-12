import { FunctionRenderer } from '../ColorRenderer';
/**
 * Darkens a color by the specified amount
 * @param color - The color to darken
 * @param amount - Amount to darken (0-1, where 0.1 = 10% darker)
 * @returns The darkened color as a hex string
 */
export declare function darken(color: string, amount: number): string;
/**
 * Renderer functions for different output formats
 */
export declare const darkenRenderers: Record<string, FunctionRenderer>;
//# sourceMappingURL=darken.d.ts.map