import { parse, formatHex, converter } from 'culori';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Modifies a color relative to its current values in the specified color space
 * @param baseColor - The base color to modify
 * @param colorSpace - Color space to work in (e.g., 'oklch', 'hsl', 'lab', 'a98-rgb')
 * @param modifications - Array of modifications for each channel [channel1, channel2, channel3, alpha?]
 *                       - null: keep original value
 *                       - number: set absolute value
 *                       - string with operator (+, -, *, /) and value: relative modification (e.g., '+180', '-10', '*0.5', '/2')
 * @returns The modified color as a hex string
 */
export function relativeTo(baseColor: string, colorSpace: string, modifications: (number | string | null)[]): string {
  try {
    const parsed = parse(baseColor);
    if (!parsed) return baseColor;

    // Convert to the target color space
    const convertToSpace = converter(colorSpace as any);
    const colorInSpace = convertToSpace(parsed);
    
    if (!colorInSpace) return baseColor;

    // Get the channel names for this color space
    const channelNames = getChannelNames(colorSpace);
    
    // Apply modifications
    const modified = { ...colorInSpace };
    
    modifications.forEach((mod, index) => {
      if (mod === null || index >= channelNames.length) return;

      const channelName = channelNames[index];
      const currentValue = (colorInSpace as any)[channelName] || 0;

      if (typeof mod === 'string') {
        const operator = mod[0];
        const valueStr = mod.slice(1);
        const numericValue = parseFloat(valueStr);

        if (!isNaN(numericValue)) {
          switch (operator) {
            case '+':
              (modified as any)[channelName] = currentValue + numericValue;
              break;
            case '-':
              (modified as any)[channelName] = currentValue - numericValue;
              break;
            case '*':
              (modified as any)[channelName] = currentValue * numericValue;
              break;
            case '/':
              if (numericValue !== 0) {
                (modified as any)[channelName] = currentValue / numericValue;
              }
              // If numericValue is 0 for division, keep original value (or handle as error)
              break;
            default:
              // If no recognized operator, try to parse the whole string as an absolute value
              (modified as any)[channelName] = parseFloat(mod);
          }
        } else {
          // If the value part after operator is not a number, or if no operator, parse whole string
          (modified as any)[channelName] = parseFloat(mod);
        }
      } else if (typeof mod === 'number') {
        // Absolute value
        (modified as any)[channelName] = mod;
      }
    });

    return formatHex(modified);
  } catch (e) {
    return baseColor;
  }
}

/**
 * Get channel names for different color spaces
 */
function getChannelNames(colorSpace: string): string[] {
  const channelMap: Record<string, string[]> = {
    'rgb': ['r', 'g', 'b', 'alpha'],
    'hsl': ['h', 's', 'l', 'alpha'],
    'hsv': ['h', 's', 'v', 'alpha'],
    'hwb': ['h', 'w', 'b', 'alpha'],
    'lab': ['l', 'a', 'b', 'alpha'],
    'lch': ['l', 'c', 'h', 'alpha'],
    'oklch': ['l', 'c', 'h', 'alpha'],
    'oklab': ['l', 'a', 'b', 'alpha'],
    'xyz': ['x', 'y', 'z', 'alpha'],
    'a98-rgb': ['r', 'g', 'b', 'alpha'],
    'prophoto-rgb': ['r', 'g', 'b', 'alpha'],
    'rec2020': ['r', 'g', 'b', 'alpha'],
    'p3': ['r', 'g', 'b', 'alpha'],
  };
  
  return channelMap[colorSpace] || ['r', 'g', 'b', 'alpha'];
}

/**
 * Renderer functions for different output formats
 */
export const relativeToRenderers: Record<string, FunctionRenderer> = {
  'css-variables': (args: any[]): string => {
    const [baseColor, colorSpace, rawModifications] = args;
    const modifications = Array.isArray(rawModifications) ? rawModifications : [];
    
    // Generate CSS color() function syntax
    const channelNames = getChannelNames(colorSpace);
    const channels = modifications.map((mod: any, index: number) => {
      const channelName = channelNames[index];

      if (mod === null) {
        return channelName; // Use original channel value
      } else if (typeof mod === 'string') {
        const operator = mod[0];
        const valueStr = mod.slice(1);
        if (['+', '-', '*', '/'].includes(operator) && valueStr.length > 0 && !isNaN(parseFloat(valueStr))) {
          return `calc(${channelName} ${operator} ${valueStr})`;
        } else {
          // Absolute value string or malformed operator string
          return mod;
        }
      } else { // mod is a number
        return mod.toString();
      }
    }).slice(0, 3); // Only first 3 channels for most color spaces

    // Handle alpha separately if provided
    const alphaChannel = modifications[3];
    let alphaStr = '';
    if (alphaChannel !== undefined && alphaChannel !== null) {
      if (typeof alphaChannel === 'string') {
        const operator = alphaChannel[0];
        const valueStr = alphaChannel.slice(1);
        if (['+', '-', '*', '/'].includes(operator) && valueStr.length > 0 && !isNaN(parseFloat(valueStr))) {
          alphaStr = ` / calc(alpha ${operator} ${valueStr})`;
        } else {
          alphaStr = ` / ${alphaChannel}`;
        }
      } else { // alphaChannel is a number
        alphaStr = ` / ${alphaChannel}`;
      }
    }

    return `color(from ${baseColor} ${colorSpace} ${channels.join(' ')}${alphaStr})`;
  },
  
  'scss': (_args: any[]): string => {
    // SCSS doesn't have native relative color syntax, so we compute the value
    return '';
  },
  
  'json': (_args: any[]): string => {
    // For JSON, always use computed values
    return '';
  }
};

// Example usage:
// relativeTo('red', 'oklch', [null, null, '+180']) // Rotate hue by 180 degrees
// relativeTo('red', 'oklch', [null, null, '180'])  // Set hue to 180 degrees
// relativeTo('blue', 'oklch', [null, '*0.5', null]) // Reduce chroma by 50%
// relativeTo('#ff0000', 'hsl', ['+180', '/2', '*1.1']) // Rotate hue, halve saturation, increase lightness by 10%