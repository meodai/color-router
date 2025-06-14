import { PaletteConfig, ColorDefinition, LogCallback } from './types';
import { PaletteError, CircularDependencyError } from './errors';
import { ColorRouter } from './ColorRouter';

export class PaletteManager {
  private palettes = new Map<string, PaletteConfig>();
  private definitions: Map<string, ColorDefinition>;
  private logCallback?: LogCallback;
  private colorRouter: ColorRouter;

  constructor(definitions: Map<string, ColorDefinition>, colorRouter: ColorRouter, logCallback?: LogCallback) {
    this.definitions = definitions;
    this.colorRouter = colorRouter;
    this.logCallback = logCallback;
  }

  public setLogCallback(callback: LogCallback): void {
    this.logCallback = callback;
  }

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

  public extendPalette(
    name: string,
    basePalette: string,
    overrides: Record<string, any> = {},
    description?: string,
  ): void {
    this.createPalette(name, { extends: basePalette, overrides, description });
  }

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

  public deletePalette(name: string): string[] {
    if (!this.palettes.has(name)) throw new PaletteError(`Palette "${name}" does not exist.`);

    const keysToDelete = this.getAllKeysForPalette(name);
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
