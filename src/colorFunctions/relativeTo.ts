import { parse, formatHex, converter } from 'culori';
import type { FunctionRenderer } from '../ColorRenderer';

/**
 * Modifies a color relative to its current values in the specified color space
 * @param baseColor - The base color to modify
 * @param colorSpace - Color space to work in (e.g., 'oklch', 'hsl', 'lab', 'a98-rgb')
 * @param modifications - Array of modifications for each channel [channel1, channel2, channel3, alpha?]
 *                       - null: keep original value
 *                       - number: set absolute value  
 *                       - string with +/-: relative modification (e.g., '+180', '-10')
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
      
      if (typeof mod === 'string' && (mod.startsWith('+') || mod.startsWith('-'))) {
        // Relative modification
        const delta = parseFloat(mod);
        (modified as any)[channelName] = currentValue + delta;
      } else if (typeof mod === 'number' || typeof mod === 'string') {
        // Absolute value
        (modified as any)[channelName] = parseFloat(mod.toString());
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
      } else if (typeof mod === 'string' && (mod.startsWith('+') || mod.startsWith('-'))) {
        return `calc(${channelName} ${mod.startsWith('+') ? '+' : ''} ${mod.slice(1)})`;
      } else {
        return mod.toString();
      }
    }).slice(0, 3); // Only first 3 channels for most color spaces
    
    // Handle alpha separately if provided
    const alphaChannel = modifications[3];
    const alphaStr = alphaChannel !== undefined && alphaChannel !== null 
      ? ` / ${typeof alphaChannel === 'string' && (alphaChannel.startsWith('+') || alphaChannel.startsWith('-')) 
          ? `calc(alpha ${alphaChannel.startsWith('+') ? '+' : ''} ${alphaChannel.slice(1)})` 
          : alphaChannel}`
      : '';
    
    return `color(from ${baseColor} ${colorSpace} ${channels.join(' ')}${alphaStr})`;
  },
  
  'scss': (args: any[]): string => {
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
// relativeTo('red', 'a98-rgb', ['calc(r - 10)', null, null]) // Reduce red channel by 10
// relativeTo('#ff0000', 'hsl', ['+180', null, null]) // Rotate hue by 180 degrees