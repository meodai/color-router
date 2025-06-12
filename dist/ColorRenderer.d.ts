import { ColorRouter } from './ColorRouter';
export type RenderFormat = 'css-variables' | 'scss' | 'json';
export type FunctionRenderer = (args: any[]) => string;
export declare class ColorRenderer {
    #private;
    constructor(router: ColorRouter, format?: RenderFormat);
    registerFunctionRenderer(functionName: string, renderer: FunctionRenderer): void;
    render(): string;
    get format(): RenderFormat;
    set format(value: RenderFormat);
}
//# sourceMappingURL=ColorRenderer.d.ts.map