/**
 * GRYD — le nom d'écran analytique ne doit JAMAIS porter un id/code dynamique.
 * Verrou : chaque route dynamique se rédige en son patron ; les statiques passent.
 *
 * ─── POURQUOI CE FICHIER A CHANGÉ LE 27/07/2026 ─────────────────────────────
 * Il s'intitulait « aucun id/code ne fuit » et n'assérait qu'une LISTE BLANCHE :
 * cinq routes citées à la main, vertes, pendant que `/zones-rival/[handle]` et
 * `/profil-rival/[handle]` envoyaient le pseudo d'un TIERS dans `$screen`. Un
 * test qui n'énumère que les cas déjà traités ne garantit rien : il certifie que
 * ce qui est connu marche, et se tait précisément sur ce qu'on a oublié.
 *
 * Le 3ᵉ test ci-dessous ÉNUMÈRE donc les routes dynamiques depuis le disque
 * (`apps/mobile/app`) et vérifie qu'AUCUNE ne laisse passer son segment. Toute
 * route dynamique ajoutée demain fait rougir ce test tant qu'elle n'est pas
 * rédigée — c'est le seul montage où l'oubli est mécaniquement impossible.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { normalizeScreenPath } from './screenName.ts';

Deno.test('routes dynamiques rédigées — aucun id/code ne fuit', () => {
  assertEquals(normalizeScreenPath('/c/AB12CD'), '/c/[code]'); // code d'invitation JAMAIS exposé
  assertEquals(normalizeScreenPath('/course/9f3a-uuid'), '/course/[id]');
  assertEquals(normalizeScreenPath('/challenges/consistency_ii'), '/challenges/[id]');
  assertEquals(normalizeScreenPath('/parametres/apropos'), '/parametres/[section]');
  // E16 — le digest de mission est stable et lié à une zone : rédigé lui aussi.
  assertEquals(normalizeScreenPath('/map/missions/defend-1x2y3z'), '/map/missions/[missionId]');
  // E15 + profil rival — le segment est le HANDLE PUBLIC D'UN TIERS. Attaché au
  // distinct_id de l'observateur, il reconstituerait « qui regarde qui ».
  assertEquals(normalizeScreenPath('/zones-rival/alice'), '/zones-rival/[handle]');
  assertEquals(normalizeScreenPath('/profil-rival/alice'), '/profil-rival/[handle]');
});

Deno.test('routes statiques inchangées (y compris les bases des familles dynamiques)', () => {
  assertEquals(normalizeScreenPath('/'), '/');
  assertEquals(normalizeScreenPath('/arsenal'), '/arsenal');
  assertEquals(normalizeScreenPath('/(tabs)'), '/(tabs)');
  assertEquals(normalizeScreenPath('/challenges'), '/challenges'); // l'index n'est pas un [id]
  assertEquals(normalizeScreenPath('/parametres'), '/parametres'); // la liste n'est pas une [section]
});

Deno.test('défensif — vide/query/fragment', () => {
  assertEquals(normalizeScreenPath(null), '/');
  assertEquals(normalizeScreenPath(undefined), '/');
  assertEquals(normalizeScreenPath(''), '/');
  assertEquals(normalizeScreenPath('/c/XYZ?ref=story'), '/c/[code]'); // query jamais lu
  assertEquals(normalizeScreenPath('/arsenal#top'), '/arsenal');
});

/**
 * Le sentinelle des SEGMENTS oubliés : `${prefix}/[param]` lu sur le disque.
 * Renvoie les préfixes de familles dynamiques (`/c/`, `/zones-rival/`…), groupes
 * expo-router `(tabs)` retirés — exactement la clé que `DYNAMIC_ROUTES` indexe.
 */
function dynamicRoutePrefixes(): string[] {
  const appDir = new URL('../../app/', import.meta.url);
  const out = new Set<string>();
  const walk = (dir: URL, segs: readonly string[]): void => {
    for (const entry of Deno.readDirSync(dir)) {
      // Un groupe expo-router `(tabs)` ne produit AUCUN segment d'URL.
      const isGroup = /^\(.+\)$/.test(entry.name);
      if (entry.isDirectory) {
        walk(new URL(`${entry.name}/`, dir), isGroup ? segs : [...segs, entry.name]);
        continue;
      }
      if (!entry.name.endsWith('.tsx')) continue;
      // `+not-found.tsx`, `_layout.tsx` ne servent pas de route nommée.
      const base = entry.name.replace(/\.(web|native|ios|android)\.tsx$/, '').replace(/\.tsx$/, '');
      if (base.startsWith('_') || base.startsWith('+')) continue;
      const full = [...segs, base];
      const at = full.findIndex((s) => s.startsWith('['));
      if (at === -1) continue; // route statique : rien à rédiger
      out.add(`/${full.slice(0, at).join('/')}/`);
    }
  };
  walk(appDir, []);
  return [...out].sort();
}

Deno.test('BALAYAGE — toute route dynamique du dépôt est rédigée (aucune liste blanche)', () => {
  const prefixes = dynamicRoutePrefixes();
  // Filet : si le balayage ne trouve plus rien, c'est le TEST qui est cassé.
  assert(prefixes.length >= 5, `balayage vide ou partiel : ${prefixes.join(', ')}`);
  // Une valeur qui ne peut PAS apparaître dans un patron rédigé : si elle
  // survit à la normalisation, le segment a fui tel quel dans `$screen`.
  const SECRET = 'zz-secret-9f3a';
  for (const prefix of prefixes) {
    const got = normalizeScreenPath(`${prefix}${SECRET}`);
    assert(
      !got.includes(SECRET),
      `la route dynamique ${prefix}[…] n’est pas rédigée : $screen vaudrait « ${got} ». ` +
        'Ajoute-la à DYNAMIC_ROUTES (lib/screenName.ts) avant de la livrer.',
    );
  }
});
