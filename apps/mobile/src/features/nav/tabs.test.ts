/**
 * GRYD — LOT 5 : la barre basse a EXACTEMENT trois destinations (spec §2.1,
 * arbitrage A2), et les deux routes qui en sortent (Saison → /classement,
 * Missions → /warroom) restent atteignables par un chemin nommé ailleurs.
 *
 * `./tabs.ts` est PUR, donc directement testable. `GrydNavBar.tsx`, `_layout.tsx`
 * et `profil.tsx` contiennent du react-native/expo-router : ils ne s'IMPORTENT
 * pas sous Deno (même patron que `features/territory/lensGuards.test.ts` /
 * `features/crew/blocklist.test.ts`) — on les lit comme TEXTE pour garantir
 * qu'ils sont bien câblés sur la source unique et que rien n'a été retiré en
 * silence.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { NAV_TABS, activeTabCount, isTabActive, resolveTabLabel } from './tabs';
import { C } from '../../i18n/catalog/nav';
import type { Entry } from '../../i18n/types';

// ─── 1. EXACTEMENT trois destinations, jamais un 4ᵉ conditionnel ────────────

Deno.test('la barre expose EXACTEMENT trois destinations', () => {
  assertEquals(NAV_TABS.length, 3);
});

Deno.test('les trois destinations sont Carte · Crew · Profil, dans cet ordre', () => {
  assertEquals(
    NAV_TABS.map((t) => t.href),
    ['/', '/crew', '/profil'],
  );
});

Deno.test('aucune route retirée de la barre (classement, warroom) n’y est présente', () => {
  const hrefs = NAV_TABS.map((t) => t.href);
  assert(!hrefs.includes('/classement'), 'Saison ne doit plus être un onglet de la barre');
  assert(!hrefs.includes('/warroom'), 'Missions n’a jamais été dans la barre');
});

// ─── 2. Un onglet actif est UNIQUE (jamais deux à la fois, jamais ambigu) ────

Deno.test('un pathname sur une route de la barre active EXACTEMENT un onglet', () => {
  for (const tab of NAV_TABS) {
    assertEquals(activeTabCount(tab.href), 1, `${tab.href} devrait activer exactement 1 onglet`);
  }
});

Deno.test('un pathname hors barre (Saison, Missions, route inconnue) n’active AUCUN onglet', () => {
  for (const pathname of ['/classement', '/warroom', '/course-live', '/amis']) {
    assertEquals(activeTabCount(pathname), 0, `${pathname} ne devrait activer aucun onglet`);
  }
});

Deno.test('isTabActive est une égalité stricte de chemin (pas de préfixe)', () => {
  assert(isTabActive('/crew', '/crew'));
  assert(!isTabActive('/crew/quelquechose', '/crew'));
  assert(!isTabActive('/', '/crew'));
});

// ─── 3. Libellés : « Crew » invariant, les deux autres traduits ─────────────

Deno.test('le libellé de Crew est invariant, quelle que soit la fonction t()', () => {
  const crew = NAV_TABS.find((t) => t.href === '/crew')!;
  assertEquals(resolveTabLabel(crew, () => 'PEU IMPORTE'), 'Crew');
});

Deno.test('Carte et Profil sont résolus via le catalogue i18n (pas en dur)', () => {
  const carte = NAV_TABS.find((t) => t.href === '/')!;
  const profil = NAV_TABS.find((t) => t.href === '/profil')!;
  assertEquals(carte.label, C.tabCarte);
  assertEquals(profil.label, C.tabMoi);
  // t() est bien appliqué au bon Entry, pas ignoré.
  const echo = (e: Entry) => `[${e.fr}]`;
  assertEquals(resolveTabLabel(carte, echo), `[${C.tabCarte.fr}]`);
  assertEquals(resolveTabLabel(profil, echo), `[${C.tabMoi.fr}]`);
});

// ─── 4. GrydNavBar.tsx : bien câblé sur ./tabs.ts, plus de branche flags.season ─

/** Source d'un fichier, commentaires retirés (ils DÉCRIVENT parfois l'ancien défaut). */
async function code(relPath: string): Promise<string> {
  const raw = await Deno.readTextFile(new URL(relPath, import.meta.url));
  return raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

Deno.test('GrydNavBar ne dérive plus ses onglets de flags.season', async () => {
  const src = await code('./GrydNavBar.tsx');
  assert(!/flags\.season/.test(src), 'un 4ᵉ onglet conditionnel romprait la règle des 3 (§2.1)');
  assert(!/from '\.\.\/\.\.\/lib\/flags'/.test(src), 'flags ne devrait plus être importé ici');
});

Deno.test('GrydNavBar consomme NAV_TABS comme source unique', async () => {
  const src = await code('./GrydNavBar.tsx');
  assert(src.includes("from './tabs'"), 'la barre doit lire ses destinations de ./tabs.ts');
  assert(src.includes('NAV_TABS'), 'NAV_TABS doit être utilisé, pas une liste dupliquée');
});

// ─── 5. Reachability : Saison et Missions restent des ROUTES + des CHEMINS ──
//        NOMMÉS ailleurs — c'est le vrai risque de ce chantier (voir mandat).

Deno.test('_layout.tsx déclare toujours classement ET warroom comme routes du groupe', async () => {
  const src = await code('../../../app/(tabs)/_layout.tsx');
  assert(src.includes('name="classement"'), 'la route Saison ne doit pas disparaître du groupe tabs');
  assert(src.includes('name="warroom"'), 'la route Missions ne doit pas disparaître du groupe tabs');
});

Deno.test('le Profil porte un chemin nommé vers Saison (/classement)', async () => {
  const src = await code('../../../app/(tabs)/profil.tsx');
  assert(
    src.includes("href: '/classement'"),
    'Saison doit rester atteignable depuis le Profil (arbitrage A2)',
  );
});

Deno.test('Missions (/warroom) reste atteignable par au moins un chemin nommé du repo', async () => {
  // Hors périmètre de ce chantier (Aujourd'hui / Paramètres, pas la Carte) —
  // on vérifie seulement qu’AUCUN chemin d’entrée n’a disparu au passage.
  const aujourdhui = await code('../../../app/aujourdhui.tsx');
  const parametres = await code('../../../app/parametres/[section].tsx');
  const hasEntry =
    aujourdhui.includes("'/warroom'") || parametres.includes("'/warroom'");
  assert(hasEntry, 'Missions ne doit avoir aucune régression de reachability (Aujourd’hui/Paramètres)');
});
