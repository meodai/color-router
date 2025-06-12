import { FunctionRenderer } from '../ColorRenderer';
/**
 * Lightens a color by the specified amount
 * @param color - The color to lighten
 * @param amount - Amount to lighten (0-1, where 0.1 = 10% lighter)
 * @returns The lightened color as a hex string
 */
export declare function lighten(color: string, amount: number): string;
/**
 * Renderer functions for different output formats
 */
export declare const lightenRenderers: Record<string, FunctionRenderer>;
//# sourceMappingURL=lighten.d.ts.map