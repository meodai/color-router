import { ColorRenderer } from './ColorRenderer';
import { ColorRouter } from './ColorRouter';
import { TableViewOptions } from './TableViewRenderer';
export interface SVGRenderOptions extends TableViewOptions {
    showConnections?: boolean;
    strokeWidth?: number;
    dotRadius?: number;
}
export interface ConnectionPoint {
    key: string;
    x: number;
    y: number;
    isLeft: boolean;
    color: string;
    colorName: string;
}
export interface Connection {
    from: ConnectionPoint;
    to: ConnectionPoint;
}
/**
 * SVG Renderer for ColorRouter - creates circular table visualizations
 * Adapted from paletter's toSVGviz.mjs
 */
export declare class SVGRenderer extends ColorRenderer {
    #private;
    constructor(router: ColorRouter, options?: SVGRenderOptions);
    /**
     * Get the router instance
     */
    private get router();
    /**
     * Main render method
     */
    render(): string;
}
//# sourceMappingURL=SVGRenderer.d.ts.map