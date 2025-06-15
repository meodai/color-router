# Design System API Integration

## Overview

The ColorRouter demo has been successfully integrated with the new Design System API, showcasing how the higher-level design system abstractions work alongside the core ColorRouter functionality.

## What's Integrated

### 1. Design System API Usage

The demo now uses the `DesignSystem` class as the primary interface:

```typescript
// Create a design system instance
const designSystem = new DesignSystem('ColorRouterDemo');
const router = designSystem.getRouter(); // Access underlying router

// Create scopes (enhanced palettes)
const base = designSystem.addScope('base', { description: 'Foundation colors' });

// Use namespaced token helpers for semantic clarity
base.set('primary', val.color.hex('#3498db'));
base.set('secondary', ref('base.primary'));
base.set('contrast', func.color.bestContrastWith(router, 'base.primary', 'ramp'));
```

### 2. Enhanced Demo Features

#### Scope Management UI
- **Create Scope** section with inheritance support
- Visual distinction between Scopes (purple badges) and Palettes (gray badges)
- **Clone as Theme** buttons for easy theme creation
- Scope descriptions and inheritance information display

#### Token Syntax Examples
- Interactive examples showing `val.color.*()`, `ref()` syntax
- Quick example buttons that insert common patterns
- Function examples with proper ColorRouter integration

#### Design System Information Panel
- Real-time display of system name, scope count, and mode
- Educational information about Design System API benefits
- Clear distinction between low-level ColorRouter and high-level Design System features

### 3. Demonstration Scopes

The demo initializes with several scopes showing different use cases:

1. **base** - Foundation colors (`light`, `dark`, `accent`, `attention`)
2. **ramp** - Color scale from light to dark (demonstrates interpolation)
3. **demo** - Various color manipulations (functions, references)
4. **scale** - Color interpolation between two colors
5. **surface** - UI component colors with automatic contrast
6. **dark** - Theme variant extending base (demonstrates inheritance)

### 4. Token Type Visualization

Colors now show visual indicators for their type:
- 🎨 Value tokens (direct color values)
- 🔗 Reference tokens (refs to other colors)
- ⚡ Function tokens (computed colors)

### 5. Backward Compatibility

The integration maintains full backward compatibility:
- All existing ColorRouter features work unchanged
- Low-level palette operations still available
- Existing demo functionality preserved
- No breaking changes to the API

## Key Benefits Demonstrated

### Semantic Clarity
```typescript
// Old way (still works)
router.define('theme.primary', '#3498db');
router.define('theme.secondary', router.ref('theme.primary'));

// New way (more semantic)
const theme = designSystem.addScope('theme');
theme.set('primary', val.color.hex('#3498db'));
theme.set('secondary', ref('theme.primary'));
```

### Enhanced Organization
- Scopes provide better organization than flat palettes
- Built-in inheritance system
- Automatic description tracking
- Type-safe token management

### Developer Experience
- Token helpers (`val.color.*()`, `ref()`, `func.color.*()`) provide better autocomplete and discoverability
- Namespaced functions prevent global namespace pollution
- Clear separation between system-level and token-level operations
- Better error messages and validation
- More intuitive API for design system builders

## Usage Patterns Shown

### 1. Basic Token Creation
```typescript
scope.set('primary', val.color.hex('#3498db'));
scope.set('background', val.color.css('rgba(255, 255, 255, 0.9)'));
scope.set('accent', val.color.oklch('oklch(0.7 0.15 250)'));
```

### 2. References and Dependencies
```typescript
scope.set('text', ref('primary'));
scope.set('border', ref('background'));
```

### 3. Function-Based Colors
```typescript
scope.set('hover', func.color.lighten(router, 'primary', 0.1));
scope.set('accessible', func.color.bestContrastWith(router, 'background', 'ramp'));
scope.set('mixed', func.color.mix(router, 'primary', 'secondary', 0.5, 'oklab'));
```

### 4. Scope Inheritance
```typescript
const darkTheme = designSystem.addScope('dark', { 
  extends: 'base',
  description: 'Dark theme variant'
});
darkTheme.set('background', val.color.hex('#1a1a1a')); // Override specific tokens
```

## Integration Points

- **Parser Enhancement**: `demoInputParser.ts` now supports namespaced syntax like `val.color.hex()` and `func.color.*`
- **Visual Indicators**: Scopes are visually distinguished from palettes
- **Interactive Examples**: Quick-insert buttons for common patterns
- **Real-time Updates**: Design system information updates automatically
- **Clone Functionality**: Easy theme creation through inheritance

## Technical Implementation

The integration wraps the existing ColorRouter with the Design System API without changing the underlying functionality. This allows:

1. **Gradual Migration**: Teams can adopt the Design System API incrementally
2. **Full Feature Access**: All ColorRouter features remain available
3. **Enhanced DX**: Better developer experience through semantic APIs
4. **Future Extensibility**: Foundation for additional design system features

This integration demonstrates how the Design System API can provide a more intuitive, organized approach to color management while maintaining the powerful reactive dependency system that makes ColorRouter unique.
