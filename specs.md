# Color Routing System Specification

## Overview

A reactive TypeScript color routing system that supports nested color definitions, dynamic color calculations, and multiple output formats. Built with modern CSS color functions and designed for design systems that need to maintain color relationships across different platforms.

The main class is `ColorRouter` which manages multiple palettes (namespaces) and their relationships, delegating palette state to `PaletteManager` and dependency tracking to `DependencyGraph`. Renderers like `ColorRenderer` are instantiated separately to process and output color data.

## Core Features

### Nested Color Palettes

Define colors in organized palettes (namespaces) with support for references and dynamic calculations. Palettes are managed by `PaletteManager` via `ColorRouter`.

```typescript
const router = new ColorRouter();

// First create palettes
router.createPalette('brand');
router.createPalette('layout');

// Then define colors within them
router.define('brand.primary', '#ff0000');
router.define('brand.secondary', '#ffffff');
router.define('layout.background', router.ref('brand.primary'));
```

### Color References

Colors can reference other colors in the palette, creating dependency chains that automatically update when source colors change. Dependencies are tracked by `DependencyGraph`.

```typescript
router.define('interaction.link', router.ref('brand.primary'));
router.define('scale.0', '#000');
router.define('scale.100', 'hsl(0 100% 10%)');
router.define('layout.background', router.ref('scale.0'));
```

### Palette Creation and Management

Palettes must be explicitly created before colors can be defined within them. This is handled by `PaletteManager`.

```typescript
// Create palettes first
router.createPalette('base');
router.createPalette('brand');

// Now you can define colors
router.define('base.background', '#ffffff');
router.define('brand.primary', '#0066cc');

// This would throw an error - palette doesn't exist:
// router.define('theme.primary', '#ff0000') // PaletteError

// You can only set colors in existing palettes
router.set('brand.primary', '#0088ff'); // ✓ Valid
// router.set('nonexistent.color', '#fff') // ✗ PaletteError
```

### Palette Extension

Create new palettes that inherit from existing ones with selective overrides. Managed by `PaletteManager`.

```typescript
// Base palette
router.createPalette('base');
router.define('base.background', '#ffffff');
router.define('base.surface', '#f5f5f5');
router.define('base.primary', '#0066cc');
router.define('base.on-primary', router.func('bestContrastWith', 'base.primary', ['#FFFFFF', '#000000'])); // Provide explicit fallbacks

// Dark palette - extends base palette with overrides
router.createPalette('dark', {
  extends: 'base',
  overrides: {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    // primary and on-primary are inherited, on-primary recalculates automatically
  },
});

// Result:
// dark.background => '#1a1a1a' (overridden)
// dark.surface => '#2d2d2d' (overridden)
// dark.primary => '#0066cc' (inherited from base)
// dark.on-primary => recalculated contrast against dark.primary using its original fallback array

// Chain extensions for more specific themes
router.createPalette('dark-brand', {
  extends: 'dark',
  overrides: {
    primary: '#ff6600',
    // background and surface inherited from dark, on-primary recalculates
  },
});
```

### Dynamic Color Functions

Support for accessibility-focused contrast calculations and modern CSS color manipulation functions.

```typescript
// Contrast-based selection
// The 'scale' argument implies searching the 'scale' palette.
router.define('layout.onBackground', router.func('bestContrastWith', 'layout.background', 'scale'));
// If 'scale' is not a palette, it might be treated as a list of fallback colors if the function supports it.
// For minContrastWith, the third argument is typically a minimum ratio.
router.define('layout.border', router.func('minContrastWith', 'layout.background', 4.5)); // Assuming 4.5 is the contrast ratio

// CSS color functions
router.define('accent', router.func('colorMix', 'brand.primary', '#f00', 0.6, 'lab'));
router.define(
  'hover-state',
  router.func('relativeTo', 'brand.primary', 'r g b / 0.8'), // CSS relative color syntax
);

// Color analysis functions
router.define(
  'isolatedColor',
  router.func('furthestFrom', 'brand'), // Find the most isolated color in the brand palette
);
```

### Reactive Updates

When source colors change, all dependent colors automatically recalculate based on the dependency graph managed by `DependencyGraph`.

```typescript
router.set('brand.primary', '#0066cc'); // triggers all dependents to update
router.set('scale.0', '#111'); // updates layout.background and its dependents (e.g., layout.onBackground)
```

## Reactivity System

### Update Modes

The system supports two update modes to balance performance and control:

```typescript
// Auto Mode - immediate updates (default)
const router = new ColorRouter({ mode: 'auto' });
router.set('brand.primary', '#ff0000'); // triggers immediate recalculation

// Batch Mode - manual updates
const routerBatch = new ColorRouter({ mode: 'batch' });
routerBatch.set('brand.primary', '#ff0000'); // queued
routerBatch.set('brand.secondary', '#00ff00'); // queued
routerBatch.flush(); // now everything recalculates in optimal order
```

### Event System

`ColorRouter` uses an `EventTarget` to dispatch change events.

```typescript
// Listen for general changes (fired after successful definitions in 'auto' mode or for each successful change in 'batch' mode's flush)
router.addEventListener('change', (event) => {
  const customEvent = event as CustomEvent<ColorChangeEvent[]>;
  const changes = customEvent.detail;
  // changes = [{ key: 'brand.primary', oldValue: '#000', newValue: '#fff' }, ...]
});

// Listen for batch processing completion (fired after flush() in 'batch' mode)
router.addEventListener('batch-complete', (event) => {
  const customEvent = event as CustomEvent<{
    changes: ColorChangeEvent[]; // Successful changes
    errors: { key: string; error: Error }[]; // Errors encountered for specific keys
    processedKeys: string[]; // All keys that were attempted in the batch
    summary: string; // A summary message of the batch operation
  }>;
  console.log('Batch complete:', customEvent.detail.summary, customEvent.detail.changes, customEvent.detail.errors);
});

// Listen for batch processing failure (e.g., if sorting fails due to circular dependency)
router.addEventListener('batch-failed', (event) => {
  const customEvent = event as CustomEvent<{
    error: Error;
    stage: 'sorting'; // Indicates failure occurred during the sorting stage
    processedKeys: string[]; // Keys that were intended for processing
    errors: { keys: string[]; error: Error }[]; // The error that occurred
    summary: string;
  }>;
  console.error('Batch failed:', customEvent.detail.summary, customEvent.detail.error);
});

// Watch specific keys
router.watch('brand.primary', (newValue, oldValue) => {
  console.log(`brand.primary changed from ${oldValue} to ${newValue}`);
});
```

### Circular Dependency Detection

The system prevents circular references and throws errors when they're detected. This is handled by `DependencyGraph`.

```typescript
router.define('a', router.ref('b'));
// router.define('b', router.ref('a')); // throws CircularDependencyError during define or flush

// Also detects during runtime changes
router.define('a', router.ref('c'));
router.define('b', router.ref('a'));
// router.set('c', router.ref('b')); // throws CircularDependencyError during set (auto mode) or flush (batch mode)
```

## Output Formats & Renderers

Renderers like `ColorRenderer` are instantiated independently and use the `ColorRouter` instance to fetch resolved color data.

### Palette Operations (Data Retrieval)

Work with entire palettes (groups of related colors) by retrieving their keys and resolving them.

```typescript
// Define base palette (assuming router is already instantiated)
router.createPalette('base');
router.define('base.background', '#ffffff');
router.define('base.surface', '#f5f5f5');
router.define('base.primary', '#0066cc');
router.define('base.on-primary', router.func('bestContrastWith', 'base.primary', ['#FFFFFF', '#000000']));

// Get all keys for the base palette (including inherited and overridden)
const baseKeys = router.getAllKeysForPalette('base');
// e.g., ['base.background', 'base.surface', 'base.primary', 'base.on-primary']

// Resolve all colors in the base palette
const resolvedBasePalette: Record<string, string> = {};
for (const key of baseKeys) {
  resolvedBasePalette[key.substring('base.'.length)] = router.resolve(key);
}
// Output of resolvedBasePalette:
// {
//   'background': '#ffffff',
//   'surface': '#f5f5f5',
//   'primary': '#0066cc',
//   'on-primary': '#ffffff' // or '#000000' depending on contrast calculation
// }

// Render entire set of definitions using a renderer
const renderer = new ColorRenderer(router, 'css-variables');
const cssOutput = renderer.render(); // renders all defined colors from all palettes
// Output (example):
// --base-background: #ffffff;
// --base-surface: #f5f5f5;
// --base-primary: #0066cc;
// --base-on-primary: var(--base-primary); /* Or resolved value, depending on renderer logic */

// Get all palette configurations
router.getAllPalettes(); // => [{ name: 'base', config: { extends?: string, overrides?: ... } }]

// Palette management (delegated to PaletteManager)
router.copyPalette('base', 'light'); // duplicate base as light
router.deletePalette('unused'); // remove palette and its definitions
```

### Basic Resolution

Get final computed color values:

```typescript
router.resolve('layout.background'); // => '#ff0000' (assuming brand.primary was #ff0000)
```

### Dependency Analysis

Export connection information for advanced use cases using `DependencyGraph` methods (accessed via `router.getDependencyGraph()`).

```typescript
const depGraph = router.getDependencyGraph();
depGraph.getPrerequisitesFor('layout.onBackground'); // => ['layout.background', 'scale'] (or specific colors from scale)
depGraph.getConnectionGraph(); // => full dependency tree { node: [...dependents] }
```

### Multiple Renderer Support

The system supports different output formats. `ColorRenderer` is the primary example.

```typescript
// CSS Variables Renderer - preserves references where possible
const cssRenderer = new ColorRenderer(router, 'css-variables');
const cssResult = cssRenderer.render();
// Example Output:
// --layout-background: var(--brand-primary);
// --brand-primary: #ff0000;
// --layout-on-background: #ffffff; /* Example resolved value */

// JSON Renderer - all final colors resolved to hex values
const jsonRenderer = new ColorRenderer(router, 'json');
const jsonResult = jsonRenderer.render();
// Example Output:
// {
//   "layout.background": "#ff0000",
//   "brand.primary": "#ff0000",
//   "layout.on-background": "#ffffff"
// }

// SCSS Variables Renderer
const scssRenderer = new ColorRenderer(router, 'scss');
const scssResult = scssRenderer.render();
// Example Output:
// $layout-background: $brand-primary;
// $brand-primary: #ff0000;
// $layout-on-background: #ffffff; /* Example resolved value */
```

### Technology-Aware Rendering

Renderers provide format-specific function implementations where possible. `ColorRenderer` handles this by having different render logic for functions based on the target format.

```typescript
// Example: router.define('accent', router.func('colorMix', 'brand.primary', '#f00', 0.6, 'lab'));

// CSS Variables Renderer output:
// --accent: color-mix(in lab, var(--brand-primary) 60%, #f00 40%);

// SCSS Renderer output:
// $accent: mix($brand-primary, #f00, 60%); // Sass mix doesn't support color space

// JSON Renderer output:
// "accent": "#computedValue" // pre-computed using Culori with specified color space
```

### Renderer Capabilities System (Conceptual)

The `ColorRenderer` achieves format-specific rendering by having internal logic and registered function renderers for each format. While a formal, separate `RendererCapabilities` interface (as previously envisioned) isn't explicitly exported or used as a standalone module, the _concept_ is implemented within `ColorRenderer`'s `registerFunctionRenderer` and its private rendering methods. It dynamically chooses how to render a `ColorFunction` based on the target format and the available registered renderers for that function and format.

If a specific function (e.g., `colorMix`) has a registered renderer for the `css-variables` format (like `colorMixRenderers.css`), that renderer will be used. If not, or if the renderer decides to fallback, the function might be resolved to its computed value.

### Smart Function Translation

This is handled by the `ColorRenderer`'s internal logic for each format.

```typescript
// Original definition with color space
router.define('accent',
  router.func('colorMix', 'brand.primary', '#f00', 0.6, 'oklch')
)
// Modification
router.set(key: string, value: ColorDefinition): void // Alias for define

// CSS Modern renderer output (via ColorRenderer with 'css-variables' format):
// --accent: color-mix(in oklch, var(--brand-primary) 40%, #f00);router.resolve(key: string): string // final computed color

// SCSS renderer output (via ColorRenderer with 'scss' format):
// $accent: mix($brand-primary, #f00, 60%);router.ref(key: string): ColorReference
..args: any[]): ColorFunction // Generic function creation
// JSON/JavaScript renderer output (via ColorRenderer with 'json' format):n: (...args: any[]) => string, options?: { isPaletteAware?: boolean }): void
// "accent": "#cc3366" // pre-computed
```

// router.func('bestContrastWith', targetColorKey: string, paletteNameOrFallbackArray: string | string[], fallbackColor?: string)

### Custom Renderersr2Key: string, ratio?: number, colorSpace?: string)

One could create new classes similar to `ColorRenderer` to support other output formats by consuming data from `ColorRouter`.kColor?: string)

## API Reference

### Core Methods (`ColorRouter`)etteNameOrColorArray: string | string[])

```typescript
// Definition// Batch Operations (batch mode only)
router.define(key: string, value: ColorDefinition): voidrouter.flush(): { key: string; status: 'success' | 'error'; value?: string; error?: Error }[]

// Modification
router.set(key: string, value: ColorDefinition): void // Alias for definerouter.addEventListener(event: 'change', callback: (event: CustomEvent<ColorChangeEvent[]>) => void): void
moveEventListener(event: 'change', callback: (event: CustomEvent<ColorChangeEvent[]>) => void): void
// Resolution
router.resolve(key: string): string // final computed color
// Palette Management (delegated to PaletteManager)
// References and Functionsrouter.createPalette(name: string, options?: { extends?: string; overrides?: Record<string, any> }): void
router.ref(key: string): ColorReferenceing, overrides?: Record<string, any>): void // shortcut for createPalette with extends
router.func(name: string, ...args: any[]): ColorFunction // Generic function creation
router.registerFunction(name: string, fn: (...args: any[]) => string, options?: { isPaletteAware?: boolean }): void
nfig }>
// Built-in Functions (accessed via router.func())
// router.func('bestContrastWith', targetColorKey: string, paletteNameOrFallbackArray: string | string[], fallbackColor?: string)
// router.func('colorMix', color1Key: string, color2Key: string, ratio?: number, colorSpace?: string)
// router.func('relativeTo', baseColorKey: string, transform: string)router.getAllKeysForPalette(paletteName: string): string[] // Gets all keys fully qualified for a palette, considering inheritance
// router.func('minContrastWith', targetColorKey: string, minRatioOrPalette: number | string, fallbackColor?: string)y: string): ColorDefinition | undefined
// router.func('lighten', colorKey: string, amount: number)
// router.func('darken', colorKey: string, amount: number)
// router.func('furthestFrom', paletteName: string)
// router.func('closestColor', targetColorKey: string, paletteNameOrColorArray: string | string[])l dependencies for a key
// Examples of using router.func():
// router.func('bestContrastWith', 'some.color', 'paletteName')
// router.func('bestContrastWith', 'some.color', ['#fff', '#000'])router.getDependencyGraph(): DependencyGraph // Returns the DependencyGraph instance
// router.func('minContrastWith', 'some.color', 4.5) // 4.5 is the ratio
// router.func('minContrastWith', 'some.color', 'paletteName')
router.mode: 'auto' | 'batch' // getter
ode: 'auto' | 'batch'): void
// Batch Operations (batch mode only) (size of current batch queue)
router.flush(): void // Emits 'batch-complete' or 'batch-failed' event): void

// Events
router.addEventListener(event: 'change', callback: (event: CustomEvent<ColorChangeEvent[]>) => void): void// ColorDefinition, ColorReference, ColorFunction, PaletteConfig, ColorChangeEvent, LogCallback
router.addEventListener(event: 'batch-complete', callback: (event: CustomEvent<{ changes: ColorChangeEvent[], errors: {key: string, error: Error}[], processedKeys: string[], summary: string }>) => void): voids' | 'json' (used by ColorRenderer)
router.addEventListener(event: 'batch-failed', callback: (event: CustomEvent<{ error: Error, stage: string, processedKeys: string[], errors: {keys: string[], error: Error}[], summary: string }>) => void): void
router.removeEventListener(event: string, callback: EventListener): void // Generic remove
router.watch(key: string, callback: (newValue: string, oldValue: string | undefined) => void): void `ColorRenderer` Methods


// Palette Management (delegated to PaletteManager)// Constructor
router.createPalette(name: string, options?: { extends?: string; overrides?: Record<string, any> }): voidenderer(router: ColorRouter, format?: RenderFormat)
router.extendPalette(name: string, basePalette: string, overrides?: Record<string, any>): void // shortcut for createPalette with extends
router.copyPalette(sourceName: string, targetName: string): void
router.deletePalette(name: string): void // Deletes palette and its associated color definitionsrenderer.render(): string // Generate output string in the renderer's current format
router.getAllPalettes(): Array<{ name: string; config: PaletteConfig }>
router.hasPalette(name: string): boolean
renderer.format: RenderFormat // getter/setter
// Color Access & InformationrFunctionRenderer(functionName: string, rendererFn: (args: any[]) => string): void // For the current format
router.getAllKeysForPalette(paletteName: string): string[] // Gets all keys fully qualified for a palette, considering inheritance
router.getDefinitionForKey(key: string): ColorDefinition | undefined
router.valueToString(value: ColorDefinition): string // Converts a definition to its string representation `DependencyGraph` Methods (subset, accessed via `router.getDependencyGraph()`)
router.has(key: string): boolean // Checks if a color key is defined
router.getDefinitionType(key: string): 'function' | 'reference' | 'value' | 'undefined'
router.getVisualDependencies(key: string): Set<string> // Gets visual dependencies for a keygraph.getPrerequisitesFor(key: string): string[]
ndentsOf(key: string): string[]
// Dependency Analysis (Accessing the graph directly)g[]> // { node: [...dependents] }
router.getDependencyGraph(): DependencyGraph // Returns the DependencyGraph instance): string[] // Gets all dependents and sorts them for evaluation
n dependencies
// Configuration
router.mode: 'auto' | 'batch' // getter
router.setMode(mode: 'auto' | 'batch'): void
router.batchQueueSize: number // getter (size of current batch queue)## Integration with Culori.js
router.setLogCallback(callback?: LogCallback): void

// Types (Key types are in './types.ts')const router = new ColorRouter();
// ColorDefinition, ColorReference, ColorFunction, PaletteConfig, ColorChangeEvent, LogCallback the code block...
// RenderFormat = 'css-variables' | 'scss' | 'json' (used by ColorRenderer)
```

Use Cases

### `ColorRenderer` Methods

n System with Palette Inheritance

````typescript
// Constructoruter.func` calls are correct for `bestContrastWith`)
// new ColorRenderer(router: ColorRouter, format?: RenderFormat)```typescript

// Renderinge design system palette
renderer.render(): string // Generate output string in the renderer's current formatem');
', '#0066cc');
// Configuration', '#ff6600');
renderer.format: RenderFormat // getter/setterf');
renderer.registerFunctionRenderer(functionName: string, rendererFn: (args: any[]) => string): void // For the current format);
````

### `DependencyGraph` Methods (subset, accessed via `router.getDependencyGraph()`)router.createPalette('light', {

```typescript
graph.getPrerequisitesFor(key: string): string[]'design-system.neutral-100'),
graph.getDependentsOf(key: string): string[]#f5f5f5',
graph.getConnectionGraph(): Record<string, string[]> // { node: [...dependents] }00'),
graph.getEvaluationOrderFor(startKey: string): string[] // Gets all dependents and sorts them for evaluation
graph.topologicalSort(keysToSort: string[]): string[] // Sorts given keys based on dependencies
```

Create dark theme palette
router.createPalette('dark', {

## Integration with Culori.jsit light structure

```typescriptral-900'),
const router = new ColorRouter();#2d2d2d',
// ...rest of the code block...00'),
```

## Use Cases

All UI elements can reference either palette

### 1. Design System with Palette Inheritancerouter.define('ui.button-bg', router.ref('light.primary')); // or 'dark.primary'

(Example remains largely the same, ensure `router.func` calls are correct for `bestContrastWith`)

````typescript 2. Dynamic Palette Switching (Conceptual)
const router = new ColorRouter();
// Define base design system paletteature. Instead, applications can choose to render or use keys from a specific palette. Changes to any palette's definitions will reactively update where those keys are used.
router.createPalette('design-system');
router.define('design-system.primary', '#0066cc');
router.define('design-system.secondary', '#ff6600');// To change a theme, you might update definitions in the 'dark' palette
router.define('design-system.neutral-100', '#ffffff');ark.primary', '#0088ff'); // all direct/indirect references to dark.primary update
router.define('design-system.neutral-900', '#1a1a1a');., from 'light.*' to 'dark.*')

// Create light theme palette
router.createPalette('light', { 3. Accessibility Compliance
  extends: 'design-system',
  overrides: {nsure readable combinations:
    background: router.ref('design-system.neutral-100'),
    surface: '#f5f5f5',
    'on-background': router.ref('design-system.neutral-900'),router.createPalette('card-theme');
  },('card-theme.background', '#e3f2fd');
});propriate fallbacks or a palette to search
ContrastWith', 'card-theme.background', ['#333333', '#FFFFFF']));
// Create dark theme paletteminimum ratio.
router.createPalette('dark', {
  extends: 'light', // inherit light structure1.5)); // 1.5 is the ratio
  overrides: {
    background: router.ref('design-system.neutral-900'),
    surface: '#2d2d2d', 4. CSS Integration
    'on-background': router.ref('design-system.neutral-100'),
  },roperties with proper variable relationships using `ColorRenderer`.
});

// All UI elements can reference either paletteconst router = new ColorRouter();
router.define('ui.button-bg', router.ref('light.primary')); // or 'dark.primary'Palette('brand');
```0066cc');
00', '#ffffff');
### 2. Dynamic Palette Switching (Conceptual)

Direct "active palette" switching is not a feature. Instead, applications can choose to render or use keys from a specific palette. Changes to any palette's definitions will reactively update where those keys are used.router.define('button.primary', router.ref('brand.primary'));
over', router.func('relativeTo', 'button.primary', 'r g b / 0.8'));
```typescriptrastWith', 'button.primary', ['brand.neutral-100']));
// To change a theme, you might update definitions in the 'dark' palette
router.set('dark.primary', '#0088ff'); // all direct/indirect references to dark.primary update
// Or, an application could switch which set of keys it's consuming (e.g., from 'light.*' to 'dark.*')const cssRenderer = new ColorRenderer(router, 'css-variables');
```const output = cssRenderer.render();
pecific logic for references and functions)
### 3. Accessibility Compliance

Dynamic contrast calculations ensure readable combinations:nd-neutral-100: #ffffff;
rand-primary);
```typescript-mix(in srgb, var(--button-primary) 80%, transparent); /* Example, actual relativeTo rendering might differ */
router.createPalette('card-theme');eutral-100);
router.define('card-theme.background', '#e3f2fd');
// Ensure 'bestContrastWith' has appropriate fallbacks or a palette to search
router.define('card-theme.text', router.func('bestContrastWith', 'card-theme.background', ['#333333', '#FFFFFF']));``
// Ensure 'minContrastWith' is used correctly; it needs a target color and a minimum ratio.
// If the second arg is a palette, it might search that palette. 5. Modern CSS Support with Palette Structure
router.define('card-theme.border', router.func('minContrastWith', 'card-theme.background', 1.5)); // 1.5 is the ratio
```ces instead of literals.

### 4. CSS Integration
router.createPalette('brand');
Export to CSS custom properties with proper variable relationships using `ColorRenderer`.('brand.primary', '#0066cc');
btle', router.func('colorMix', 'brand.primary', 'transparent', 0.2, 'lab')); // 20% mix with transparent
```typescriptuter.func('relativeTo', 'brand.primary', 'calc(l + 0.2) c h'));
const router = new ColorRouter();
router.createPalette('brand');
router.define('brand.primary', '#0066cc');router.createPalette('brand-variations', {
router.define('brand.neutral-100', '#ffffff');

router.createPalette('button');unc('relativeTo', 'brand.primary', 'r g b / 0.8'), // 80% opacity
router.define('button.primary', router.ref('brand.primary'));outer.func('relativeTo', 'brand.primary', 'calc(l - 0.1) c h'), // 10% darker
router.define('button.primary-hover', router.func('relativeTo', 'button.primary', 'r g b / 0.8'));
router.define('button.text-on-primary', router.func('bestContrastWith', 'button.primary', ['brand.neutral-100']));


const cssRenderer = new ColorRenderer(router, 'css-variables'); 6. Multi-Platform Export
const output = cssRenderer.render();
/* Example Generated CSS (actual output depends on renderer's specific logic for references and functions)erent output formats for various platforms using `ColorRenderer` with different formats.
:root {
  --brand-primary: #0066cc;
  --brand-neutral-100: #ffffff;const router = new ColorRouter();
  --button-primary: var(--brand-primary); palettes and colors ...
  --button-primary-hover: color-mix(in srgb, var(--button-primary) 80%, transparent); /* Example, actual relativeTo rendering might differ */
  --button-text-on-primary: var(--brand-neutral-100);(router, 'css-variables');
}const cssOutput = cssRenderer.render();
*/
```router, 'json');
const jsonOutput = jsonRenderer.render(); // All values fully resolved
### 5. Modern CSS Support with Palette Structure

Use new CSS color functions with palette references instead of literals.const scssOutput = scssRenderer.render();

```typescript
router.createPalette('brand');*CSS**: Custom properties with optimal variable usage
router.define('brand.primary', '#0066cc');- **SCSS**: Sass variables with dependency mapping
router.define('brand.accent-subtle', router.func('colorMix', 'brand.primary', 'transparent', 0.2, 'lab')); // 20% mix with transparentsolved values)
router.define('brand.accent-highlight', router.func('relativeTo', 'brand.primary', 'calc(l + 0.2) c h'));eming

// Create variations palette
router.createPalette('brand-variations', {
  extends: 'brand',
  overrides: {TypeScript support with proper type inference.
    hover: router.func('relativeTo', 'brand.primary', 'r g b / 0.8'), // 80% opacity- **Performance**: Efficient dependency tracking with `DependencyGraph` for minimal recalculation.
    pressed: router.func('relativeTo', 'brand.primary', 'calc(l - 0.1) c h'), // 10% darkerth via renderers.
  },
});
```Culori.js.
on.
### 6. Multi-Platform Exportderers).

Same palette structure, different output formats for various platforms using `ColorRenderer` with different formats.

```typescript: Topological sorting by `DependencyGraph` for optimal update order.
const router = new ColorRouter();- **Memory Management**: Standard TypeScript/JavaScript garbage collection. Event listeners should be managed by the application if `ColorRouter` instances are frequently created/destroyed.
// ... define palettes and colors ...ring would be an application concern.

const cssRenderer = new ColorRenderer(router, 'css-variables');
const cssOutput = cssRenderer.render();const jsonRenderer = new ColorRenderer(router, 'json');
const jsonOutput = jsonRenderer.render(); // All values fully resolved

const scssRenderer = new ColorRenderer(router, 'scss');
const scssOutput = scssRenderer.render();
````

- **CSS**: Custom properties with optimal variable usage
- **SCSS**: Sass variables with dependency mapping
- **JSON**: For design tools and documentation (fully resolved values)
- **JavaScript**: (via JSON output) For runtime theming
- **Swift/Kotlin**: (via JSON output) For mobile app integration

## Architecture Benefits

- **Type Safety**: Full TypeScript support with proper type inference.
- **Performance**: Efficient dependency tracking with `DependencyGraph` for minimal recalculation.
- **Flexibility**: Multiple output formats from a single source of truth via renderers.
- **Maintainability**: Clear dependency relationships and automatic updates.
- **Accessibility**: Built-in functions for contrast calculations.
- **Modern CSS**: Support for latest color functions and specifications via Culori.js.
- **Error Prevention**: Circular dependency detection and validation.
- **Modularity**: Separation of concerns (Router, PaletteManager, DependencyGraph, Renderers).

## Technical Considerations

- **Dependency Resolution**: Topological sorting by `DependencyGraph` for optimal update order.
- **Memory Management**: Standard TypeScript/JavaScript garbage collection. Event listeners should be managed by the application if `ColorRouter` instances are frequently created/destroyed.
- **Performance Monitoring**: `LogCallback` can be used for basic logging; more advanced monitoring would be an application concern.
- **Serialization**: JSON output from `ColorRenderer` can serve for persistence. Direct `ColorRouter` state serialization/deserialization is not a built-in feature.
- **Validation**: Runtime validation of color values (by Culori) and function parameters (by function implementations).
