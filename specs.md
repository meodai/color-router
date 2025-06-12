# Color Routing System Specification

## Overview

A reactive TypeScript color routing system that supports nested color definitions, dynamic color calculations, and multiple output formats. Built with modern CSS color functions and designed for design systems that need to maintain color relationships across different platforms.

The main class is `ColorRouter` which manages multiple palettes (namespaces) and their relationships.

> **Note**: This specification has been updated to reflect the current implementation as of June 2025. Some features mentioned in earlier versions (like `setActivePalette()`, `renderPalette()`, and advanced renderer capabilities) are noted as not yet implemented.

## Core Features

### Nested Color Palettes

Define colors in organized palettes (namespaces) with support for references and dynamic calculations.

```typescript
// First create palettes
router.createPalette('brand')
router.createPalette('layout')

// Then define colors within them
router.define('brand.primary', '#ff0000')
router.define('brand.secondary', '#ffffff')
router.define('layout.background', router.ref('brand.primary'))
```

### Color References

Colors can reference other colors in the palette, creating dependency chains that automatically update when source colors change.

```typescript
router.define('interaction.link', router.ref('brand.primary'))
router.define('scale.0', '#000')
router.define('scale.100', 'hsl(0 100% 10%)')
router.define('layout.background', router.ref('scale.0'))
```

### Palette Creation and Management

Palettes must be explicitly created before colors can be defined within them:

```typescript
// Create palettes first
router.createPalette('base')
router.createPalette('brand') 

// Now you can define colors
router.define('base.background', '#ffffff')
router.define('brand.primary', '#0066cc')

// This would throw an error - palette doesn't exist:
// router.define('theme.primary', '#ff0000') // PaletteNotFoundError

// You can only set colors in existing palettes
router.set('brand.primary', '#0088ff') // ✓ Valid
// router.set('nonexistent.color', '#fff') // ✗ PaletteNotFoundError
```

### Palette Extension

Create new palettes that inherit from existing ones with selective overrides:

```typescript
// Base palette
router.createPalette('base')
router.define('base.background', '#ffffff')
router.define('base.surface', '#f5f5f5')
router.define('base.primary', '#0066cc')
router.define('base.on-primary', router.func('bestContrastWith', 'base.primary', 'white'))

// Dark palette - extends base palette with overrides
router.createPalette('dark', {
  extends: 'base',
  overrides: {
    'background': '#1a1a1a',
    'surface': '#2d2d2d'
    // primary and on-primary are inherited, on-primary recalculates automatically
  }
})

// Result:
// dark.background => '#1a1a1a' (overridden)
// dark.surface => '#2d2d2d' (overridden)  
// dark.primary => '#0066cc' (inherited from base)
// dark.on-primary => recalculated contrast against dark.primary

// Chain extensions for more specific themes
router.createPalette('dark-brand', {
  extends: 'dark',
  overrides: {
    'primary': '#ff6600'
    // background and surface inherited from dark, on-primary recalculates
  }
})
```

### Dynamic Color Functions

Support for accessibility-focused contrast calculations and modern CSS color manipulation functions.

```typescript
// Contrast-based selection
router.define('layout.onBackground', 
  router.func('bestContrastWith', 'layout.background', 'scale')
)
router.define('layout.border', 
  router.func('minContrastWith', 'layout.background', 0.2)
)

// CSS color functions
router.define('accent', 
  router.func('colorMix', 'brand.primary', '#f00', '60%', 'lab')
)
router.define('hover-state', 
  router.func('relativeTo', 'brand.primary', 'r g b / 0.8') // CSS relative color syntax
)
```

### Reactive Updates

When source colors change, all dependent colors automatically recalculate based on the dependency graph.

```typescript
router.set('brand.primary', '#0066cc') // triggers all dependents to update
router.set('scale.0', '#111') // updates layout.background and layout.onBackground
```

## Reactivity System

### Update Modes

The system supports two update modes to balance performance and control:

```typescript
// Auto Mode - immediate updates (default)
const router = new ColorRouter({ mode: 'auto' })
router.set('brand.primary', '#ff0000') // triggers immediate recalculation

// Batch Mode - manual updates
const router = new ColorRouter({ mode: 'batch' })
router.set('brand.primary', '#ff0000')   // queued
router.set('brand.secondary', '#00ff00') // queued
router.flush() // now everything recalculates in optimal order
```

### Event System

Comprehensive event system for tracking changes at different levels:

```typescript
// Global palette changes
router.on('change', (changes) => {
  // changes = [{ key: 'brand.primary', oldValue: '#000', newValue: '#fff' }]
})

// Specific color watching
router.watch('layout.background', (newValue, oldValue) => {
  console.log(`Background changed from ${oldValue} to ${newValue}`)
})

// Batch completion events
router.on('batch-complete', (allChanges) => {
  // Fired after flush() completes
})
```

### Circular Dependency Detection

The system prevents circular references and throws errors when they're detected:

```typescript
router.define('a', router.ref('b'))
router.define('b', router.ref('a')) // throws CircularDependencyError

// Also detects during runtime changes
router.define('a', router.ref('c'))
router.define('b', router.ref('a'))
router.set('c', router.ref('b')) // throws CircularDependencyError
```

## Output Formats & Renderers

### Palette Operations

Work with entire palettes (groups of related colors):

```typescript
// Define base palette
router.define('base.background', '#ffffff')
router.define('base.surface', '#f5f5f5')
router.define('base.primary', '#0066cc')
router.define('base.on-primary', router.func('bestContrastWith', 'base.primary', 'white'))

// Get all base palette colors resolved
router.resolvePalette('base')
// Output:
// {
//   'background': '#ffffff',
//   'surface': '#f5f5f5', 
//   'primary': '#0066cc',
//   'on-primary': '#ffffff'
// }

// Render entire palette with connections preserved
const renderer = router.createRenderer('css-variables')
renderer.render() // renders all palettes
// Output:
// {
//   '--base-background': '#ffffff',
//   '--base-surface': '#f5f5f5',
//   '--base-primary': '#0066cc', 
//   '--base-on-primary': 'var(--neutral-100)' // maintains reference if possible
// }

// Get all dependencies for a palette
router.getPaletteDependencies('base')
// Output: ['neutral.100'] // external colors that base palette depends on

// Palette management
router.getAllPalettes() // => [{ name: 'base', config: { extends?: string } }] - list all palettes
router.copyPalette('base', 'light') // duplicate base as light
router.deletePalette('unused') // remove palette
```

### Basic Resolution

Get final computed color values:

```typescript
router.resolve('layout.background')    // => '#ff0000'
```

### Dependency Analysis

Export connection information for advanced use cases:

```typescript
router.getDependencies('layout.onBackground') // => ['layout.background', 'brand.primary']
router.getConnectionGraph() // => full dependency tree with relationships
```

### Multiple Renderer Support

The system supports different output formats while preserving color relationships where possible:

```typescript
// CSS Variables Renderer - preserves references where possible
const cssRenderer = router.createRenderer('css-variables');
cssRenderer.render();
// Output:
// {
//   '--layout-background': 'var(--brand-primary)',
//   '--brand-primary': '#ff0000',
//   '--layout-on-background': 'var(--scale-900)' // auto-calculated contrast
// }

// JSON Renderer - all final colors resolved to hex values
const jsonRenderer = router.createRenderer('json');
jsonRenderer.render();
// Output:
// {
//   'layout.background': '#ff0000',
//   'brand.primary': '#ff0000',
//   'layout.on-background': '#ffffff'
// }

// SCSS Variables Renderer
const scssRenderer = router.createRenderer('scss');
scssRenderer.render();
// Output:
// {
//   '$layout-background': '$brand-primary',
//   '$brand-primary': '#ff0000',
//   '$layout-on-background': '$scale-900'
// }
```

### Technology-Aware Rendering

Renderers provide format-specific function implementations where possible:

```typescript
// CSS Variables Renderer - uses native CSS functions when possible
const renderer = router.createRenderer('css-variables')
renderer.render()

// Output for CSS:
// {
//   '--accent': 'color-mix(in lab, var(--brand-primary) 60%, #f00 40%)',
//   '--hover-state': 'rgba(0, 102, 204, 0.8)', // pre-computed relative color
//   '--contrast-text': 'var(--neutral-100)' // auto-selected best contrast
// }

// SCSS renderer - uses Sass functions
const scssRenderer = router.createRenderer('scss')
scssRenderer.render()

// Output for SCSS:
// {
//   '$accent': 'mix($brand-primary, #f00, 60%)', // no color space support
//   '$hover-state': 'rgba($brand-primary, 0.8)',
//   '$contrast-text': '$neutral-100'
// }
```

### Renderer Capabilities System

Instead of boolean capability flags, each renderer defines functions that either return the native implementation or `null` to fall back to computed values:

```typescript
interface RendererCapabilities {
  colorMix?: (color1: string, color2: string, ratio: string, colorSpace?: string) => string | null
  relativeColor?: (baseColor: string, transform: string) => string | null
  customProperty?: (name: string, fallback?: string) => string | null
  calculation?: (expression: string) => string | null
}

const cssModernCapabilities: RendererCapabilities = {
  colorMix: (color1, color2, ratio, colorSpace = 'lab') => 
    `color-mix(in ${colorSpace}, ${color1} ${ratio}, ${color2})`,
  relativeColor: (base, transform) => `rgb(from ${base} ${transform})`,
  customProperty: (name, fallback) => 
    fallback ? `var(--${name}, ${fallback})` : `var(--${name})`,
  calculation: (expr) => `calc(${expr})`
}

const scssCapabilities: RendererCapabilities = {
  colorMix: (color1, color2, ratio) => `mix(${color1}, ${color2}, ${ratio})`, // no color space support
  relativeColor: () => null, // not supported, will use computed value
  customProperty: (name) => `${name}`,
  calculation: (expr) => expr // Sass handles math natively
}

const jsonCapabilities: RendererCapabilities = {
  colorMix: () => null, // always use computed values
  relativeColor: () => null,
  customProperty: () => null, // just use the color name as key
  calculation: () => null
}
```

### Smart Function Translation

```typescript
// Original definition with color space
router.define('accent', 
  router.func('colorMix', 'brand.primary', '#f00', '60%', 'oklch')
)

// CSS Modern renderer output:
'--accent': 'color-mix(in oklch, var(--brand-primary) 40%, #f00)'

// SCSS renderer output (no color space support):
'$accent': 'mix($brand-primary, #f00, 60%)'

// JSON/JavaScript renderer output:
'accent': '#cc3366' // pre-computed using Culori with specified color space
```

### Renderer Usage Logic

```typescript
// When rendering a color-mix function:
const colorMixResult = capabilities.colorMix?.(
  'var(--brand-primary)', 
  '#f00', 
  '60%', 
  'lab'
)

if (colorMixResult) {
  // Use native implementation
  output['--accent'] = colorMixResult
} else {
  // Fall back to computed value using Culori
  output['--accent'] = computeColorMix('brand.primary', '#f00', '60%', 'lab')
}
```

### Custom Renderers

The connection graph structure and capability system allows building custom export formats while maintaining relationship information for any target platform.

## API Reference

### Core Methods

```typescript
// Definition
router.define(key: string, value: ColorValue | ColorReference | ColorFunction)

// Modification
router.set(key: string, value: ColorValue | ColorReference | ColorFunction)

// Resolution
router.resolve(key: string): string // final computed color
router.resolvePalette(paletteName: string): Record<string, string> // all colors in palette

// References and Functions
router.ref(key: string): ColorReference
router.func(name: string, ...args: any[]): ColorFunction // Generic function creation
router.registerFunction(name: string, fn: (...args: any[]) => string): void

// Built-in Functions (accessed via router.func())
// router.func('bestContrastWith', targetColor: string, paletteName?: string)
// router.func('colorMix', color1: string, color2: string, ratio?: string, colorSpace?: string)
// router.func('relativeTo', baseColor: string, transform: string)
// router.func('minContrastWith', targetColor: string, minRatio?: number)
// router.func('lighten', color: string, amount: number)
// router.func('darken', color: string, amount: number)

// Batch Operations (batch mode only)
router.flush(): void

// Events
router.on(event: string, callback: EventListener): void
router.watch(key: string, callback: (newValue: string, oldValue: string | undefined) => void): void

// Palette Management
router.createPalette(name: string, options?: PaletteOptions): void
router.extendPalette(name: string, basePalette: string, overrides: Record<string, any>): void
router.copyPalette(sourceName: string, targetName: string): void
router.deletePalette(name: string): void
router.getAllPalettes(): Array<{ name: string; config: PaletteConfig }>

// Color Access
router.getAllKeysForPalette(paletteName: string): string[]
router.getDefinitionForKey(key: string): ColorDefinition
router.valueToString(value: ColorDefinition): string
router.has(key: string): boolean

// Export & Rendering
router.createRenderer(format: RenderFormat): ColorRenderer // Create renderer with format
ColorRenderer.render(): string // Generate output in renderer's format
router.createRenderer(format?: RenderFormat): ColorRenderer

// Dependency Analysis
router.getDependencies(key: string): string[]
router.getDependents(key: string): string[]
router.getPaletteDependencies(paletteName: string): string[]
router.getConnectionGraph(): Record<string, string[]>

// Configuration
router.mode: 'auto' | 'batch' // getter/setter
router.batchQueueSize: number // getter
router.setColorRenderer(ColorRenderer: ColorRendererClass): void
router.setLogCallback(callback: LogCallback): void

// Types
interface PaletteOptions {
  extends?: string
  overrides?: Record<string, any>
}

type RenderFormat = 'css-variables' | 'scss' | 'json'
```

## Integration with Culori.js

The system leverages [Culori.js](https://culorijs.org/api/) for:

- Color parsing and validation
- Color space conversions
- Contrast ratio calculations
- Color manipulation functions
- Modern CSS color syntax support

## Use Cases

### 1. Design System with Palette Inheritance
Central color definitions with theme variations through palette extension:

```typescript
// Define base design system palette
router.define('design-system.primary', '#0066cc')
router.define('design-system.secondary', '#ff6600')
router.define('design-system.neutral-100', '#ffffff')
router.define('design-system.neutral-900', '#1a1a1a')

// Create light theme palette
router.createPalette('light', {
  extends: 'design-system',
  overrides: {
    'background': router.ref('design-system.neutral-100'),
    'surface': '#f5f5f5',
    'on-background': router.ref('design-system.neutral-900')
  }
})

// Create dark theme palette
router.createPalette('dark', {
  extends: 'light', // inherit light structure
  overrides: {
    'background': router.ref('design-system.neutral-900'),
    'surface': '#2d2d2d',
    'on-background': router.ref('design-system.neutral-100')
  }
})

// All UI elements can reference either palette
router.define('ui.button-bg', router.ref('light.primary')) // or 'dark.primary'
```

### 2. Dynamic Palette Switching

Change active palette and everything updates reactively:

```typescript
// Note: setActivePalette method is not implemented yet
// router.setActivePalette('dark')

// Current approach: modify specific colors in any palette
router.set('dark.primary', '#0088ff') // all references to dark.primary update
```

### 3. Accessibility Compliance

Dynamic contrast calculations ensure readable combinations:

```typescript
router.define('card.background', '#e3f2fd')
router.define('card.text', router.func('bestContrastWith', 'card.background', '#333333'))
router.define('card.border', router.func('minContrastWith', 'card.background', 1.5))
```

### 4. CSS Integration

Export to CSS custom properties with proper variable relationships:

```css
/* Generated CSS */
:root {
  --brand-primary: #0066cc;
  --button-primary: var(--brand-primary);
  --button-primary-hover: rgb(from var(--brand-primary) r g b / 0.8);
  --text-on-primary: var(--neutral-100); /* auto-calculated best contrast */
}
```

### 5. Modern CSS Support with Palette Structure

Use new CSS color functions with palette references instead of literals:

```typescript
router.define('brand.primary', '#0066cc')
router.define('brand.accent-subtle', 
  router.func('colorMix', 'brand.primary', 'transparent', '20%', 'lab')
)
router.define('brand.accent-highlight', 
  router.func('relativeTo', 'brand.primary', 'calc(l + 0.2) c h')
)

// Create variations palette
router.createPalette('brand-variations', {
  extends: 'brand',
  overrides: {
    'hover': router.func('relativeTo', 'brand.primary', 'r g b / 0.8'),
    'pressed': router.func('relativeTo', 'brand.primary', 'calc(l - 0.1) c h')
  }
})
```

### 6. Multi-Platform Export by Palette

Same palette structure, different output formats for various platforms:

```typescript
// Export specific palettes for different contexts
// Note: renderPalette method is not implemented yet
// Current approach: use the main render method which outputs all palettes
const renderer = router.createRenderer('css-variables')
const allOutput = renderer.render() // renders all palettes together
```

- **CSS**: Custom properties with optimal variable usage
- **SCSS**: Sass variables with dependency mapping
- **JSON**: For design tools and documentation
- **JavaScript**: For runtime theming
- **Swift/Kotlin**: For mobile app integration

## Architecture Benefits

- **Type Safety**: Full TypeScript support with proper type inference
- **Performance**: Efficient dependency tracking with minimal recalculation
- **Flexibility**: Multiple output formats from single source of truth
- **Maintainability**: Clear dependency relationships and automatic updates
- **Accessibility**: Built-in contrast calculations and compliance helpers
- **Modern CSS**: Support for latest color functions and specifications
- **Error Prevention**: Circular dependency detection and validation

## Technical Considerations

- **Dependency Resolution**: Topological sorting for optimal update order
- **Memory Management**: Efficient event listener cleanup and weak references
- **Performance Monitoring**: Optional performance metrics for large palettes
- **Serialization**: JSON export/import for persistence and sharing
- **Validation**: Runtime validation of color values and function parameters
