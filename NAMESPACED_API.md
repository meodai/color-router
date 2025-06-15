# Namespaced Design System API

## Overview

The Design System API has been enhanced with a namespaced structure that provides better organization, discoverability, and prevents global namespace pollution. This improvement maintains backward compatibility while offering a more structured approach to token creation.

## Namespaced Token API

### Value Tokens (`val.color.*`)

## Token Types

### Color Value Tokens (`val.color.*`)

```typescript
// Different color format support (returns ColorValueToken)
val.color.hex('#3498db')        // Hex colors
val.color.rgb('rgb(52, 152, 219)')   // RGB format
val.color.hsl('hsl(204, 70%, 53%)')  // HSL format
val.color.lch('lch(54 67 258)')      // LCH format
val.color.oklch('oklch(0.7 0.15 250)') // OKLCH format
val.color.lab('lab(54 23 -58)')      // LAB format
val.color.oklab('oklab(0.7 -0.05 -0.14)') // OKLAB format
val.color.css('rgba(52, 152, 219, 0.8)') // Any valid CSS color
```

### Size Value Tokens (`val.size.*`) 

```typescript
// Size tokens with units (returns SizeValueToken)
val.size.px(24)        // "24px"
val.size.rem(2.5)      // "2.5rem"
val.size.em(1.2)       // "1.2em"
val.size.percent(100)  // "100%"
val.size.vw(80)        // "80vw"
val.size.vh(50)        // "50vh"
```

### Space Value Tokens (`val.space.*`)

```typescript
// Spacing tokens with units (returns SpaceValueToken)
val.space.px(16)       // "16px"
val.space.rem(1)       // "1rem"
val.space.em(0.5)      // "0.5em"
val.space.percent(50)  // "50%"
```

### Font Value Tokens (`val.font.*`)

```typescript
// Font-related tokens (returns FontValueToken)
val.font.family('Inter, sans-serif')  // Font families
val.font.size('2.5rem')               // Font sizes
val.font.weight('700')                // Font weights
val.font.style('italic')              // Font styles
```

### Function Tokens (`func.color.*`)

```typescript
// Color manipulation functions
func.color.lighten(router, 'base.primary', 0.2)
func.color.darken(router, 'base.primary', 0.2)
func.color.mix(router, 'color1', 'color2', 0.5, 'oklab')
func.color.relativeTo(router, 'base.primary', 'r g b / 0.7')

// Accessibility and contrast functions
func.color.bestContrastWith(router, 'base.primary', 'ramp')
func.color.minContrastWith(router, 'base.background', 'ramp', 4.5)

// Palette analysis functions
func.color.furthestFrom(router, 'palette-name')
func.color.closestColor(router, 'target-color', 'palette-name')
```

### Reference Tokens (unchanged)

```typescript
ref('scope.token') // Reference to another token
```

## Benefits of Namespacing

### 1. Better Organization
- **Clear categorization**: Functions are grouped by domain (`color`)
- **Extensible**: Easy to add new namespaces (e.g., `val.typography.*`, `func.layout.*`)
- **Predictable**: Consistent pattern across all token types

### 2. Enhanced Discoverability
- **IDE autocomplete**: Type `val.color.` and see all available color formats
- **Self-documenting**: Function names clearly indicate their purpose
- **Namespace hints**: Easier to understand what each function does

### 3. Reduced Global Pollution
- **No conflicts**: `mix` vs `func.color.mix` prevents naming collisions
- **Modular imports**: Can import specific namespaces if needed
- **Future-proof**: New functions won't conflict with existing code

### 4. Better Type Safety
- **Structured types**: Each namespace can have specific type definitions
- **Validation**: Can validate at the namespace level
- **IDE support**: Better IntelliSense and error detection

## Migration Complete

Legacy functions have been removed in favor of the new namespaced API:

```typescript
// ❌ No longer supported (removed)
hex('#3498db')
val('rgba(255, 255, 255, 0.8)')
func(router, 'lighten', 'primary', 0.1)

// ✅ Use namespaced syntax only
val.color.hex('#3498db')
val.color.css('rgba(255, 255, 255, 0.8)')
func.color.lighten(router, 'primary', 0.1)
```

## Demo Integration

The demo now showcases the namespaced API:

1. **Examples**: All examples use the new namespaced syntax
2. **Quick buttons**: Insert namespaced function calls
3. **Parser support**: Handles both old and new syntax
4. **Error messages**: Clear feedback for syntax issues

## Usage in Practice

```typescript
const designSystem = new DesignSystem('MyApp');
const router = designSystem.getRouter();

// Create a base scope with different color formats
const base = designSystem.addScope('base');
base.set('primary', val.color.hex('#3498db'));
base.set('primaryLch', val.color.lch('lch(54 67 258)'));
base.set('primaryOklch', val.color.oklch('oklch(0.7 0.15 250)'));

// Create interactive variants
const interactive = designSystem.addScope('interactive');
interactive.set('hover', func.color.lighten(router, 'base.primary', 0.1));
interactive.set('active', func.color.darken(router, 'base.primary', 0.1));
interactive.set('disabled', func.color.mix(router, 'base.primary', 'base.background', 0.3));

// Create accessible text colors
const text = designSystem.addScope('text');
text.set('onPrimary', func.color.bestContrastWith(router, 'base.primary', ['#ffffff', '#000000']));
text.set('accessible', func.color.minContrastWith(router, 'base.background', 4.5));

// Create themed variants
const dark = designSystem.addScope('dark', { extends: 'base' });
dark.set('background', val.color.hex('#1a1a1a'));
dark.set('surface', val.color.oklch('oklch(0.2 0.02 250)'));
```

## Migration Guide

For existing code, you can gradually migrate:

1. **Keep existing code working** - No immediate changes needed
2. **Update new tokens** - Use namespaced syntax for new tokens
3. **Migrate gradually** - Update existing tokens over time
4. **Remove deprecated** - Eventually remove legacy function calls

## Future Extensions

The namespaced structure allows for future expansion:

```typescript
// Potential future namespaces
val.typography.size('16px')
val.spacing.scale('8px')
val.animation.duration('200ms')

func.typography.scale(router, 'base.size', 1.2)
func.spacing.rhythm(router, 'base.unit', 4)
func.animation.easing(router, 'base.curve', 'ease-out')
```

This namespaced approach provides a solid foundation for building comprehensive design systems that go beyond just colors.
