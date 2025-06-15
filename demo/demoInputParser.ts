import { TokenEngine } from '../src/engine/TokenEngine';
import { ColorDefinition } from '../src/types';
import { ref, val, func } from '../src/system'; // Import namespaced token helpers

/**
 * Parses the color definition string from the demo input field.
 * Supports the new Design System token syntax with typed value tokens.
 * @param inputValue The raw string value from the input field.
 * @param engine The TokenEngine instance to create refs or function calls.
 * @returns The parsed color definition.
 * @throws Error if the input string is invalid or parsing fails.
 */
export function parseDemoInput(inputValue: string, engine: TokenEngine): ColorDefinition | string {
  const value = inputValue.trim();

  // Design System token syntax matches - namespaced version
  
  // Color tokens
  const hexMatch = value.match(/val\.color\.hex\((['"])(.*?)\1\)/);
  const lchMatch = value.match(/val\.color\.lch\((['"])(.*?)\1\)/);
  const oklchMatch = value.match(/val\.color\.oklch\((['"])(.*?)\1\)/);
  const cssMatch = value.match(/val\.color\.css\((['"])(.*?)\1\)/);
  const rgbMatch = value.match(/val\.color\.rgb\((['"])(.*?)\1\)/);
  const hslMatch = value.match(/val\.color\.hsl\((['"])(.*?)\1\)/);
  const labMatch = value.match(/val\.color\.lab\((['"])(.*?)\1\)/);
  const oklabMatch = value.match(/val\.color\.oklab\((['"])(.*?)\1\)/);
  
  // Size tokens  
  const sizePxMatch = value.match(/val\.size\.px\((\d+(?:\.\d+)?)\)/);
  const sizeRemMatch = value.match(/val\.size\.rem\((\d+(?:\.\d+)?)\)/);
  const sizeEmMatch = value.match(/val\.size\.em\((\d+(?:\.\d+)?)\)/);
  const sizePercentMatch = value.match(/val\.size\.percent\((\d+(?:\.\d+)?)\)/);
  const sizeVwMatch = value.match(/val\.size\.vw\((\d+(?:\.\d+)?)\)/);
  const sizeVhMatch = value.match(/val\.size\.vh\((\d+(?:\.\d+)?)\)/);
  
  // Space tokens
  const spacePxMatch = value.match(/val\.space\.px\((\d+(?:\.\d+)?)\)/);
  const spaceRemMatch = value.match(/val\.space\.rem\((\d+(?:\.\d+)?)\)/);
  const spaceEmMatch = value.match(/val\.space\.em\((\d+(?:\.\d+)?)\)/);
  const spacePercentMatch = value.match(/val\.space\.percent\((\d+(?:\.\d+)?)\)/);
  
  // Font tokens
  const fontFamilyMatch = value.match(/val\.font\.family\((['"])(.*?)\1\)/);
  const fontSizeMatch = value.match(/val\.font\.size\((['"])(.*?)\1\)/);
  const fontWeightMatch = value.match(/val\.font\.weight\((['"])(.*?)\1\)/);
  const fontStyleMatch = value.match(/val\.font\.style\((['"])(.*?)\1\)/);

  // Namespaced function syntax
  const funcBestContrastMatch = value.match(/func\.color\.bestContrastWith\((['"])(.*?)\1(?:,\s*(['"])(.*?)\3)?\)/);
  const funcMixMatch = value.match(/func\.color\.mix\('([^']+)',\s*'([^']+)'(?:,\s*([\d.%]+))?(?:,\s*'([^']+)')?\)/);
  const funcLightenMatch = value.match(/func\.color\.lighten\((['"])(.*?)\1,\s*([\d.]+)\)/);
  const funcDarkenMatch = value.match(/func\.color\.darken\((['"])(.*?)\1,\s*([\d.]+)\)/);
  const funcRelativeToMatch = value.match(/func\.color\.relativeTo\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(\[.*?\]|\{.*?\})\s*\)/) ||
                               value.match(/func\.color\.relativeTo\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\[.*?\]|\{.*?\})\s*\)/);
  const funcMinContrastMatch = value.match(/func\.color\.minContrastWith\((['"])(.*?)\1(?:,\s*(['"])(.*?)\3)?(?:,\s*([\d.]+))?\)/);
  const funcFurthestFromMatch = value.match(/func\.color\.furthestFrom\((['"])(.*?)\1(?:,\s*(['"])(.*?)\3)?\)/);
  const funcClosestColorMatch = value.match(/func\.color\.closestColor\((['"])(.*?)\1,\s*(['"])(.*?)\3\)/);

  // Match 'ref("...")' or ref('...')
  const refMatch = value.match(/ref\((['"])(.*?)\1\)/);

  // Handle namespaced Design System token syntax
  
  // Color tokens
  if (hexMatch || lchMatch || oklchMatch || cssMatch || rgbMatch || hslMatch || labMatch || oklabMatch) {
    const match = hexMatch || lchMatch || oklchMatch || cssMatch || rgbMatch || hslMatch || labMatch || oklabMatch;
    return match![2]; // Return the color value directly (ColorDefinition)
  } 
  // Size tokens
  else if (sizePxMatch || sizeRemMatch || sizeEmMatch || sizePercentMatch || sizeVwMatch || sizeVhMatch) {
    const match = sizePxMatch || sizeRemMatch || sizeEmMatch || sizePercentMatch || sizeVwMatch || sizeVhMatch;
    const numValue = parseFloat(match![1]);
    if (sizePxMatch) return `${numValue}px`;
    if (sizeRemMatch) return `${numValue}rem`;
    if (sizeEmMatch) return `${numValue}em`;
    if (sizePercentMatch) return `${numValue}%`;
    if (sizeVwMatch) return `${numValue}vw`;
    if (sizeVhMatch) return `${numValue}vh`;
  }
  // Space tokens
  else if (spacePxMatch || spaceRemMatch || spaceEmMatch || spacePercentMatch) {
    const match = spacePxMatch || spaceRemMatch || spaceEmMatch || spacePercentMatch;
    const numValue = parseFloat(match![1]);
    if (spacePxMatch) return `${numValue}px`;
    if (spaceRemMatch) return `${numValue}rem`;
    if (spaceEmMatch) return `${numValue}em`;
    if (spacePercentMatch) return `${numValue}%`;
  }
  // Font tokens
  else if (fontFamilyMatch || fontSizeMatch || fontWeightMatch || fontStyleMatch) {
    const match = fontFamilyMatch || fontSizeMatch || fontWeightMatch || fontStyleMatch;
    return match![2]; // Return the font value directly
  }
  // Handle namespaced function syntax
  else if (funcBestContrastMatch) {
    const args: string[] = [funcBestContrastMatch[2]];
    if (funcBestContrastMatch[4]) args.push(funcBestContrastMatch[4]);
    return engine.select('bestContrastWith', ...args);
  } else if (funcMixMatch) {
    const color1 = funcMixMatch[1];
    const color2 = funcMixMatch[2];
    let ratio = funcMixMatch[3] || '0.5';
    const colorSpace = funcMixMatch[4] || 'lab';

    ratio = ratio.replace(/['"]/g, '');
    if (ratio.includes('%')) {
      ratio = (parseFloat(ratio) / 100).toString();
    }
    return engine.modify('colorMix', color1, color2, parseFloat(ratio), colorSpace);
  } else if (funcLightenMatch) {
    return engine.modify('lighten', funcLightenMatch[2], parseFloat(funcLightenMatch[3]));
  } else if (funcDarkenMatch) {
    return engine.modify('darken', funcDarkenMatch[2], parseFloat(funcDarkenMatch[3]));
  } else if (funcRelativeToMatch) {
    const baseColor = funcRelativeToMatch[1];
    const colorSpace = funcRelativeToMatch[2];
    const modificationsString = funcRelativeToMatch[3];
    try {
      let fixedModifications = modificationsString.replace(/'/g, '"');
      fixedModifications = fixedModifications.replace(/([^0-9]|^)\.(\d)/g, '$10.$2');
      const parsedModifications = JSON.parse(fixedModifications);
      return engine.modify('relativeTo', baseColor, colorSpace, parsedModifications);
    } catch (e) {
      throw new Error(`Invalid modifications format for func.color.relativeTo: ${modificationsString}. Must be valid JSON array like ["+0.35", "0.2", "+120"] or object like {"l": "+0.35", "c": "0.2", "h": "+120"}. ${(e as Error).message}`);
    }
  } else if (funcMinContrastMatch) {
    const baseColor = funcMinContrastMatch[2];
    const paletteName = funcMinContrastMatch[4] || undefined;
    const ratio = funcMinContrastMatch[5] ? parseFloat(funcMinContrastMatch[5]) : undefined;
    const args = [baseColor, paletteName, ratio].filter(arg => arg !== undefined);
    return engine.select('minContrastWith', ...args);
  } else if (funcFurthestFromMatch) {
    const args: string[] = [funcFurthestFromMatch[2]];
    if (funcFurthestFromMatch[4]) args.push(funcFurthestFromMatch[4]);
    return engine.select('furthestFrom', ...args);
  } else if (funcClosestColorMatch) {
    const targetColor = funcClosestColorMatch[2];
    const paletteName = funcClosestColorMatch[4];
    return engine.select('closestColor', targetColor, paletteName);
  } else if (refMatch) {
    return engine.ref(refMatch[2]);
  }

  // If no patterns match, assume it's a direct color string (e.g., hex, rgb, color name)
  return value;
}
