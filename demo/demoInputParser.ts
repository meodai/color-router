import { ColorRouter } from '../src/router';
import { ColorDefinition } from '../src/types';

/**
 * Parses the color definition string from the demo input field.
 * @param inputValue The raw string value from the input field.
 * @param router The ColorRouter instance to create refs or function calls.
 * @returns The parsed color definition.
 * @throws Error if the input string is invalid or parsing fails.
 */
export function parseDemoInput(inputValue: string, router: ColorRouter): ColorDefinition | string {
  const value = inputValue.trim();

  // Match 'ref("...")' or ref('...')
  const refMatch = value.match(/ref\((['"])(.*?)\2\)/);

  // Match func("name", arg1, arg2, ...) or func('name', arg1, arg2, ...)
  // This is a general matcher. Specific function matchers below will take precedence.
  const funcMatchGeneral = value.match(/func\((['"])(.*?)\2(?:,\s*(.*))?\)/);

  // Specific function matches:
  // bestContrastWith('color1', 'color2'?)
  const bestContrastMatch = value.match(/bestContrastWith\((['"])(.*?)\2(?:,\s*(['"])(.*?)\4)?\)/);

  // colorMix('color1', 'color2', ratio?, 'space'?)
  const colorMixMatch = value.match(
    /colorMix\((['"])(.*?)\2,\s*(['"])(.*?)\4(?:,\s*(['"]?([\d.%]+)['"]?))?(?:,\s*(['"])(.*?)\8)?\)/,
  );

  // relativeTo('baseColor', 'colorSpace', [{modifications}] or {modifications})
  const relativeToMatch = value.match(/relativeTo\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*(\[.*?\]|\{.*?\})\s*\)/) ||
                           value.match(/relativeTo\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,\s*(\[.*?\]|\{.*?\})\s*\)/);

  // minContrastWith('baseColor', ratio?)
  const minContrastMatch = value.match(/minContrastWith\((['"])(.*?)\2(?:,\s*([\d.]+))?\)/);

  // lighten('color', amount)
  const lightenMatch = value.match(/lighten\((['"])(.*?)\2,\s*([\d.]+)\)/);

  // darken('color', amount)
  const darkenMatch = value.match(/darken\((['"])(.*?)\2,\s*([\d.]+)\)/);

  // furthestFrom('color1', 'color2'?)
  const furthestFromMatch = value.match(/furthestFrom\((['"])(.*?)\2(?:,\s*(['"])(.*?)\4)?\)/);

  if (refMatch) {
    return router.ref(refMatch[3]);
  } else if (bestContrastMatch) {
    const args: string[] = [bestContrastMatch[2]];
    if (bestContrastMatch[4]) args.push(bestContrastMatch[4]);
    return router.func('bestContrastWith', ...args);
  } else if (colorMixMatch) {
    const color1 = colorMixMatch[2];
    const color2 = colorMixMatch[4];
    let ratio = colorMixMatch[6] || '0.5'; // group 6 is the ratio number
    const colorSpace = colorMixMatch[8] || 'lab'; // group 8 is the color space

    ratio = ratio.replace(/['"]/g, '');
    if (ratio.includes('%')) {
      ratio = (parseFloat(ratio) / 100).toString();
    }
    return router.func('colorMix', color1, color2, parseFloat(ratio), colorSpace);
  } else if (relativeToMatch) {
    const baseColor = relativeToMatch[1];  // First captured group is the base color
    const colorSpace = relativeToMatch[2]; // Second captured group is the color space
    const modificationsString = relativeToMatch[3]; // Third captured group is the modifications array/object
    try {
      let fixedModifications = modificationsString.replace(/'/g, '"');
      // Fix common JSON issues: .number -> 0.number
      fixedModifications = fixedModifications.replace(/([^0-9]|^)\.(\d)/g, '$10.$2');
      
      const parsedModifications = JSON.parse(fixedModifications);
      return router.func('relativeTo', baseColor, colorSpace, parsedModifications);
    } catch (e) {
      throw new Error(`Invalid modifications format for relativeTo: ${modificationsString}. Must be valid JSON array like ["+0.35", "0.2", "+120"] or object like {"l": "+0.35", "c": "0.2", "h": "+120"}. ${(e as Error).message}`);
    }
  } else if (minContrastMatch) {
    const baseColor = minContrastMatch[2];
    const ratio = minContrastMatch[3] ? parseFloat(minContrastMatch[3]) : undefined;
    return router.func('minContrastWith', baseColor, ratio);
  } else if (lightenMatch) {
    return router.func('lighten', lightenMatch[2], parseFloat(lightenMatch[3]));
  } else if (darkenMatch) {
    return router.func('darken', darkenMatch[2], parseFloat(darkenMatch[3]));
  } else if (furthestFromMatch) {
    const args: string[] = [furthestFromMatch[2]];
    if (furthestFromMatch[4]) args.push(furthestFromMatch[4]);
    return router.func('furthestFrom', ...args);
  } else if (funcMatchGeneral) {
    const funcName = funcMatchGeneral[2];
    const funcArgsStr = funcMatchGeneral[3];
    let args: any[] = [];
    if (funcArgsStr) {
      // This basic CSV parsing might need improvement for args containing commas or quotes.
      // For now, it splits by comma and trims, then tries to parse numbers.
      args = funcArgsStr.split(/\s*,\s*/).map((arg) => {
        const cleanedArg = arg.replace(/^['"]|['"]$/g, ''); // Remove leading/trailing quotes
        const num = parseFloat(cleanedArg);
        return isNaN(num) ? cleanedArg : num;
      });
    }
    return router.func(funcName, ...args);
  }

  // If no patterns match, assume it's a direct color string (e.g., hex, rgb, color name)
  return value;
}
