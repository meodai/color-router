import { formatHex, parse } from 'culori';
import {
  bestContrastWith,
  colorMix,
  relativeTo,
  minContrastWith,
  lighten,
  darken,
  furthestFrom,
  closestColor,
} from '../colorFunctions';
import {
  PaletteConfig,
  ColorChangeEvent,
  ColorReference,
  ColorFunction,
  ColorDefinition,
  LogCallback,
  ColorRendererClass,
} from '../types';
import { PaletteError, CircularDependencyError } from './errors';
import { DependencyGraph } from './DependencyGraph';
import { PaletteManager } from './PaletteManager';

export class ColorRouter {
  readonly #paletteManager: PaletteManager;
  readonly #definitions = new Map<string, ColorDefinition>();
  readonly #resolved = new Map<string, string>();
  readonly #dependencyGraph: DependencyGraph;
  #mode: 'auto' | 'batch' = 'auto';
  readonly #batchQueue = new Set<string>();
  readonly #eventEmitter = new EventTarget();
  readonly #customFunctions = new Map<string, (...args: any[]) => string>();
  readonly #paletteAwareFunctions = new Set<string>();

  #ColorRenderer?: ColorRendererClass;
  #logCallback?: LogCallback;

  constructor(options: { mode?: 'auto' | 'batch' } = {}) {
    this.#mode = options.mode || 'auto';
    this.#logCallback = undefined;
    this.#paletteManager = new PaletteManager(this.#definitions, this, this.#logCallback);
    this.#dependencyGraph = new DependencyGraph(this.#logCallback);
    this.#registerBuiltinFunctions();
  }

  #registerBuiltinFunctions(): void {
    this.registerFunction('bestContrastWith', bestContrastWith, { isPaletteAware: true });
    this.registerFunction('minContrastWith', minContrastWith, { isPaletteAware: true });
    this.registerFunction('furthestFrom', furthestFrom, { isPaletteAware: true });
    this.registerFunction('closestColor', closestColor, { isPaletteAware: true });

    this.registerFunction('colorMix', colorMix);
    this.registerFunction('relativeTo', relativeTo);
    this.registerFunction('lighten', lighten);
    this.registerFunction('darken', darken);
  }

  registerFunction(name: string, fn: (...args: any[]) => string, options?: { isPaletteAware?: boolean }): void {
    if ((this as any)[name] || name === 'ref' || name === 'func') {
      throw new PaletteError(`Function name \"${name}\" is reserved.`);
    }
    this.#customFunctions.set(name, fn);
    if (options?.isPaletteAware) {
      this.#paletteAwareFunctions.add(name);
    }
    if (this.#logCallback)
      this.#logCallback(`Registered function '${name}'${options?.isPaletteAware ? ' (palette-aware)' : ''}.`);
  }

  func(name: string, ...args: any[]): ColorFunction {
    if (!this.#customFunctions.has(name)) {
      throw new PaletteError(`Custom function \"${name}\" is not registered.`);
    }
    const implementation = this.#customFunctions.get(name)!;

    const resolutionDependencySet = new Set<string>();
    const visualDependencySet = new Set<string>();

    args.forEach((arg) => {
      if (typeof arg === 'string' && arg.includes('.')) {
        resolutionDependencySet.add(arg);
        visualDependencySet.add(arg);
      }
    });

    if (this.#paletteAwareFunctions.has(name)) {
      for (const arg of args) {
        if (typeof arg === 'string' && !arg.includes('.') && this.#paletteManager.hasPalette(arg)) {
          const paletteKeys = this.#paletteManager.getAllKeysForPalette(arg);
          for (const pKey of paletteKeys) {
            resolutionDependencySet.add(pKey);
          }
          visualDependencySet.add(`palette:${arg}`);
        }
      }
    }

    const finalResolutionDependencies = Array.from(resolutionDependencySet);
    const finalVisualDependenciesArray = Array.from(visualDependencySet);

    return new ColorFunction(implementation, args, finalResolutionDependencies, finalVisualDependenciesArray);
  }

  createPalette(
    name: string,
    options: { extends?: string; overrides?: Record<string, any>; description?: string } = {},
  ): void {
    this.#paletteManager.createPalette(name, options);
  }

  extendPalette(name: string, basePalette: string, overrides: Record<string, any> = {}, description?: string): void {
    this.#paletteManager.extendPalette(name, basePalette, overrides, description);
  }

  copyPalette(sourceName: string, targetName: string): void {
    this.#paletteManager.copyPalette(sourceName, targetName);
  }

  deletePalette(name: string): void {
    const keysToDelete = this.#paletteManager.deletePalette(name);
    for (const key of keysToDelete) {
      this.#definitions.delete(key);
      this.#resolved.delete(key);
      this.#dependencyGraph.removeNode(key);
    }
  }

  define(key: string, value: ColorDefinition): void {
    const [paletteName] = key.split('.');
    if (!this.#paletteManager.hasPalette(paletteName)) {
      throw new PaletteError(`Palette "${paletteName}" does not exist. Create it first.`);
    }
    this.#set(key, value);
  }

  set(key: string, value: ColorDefinition): void {
    if (!this.has(key)) throw new PaletteError(`Color "${key}" is not defined. Use .define() first.`);
    this.#set(key, value);
  }

  #set(key: string, value: ColorDefinition): void {
    if (typeof value === 'string' && !parse(value)) {
      throw new PaletteError(`Invalid color value: "${value}". Must be a valid CSS color or a router function.`);
    }
    this.#definitions.set(key, value);
    this.#dependencyGraph.updateEdges(key, value);
    if (this.#mode === 'auto') {
      this.#resolveAndNotify(key);
    } else {
      this.#batchQueue.add(key);
    }
    if (this.#logCallback) this.#logCallback(`Defined '${key}' = ${this.#valueToString(value)}`);
  }

  flush(): void {
    if (this.#mode !== 'batch') return;

    const keysToProcess = Array.from(this.#batchQueue);
    this.#batchQueue.clear();

    let sortedKeys: string[];
    try {
      sortedKeys = this.#dependencyGraph.topologicalSort(keysToProcess);
    } catch (e) {
      if (this.#logCallback) {
        this.#logCallback(
          `Error during topological sort in flush: ${(e as Error).message}. Batch processing aborted for ${keysToProcess.length} keys.`,
        );
      }
      this.#eventEmitter.dispatchEvent(
        new CustomEvent('batch-failed', {
          detail: {
            error: e,
            stage: 'sorting',
            processedKeys: [],
            errors: [{ keys: keysToProcess, error: e instanceof Error ? e : new Error(String(e)) }],
            summary: `Batch processing failed during sorting for ${keysToProcess.length} keys.`,
          },
        }),
      );
      return;
    }

    const allChanges: ColorChangeEvent[] = [];
    const processingErrors: { key: string; error: Error }[] = [];

    for (const key of sortedKeys) {
      const oldValue = this.#resolved.get(key);
      try {
        this.#resolveKey(key);
        const newValue = this.#resolved.get(key);

        if (newValue === undefined) {
          throw new PaletteError(
            `Internal error: Value for '${key}' not found in resolved cache after successful resolution attempt in flush, but no explicit error was thrown by #resolveKey.`,
          );
        }

        if (oldValue !== newValue) {
          allChanges.push({ key, oldValue, newValue });
          this.#emit(key, newValue, oldValue);
        }
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        if (this.#logCallback) {
          this.#logCallback(`Error resolving key '${key}' during flush: ${error.message}`);
        }
        processingErrors.push({ key, error });
      }
    }

    const successCount = allChanges.length;
    const errorCount = processingErrors.length;
    const processedCount = sortedKeys.length;

    const summary = `Flush processed ${processedCount} keys. ${successCount} colors updated, ${errorCount} errors.`;

    if (this.#logCallback) {
      this.#logCallback(summary);
    }

    if (allChanges.length > 0) {
      this.#eventEmitter.dispatchEvent(new CustomEvent('change', { detail: allChanges }));
    }

    this.#eventEmitter.dispatchEvent(
      new CustomEvent('batch-complete', {
        detail: {
          changes: allChanges,
          errors: processingErrors,
          processedKeys: sortedKeys,
          summary: summary,
        },
      }),
    );
  }

  #resolveAndNotify(startKey: string): void {
    let toUpdate: string[];
    try {
      toUpdate = this.#dependencyGraph.getEvaluationOrderFor(startKey);
    } catch (e) {
      if (this.#logCallback) {
        this.#logCallback(`Error getting update order for '${startKey}': ${(e as Error).message}`);
      }
      throw e;
    }

    const changes: ColorChangeEvent[] = [];
    for (const key of toUpdate) {
      const oldValue = this.#resolved.get(key);
      this.#resolveKey(key);
      const newValue = this.#resolved.get(key);
      if (oldValue !== newValue) {
        changes.push({ key, oldValue, newValue: newValue! });
        this.#emit(key, newValue!, oldValue);
      }
    }
    if (changes.length > 0) {
      this.#eventEmitter.dispatchEvent(new CustomEvent('change', { detail: changes }));
    }
  }

  #resolveKey(key: string, path: string[] = []): string {
    if (path.includes(key)) throw new CircularDependencyError([...path, key]);
    const definition = this.#getDefinition(key);
    let newValue: string;
    if (definition instanceof ColorReference) {
      newValue = this.#resolveKey(definition.key, [...path, key]);
    } else if (definition instanceof ColorFunction) {
      newValue = definition.execute(this);
    } else {
      newValue = this.#normalizeColor(definition);
    }
    this.#resolved.set(key, newValue);
    return newValue;
  }

  #getDefinition(key: string): ColorDefinition {
    let [paletteName, colorName] = key.split('.');
    const visitedPalettes = new Set<string>();

    while (paletteName) {
      if (visitedPalettes.has(paletteName)) {
        throw new CircularDependencyError([...visitedPalettes, paletteName]);
      }
      visitedPalettes.add(paletteName);

      const currentKey = `${paletteName}.${colorName}`;
      if (this.#definitions.has(currentKey)) return this.#definitions.get(currentKey)!;

      const paletteConfig = this.#paletteManager.getPalette(paletteName);
      if (!paletteConfig || !paletteConfig.extends) break;
      paletteName = paletteConfig.extends;
    }
    throw new PaletteError(`Color '${key}' not found in palette hierarchy.`);
  }

  resolve(key: string): string {
    if (!this.#resolved.has(key)) {
      try {
        this.#resolveKey(key);
      } catch (e) {
        if (this.#logCallback) {
          this.#logCallback(`Failed to resolve '${key}': ${(e as Error).message}`);
        }
        throw e;
      }
    }
    const resolvedValue = this.#resolved.get(key);

    if (resolvedValue === undefined) {
      throw new PaletteError(
        `Internal error: Value for '${key}' not found in resolved cache after attempted resolution, and no explicit error was thrown.`,
      );
    }
    return resolvedValue;
  }

  getAllKeysForPalette(paletteName: string): string[] {
    return this.#paletteManager.getAllKeysForPalette(paletteName);
  }

  has(key: string): boolean {
    let [pName, cName] = key.split('.');
    const visitedPalettes = new Set<string>();

    while (pName) {
      if (visitedPalettes.has(pName)) {
        throw new CircularDependencyError([...visitedPalettes, pName]);
      }
      visitedPalettes.add(pName);

      if (this.#definitions.has(`${pName}.${cName}`)) return true;
      const pConfig = this.#paletteManager.getPalette(pName);
      if (!pConfig || !pConfig.extends) break;
      pName = pConfig.extends;
    }
    return false;
  }

  #valueToString(value: ColorDefinition): string {
    if (value instanceof ColorReference) return `ref('${value.key}')`;
    if (value instanceof ColorFunction) {
      const fnName =
        [...this.#customFunctions.entries()].find(([_, fn]) => fn === value.fn)?.[0] ||
        value.fn.name.replace('bound ', '');
      const args = value.args
        .map((a) => {
          if (Array.isArray(a)) {
            return `[${a
              .map((item) => {
                if (item === null) return 'null';
                if (typeof item === 'string') return `'${item}'`;
                return item;
              })
              .join(', ')}]`;
          }
          return typeof a === 'string' ? `'${a}'` : a;
        })
        .join(', ');
      return `${fnName}(${args})`;
    }
    return `'${value}'`;
  }

  #normalizeColor(color: string): string {
    const parsedColor = parse(color);
    return parsedColor ? formatHex(parsedColor) : '#00000000';
  }

  on(event: string, callback: EventListener): void {
    this.#eventEmitter.addEventListener(event, callback);
  }

  watch(key: string, callback: (newValue: string, oldValue: string | undefined) => void): void {
    this.on(`watch:${key}`, (e) => {
      const event = e as CustomEvent<{ newValue: string; oldValue: string | undefined }>;
      callback(event.detail.newValue, event.detail.oldValue);
    });
  }

  #emit(key: string, newValue: string, oldValue: string | undefined): void {
    this.#eventEmitter.dispatchEvent(
      new CustomEvent(`watch:${key}`, {
        detail: { newValue, oldValue },
      }),
    );
  }

  ref(key: string): ColorReference {
    return new ColorReference(key);
  }

  getAllPalettes = (): Array<{ name: string; config: PaletteConfig }> => {
    return this.#paletteManager.getAllPalettes();
  };

  public getDefinitionType(key: string): 'function' | 'reference' | 'value' {
    try {
      const definition = this.#getDefinition(key);
      if (definition instanceof ColorFunction) {
        return 'function';
      }
      if (definition instanceof ColorReference) {
        return 'reference';
      }
      return 'value';
    } catch (e) {
      if (this.#logCallback)
        this.#logCallback(`Error getting definition type for ${key} in getDefinitionType: ${(e as Error).message}`);
      return 'value';
    }
  }

  public getVisualDependencies(key: string): Set<string> {
    const definition = this.#getDefinition(key);

    if (definition instanceof ColorFunction) {
      return new Set(definition.visualDependencies);
    }
    if (definition instanceof ColorReference) {
      return new Set([definition.key]);
    }
    return new Set<string>();
  }

  valueToString(value: ColorDefinition): string {
    return this.#valueToString(value);
  }

  getRawValue(value: ColorDefinition): string {
    if (value instanceof ColorReference) return `ref('${value.key}')`;
    if (value instanceof ColorFunction) {
      const fnName =
        [...this.#customFunctions.entries()].find(([_, fn]) => fn === value.fn)?.[0] ||
        value.fn.name.replace('bound ', '');
      const args = value.args
        .map((a) => {
          if (Array.isArray(a)) {
            return `[${a.map((item) => (typeof item === 'string' ? `'${item}'` : item)).join(', ')}]`;
          }
          return typeof a === 'string' ? `'${a}'` : a;
        })
        .join(', ');
      return `${fnName}(${args})`;
    }
    return value;
  }

  get mode(): 'auto' | 'batch' {
    return this.#mode;
  }

  set mode(value: 'auto' | 'batch') {
    this.#mode = value;
  }

  get batchQueueSize(): number {
    return this.#batchQueue.size;
  }

  getDependencies(key: string): string[] {
    return this.#dependencyGraph.getPrerequisitesFor(key);
  }

  getDependents(key: string): string[] {
    return this.#dependencyGraph.getDependentsOf(key);
  }

  getConnectionGraph(): Record<string, string[]> {
    return this.#dependencyGraph.getConnectionGraph();
  }

  getDefinitionForKey(key: string): ColorDefinition {
    try {
      return this.#getDefinition(key);
    } catch (e) {
      throw new PaletteError(`Failed to get definition for key '${key}': ${(e as Error).message}`);
    }
  }

  getCustomFunctions(): ReadonlyMap<string, (...args: any[]) => string> {
    return new Map(this.#customFunctions);
  }

  getPaletteDependencies(paletteName: string): string[] {
    const keys = this.#paletteManager.getAllKeysForPalette(paletteName);
    const externalDeps = new Set<string>();

    for (const key of keys) {
      const deps = this.getDependencies(key);
      for (const dep of deps) {
        if (!dep.startsWith(`${paletteName}.`)) {
          externalDeps.add(dep);
        }
      }
    }

    return Array.from(externalDeps);
  }

  resolvePalette(paletteName: string): Record<string, string> {
    const keys = this.#paletteManager.getAllKeysForPalette(paletteName);
    const resolved: Record<string, string> = {};

    for (const key of keys) {
      const shortKey = key.split('.').slice(1).join('.');
      resolved[shortKey] = this.resolve(key);
    }

    return resolved;
  }

  createRenderer(format?: 'css-variables' | 'scss' | 'json'): any {
    if (!this.#ColorRenderer) {
      throw new Error('ColorRenderer class not injected. Please call setColorRenderer() first.');
    }
    return new this.#ColorRenderer(this, format);
  }

  setColorRenderer(ColorRenderer: ColorRendererClass): void {
    this.#ColorRenderer = ColorRenderer;
  }

  setLogCallback(callback: LogCallback): void {
    this.#logCallback = callback;
    this.#dependencyGraph.setLogCallback(callback);
    this.#paletteManager.setLogCallback(callback);
  }
}
