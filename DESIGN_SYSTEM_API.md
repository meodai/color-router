# Design System API

## Overview

Your proposed design system architecture is a good foundation! Here's an enhanced version that integrates seamlessly with your existing ColorRouter while providing a more intuitive API for design systems.

## Key Improvements Made

1. **Better Integration**: The `DesignSystem` class wraps your existing `ColorRouter` and provides a higher-level design system API
2. **Type Safety**: Strong TypeScript support with proper interfaces and error handling
3. **Flexible Token Types**: Support for values, references, and functions through a unified Token interface
4. **Scope Management**: Scopes map directly to ColorRouter palettes, inheriting all their advanced features
5. **Event System**: Built-in change notifications for reactive UIs
6. **Batch Operations**: Support for batch updates to improve performance

## API Usage

### Basic Setup

```typescript
import { DesignSystem, ref, val, hex } from 'visual-route';

// Create a design system
const designSystem = new DesignSystem('MyDesignSystem');

// Create scopes (equivalent to palettes)
const base = designSystem.addScope('base', { 
  description: 'Base color palette' 
});

const dark = designSystem.addScope('dark', { 
  extends: 'base', 
  description: 'Dark theme variant' 
});
```

### Setting Tokens

```typescript
// Basic color values
base.set('primary', val.color.hex('#3498db'));
base.set('secondary', val.color.hex('#2ecc71'));
base.set('background', val.color.hex('#ffffff'));

// References to other tokens
base.set('text', ref('primary'));
base.set('border', ref('secondary'));

// Cross-scope references
dark.set('text', ref('base.primary'));
```

### Using Functions

```typescript
// Register custom functions
designSystem.registerFunction('bestContrastWith', 
  (color: string, ...candidates: string[]) => {
    // Your contrast calculation logic
    return candidates[0] || '#000000';
  }, 
  { isPaletteAware: true }
);

// Use functions in tokens
const router = designSystem.getRouter();
base.set('contrast-text', router.func('bestContrastWith', 
  ref('background'), 
  val('#ffffff'), 
  val('#000000')
));
```

### Resolving Values

```typescript
// Resolve individual tokens
const primaryColor = designSystem.resolve('base.primary');
const darkText = designSystem.resolve('dark.text');

// Get all tokens from a scope
const baseTokens = base.allTokens();
```

### Change Notifications

```typescript
// Listen for changes
designSystem.onChange((changes) => {
  changes.forEach(({ key, oldValue, newValue }) => {
    console.log(`${key}: ${oldValue} → ${newValue}`);
  });
});

// Update a token (triggers change event)
base.set('primary', val.color.hex('#2980b9'));
```

### Batch Operations

```typescript
// Switch to batch mode for performance
designSystem.setMode('batch');

// Make multiple changes
base.set('primary', val.color.hex('#2980b9'));
base.set('secondary', val.color.hex('#27ae60'));
base.set('accent', val.color.hex('#9b59b6'));

// Apply all changes at once
designSystem.flush(); // Triggers single change event
```

## Advantages Over Original Design

### 1. **Leverages Existing Infrastructure**
- Uses your proven ColorRouter for dependency management
- Inherits circular dependency detection
- Gets advanced function system for free

### 2. **Better Type Safety**
```typescript
// Your original approach
sheet.set('primary', val.color.hex('#3498db')); // No helper integration

// Enhanced approach  
base.set('primary', val.color.hex('#3498db')); // Namespaced helpers provided
base.set('text', ref('primary'));               // ref() helper provided
```

### 3. **More Flexible Function System**
```typescript
// Your original approach required scope parameter
bestContrastWith(ref('text'), sheet)

// Enhanced approach uses router's function system
router.func('bestContrastWith', ref('text'), val('#fff'), val('#000'))
```

### 4. **Advanced Features**
- Dependency tracking: `scope.getDependencies('tokenName')`
- Reverse dependencies: `scope.getDependents('tokenName')`
- Palette inheritance with override support
- Event-driven updates for reactive UIs

### 5. **Familiar API**
Your core concepts remain intact:
- ✅ `System` → `DesignSystem` 
- ✅ `Scope` → `Scope` (enhanced)
- ✅ `Token` → `Token` (with better typing)
- ✅ `ref()` and `val()` helpers

## Migration Path

If you want to adopt this enhanced version:

1. **Start Simple**: Use the basic token setting and resolution
2. **Add Functions**: Register your color manipulation functions
3. **Use Inheritance**: Create theme variants with scope extension
4. **Optimize**: Switch to batch mode for bulk operations
5. **React**: Add change listeners for live UI updates

## Conclusion

Your original design had excellent foundational concepts. This enhanced version builds on those ideas while providing:
- Better integration with your existing robust color system
- Improved type safety and developer experience  
- Advanced features like dependency tracking and batch operations
- A migration path that preserves your core API concepts

The result is a design system API that feels familiar but provides enterprise-level capabilities under the hood.
