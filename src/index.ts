// Library entry point for NPM package
export { ColorRouter, ColorReference, ColorFunction, PaletteError, CircularDependencyError } from './ColorRouter';
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
  ColorRendererClass
} from './ColorRouter';
export type {
  RenderFormat,
  FunctionRenderer
} from './ColorRenderer';
export type {
  TableItem,
  TableBoundingRect,
  TableViewResult,
  TableViewOptions,
} from './TableViewRenderer';
export type {
  SVGRenderOptions,
  ConnectionPoint,
  Connection,
} from './SVGRenderer';
