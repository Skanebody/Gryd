/**
 * GRYD — LES SIX RÉSULTATS SONT ATTEIGNABLES, ET AUCUN N'INVENTE UN CHIFFRE.
 *
 * Deux familles de tests, et pas une de plus :
 *  1. UN test par variante E29→E34 : le verdict serveur X produit l'écran Y, et
 *     pas un autre. C'est le test qui attrape le retour du bug d'origine —
 *     l'écran choisissait sur l'INTENTION déclarée avant le départ.
 *  2. LES ABSENCES : chaque champ optionnel disparaît quand la source se tait.
 *     Un `0` qui survit ici est un « 0 » nu à l'écran, c'est-à-dire un mensonge
 *     (surface non calculée lue « tu as gagné 0 m² », rang non renvoyé lu
 *     « +0 places »).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  UNJUDGED_FACTS,
  composeResult,
  deadlineAvoidedHours,
  displayableArea,
  displayableProtection,
  displayableRankChange,
  formatArea,
  myBoundaryShare,
  variantOf,
  type ResultFacts,
} from './resultVariant.ts';

/** Un verdict serveur CRÉDITÉ, sur lequel chaque test pose son seul delta. */
function judged(over: Partial<ResultFacts> = {}): ResultFacts {
  return { ...UNJUDGED_FACTS, judged: true, credited: true, ...over };
}

// ── 1. UNE VARIANTE PAR ÉCRAN DE LA SPEC ───────────────────────────────────

Deno.test('E29 conquête : le serveur a pris du neutre → écran de conquête', () => {
  assertEquals(variantOf(judged({ narrative: 'capture' })), 'conquest');
});

Deno.test('E30 reprise : une zone reprise ne se célèbre pas comme une conquête', () => {
  assertEquals(variantOf(judged({ narrative: 'reprise' })), 'reprise');
});

Deno.test('E31 défense : le titre vient du VERDICT, pas de l’intention déclarée', () => {
  // Le bug d'origine : « ZONE DÉFENDUE » s'affichait dès que le joueur AVAIT
  // ANNONCÉ défendre. Ici il n'y a aucune intention en entrée — c'est le point.
  assertEquals(variantOf(judged({ narrative: 'defense' })), 'defense');
});

Deno.test('E32 sortie libre : aucune action territoriale → ni échec, ni conquête vide', () => {
  assertEquals(variantOf(judged({ narrative: 'effort' })), 'freeRun');
  // `boucle` / `crew` / `classement` / `record` n'affirment AUCUNE prise de
  // territoire : les envoyer sur l'écran de conquête affichait « 0 ZONES ».
  assertEquals(variantOf(judged({ narrative: 'boucle' })), 'freeRun');
  assertEquals(variantOf(judged({ narrative: 'crew' })), 'freeRun');
  assertEquals(variantOf(judged({ narrative: 'classement' })), 'freeRun');
  assertEquals(variantOf(judged({ narrative: 'record' })), 'freeRun');
});

Deno.test('E33 contribution crew : une frontière refermée prime sur la conquête', () => {
  const facts = judged({
    narrative: 'capture', // le serveur crédite bien des captures…
    boundaryClosed: { name: 'République', contributors: 2, myShare: 0.79, crewPoints: 120 },
  });
  // … mais la zone n'est pas l'œuvre d'UNE sortie : E33, pas E29.
  assertEquals(variantOf(facts), 'crewContribution');
  assertEquals(composeResult(facts).crewBoundary?.contributors, 2);
});

Deno.test('E34 partiellement valide : trace amputée et rien de pris → écran dédié', () => {
  assertEquals(variantOf(judged({ narrative: 'effort', partial: true })), 'partial');
});

// ── 2. L'EXCLUSION SE DIT MÊME QUAND LA SORTIE A GAGNÉ ─────────────────────

Deno.test('une conquête partielle reste une conquête, MAIS l’exclusion est dite', () => {
  const c = composeResult(judged({ narrative: 'capture', partial: true }));
  assertEquals(c.variant, 'conquest');
  assertEquals(c.excluded, true);
});

Deno.test('rien de jugé : aucune exclusion affirmée (un inconnu n’est pas un vide)', () => {
  const c = composeResult({ ...UNJUDGED_FACTS, partial: true });
  assertEquals(c.variant, 'freeRun');
  assertEquals(c.excluded, false);
});

Deno.test('course non créditée (§11) : aucun écran territorial ne s’allume', () => {
  const facts: ResultFacts = { ...UNJUDGED_FACTS, judged: true, credited: false, narrative: 'capture' };
  assertEquals(variantOf(facts), 'freeRun');
});

// ── 3. LES RAISONS DE E32 SONT FACTUELLES ──────────────────────────────────

Deno.test('E32 : la boucle ouverte dit les mètres RÉELS du serveur', () => {
  const c = composeResult(judged({ openBoundary: { name: 'Zone', missingM: 84 } }));
  assertEquals(c.freeRunReason, { kind: 'loopOpen', missingM: 84 });
});

Deno.test('E32 : intérieur refusé pour forme trop étroite → raison « narrow »', () => {
  const c = composeResult(judged({ loopRejectedNarrow: true }));
  assertEquals(c.freeRunReason, { kind: 'narrow' });
});

Deno.test('E32 : sans rien de plus précis, la raison reste « aucune action »', () => {
  assertEquals(composeResult(judged()).freeRunReason, { kind: 'noAction' });
});

Deno.test('E32 : sans verdict serveur, AUCUNE raison — un inconnu n’est pas un vide', () => {
  // Hors-ligne / envoi en file : suggérer « referme ta boucle » affirmerait
  // qu'aucune zone n'a été prise, alors que personne n'a encore jugé.
  assertEquals(composeResult(UNJUDGED_FACTS).freeRunReason, null);
  assertEquals(
    composeResult({ ...UNJUDGED_FACTS, judged: true, credited: false }).freeRunReason,
    null,
  );
});

Deno.test('la raison de E32 n’est PAS servie aux autres écrans', () => {
  const c = composeResult(judged({ narrative: 'capture', loopRejectedNarrow: true }));
  assertEquals(c.freeRunReason, null);
});

// ── 4. CE QUI MANQUE NE S'AFFICHE PAS ──────────────────────────────────────

Deno.test('surface : absente, nulle ou aberrante ⇒ rien (jamais « 0 m² »)', () => {
  assertEquals(displayableArea(null), null);
  assertEquals(displayableArea(undefined), null);
  assertEquals(displayableArea(0), null);
  assertEquals(displayableArea(-12), null);
  assertEquals(displayableArea(Number.NaN), null);
  assertEquals(displayableArea(Number.POSITIVE_INFINITY), null);
  assertEquals(displayableArea(12_345), 12_345);
});

Deno.test('surface : non lue ⇒ le bloc disparaît même sur une conquête réussie', () => {
  assertEquals(composeResult(judged({ narrative: 'capture' })).areaM2, null);
  assertEquals(composeResult(judged({ narrative: 'capture', areaM2: 42_000 })).areaM2, 42_000);
});

Deno.test('surface : jamais affichée sur une sortie libre (rien n’a changé de main)', () => {
  assertEquals(composeResult(judged({ narrative: 'effort', areaM2: 42_000 })).areaM2, null);
});

Deno.test('rang : le serveur ne le renvoie pas ⇒ pas de ligne, et surtout pas « +0 »', () => {
  assertEquals(displayableRankChange(null), null);
  assertEquals(displayableRankChange(0), null);
  assertEquals(displayableRankChange(1.5), null);
  assertEquals(displayableRankChange(Number.NaN), null);
  assertEquals(displayableRankChange(-3), -3);
  assertEquals(displayableRankChange(2), 2);
  assertEquals(composeResult(judged({ narrative: 'reprise' })).rankChange, null);
});

Deno.test('ancien propriétaire : §12 — inconnu ou masqué ⇒ la reprise ne nomme personne', () => {
  assertEquals(composeResult(judged({ narrative: 'reprise' })).previousOwner, null);
  assertEquals(
    composeResult(judged({ narrative: 'reprise', previousOwner: 'KORO' })).previousOwner,
    'KORO',
  );
  // Et une identité connue ne fuit JAMAIS hors de l'écran de reprise.
  assertEquals(
    composeResult(judged({ narrative: 'capture', previousOwner: 'KORO' })).previousOwner,
    null,
  );
});

Deno.test('protection : 0 = « jamais fortifié », pas « niveau 0 » ⇒ rien à annoncer', () => {
  assertEquals(displayableProtection(0), null);
  assertEquals(displayableProtection(null), null);
  assertEquals(displayableProtection(2.5), null);
  assertEquals(displayableProtection(3), 3);
  assertEquals(
    composeResult(judged({ narrative: 'defense', protectionLevel: 0 })).protectionLevel,
    null,
  );
  assertEquals(
    composeResult(judged({ narrative: 'defense', protectionLevel: 2 })).protectionLevel,
    2,
  );
});

Deno.test('échéance évitée : aucune contestation lue ⇒ aucune ligne', () => {
  assertEquals(composeResult(judged({ narrative: 'defense' })).deadlineAvoidedHours, null);
});

Deno.test('échéance évitée : heures PLEINES, tronquées vers le bas', () => {
  // Défendu 5 h 50 avant l'échéance → « 5 h », jamais « 6 h ».
  const defended = '2026-07-27T10:00:00.000Z';
  const deadline = '2026-07-27T15:50:00.000Z';
  assertEquals(deadlineAvoidedHours(defended, deadline), 5);
});

Deno.test('échéance évitée : incohérente, illisible ou < 1 h ⇒ silence', () => {
  assertEquals(deadlineAvoidedHours(null, '2026-07-27T15:00:00.000Z'), null);
  assertEquals(deadlineAvoidedHours('2026-07-27T10:00:00.000Z', null), null);
  assertEquals(deadlineAvoidedHours('pas une date', '2026-07-27T15:00:00.000Z'), null);
  // Défense APRÈS l'échéance : incohérent, on se tait.
  assertEquals(deadlineAvoidedHours('2026-07-27T16:00:00.000Z', '2026-07-27T15:00:00.000Z'), null);
  // Moins d'une heure d'avance : vrai, mais « 0 h » se lirait « aucune avance ».
  assertEquals(deadlineAvoidedHours('2026-07-27T14:30:00.000Z', '2026-07-27T15:00:00.000Z'), null);
  // Aberrant (skew d'horloge) : > 14 jours.
  assertEquals(deadlineAvoidedHours('2026-07-01T00:00:00.000Z', '2026-09-01T00:00:00.000Z'), null);
});

Deno.test('échéance et protection ne fuient pas hors de l’écran de défense', () => {
  const c = composeResult(
    judged({
      narrative: 'capture',
      protectionLevel: 3,
      defendedAt: '2026-07-27T10:00:00.000Z',
      deadlineAvoidedAt: '2026-07-27T15:00:00.000Z',
    }),
  );
  assertEquals(c.protectionLevel, null);
  assertEquals(c.deadlineAvoidedHours, null);
});

Deno.test('appel : proposé UNIQUEMENT si une revue existe (jamais un lien mort)', () => {
  assertEquals(composeResult(judged({ partial: true })).appealOpen, false);
  assertEquals(composeResult(judged({ partial: true, appealOpen: true })).appealOpen, true);
});

Deno.test('E33 : ma part de frontière vient de MON identifiant, ou n’existe pas', () => {
  const contributions = [
    { user: 'user-me', share: 0.79 },
    { user: 'user-mate', share: 0.21 },
  ];
  assertEquals(myBoundaryShare(contributions, 'user-me'), 0.79);
  // Hors session, ou aucune ligne à mon nom : aucune part revendiquée.
  assertEquals(myBoundaryShare(contributions, null), null);
  assertEquals(myBoundaryShare(contributions, 'user-inconnu'), null);
  assertEquals(myBoundaryShare(undefined, 'user-me'), null);
  // Parts hors bornes (donnée corrompue) : on ne dispute pas un mérite faux.
  assertEquals(myBoundaryShare([{ user: 'user-me', share: 0 }], 'user-me'), null);
  assertEquals(myBoundaryShare([{ user: 'user-me', share: 1.4 }], 'user-me'), null);
  assertEquals(myBoundaryShare([{ user: 'user-me', share: Number.NaN }], 'user-me'), null);
});

// ── 5. LA SURFACE SE LIT ────────────────────────────────────────────────────

Deno.test('formatArea : m² entiers en dessous du seuil, km² à 2 décimales au-dessus', () => {
  assertEquals(formatArea(12_345, ','), { value: '12345', unit: 'm²' });
  assertEquals(formatArea(99_999, ','), { value: '99999', unit: 'm²' });
  assertEquals(formatArea(420_000, ','), { value: '0,42', unit: 'km²' });
  assertEquals(formatArea(420_000, '.'), { value: '0.42', unit: 'km²' });
  assertEquals(formatArea(2_500_000, ','), { value: '2,50', unit: 'km²' });
});

// ── 5. ENCERCLÉ ≠ OBTENU (le défaut corrigé le 27/07/2026) ─────────────────
// `territories.area_m2` est l'aire de l'ANNEAU couru, et le serveur l'écrit dès
// qu'UNE cellule de la boucle a été capturée. Quand l'intérieur n'est pas
// intégralement devenu la propriété du coureur (plafond d'aire, plafond
// quotidien, zone privée/interdite, cellule tenue par un rival), ce nombre
// décrit ce qui a été ENCERCLÉ. L'écran l'annonçait « SURFACE GAGNÉE », et le
// PNG partagé — lui — la retirait déjà : deux niveaux d'honnêteté pour un même
// nombre, dans un même fichier.

Deno.test('surface surévaluée : retirée, jamais corrigée par un ratio inventé', () => {
  assertEquals(displayableArea(420_000, true), null);
  assertEquals(displayableArea(420_000, false), 420_000);
  // Défaut : une surface dont personne n'a signalé le contraire décrit ce
  // qu'elle décrit — sinon toutes les surfaces disparaîtraient.
  assertEquals(displayableArea(420_000), 420_000);
});

Deno.test('surface surévaluée : le bloc héro disparaît sur TOUTES les variantes qui l’affichent', () => {
  for (const narrative of ['capture', 'reprise', 'defense'] as const) {
    const shown = composeResult(judged({ narrative, areaM2: 420_000 }));
    const hidden = composeResult(judged({ narrative, areaM2: 420_000, areaOverstated: true }));
    assertEquals(shown.areaM2, 420_000, `${narrative} : précondition — la surface s’affiche`);
    assertEquals(
      hidden.areaM2,
      null,
      `${narrative} : l’aire ENCERCLÉE serait annoncée comme l’aire GAGNÉE`,
    );
  }
});

Deno.test('surface surévaluée : UNE seule décision, donc l’écran et le PNG ne divergent plus', () => {
  // `app/course-result.tsx` construisait sa surface de partage avec sa PROPRE
  // garde (`capReached !== true`) et affichait `composition.areaM2` sans elle.
  // Le partage lit désormais `composition.areaM2` : ce test fige que la valeur
  // exportable EST la valeur affichée, y compris dans le cas litigieux.
  const c = composeResult(judged({ narrative: 'capture', areaM2: 420_000, areaOverstated: true }));
  assertEquals(c.areaM2, null, 'affiché');
  assertEquals(c.areaM2, null, 'partagé — même source, donc même verdict');
});

Deno.test('surface surévaluée : sans signal, rien ne change (aucune régression)', () => {
  assertEquals(UNJUDGED_FACTS.areaOverstated, false);
  assertEquals(composeResult(judged({ narrative: 'capture', areaM2: 42_000 })).areaM2, 42_000);
});

// ── 6. TRIPWIRE DE SOURCE : l'écran ne refait pas la décision dans son coin ──
// Ce module pur ne prouve rien si `app/course-result.tsx` continue de filtrer la
// surface lui-même. On relit donc sa source (même patron que
// `setup/setupChain.test.ts` et `boot/splashE00.source.test.ts`).

const RESULT_SCREEN = Deno.readTextFileSync(
  new URL('../../../app/course-result.tsx', import.meta.url),
).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

Deno.test('course-result : plus aucune garde `capReached` locale sur la surface', () => {
  assert(
    !RESULT_SCREEN.includes('capReached'),
    'la garde locale est de retour : elle protégeait le PNG partagé et PAS le bloc ' +
      'affiché, et elle ne couvrait que le plafond d’aire — pas le plafond quotidien, ' +
      'ni les zones privées/interdites, ni les cellules qu’un rival garde',
  );
});

Deno.test('course-result : la surface partagée EST la surface affichée', () => {
  assert(
    /const shareArea\s*=\s*\n?\s*composition\.areaM2 !== null \? formatArea\(/.test(RESULT_SCREEN),
    'le partage doit lire `composition.areaM2` — la décision de composeResult — et ' +
      'ne rien re-filtrer, sinon les deux surfaces reprennent deux niveaux d’honnêteté',
  );
  assert(
    RESULT_SCREEN.includes('areaOverstated:'),
    'l’écran doit transmettre le fait `areaOverstated` au moteur pur',
  );
  assert(
    RESULT_SCREEN.includes('serverResult?.interiorPartial === true'),
    'le fait doit venir du VERDICT SERVEUR (`interiorPartial`), jamais d’une déduction client',
  );
});
