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
  ColorDefinition,
  ColorReference,
  ColorFunction,
  LogCallback,
} from '../types';
import { DependencyGraph } from '../router/DependencyGraph';

/**
 * Core token resolution engine that handles references, functions, and dependency tracking.
 * Replaces the ColorRouter with a more focused responsibility.
 */
export class TokenEngine {
  readonly #definitions = new Map<string, ColorDefinition>();
  readonly #resolved = new Map<string, string>();
  readonly #dependencyGraph: DependencyGraph;
  #mode: 'auto' | 'batch' = 'auto';
  readonly #batchQueue = new Set<string>();
  readonly #eventEmitter = new EventTarget();
  
  // Function registry for value modifiers and scope selectors
  readonly #valueModifiers = new Map<string, (...args: any[]) => string>();
  readonly #scopeSelectors = new Map<string, (...args: any[]) => string>();
  readonly #scopeAwareFunctions = new Set<string>();

  #logCallback?: LogCallback;

  constructor(options: { mode?: 'auto' | 'batch' } = {}) {
    this.#mode = options.mode || 'auto';
    this.#dependencyGraph = new DependencyGraph(this.#logCallback);
    this.#registerBuiltinFunctions();
  }

  #registerBuiltinFunctions(): void {
    // Value modifiers - transform individual values
    this.registerValueModifier('lighten', lighten);
    this.registerValueModifier('darken', darken);
    this.registerValueModifier('colorMix', colorMix);
    this.registerValueModifier('relativeTo', relativeTo);

    // Scope selectors - select values from scopes/palettes
    this.registerScopeSelector('bestContrastWith', bestContrastWith);
    this.registerScopeSelector('minContrastWith', minContrastWith);
    this.registerScopeSelector('furthestFrom', furthestFrom);
    this.registerScopeSelector('closestColor', closestColor);
  }

  /**
   * Register a function that modifies individual values
   */
  registerValueModifier(name: string, fn: (...args: any[]) => string): void {
    this.#valueModifiers.set(name, fn);
  }

  /**
   * Register a function that selects values from scopes
   */
  registerScopeSelector(name: string, fn: (...args: any[]) => string): void {
    this.#scopeSelectors.set(name, fn);
    this.#scopeAwareFunctions.add(name);
  }

  /**
   * Define a token
   */
  define(key: string, definition: ColorDefinition): void {
    this.#definitions.set(key, definition);
    
    // Track dependencies
    this.#trackDependencies(key, definition);

    if (this.#mode === 'auto') {
      this.#resolveAndUpdate(key);
    } else {
      this.#batchQueue.add(key);
    }
  }

  /**
   * Update an existing token
   */
  set(key: string, definition: ColorDefinition): void {
    if (!this.#definitions.has(key)) {
      throw new Error(`Token "${key}" does not exist. Use define() to create it.`);
    }

    const oldValue = this.#resolved.get(key);
    this.#definitions.set(key, definition);

    // Update dependencies
    this.#dependencyGraph.removeNode(key);
    this.#trackDependencies(key, definition);

    if (this.#mode === 'auto') {
      this.#resolveAndUpdate(key);
    } else {
      this.#batchQueue.add(key);
    }

    // Emit change event
    const newValue = this.#resolved.get(key);
    this.#emitChange([{ key, oldValue, newValue: newValue! }]);
  }

  /**
   * Get a token definition
   */
  getDefinition(key: string): ColorDefinition | undefined {
    return this.#definitions.get(key);
  }

  /**
   * Check if a token exists
   */
  has(key: string): boolean {
    return this.#definitions.has(key);
  }

  /**
   * Resolve a token to its final value
   */
  resolve(key: string): string {
    if (this.#resolved.has(key)) {
      return this.#resolved.get(key)!;
    }

    const definition = this.#definitions.get(key);
    if (!definition) {
      throw new Error(`Token "${key}" is not defined`);
    }

    const resolved = this.#resolveDefinition(definition);
    this.#resolved.set(key, resolved);
    return resolved;
  }

  /**
   * Create a reference to another token
   */
  ref(key: string): ColorReference {
    return new ColorReference(key);
  }

  /**
   * Create a value modifier function call
   */
  modify(functionName: string, ...args: any[]): ColorDefinition {
    if (!this.#valueModifiers.has(functionName)) {
      throw new Error(`Value modifier "${functionName}" is not registered`);
    }
    
    const fn = this.#valueModifiers.get(functionName)!;
    const dependencies = args.filter(arg => typeof arg === 'string' && this.#definitions.has(arg));
    
    // Create a wrapper function that doesn't expect the engine as first parameter
    const wrappedFn = (...resolvedArgs: any[]) => fn(...resolvedArgs);
    return new ColorFunction(wrappedFn, args, dependencies, functionName);
  }

  /**
   * Create a scope selector function call
   */
  select(functionName: string, ...args: any[]): ColorDefinition {
    if (!this.#scopeSelectors.has(functionName)) {
      throw new Error(`Scope selector "${functionName}" is not registered`);
    }
    
    const fn = this.#scopeSelectors.get(functionName)!;
    const dependencies = args.filter(arg => typeof arg === 'string' && this.#definitions.has(arg));
    
    // Create a wrapper function that expects the engine as first parameter
    const wrappedFn = (...resolvedArgs: any[]) => fn(this, ...resolvedArgs);
    return new ColorFunction(wrappedFn, args, dependencies, functionName);
  }

  /**
   * Get all tokens for a scope
   */
  getAllTokensForScope(scopeName: string): string[] {
    const prefix = `${scopeName}.`;
    return Array.from(this.#definitions.keys()).filter(key => key.startsWith(prefix));
  }

  /**
   * Get dependencies for a token
   */
  getDependencies(key: string): string[] {
    return this.#dependencyGraph.getPrerequisitesFor(key);
  }

  /**
   * Get dependents for a token
   */
  getDependents(key: string): string[] {
    return this.#dependencyGraph.getDependentsOf(key);
  }

  /**
   * Delete a token
   */
  delete(key: string): boolean {
    if (!this.#definitions.has(key)) {
      return false;
    }

    this.#definitions.delete(key);
    this.#resolved.delete(key);
    this.#dependencyGraph.removeNode(key);
    return true;
  }

  /**
   * Set the engine mode
   */
  set mode(mode: 'auto' | 'batch') {
    this.#mode = mode;
  }

  get mode(): 'auto' | 'batch' {
    return this.#mode;
  }

  /**
   * Flush batch changes
   */
  flush(): void {
    if (this.#mode !== 'batch') return;

    const changes: Array<{ key: string; oldValue: string | undefined; newValue: string }> = [];

    for (const key of this.#batchQueue) {
      const oldValue = this.#resolved.get(key);
      this.#resolveAndUpdate(key);
      const newValue = this.#resolved.get(key);
      changes.push({ key, oldValue, newValue: newValue! });
    }

    this.#batchQueue.clear();
    this.#emitChange(changes);
  }

  /**
   * Listen for changes
   */
  on(event: string, callback: (event: any) => void): void {
    this.#eventEmitter.addEventListener(event, callback);
  }

  // Private methods
  #trackDependencies(key: string, definition: ColorDefinition): void {
    this.#dependencyGraph.updateEdges(key, definition);
  }

  #resolveDefinition(definition: ColorDefinition): string {
    if (typeof definition === 'string') {
      return definition; // Return raw string value without normalization
    }

    if (definition instanceof ColorReference) {
      return this.resolve(definition.key);
    }

    if (definition instanceof ColorFunction) {
      const resolvedArgs = definition.args.map(arg => {
        if (typeof arg === 'string' && this.#definitions.has(arg)) {
          return this.resolve(arg);
        }
        return arg;
      });

      // The wrapper functions handle engine parameter correctly
      return definition.fn(...resolvedArgs);
    }

    throw new Error(`Unknown definition type: ${definition}`);
  }

  #resolveAndUpdate(key: string): void {
    const resolved = this.resolve(key);
    this.#resolved.set(key, resolved);

    // Update dependents
    const dependents = this.getDependents(key);
    for (const dependent of dependents) {
      this.#resolved.delete(dependent);
      this.#resolveAndUpdate(dependent);
    }
  }

  #emitChange(changes: Array<{ key: string; oldValue: string | undefined; newValue: string }>): void {
    const event = new CustomEvent('change', { detail: changes });
    this.#eventEmitter.dispatchEvent(event);
  }
}
