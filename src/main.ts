import * as culori from 'culori';
import { ColorRouter } from './ColorRouter';
import { ColorRenderer } from './ColorRenderer';
import { SVGRenderer } from './SVGRenderer';
import { 
  bestContrastWithRenderers,
  colorMixRenderers,
  relativeToRenderers,
  minContrastWithRenderers,
  lightenRenderers,
  darkenRenderers,
  furthestFromRenderers
} from './colorFunctions';

// --- UI & DEMO LOGIC ---
const router = new ColorRouter();

// Inject ColorRenderer to avoid circular imports
router.setColorRenderer(ColorRenderer);

// Register function renderers for all output formats
function registerAllFunctionRenderers() {
  const rendererSets = [
    { name: 'bestContrastWith', renderers: bestContrastWithRenderers },
    { name: 'colorMix', renderers: colorMixRenderers },
    { name: 'relativeTo', renderers: relativeToRenderers },
    { name: 'minContrastWith', renderers: minContrastWithRenderers },
    { name: 'lighten', renderers: lightenRenderers },
    { name: 'darken', renderers: darkenRenderers },
    { name: 'furthestFrom', renderers: furthestFromRenderers }
  ];

  // Register renderers for all formats
  const formats: ('css-variables' | 'scss' | 'json')[] = ['css-variables', 'scss', 'json'];
  
  formats.forEach(format => {
    const renderer = router.createRenderer(format);
    rendererSets.forEach(({ name, renderers }) => {
      const formatRenderer = renderers[format];
      if (formatRenderer) {
        renderer.registerFunctionRenderer(name, formatRenderer);
      }
    });
  });
}

// Register all function renderers
registerAllFunctionRenderers();

function logEvent(message: string): void {
  const container = document.getElementById('event-log-container');
  if (container) {
    container.innerHTML = `<p><span class="text-gray-400">${new Date().toLocaleTimeString()}</span> &mdash; ${message}</p>` + container.innerHTML;
  }
}

// Set up logging callback
router.setLogCallback(logEvent);

function renderPalettes(): void {
  const container = document.getElementById('palettes-container');
  if (!container) return;
  
  container.innerHTML = '';
  // Use a getter method to access private palettes
  router.getAllPalettes().forEach(({ name, config }) => {
    const paletteDiv = document.createElement('div');
    paletteDiv.className = 'bg-white p-6 shadow-sm border border-gray-200 fade-in';
    let titleHtml = `<h3 class="text-xl text-gray-800">${name}</h3>`;
    if (config.extends) {
      titleHtml += `<p class="text-sm text-gray-500">extends <span class="font-medium text-indigo-600">${config.extends}</span></p>`;
    }
    
    const keys = router.getAllKeysForPalette(name);
    let colorsHtml = '<div class="mt-4 space-y-3">';
    if (keys.length > 0) {
      keys.sort().forEach(key => {
        const shortKey = key.split('.').slice(1).join('.');
        const definition = router.getDefinitionForKey(key);
        const resolvedValue = router.resolve(key) || '#transparent';
        colorsHtml += `
          <div class="flex items-center justify-between text-sm">
            <div class="flex items-center gap-3">
              <div class="color-swatch" style="background-color: ${resolvedValue};"></div>
              <div>
                <p class="font-semibold text-gray-900">${shortKey}</p>
                <p class="font-mono text-xs text-gray-500">${router.valueToString(definition)}</p>
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
      // SVG visualization mode
      const svgRenderer = new SVGRenderer(router, {
        showConnections: true,
        gap: 20,
        padding: 0.1,
        fontSize: 10,
        strokeWidth: 2,
        dotRadius: 4
      });
      const svgContent = svgRenderer.render();
      
      outputContainer.innerHTML = `
        <div class="bg-white p-4 h-96 overflow-auto flex items-center justify-center svg-container">
          ${svgContent}
        </div>
      `;
    } else {
      // Standard text output mode
      const codeEl = document.getElementById('output-code');
      if (!codeEl) {
        outputContainer.innerHTML = `
          <div class="bg-gray-900 p-4 h-96 overflow-auto">
            <pre><code id="output-code" class="language-${format} text-sm text-gray-200 font-mono"></code></pre>
          </div>
        `;
      }
      
      const renderer = router.createRenderer(format as 'css-variables' | 'scss' | 'json');
      const newCodeEl = document.getElementById('output-code')!;
      newCodeEl.textContent = renderer.render();
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
    // Get the CSS variables output and inject it into a style element
    const renderer = router.createRenderer('css-variables');
    const cssOutput = renderer.render();
    
    // Create or update the demo styles
    let demoStyle = document.getElementById('demo-styles') as HTMLStyleElement;
    if (!demoStyle) {
      demoStyle = document.createElement('style');
      demoStyle.id = 'demo-styles';
      document.head.appendChild(demoStyle);
    }
    demoStyle.textContent = cssOutput;

    container.innerHTML = `
      <!-- Surface Demo -->
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
    const showConnections = (document.getElementById('show-connections') as HTMLInputElement)?.checked ?? true;
    
    const svgRenderer = new SVGRenderer(router, {
      showConnections,
      gap: 25,
      padding: 0.15,
      fontSize: 10,
      strokeWidth: 1.5,
      dotRadius: 3,
      lineHeight: 1.4,
      widthPerLetter: 6
    });
    
    const svgContent = svgRenderer.render();
    
    container.innerHTML = `
      <div class="svg-container w-full h-full flex items-center justify-center">
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

// --- Event Listeners ---
document.getElementById('create-palette')?.addEventListener('click', () => {
  const nameInput = document.getElementById('palette-name') as HTMLInputElement;
  if (nameInput?.value) {
    try {
      router.createPalette(nameInput.value);
      nameInput.value = '';
      renderPalettes();
      renderOutput();
      renderColorDemo();
      renderSVGVisualization();
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
    let value: any = valueInput.value.trim();
    const refMatch = value.match(/ref\(['"](.*?)['"]\)/);
    const bestContrastMatch = value.match(/bestContrastWith\(['"](.*?)['"](?:,\s*['"](.*?)['"]\))?\)/);
    const colorMixMatch = value.match(/colorMix\(['"](.*?)['"],\s*['"](.*?)['"](?:,\s*(['"]*[\d.%]+['"]*))?\s*(?:,\s*['"](.*?)['"]\))?\)/);
    const relativeMatch = value.match(/relativeTo\(['"](.*?)['"],\s*['"](.*?)['"]\)/);
    const minContrastMatch = value.match(/minContrastWith\(['"](.*?)['"](?:,\s*([\d.]+))?\)/);
    const lightenMatch = value.match(/lighten\(['"](.*?)['"],\s*([\d.]+)\)/);
    const darkenMatch = value.match(/darken\(['"](.*?)['"],\s*([\d.]+)\)/);
    const funcMatch = value.match(/func\(['"](.*?)['"](?:,\s*(.*))?\)/);

    if (refMatch) {
      value = router.ref(refMatch[1]);
    } else if (bestContrastMatch) {
      const args = [bestContrastMatch[1]];
      if (bestContrastMatch[2]) args.push(bestContrastMatch[2]);
      value = router.func('bestContrastWith', ...args);
    } else if (colorMixMatch) {
      const color1 = colorMixMatch[1];
      const color2 = colorMixMatch[2];
      let ratio = colorMixMatch[3] || '0.5';
      const colorSpace = colorMixMatch[4] || 'lab';
      
      // Clean up quotes from ratio if present
      ratio = ratio.replace(/['"]/g, '');
      
      // Convert percentage string to numeric if needed
      if (ratio.includes('%')) {
        ratio = (parseFloat(ratio) / 100).toString();
      }
      
      value = router.func('colorMix', color1, color2, parseFloat(ratio), colorSpace);
    } else if (relativeMatch) {
      value = router.func('relativeTo', relativeMatch[1], relativeMatch[2]);
    } else if (minContrastMatch) {
      const ratio = minContrastMatch[2] ? parseFloat(minContrastMatch[2]) : 1.5;
      value = router.func('minContrastWith', minContrastMatch[1], ratio);
    } else if (lightenMatch) {
      value = router.func('lighten', lightenMatch[1], parseFloat(lightenMatch[2]));
    } else if (darkenMatch) {
      value = router.func('darken', darkenMatch[1], parseFloat(darkenMatch[2]));
    } else if (funcMatch) {
      const name = funcMatch[1];
      const args = funcMatch[2] ? JSON.parse(`[${funcMatch[2].replace(/'/g, '"')}]`) : [];
      value = router.func(name, ...args);
    }
    
    if (router.has(keyInput.value)) {
      router.set(keyInput.value, value);
    } else {
      router.define(keyInput.value, value);
    }
    
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

document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    (e.target as HTMLElement).classList.add('active');
    renderOutput();
    renderColorDemo();
    renderSVGVisualization();
  });
});

// Handle SVG visualization controls
document.getElementById('show-connections')?.addEventListener('change', () => {
  renderSVGVisualization();
});

document.getElementById('refresh-viz')?.addEventListener('click', () => {
  renderSVGVisualization();
});

// Handle edit color button clicks using event delegation
document.addEventListener('click', (e) => {
  const target = e.target as HTMLElement;
  const editBtn = target.closest('.edit-color-btn') as HTMLElement;
  if (editBtn) {
    const key = editBtn.dataset.key;
    if (key) editColor(key);
  }
});

function editColor(key: string): void {
  const definition = router.getDefinitionForKey(key);
  const currentValue = router.getRawValue(definition); // Use getRawValue for editing (no quotes)
  
  // Pre-fill the form with current values
  const keyInput = document.getElementById('color-key') as HTMLInputElement;
  const valueInput = document.getElementById('color-value') as HTMLInputElement;
  if (keyInput) keyInput.value = key;
  if (valueInput) valueInput.value = currentValue;
  
  // Scroll to and highlight the form
  const colorForm = keyInput?.closest('div')?.closest('div') as HTMLElement;
  if (colorForm) {
    colorForm.scrollIntoView({ behavior: 'smooth', block: 'center' });
    colorForm.style.border = '2px solid #4f46e5';
    colorForm.style.borderRadius = '8px';
    colorForm.style.padding = '1rem';
    
    // Remove highlight after a few seconds
    setTimeout(() => {
      colorForm.style.border = '';
      colorForm.style.borderRadius = '';
      colorForm.style.padding = '';
    }, 3000);
  }
  
  logEvent(`Editing color '${key}' - current value: ${currentValue}`);
}

// Register a function to find the closest color in a palette to a given color
router.registerFunction('closestColor', function(this: ColorRouter, target: string, paletteName: string, minDistance: number = 0): string {
  const keys = this.getAllKeysForPalette(paletteName);
  if (!keys.length) return '#transparent';
  
  const targetColor = culori.parse(target);
  if (!targetColor) return '#transparent';
  
  let closestKey = '';
  let closestDist = Infinity;

  const differenceFunction = culori.differenceCiede2000(1, 1, 1);

  for (const key of keys) {
    const resolvedColor = this.resolve(key);
    const color = culori.parse(resolvedColor);
    
    if (!color) continue;
    
    const dist = differenceFunction(targetColor, color);
    
    if (dist < closestDist && dist >= minDistance) {
      closestDist = dist;
      closestKey = key;
    }
  }
  
  const result = closestKey ? this.resolve(closestKey) : '';
  
  return result;
}.bind(router));

// --- Initial State & Demo Setup ---
function setupInitialState(): void {
  logEvent("Initializing ColorRouter demo...");

  // Base colors palette - foundation colors
  router.createPalette('base');
  router.define('base.light', '#ffffff');
  router.define('base.dark', '#202126');
  router.define('base.accent', '#1a0dab');
  router.define('base.attention', '#FF6347');

  // --- RAMP (was scale) palette (0-900) - systematic neutral ramp based on base.dark
  // Create this before demo palette since demo.contrast references it
  router.createPalette('ramp');
  router.define('ramp.0', router.ref('base.light'));  // Pure light
  router.define('ramp.900', router.ref('base.dark'));  // Pure dark
  // Generate ramp.100 to ramp.800 using a loop
  for (let i = 8; i >= 1; i--) {
    const step = i * 0.1;
    router.define(`ramp.${i}00`, router.func('colorMix', 'ramp.0', 'ramp.900', step, 'oklab'));
  }

  // --- RENDERER DEMONSTRATION PALETTE ---
  router.createPalette('demo');
  router.define('demo.primary', router.ref('base.accent'));
  router.define('demo.secondary', router.ref('base.attention'));
  
  // Demonstrate all function types with their renderers
  router.define('demo.lighter', router.func('lighten', 'demo.primary', 0.2));
  router.define('demo.darker', router.func('darken', 'demo.primary', 0.2));
  router.define('demo.contrast', router.func('bestContrastWith', 'demo.primary', 'ramp'));
  router.define('demo.relative', router.func('relativeTo', 'demo.primary', 'r g b / 0.7'));
  router.define('demo.minContrast', router.func('minContrastWith', 'demo.primary', 'ramp', 2.5));
  router.define('demo.mixed', router.func('colorMix', 'demo.secondary', 'demo.minContrast', 0.7, 'lab'));

  // --- SCALE (was bold-colors) PALETTE DEMO ---
  router.createPalette('scale');
  router.define('scale.0', router.ref('base.accent'));
  router.define('scale.4', router.ref('base.attention'));


  router.define('scale.1', router.func('colorMix', 'scale.0', 'scale.4', 0.25, 'oklab'));
  router.define('scale.2', router.func('colorMix', 'scale.0', 'scale.4', 0.5, 'oklab'));
  router.define('scale.3', router.func('colorMix', 'scale.0', 'scale.4', 0.75, 'oklab'));

  // Now that scale palette is created, add the furthest function demo
  router.define('demo.furthest', router.func('furthestFrom', 'base'));

  // --- SURFACE PALETTE (replaces Card) ---
  router.createPalette('surface');
  router.define('surface.background', router.ref('ramp.0')); // e.g., white
  router.define('surface.onBackground', router.func('bestContrastWith', 'surface.background', 'ramp'));
  router.define('surface.interaction', router.ref('base.accent')); // Primary accent
  router.define('surface.onInteraction', router.func('bestContrastWith', 'surface.interaction', 'ramp'));
  router.define('surface.line', router.func('minContrastWith', 'surface.background', 'ramp', 1.7)); // Subtle border

  router.flush();
  
  // Debug: Check what furthestFrom actually returns
  console.log('Scale palette keys:', router.getAllKeysForPalette('scale'));
  console.log('Scale palette colors:', router.getAllKeysForPalette('scale').map(k => ({ key: k, color: router.resolve(k) })));
  console.log('demo.furthest resolves to:', router.resolve('demo.furthest'));
  
  // Demonstrate renderer outputs
  logRendererComparison();
  
  logEvent("• BASE: Foundation colors (light, dark, accent, attention)");
  logEvent("• DEMO: Function demonstration (colorMix, lighten, darken, bestContrastWith, relativeTo, minContrastWith, furthestFrom)");
  logEvent("• SCALE: Systematic neutral scale - 900=base.dark, others lighten progressively");
  logEvent("• SURFACE: Default UI surface colors (background, text, interaction, lines)");
  logEvent("Try changing base.dark to see entire scale update automatically!");
  
  renderPalettes();
  renderOutput();
  renderColorDemo();
  renderSVGVisualization();
}

function logRendererComparison(): void {
  logEvent("🔧 RENDERER COMPARISON:");
  
  const formats: ('css-variables' | 'scss' | 'json')[] = ['css-variables', 'scss', 'json'];
  
  formats.forEach(format => {
    const renderer = router.createRenderer(format);
    const output = renderer.render();
    
    // Log a sample of the renderer output
    const lines = output.split('\n').slice(0, 8).join('\n');
    logEvent(`<strong>${format.toUpperCase()}:</strong><br><code style="font-size: 11px; color: #666; white-space: pre-wrap;">${lines}...</code>`);
  });
  
  // Also log some specific variables for debugging
  const cssRenderer = router.createRenderer('css-variables');
  const cssOutput = cssRenderer.render();
  const surfaceOnInteractionMatch = cssOutput.match(/--surface-onInteraction:\s*([^;]+);/);
  if (surfaceOnInteractionMatch) {
    logEvent(`🎯 SURFACE TEXT COLOR: --surface-onInteraction: ${surfaceOnInteractionMatch[1]}`);
  } else {
    logEvent(`⚠️  --surface-onInteraction not found in CSS output`);
  }
}

router.on('change', (e) => {
  const event = e as CustomEvent<Array<{ key: string; oldValue?: string; newValue: string }>>;
  event.detail.forEach(change => {
    const oldValue = change.oldValue || 'undefined';
    logEvent(`CHANGE: '${change.key}' from ${oldValue} to <span class="font-bold" style="color:${change.newValue}; text-shadow: 0 0 5px rgba(0,0,0,0.5);">${change.newValue}</span>`);
  });
});

setupInitialState();
