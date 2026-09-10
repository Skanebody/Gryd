/**
 * GRYD — ce que l'écran a le droit de conclure d'une réponse de
 * `my_privacy_settings_2026()` (0135).
 *
 * ÉTAPE 0 — LE DÉFAUT EXISTAIT : avant ce module, `profileVisibility` n'était
 * qu'une clé d'AsyncStorage (`./prefs.ts`), sans `mapSharing`, sans
 * `discreetMode` et sans `hasProfile` — donc sans aucun des trois leviers que le
 * serveur lit réellement (0126). Le premier test le CONSTATE sur le module
 * legacy lui-même : si un jour `PrivacyPrefs` reprenait ces clés, il faudrait
 * décider laquelle des deux sources fait foi, et ce test le rappellerait.
 *
 * Ce que les suivants protègent :
 *  1. une charge utile incomplète ou hors domaine ne devient JAMAIS un réglage
 *     « par défaut » silencieux — sur cette page, deviner c'est affirmer ;
 *  2. « Mes territoires portent mon nom » reste l'INVERSE exact de
 *     `discreet_mode` (0126 lit la colonne, pas la case) ;
 *  3. `profile_required` ne se confond pas avec un échec réseau : c'est le seul
 *     refus auquel le joueur peut remédier.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { DEFAULT_PRIVACY, parsePrivacyPrefs } from './prefs.ts';
import {
  MAP_SHARING_VALUES,
  PROFILE_VISIBILITY_VALUES,
  communeBoardPresence,
  nameOnTerritories,
  parsePrivacyAudience,
  privacyWriteFailure,
  withNameOnTerritories,
  withProfileVisibility,
  type PrivacyAudience,
} from './audience.ts';

const SERVER: PrivacyAudience = {
  profileVisibility: 'crew',
  mapSharing: 'simplified',
  discreetMode: false,
  hasProfile: true,
};

Deno.test('étape 0 — le miroir local ne portait aucun des trois leviers serveur', () => {
  // Ce que le téléphone stockait, et ce qu'il stocke encore : le partage de
  // carte et le mode discret n'y ont jamais figuré.
  const local = parsePrivacyPrefs(null);
  assertEquals(Object.keys(local).sort(), ['maskEndpoints']);
  assertEquals('mapSharing' in local, false);
  assertEquals('discreetMode' in local, false);
  assertEquals('profileVisibility' in DEFAULT_PRIVACY, false);
});

Deno.test('les domaines sont exactement ceux des `check` de user_profiles (0011)', () => {
  assertEquals([...PROFILE_VISIBILITY_VALUES].sort(), ['crew', 'friends', 'private', 'public']);
  assertEquals([...MAP_SHARING_VALUES].sort(), ['none', 'precise', 'simplified', 'territory_only']);
});

Deno.test('une charge utile complète est lue telle quelle', () => {
  assertEquals(
    parsePrivacyAudience({
      hasProfile: true,
      profileVisibility: 'public',
      mapSharing: 'none',
      discreetMode: true,
      updatedAt: '2026-09-10T00:00:00Z',
    }),
    { profileVisibility: 'public', mapSharing: 'none', discreetMode: true, hasProfile: true },
  );
});

Deno.test('l’état « sans profil » est LU, pas deviné', () => {
  const audience = parsePrivacyAudience({
    hasProfile: false,
    profileVisibility: 'crew',
    mapSharing: 'simplified',
    discreetMode: false,
    updatedAt: null,
  });
  assertEquals(audience?.hasProfile, false);
});

Deno.test('AUCUN REPLI INVENTÉ : incomplet ou hors domaine → null, jamais un défaut', () => {
  const payloads: unknown[] = [
    null,
    undefined,
    42,
    'crew',
    {},
    { hasProfile: true, profileVisibility: 'crew', mapSharing: 'simplified' },
    { hasProfile: true, profileVisibility: 'followers', mapSharing: 'simplified', discreetMode: false },
    { hasProfile: true, profileVisibility: 'crew', mapSharing: 'everything', discreetMode: false },
    { hasProfile: true, profileVisibility: 'crew', mapSharing: 'simplified', discreetMode: 'oui' },
    { profileVisibility: 'crew', mapSharing: 'simplified', discreetMode: false },
  ];
  for (const payload of payloads) assertEquals(parsePrivacyAudience(payload), null, String(payload));
});

Deno.test('« Mes territoires portent mon nom » est l’inverse EXACT de discreet_mode', () => {
  assertEquals(nameOnTerritories(SERVER), true);
  assertEquals(nameOnTerritories({ ...SERVER, discreetMode: true }), false);
  assertEquals(withNameOnTerritories(SERVER, false).discreetMode, true);
  assertEquals(withNameOnTerritories(SERVER, true).discreetMode, false);
  // Le patch ne touche QUE la colonne visée.
  assertEquals(withNameOnTerritories(SERVER, false).mapSharing, SERVER.mapSharing);
  assertEquals(withNameOnTerritories(SERVER, false).profileVisibility, SERVER.profileVisibility);
});

Deno.test('changer l’audience ne déplace aucun autre réglage', () => {
  const next = withProfileVisibility({ ...SERVER, discreetMode: true }, 'private');
  assertEquals(next, {
    profileVisibility: 'private',
    mapSharing: 'simplified',
    discreetMode: true,
    hasProfile: true,
  });
});

Deno.test('profile_required a son verdict à lui, distinct d’un échec', () => {
  assertEquals(privacyWriteFailure('profile_required'), { kind: 'profile-required' });
  assertEquals(
    privacyWriteFailure('new row violates row-level security policy'),
    { kind: 'failed' },
  );
  assertEquals(privacyWriteFailure('TypeError: Network request failed'), { kind: 'failed' });
  assertEquals(privacyWriteFailure('invalid_privacy_settings'), { kind: 'failed' });
});

// ════════════════════════════════════════════════════════════════════════════
// LE CLASSEMENT DE COMMUNE (0160-0164) — CE QUE L'ÉCRAN A LE DROIT D'EN DIRE
// ════════════════════════════════════════════════════════════════════════════
//
// ÉTAPE 0 — LE DÉFAUT EXISTAIT, ET IL A DEUX FACES. Le 10/09 au matin, l'écran
// portait « Apparaître dans les classements · Bientôt », un interrupteur mort ;
// il a été retiré au motif — vrai à cette heure-là — qu'aucun classement
// n'existait. Les migrations 0160-0164 en ont ouvert un le jour même. Depuis,
// `discreet_mode` a une SECONDE conséquence que rien ne disait : il exclut la
// personne du tableau de sa commune, entièrement. Le premier test lit les
// migrations et échouerait si cette lecture disparaissait — auquel cas la
// conséquence affichée deviendrait, à son tour, une promesse sans code.
Deno.test('étape 0 — le classement de commune lit bien les colonnes de cet écran', async () => {
  const sql = await Deno.readTextFile(
    new URL('../../../../../supabase/migrations/0161_leaderboard_2026_source_metrics.sql', import.meta.url),
  );
  // Les DEUX exclusions que l'écran doit désormais annoncer.
  assertEquals(sql.includes('not coalesce(up.discreet_mode, true)'), true);
  assertEquals(sql.includes("up.map_sharing <> 'none'"), true);
  // Et le NOM d'une ligne classée passe par le même arbitre que la carte.
  const read = await Deno.readTextFile(
    new URL('../../../../../supabase/migrations/0164_leaderboard_2026_read.sql', import.meta.url),
  );
  assertEquals(read.includes('public.territory_owner_identity_2026(e.subject_id, v_viewer)'), true);
});

Deno.test('classable : la ligne existe, et son nom suit « Profil visible par »', () => {
  assertEquals(communeBoardPresence(SERVER), { kind: 'listed', namedFor: 'crew' });
  assertEquals(
    communeBoardPresence({ ...SERVER, profileVisibility: 'private' }),
    { kind: 'listed', namedFor: 'private' },
  );
});

Deno.test('discret : le tableau ne compte pas la personne du tout', () => {
  assertEquals(
    communeBoardPresence({ ...SERVER, discreetMode: true }),
    { kind: 'hidden-by-discretion' },
  );
});

Deno.test('carte fermée : l’exclusion la plus large passe AVANT la discrétion', () => {
  // Les deux à la fois : on nomme `map_sharing`, parce que c'est le seul motif
  // que l'interrupteur du nom ne lèverait PAS — le taire ferait croire qu'un
  // tap suffit à revenir dans le tableau.
  assertEquals(
    communeBoardPresence({ ...SERVER, mapSharing: 'none', discreetMode: true }),
    { kind: 'hidden-by-map' },
  );
  assertEquals(
    communeBoardPresence({ ...SERVER, mapSharing: 'none' }),
    { kind: 'hidden-by-map' },
  );
});

Deno.test('sans profil, aucun classement — et ce n’est pas une ignorance', () => {
  assertEquals(
    communeBoardPresence({ ...SERVER, hasProfile: false }),
    { kind: 'hidden-by-no-profile' },
  );
  // Même sans profil, le fail-closed prime sur toute autre valeur lue.
  assertEquals(
    communeBoardPresence({ ...SERVER, hasProfile: false, discreetMode: true, mapSharing: 'none' }),
    { kind: 'hidden-by-no-profile' },
  );
});
