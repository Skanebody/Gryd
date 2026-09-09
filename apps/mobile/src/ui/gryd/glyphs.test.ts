import { GRYD_GLYPHS, SETTINGS_GLYPHS } from './glyphs.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test('chaque ligne des réglages possède un glyphe distinct et défini', () => {
  const names = Object.values(SETTINGS_GLYPHS);
  assert(names.length === 19, `inventaire Réglages incomplet (${names.length}/19)`);
  assert(new Set(names).size === names.length, 'deux lignes des Réglages réutilisent le même glyphe');

  const drawings = names.map(name => {
    const paths = GRYD_GLYPHS[name];
    assert(paths.length > 0 && paths.every(path => path.length > 3), `${name}: dessin vide`);
    return paths.join('|');
  });
  assert(new Set(drawings).size === drawings.length, 'deux glyphes nommés différemment partagent le même dessin');
});

Deno.test('versus représente deux équipes et une opposition centrale', () => {
  const [left, right, opposition] = GRYD_GLYPHS.versus;
  assert(left?.includes('M4.5') && left.includes('M8'), 'équipe gauche absente');
  assert(right?.includes('M19.5') && right.includes('M16'), 'équipe droite absente');
  assert(opposition?.includes('m10') && opposition.includes('m0-6'), 'marque d’opposition absente');
});
