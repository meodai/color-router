import { DesignSystem, ref, val, func } from './index';

// Create a design system
const designSystem = new DesignSystem('MyDesignSystem');

// Register custom functions
designSystem.registerFunction('bestContrastWith', (_color: string, ...candidates: string[]) => {
  // Implementation would go here - find best contrast color
  return candidates[0] || '#000000';
}, { isPaletteAware: true });

// Create base scope
const base = designSystem.addScope('base', { description: 'Base color palette' });

// Set basic colors using namespaced value tokens
base.set('primary', val.color.hex('#3498db'));
base.set('secondary', val.color.hex('#2ecc71'));
base.set('danger', val.color.hex('#e74c3c'));
base.set('warning', val.color.hex('#f39c12'));

// Set semantic colors using references
base.set('text', ref('primary'));
base.set('background', val.color.hex('#ffffff'));

// Create a dark theme that extends base
const dark = designSystem.addScope('dark', { 
  extends: 'base', 
  description: 'Dark theme variant' 
});

// Override colors for dark theme
dark.set('background', val.color.hex('#1a1a1a'));
dark.set('text', val.color.hex('#ffffff'));

// Create component-specific scope
const button = designSystem.addScope('button', { description: 'Button component tokens' });

// Use function to calculate contrast
const router = designSystem.getRouter();
button.set('primary-bg', ref('base.primary'));
button.set('primary-text', func.color.bestContrastWith(router, ref('button.primary-bg'), val.color.hex('#ffffff'), val.color.hex('#000000')));

// Example usage:
console.log('Primary color:', designSystem.resolve('base.primary'));
console.log('Button primary text:', designSystem.resolve('button.primary-text'));
console.log('Dark theme background:', designSystem.resolve('dark.background'));

// Listen for changes
designSystem.onChange((changes: any) => {
  console.log('Design system changes:', changes);
});

// Example of batch updates
designSystem.setMode('batch');
base.set('primary', val.color.hex('#2980b9')); // Darker blue
base.set('secondary', val.color.hex('#27ae60')); // Darker green
designSystem.flush(); // Apply all changes at once

export { designSystem };
