import { ColorRouter } from '../router';
import { ColorDefinition, ColorReference, ColorFunction } from '../types';
import {
  bestContrastWithRenderers,
  colorMixRenderers,
  relativeToRenderers,
  minContrastWithRenderers,
  lightenRenderers,
  darkenRenderers,
  furthestFromRenderers,
} from '../colorFunctions';

/**
 * Defines the possible output formats for rendering colors.
 */
export type RenderFormat = 'css-variables' | 'json';

/**
 * Defines the signature for a function that renders a color function's output for a specific format.
 * @param args The arguments passed to the color function.
 * @returns A string representation of the color function's output in the target format.
 */
export type FunctionRenderer = (args: any[]) => string;

/**
 * Handles the rendering of color definitions into various output formats like CSS variables or JSON.
 * It supports custom function renderers for different formats.
 */
export class ColorRenderer {
  readonly #router: ColorRouter;
  #format: RenderFormat;
  readonly #functionRenderers = new Map<RenderFormat, Map<string, FunctionRenderer>>();

  /**
   * Creates an instance of ColorRenderer.
   * @param router An instance of ColorRouter to resolve color values.
   * @param format The initial rendering format. Defaults to 'css-variables'.
   */
  constructor(router: ColorRouter, format: RenderFormat = 'css-variables') {
    this.#router = router;
    this.#format = format === ('css' as any) ? 'css-variables' : format; // Treat 'css' as 'css-variables'
    this.#registerBuiltinRenderers();
  }

  /**
   * Registers a custom renderer for a specific color function and the current format.
   * @param functionName The name of the color function (e.g., 'lighten', 'colorMix').
   * @param renderer The rendering function for this color function and format.
   */
  registerFunctionRenderer(functionName: string, renderer: FunctionRenderer): void {
    if (!this.#functionRenderers.has(this.#format)) {
      this.#functionRenderers.set(this.#format, new Map());
    }
    this.#functionRenderers.get(this.#format)!.set(functionName, renderer);
  }

  /**
   * Registers the built-in renderers for known color functions for the current format.
   */
  #registerBuiltinRenderers(): void {
    const rendererSets = [
      { name: 'bestContrastWith', renderers: bestContrastWithRenderers },
      { name: 'colorMix', renderers: colorMixRenderers },
      { name: 'relativeTo', renderers: relativeToRenderers },
      { name: 'minContrastWith', renderers: minContrastWithRenderers },
      { name: 'lighten', renderers: lightenRenderers },
      { name: 'darken', renderers: darkenRenderers },
      { name: 'furthestFrom', renderers: furthestFromRenderers },
    ];

    for (const { name, renderers } of rendererSets) {
      const renderer = renderers[this.#format];
      if (renderer) {
        this.registerFunctionRenderer(name, renderer);
      }
    }
  }

  /**
   * Renders a single color definition based on its type (reference, function, or direct value).
   * @param definition The color definition to render.
   * @param key The key of the color being rendered (used for resolving if direct rendering fails).
   * @returns The string representation of the rendered color value.
   */
  #renderValue(definition: ColorDefinition, key: string): string {
    if (definition instanceof ColorReference) {
      return this.#renderReference(definition.key);
    } else if (definition instanceof ColorFunction) {
      return this.#renderFunction(definition, key);
    } else {
      return this.#router.resolve(key);
    }
  }

  /**
   * Renders a color reference (e.g., another color key) in the current format.
   * @param refKey The key of the color being referenced.
   * @returns The string representation of the color reference.
   */
  #renderReference(refKey: string): string {
    if (this.#format === 'css-variables') {
      return `var(--${refKey.replace(/\./g, '-')})`;
    } else {
      return this.#router.resolve(refKey);
    }
  }

  /**
   * Renders a ColorFunction instance using a registered function renderer for the current format.
   * If no specific renderer is found, it resolves the color function to its final value.
   * @param colorFunction The ColorFunction instance to render.
   * @param key The key of the color being rendered (used for resolving if rendering fails).
   * @returns The string representation of the rendered color function or its resolved value.
   */
  #renderFunction(colorFunction: ColorFunction, key: string): string {
    const formatRenderers = this.#functionRenderers.get(this.#format);
    if (!formatRenderers) {
      return this.#router.resolve(key);
    }

    const functionName =
      [...this.#router.getCustomFunctions().entries()].find(([_, fn]) => fn === colorFunction.fn)?.[0] || 'unknown';

    const renderer = formatRenderers.get(functionName);
    if (!renderer) {
      return this.#router.resolve(key);
    }

    try {
      const renderedArgs = colorFunction.args.map((arg) => {
        if (typeof arg === 'string' && arg.includes('.') && this.#router.has(arg)) {
          return this.#renderReference(arg);
        }
        return arg;
      });

      const result = renderer(renderedArgs);

      if (result === '') {
        return this.#router.resolve(key);
      }

      return result;
    } catch (e) {
      console.warn(`Failed to render function ${functionName}:`, e);
      return this.#router.resolve(key);
    }
  }

  /**
   * Renders all defined colors in the current format.
   * For 'json', it resolves all colors to their final string values.
   * For 'css-variables', it attempts to render references and functions directly.
   * @returns A string containing all rendered color definitions in the selected format.
   */
  render(): string {
    const allKeys = new Set<string>();
    this.#router.getAllPalettes().forEach(({ name }) => {
      this.#router.getAllKeysForPalette(name).forEach((k) => allKeys.add(k));
    });
    const keys = Array.from(allKeys).sort();

    if (this.#format === 'json') {
      const resolvedJson: Record<string, string> = {};
      for (const key of keys) {
        resolvedJson[key] = this.#router.resolve(key);
      }
      return JSON.stringify(resolvedJson, null, 2);
    }

    let output = '';
    for (const key of keys) {
      const definition = this.#router.getDefinitionForKey(key);
      const value = this.#renderValue(definition, key);

      if (this.#format === 'css-variables') {
        output += `  --${key.replace(/\./g, '-')}: ${value};\n`;
      }
    }

    return this.#format === 'css-variables' ? `:root {\n${output}}` : output;
  }

  /**
   * Gets the current rendering format.
   */
  get format(): RenderFormat {
    return this.#format;
  }

  /**
   * Sets the rendering format and re-registers built-in renderers for the new format.
   * @param value The new rendering format.
   */
  set format(value: RenderFormat) {
    this.#format = value === ('css' as any) ? 'css-variables' : value; // Treat 'css' as 'css-variables'
    this.#registerBuiltinRenderers();
  }
}
