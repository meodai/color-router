import type { ColorRouter } from './ColorRouter';

// --- TYPE DEFINITIONS ---

export type ColorValue = string;
export type PaletteName = string;
export type ColorKey = string;

export interface PaletteConfig {
  extends?: string;
  overrides?: Record<string, any>;
  description?: string; // Add optional description property
}

export interface ColorChangeEvent {
  key: string;
  oldValue: string | undefined;
  newValue: string;
}

export class ColorReference {
  readonly type = Symbol.for('ColorReference');

  constructor(public readonly key: string) {}
}

export class ColorFunction {
  readonly type = Symbol.for('ColorFunction');

  constructor(
    public readonly fn: (...args: any[]) => string,
    public readonly args: any[],
    public readonly dependencies: string[], // For resolution logic
    public readonly visualDependencies: string[], // For visualization. Guaranteed to be populated by func.
  ) {}

  execute(resolver: ColorRouter): string {
    const resolvedArgs = this.args.map((arg) =>
      typeof arg === 'string' && resolver.has(arg) ? resolver.resolve(arg) : arg,
    );
    // Ensure the function is called with the ColorRouter instance as its `this` context
    return this.fn.call(resolver, ...resolvedArgs);
  }
}

export type ColorDefinition = ColorValue | ColorReference | ColorFunction;
export type LogCallback = (message: string) => void;
export type ColorRendererClass = new (router: ColorRouter, format?: 'css-variables' | 'scss' | 'json') => any;
