import { formatHex, parse } from 'culori';
import { TokenEngine } from '../engine/TokenEngine';
import { ColorDefinition, ColorFunction, ColorReference } from '../types';

/**
 * A Design System represents a complete design language and is composed of multiple scopes.
 * Each scope can contain tokens for colors, typography, spacing, etc.
 */
export class DesignSystem {
  private scopes = new Map<string, Scope>();
  private engine: TokenEngine;

  constructor(public readonly name: string, options: { mode?: 'auto' | 'batch' } = {}) {
    this.engine = new TokenEngine(options);
  }

  /**
   * Add a new scope to the system.
   * A scope is a collection of tokens that can represent colors, fonts, sizes, etc.
   */
  addScope(name: string, options: { extends?: string; description?: string } = {}): Scope {
    if (this.scopes.has(name)) {
      throw new Error(`Scope "${name}" already exists in system "${this.name}"`);
    }

    // TODO: Handle scope inheritance in TokenEngine
    // For now, just create the scope
    const scope = new Scope(name, this.engine, options);
    this.scopes.set(name, scope);
    return scope;
  }

  /**
   * Get an existing scope by name
   */
  getScope(name: string): Scope | undefined {
    return this.scopes.get(name);
  }

  /**
   * Get all scopes in the system
   */
  getAllScopes(): Scope[] {
    return Array.from(this.scopes.values());
  }

  /**
   * Remove a scope from the system
   */
  removeScope(name: string): boolean {
    if (this.scopes.has(name)) {
      // Remove all tokens for this scope
      const tokensToDelete = this.engine.getAllTokensForScope(name);
      for (const token of tokensToDelete) {
        this.engine.delete(token);
      }
      return this.scopes.delete(name);
    }
    return false;
  }

  /**
   * Get the underlying TokenEngine instance
   */
  getEngine(): TokenEngine {
    return this.engine;
  }

  /**
   * Resolve a token path across the entire system
   */
  resolve(path: string): string {
    return this.engine.resolve(path);
  }

  /**
   * Set the system mode (auto or batch)
   */
  setMode(mode: 'auto' | 'batch'): void {
    this.engine.mode = mode;
  }

  /**
   * Flush all pending changes (useful in batch mode)
   */
  flush(): void {
    this.engine.flush();
  }

  /**
   * Register a custom value modifier function
   */
  registerValueModifier(name: string, fn: (...args: any[]) => string): void {
    this.engine.registerValueModifier(name, fn);
  }

  /**
   * Register a custom scope selector function
   */
  registerScopeSelector(name: string, fn: (...args: any[]) => string): void {
    this.engine.registerScopeSelector(name, fn);
  }

  /**
   * Listen for changes in the system
   */
  onChange(callback: (changes: Array<{ key: string; oldValue: string | undefined; newValue: string }>) => void): void {
    this.engine.on('change', (event: any) => {
      callback(event.detail);
    });
  }
}

/**
 * A Scope is a collection of tokens that can represent colors, fonts, sizes, etc.
 * It's backed by a TokenEngine for consistency and advanced features.
 */
export class Scope implements Scopeable {
  private engine: TokenEngine;

  constructor(
    public readonly name: string,
    engine: TokenEngine,
    public readonly options: { extends?: string; description?: string } = {},
  ) {
    this.engine = engine;
  }

  /**
   * Set a token in this scope
   */
  set(name: string, token: Token | ColorDefinition): void {
    const key = `${this.name}.${name}`;
    
    let definition: ColorDefinition;
    if (typeof token === 'object' && token !== null && 'toDefinition' in token && typeof token.toDefinition === 'function') {
      definition = (token as Token).toDefinition();
    } else {
      definition = token as ColorDefinition;
    }
    
    if (this.engine.has(key)) {
      this.engine.set(key, definition);
    } else {
      this.engine.define(key, definition);
    }
  }

  /**
   * Get a token from this scope
   */
  get(name: string): Token | undefined {
    const key = `${this.name}.${name}`;
    if (!this.engine.has(key)) {
      return undefined;
    }

    const definition = this.engine.getDefinition(key);
    return Token.fromDefinition(definition!);
  }

  /**
   * Resolve a token path within this scope
   */
  resolve(path: string): string {
    // If path doesn't contain a scope prefix, assume it's in this scope
    const fullPath = path.includes('.') ? path : `${this.name}.${path}`;
    return this.engine.resolve(fullPath);
  }

  /**
   * Get all tokens in this scope
   */
  allTokens(): Record<string, Token> {
    const keys = this.engine.getAllTokensForScope(this.name);
    const tokens: Record<string, Token> = {};

    for (const key of keys) {
      const tokenName = key.substring(this.name.length + 1);
      const definition = this.engine.getDefinition(key);
      if (definition) {
        tokens[tokenName] = Token.fromDefinition(definition);
      }
    }

    return tokens;
  }

  /**
   * Get dependencies for a token in this scope
   */
  getDependencies(tokenName: string): string[] {
    const key = `${this.name}.${tokenName}`;
    return this.engine.getDependencies(key);
  }

  /**
   * Get tokens that depend on a specific token in this scope
   */
  getDependents(tokenName: string): string[] {
    const key = `${this.name}.${tokenName}`;
    return this.engine.getDependents(key);
  }
}

/**
 * Interface for resolving token references
 */
export interface Resolver {
  resolve(path: string): string;
}

/**
 * Interface for objects that contain tokens
 */
export interface Scopeable {
  allTokens(): Record<string, Token>;
}

/**
 * Base interface for all tokens
 */
export interface Token {
  resolve(resolver: Resolver): string;
  toDefinition(): ColorDefinition;
}

/**
 * Token that references another token
 */
export class ReferenceToken implements Token {
  constructor(public readonly pointer: string) {}

  resolve(resolver: Resolver): string {
    return resolver.resolve(this.pointer);
  }

  toDefinition(): ColorDefinition {
    return new ColorReference(this.pointer);
  }

  static fromDefinition(def: ColorReference): ReferenceToken {
    return new ReferenceToken(def.key);
  }
}

/**
 * Token that holds a literal value with a specific type
 */
export class ValueToken<T extends string = string> implements Token {
  constructor(
    public readonly value: string,
    public readonly type: T
  ) {}

  resolve(_: Resolver): string {
    return this.value;
  }

  toDefinition(): ColorDefinition {
    return this.value;
  }

  static fromDefinition(value: string, type: string = 'unknown'): ValueToken {
    return new ValueToken(value, type);
  }
}

/**
 * Color normalization utility
 */
function normalizeColor(color: string): string {
  const parsedColor = parse(color);
  return parsedColor ? formatHex(parsedColor) : color; // Return original if can't parse
}

/**
 * Specialized color value token
 */
export class ColorValueToken extends ValueToken<'color'> {
  constructor(
    value: string,
    public readonly format: 'hex' | 'lch' | 'oklch' | 'css' | 'rgb' | 'hsl' | 'lab' | 'oklab'
  ) {
    super(normalizeColor(value), 'color');
  }
}

/**
 * Future token types (for reference)
 */
export class SizeValueToken extends ValueToken<'size'> {
  constructor(
    value: string,
    public readonly unit: 'px' | 'rem' | 'em' | '%' | 'vw' | 'vh'
  ) {
    super(value, 'size');
  }
}

export class SpaceValueToken extends ValueToken<'space'> {
  constructor(
    value: string,
    public readonly unit: 'px' | 'rem' | 'em' | '%'
  ) {
    super(value, 'space');
  }
}

export class FontValueToken extends ValueToken<'font'> {
  constructor(
    value: string,
    public readonly property: 'family' | 'size' | 'weight' | 'style'
  ) {
    super(value, 'font');
  }
}

/**
 * Token that represents a function call
 */
export class FunctionToken implements Token {
  constructor(
    public readonly functionName: string,
    public readonly args: any[],
  ) {}

  resolve(resolver: Resolver): string {
    // This will be handled by the ColorRouter's function execution
    return resolver.resolve(`${this.functionName}(${this.args.join(', ')})`);
  }

  toDefinition(): ColorDefinition {
    // This needs to be converted to a ColorFunction via the router
    throw new Error('FunctionToken.toDefinition() should use router.func() instead');
  }

  static fromDefinition(def: ColorFunction): FunctionToken {
    // Extract function name from the ColorFunction
    const functionName = def.fn.name || 'unknown';
    return new FunctionToken(functionName, def.args);
  }
}

/**
 * Token factory that can create tokens from various definitions
 */
export abstract class Token {
  static fromDefinition(definition: ColorDefinition): Token {
    if (definition instanceof ColorReference) {
      return ReferenceToken.fromDefinition(definition);
    }
    if (definition instanceof ColorFunction) {
      return FunctionToken.fromDefinition(definition);
    }
    if (typeof definition === 'string') {
      // For color strings, create a ColorValueToken with CSS format as default
      return new ColorValueToken(definition, 'css');
    }
    throw new Error(`Unknown definition type: ${definition}`);
  }
}

// --- UTILITY FUNCTIONS ---

/**
 * Create a reference token (shorthand)
 */
export function ref(path: string): ReferenceToken {
  return new ReferenceToken(path);
}

/**
 * Value token namespace for different token types
 */
export const val = {
  color: {
    hex: (value: string): ColorValueToken => new ColorValueToken(value, 'hex'),
    lch: (value: string): ColorValueToken => new ColorValueToken(value, 'lch'),
    oklch: (value: string): ColorValueToken => new ColorValueToken(value, 'oklch'),
    css: (value: string): ColorValueToken => new ColorValueToken(value, 'css'),
    rgb: (value: string): ColorValueToken => new ColorValueToken(value, 'rgb'),
    hsl: (value: string): ColorValueToken => new ColorValueToken(value, 'hsl'),
    lab: (value: string): ColorValueToken => new ColorValueToken(value, 'lab'),
    oklab: (value: string): ColorValueToken => new ColorValueToken(value, 'oklab'),
  },
  // Future token types
  size: {
    px: (value: number): SizeValueToken => new SizeValueToken(`${value}px`, 'px'),
    rem: (value: number): SizeValueToken => new SizeValueToken(`${value}rem`, 'rem'),
    em: (value: number): SizeValueToken => new SizeValueToken(`${value}em`, 'em'),
    percent: (value: number): SizeValueToken => new SizeValueToken(`${value}%`, '%'),
    vw: (value: number): SizeValueToken => new SizeValueToken(`${value}vw`, 'vw'),
    vh: (value: number): SizeValueToken => new SizeValueToken(`${value}vh`, 'vh'),
  },
  space: {
    px: (value: number): SpaceValueToken => new SpaceValueToken(`${value}px`, 'px'),
    rem: (value: number): SpaceValueToken => new SpaceValueToken(`${value}rem`, 'rem'),
    em: (value: number): SpaceValueToken => new SpaceValueToken(`${value}em`, 'em'),
    percent: (value: number): SpaceValueToken => new SpaceValueToken(`${value}%`, '%'),
  },
  font: {
    family: (value: string): FontValueToken => new FontValueToken(value, 'family'),
    size: (value: string): FontValueToken => new FontValueToken(value, 'size'),
    weight: (value: string): FontValueToken => new FontValueToken(value, 'weight'),
    style: (value: string): FontValueToken => new FontValueToken(value, 'style'),
  }
};

/**
 * Function namespace for token operations, clearly separated by type
 */
export const func = {
  // Value modifiers - transform individual values
  modify: {
    lighten: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.modify('lighten', ...args),
    darken: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.modify('darken', ...args),
    mix: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.modify('colorMix', ...args),
    relativeTo: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.modify('relativeTo', ...args),
  },
  
  // Scope selectors - select values from scopes
  select: {
    bestContrastWith: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.select('bestContrastWith', ...args),
    minContrastWith: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.select('minContrastWith', ...args),
    furthestFrom: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.select('furthestFrom', ...args),
    closestColor: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.select('closestColor', ...args),
  },
  
  // Backward compatibility - maintain old color namespace
  color: {
    // Value modifiers
    lighten: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.modify('lighten', ...args),
    darken: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.modify('darken', ...args),
    mix: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.modify('colorMix', ...args),
    relativeTo: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.modify('relativeTo', ...args),
    
    // Scope selectors  
    bestContrastWith: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.select('bestContrastWith', ...args),
    minContrastWith: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.select('minContrastWith', ...args),
    furthestFrom: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.select('furthestFrom', ...args),
    closestColor: (engine: TokenEngine, ...args: any[]): ColorDefinition => 
      engine.select('closestColor', ...args),
  }
};


