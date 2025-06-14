import { parse, formatHex, converter } from 'culori';
import type { FunctionRenderer } from '../renderers';

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

    const convertToSpace = converter(colorSpace as any);
    const colorInSpace = convertToSpace(parsed);

    if (!colorInSpace) return baseColor;

    const channelNames = getChannelNames(colorSpace);
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
              break;
            default:
              (modified as any)[channelName] = parseFloat(mod);
          }
        } else {
          (modified as any)[channelName] = parseFloat(mod);
        }
      } else if (typeof mod === 'number') {
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
    rgb: ['r', 'g', 'b', 'alpha'],
    hsl: ['h', 's', 'l', 'alpha'],
    hsv: ['h', 's', 'v', 'alpha'],
    hwb: ['h', 'w', 'b', 'alpha'],
    lab: ['l', 'a', 'b', 'alpha'],
    lch: ['l', 'c', 'h', 'alpha'],
    oklch: ['l', 'c', 'h', 'alpha'],
    oklab: ['l', 'a', 'b', 'alpha'],
    xyz: ['x', 'y', 'z', 'alpha'],
    'a98-rgb': ['r', 'g', 'b', 'alpha'],
    'prophoto-rgb': ['r', 'g', 'b', 'alpha'],
    rec2020: ['r', 'g', 'b', 'alpha'],
    p3: ['r', 'g', 'b', 'alpha'],
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

    const channelNames = getChannelNames(colorSpace);
    const channels = modifications
      .map((mod: any, index: number) => {
        const channelName = channelNames[index];

        if (mod === null) {
          return channelName;
        } else if (typeof mod === 'string') {
          const operator = mod[0];
          const valueStr = mod.slice(1);
          if (['+', '-', '*', '/'].includes(operator) && valueStr.length > 0 && !isNaN(parseFloat(valueStr))) {
            return `calc(${channelName} ${operator} ${valueStr})`;
          } else {
            return mod;
          }
        } else {
          return mod.toString();
        }
      })
      .slice(0, 3);

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
      } else {
        alphaStr = ` / ${alphaChannel}`;
      }
    }

    return `color(from ${baseColor} ${colorSpace} ${channels.join(' ')}${alphaStr})`;
  },

  scss: (_args: any[]): string => {
    return '';
  },

  json: (_args: any[]): string => {
    return '';
  },
};
