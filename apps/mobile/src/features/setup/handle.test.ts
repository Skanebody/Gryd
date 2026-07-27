/**
 * GRYD — E08 `/setup/profile` : les règles du @handle, vérifiées SANS device et
 * SANS réseau.
 *
 * Ce que ces tests protègent, par ordre de gravité :
 *
 *  1. QU'AUCUNE FONCTION DE CE MODULE N'AFFIRME UNE DISPONIBILITÉ. Un handle
 *     bien formé n'est pas un handle libre ; un candidat de repêchage n'est pas
 *     une pill à afficher. Confondre les deux, c'est la donnée fabriquée que la
 *     charte interdit — et c'est le piège naturel de cet écran.
 *  2. QUE `handleFormatIssue` NE CONTREDISE JAMAIS `HANDLE_REGEX`. La regex est
 *     le miroir exact du `check` SQL de 0011 ; un client plus permissif enverrait
 *     le joueur au-devant d'une 23505 opaque, un client plus strict lui
 *     interdirait un nom que la base accepte. Le test croise les deux sur un
 *     corpus, il ne se contente pas de quelques cas choisis.
 *  3. QUE LE CTA NE SOIT JAMAIS UN BOUTON MORT — ni un bouton gelé. Il refuse
 *     ce dont le serveur a déjà dit non, et il n'attend PAS une vérification en
 *     vol ni une app hors ligne.
 *  4. QUE LES QUATRE ÉTATS RESTENT DISTINCTS jusque dans l'analytique : une
 *     vérification en cours n'est pas un verdict, et ne doit pas en devenir un
 *     dans un tableau de bord.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH, HANDLE_REGEX } from '@klaim/shared';
import {
  HANDLE_SUGGESTION_PROBE_MAX,
  type HandleAvailability,
  citySource,
  handleCheckResult,
  handleFormatIssue,
  handleSuggestionCandidates,
  normalizeHandleInput,
  profileDraftBlock,
  saveFailureKind,
} from './handle.ts';

// ═══════════════════════════════════════════════════════════════════════════
// FILTRE DE SAISIE
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('la saisie est ramenée en minuscules — « KORO » et « koro » ne peuvent pas coexister', () => {
  assertEquals(normalizeHandleInput('KoRo'), 'koro');
});

Deno.test('les caractères hors alphabet sont écartés à la frappe, pas grondés après coup', () => {
  assertEquals(normalizeHandleInput('ko-ro!'), 'koro');
  assertEquals(normalizeHandleInput('ko ro'), 'koro');
  assertEquals(normalizeHandleInput('koro@gryd.app'), 'korogrydapp');
});

Deno.test('les accents ne sont pas translittérés, ils sont écartés (le handle sert d’URL publique)', () => {
  // « é » ré-encodé produirait deux graphies visant le même profil.
  assertEquals(normalizeHandleInput('kéro'), 'kro');
});

Deno.test('la saisie est bornée à HANDLE_MAX_LENGTH', () => {
  const long = normalizeHandleInput('a'.repeat(HANDLE_MAX_LENGTH + 12));
  assertEquals(long.length, HANDLE_MAX_LENGTH);
});

Deno.test('la borne compte les caractères RETENUS, pas les caractères tapés', () => {
  // 30 caractères tapés, dont un sur deux est écarté : on ne doit pas couper à
  // 20 caractères TAPÉS (ce qui rendrait 10 retenus) mais retenir 15 valides.
  const typed = 'a!'.repeat(15);
  assertEquals(normalizeHandleInput(typed), 'a'.repeat(15));
});

Deno.test('le filtre de saisie ne PRÉTEND PAS valider : une chaîne trop courte sort telle quelle', () => {
  const kept = normalizeHandleInput('ab');
  assertEquals(kept, 'ab');
  // …et c'est bien `handleFormatIssue` qui dit ce qui cloche.
  assertEquals(handleFormatIssue(kept), 'too_short');
});

// ═══════════════════════════════════════════════════════════════════════════
// FORMAT — ACCORD AVEC LE `check` SQL
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('chaque motif de format est nommé, jamais un « invalide » opaque', () => {
  assertEquals(handleFormatIssue('a'.repeat(HANDLE_MIN_LENGTH - 1)), 'too_short');
  assertEquals(handleFormatIssue('a'.repeat(HANDLE_MAX_LENGTH + 1)), 'too_long');
  assertEquals(handleFormatIssue('ko-ro'), 'bad_chars');
  assertEquals(handleFormatIssue('KORO'), 'bad_chars');
  assertEquals(handleFormatIssue('koro'), null);
});

Deno.test('la longueur est annoncée AVANT l’alphabet (on ne gronde pas sur ce qui n’a pas été tapé)', () => {
  // Deux caractères ET un caractère interdit : le joueur doit lire « trop court ».
  assertEquals(handleFormatIssue('k-'), 'too_short');
});

Deno.test('les bornes exactes sont acceptées (pas de décalage d’une unité contre la base)', () => {
  assertEquals(handleFormatIssue('a'.repeat(HANDLE_MIN_LENGTH)), null);
  assertEquals(handleFormatIssue('a'.repeat(HANDLE_MAX_LENGTH)), null);
});

Deno.test('handleFormatIssue ne contredit JAMAIS HANDLE_REGEX (miroir du check 0011)', () => {
  const corpus = [
    '',
    'a',
    'ab',
    'abc',
    '___',
    '_',
    '0',
    '000',
    'koro',
    'koro_',
    '_koro',
    'ko__ro',
    'koro2',
    'k1_9',
    'Koro',
    'KORO',
    'ko-ro',
    'ko.ro',
    'ko ro',
    'koro!',
    'kéro',
    'коро',
    '🏃',
    'a'.repeat(HANDLE_MIN_LENGTH),
    'a'.repeat(HANDLE_MAX_LENGTH),
    'a'.repeat(HANDLE_MAX_LENGTH + 1),
    'a'.repeat(HANDLE_MAX_LENGTH * 2),
  ];
  for (const value of corpus) {
    const accepted = handleFormatIssue(value) === null;
    assertEquals(
      accepted,
      HANDLE_REGEX.test(value),
      `désaccord client/base sur « ${value} » : le serveur dirait ${HANDLE_REGEX.test(value)}`,
    );
  }
});

Deno.test('tout ce qui SORT du filtre de saisie et atteint la longueur minimale est accepté par la base', () => {
  const typed = [
    'KORO',
    'ko-ro',
    'ko ro',
    'koro@gryd.app',
    'Élodie_92',
    '____',
    'a'.repeat(HANDLE_MAX_LENGTH + 30),
  ];
  for (const raw of typed) {
    const kept = normalizeHandleInput(raw);
    if (kept.length < HANDLE_MIN_LENGTH) continue;
    assert(HANDLE_REGEX.test(kept), `le filtre a laissé passer « ${kept} » (depuis « ${raw} »)`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// SUGGESTIONS — DES CANDIDATS, PAS DES PROMESSES
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('les candidats sont déterministes et partent de 2 (le premier « koro » s’appelle koro)', () => {
  const first = handleSuggestionCandidates('koro', 4);
  assertEquals([...first], ['koro2', 'koro_2', 'koro3', 'koro_3']);
  // Deux appels identiques rendent la même chose : les pills ne dansent pas
  // sous les doigts entre deux rendus.
  assertEquals([...handleSuggestionCandidates('koro', 4)], [...first]);
});

Deno.test('AUCUN candidat ne suggère un statut (les handles « misleading » de 0047)', () => {
  const banned = ['official', 'officiel', 'verified', 'verifie', 'real', 'pro', 'gryd'];
  for (const base of ['koro', 'lea', 'zoe_9']) {
    for (const candidate of handleSuggestionCandidates(base, HANDLE_SUGGESTION_PROBE_MAX)) {
      const added = candidate.slice(base.replace(/_+$/, '').length);
      for (const word of banned) {
        assert(!added.includes(word), `« ${candidate} » ajoute « ${word} » à la base`);
      }
    }
  }
});

Deno.test('aucun candidat n’enferme dans une discipline (le vélo est de première classe)', () => {
  for (const candidate of handleSuggestionCandidates('koro', HANDLE_SUGGESTION_PROBE_MAX)) {
    assert(!candidate.includes('run'), `« ${candidate} » présuppose la course à pied`);
    assert(!candidate.includes('bike'), `« ${candidate} » présuppose le vélo`);
  }
});

Deno.test('un candidat est toujours une chaîne que la BASE accepterait — jamais une pill morte', () => {
  const bases = ['abc', 'koro', 'k'.repeat(HANDLE_MAX_LENGTH), 'k'.repeat(HANDLE_MAX_LENGTH - 1), '___'];
  for (const base of bases) {
    for (const candidate of handleSuggestionCandidates(base, HANDLE_SUGGESTION_PROBE_MAX)) {
      assert(HANDLE_REGEX.test(candidate), `candidat refusé par la base : « ${candidate} »`);
    }
  }
});

Deno.test('une base à la limite de longueur est TRONQUÉE pour laisser la place au suffixe', () => {
  const base = 'k'.repeat(HANDLE_MAX_LENGTH);
  const candidates = handleSuggestionCandidates(base, 3);
  assert(candidates.length > 0, 'une base valide doit produire des candidats');
  for (const candidate of candidates) {
    assertEquals(candidate.length <= HANDLE_MAX_LENGTH, true, `« ${candidate} » dépasse la borne`);
  }
});

Deno.test('les underscores de fin sont élagués — pas de « koro__2 »', () => {
  const candidates = handleSuggestionCandidates('koro_', 4);
  for (const candidate of candidates) {
    assert(!candidate.includes('__'), `« ${candidate} » colle deux underscores`);
  }
  assertEquals(candidates[0], 'koro2');
});

Deno.test('une base entièrement en underscores garde sa forme plutôt que de ne rien produire', () => {
  // `___` est un handle VALIDE en base. L'élagage le viderait ; on le garde.
  const candidates = handleSuggestionCandidates('___', 2);
  assertEquals(candidates.length, 2);
  for (const candidate of candidates) {
    assert(HANDLE_REGEX.test(candidate), `« ${candidate} » n'est pas un handle valide`);
  }
});

Deno.test('les candidats sont tous distincts et ne re-proposent jamais la saisie elle-même', () => {
  const base = 'koro';
  const candidates = handleSuggestionCandidates(base, HANDLE_SUGGESTION_PROBE_MAX);
  assertEquals(new Set(candidates).size, candidates.length);
  assert(!candidates.includes(base), 'la saisie refusée ne doit pas être reproposée');
});

Deno.test('une base à la forme cassée ne produit RIEN (on ne varie pas sur un refus certain)', () => {
  assertEquals(handleSuggestionCandidates('ab', 3).length, 0);
  assertEquals(handleSuggestionCandidates('ko-ro', 3).length, 0);
  assertEquals(handleSuggestionCandidates('', 3).length, 0);
});

Deno.test('un budget nul ou négatif ne déclenche aucune requête', () => {
  assertEquals(handleSuggestionCandidates('koro', 0).length, 0);
  assertEquals(handleSuggestionCandidates('koro', -1).length, 0);
});

Deno.test('la fonction rend AU PLUS ce qu’on demande et termine toujours', () => {
  for (const count of [1, 3, HANDLE_SUGGESTION_PROBE_MAX, 40]) {
    const candidates = handleSuggestionCandidates('koro', count);
    assert(candidates.length <= count, `${candidates.length} candidats pour un budget de ${count}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// LE CTA — NI MORT, NI GELÉ
// ═══════════════════════════════════════════════════════════════════════════

const IDLE: HandleAvailability = { state: 'idle' };
const FREE: HandleAvailability = { state: 'free' };
const CHECKING: HandleAvailability = { state: 'checking' };
const UNKNOWN: HandleAvailability = { state: 'unknown' };
const TAKEN: HandleAvailability = { state: 'refused', reason: 'taken' };
const RESERVED: HandleAvailability = { state: 'refused', reason: 'reserved' };

const COMPLETE = { displayName: 'Koro', handle: 'koro', cityId: 'paris' } as const;

Deno.test('un brouillon complet et confirmé libre est enregistrable', () => {
  assertEquals(profileDraftBlock(COMPLETE, FREE), null);
});

Deno.test('les trois champs de la spec sont exigés, chacun avec son propre motif', () => {
  assertEquals(profileDraftBlock({ ...COMPLETE, displayName: '   ' }, FREE), 'name_required');
  assertEquals(profileDraftBlock({ ...COMPLETE, handle: '' }, FREE), 'handle_required');
  assertEquals(profileDraftBlock({ ...COMPLETE, cityId: '' }, FREE), 'city_required');
});

Deno.test('le format cassé remonte son motif exact au lieu d’un refus muet', () => {
  assertEquals(profileDraftBlock({ ...COMPLETE, handle: 'ab' }, IDLE), 'too_short');
  assertEquals(profileDraftBlock({ ...COMPLETE, handle: 'a'.repeat(HANDLE_MAX_LENGTH + 1) }, IDLE), 'too_long');
});

Deno.test('un refus SERVEUR connu bloque le CTA — un bouton qui échoue à coup sûr est mort', () => {
  assertEquals(profileDraftBlock(COMPLETE, TAKEN), 'handle_taken');
  assertEquals(profileDraftBlock(COMPLETE, RESERVED), 'handle_reserved');
});

Deno.test('une vérification EN COURS ne gèle pas le formulaire (checking n’est pas un refus)', () => {
  assertEquals(profileDraftBlock(COMPLETE, CHECKING), null);
});

Deno.test('hors ligne, on peut tenter : le serveur reste seul juge', () => {
  assertEquals(profileDraftBlock(COMPLETE, UNKNOWN), null);
});

Deno.test('rien n’a encore été vérifié : le CTA reste actionnable, il n’attend aucun verdict', () => {
  assertEquals(profileDraftBlock(COMPLETE, IDLE), null);
});

Deno.test('un champ manquant prime sur un verdict serveur périmé', () => {
  // Le handle a changé mais le verdict porte encore sur l'ancien : le nom
  // manquant reste la vraie raison, et c'est elle qu'on montre.
  assertEquals(profileDraftBlock({ ...COMPLETE, displayName: '' }, TAKEN), 'name_required');
});

Deno.test('un nom fait d’espaces seuls n’est pas un nom', () => {
  assertEquals(profileDraftBlock({ ...COMPLETE, displayName: '\n\t  ' }, FREE), 'name_required');
});

// ═══════════════════════════════════════════════════════════════════════════
// ÉCHECS D'ENREGISTREMENT
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('une violation d’unicité (23505) est le SEUL cas où l’on nomme le handle', () => {
  assertEquals(saveFailureKind({ code: '23505', message: 'duplicate key value' }), 'handle_taken');
});

Deno.test('une panne de transport se dit « réseau », pas « handle pris »', () => {
  assertEquals(saveFailureKind(new TypeError('Network request failed')), 'network');
  assertEquals(saveFailureKind({ message: 'Failed to fetch' }), 'network');
});

Deno.test('tout le reste est « inconnu » — on ne devine JAMAIS une cause', () => {
  assertEquals(saveFailureKind({ code: '23514', message: 'check constraint' }), 'unknown');
  assertEquals(saveFailureKind({ message: 'permission denied for table user_profiles' }), 'unknown');
  assertEquals(saveFailureKind(null), 'unknown');
  assertEquals(saveFailureKind(undefined), 'unknown');
  assertEquals(saveFailureKind('boom'), 'unknown');
  assertEquals(saveFailureKind({}), 'unknown');
});

// ═══════════════════════════════════════════════════════════════════════════
// ANALYTIQUE — LES QUATRE ÉTATS RESTENT DISTINCTS
// ═══════════════════════════════════════════════════════════════════════════

Deno.test('un non-verdict ne remonte RIEN (sinon le KPI compterait des instants muets)', () => {
  assertEquals(handleCheckResult(IDLE), null);
  assertEquals(handleCheckResult(CHECKING), null);
});

Deno.test('chaque verdict remonte sa clé fermée, miroir de events.ts', () => {
  assertEquals(handleCheckResult(FREE), 'free');
  assertEquals(handleCheckResult(TAKEN), 'taken');
  assertEquals(handleCheckResult(RESERVED), 'reserved');
  assertEquals(handleCheckResult({ state: 'refused', reason: 'bad_chars' }), 'bad_chars');
  assertEquals(handleCheckResult(UNKNOWN), 'unknown');
});

Deno.test('« ne pas savoir » est une valeur à part entière, jamais confondue avec « libre »', () => {
  assert(handleCheckResult(UNKNOWN) !== handleCheckResult(FREE));
});

Deno.test('city_source distingue la ville déduite de la ville corrigée', () => {
  assertEquals(citySource('paris', 'paris'), 'location');
  assertEquals(citySource('paris', 'lille'), 'manual');
});

Deno.test('sans ville déduite, tout choix est manuel (on n’attribue pas au GPS ce qu’il n’a pas dit)', () => {
  assertEquals(citySource(null, 'lille'), 'manual');
  assertEquals(citySource(null, ''), 'manual');
});
