# New Token System Architecture

**Date**: June 15, 2025  
**Status**: IN PROGRESS - BREAKING CHANGES

## Overview

The Design System has been completely refactored to eliminate the "ColorRouter" concept and create a cleaner, more intuitive architecture.

## Key Changes

### 1. **Terminology Updates**
- ❌ `ColorRouter` → ✅ `TokenEngine` - Handles all token types, not just colors
- ❌ `Palettes` → ✅ `Scopes` - Better semantic meaning for token organization
- ❌ Generic `func()` → ✅ `modify()` vs `select()` - Clear distinction between function types

### 2. **Architecture Simplification**
- **Before**: `DesignSystem` → `ColorRouter` → `PaletteManager` (3 layers)
- **After**: `DesignSystem` → `TokenEngine` (2 layers, fully integrated)

### 3. **Function Type Distinction**

**Value Modifiers** - Transform individual values:
```typescript
// OLD: func.color.lighten(router, 'base.primary', 0.2)
// NEW: func.modify.lighten(engine, 'base.primary', 0.2)

engine.modify('lighten', 'base.primary', 0.2)
engine.modify('darken', 'base.primary', 0.2)
engine.modify('colorMix', 'color1', 'color2', 0.5)
engine.modify('relativeTo', 'base', 'lch', ['+0.2', '0', '0'])
```

**Scope Selectors** - Select values from scopes:
```typescript
// OLD: func.color.bestContrastWith(router, 'base.primary', 'ramp')
// NEW: func.select.bestContrastWith(engine, 'base.primary', 'ramp')

engine.select('bestContrastWith', 'base.primary', 'ramp')
engine.select('minContrastWith', 'base.background', 'ramp', 4.5)
engine.select('furthestFrom', 'target', 'palette')
engine.select('closestColor', 'target', 'palette')
```

### 4. **API Changes**

**DesignSystem**:
```typescript
// OLD
const router = designSystem.getRouter()
router.func('lighten', ...)
router.registerFunction(name, fn, options)

// NEW  
const engine = designSystem.getEngine()
engine.modify('lighten', ...)
designSystem.registerValueModifier(name, fn)
designSystem.registerScopeSelector(name, fn)
```

**Scope/Token Management**:
```typescript
// OLD
router.createPalette(name)
router.getAllKeysForPalette(name)
router.getDefinitionForKey(key)

// NEW
designSystem.addScope(name)
engine.getAllTokensForScope(name)
engine.getDefinition(key)
```

### 5. **Backward Compatibility**

The `func.color.*` namespace is maintained for compatibility but internally uses the new modify/select distinction:

```typescript
// Backward compatible (still works)
func.color.lighten(engine, ...)     // → engine.modify('lighten', ...)
func.color.bestContrastWith(engine, ...) // → engine.select('bestContrastWith', ...)

// New explicit API (preferred)
func.modify.lighten(engine, ...)
func.select.bestContrastWith(engine, ...)
```

## Migration Requirements

### Demo Updates Needed:
1. Replace all `router` references with `engine`
2. Update function calls from `router.func()` to `engine.modify()` or `engine.select()`
3. Update palette methods to scope methods
4. Update UI to reflect new terminology

### Parser Updates:
✅ **COMPLETE** - Parser now uses TokenEngine API

### System Core:
✅ **COMPLETE** - New TokenEngine and typed value tokens implemented

## Benefits

1. **🎯 Clarity**: Functions are explicitly categorized by purpose
2. **🏗️ Simplicity**: Fewer abstraction layers
3. **📝 Semantics**: Better naming that reflects actual functionality
4. **🔧 Maintainability**: Cleaner separation of concerns
5. **🚀 Performance**: Reduced overhead from eliminated abstractions

## Next Steps

1. Update demo to use new TokenEngine API
2. Test all functionality with new architecture  
3. Update documentation to reflect new terminology
4. Consider deprecation timeline for old router-based methods

---

**Status**: Core system complete, demo integration in progress
