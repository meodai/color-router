import { formatHex, parse } from 'culori';
import {
  bestContrastWith,
  colorMix,
  relativeTo,
  minContrastWith,
  lighten,
  darken,
  furthestFrom,
  closestColor
} from './colorFunctions';
import {
  PaletteConfig,
  ColorChangeEvent,
  ColorReference,
  ColorFunction,
  ColorDefinition,
  LogCallback,
  ColorRendererClass
} from './types';
import { PaletteError, CircularDependencyError } from './errors';
import { DependencyGraph } from './DependencyGraph';
import { PaletteManager } from './PaletteManager'; // Import PaletteManager

// --- TYPE DEFINITIONS ---
// All type definitions and simple classes (ColorReference, ColorFunction) moved to types.ts
// Custom error classes (PaletteError, CircularDependencyError) moved to errors.ts

export class ColorRouter {
  // readonly #palettes = new Map<string, PaletteConfig>(); // Replaced by PaletteManager
  readonly #paletteManager: PaletteManager; // Add PaletteManager instance
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
    // Pass this.#definitions and 'this' (ColorRouter instance) to PaletteManager
    this.#paletteManager = new PaletteManager(this.#definitions, this, this.#logCallback);
    this.#dependencyGraph = new DependencyGraph(this.#logCallback);
    this.#registerBuiltinFunctions();
  }

  #registerBuiltinFunctions(): void {
    // Register built-in functions, marking palette-aware ones
    this.registerFunction('bestContrastWith', bestContrastWith, { isPaletteAware: true });
    this.registerFunction('minContrastWith', minContrastWith, { isPaletteAware: true });
    this.registerFunction('furthestFrom', furthestFrom, { isPaletteAware: true });
    this.registerFunction('closestColor', closestColor, { isPaletteAware: true }); // Register closestColor as palette-aware
    
    this.registerFunction('colorMix', colorMix);
    this.registerFunction('relativeTo', relativeTo);
    this.registerFunction('lighten', lighten);
    this.registerFunction('darken', darken);
  }

  // --- CUSTOM FUNCTIONS ---
  registerFunction(name: string, fn: (...args: any[]) => string, options?: { isPaletteAware?: boolean }): void {
    if ((this as any)[name] || name === 'ref' || name === 'func') {
      throw new PaletteError(`Function name \"${name}\" is reserved.`);
    }
    this.#customFunctions.set(name, fn);
    if (options?.isPaletteAware) {
      this.#paletteAwareFunctions.add(name);
    }
    if (this.#logCallback) this.#logCallback(`Registered function '${name}'${options?.isPaletteAware ? ' (palette-aware)' : ''}.`);
  }

  func(name: string, ...args: any[]): ColorFunction {
    if (!this.#customFunctions.has(name)) {
      throw new PaletteError(`Custom function \"${name}\" is not registered.`);
    }
    const implementation = this.#customFunctions.get(name)!;
    
    const resolutionDependencySet = new Set<string>();
    const visualDependencySet = new Set<string>();

    // Common logic for direct color key arguments
    args.forEach(arg => {
      if (typeof arg === 'string' && arg.includes('.')) { // e.g., "palette.color"
        resolutionDependencySet.add(arg);
        visualDependencySet.add(arg); 
      }
    });
    
    if (this.#paletteAwareFunctions.has(name)) {
      for (const arg of args) {
        // Use paletteManager to check if arg is a palette name
        if (typeof arg === 'string' && !arg.includes('.') && this.#paletteManager.hasPalette(arg)) {
          const paletteKeys = this.#paletteManager.getAllKeysForPalette(arg); // Use paletteManager
          for (const pKey of paletteKeys) {
            resolutionDependencySet.add(pKey);
          }
          visualDependencySet.add(`palette:${arg}`); 
        }
      }
    }
    // If not palette-aware, visualDependencySet currently only contains direct color refs from the initial loop.
    // ResolutionDependencySet also contains these.
    
    const finalResolutionDependencies = Array.from(resolutionDependencySet);
    const finalVisualDependenciesArray = Array.from(visualDependencySet);

    return new ColorFunction(implementation, args, finalResolutionDependencies, finalVisualDependenciesArray);
  }

  // --- PALETTE MANAGEMENT --- (Delegated to PaletteManager)
  createPalette(name: string, options: { extends?: string; overrides?: Record<string, any> } = {}): void {
    this.#paletteManager.createPalette(name, options);
  }

  extendPalette(name: string, basePalette: string, overrides: Record<string, any> = {}): void {
    this.#paletteManager.extendPalette(name, basePalette, overrides);
  }

  copyPalette(sourceName: string, targetName: string): void {
    this.#paletteManager.copyPalette(sourceName, targetName);
  }

  deletePalette(name: string): void {
    // PaletteManager.deletePalette now returns keys that were part of the palette
    const keysToDelete = this.#paletteManager.deletePalette(name);
    for (const key of keysToDelete) {
      this.#definitions.delete(key);
      this.#resolved.delete(key);
      this.#dependencyGraph.removeNode(key);
    }
    // Logging is handled by PaletteManager
  }

  // --- COLOR DEFINITION & MODIFICATION ---
  define(key: string, value: ColorDefinition): void {
    const [paletteName] = key.split('.');
    // Use paletteManager to check if palette exists
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
    // Clear the queue at the beginning to prevent reprocessing if flush itself errors out mid-way
    // or if some keys are processed and others fail.
    this.#batchQueue.clear();

    let sortedKeys: string[];
    try {
      sortedKeys = this.#dependencyGraph.topologicalSort(keysToProcess);
    } catch (e) {
      if (this.#logCallback) {
        this.#logCallback(`Error during topological sort in flush: ${(e as Error).message}. Batch processing aborted for ${keysToProcess.length} keys.`);
      }
      this.#eventEmitter.dispatchEvent(new CustomEvent('batch-failed', {
        detail: {
          error: e,
          stage: 'sorting',
          processedKeys: [],
          errors: [{ keys: keysToProcess, error: e instanceof Error ? e : new Error(String(e)) }],
          summary: `Batch processing failed during sorting for ${keysToProcess.length} keys.`
        }
      }));
      return;
    }

    const allChanges: ColorChangeEvent[] = [];
    const processingErrors: { key: string, error: Error }[] = [];

    for (const key of sortedKeys) {
      const oldValue = this.#resolved.get(key);
      try {
        // #resolveKey will throw if an error occurs, as per previous changes to resolve().
        this.#resolveKey(key);
        const newValue = this.#resolved.get(key);

        if (newValue === undefined) {
          // This should ideally not happen if #resolveKey succeeds without throwing, as it sets the value.
          // However, as a safeguard:
          throw new PaletteError(`Internal error: Value for '${key}' not found in resolved cache after successful resolution attempt in flush, but no explicit error was thrown by #resolveKey.`);
        }

        if (oldValue !== newValue) {
          allChanges.push({ key, oldValue, newValue });
          this.#emit(key, newValue, oldValue); // Emit individual watch events
        }
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e));
        if (this.#logCallback) {
          this.#logCallback(`Error resolving key '${key}' during flush: ${error.message}`);
        }
        processingErrors.push({ key, error });
        // Continue processing other keys in the batch
      }
    }

    // Determine the overall status and prepare event details
    const successCount = allChanges.length;
    const errorCount = processingErrors.length;
    const processedCount = sortedKeys.length; // Number of keys attempted from sorted list

    const summary = `Flush processed ${processedCount} keys. ${successCount} colors updated, ${errorCount} errors.`;

    if (this.#logCallback) {
      this.#logCallback(summary);
    }

    // Emit a general 'change' event only if there were successful changes
    if (allChanges.length > 0) {
      this.#eventEmitter.dispatchEvent(new CustomEvent('change', { detail: allChanges }));
    }

    // Emit batch-complete with detailed information
    this.#eventEmitter.dispatchEvent(new CustomEvent('batch-complete', {
      detail: {
        changes: allChanges,
        errors: processingErrors,
        processedKeys: sortedKeys,
        summary: summary
      }
    }));
    // Note: #batchQueue was cleared at the start of the method.
  }

  // --- RESOLUTION & REACTIVITY ---
  #resolveAndNotify(startKey: string): void {
    let toUpdate: string[];
    try {
      toUpdate = this.#dependencyGraph.getEvaluationOrderFor(startKey);
    } catch (e) {
      if (this.#logCallback) {
        this.#logCallback(`Error getting update order for '${startKey}': ${(e as Error).message}`);
      }
      // If we can't get an update order, we probably can't proceed safely for auto-updates.
      // This might happen if a circular dependency is introduced.
      // Re-throw or handle as a critical error for auto-mode.
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
      // Check for circular palette inheritance
      if (visitedPalettes.has(paletteName)) {
        throw new CircularDependencyError([...visitedPalettes, paletteName]);
      }
      visitedPalettes.add(paletteName);
      
      const currentKey = `${paletteName}.${colorName}`;
      if (this.#definitions.has(currentKey)) return this.#definitions.get(currentKey)!;
      
      // Use paletteManager to get palette config for extends
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
        // Log the error if a callback is provided
        if (this.#logCallback) {
          this.#logCallback(`Failed to resolve '${key}': ${(e as Error).message}`);
        }
        // Re-throw the error to make the failure explicit to the caller
        throw e;
      }
    }
    // If #resolveKey was successful and didn't throw, or if the key was already resolved,
    // the value should be in the cache.
    const resolvedValue = this.#resolved.get(key);
    
    // This check is a safeguard. If #resolveKey completes without error, 
    // it's expected to populate #resolved.
    if (resolvedValue === undefined) {
      // This situation indicates an unexpected internal state if #resolveKey was supposed to succeed.
      // Throw a generic error, as the specific cause should have been caught and re-thrown above.
      throw new PaletteError(`Internal error: Value for '${key}' not found in resolved cache after attempted resolution, and no explicit error was thrown.`);
    }
    return resolvedValue;
  }

  // #getAllPaletteKeys moved to PaletteManager, ColorRouter will use paletteManager.getAllKeysForPalette
  // public getAllKeysForPalette is now a direct call to paletteManager
  getAllKeysForPalette(paletteName: string): string[] {
    return this.#paletteManager.getAllKeysForPalette(paletteName);
  }
 
  // --- UTILITY & HELPER FUNCTIONS ---
  has(key: string): boolean {
    let [pName, cName] = key.split('.');
    const visitedPalettes = new Set<string>();
    
    while (pName) {
      // Check for circular palette inheritance
      if (visitedPalettes.has(pName)) {
        throw new CircularDependencyError([...visitedPalettes, pName]);
      }
      visitedPalettes.add(pName);
      
      if (this.#definitions.has(`${pName}.${cName}`)) return true;
      // Use paletteManager to get palette config for extends
      const pConfig = this.#paletteManager.getPalette(pName);
      if (!pConfig || !pConfig.extends) break;
      pName = pConfig.extends;
    }
    return false;
  }

  #valueToString(value: ColorDefinition): string {
    if (value instanceof ColorReference) return `ref('${value.key}')`;
    if (value instanceof ColorFunction) {
      const fnName = [...this.#customFunctions.entries()].find(([_, fn]) => fn === value.fn)?.[0] || value.fn.name.replace('bound ', '');
      const args = value.args.map(a => {
        if (Array.isArray(a)) {
          return `[${a.map(item => {
            if (item === null) return 'null';
            if (typeof item === 'string') return `'${item}'`;
            return item;
          }).join(', ')}]`;
        }
        return typeof a === 'string' ? `'${a}'` : a;
      }).join(', ');
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
    this.#eventEmitter.dispatchEvent(new CustomEvent(`watch:${key}`, { 
      detail: { newValue, oldValue } 
    })); 
  }

  // --- PUBLIC API FOR REFERENCES & BUILT-IN FUNCTIONS ---
  ref(key: string): ColorReference { 
    return new ColorReference(key); 
  }

  // --- PUBLIC GETTERS FOR UI ---
  getAllPalettes = (): Array<{ name: string; config: PaletteConfig }> => {
    // Delegate to PaletteManager
    return this.#paletteManager.getAllPalettes();
  }

  public getDefinitionType(key: string): 'function' | 'reference' | 'value' {
    try {
      const definition = this.#getDefinition(key); // Uses the private method that handles inheritance
      if (definition instanceof ColorFunction) {
        return 'function';
      }
      if (definition instanceof ColorReference) {
        return 'reference';
      }
      return 'value'; // It's a direct color string or resolved from one
    } catch (e) {
      // This case should ideally not be hit if keys are always valid from the renderer
      if (this.#logCallback) this.#logCallback(`Error getting definition type for ${key} in getDefinitionType: ${(e as Error).message}`);
      return 'value'; // Default to solid line if type is unknown or error
    }
  }

  // Method for SVGRenderer to get dependencies suitable for visualization
  public getVisualDependencies(key: string): Set<string> {
    const definition = this.#getDefinition(key); // This gets the ColorDefinition

    if (definition instanceof ColorFunction) {
      // visualDependencies is guaranteed to be populated by func,
      // either with specific visual deps or a copy of resolution deps.
      return new Set(definition.visualDependencies); 
    } 
    if (definition instanceof ColorReference) {
      // A reference's visual dependency is the key it points to.
      return new Set([definition.key]);
    }
    // Direct color values have no dependencies.
    return new Set<string>();
  }

  valueToString(value: ColorDefinition): string {
    return this.#valueToString(value);
  }

  // Get raw value for editing (without quotes or formatting)
  getRawValue(value: ColorDefinition): string {
    if (value instanceof ColorReference) return `ref('${value.key}')`;
    if (value instanceof ColorFunction) {
      const fnName = [...this.#customFunctions.entries()].find(([_, fn]) => fn === value.fn)?.[0] || value.fn.name.replace('bound ', '');
      const args = value.args.map(a => {
        if (Array.isArray(a)) {
          return `[${a.map(item => typeof item === 'string' ? `'${item}'` : item).join(', ')}]`;
        }
        return typeof a === 'string' ? `'${a}'` : a;
      }).join(', ');
      return `${fnName}(${args})`;
    }
    return value; // Return raw value without quotes for hex colors
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

  // --- DEPENDENCY ANALYSIS ---
  getDependencies(key: string): string[] {
    // return Array.from(this.#dependents.get(key) || []); // Replaced
    return this.#dependencyGraph.getPrerequisitesFor(key);
  }

  getDependents(key: string): string[] {
    // return Array.from(this.#dependencies.get(key) || []); // Replaced
    return this.#dependencyGraph.getDependentsOf(key);
  }

  getConnectionGraph(): Record<string, string[]> {
    // const graph: Record<string, string[]> = {};
    // for (const [key, deps] of this.#dependents.entries()) {
    //   graph[key] = Array.from(deps);
    // }
    // return graph; // Replaced
    return this.#dependencyGraph.getConnectionGraph();
  }

  // --- RENDERER INTEGRATION METHODS ---
  // These methods provide controlled access to internal state for renderers
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
    const keys = this.#paletteManager.getAllKeysForPalette(paletteName); // Use PaletteManager
    const externalDeps = new Set<string>();
    
    for (const key of keys) {
      const deps = this.getDependencies(key); // This uses DependencyGraph
      for (const dep of deps) {
        if (!dep.startsWith(`${paletteName}.`)) {
          externalDeps.add(dep);
        }
      }
    }
    
    return Array.from(externalDeps);
  }

  resolvePalette(paletteName: string): Record<string, string> {
    const keys = this.#paletteManager.getAllKeysForPalette(paletteName); // Use PaletteManager
    const resolved: Record<string, string> = {};
    
    for (const key of keys) {
      const shortKey = key.split('.').slice(1).join('.');
      resolved[shortKey] = this.resolve(key); // resolve is still a ColorRouter method
    }
    
    return resolved;
  }
  
  // --- RENDERER ACCESS ---
  createRenderer(format?: 'css-variables' | 'scss' | 'json'): any {
    // ColorRenderer will be injected from the main module to avoid circular imports
    if (!this.#ColorRenderer) {
      throw new Error('ColorRenderer class not injected. Please call setColorRenderer() first.');
    }
    return new this.#ColorRenderer(this, format);
  }
  
  // Method to inject ColorRenderer class to avoid circular imports
  setColorRenderer(ColorRenderer: ColorRendererClass): void {
    this.#ColorRenderer = ColorRenderer;
  }
  
  // Method to set logging callback for UI integration
  setLogCallback(callback: LogCallback): void {
    this.#logCallback = callback;
    this.#dependencyGraph.setLogCallback(callback);
    this.#paletteManager.setLogCallback(callback); // Pass to PaletteManager as well
  }
}
