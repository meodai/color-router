# Color Router System

An advanced TypeScript color management system with reactive routing, palette inheritance, and multiple output formats.

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
import { ColorRouter, ColorRenderer } from 'color-router';

// Create renderer and router
const renderer = new ColorRenderer();
const router = new ColorRouter();
router.setColorRenderer(ColorRenderer);

// Create palette and define colors
router.createPalette('base');
router.define('base.primary', '#3498db');
router.define('base.secondary', '#2ecc71');
router.define('base.text', router.ref('base.primary'));
router.define('base.background', router.func('bestContrastWith', 'base.text', 'base')); // Enhanced: search base palette

// Get rendered colors
// Get CSS variables output
const renderer = router.createRenderer('css-variables');
const cssVars = renderer.render();
console.log(cssVars);
// Output: --base-primary: #3498db; --base-secondary: #2ecc71; --base-text: #3498db; --base-background: #ffffff;
```

### Local Development

```bash
git clone <repository>
cd color-router
npm install
npm run dev  # Start development server
```

## Features

### Core Functionality

- **Reactive Color Routing**: Automatic resolution and updating of color dependencies
- **Palette Inheritance**: Create color palettes that extend other palettes
- **Reference System**: Use `ref()` to reference colors from other palettes
- **Function System**: Built-in color manipulation functions + custom function registration
- **Batch vs Auto Mode**: Control when color updates are processed
- **Multiple Output Formats**: CSS variables, SCSS variables, and JSON

### Enhanced Features

- **Enhanced `bestContrastWith`**: Now accepts optional palette parameter to search through all colors in a palette for optimal contrast
- **Format-Specific Function Rendering**: Functions render differently based on output format (CSS uses `color-mix()`, SCSS uses `mix()`, etc.)
- **Modular TypeScript Architecture**: Separate ColorRouter and ColorRenderer classes with proper typing
- **Full TypeScript Support**: Complete type definitions for all APIs

### Built-in Functions

- `bestContrastWith(color, [palette])` - Find best contrasting color, optionally from a specific palette
- `colorMix(color1, color2, ratio, colorSpace)` - Mix two colors with specified ratio and color space
- `lighten(color, amount)` - Lighten a color by percentage
- `darken(color, amount)` - Darken a color by percentage
- `relativeTo(color, palette)` - Make color relative to palette context
- `minContrastWith(color, minRatio)` - Ensure minimum contrast ratio

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
import { ColorRouter } from './src/ColorRouter';
import { ColorRenderer } from './src/ColorRenderer';

const router = new ColorRouter();
router.setColorRenderer(ColorRenderer);

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
    'background': router.ref('base.white'),
    'text': router.ref('base.black')
  }
});

// Create dark theme extending light structure
router.createPalette('dark', { 
  extends: 'light',
  overrides: {
    'background': router.ref('base.black'),
    'text': router.ref('base.white')
  }
});
```

### Advanced Functions

```typescript
// Enhanced bestContrastWith - search entire palette
router.define('optimal-text', router.func('bestContrastWith', 'base.primary', 'scale'));

// Color mixing with specific color space
router.define('mixed-color', router.func('colorMix', 'base.primary', 'base.secondary', '60%', 'lab'));

// Automatic contrast optimization
router.define('accessible-text', router.func('minContrastWith', 'light.background', 4.5));
```

### Output Formats

#### CSS Variables

```css
:root {
  --base-primary: #0066cc;
  --light-mixed-accent: color-mix(in lab, var(--light-primary) 30%, var(--base-orange));
  --card-primary-text: var(--scale-0);
}
```

#### SCSS Variables

```scss
$base-primary: #0066cc;
$light-mixed-accent: mix($base-orange, $light-primary, 70%);
$card-primary-text: $scale-0;
```

#### JSON Export

```json
{
  "base.primary": "#0066cc",
  "light.mixed-accent": "#e67300",
  "card.primary-text": "#ffffff"
}
```

## API Reference

### Avoiding Complexity Explosions

The Color Router System implements several strategies to prevent the [combinatorial explosions](https://pjonori.blog/posts/systems-math-explosions/) that plague traditional color systems:

#### Reactive Dependencies Over Manual Synchronization
Instead of manually maintaining color relationships across hundreds of combinations, the system automatically resolves dependencies:

```typescript
// Traditional approach: manual synchronization nightmare
const buttonPrimary = '#3498db';
const buttonHover = '#2980b9';    // Must manually darken
const buttonText = '#ffffff';     // Must manually choose contrast
const cardBorder = '#2980b9';     // Must manually sync with hover

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
router.createPalette('base');        // Foundation colors
router.createPalette('light', { extends: 'base' });  // Light theme variants
router.createPalette('dark', { extends: 'base' });   // Dark theme variants
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

By capturing not just *what* colors exist, but *why* they exist and *how* they relate to each other, the Color Router System maintains comprehensibility even as it scales.

### ColorRouter

- `createPalette(name, config?)` - Create new palette with optional inheritance
- `define(key, value)` - Define a color value
- `ref(key)` - Create reference to another color
- `func(name, ...args)` - Create function call
- `resolve(key)` - Get resolved color value
- `render(format)` - Render all colors in specified format
- `flush()` - Process batch queue (in batch mode)

### ColorRenderer

- `render()` - Generate output in current format
- `registerFunctionRenderer(name, renderer)` - Add custom function renderer
- Format-specific function rendering for CSS, SCSS, and JSON outputs

## License

MIT
