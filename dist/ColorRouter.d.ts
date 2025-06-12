export type ColorValue = string;
export type PaletteName = string;
export type ColorKey = string;
export interface PaletteConfig {
    extends?: string;
    overrides?: Record<string, any>;
}
export interface ColorChangeEvent {
    key: string;
    oldValue: string | undefined;
    newValue: string;
}
export declare class ColorReference {
    readonly key: string;
    readonly type: symbol;
    constructor(key: string);
}
export declare class ColorFunction {
    readonly fn: (...args: any[]) => string;
    readonly args: any[];
    readonly dependencies: string[];
    readonly type: symbol;
    constructor(fn: (...args: any[]) => string, args: any[], dependencies: string[]);
    execute(resolver: ColorRouter): string;
}
export declare class PaletteError extends Error {
    constructor(message: string);
}
export declare class CircularDependencyError extends Error {
    readonly path: string[];
    constructor(path: string[]);
}
export type ColorDefinition = ColorValue | ColorReference | ColorFunction;
export type LogCallback = (message: string) => void;
export type ColorRendererClass = new (router: ColorRouter, format?: 'css-variables' | 'scss' | 'json') => any;
export declare class ColorRouter {
    #private;
    private _ColorRenderer?;
    private _logCallback?;
    constructor(options?: {
        mode?: 'auto' | 'batch';
    });
    registerFunction(name: string, fn: (...args: any[]) => string): void;
    func(name: string, ...args: any[]): ColorFunction;
    createPalette(name: string, options?: {
        extends?: string;
        overrides?: Record<string, any>;
    }): void;
    extendPalette(name: string, basePalette: string, overrides?: Record<string, any>): void;
    copyPalette(sourceName: string, targetName: string): void;
    deletePalette(name: string): void;
    define(key: string, value: ColorDefinition): void;
    set(key: string, value: ColorDefinition): void;
    flush(): void;
    resolve(key: string): string;
    has(key: string): boolean;
    on(event: string, callback: EventListener): void;
    watch(key: string, callback: (newValue: string, oldValue: string | undefined) => void): void;
    ref(key: string): ColorReference;
    getAllPalettes(): Array<{
        name: string;
        config: PaletteConfig;
    }>;
    getAllKeysForPalette(paletteName: string): string[];
    getDefinitionForKey(key: string): ColorDefinition;
    valueToString(value: ColorDefinition): string;
    get mode(): 'auto' | 'batch';
    set mode(value: 'auto' | 'batch');
    get batchQueueSize(): number;
    getDependencies(key: string): string[];
    getDependents(key: string): string[];
    getConnectionGraph(): Record<string, string[]>;
    _getDefinition(key: string): ColorDefinition;
    _getCustomFunctions(): Map<string, (...args: any[]) => string>;
    getPaletteDependencies(paletteName: string): string[];
    resolvePalette(paletteName: string): Record<string, string>;
    createRenderer(format?: 'css-variables' | 'scss' | 'json'): any;
    setColorRenderer(ColorRenderer: ColorRendererClass): void;
    setLogCallback(callback: LogCallback): void;
    render(format?: 'css-variables' | 'scss' | 'json'): string;
}
//# sourceMappingURL=ColorRouter.d.ts.map