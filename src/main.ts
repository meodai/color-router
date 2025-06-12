import * as culori from 'culori';
import { ColorRouter } from './ColorRouter';
import { ColorRenderer } from './ColorRenderer';
import { SVGRenderer } from './SVGRenderer';

// --- UI & DEMO LOGIC ---
const router = new ColorRouter();

// Inject ColorRenderer to avoid circular imports
router.setColorRenderer(ColorRenderer);

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

    // Create demo component using the simplified card palette
    container.innerHTML = `
      <!-- Card Palette Demo -->
      <div class="p-6 rounded-lg border shadow-sm" style="background-color: var(--card-background, #ffffff); border-color: var(--card-interaction, #0066cc); color: var(--card-onBackground, #0f172a);">
        <h3 class="text-xl font-medium mb-3">Simplified Card Component</h3>
        <p class="text-sm mb-4 opacity-75">This card uses essential color pairs: background/onBackground, interaction/onInteraction, and warning/onWarning.</p>
        
        <div class="flex flex-wrap gap-2 mb-4">
          <button class="px-4 py-2 text-sm font-medium rounded transition-colors" style="background-color: var(--card-interaction, #0066cc); color: var(--card-onInteraction, #ffffff);">Primary Action</button>
          <button class="px-3 py-2 text-sm font-medium rounded border transition-colors" style="border-color: var(--card-interaction, #0066cc); color: var(--card-interaction, #0066cc); background-color: transparent;">Secondary</button>
        </div>
        
        <div class="p-3 rounded mb-4" style="background-color: var(--card-warning, #ff6600); color: var(--card-onWarning, #ffffff);">
          <div class="flex items-center gap-2">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
            </svg>
            <span class="text-sm font-medium">Warning: Important information</span>
          </div>
        </div>
        
        <div class="text-xs space-y-1 opacity-75">
          <p><strong>Color System:</strong></p>
          <p>• Background: <code>ref('scale.0')</code> → <code>var(--card-background)</code></p>
          <p>• On Background: <code>bestContrastWith('card.background', 'scale')</code> → <code>var(--card-onBackground)</code></p>
          <p>• Interaction: <code>ref('base.blue')</code> → <code>var(--card-interaction)</code></p>
          <p>• On Interaction: <code>bestContrastWith('base.blue', 'scale')</code> → <code>var(--card-onInteraction)</code></p>
          <p>• Warning: <code>ref('base.orange')</code> → <code>var(--card-warning)</code></p>
          <p>• On Warning: <code>bestContrastWith('base.orange', 'scale')</code> → <code>var(--card-onWarning)</code></p>
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
      fontSize: 12,
      strokeWidth: 2,
      dotRadius: 5,
      lineHeight: 1.4,
      widthPerLetter: 8
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
    const colorMixMatch = value.match(/colorMix\(['"](.*?)['"],\s*['"](.*?)['"](?:,\s*['"](.*?)['"])?(?:,\s*['"](.*?)['"]\))?\)/);
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
      const ratio = colorMixMatch[3] || '50%';
      const colorSpace = colorMixMatch[4] || 'lab';
      value = router.func('colorMix', color1, color2, ratio, colorSpace);
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
    
    if (router.mode === 'auto') {
      renderPalettes();
      renderOutput();
      renderColorDemo();
      renderSVGVisualization();
    }
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

document.getElementById('register-fn-btn')?.addEventListener('click', () => {
  const nameInput = document.getElementById('fn-name') as HTMLInputElement;
  const bodyInput = document.getElementById('fn-body') as HTMLInputElement;
  if (!nameInput?.value || !bodyInput?.value) return;
  
  try {
    const fn = new Function('culori', `return ${bodyInput.value}`)(culori);
    router.registerFunction(nameInput.value, fn);
  } catch (e) {
    logEvent(`<span class="text-red-500">ERROR creating function:</span> ${(e as Error).message}`);
  }
});

document.querySelectorAll('input[name="update-mode"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    router.mode = target.id === 'mode-auto' ? 'auto' : 'batch';
    const flushBtn = document.getElementById('flush-btn') as HTMLButtonElement;
    if (flushBtn) flushBtn.disabled = router.mode === 'auto';
    
    if (router.mode === 'auto' && router.batchQueueSize > 0) {
      router.flush();
      renderPalettes();
      renderOutput();
      renderColorDemo();
      renderSVGVisualization();
    }
    logEvent(`Mode switched to '${router.mode}'.`);
  });
});

document.getElementById('flush-btn')?.addEventListener('click', () => {
  router.flush();
  renderPalettes();
  renderOutput();
  renderColorDemo();
  renderSVGVisualization();
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

// --- Initial State & Demo Setup ---
function setupInitialState(): void {
  logEvent("Initializing ColorRouter demo...");

  // Base colors palette - foundation colors
  router.createPalette('base');
  router.define('base.white', '#ffffff');
  router.define('base.black', '#202126');
  router.define('base.blue', '#0066cc');
  router.define('base.orange', '#ff6600');

  // Scale palette (0-900) - systematic neutral scale based on base.black
  router.createPalette('scale');
  router.define('scale.0', router.ref('base.white'));  // Pure white
  router.define('scale.900', router.ref('base.black'));  // Darkest = base.black
  router.define('scale.800', router.func('lighten', 'scale.900', 0.1));
  router.define('scale.700', router.func('lighten', 'scale.900', 0.2));
  router.define('scale.600', router.func('lighten', 'scale.900', 0.3));
  router.define('scale.500', router.func('lighten', 'scale.900', 0.4));
  router.define('scale.400', router.func('lighten', 'scale.900', 0.5));
  router.define('scale.300', router.func('lighten', 'scale.900', 0.6));
  router.define('scale.200', router.func('lighten', 'scale.900', 0.7));
  router.define('scale.100', router.func('lighten', 'scale.900', 0.8));

  // Card palette - simplified to essential background/text pairs
  router.createPalette('card');
  router.define('card.background', router.ref('scale.0'));
  router.define('card.onBackground', router.func('bestContrastWith', 'card.background', 'scale'));
  router.define('card.interaction', router.ref('base.blue'));
  router.define('card.onInteraction', router.func('bestContrastWith', 'base.blue', 'scale'));
  router.define('card.warning', router.ref('base.orange'));
  router.define('card.onWarning', router.func('bestContrastWith', 'base.orange', 'scale'));

  router.flush();
  
  logEvent("Simplified demo with 3 core palettes created:");
  logEvent("• BASE: Foundation colors (white, black, blue, orange)");
  logEvent("• SCALE: Systematic neutral scale - 900=base.black, others lighten progressively");
  logEvent("• CARD: Essential theming (background/onBackground, interaction/onInteraction, warning/onWarning)");
  logEvent("Card palette shows proper background/text pairing using bestContrastWith!");
  logEvent("Try changing base.black to see entire scale update automatically!");
  
  renderPalettes();
  renderOutput();
  renderColorDemo();
  renderSVGVisualization();
}

router.on('change', (e) => {
  const event = e as CustomEvent<Array<{ key: string; oldValue?: string; newValue: string }>>;
  event.detail.forEach(change => {
    const oldValue = change.oldValue || 'undefined';
    logEvent(`CHANGE: '${change.key}' from ${oldValue} to <span class="font-bold" style="color:${change.newValue}; text-shadow: 0 0 5px rgba(0,0,0,0.5);">${change.newValue}</span>`);
  });
});

setupInitialState();
