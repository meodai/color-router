# Color Router System

An advanced TypeScript color management system that works like a smart, interconnected color spreadsheet for your design projects. It allows reactive routing, palette inheritance, and multiple output formats.

**Imagine your colors in a spreadsheet:**

- **Palettes are like Sheets:** Organize colors in different "sheets" (e.g., `brand`, `layout`, `dark-theme`).
- **Define Colors like Filling Cells:** Assign a color to a name (e.g., `brand.primary = '#3498db'`).
- **Link Colors (References):** Make one color directly point to another (e.g., `header.background = brand.primary`). If `brand.primary` changes, `header.background` updates automatically. Use `router.ref('brand.primary')`.
- **Calculate Colors (Functions):** Define colors based on calculations involving other colors (e.g., `button.hover = darken(brand.primary, 10%)` or `text.onPrimary = bestContrastWith(brand.primary)`). Use `router.func('darken', ...)`.
- **Automatic Updates:** Changes to any source color automatically cascade to all dependent colors.
- **Multiple Output Formats:** Export your color system as CSS variables, JSON, etc., using **Renderers**.

This system turns complex color management into a logical, maintainable, and less error-prone process.

## The Problem: Design System Complexity

As PJ Onori eloquently explains in ["Systems, math and explosions"](https://pjonori.blog/posts/systems-math-explosions/), color palettes in design systems suffer from combinatorial explosions. A 7-color palette has 21 two-color combinations, but a 190-color palette (like Material Design) has 17,955 combinations—making the system essentially incomprehensible.

The Color Router System addresses this complexity through:

- **Reactive Dependencies**: Colors update automatically when their dependencies change
- **Controlled Palette Inheritance**: Extend palettes without exponential complexity growth
- **Reference System**: Maintain relationships without manual synchronization
- **Function-Based Logic**: Programmatic color generation instead of manual combinations

This approach transforms chaotic color proliferation into a more manageable, predictable system.

## Installation

### NPM Package

```bash
npm install color-router
```

### Usage

```typescript
import { ColorRouter } from 'color-router';
import { ColorRenderer } from 'color-router/renderers';

// Create router and renderer
const router = new ColorRouter();
const renderer = new ColorRenderer(router);

// Create palette and define colors
router.createPalette('base');
router.define('base.primary', '#3498db');
router.define('base.secondary', '#2ecc71');
router.define('base.text', router.ref('base.primary'));
router.define('base.background', router.func('bestContrastWith', 'base.text', 'base')); // Enhanced: search base palette

// Get rendered colors as CSS variables
renderer.format = 'css-variables';
const cssVars = renderer.render();
console.log(cssVars);
// Output: --base-primary: #3498db; --base-secondary: #2ecc71; --base-text: var(--base-primary); --base-background: #ffffff;
```

### Local Development

```bash
git clone <repository>
cd color-router
npm install
npm run dev  # Start development server
```

## Project Structure

The Color Router System is organized into clear, modular components:

```txt
src/
├── router/                    # Core routing and dependency management
│   ├── ColorRouter.ts        # Main orchestrator class
│   ├── DependencyGraph.ts    # Advanced dependency tracking with graph algorithms
│   ├── PaletteManager.ts     # Palette operations and inheritance
│   ├── errors.ts             # Error classes (CircularDependencyError, etc.)
│   └── index.ts              # Router module exports
├── renderers/                 # Output format renderers
│   ├── ColorRenderer.ts      # CSS, JSON output renderer
│   ├── SVGRenderer.ts        # SVG visualization renderer
│   ├── TableViewRenderer.ts  # HTML table renderer
│   └── index.ts              # Renderer module exports
├── colorFunctions/           # Built-in color manipulation functions
│   ├── bestContrastWith.ts   # Accessibility-focused contrast selection
│   ├── colorMix.ts           # CSS color-mix() function support
│   ├── relativeTo.ts         # CSS relative color syntax support
│   └── ...                   # Other color functions
├── types.ts                  # Core type definitions
└── index.ts                  # Main library entry point
demo/                         # Interactive demo application
├── demo.ts                   # Demo application logic
├── demoInputParser.ts        # Input parsing for demo
└── index.html                # Demo HTML page
```

### Architecture Benefits

- **Modular Design**: Clear separation between routing logic, rendering, and color functions
- **Advanced Dependency Tracking**: Enhanced `DependencyGraph` with standard graph algorithms
- **Multiple Output Formats**: Flexible renderer system for different target formats
- **Type Safety**: Full TypeScript support throughout the codebase

## Features

### Core Functionality

- **Reactive Color Routing**: Automatic resolution and updating of color dependencies.
- **Palette Inheritance & Management**: Create color palettes that extend others, managed by a dedicated `PaletteManager`.
- **Reference System**: Use `router.ref()` to reference colors.
- **Function System**: Built-in color manipulation functions (like `darken`, `bestContrastWith`) + custom function registration.
- **Event System**: Get notified of changes via `router.addEventListener('change', ...)` or `router.watch('key', ...)`. Batch operations also emit `batch-complete` or `batch-failed` events.
- **Batch vs Auto Mode**: Control when color updates are processed.
- **Multiple Output Formats**: `ColorRenderer` can output to CSS variables and JSON.

### Enhanced Features

- **Enhanced `bestContrastWith`**, **`minContrastWith`**, **`closestColor`**: These functions can search entire palettes for optimal color choices.
- **Format-Specific Function Rendering**: Functions like `colorMix` render to native CSS `color-mix()` where appropriate.
- **Modular TypeScript Architecture**: Core logic is separated into `ColorRouter` (orchestrator), `PaletteManager` (palette operations), `DependencyGraph` (dependency tracking), and various `Renderer` classes (output generation).
- **Advanced Dependency Analysis**: Enhanced `DependencyGraph` with standard graph algorithms including DFS/BFS traversal, shortest path finding, cycle detection, and connectivity analysis.
- **Full TypeScript Support**: Complete type definitions for all APIs.

### Built-in Functions

(Briefly list key functions, refer to specs.md for full signatures)

- `bestContrastWith(colorKey, paletteNameOrFallbackArray)`
- `colorMix(color1Key, color2Key, ratio, colorSpace?)`
- `lighten(colorKey, amount)`
- `darken(colorKey, amount)`
- `relativeTo(baseColorKey, cssTransformString)`
- `minContrastWith(colorKey, ratioOrPaletteName)`
- `furthestFrom(paletteName)`
- `closestColor(colorKey, paletteNameOrColorArray)`

## Build Commands

### Library Build (for NPM)

```bash
npm run build:lib    # Build library with TypeScript declarations
```

### Demo Build (for GitHub Pages)

```bash
npm run build:demo   # Build interactive demo
npm run preview      # Preview demo build
```

The demo is automatically deployed to GitHub Pages on every push to the main branch via GitHub Actions. You can view the live demo at: `https://[username].github.io/[repository-name]/`

### Development

```bash
npm run dev          # Start development server with hot reload
```

### VS Code Tasks

- **Ctrl+Shift+P** → "Tasks: Run Task" → "dev" (start development server)
- **Ctrl+Shift+P** → "Tasks: Run Task" → "build:lib" (build NPM library)
- **Ctrl+Shift+P** → "Tasks: Run Task" → "build:demo" (build demo site)
- **Ctrl+Shift+P** → "Tasks: Run Task" → "preview" (preview demo build)

## Usage Examples

### Basic Palette Setup

```typescript
import { ColorRouter } from 'color-router';
import { ColorRenderer } from 'color-router/renderers';

const router = new ColorRouter();

// Create base palette
router.createPalette('base');
router.define('base.primary', '#0066cc');
router.define('base.secondary', '#ff6600');
router.define('base.white', '#ffffff');
router.define('base.black', '#000000');
```

### Palette Inheritance

```typescript
// Create light theme extending base
router.createPalette('light', {
  extends: 'base',
  overrides: {
    background: router.ref('base.white'),
    text: router.ref('base.black'),
  },
});

// Create dark theme extending light structure
router.createPalette('dark', {
  extends: 'light',
  overrides: {
    background: router.ref('base.black'),
    text: router.ref('base.white'),
  },
});
```

### Advanced Functions

```typescript
// Enhanced bestContrastWith - search entire palette
router.define('optimal-text', router.func('bestContrastWith', 'base.primary', 'scale'));

// Color mixing with specific color space
router.define('mixed-color', router.func('colorMix', 'base.primary', 'base.secondary', 0.6, 'lab'));

// Automatic contrast optimization
router.define('accessible-text', router.func('minContrastWith', 'light.background', 4.5));
```

### Output Formats

#### CSS Variables

```typescript
import { ColorRenderer } from 'color-router/renderers';

const renderer = new ColorRenderer(router, 'css-variables');
const cssOutput = renderer.render();
```

```css
:root {
  --base-primary: #0066cc;
  --light-mixed-accent: color-mix(in lab, var(--light-primary) 30%, var(--base-orange));
  --card-primary-text: var(--scale-0);
}
```

#### JSON Export

```typescript
const renderer = new ColorRenderer(router, 'json');
const jsonOutput = renderer.render();
```

```json
{
  "base.primary": "#0066cc",
  "light.mixed-accent": "#e67300",
  "card.primary-text": "#ffffff"
}
```

## API Reference

### Dependency Analysis

The Color Router System includes advanced dependency analysis capabilities through the enhanced `DependencyGraph` class:

#### Graph Traversal

```typescript
const depGraph = router.getDependencyGraph();

// Depth-First Search traversal
const dfsResult = depGraph.dfsTraversal('brand.primary', false); // traverse dependents
// Returns: ['brand.primary', 'button.default', 'button.hover', 'card.border']

// Breadth-First Search traversal  
const bfsResult = depGraph.bfsTraversal('brand.primary', true); // traverse prerequisites
// Returns: ['brand.primary', 'base.blue', 'base.saturation']
```

#### Path Finding and Connectivity

```typescript
// Find shortest path between two colors
const path = depGraph.findShortestPath('brand.primary', 'button.text');
// Returns: ['brand.primary', 'button.default', 'button.text'] or null if no path

// Check if colors are connected
const isConnected = depGraph.hasPath('brand.primary', 'theme.background');
// Returns: true/false

// Detect circular dependencies
const hasCycles = depGraph.hasCycles();
// Returns: true/false
```

#### Graph Analysis

```typescript
// Get all nodes in the dependency graph
const allNodes = depGraph.getAllNodes();
// Returns: ['brand.primary', 'button.default', 'theme.background', ...]

// Get adjacency list representation
const adjacencyList = depGraph.getAdjacencyList(false); // show dependents
// Returns: { 'brand.primary': ['button.default', 'theme.accent'], ... }

// Analyze node connections
const incomingCount = depGraph.getNodeDegree('button.default', true); // prerequisites
const outgoingCount = depGraph.getNodeDegree('button.default', false); // dependents

// Graph terminology aliases
const prerequisites = depGraph.getIncomingEdges('button.hover'); // same as getPrerequisitesFor
const dependents = depGraph.getOutgoingEdges('brand.primary'); // same as getDependentsOf
```

### Avoiding Complexity Explosions

The Color Router System implements several strategies to prevent the [combinatorial explosions](https://pjonori.blog/posts/systems-math-explosions/) that plague traditional color systems:

#### Reactive Dependencies Over Manual Synchronization

Instead of manually maintaining color relationships across hundreds of combinations, the system automatically resolves dependencies:

```typescript
// Traditional approach: manual synchronization nightmare
const buttonPrimary = '#3498db';
const buttonHover = '#2980b9'; // Must manually darken
const buttonText = '#ffffff'; // Must manually choose contrast
const cardBorder = '#2980b9'; // Must manually sync with hover

// Color Router approach: automatic dependency resolution
router.define('brand.primary', '#3498db');
router.define('button.default', router.ref('brand.primary'));
router.define('button.hover', router.func('darken', 'button.default', '15%'));
router.define('button.text', router.func('bestContrastWith', 'button.default'));
router.define('card.border', router.ref('button.hover'));
```

#### Controlled Inheritance Over Unbounded Growth

Palette inheritance creates predictable extension points rather than exponential color variations:

```typescript
// Creates manageable hierarchy instead of flat color explosion
router.createPalette('base'); // Foundation colors
router.createPalette('light', { extends: 'base' }); // Light theme variants
router.createPalette('dark', { extends: 'base' }); // Dark theme variants
```

#### Function-Based Logic Over Hardcoded Combinations

Mathematical functions generate colors programmatically, reducing the need for pre-defined combinations:

```typescript
// Instead of defining every possible color mix manually
router.define('accent.subtle', router.func('colorMix', 'brand.primary', 'neutral.background', '20%'));
router.define('status.success', router.func('minContrastWith', 'surface.background', 4.5));
```

This approach transforms what Onori describes as "piles of stuff" back into comprehensible, maintainable systems.

#### Documenting Intent to Combat Chaos

One of the key insights from Onori's piece is that complex systems become "unpredictable" and devolve into incomprehensible chaos. The Color Router System addresses this by making relationships and intentions explicit and discoverable:

```typescript
// Intent is documented in the code itself
router.define('button.hover', router.func('darken', 'button.default', '15%'));
// ^ This relationship is self-documenting: "hover state is 15% darker than default"

router.define('card.text', router.func('bestContrastWith', 'card.background', 'brand'));
// ^ Intent: "ensure accessible contrast, preferring colors from brand palette"

router.define('status.error', router.func('relativeTo', 'red.500', 'current-theme'));
// ^ Intent: "error color adapts to current theme context"
```

When you query the system, you don't just get a color value—you get the reasoning:

```typescript
const colorInfo = router.resolve('button.hover');
// Returns: { value: '#2980b9', dependencies: ['button.default'], function: 'darken', args: ['15%'] }
```

This self-documenting nature prevents the system from becoming a "black box" where relationships are opaque. Instead of wondering "why is this color this value?", the intent is preserved and queryable. This documentation of relationships addresses what Onori identifies as the core problem: when systems become too complex to understand, they become unpredictable and chaotic.

By capturing not just _what_ colors exist, but _why_ they exist and _how_ they relate to each other, the Color Router System maintains comprehensibility even as it scales.

### ColorRouter

- `createPalette(name, config?)`: Create new palette.
- `define(key, value)`: Define a color (direct value, `ref()`, or `func()`).
- `set(key, value)`: Modify an existing color definition.
- `ref(key)`: Create a static reference to another color.
- `func(name, ...args)`: Create a dynamic, function-based color.
- `resolve(key)`: Get the final computed string value of a color.
- `flush()`: Process pending changes in 'batch' mode. Emits `batch-complete` or `batch-failed`.
- `addEventListener(type, callback)`, `watch(key, callback)`: Listen to color changes.
- `setColorRenderer(ColorRendererClass)`: Injects the `ColorRenderer` class.
- `createRenderer(format?)`: Creates an instance of the injected `ColorRenderer`.

### ColorRenderer

- `constructor(router, format?)`: Create renderer instance.
- `render()`: Generate output string (CSS, JSON).
- `format`: Get or set the output format ('css-variables', 'json').
- `registerFunctionRenderer(functionName, rendererFn)`: Register custom function renderer for current format.

### Import Paths

```typescript
// Core router functionality
import { ColorRouter } from 'color-router';

// Renderers
import { ColorRenderer, SVGRenderer, TableViewRenderer } from 'color-router/renderers';

// Individual color functions (if needed)
import { bestContrastWith, colorMix } from 'color-router/functions';

// Types
import type { ColorDefinition, ColorReference, ColorFunction } from 'color-router/types';
```

## License

MIT
