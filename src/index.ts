// Library entry point for NPM package
export { ColorRouter } from './ColorRouter'; // ColorReference, ColorFunction, PaletteError, CircularDependencyError moved
export { ColorReference, ColorFunction } from './types'; // Export from types.ts
export { PaletteError, CircularDependencyError } from './errors'; // Export from errors.ts
export { ColorRenderer } from './ColorRenderer';
export { SVGRenderer } from './SVGRenderer';
export { tableView, createTableItemFromPalette } from './TableViewRenderer';
export type {
  ColorValue,
  PaletteName,
  ColorKey,
  ColorDefinition,
  PaletteConfig,
  ColorChangeEvent,
  ColorRendererClass, // Import from types.ts
} from './types'; // Changed from ./ColorRouter to ./types
export type { RenderFormat, FunctionRenderer } from './ColorRenderer';
export type { TableItem, TableBoundingRect, TableViewResult, TableViewOptions } from './TableViewRenderer';
export type { SVGRenderOptions, ConnectionPoint, Connection } from './SVGRenderer';
