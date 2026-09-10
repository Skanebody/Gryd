/**
 * GRYD — LES FILTRES DE §2.7 ENVOIENT CE QUE LE SERVEUR ATTEND (LOT Q4).
 *
 * ÉTAPE 0 — LE DÉFAUT EXISTAIT, et il est mesurable : `crewManagementData.ts`
 * (commit 685e769) écrivait, en dur, dans la charge utile de
 * `crew_discovery_2026` :
 *
 *     p_min_members: null,
 *     p_max_members: null,
 *     p_tags: null,
 *
 * et l'écran appelait le hook avec `{ ...NO_DISCOVERY_FILTERS, cityId, query }`,
 * donc `p_activity` et `p_active_only` valaient eux aussi leur défaut. Cinq
 * paramètres sur neuf ne pouvaient JAMAIS varier : la migration 0190 était
 * déployée en production et à moitié morte. Les tests ci-dessous n'existent que
 * pour que ça ne se reproduise pas en silence.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { CREW_MAX_MEMBERS } from '@klaim/shared';
import {
  CREW_SIZE_BANDS_2026,
  CREW_SIZE_MEDIUM_MAX_2026,
  CREW_SIZE_SMALL_MAX_2026,
  CREW_TAG_FILTER_MAX_2026,
  NO_DISCOVERY_FILTER_STATE_2026 as VIDE,
  canAddDiscoveryTag2026,
  discoveryFiltersActive2026,
  discoveryPayload2026,
  sizeBandBounds2026,
  toggleDiscoveryTag2026,
} from './crewDiscoveryFilters2026.ts';

// ═══════════════════════════════════════════════════════════════════════════
// ① SANS FILTRE, RIEN NE PART — ET SURTOUT PAS UNE CHAÎNE VIDE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('découverte : l’état vide n’envoie AUCUNE contrainte', () => {
  const p = discoveryPayload2026(VIDE);
  assertEquals(p.p_activity, null);
  assertEquals(p.p_recruitment, null);
  assertEquals(p.p_requirements, null);
  assertEquals(p.p_min_members, null);
  assertEquals(p.p_max_members, null);
  assertEquals(p.p_tags, null);
  assertEquals(p.p_active_only, false);
  assertEquals(p.p_query, null);
});

Deno.test('découverte : une recherche VIDE n’est pas la recherche de la chaîne vide', () => {
  assertEquals(discoveryPayload2026({ ...VIDE, query: '   ' }).p_query, null);
  assertEquals(discoveryPayload2026({ ...VIDE, query: ' foulées ' }).p_query, 'foulées');
});

Deno.test('découverte : un tableau d’étiquettes VIDE part en `null`, jamais en `[]`', () => {
  // Le serveur se protège (`array_length(p_tags, 1) is null`), mais lui envoyer
  // `[]` reviendrait à lui demander de se rattraper.
  assertEquals(discoveryPayload2026({ ...VIDE, tags: [] }).p_tags, null);
});

// ═══════════════════════════════════════════════════════════════════════════
// ② LES TRANCHES DE TAILLE COUVRENT TOUT, SANS TROU NI RECOUVREMENT
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('taille : les bornes se dérivent de CREW_MAX_MEMBERS, pas d’un nombre magique', () => {
  assertEquals(CREW_SIZE_SMALL_MAX_2026, Math.round(CREW_MAX_MEMBERS / 5));
  assertEquals(CREW_SIZE_MEDIUM_MAX_2026, Math.round(CREW_MAX_MEMBERS / 2));
  assert(CREW_SIZE_SMALL_MAX_2026 < CREW_SIZE_MEDIUM_MAX_2026);
  assert(CREW_SIZE_MEDIUM_MAX_2026 < CREW_MAX_MEMBERS);
});

Deno.test('taille : les trois tranches sont contiguës et couvrent 1..CREW_MAX_MEMBERS', () => {
  const petit = sizeBandBounds2026('small');
  const moyen = sizeBandBounds2026('medium');
  const grand = sizeBandBounds2026('large');
  assertEquals(petit.min, null);
  assertEquals(petit.max, CREW_SIZE_SMALL_MAX_2026);
  // Contiguïté : le premier membre du moyen suit immédiatement le dernier petit.
  assertEquals(moyen.min, (petit.max ?? 0) + 1);
  assertEquals(grand.min, (moyen.max ?? 0) + 1);
  assertEquals(grand.max, null);
  // Aucun effectif possible ne tombe hors des trois tranches.
  for (let n = 1; n <= CREW_MAX_MEMBERS; n += 1) {
    const dedans = CREW_SIZE_BANDS_2026.filter((b) => {
      const { min, max } = sizeBandBounds2026(b);
      return (min === null || n >= min) && (max === null || n <= max);
    });
    assertEquals(dedans.length, 1, `l’effectif ${n} tombe dans ${dedans.length} tranches`);
  }
});

Deno.test('taille : « peu importe » n’envoie aucune borne', () => {
  const p = discoveryPayload2026({ ...VIDE, size: null });
  assertEquals(p.p_min_members, null);
  assertEquals(p.p_max_members, null);
});

// ═══════════════════════════════════════════════════════════════════════════
// ③ LES ÉTIQUETTES : TROIS AU PLUS, ET AUCUNE NE SE DÉCOCHE TOUTE SEULE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('étiquettes : cocher, décocher, et le plafond de §2.7', () => {
  let tags: readonly string[] = [];
  tags = toggleDiscoveryTag2026(tags, 'casual');
  assertEquals(tags, ['casual']);
  tags = toggleDiscoveryTag2026(tags, 'raid');
  tags = toggleDiscoveryTag2026(tags, 'pionnier');
  assertEquals(tags.length, CREW_TAG_FILTER_MAX_2026);
  // La quatrième est REFUSÉE, et surtout : elle ne chasse pas la première.
  const apres = toggleDiscoveryTag2026(tags, 'defense');
  assertEquals(apres, tags, 'une étiquette s’est décochée toute seule');
  // Décocher reste possible même au plafond, sinon on ne pourrait plus rien changer.
  assertEquals(toggleDiscoveryTag2026(tags, 'raid'), ['casual', 'pionnier']);
});

Deno.test('étiquettes : l’écran sait AVANT le tap si un choix peut aboutir', () => {
  const trois = ['casual', 'raid', 'pionnier'];
  // Déjà cochée : toujours actionnable (on doit pouvoir la retirer).
  assertEquals(canAddDiscoveryTag2026(trois, 'raid'), true);
  // Quatrième : non. Un bouton qui ne répond pas se lit comme une panne.
  assertEquals(canAddDiscoveryTag2026(trois, 'defense'), false);
  assertEquals(canAddDiscoveryTag2026(['casual'], 'defense'), true);
});

// ═══════════════════════════════════════════════════════════════════════════
// ④ « EST-CE QUE JE FILTRE ? » — LA QUESTION QUI DÉCIDE SI LA LISTE SE RÉDUIT
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('actif : la commune et la recherche ne comptent PAS comme un filtre serveur', () => {
  // Elles sont servies par `crew_discovery` (0152), qui reste la source de la
  // liste. Les compter ferait retirer des lignes sur la foi d'une lecture
  // (0190) qu'on n'a pas demandée, et une panne de 0190 viderait une recherche
  // ordinaire.
  assertEquals(discoveryFiltersActive2026({ ...VIDE, cityId: '76540' }), false);
  assertEquals(discoveryFiltersActive2026({ ...VIDE, query: 'foulées' }), false);
});

Deno.test('actif : chacun des cinq critères de 0190 suffit à lui seul', () => {
  assertEquals(discoveryFiltersActive2026({ ...VIDE, activity: 'bike' }), true);
  assertEquals(discoveryFiltersActive2026({ ...VIDE, recruitment: 'open' }), true);
  assertEquals(discoveryFiltersActive2026({ ...VIDE, requirements: 'eligible' }), true);
  assertEquals(discoveryFiltersActive2026({ ...VIDE, size: 'small' }), true);
  assertEquals(discoveryFiltersActive2026({ ...VIDE, tags: ['casual'] }), true);
  assertEquals(discoveryFiltersActive2026({ ...VIDE, activeOnly: true }), true);
});

// ═══════════════════════════════════════════════════════════════════════════
// ⑤ LA CHARGE UTILE COMPLÈTE, TELLE QUE 0190 L'ACCEPTE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('découverte : les neuf paramètres partent, et aucun n’est figé', () => {
  const p = discoveryPayload2026({
    cityId: '76540',
    query: 'nord',
    activity: 'bike',
    recruitment: 'on_request',
    requirements: 'eligible',
    size: 'medium',
    tags: ['casual', 'debutants_ok'],
    activeOnly: true,
  });
  assertEquals(p, {
    p_city_id: '76540',
    p_query: 'nord',
    p_activity: 'bike',
    p_recruitment: 'on_request',
    p_min_members: CREW_SIZE_SMALL_MAX_2026 + 1,
    p_max_members: CREW_SIZE_MEDIUM_MAX_2026,
    p_requirements: 'eligible',
    p_active_only: true,
    p_tags: ['casual', 'debutants_ok'],
  });
  // Les neuf clés de la signature SQL, ni plus ni moins : une clé inconnue
  // ferait échouer l'appel PostgREST entier.
  assertEquals(Object.keys(p).length, 9);
});

Deno.test('découverte : les valeurs envoyées sont celles du catalogue FERMÉ du serveur', () => {
  // 0190 refuse `bad_activity` / `bad_recruitment` / `bad_requirements` au lieu
  // de rogner : une valeur inventée ici rendrait une liste vide sans un mot.
  const sql = Deno.readTextFileSync(
    new URL('../../../../../../supabase/migrations/0190_crew_inactivity_2026.sql', import.meta.url),
  );
  assert(sql.includes("p_activity not in ('run', 'bike')"), 'le catalogue discipline a bougé');
  assert(
    sql.includes("p_recruitment not in ('open', 'on_request', 'invite_only')"),
    'le catalogue accueil a bougé',
  );
  assert(
    sql.includes("p_requirements not in ('none', 'any', 'eligible')"),
    'le catalogue conditions a bougé',
  );
  // Et les bornes de taille sont bien LUES par la RPC (elles ne l'étaient pas
  // côté client, mais elles l'étaient côté serveur — d'où le trou).
  assert(sql.includes('fp.member_count >= p_min_members'), 'la borne basse n’est plus lue');
  assert(sql.includes('fp.member_count <= p_max_members'), 'la borne haute n’est plus lue');
  assert(sql.includes('c.tags && p_tags'), 'les étiquettes ne sont plus lues');
});
