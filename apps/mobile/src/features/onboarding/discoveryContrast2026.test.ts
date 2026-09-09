import { assert } from 'jsr:@std/assert';
import { refonteColors as c } from '../../../../../packages/shared/src/design-tokens.ts';
const luminance = (hex: string) => {
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255).map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0]! + .7152 * rgb[1]! + .0722 * rgb[2]!;
};
const contrast = (a: string, b: string) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
Deno.test('onboarding text pairs meet AAA normal-text contrast on their opaque surfaces', () => {
  for (const [foreground, background] of [[c.darkInk, c.carbon], [c.darkMuted, c.carbon], [c.ink, c.accent], [c.ink, c.surface]]) assert(contrast(foreground!, background!) >= 7, `${foreground} / ${background}`);
});
