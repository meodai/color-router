import * as culori from 'culori';
import { ColorRenderer, SVGRenderer } from '../src/renderers';
import { parseDemoInput } from './demoInputParser'; // Import the new parser
import { DesignSystem, ref, val, func, ColorValueToken, SizeValueToken, SpaceValueToken, FontValueToken } from '../src/system'; // Import the Design System API

// Create a design system instance
const designSystem = new DesignSystem('TokenEngineDemo');
const engine = designSystem.getEngine(); // Get the underlying engine

// TODO: Re-implement renderer system for TokenEngine architecture
// function registerAllFunctionRenderers() - REMOVED for now

function logEvent(message: string): void {
  const container = document.getElementById('event-log-container');
  if (container) {
    container.innerHTML =
      `<p><span class="text-gray-400">${new Date().toLocaleTimeString()}</span> &mdash; ${message}</p>` +
      container.innerHTML;
  }
}

// TokenEngine doesn't have a setLogCallback method yet, we'll handle logging differently
// engine.setLogCallback(logEvent);

// Helper functions for token type detection and value conversion
function getDefinitionType(definition: any): 'value' | 'reference' | 'function' {
  if (!definition) return 'value';
  if (typeof definition === 'string') return 'value';
  
  // Check for ColorFunction first by functionName property (most reliable)
  if (definition.functionName && definition.args) return 'function';
  
  // Check for ColorReference (has Symbol.for('ColorReference'))
  if (definition.type === Symbol.for('ColorReference')) return 'reference';
  
  // Check for ColorFunction (has Symbol.for('ColorFunction'))
  if (definition.type === Symbol.for('ColorFunction')) return 'function';
  
  // Legacy string-based checks (for backwards compatibility)
  if (definition.type === 'reference') return 'reference';
  if (definition.type === 'function') return 'function';
  
  return 'value';
}

function valueToString(definition: any): string {
  if (!definition) return '';
  if (typeof definition === 'string') return definition;
  
  // Check for ColorFunction first by functionName property (most reliable)
  if (definition.functionName && definition.args) {
    const functionName = definition.functionName;
    const args = definition.args ? definition.args.join(', ') : '';
    return `func.${functionName}(${args})`;
  }
  
  // Check for ColorReference (has Symbol.for('ColorReference'))
  if (definition.type === Symbol.for('ColorReference')) {
    return `ref(${definition.key})`;
  }
  
  // Check for ColorFunction (has Symbol.for('ColorFunction'))
  if (definition.type === Symbol.for('ColorFunction')) {
    const functionName = definition.functionName || 'unknown';
    const args = definition.args ? definition.args.join(', ') : '';
    return `func.${functionName}(${args})`;
  }
  
  // Legacy string-based checks (for backwards compatibility)
  if (definition.type === 'reference') return `ref(${definition.key})`;
  if (definition.type === 'function') {
    const functionName = definition.functionName || 'unknown';
    const args = definition.args ? definition.args.join(', ') : '';
    return `func.${functionName}(${args})`;
  }
  
  return JSON.stringify(definition);
}

function renderPalettes(): void {
  const container = document.getElementById('palettes-container');
  if (!container) return;

  container.innerHTML = '';
  
  // Get all scopes from the design system
  designSystem.getAllScopes().forEach((scope) => {
    const paletteDiv = document.createElement('div');
    paletteDiv.className = 'bg-white p-6 shadow-sm border border-gray-200 fade-in';
    
    // All scopes are scopes now, no more "palettes" distinction
    let titleHtml = `<div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <h3 class="text-xl text-gray-800">${scope.name}</h3>
        <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">Scope</span>
      </div>
      <button class="clone-scope-btn text-xs px-2 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200 rounded" data-scope="${scope.name}">Clone as Theme</button>
    </div>`;
    
    if (scope.options.extends) {
      titleHtml += `<p class="text-sm text-gray-500">extends <span class="font-medium text-indigo-600">${scope.options.extends}</span></p>`;
    }
    
    if (scope.options.description) {
      titleHtml += `<p class="text-sm text-gray-600 italic">${scope.options.description}</p>`;
    }

    const keys = engine.getAllTokensForScope(scope.name);
    let colorsHtml = '<div class="mt-4 space-y-3">';
    if (keys.length > 0) {
      keys.sort().forEach((key) => {
        const shortKey = key.split('.').slice(1).join('.');
        const definition = engine.getDefinition(key);
        const resolvedValue = engine.resolve(key) || '#transparent';
        
        // Get token type indicator
        const defType = getDefinitionType(definition);
        const typeColor = defType === 'reference' ? 'text-blue-600' : 
                         defType === 'function' ? 'text-green-600' : 'text-gray-600';
        const typeIcon = defType === 'reference' ? '🔗' : 
                        defType === 'function' ? '⚡' : '🎨';
        
        colorsHtml += `
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-3">
              <div class="color-swatch" style="background-color: ${resolvedValue};"></div>
              <div>
                <p class="font-semibold text-gray-900">${shortKey} <span class="${typeColor}" title="${defType}">${typeIcon}</span></p>
                <p class="font-mono text-xs text-gray-500">${valueToString(definition)}</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <p class="font-mono text-gray-700">${resolvedValue}</p>
              <button class="edit-color-btn text-indigo-600 hover:text-indigo-800 text-xs" data-key="${key}" title="Edit this color">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                </svg>
              </button>
            </div>
          </div>`;
      });
    } else {
      colorsHtml += `<p class="text-sm text-gray-500">No colors defined yet.</p>`;
    }
    paletteDiv.innerHTML = titleHtml + colorsHtml + '</div>';
    container.appendChild(paletteDiv);
  });
}

function renderOutput(): void {
  const activeTab = document.querySelector('.tab-button.active') as HTMLElement;
  const format = activeTab?.dataset.tab || 'css-variables';
  const outputContainer = document.getElementById('output-container');
  if (!outputContainer) return;

  try {
    if (format === 'svg') {
      try {
        const svgRenderer = new SVGRenderer(designSystem);
        const svgContent = svgRenderer.render();
        outputContainer.innerHTML = `
          <div class="bg-white p-4 h-96 overflow-auto flex items-center justify-center svg-container">
            ${svgContent}
          </div>
        `;
      } catch (e) {
        outputContainer.innerHTML = `
          <div class="bg-white p-4 h-96 overflow-auto flex items-center justify-center svg-container">
            <p class="text-red-500">Error rendering SVG: ${(e as Error).message}</p>
          </div>
        `;
      }
    } else {
      const codeEl = document.getElementById('output-code');
      if (!codeEl) {
        outputContainer.innerHTML = `
          <div class="bg-gray-900 p-4 h-96 overflow-auto">
            <pre><code id="output-code" class="language-${format} text-sm text-gray-200 font-mono"></code></pre>
          </div>
        `;
      }

      // Create simple CSS variables renderer for now
      let output = '';
      if (format === 'css-variables') {
        output = ':root {\n';
        designSystem.getAllScopes().forEach(scope => {
          const tokens = scope.allTokens();
          Object.entries(tokens).forEach(([name, token]) => {
            const fullKey = `${scope.name}.${name}`;
            const value = engine.resolve(fullKey);
            output += `  --${scope.name}-${name}: ${value};\n`;
          });
        });
        output += '}';
      } else if (format === 'json') {
        const result: any = {};
        designSystem.getAllScopes().forEach(scope => {
          result[scope.name] = {};
          const tokens = scope.allTokens();
          Object.entries(tokens).forEach(([name, token]) => {
            const fullKey = `${scope.name}.${name}`;
            result[scope.name][name] = engine.resolve(fullKey);
          });
        });
        output = JSON.stringify(result, null, 2);
      }

      const newCodeEl = document.getElementById('output-code')!;
      newCodeEl.textContent = output;
      newCodeEl.className = `language-${format} text-sm text-gray-200 font-mono`;
    }
  } catch (e) {
    const codeEl = document.getElementById('output-code');
    if (codeEl) {
      codeEl.textContent = `Error rendering output:\n${(e as Error).message}`;
    } else {
      outputContainer.innerHTML = `
        <div class="bg-gray-900 p-4 h-96 overflow-auto">
          <pre class="text-red-400 text-sm">Error rendering output:\n${(e as Error).message}</pre>
        </div>
      `;
    }
  }
}

function renderColorDemo(): void {
  const container = document.getElementById('color-demo-container');
  if (!container) return;

  try {
    // Create simple CSS variables output for demo
    let cssOutput = ':root {\n';
    designSystem.getAllScopes().forEach(scope => {
      const tokens = scope.allTokens();
      Object.entries(tokens).forEach(([name, token]) => {
        const fullKey = `${scope.name}.${name}`;
        const value = engine.resolve(fullKey);
        cssOutput += `  --${scope.name}-${name}: ${value};\n`;
      });
    });
    cssOutput += '}';

    let demoStyle = document.getElementById('demo-styles') as HTMLStyleElement;
    if (!demoStyle) {
      demoStyle = document.createElement('style');
      demoStyle.id = 'demo-styles';
      document.head.appendChild(demoStyle);
    }
    demoStyle.textContent = cssOutput;

    container.innerHTML = `
      <div class="p-6 rounded-lg border shadow-sm" style="background-color: var(--surface-background, #ffffff); border-color: var(--surface-line, #cccccc); color: var(--surface-onBackground, #0f172a);">
        <h3 class="text-xl font-medium mb-3">Default Surface</h3>
        <p class="text-sm mb-4 opacity-75">This is a standard surface using background, onBackground, interaction, onInteraction, and line colors.</p>
        <div class="flex flex-wrap gap-2 mb-4">
          <button class="px-4 py-2 text-sm font-medium rounded transition-colors" style="background-color: var(--surface-interaction, #0066cc); color: var(--surface-onInteraction, #ffffff);">Primary Action</button>
          <button class="px-3 py-2 text-sm font-medium rounded border transition-colors" style="border-color: var(--surface-interaction, #0066cc); color: var(--surface-interaction, #0066cc); background-color: transparent;">Secondary</button>
        </div>
        <div class="text-xs space-y-1 opacity-75">
          <p><strong>Color System (Default Surface):</strong></p>
          <p>• Background: <code>var(--surface-background)</code></p>
          <p>• On Background: <code>var(--surface-onBackground)</code></p>
          <p>• Interaction: <code>var(--surface-interaction)</code></p>
          <p>• On Interaction: <code>var(--surface-onInteraction)</code></p>
          <p>• Line: <code>var(--surface-line)</code></p>
        </div>
      </div>
    `;
  } catch (e) {
    container.innerHTML = `<p class="text-red-500 text-sm">Error rendering demo: ${(e as Error).message}</p>`;
  }
}

function renderSVGVisualization(): void {
  const container = document.getElementById('svg-visualization-container');
  if (!container) return;

  try {
    const svgRenderer = new SVGRenderer(designSystem);
    const svgContent = svgRenderer.render();
    container.innerHTML = `
      <div class="svg-container w-full h-full">
        ${svgContent}
      </div>
    `;
  } catch (e) {
    container.innerHTML = `
      <div class="text-center text-red-500">
        <svg class="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <p class="text-lg font-medium">Error rendering visualization</p>
        <p class="text-sm">${(e as Error).message}</p>
      </div>
    `;
  }
}

document.getElementById('create-palette')?.addEventListener('click', () => {
  const nameInput = document.getElementById('palette-name') as HTMLInputElement;
  if (nameInput?.value) {
    try {
      // Create a new scope instead of a palette
      designSystem.addScope(nameInput.value, { description: `Scope created via UI` });
      nameInput.value = '';
      renderPalettes();
      renderOutput();
      renderColorDemo();
      renderSVGVisualization();
      logEvent(`<span class="text-green-600">Created scope:</span> ${nameInput.value}`);
    } catch (e) {
      logEvent(`<span class="text-red-500">ERROR:</span> ${(e as Error).message}`);
    }
  }
});

document.getElementById('define-color')?.addEventListener('click', () => {
  const keyInput = document.getElementById('color-key') as HTMLInputElement;
  const valueInput = document.getElementById('color-value') as HTMLInputElement;
  if (!keyInput?.value || !valueInput?.value) return;

  try {
    const colorDefinition = parseDemoInput(valueInput.value, engine);
    
    // Use define for new colors, set for existing ones
    if (engine.has(keyInput.value)) {
      engine.set(keyInput.value, colorDefinition as any);
    } else {
      engine.define(keyInput.value, colorDefinition as any);
    }

    // Clear inputs after successful definition
    // keyInput.value = ''; // Optional: clear key as well
    valueInput.value = '';

    renderPalettes();
    renderOutput();
    renderColorDemo();
    renderSVGVisualization();
  } catch (e) {
    logEvent(`<span class="text-red-500">ERROR:</span> ${(e as Error).message}`);
  }
});

document.getElementById('clear-form')?.addEventListener('click', () => {
  const keyInput = document.getElementById('color-key') as HTMLInputElement;
  const valueInput = document.getElementById('color-value') as HTMLInputElement;
  if (keyInput) keyInput.value = '';
  if (valueInput) valueInput.value = '';
  logEvent('Form cleared');
});

document.querySelectorAll('.tab-button').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-button').forEach((b) => b.classList.remove('active'));
    (e.target as HTMLElement).classList.add('active');
    renderOutput();
    renderColorDemo();
    renderSVGVisualization();
  });
});

document.getElementById('show-connections')?.addEventListener('change', () => {
  renderSVGVisualization();
});

// Design System API event handlers
document.getElementById('create-scope')?.addEventListener('click', () => {
  const nameInput = document.getElementById('scope-name') as HTMLInputElement;
  const extendsInput = document.getElementById('scope-extends') as HTMLInputElement;
  
  if (nameInput?.value) {
    try {
      const options: { extends?: string; description?: string } = {
        description: `${nameInput.value} scope created via Design System API`
      };
      
      if (extendsInput?.value) {
        options.extends = extendsInput.value;
      }
      
      designSystem.addScope(nameInput.value, options);
      nameInput.value = '';
      extendsInput.value = '';
      
      renderPalettes();
      renderOutput();
      renderColorDemo();
      renderSVGVisualization();
      updateDesignSystemInfo();
      
      logEvent(`<span class="text-green-600">Created scope:</span> ${nameInput.value}${options.extends ? ` (extends ${options.extends})` : ''}`);
    } catch (e) {
      logEvent(`<span class="text-red-500">ERROR:</span> ${(e as Error).message}`);
    }
  }
});

// Function to update design system information display
function updateDesignSystemInfo(): void {
  const systemNameEl = document.getElementById('system-name');
  const scopeCountEl = document.getElementById('scope-count');
  const systemModeEl = document.getElementById('system-mode');
  
  if (systemNameEl) systemNameEl.textContent = designSystem.name;
  if (scopeCountEl) scopeCountEl.textContent = designSystem.getAllScopes().length.toString();
  if (systemModeEl) systemModeEl.textContent = engine.mode;
}

// Add event listeners for quick example buttons
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  if (target.classList.contains('quick-example-btn')) {
    const value = target.dataset.value;
    const valueInput = document.getElementById('color-value') as HTMLInputElement;
    if (value && valueInput) {
      valueInput.value = value;
      logEvent(`<span class="text-blue-600">Example inserted:</span> ${value}`);
    }
  }
  
  // Handle clone scope button
  if (target.classList.contains('clone-scope-btn')) {
    const sourceScopeName = target.dataset.scope;
    if (sourceScopeName) {
      const themeName = `${sourceScopeName}-theme`;
      try {
        const themeScope = designSystem.addScope(themeName, { 
          extends: sourceScopeName, 
          description: `Theme variant of ${sourceScopeName} scope` 
        });
        
        renderPalettes();
        renderOutput();
        renderColorDemo();
        renderSVGVisualization();
        updateDesignSystemInfo();
        
        logEvent(`<span class="text-purple-600">Created theme:</span> ${themeName} extending ${sourceScopeName}`);
        logEvent(`💡 Try overriding some colors in the ${themeName} scope to see inheritance in action!`);
      } catch (e) {
        logEvent(`<span class="text-red-500">ERROR:</span> ${(e as Error).message}`);
      }
    }
  }
});

document.getElementById('refresh-viz')?.addEventListener('click', () => {
  renderSVGVisualization();
});

document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const editBtn = target.closest('.edit-color-btn') as HTMLElement;
  if (editBtn) {
    const key = editBtn.dataset.key;
    if (key) editColor(key);
  }
});

function editColor(key: string): void {
  const definition = engine.getDefinition(key);
  const currentValue = valueToString(definition);

  const keyInput = document.getElementById('color-key') as HTMLInputElement;
  const valueInput = document.getElementById('color-value') as HTMLInputElement;
  if (keyInput) keyInput.value = key;
  if (valueInput) valueInput.value = currentValue;

  const colorForm = keyInput?.closest('div')?.closest('div') as HTMLElement;
  if (colorForm) {
    colorForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    colorForm.style.border = '2px solid #4f46e5';
    colorForm.style.borderRadius = '8px';
    colorForm.style.padding = '1rem';

    setTimeout(() => {
      colorForm.style.border = '';
      colorForm.style.borderRadius = '';
      colorForm.style.padding = '';
    }, 3000);
  }

  logEvent(`Editing color '${key}' - current value: ${currentValue}`);
}

// Note: Custom function registration would be done differently with TokenEngine
// For now, we'll use the built-in functions only

function setupInitialState(): void {
  logEvent('🎨 Initializing Design System demo...');

  // Create base scope with core colors using the new Design System API
  const base = designSystem.addScope('base', { description: 'Foundation colors for the design system' });
  base.set('light', val.color.hex('#ffffff'));
  base.set('dark', val.color.hex('#202126'));
  base.set('accent', val.color.hex('#1a0dab'));
  base.set('attention', func.color.relativeTo(engine, 'base.accent', 'oklch', ['+0.35', '0.2', '+120']));

  // Create color ramp scope
  const ramp = designSystem.addScope('ramp', { description: 'Color scale from light to dark' });
  ramp.set('0', ref('base.light'));
  ramp.set('900', ref('base.dark'));
  for (let i = 8; i >= 1; i--) {
    const step = i * 0.1;
    ramp.set(`${i}00`, func.color.mix(engine, 'ramp.0', 'ramp.900', step, 'oklab'));
  }

  // Create demo scope with various color manipulations
  const demo = designSystem.addScope('demo', { description: 'Demonstration colors showing different functions' });
  demo.set('primary', ref('base.accent'));
  demo.set('secondary', ref('base.attention'));
  demo.set('lighter', func.color.lighten(engine, 'demo.primary', 0.2));
  demo.set('darker', func.color.darken(engine, 'demo.primary', 0.2));
  demo.set('contrast', func.color.bestContrastWith(engine, 'demo.primary', 'ramp'));
  demo.set('relative', func.color.relativeTo(engine, 'demo.primary', 'r g b / 0.7'));
  demo.set('minContrast', func.color.minContrastWith(engine, 'demo.primary', 'ramp', 2.5));
  demo.set('mixed', func.color.mix(engine, 'demo.secondary', 'demo.minContrast', 0.7, 'lab'));
  demo.set('furthest', func.color.furthestFrom(engine, 'base'));

  // Create scale scope demonstrating color interpolation
  const scale = designSystem.addScope('scale', { description: 'Color scale between two colors' });
  scale.set('0', ref('base.accent'));
  scale.set('4', ref('base.attention'));
  scale.set('1', func.color.mix(engine, 'scale.0', 'scale.4', 0.25, 'oklab'));
  scale.set('2', func.color.mix(engine, 'scale.0', 'scale.4', 0.5, 'oklab'));
  scale.set('3', func.color.mix(engine, 'scale.0', 'scale.4', 0.75, 'oklab'));

  // Create surface scope for UI components
  const surface = designSystem.addScope('surface', { description: 'Surface and interaction colors' });
  surface.set('background', ref('ramp.0'));
  surface.set('onBackground', func.color.bestContrastWith(engine, 'surface.background', 'ramp'));
  surface.set('interaction', ref('base.accent'));
  surface.set('onInteraction', func.color.bestContrastWith(engine, 'surface.interaction', 'ramp'));
  surface.set('line', func.color.minContrastWith(engine, 'surface.background', 'ramp', 1.7));

  // Create a themed scope that extends base to show inheritance
  const darkTheme = designSystem.addScope('dark', { 
    extends: 'base', 
    description: 'Dark theme variant extending base colors' 
  });
  darkTheme.set('light', val.color.hex('#1a1a1a'));  // Override light with dark value
  darkTheme.set('dark', val.color.hex('#ffffff'));   // Override dark with light value
  
  designSystem.flush();

  logEvent('✨ Design System initialized with scopes: base, ramp, demo, scale, surface, dark');
  logEvent('🔧 Try creating a new scope or using token syntax like val.color.hex(), ref(), or func.color.*!');

  console.log('Scale scope keys:', engine.getAllTokensForScope('scale'));
  console.log(
    'Scale scope colors:',
    engine.getAllTokensForScope('scale').map((k) => ({ key: k, color: engine.resolve(k) })),
  );
  console.log('demo.furthest resolves to:', engine.resolve('demo.furthest'));

  logRendererComparison();

  logEvent('• BASE: Foundation colors (light, dark, accent, attention)');
  logEvent(
    '• DEMO: Function demonstration (colorMix, lighten, darken, bestContrastWith, relativeTo, minContrastWith, furthestFrom)',
  );
  logEvent('• SCALE: Systematic neutral scale - 900=base.dark, others lighten progressively');
  logEvent('• SURFACE: Default UI surface colors (background, text, interaction, lines)');
  logEvent('Try changing base.dark to see entire scale update automatically!');

  demonstrateDependencyGraph();

  renderPalettes();
  renderOutput();
  renderColorDemo();
  renderSVGVisualization();
}

function demonstrateDependencyGraph(): void {
  logEvent('🔗 DEPENDENCY GRAPH ANALYSIS:');
  
  // TODO: Update dependency graph access for TokenEngine
  // For now, we'll skip the detailed dependency analysis
  logEvent('📊 Dependency graph analysis temporarily disabled during refactor');
  
  // Basic connectivity information from engine
  const allTokens: string[] = [];
  designSystem.getAllScopes().forEach(scope => {
    const scopeTokens = engine.getAllTokensForScope(scope.name);
    allTokens.push(...scopeTokens);
  });
  
  logEvent(`📊 Total tokens: ${allTokens.length}`);
  
  // Show some basic dependency information
  try {
    const baseDeps = engine.getDependencies('base.accent');
    logEvent(`🔗 'base.accent' dependencies: ${baseDeps.length > 0 ? baseDeps.join(', ') : 'none'}`);
    
    const demoDeps = engine.getDependents('base.accent');
    logEvent(`� Tokens depending on 'base.accent': ${demoDeps.length > 0 ? demoDeps.join(', ') : 'none'}`);
  } catch (e) {
    logEvent(`⚠️ Dependency analysis error: ${(e as Error).message}`);
  }
}

function logRendererComparison(): void {
  logEvent('� RENDERER COMPARISON:');

  // Simple comparison with our basic renderer
  try {
    // CSS Variables format
    let cssOutput = ':root {\n';
    designSystem.getAllScopes().forEach(scope => {
      const tokens = scope.allTokens();
      Object.entries(tokens).forEach(([name, token]) => {
        const fullKey = `${scope.name}.${name}`;
        const value = engine.resolve(fullKey);
        cssOutput += `  --${scope.name}-${name}: ${value};\n`;
      });
    });
    cssOutput += '}';
    
    const cssLines = cssOutput.split('\n').slice(0, 8).join('\n');
    logEvent(
      `<strong>CSS VARIABLES:</strong><br><code style="font-size: 11px; color: #666; white-space: pre-wrap;">${cssLines}...</code>`,
    );
    
    // JSON format
    const result: any = {};
    designSystem.getAllScopes().forEach(scope => {
      result[scope.name] = {};
      const tokens = scope.allTokens();
      Object.entries(tokens).forEach(([name, token]) => {
        const fullKey = `${scope.name}.${name}`;
        result[scope.name][name] = engine.resolve(fullKey);
      });
    });
    const jsonOutput = JSON.stringify(result, null, 2);
    const jsonLines = jsonOutput.split('\n').slice(0, 8).join('\n');
    logEvent(
      `<strong>JSON:</strong><br><code style="font-size: 11px; color: #666; white-space: pre-wrap;">${jsonLines}...</code>`,
    );

    // Try to get surface text color
    try {
      const surfaceOnInteraction = engine.resolve('surface.onInteraction');
      logEvent(`🎯 SURFACE TEXT COLOR: --surface-onInteraction: ${surfaceOnInteraction}`);
    } catch (e) {
      logEvent(`⚠️ Could not resolve surface.onInteraction: ${(e as Error).message}`);
    }
  } catch (e) {
    logEvent(`⚠️ Renderer comparison error: ${(e as Error).message}`);
  }
}

// Listen for changes in the design system
designSystem.onChange((changes) => {
  changes.forEach((change) => {
    const oldValue = change.oldValue || 'undefined';
    logEvent(
      `CHANGE: '${change.key}' from ${oldValue} to <span class="font-bold" style="color:${change.newValue}; text-shadow: 0 0 5px rgba(0,0,0,0.5);">${change.newValue}</span>`,
    );
  });
});

setupInitialState();

// Initial renders
renderPalettes();
renderOutput();
renderColorDemo();
renderSVGVisualization();
updateDesignSystemInfo();

// Demonstrate typed value tokens
logEvent('🎨 Creating typed value tokens...');
  
// Create a tokens scope to demonstrate different value types
const tokens = designSystem.addScope('tokens', { description: 'Mixed token types demonstration' });
  
// Color tokens (already working)
tokens.set('brand-hex', val.color.hex('#3498db'));
tokens.set('brand-lch', val.color.lch('65% 40 250'));
tokens.set('brand-oklch', val.color.oklch('0.7 0.15 250'));
  
// Size tokens (future-ready)
tokens.set('header-size', val.size.rem(2.5));
tokens.set('body-size', val.size.px(16));
tokens.set('icon-size', val.size.em(1.2));
tokens.set('full-width', val.size.percent(100));
tokens.set('viewport-width', val.size.vw(80));
tokens.set('viewport-height', val.size.vh(50));
  
// Space tokens (future-ready)
tokens.set('margin-sm', val.space.rem(0.5));
tokens.set('margin-md', val.space.rem(1));
tokens.set('margin-lg', val.space.rem(2));
tokens.set('padding-base', val.space.px(16));
  
// Font tokens (future-ready)
tokens.set('font-primary', val.font.family('Inter, system-ui, sans-serif'));
tokens.set('font-mono', val.font.family('JetBrains Mono, monospace'));
tokens.set('heading-size', val.font.size('2.5rem'));
tokens.set('font-bold', val.font.weight('700'));
tokens.set('font-italic', val.font.style('italic'));
  
logEvent('✅ Token types created:');
logEvent('  • Color tokens: brand-hex, brand-lch, brand-oklch');
logEvent('  • Size tokens: header-size, body-size, icon-size, full-width, viewport-width, viewport-height');
logEvent('  • Space tokens: margin-sm/md/lg, padding-base');
logEvent('  • Font tokens: font-primary/mono, heading-size, font-bold, font-italic');
  
// Log token details with types
const allTokens = tokens.allTokens();
Object.entries(allTokens).forEach(([name, token]) => {
    if (token instanceof ColorValueToken) {
      logEvent(`  🎨 ${name}: ${token.value} (color/${token.format})`);
    } else if (token instanceof SizeValueToken) {
      logEvent(`  📏 ${name}: ${token.value} (size/${token.unit})`);
    } else if (token instanceof SpaceValueToken) {
      logEvent(`  📐 ${name}: ${token.value} (space/${token.unit})`);
    } else if (token instanceof FontValueToken) {
      logEvent(`  🔤 ${name}: ${token.value} (font/${token.property})`);
    } else {
      logEvent(`  📄 ${name}: ${token.resolve({ resolve: (p) => p })}`);
    }
  });