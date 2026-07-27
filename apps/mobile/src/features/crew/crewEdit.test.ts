/**
 * GRYD — ÉDITION DE CREW : les décisions du formulaire, prouvées.
 *
 * Trois familles, et les trois comptent :
 *
 *   1. LA LECTURE DÉFENSIVE du jsonb. Le cas décisif : `{ok:false}` ne devient
 *      JAMAIS un contexte à moitié rempli. Un écran qui recevrait un contexte
 *      vide croirait éditer un crew sans nom, et l'écrirait.
 *
 *   2. LE DIFF — ce qui part vraiment sur le réseau. C'est lui qui garantit
 *      qu'on ne renomme pas en corrigeant une virgule : le renommage est PAYANT
 *      (CREW_RENAME_FOULEES), donc un diff bavard coûte des foulées au joueur.
 *      Les pièges testés : espaces en bordure, tags réordonnés, description
 *      absente encodée `null` d'un côté et `''` de l'autre.
 *
 *   3. « AUCUN BOUTON MORT » (§A4), exprimé en fonction pure. `blockReason`
 *      échoue sur un code qui laisserait un fondateur à sec appuyer sur un CTA
 *      chartreuse condamné, ou qui peindrait « Enregistrer » à un runner sans
 *      droit. C'est la règle du projet transformée en test, pas en intention.
 */
import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  DESCRIPTION_MAX,
  NAME_MAX,
  blockReason,
  draftOf,
  isDirty,
  parseEditContext,
  parseEditableCrew,
  payloadOf,
  refusalOf,
  shortfallOf,
  toggleTag,
  willRename,
  type EditContext,
  type EditableCrew,
} from './crewEdit.ts';

const CREW: EditableCrew = {
  id: 'c1',
  name: 'Les Berges',
  description: null,
  recruitmentStatus: 'on_request',
  tags: [],
};

const ctxOf = (over: Partial<EditContext> = {}): EditContext => ({
  role: 'founder',
  crew: CREW,
  can: { name: true, description: true, recruitment: true },
  renameCostFoulees: 300,
  myFoulees: 10_000,
  descriptionMax: DESCRIPTION_MAX,
  ...over,
});

// ─── 1. Lecture défensive ────────────────────────────────────────────────────

Deno.test('refusalOf ne reconnaît QUE les motifs du contrat serveur', () => {
  assertEquals(refusalOf({ ok: false, reason: 'no_crew' }), 'no_crew');
  assertEquals(refusalOf({ ok: false, reason: 'not_enough_foulees' }), 'not_enough_foulees');
  // Un motif inventé par un serveur plus récent n'est PAS traduit au hasard.
  assertEquals(refusalOf({ ok: false, reason: 'crew_on_fire' }), null);
  assertEquals(refusalOf({ ok: true, crew: {} }), null);
  assertEquals(refusalOf(null), null);
  assertEquals(refusalOf('boom'), null);
});

Deno.test('shortfallOf exige le prix ET le solde, jamais l’un des deux', () => {
  assertEquals(shortfallOf({ ok: false, reason: 'not_enough_foulees', need: 300, have: 120 }), {
    need: 300,
    have: 120,
  });
  // Sans `have`, l'écran dirait « il te manque … » sans savoir combien : on rend
  // null et l'écran se rabat sur un message qui n'affirme aucun chiffre.
  assertEquals(shortfallOf({ ok: false, reason: 'not_enough_foulees', need: 300 }), null);
  assertEquals(shortfallOf({ ok: false, reason: 'forbidden' }), null);
});

Deno.test('parseEditableCrew refuse une charge utile incomplète (jamais un demi-crew)', () => {
  assertEquals(parseEditableCrew(null), null);
  assertEquals(parseEditableCrew({ id: 'c1' }), null);
  assertEquals(parseEditableCrew({ id: 'c1', name: 'X' }), null); // statut manquant
  assertEquals(
    parseEditableCrew({ id: 'c1', name: 'X', recruitmentStatus: 'yolo' }),
    null,
  );
});

Deno.test('la description vide du serveur devient null (un seul encodage du vide)', () => {
  const c = parseEditableCrew({
    id: 'c1',
    name: 'X',
    description: '',
    recruitmentStatus: 'open',
    tags: [],
  });
  assertEquals(c?.description, null);
});

Deno.test('un tag INCONNU de ce build est écarté, jamais affiché en clé brute', () => {
  const c = parseEditableCrew({
    id: 'c1',
    name: 'X',
    recruitmentStatus: 'open',
    tags: ['casual', 'raid_v2', 42],
  });
  assertEquals(c?.tags, ['casual']);
});

Deno.test('parseEditContext refuse un {ok:false} — il ne le transforme pas en contexte', () => {
  assertEquals(parseEditContext({ ok: false, reason: 'no_crew' }), null);
  assertEquals(parseEditContext({ ok: true }), null); // pas de crew
});

Deno.test('parseEditContext lit les droits PAR CHAMP sans jamais les supposer vrais', () => {
  const ctx = parseEditContext({
    ok: true,
    role: 'runner',
    crew: { id: 'c1', name: 'X', recruitmentStatus: 'open', tags: [] },
    can: { name: false, description: false }, // `recruitment` ABSENT
    renameCostFoulees: 300,
    myFoulees: 0,
    descriptionMax: 280,
  });
  // Un droit absent vaut FAUX : l'inverse peindrait un champ que le serveur
  // refusera. « Je ne sais pas » n'est jamais « oui » sur une permission.
  assertEquals(ctx?.can, { name: false, description: false, recruitment: false });
});

// ─── 2. Le diff : ce qui part vraiment ───────────────────────────────────────

Deno.test('un brouillon intact n’envoie RIEN (et n’est pas dirty)', () => {
  const d = draftOf(CREW);
  assertEquals(payloadOf(CREW, d), {
    p_name: null,
    p_description: null,
    p_recruitment_status: null,
    p_tags: null,
  });
  assertEquals(isDirty(CREW, d), false);
  assertEquals(willRename(CREW, d), false);
});

Deno.test('des espaces autour du nom NE SONT PAS un renommage (300 foulées en jeu)', () => {
  const d = { ...draftOf(CREW), name: '   Les Berges   ' };
  assertEquals(payloadOf(CREW, d).p_name, null);
  assertEquals(willRename(CREW, d), false);
});

Deno.test('changer la description n’envoie PAS le nom', () => {
  const d = { ...draftOf(CREW), description: 'Sorties le mardi.' };
  const p = payloadOf(CREW, d);
  assertEquals(p.p_name, null);
  assertEquals(p.p_description, 'Sorties le mardi.');
  assertEquals(willRename(CREW, d), false);
});

Deno.test('effacer une description existante envoie la chaîne vide, pas null', () => {
  const crew: EditableCrew = { ...CREW, description: 'un texte' };
  const d = { ...draftOf(crew), description: '' };
  // `null` voudrait dire « ne touche pas » : l'effacement ne partirait jamais.
  assertEquals(payloadOf(crew, d).p_description, '');
});

Deno.test('réordonner les tags n’est pas une modification', () => {
  const crew: EditableCrew = { ...CREW, tags: ['casual', 'raid'] };
  const d = { ...draftOf(crew), tags: ['raid', 'casual'] as const };
  assertEquals(payloadOf(crew, d).p_tags, null);
  assertEquals(isDirty(crew, d), false);
});

Deno.test('ajouter un tag part TRIÉ (l’ordre ne doit jamais créer de faux diff)', () => {
  const crew: EditableCrew = { ...CREW, tags: ['raid'] };
  const d = { ...draftOf(crew), tags: ['raid', 'casual'] as const };
  assertEquals(payloadOf(crew, d).p_tags, ['casual', 'raid']);
});

Deno.test('vider les tags envoie un tableau VIDE (≠ null)', () => {
  const crew: EditableCrew = { ...CREW, tags: ['casual'] };
  const d = { ...draftOf(crew), tags: [] as const };
  assertEquals(payloadOf(crew, d).p_tags, []);
});

Deno.test('toggleTag ajoute, retire, et garde l’ordre stable', () => {
  assertEquals(toggleTag([], 'raid'), ['raid']);
  assertEquals(toggleTag(['raid'], 'casual'), ['casual', 'raid']);
  assertEquals(toggleTag(['casual', 'raid'], 'raid'), ['casual']);
});

// ─── 3. Aucun bouton mort (§A4) ──────────────────────────────────────────────

Deno.test('rien à enregistrer → pristine, PAS une erreur de champ', () => {
  // Un écran qui vient de s'ouvrir ne doit crier ni « nom vide » ni « trop long ».
  assertEquals(blockReason(ctxOf(), draftOf(CREW)), 'pristine');
});

Deno.test('une modification valide est SOUMETTABLE', () => {
  const d = { ...draftOf(CREW), description: 'On court le mardi.' };
  assertEquals(blockReason(ctxOf(), d), null);
});

Deno.test('nom vidé → name_empty (et jamais soumettable)', () => {
  assertEquals(blockReason(ctxOf(), { ...draftOf(CREW), name: '   ' }), 'name_empty');
});

Deno.test('nom trop long → name_too_long ; exactement NAME_MAX passe', () => {
  assertEquals(
    blockReason(ctxOf(), { ...draftOf(CREW), name: 'x'.repeat(NAME_MAX + 1) }),
    'name_too_long',
  );
  assertEquals(blockReason(ctxOf(), { ...draftOf(CREW), name: 'x'.repeat(NAME_MAX) }), null);
});

Deno.test('description trop longue → description_too_long, à la borne du SERVEUR', () => {
  // La borne vient du contexte (donc du serveur), pas d'une constante locale :
  // si le schéma bouge, l'écran suit sans release.
  const ctx = ctxOf({ descriptionMax: 10 });
  assertEquals(
    blockReason(ctx, { ...draftOf(CREW), description: 'x'.repeat(11) }),
    'description_too_long',
  );
  assertEquals(blockReason(ctx, { ...draftOf(CREW), description: 'x'.repeat(10) }), null);
});

Deno.test('LE CAS DU BOUTON MORT : renommer sans les foulées → rename_unaffordable', () => {
  const ctx = ctxOf({ myFoulees: 120 });
  const d = { ...draftOf(CREW), name: 'Berges Nord' };
  assertEquals(blockReason(ctx, d), 'rename_unaffordable');
});

Deno.test('à sec, tout le RESTE reste soumettable (on ne bloque pas l’écran entier)', () => {
  const ctx = ctxOf({ myFoulees: 0 });
  const d = { ...draftOf(CREW), description: 'gratuit', recruitmentStatus: 'open' as const };
  assertEquals(blockReason(ctx, d), null);
});

Deno.test('pile le prix du renommage suffit (borne INCLUSIVE, comme le serveur)', () => {
  const ctx = ctxOf({ myFoulees: 300 });
  assertEquals(blockReason(ctx, { ...draftOf(CREW), name: 'Berges Nord' }), null);
});

Deno.test('sans le droit sur un champ, le modifier est BLOQUÉ — pas envoyé au refus', () => {
  const noRights = ctxOf({
    role: 'co_captain',
    can: { name: false, description: false, recruitment: false },
  });
  assertEquals(blockReason(noRights, { ...draftOf(CREW), name: 'Coup d’État' }), 'forbidden');
  assertEquals(blockReason(noRights, { ...draftOf(CREW), description: 'moi' }), 'forbidden');
  assertEquals(
    blockReason(noRights, { ...draftOf(CREW), recruitmentStatus: 'open' as const }),
    'forbidden',
  );
  // Sans rien toucher, ce n'est pas « interdit » — il n'y a simplement rien à faire.
  assertEquals(blockReason(noRights, draftOf(CREW)), 'pristine');
});

Deno.test('un droit PARTIEL n’ouvre que son champ (le jour où la matrice s’ouvrira)', () => {
  // La matrice dit aujourd'hui ['founder'] partout ; le jour où le recrutement
  // s'ouvre au co-capitaine, ce test décrit déjà le comportement attendu.
  const partial = ctxOf({
    role: 'co_captain',
    can: { name: false, description: false, recruitment: true },
  });
  assertEquals(
    blockReason(partial, { ...draftOf(CREW), recruitmentStatus: 'open' as const }),
    null,
  );
  assertEquals(blockReason(partial, { ...draftOf(CREW), name: 'Autre' }), 'forbidden');
});
