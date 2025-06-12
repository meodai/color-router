import { formatHex, parse, wcagContrast, interpolate, converter } from 'culori';

// --- TYPE DEFINITIONS ---

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

export class ColorReference {
  readonly type = Symbol.for('ColorReference');
  
  constructor(public readonly key: string) {}
}

export class ColorFunction {
  readonly type = Symbol.for('ColorFunction');
  
  constructor(
    public readonly fn: (...args: any[]) => string,
    public readonly args: any[],
    public readonly dependencies: string[]
  ) {}
  
  execute(resolver: ColorRouter): string {
    const resolvedArgs = this.args.map(arg => 
      typeof arg === 'string' && resolver.has(arg) ? resolver.resolve(arg) : arg
    );
    return this.fn(...resolvedArgs);
  }
}

export class PaletteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaletteError';
  }
}

export class CircularDependencyError extends Error {
  constructor(public readonly path: string[]) {
    super(`Circular dependency detected: ${path.join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}

export type ColorDefinition = ColorValue | ColorReference | ColorFunction;
export type LogCallback = (message: string) => void;
export type ColorRendererClass = new (router: ColorRouter, format?: 'css-variables' | 'scss' | 'json') => any;

export class ColorRouter {
  readonly #palettes = new Map<string, PaletteConfig>();
  readonly #definitions = new Map<string, ColorDefinition>();
  readonly #resolved = new Map<string, string>();
  readonly #dependencies = new Map<string, Set<string>>();
  readonly #dependents = new Map<string, Set<string>>();
  #mode: 'auto' | 'batch' = 'auto';
  readonly #batchQueue = new Set<string>();
  readonly #eventEmitter = new EventTarget();
  readonly #customFunctions = new Map<string, (...args: any[]) => string>();
  
  #ColorRenderer?: ColorRendererClass;
  #logCallback?: LogCallback;

  constructor(options: { mode?: 'auto' | 'batch' } = {}) {
    this.#mode = options.mode || 'auto';
    this.#registerBuiltinFunctions();
  }

  // --- CUSTOM FUNCTIONS ---
  registerFunction(name: string, fn: (...args: any[]) => string): void {
    if ((this as any)[name] || name === 'ref' || name === 'func') {
      throw new PaletteError(`Function name "${name}" is reserved.`);
    }
    this.#customFunctions.set(name, fn);
    if (this.#logCallback) this.#logCallback(`Registered function '${name}'.`);
  }

  func(name: string, ...args: any[]): ColorFunction {
    if (!this.#customFunctions.has(name)) {
      throw new PaletteError(`Custom function "${name}" is not registered.`);
    }
    const implementation = this.#customFunctions.get(name)!;
    const dependencies = args.filter(arg => typeof arg === 'string' && arg.includes('.'));
    return new ColorFunction(implementation, args, dependencies);
  }

  // --- PALETTE MANAGEMENT ---
  createPalette(name: string, options: { extends?: string; overrides?: Record<string, any> } = {}): void {
    const { extends: basePalette, overrides = {} } = options;
    if (this.#palettes.has(name)) throw new PaletteError(`Palette "${name}" already exists.`);
    if (basePalette && !this.#palettes.has(basePalette)) {
      throw new PaletteError(`Base palette "${basePalette}" does not exist.`);
    }
    this.#palettes.set(name, { extends: basePalette, overrides });
    if (this.#logCallback) {
      this.#logCallback(`Palette '${name}' created${basePalette ? ` extending '${basePalette}'` : ''}.`);
    }
    
    // Apply overrides if provided
    if (basePalette && Object.keys(overrides).length > 0) {
      for (const [key, value] of Object.entries(overrides)) { 
        this.define(`${name}.${key}`, value); 
      }
    }
  }

  extendPalette(name: string, basePalette: string, overrides: Record<string, any> = {}): void {
    return this.createPalette(name, { extends: basePalette, overrides });
  }

  copyPalette(sourceName: string, targetName: string): void {
    if (!this.#palettes.has(sourceName)) {
      throw new PaletteError(`Source palette "${sourceName}" does not exist.`);
    }
    if (this.#palettes.has(targetName)) {
      throw new PaletteError(`Target palette "${targetName}" already exists.`);
    }
    
    const sourceKeys = this.getAllKeysForPalette(sourceName);
    this.createPalette(targetName);
    
    for (const key of sourceKeys) {
      const shortKey = key.split('.').slice(1).join('.');
      const definition = this.getDefinitionForKey(key);
      this.define(`${targetName}.${shortKey}`, definition);
    }
    if (this.#logCallback) this.#logCallback(`Copied palette '${sourceName}' to '${targetName}'.`);
  }

  deletePalette(name: string): void {
    if (!this.#palettes.has(name)) throw new PaletteError(`Palette "${name}" does not exist.`);
    
    // Remove all colors in this palette
    const keysToDelete = this.getAllKeysForPalette(name);
    for (const key of keysToDelete) {
      this.#definitions.delete(key);
      this.#resolved.delete(key);
      this.#dependencies.delete(key);
      this.#dependents.delete(key);
    }
    
    this.#palettes.delete(name);
    if (this.#logCallback) this.#logCallback(`Deleted palette '${name}'.`);
  }

  // --- COLOR DEFINITION & MODIFICATION ---
  define(key: string, value: ColorDefinition): void {
    const [palette] = key.split('.');
    if (!this.#palettes.has(palette)) {
      throw new PaletteError(`Palette "${palette}" does not exist. Create it first.`);
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
    this.#updateDependencies(key, value);
    if (this.#mode === 'auto') {
      this.#resolveAndNotify(key);
    } else {
      this.#batchQueue.add(key);
    }
    if (this.#logCallback) this.#logCallback(`Defined '${key}' = ${this.#valueToString(value)}`);
  }
  
  flush(): void {
    if (this.#mode !== 'batch') return;
    const sorted = this.#topologicalSort(Array.from(this.#batchQueue));
    const allChanges: ColorChangeEvent[] = [];
    for (const key of sorted) {
      const oldValue = this.#resolved.get(key);
      this.#resolveKey(key);
      const newValue = this.#resolved.get(key);
      if (oldValue !== newValue) {
        allChanges.push({ key, oldValue, newValue: newValue! });
        this.#emit(key, newValue!, oldValue);
      }
    }
    if (allChanges.length > 0) {
      this.#eventEmitter.dispatchEvent(new CustomEvent('change', { detail: allChanges }));
      this.#eventEmitter.dispatchEvent(new CustomEvent('batch-complete', { detail: allChanges }));
      if (this.#logCallback) this.#logCallback(`Flush complete. ${allChanges.length} colors updated.`);
    }
    this.#batchQueue.clear();
  }

  // --- RESOLUTION & REACTIVITY ---
  #resolveAndNotify(startKey: string): void {
    const toUpdate = this.#getUpdateOrder(startKey);
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
    const visitedPalettes = new Set<string>(); // Track visited palettes to prevent infinite loops
    
    while (paletteName) {
      // Check for circular palette inheritance
      if (visitedPalettes.has(paletteName)) {
        throw new CircularDependencyError([...visitedPalettes, paletteName]);
      }
      visitedPalettes.add(paletteName);
      
      const currentKey = `${paletteName}.${colorName}`;
      if (this.#definitions.has(currentKey)) return this.#definitions.get(currentKey)!;
      const paletteConfig = this.#palettes.get(paletteName);
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
        return 'invalid'; 
      }
    }
    return this.#resolved.get(key)!;
  }

  #getAllPaletteKeys(paletteName: string): string[] {
    const keys = new Set<string>();
    let current: string | undefined = paletteName;
    const paletteStack: string[] = [];
    const visitedPalettes = new Set<string>(); // Prevent infinite loops
    
    while (current && !visitedPalettes.has(current)) {
      visitedPalettes.add(current);
      paletteStack.unshift(current);
      const palette = this.#palettes.get(current);
      current = palette?.extends;
    }
    
    // If we hit a visited palette, throw an error
    if (current && visitedPalettes.has(current)) {
      throw new CircularDependencyError([...visitedPalettes, current]);
    }
    
    for (const pName of paletteStack) {
      const prefix = `${pName}.`;
      for (const key of this.#definitions.keys()) {
        if (key.startsWith(prefix)) {
          keys.add(key.split('.').slice(1).join('.'));
        }
      }
    }
    return Array.from(keys).map(k => `${paletteName}.${k}`);
  }

  // --- DEPENDENCY GRAPH ---
  #updateDependencies(key: string, value: ColorDefinition): void {
    if (this.#dependents.has(key)) {
      for (const dep of this.#dependents.get(key)!) { 
        this.#dependencies.get(dep)?.delete(key); 
      }
    }
    this.#dependents.set(key, new Set());
    const deps = this.#getDepsFromValue(value);
    for (const dep of deps) {
      if (!this.#dependencies.has(dep)) this.#dependencies.set(dep, new Set());
      this.#dependencies.get(dep)!.add(key);
      this.#dependents.get(key)!.add(dep);
    }
  }

  #getDepsFromValue(value: ColorDefinition): string[] {
    if (value instanceof ColorReference) return [value.key];
    if (value instanceof ColorFunction) return value.dependencies;
    return [];
  }

  #getUpdateOrder(startKey: string): string[] {
    const visited = new Set<string>();
    const order: string[] = [];
    const routerInstance = this;
    
    function visit(key: string): void {
      if (visited.has(key)) return;
      visited.add(key);
      (routerInstance.#dependencies.get(key) || []).forEach(visit);
      order.push(key);
    }
    visit(startKey);
    return order.reverse();
  }

  #topologicalSort(keys: string[]): string[] {
    const sorted: string[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();
    const routerInstance = this;
    
    const visit = (key: string): void => {
      if (visited.has(key)) return;
      if (temp.has(key)) throw new CircularDependencyError([...temp, key]);
      temp.add(key);
      
      const dependents = routerInstance.#dependents.get(key);
      if (dependents) {
        for (const dep of dependents) {
          if (keys.includes(dep)) {
            visit(dep);
          }
        }
      }
      
      temp.delete(key);
      visited.add(key);
      sorted.push(key);
    };
    
    for (const key of keys) { 
      if (!visited.has(key)) {
        try {
          visit(key);
        } catch (e) {
          if (e instanceof CircularDependencyError) {
            // Log the circular dependency but continue with other keys
            if (this.#logCallback) {
              this.#logCallback(`Circular dependency detected for '${key}': ${e.message}`);
            }
            // Add the key anyway to prevent infinite loops
            if (!visited.has(key)) {
              visited.add(key);
              sorted.push(key);
            }
          } else {
            throw e; // Re-throw non-circular dependency errors
          }
        }
      }
    }
    return sorted;
  }

  // --- UTILITY & HELPER FUNCTIONS ---
  has(key: string): boolean {
    let [pName, cName] = key.split('.');
    const visitedPalettes = new Set<string>(); // Prevent infinite loops
    
    while (pName) {
      // Check for circular palette inheritance
      if (visitedPalettes.has(pName)) {
        throw new CircularDependencyError([...visitedPalettes, pName]);
      }
      visitedPalettes.add(pName);
      
      if (this.#definitions.has(`${pName}.${cName}`)) return true;
      const pConfig = this.#palettes.get(pName);
      if (!pConfig || !pConfig.extends) break;
      pName = pConfig.extends;
    }
    return false;
  }

  #valueToString(value: ColorDefinition): string {
    if (value instanceof ColorReference) return `ref('${value.key}')`;
    if (value instanceof ColorFunction) {
      const fnName = [...this.#customFunctions.entries()].find(([_, fn]) => fn === value.fn)?.[0] || value.fn.name.replace('bound ', '');
      const args = value.args.map(a => typeof a === 'string' ? `'${a}'` : a).join(', ');
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
  
  // Register built-in functions during construction
  #registerBuiltinFunctions(): void {
    // Best contrast function
    this.registerFunction('bestContrastWith', (targetColor: string, paletteName?: string): string => {
      if (!parse(targetColor)) return '#000000';
      
      // If no palette specified, use simple black/white contrast
      if (!paletteName) {
        return wcagContrast('#fff', targetColor) >= wcagContrast('#000', targetColor) ? '#ffffff' : '#000000';
      }
      
      // Get all colors from the specified palette
      if (!this.#palettes.has(paletteName)) {
        console.warn(`Palette "${paletteName}" not found, falling back to black/white`);
        return wcagContrast('#fff', targetColor) >= wcagContrast('#000', targetColor) ? '#ffffff' : '#000000';
      }
      
      const paletteKeys = this.getAllKeysForPalette(paletteName);
      if (paletteKeys.length === 0) {
        console.warn(`Palette "${paletteName}" has no colors, falling back to black/white`);
        return wcagContrast('#fff', targetColor) >= wcagContrast('#000', targetColor) ? '#ffffff' : '#000000';
      }
      
      let bestColor: string | null = null;
      let bestContrast = 0;
      
      for (const key of paletteKeys) {
        try {
          const candidateColor = this.resolve(key);
          if (candidateColor && candidateColor !== 'invalid') {
            const contrast = wcagContrast(candidateColor, targetColor);
            if (contrast > bestContrast) {
              bestContrast = contrast;
              bestColor = candidateColor;
            }
          }
        } catch (e) {
          // Skip invalid colors
          continue;
        }
      }
      
      // Return the best color found, or fallback to first valid color if no good contrast found
      if (bestColor) {
        return bestColor;
      }
      
      // If no colors had good contrast, just return the first valid color
      for (const key of paletteKeys) {
        try {
          const candidateColor = this.resolve(key);
          if (candidateColor && candidateColor !== 'invalid') {
            return candidateColor;
          }
        } catch (e) {
          continue;
        }
      }
      
      // Ultimate fallback if palette has no valid colors
      return '#000000';
    });

    // Color mixing function
    this.registerFunction('colorMix', (color1: string, color2: string, ratio = '50%', colorSpace = 'lab'): string => {
      try {
        const parsed1 = parse(color1);
        const parsed2 = parse(color2);
        if (!parsed1 || !parsed2) return color1;
        
        const interpolator = interpolate([parsed1, parsed2], colorSpace);
        const ratioNum = parseFloat(ratio) / 100;
        return formatHex(interpolator(ratioNum));
      } catch (e) {
        return color1;
      }
    });

    // Relative color function
    this.registerFunction('relativeTo', (baseColor: string, transform: string): string => {
      try {
        const parsed = parse(baseColor);
        if (!parsed) return baseColor;
        
        // Simple implementation for relative color syntax
        if (transform.includes('/ 0.8')) {
          const withAlpha = { ...parsed, alpha: 0.8 };
          return formatHex(withAlpha);
        }
        return formatHex(parsed);
      } catch (e) {
        return baseColor;
      }
    });

    // Minimum contrast function
    this.registerFunction('minContrastWith', (targetColor: string, minRatio = 1.5): string => {
      if (!parse(targetColor)) return '#000000';
      const whiteContrast = wcagContrast('#fff', targetColor);
      const blackContrast = wcagContrast('#000', targetColor);
      
      if (whiteContrast >= minRatio) return '#ffffff';
      if (blackContrast >= minRatio) return '#000000';
      
      return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
    });

    // Lighten function
    this.registerFunction('lighten', (color: string, amount: number): string => {
      try {
        const c = parse(color);
        if (!c) return color;
        
        const toHsl = converter('hsl');
        const hslColor = toHsl(c);
        if (hslColor && typeof hslColor.l === 'number') {
          hslColor.l = Math.min(1, hslColor.l + amount);
          return formatHex(hslColor);
        }
        return color;
      } catch (e) {
        return color;
      }
    });

    // Darken function
    this.registerFunction('darken', (color: string, amount: number): string => {
      try {
        const c = parse(color);
        if (!c) return color;
        
        const toHsl = converter('hsl');
        const hslColor = toHsl(c);
        if (hslColor && typeof hslColor.l === 'number') {
          hslColor.l = Math.max(0, hslColor.l - amount);
          return formatHex(hslColor);
        }
        return color;
      } catch (e) {
        return color;
      }
    });
  }

  // --- PUBLIC GETTERS FOR UI ---
  getAllPalettes(): Array<{ name: string; config: PaletteConfig }> {
    return Array.from(this.#palettes.entries()).map(([name, config]) => ({ name, config }));
  }

  getAllKeysForPalette(paletteName: string): string[] {
    return this.#getAllPaletteKeys(paletteName);
  }

  valueToString(value: ColorDefinition): string {
    return this.#valueToString(value);
  }

  // Get raw value for editing (without quotes or formatting)
  getRawValue(value: ColorDefinition): string {
    if (value instanceof ColorReference) return `ref('${value.key}')`;
    if (value instanceof ColorFunction) {
      const fnName = [...this.#customFunctions.entries()].find(([_, fn]) => fn === value.fn)?.[0] || value.fn.name.replace('bound ', '');
      const args = value.args.map(a => typeof a === 'string' ? `'${a}'` : a).join(', ');
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
    return Array.from(this.#dependents.get(key) || []);
  }

  getDependents(key: string): string[] {
    return Array.from(this.#dependencies.get(key) || []);
  }

  getConnectionGraph(): Record<string, string[]> {
    const graph: Record<string, string[]> = {};
    for (const [key, deps] of this.#dependents.entries()) {
      graph[key] = Array.from(deps);
    }
    return graph;
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
    const keys = this.getAllKeysForPalette(paletteName);
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
    const keys = this.getAllKeysForPalette(paletteName);
    const resolved: Record<string, string> = {};
    
    for (const key of keys) {
      const shortKey = key.split('.').slice(1).join('.');
      resolved[shortKey] = this.resolve(key);
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
  }
}
