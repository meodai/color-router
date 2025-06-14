import { ColorRouter } from './ColorRouter';
import { ColorReference, ColorFunction, ColorDefinition } from './types';
import {
  bestContrastWithRenderers,
  colorMixRenderers,
  relativeToRenderers,
  minContrastWithRenderers,
  lightenRenderers,
  darkenRenderers,
  furthestFromRenderers,
} from './colorFunctions';

export type RenderFormat = 'css-variables' | 'scss' | 'json';
export type FunctionRenderer = (args: any[]) => string;

export class ColorRenderer {
  readonly #router: ColorRouter;
  #format: RenderFormat;
  readonly #functionRenderers = new Map<RenderFormat, Map<string, FunctionRenderer>>();

  constructor(router: ColorRouter, format: RenderFormat = 'css-variables') {
    this.#router = router;
    this.#format = format === ('css' as any) ? 'css-variables' : format;
    this.#registerBuiltinRenderers();
  }

  registerFunctionRenderer(functionName: string, renderer: FunctionRenderer): void {
    if (!this.#functionRenderers.has(this.#format)) {
      this.#functionRenderers.set(this.#format, new Map());
    }
    this.#functionRenderers.get(this.#format)!.set(functionName, renderer);
  }

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

  #renderValue(definition: ColorDefinition, key: string): string {
    if (definition instanceof ColorReference) {
      return this.#renderReference(definition.key);
    } else if (definition instanceof ColorFunction) {
      return this.#renderFunction(definition, key);
    } else {
      return this.#router.resolve(key);
    }
  }

  #renderReference(refKey: string): string {
    if (this.#format === 'scss') {
      return `$${refKey.replace(/\./g, '-')}`;
    } else if (this.#format === 'css-variables') {
      return `var(--${refKey.replace(/\./g, '-')})`;
    } else {
      return this.#router.resolve(refKey);
    }
  }

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
      } else if (this.#format === 'scss') {
        output += `$${key.replace(/\./g, '-')}: ${value};\n`;
      }
    }

    return this.#format === 'css-variables' ? `:root {\n${output}}` : output;
  }

  get format(): RenderFormat {
    return this.#format;
  }

  set format(value: RenderFormat) {
    this.#format = value === ('css' as any) ? 'css-variables' : value;
    this.#registerBuiltinRenderers();
  }
}
