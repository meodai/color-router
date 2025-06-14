import { PaletteConfig, ColorDefinition, LogCallback } from './types';
import { PaletteError, CircularDependencyError } from './errors';
import { ColorRouter } from './ColorRouter';

/**
 * Manages color palettes, including creation, extension, and deletion.
 * Palettes can inherit from other palettes and override specific color definitions.
 */
export class PaletteManager {
  private palettes = new Map<string, PaletteConfig>();
  private definitions: Map<string, ColorDefinition>;
  private logCallback?: LogCallback;
  private colorRouter: ColorRouter;

  /**
   * Creates an instance of PaletteManager.
   * @param definitions A map of color definitions.
   * @param colorRouter An instance of ColorRouter.
   * @param logCallback An optional callback function for logging.
   */
  constructor(definitions: Map<string, ColorDefinition>, colorRouter: ColorRouter, logCallback?: LogCallback) {
    this.definitions = definitions;
    this.colorRouter = colorRouter;
    this.logCallback = logCallback;
  }

  /**
   * Sets the log callback function.
   * @param callback The callback function for logging.
   */
  public setLogCallback(callback: LogCallback): void {
    this.logCallback = callback;
  }

  /**
   * Creates a new palette.
   * @param name The name of the palette.
   * @param options Optional parameters for the palette, including `extends` for inheritance,
   * `overrides` for specific color definitions, and `description`.
   * @throws {PaletteError} If the palette already exists or the base palette does not exist.
   */
  public createPalette(
    name: string,
    options: { extends?: string; overrides?: Record<string, any>; description?: string } = {},
  ): void {
    const { extends: basePalette, overrides = {}, description } = options;
    if (this.palettes.has(name)) throw new PaletteError(`Palette "${name}" already exists.`);
    if (basePalette && !this.palettes.has(basePalette)) {
      throw new PaletteError(`Base palette "${basePalette}" does not exist.`);
    }
    this.palettes.set(name, { extends: basePalette, overrides, description }); // Include description
    if (this.logCallback) {
      let logMessage = `Palette '${name}' created`;
      if (basePalette) logMessage += ` extending '${basePalette}'`;
      if (description) logMessage += ` with description "${description}"`;
      logMessage += '.';
      this.logCallback(logMessage);
    }

    if (basePalette && Object.keys(overrides).length > 0) {
      for (const [key, value] of Object.entries(overrides)) {
        this.colorRouter.define(`${name}.${key}`, value);
      }
    }
  }

  /**
   * Extends an existing palette by creating a new palette that inherits from it.
   * @param name The name of the new palette.
   * @param basePalette The name of the palette to extend.
   * @param overrides Optional color definitions to override in the new palette.
   * @param description Optional description for the new palette.
   */
  public extendPalette(
    name: string,
    basePalette: string,
    overrides: Record<string, any> = {},
    description?: string,
  ): void {
    this.createPalette(name, { extends: basePalette, overrides, description });
  }

  /**
   * Copies an existing palette to a new palette.
   * @param sourceName The name of the palette to copy.
   * @param targetName The name of the new palette.
   * @throws {PaletteError} If the source palette does not exist or the target palette already exists.
   */
  public copyPalette(sourceName: string, targetName: string): void {
    if (!this.palettes.has(sourceName)) {
      throw new PaletteError(`Source palette "${sourceName}" does not exist.`);
    }
    if (this.palettes.has(targetName)) {
      throw new PaletteError(`Target palette "${targetName}" already exists.`);
    }

    const sourceConfig = this.palettes.get(sourceName);
    const sourceKeys = this.getAllKeysForPalette(sourceName);
    // Preserve description when copying
    this.createPalette(targetName, { description: sourceConfig?.description });

    for (const key of sourceKeys) {
      const definition = this.colorRouter.getDefinitionForKey(key);
      this.colorRouter.define(`${targetName}.${key.substring(sourceName.length + 1)}`, definition);
    }
    if (this.logCallback) this.logCallback(`Copied palette '${sourceName}' to '${targetName}'.`);
  }

  /**
   * Deletes a palette.
   * @param name The name of the palette to delete.
   * @returns An array of keys that were part of the deleted palette.
   * @throws {PaletteError} If the palette does not exist.
   */
  public deletePalette(name: string): string[] {
    if (!this.palettes.has(name)) throw new PaletteError(`Palette "${name}" does not exist.`);

    const keysToDelete = this.getAllKeysForPalette(name);
    this.palettes.delete(name);
    if (this.logCallback) this.logCallback(`Deleted palette '${name}'.`);
    return keysToDelete;
  }

  /**
   * Retrieves a palette configuration.
   * @param name The name of the palette.
   * @returns The palette configuration, or undefined if the palette does not exist.
   */
  public getPalette(name: string): PaletteConfig | undefined {
    return this.palettes.get(name);
  }

  /**
   * Checks if a palette exists.
   * @param name The name of the palette.
   * @returns True if the palette exists, false otherwise.
   */
  public hasPalette(name: string): boolean {
    return this.palettes.has(name);
  }

  /**
   * Retrieves all palettes.
   * @returns An array of objects, each containing the name and configuration of a palette.
   */
  public getAllPalettes(): Array<{ name: string; config: PaletteConfig }> {
    return Array.from(this.palettes.entries()).map(([name, config]) => ({ name, config }));
  }

  /**
   * Retrieves all keys for a given palette, including keys from extended palettes.
   * @param paletteName The name of the palette.
   * @returns An array of fully qualified color keys (e.g., "paletteName.colorName").
   * @throws {CircularDependencyError} If a circular dependency is detected in palette extensions.
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
