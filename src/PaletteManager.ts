import { PaletteConfig, ColorDefinition, LogCallback } from './types';
import { PaletteError, CircularDependencyError } from './errors';
import { ColorRouter } from './ColorRouter'; // Full ColorRouter for internal methods

/**
 * Manages palette configurations and operations within the ColorRouter system.
 * This class is intended to be instantiated and used by ColorRouter.
 */
export class PaletteManager {
  private palettes = new Map<string, PaletteConfig>();
  private definitions: Map<string, ColorDefinition>; // Reference to ColorRouter's definitions
  private logCallback?: LogCallback;
  private colorRouter: ColorRouter; // To call define, getDefinitionForKey, getAllKeysForPalette

  constructor(
    definitions: Map<string, ColorDefinition>,
    colorRouter: ColorRouter, // Pass the ColorRouter instance
    logCallback?: LogCallback,
  ) {
    this.definitions = definitions;
    this.colorRouter = colorRouter;
    this.logCallback = logCallback;
  }

  public setLogCallback(callback: LogCallback): void {
    this.logCallback = callback;
  }

  public createPalette(name: string, options: { extends?: string; overrides?: Record<string, any> } = {}): void {
    const { extends: basePalette, overrides = {} } = options;
    if (this.palettes.has(name)) throw new PaletteError(`Palette "${name}" already exists.`);
    if (basePalette && !this.palettes.has(basePalette)) {
      throw new PaletteError(`Base palette "${basePalette}" does not exist.`);
    }
    this.palettes.set(name, { extends: basePalette, overrides });
    if (this.logCallback) {
      this.logCallback(`Palette '${name}' created${basePalette ? ` extending '${basePalette}'` : ''}.`);
    }

    // Apply overrides if provided - uses ColorRouter's define method
    if (basePalette && Object.keys(overrides).length > 0) {
      for (const [key, value] of Object.entries(overrides)) {
        this.colorRouter.define(`${name}.${key}`, value);
      }
    }
  }

  public extendPalette(name: string, basePalette: string, overrides: Record<string, any> = {}): void {
    this.createPalette(name, { extends: basePalette, overrides });
  }

  public copyPalette(sourceName: string, targetName: string): void {
    if (!this.palettes.has(sourceName)) {
      throw new PaletteError(`Source palette "${sourceName}" does not exist.`);
    }
    if (this.palettes.has(targetName)) {
      throw new PaletteError(`Target palette "${targetName}" already exists.`);
    }

    const sourceKeys = this.getAllKeysForPalette(sourceName); // Changed: Use own method
    this.createPalette(targetName); // Creates an empty palette config

    for (const key of sourceKeys) {
      const definition = this.colorRouter.getDefinitionForKey(key);
      // key from getAllKeysForPalette is already like `sourceName.actualKey`
      // We need to define it as `targetName.actualKey`
      this.colorRouter.define(`${targetName}.${key.substring(sourceName.length + 1)}`, definition);
    }
    if (this.logCallback) this.logCallback(`Copied palette '${sourceName}' to '${targetName}'.`);
  }

  public deletePalette(name: string): string[] {
    // Returns keys that were part of the palette
    if (!this.palettes.has(name)) throw new PaletteError(`Palette "${name}" does not exist.`);

    const keysToDelete = this.getAllKeysForPalette(name); // Changed: Use own method
    this.palettes.delete(name);
    if (this.logCallback) this.logCallback(`Deleted palette '${name}'.`);
    return keysToDelete;
  }

  public getPalette(name: string): PaletteConfig | undefined {
    return this.palettes.get(name);
  }

  public hasPalette(name: string): boolean {
    return this.palettes.has(name);
  }

  public getAllPalettes(): Array<{ name: string; config: PaletteConfig }> {
    return Array.from(this.palettes.entries()).map(([name, config]) => ({ name, config }));
  }

  /**
   * Retrieves all fully qualified color keys belonging to a specific palette,
   * considering its inheritance hierarchy.
   * This method relies on ColorRouter's definitions map for checking actual color definitions.
   */
  public getAllKeysForPalette(paletteName: string): string[] {
    const keys = new Set<string>();
    let current: string | undefined = paletteName;
    const paletteStack: string[] = [];
    const visitedPalettes = new Set<string>();

    while (current && !visitedPalettes.has(current)) {
      visitedPalettes.add(current);
      paletteStack.unshift(current);
      const paletteConfig = this.palettes.get(current);
      current = paletteConfig?.extends;
    }

    if (current && visitedPalettes.has(current)) {
      throw new CircularDependencyError([...visitedPalettes, current]);
    }

    for (const pName of paletteStack) {
      const prefix = `${pName}.`;
      // Iterate over ColorRouter's definitions to find keys belonging to this palette in the hierarchy
      for (const key of this.definitions.keys()) {
        if (key.startsWith(prefix)) {
          const actualKey = key.substring(prefix.length);
          keys.add(`${paletteName}.${actualKey}`);
        }
      }
    }
    return Array.from(keys);
  }
}
