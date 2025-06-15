# Typed Value Tokens Enhancement

**Date**: June 15, 2025  
**Status**: COMPLETED

## Overview

Enhanced the Design System API with strongly-typed value tokens that include both **type** and **format/unit** information. This provides better organization, type safety, and extensibility for future token categories.

## New Token Architecture

### Base ValueToken Class
```typescript
class ValueToken<T extends string = string> {
  constructor(
    public readonly value: string,
    public readonly type: T  // 'color', 'size', 'space', 'font', etc.
  )
}
```

### Specialized Token Classes

#### 🎨 ColorValueToken
```typescript
class ColorValueToken extends ValueToken<'color'> {
  constructor(
    value: string,
    public readonly format: 'hex' | 'lch' | 'oklch' | 'css' | 'rgb' | 'hsl' | 'lab' | 'oklab'
  )
}
```

#### 📏 SizeValueToken  
```typescript
class SizeValueToken extends ValueToken<'size'> {
  constructor(
    value: string,
    public readonly unit: 'px' | 'rem' | 'em' | '%' | 'vw' | 'vh'
  )
}
```

#### 📐 SpaceValueToken
```typescript
class SpaceValueToken extends ValueToken<'space'> {
  constructor(
    value: string,
    public readonly unit: 'px' | 'rem' | 'em' | '%'
  )
}
```

#### 🔤 FontValueToken
```typescript
class FontValueToken extends ValueToken<'font'> {
  constructor(
    value: string,
    public readonly property: 'family' | 'size' | 'weight' | 'style'
  )
}
```

## Updated Namespaced API

### Color Tokens (Enhanced)
```typescript
val.color.hex('#3498db')        // ColorValueToken with format='hex'
val.color.lch('65% 40 250')     // ColorValueToken with format='lch'
val.color.oklch('0.7 0.15 250') // ColorValueToken with format='oklch'
val.color.css('rgba(255,0,0,0.5)') // ColorValueToken with format='css'
val.color.rgb('255, 0, 0')      // ColorValueToken with format='rgb'
val.color.hsl('120, 100%, 50%') // ColorValueToken with format='hsl'
val.color.lab('50% 20 -30')     // ColorValueToken with format='lab'
val.color.oklab('0.7 0.1 0.1')  // ColorValueToken with format='oklab'
```

### Size Tokens (New)
```typescript
val.size.px(24)        // SizeValueToken: "24px"
val.size.rem(2.5)      // SizeValueToken: "2.5rem"
val.size.em(1.2)       // SizeValueToken: "1.2em"
val.size.percent(100)  // SizeValueToken: "100%"
val.size.vw(80)        // SizeValueToken: "80vw"
val.size.vh(50)        // SizeValueToken: "50vh"
```

### Space Tokens (New)
```typescript
val.space.px(16)       // SpaceValueToken: "16px"
val.space.rem(1)       // SpaceValueToken: "1rem"
val.space.em(0.5)      // SpaceValueToken: "0.5em"
val.space.percent(50)  // SpaceValueToken: "50%"
```

### Font Tokens (New)
```typescript
val.font.family('Inter, sans-serif')  // FontValueToken: property='family'
val.font.size('2.5rem')               // FontValueToken: property='size'
val.font.weight('700')                // FontValueToken: property='weight'
val.font.style('italic')              // FontValueToken: property='style'
```

## Parser Support

The demo parser now recognizes all token types:

### Color Tokens
- `val.color.hex('#3498db')`
- `val.color.lch('65% 40 250')`
- `val.color.oklch('0.7 0.15 250')`

### Size Tokens
- `val.size.px(24)` → `"24px"`
- `val.size.rem(2.5)` → `"2.5rem"`
- `val.size.percent(100)` → `"100%"`

### Space Tokens
- `val.space.rem(1)` → `"1rem"`
- `val.space.px(16)` → `"16px"`

### Font Tokens
- `val.font.family('Inter, sans-serif')` → `"Inter, sans-serif"`
- `val.font.weight('700')` → `"700"`

## Demo Enhancements

### 🎨 Color-Coded Quick-Insert Buttons
- **Blue**: Color tokens
- **Green**: Size tokens  
- **Purple**: Space tokens
- **Orange**: Font tokens
- **Gray**: References and functions

### 📊 Token Type Display
The demo now shows token type information:
```
🎨 brand-hex: #3498db (color/hex)
📏 header-size: 2.5rem (size/rem)
📐 margin-lg: 2rem (space/rem)
🔤 font-primary: Inter, sans-serif (font/family)
```

## Benefits

### ✅ Type Safety
- Runtime type checking with `instanceof`
- Format/unit validation at creation time
- Better IDE support and autocomplete

### ✅ Organization
- Clear separation between different value types
- Consistent API across token categories
- Easy to add new types (animation, layout, etc.)

### ✅ Extensibility  
- Framework for future token types
- Standardized format/unit tracking
- Consistent patterns for new categories

### ✅ Debugging
- Clear token type identification
- Format information preserved
- Better error messages

## Files Updated

- ✅ `/src/system/index.ts` - Added typed token classes and updated namespace
- ✅ `/demo/demo.ts` - Added demo of all token types with type display
- ✅ `/demo/demoInputParser.ts` - Added parser support for new token types
- ✅ `/demo/index.html` - Added color-coded quick-insert buttons and examples

## Future Token Types

The architecture is ready for additional token types:

```typescript
// Animation tokens
val.animation.duration(300)     // "300ms"
val.animation.easing('ease-in') // "ease-in"

// Layout tokens  
val.layout.grid(12)             // "repeat(12, 1fr)"
val.layout.flex('1 1 auto')     // "1 1 auto"

// Shadow tokens
val.shadow.box('0 4px 6px -1px rgba(0, 0, 0, 0.1)')
val.shadow.text('1px 1px 2px rgba(0, 0, 0, 0.5)')
```

## TypeScript Benefits

```typescript
function processToken(token: Token) {
  if (token instanceof ColorValueToken) {
    console.log(`Color in ${token.format} format: ${token.value}`);
  } else if (token instanceof SizeValueToken) {
    console.log(`Size in ${token.unit}: ${token.value}`);
  }
  // Fully type-safe!
}
```

---

**Status**: ✅ COMPLETE - Typed value tokens fully implemented and demonstrated
