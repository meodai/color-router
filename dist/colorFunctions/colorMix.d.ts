import { FunctionRenderer } from '../ColorRenderer';
/**
 * Mixes two colors using the specified ratio and color space
 * @param color1 - First color to mix
 * @param color2 - Second color to mix
 * @param ratio - Mix ratio (0-1 or percentage string). 0.5 means 50% of each color
 * @param colorSpace - Color space for mixing (default: 'lab')
 * @returns The mixed color as a hex string
 */
export declare function colorMix(color1: string, color2: string, ratio?: number | string, colorSpace?: string): string;
/**
 * Renderer functions for different output formats
 */
export declare const colorMixRenderers: Record<string, FunctionRenderer>;
//# sourceMappingURL=colorMix.d.ts.map