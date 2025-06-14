# Color Routing System Specification

## Overview

A reactive TypeScript color routing system that supports nested color definitions, dynamic color calculations, and multiple output formats. Built with modern CSS color functions and designed for design systems that need to maintain color relationships across different platforms.

The main class is `ColorRouter` which manages multiple palettes (namespaces) and their relationships, delegating palette state to `PaletteManager` and dependency tracking to `DependencyGraph`. Renderers like `ColorRenderer` are instantiated separately to process and output color data.

> **Note**: This specification has been updated to reflect the current implementation as of June 2025.

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
// Listen for changes (fired after successful definitions or flush)
router.addEventListener('change', (event) => {
  const customEvent = event as CustomEvent<ColorChangeEvent[]>;
  const changes = customEvent.detail;
  // changes = [{ key: 'brand.primary', oldValue: '#000', newValue: '#fff', status: 'success' }]
  // In batch mode, this contains all successful changes after a flush.
  // It can also contain { key: 'some.key', error: ErrorObject, status: 'error' } for failed updates in a batch.
});

// Note: A specific 'watch(key, callback)' or 'batch-complete' event is not directly implemented.
// The 'change' event serves for both individual updates (auto mode) and batch completion (batch mode).
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

The `ColorRenderer` achieves format-specific rendering by having internal logic and registered function renderers for each format. While a formal, separate `RendererCapabilities` interface (as previously envisioned) isn't explicitly exported or used as a standalone module, the *concept* is implemented within `ColorRenderer`'s `registerFunctionRenderer` and its private rendering methods. It dynamically chooses how to render a `ColorFunction` based on the target format and the available registered renderers for that function and format.

If a specific function (e.g., `colorMix`) has a registered renderer for the `css-variables` format (like `colorMixRenderers.css`), that renderer will be used. If not, or if the renderer decides to fallback, the function might be resolved to its computed value.

### Smart Function Translation

This is handled by the `ColorRenderer`'s internal logic for each format.

```typescript
// Original definition with color space
router.define('accent',
  router.func('colorMix', 'brand.primary', '#f00', 0.6, 'oklch')
)

// CSS Modern renderer output (via ColorRenderer with 'css-variables' format):
// --accent: color-mix(in oklch, var(--brand-primary) 40%, #f00);

// SCSS renderer output (via ColorRenderer with 'scss' format):
// $accent: mix($brand-primary, #f00, 60%);

// JSON/JavaScript renderer output (via ColorRenderer with 'json' format):
// "accent": "#cc3366" // pre-computed
```

### Custom Renderers

One could create new classes similar to `ColorRenderer` to support other output formats by consuming data from `ColorRouter`.

## API Reference

### Core Methods (`ColorRouter`)

```typescript
// Definition
router.define(key: string, value: ColorDefinition): void

// Modification
router.set(key: string, value: ColorDefinition): void // Alias for define

// Resolution
router.resolve(key: string): string // final computed color

// References and Functions
router.ref(key: string): ColorReference
router.func(name: string, ...args: any[]): ColorFunction // Generic function creation
router.registerFunction(name: string, fn: (...args: any[]) => string, options?: { isPaletteAware?: boolean }): void

// Built-in Functions (accessed via router.func())
// router.func('bestContrastWith', targetColorKey: string, paletteNameOrFallbackArray: string | string[], fallbackColor?: string)
// router.func('colorMix', color1Key: string, color2Key: string, ratio?: number, colorSpace?: string)
// router.func('relativeTo', baseColorKey: string, transform: string)
// router.func('minContrastWith', targetColorKey: string, minRatioOrPalette: number | string, fallbackColor?: string)
// router.func('lighten', colorKey: string, amount: number)
// router.func('darken', colorKey: string, amount: number)
// router.func('furthestFrom', paletteName: string)
// router.func('closestColor', targetColorKey: string, paletteNameOrColorArray: string | string[])


// Batch Operations (batch mode only)
router.flush(): { key: string; status: 'success' | 'error'; value?: string; error?: Error }[]

// Events
router.addEventListener(event: 'change', callback: (event: CustomEvent<ColorChangeEvent[]>) => void): void
router.removeEventListener(event: 'change', callback: (event: CustomEvent<ColorChangeEvent[]>) => void): void


// Palette Management (delegated to PaletteManager)
router.createPalette(name: string, options?: { extends?: string; overrides?: Record<string, any> }): void
router.extendPalette(name: string, basePalette: string, overrides?: Record<string, any>): void // shortcut for createPalette with extends
router.copyPalette(sourceName: string, targetName: string): void
router.deletePalette(name: string): void // Deletes palette and its associated color definitions
router.getAllPalettes(): Array<{ name: string; config: PaletteConfig }>
router.hasPalette(name: string): boolean

// Color Access & Information
router.getAllKeysForPalette(paletteName: string): string[] // Gets all keys fully qualified for a palette, considering inheritance
router.getDefinitionForKey(key: string): ColorDefinition | undefined
router.valueToString(value: ColorDefinition): string // Converts a definition to its string representation
router.has(key: string): boolean // Checks if a color key is defined
router.getDefinitionType(key: string): 'function' | 'reference' | 'value' | 'undefined'
router.getVisualDependencies(key: string): Set<string> // Gets visual dependencies for a key

// Dependency Analysis (Accessing the graph directly)
router.getDependencyGraph(): DependencyGraph // Returns the DependencyGraph instance

// Configuration
router.mode: 'auto' | 'batch' // getter
router.setMode(mode: 'auto' | 'batch'): void
router.batchQueueSize: number // getter (size of current batch queue)
router.setLogCallback(callback?: LogCallback): void

// Types (Key types are in './types.ts')
// ColorDefinition, ColorReference, ColorFunction, PaletteConfig, ColorChangeEvent, LogCallback
// RenderFormat = 'css-variables' | 'scss' | 'json' (used by ColorRenderer)
```

### `ColorRenderer` Methods

```typescript
// Constructor
// new ColorRenderer(router: ColorRouter, format?: RenderFormat)

// Rendering
renderer.render(): string // Generate output string in the renderer's current format

// Configuration
renderer.format: RenderFormat // getter/setter
renderer.registerFunctionRenderer(functionName: string, rendererFn: (args: any[]) => string): void // For the current format
```

### `DependencyGraph` Methods (subset, accessed via `router.getDependencyGraph()`)

```typescript
graph.getPrerequisitesFor(key: string): string[]
graph.getDependentsOf(key: string): string[]
graph.getConnectionGraph(): Record<string, string[]> // { node: [...dependents] }
graph.getEvaluationOrderFor(startKey: string): string[] // Gets all dependents and sorts them for evaluation
graph.topologicalSort(keysToSort: string[]): string[] // Sorts given keys based on dependencies
```


## Integration with Culori.js

```typescript
const router = new ColorRouter();
// ...rest of the code block...
```

## Use Cases

### 1. Design System with Palette Inheritance

(Example remains largely the same, ensure `router.func` calls are correct for `bestContrastWith`)
```typescript
const router = new ColorRouter();
// Define base design system palette
router.createPalette('design-system');
router.define('design-system.primary', '#0066cc');
router.define('design-system.secondary', '#ff6600');
router.define('design-system.neutral-100', '#ffffff');
router.define('design-system.neutral-900', '#1a1a1a');

// Create light theme palette
router.createPalette('light', {
  extends: 'design-system',
  overrides: {
    background: router.ref('design-system.neutral-100'),
    surface: '#f5f5f5',
    'on-background': router.ref('design-system.neutral-900'),
  },
});

// Create dark theme palette
router.createPalette('dark', {
  extends: 'light', // inherit light structure
  overrides: {
    background: router.ref('design-system.neutral-900'),
    surface: '#2d2d2d',
    'on-background': router.ref('design-system.neutral-100'),
  },
});

// All UI elements can reference either palette
router.define('ui.button-bg', router.ref('light.primary')); // or 'dark.primary'
```

### 2. Dynamic Palette Switching (Conceptual)

Direct "active palette" switching is not a feature. Instead, applications can choose to render or use keys from a specific palette. Changes to any palette's definitions will reactively update where those keys are used.

```typescript
// To change a theme, you might update definitions in the 'dark' palette
router.set('dark.primary', '#0088ff'); // all direct/indirect references to dark.primary update
// Or, an application could switch which set of keys it's consuming (e.g., from 'light.*' to 'dark.*')
```

### 3. Accessibility Compliance

Dynamic contrast calculations ensure readable combinations:

```typescript
router.createPalette('card-theme');
router.define('card-theme.background', '#e3f2fd');
// Ensure 'bestContrastWith' has appropriate fallbacks or a palette to search
router.define('card-theme.text', router.func('bestContrastWith', 'card-theme.background', ['#333333', '#FFFFFF']));
// Ensure 'minContrastWith' is used correctly; it needs a target color and a minimum ratio.
// If the second arg is a palette, it might search that palette.
router.define('card-theme.border', router.func('minContrastWith', 'card-theme.background', 1.5)); // 1.5 is the ratio
```

### 4. CSS Integration

Export to CSS custom properties with proper variable relationships using `ColorRenderer`.

```typescript
const router = new ColorRouter();
router.createPalette('brand');
router.define('brand.primary', '#0066cc');
router.define('brand.neutral-100', '#ffffff');

router.createPalette('button');
router.define('button.primary', router.ref('brand.primary'));
router.define('button.primary-hover', router.func('relativeTo', 'button.primary', 'r g b / 0.8'));
router.define('button.text-on-primary', router.func('bestContrastWith', 'button.primary', ['brand.neutral-100']));


const cssRenderer = new ColorRenderer(router, 'css-variables');
const output = cssRenderer.render();
/* Example Generated CSS (actual output depends on renderer's specific logic for references and functions)
:root {
  --brand-primary: #0066cc;
  --brand-neutral-100: #ffffff;
  --button-primary: var(--brand-primary);
  --button-primary-hover: color-mix(in srgb, var(--button-primary) 80%, transparent); /* Example, actual relativeTo rendering might differ */
  --button-text-on-primary: var(--brand-neutral-100);
}
*/
```

### 5. Modern CSS Support with Palette Structure

Use new CSS color functions with palette references instead of literals.

```typescript
router.createPalette('brand');
router.define('brand.primary', '#0066cc');
router.define('brand.accent-subtle', router.func('colorMix', 'brand.primary', 'transparent', 0.2, 'lab')); // 20% mix with transparent
router.define('brand.accent-highlight', router.func('relativeTo', 'brand.primary', 'calc(l + 0.2) c h'));

// Create variations palette
router.createPalette('brand-variations', {
  extends: 'brand',
  overrides: {
    hover: router.func('relativeTo', 'brand.primary', 'r g b / 0.8'), // 80% opacity
    pressed: router.func('relativeTo', 'brand.primary', 'calc(l - 0.1) c h'), // 10% darker
  },
});
```

### 6. Multi-Platform Export

Same palette structure, different output formats for various platforms using `ColorRenderer` with different formats.

```typescript
const router = new ColorRouter();
// ... define palettes and colors ...

const cssRenderer = new ColorRenderer(router, 'css-variables');
const cssOutput = cssRenderer.render();

const jsonRenderer = new ColorRenderer(router, 'json');
const jsonOutput = jsonRenderer.render(); // All values fully resolved

const scssRenderer = new ColorRenderer(router, 'scss');
const scssOutput = scssRenderer.render();
```

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
