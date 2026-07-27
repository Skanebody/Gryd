/**
 * GRYD — LES SIX RÉSULTATS (E29 → E34), décidés par le VERDICT SERVEUR.
 *
 * La spec produit §D décrit SIX écrans de résultat, pas un seul avec des
 * variantes cosmétiques :
 *   E29 conquête · E30 reprise · E31 défense · E32 sortie libre ·
 *   E33 contribution crew · E34 partiellement valide.
 * L'audit en trouvait deux (conquête, défense) et encore : « ZONE DÉFENDUE »
 * s'affichait sur l'INTENTION déclarée AVANT le départ, pas sur ce que le
 * serveur avait jugé. Un joueur parti « défendre » et qui capturait du neutre
 * lisait « ZONE DÉFENDUE » ; un joueur parti « conquérir » qui ne faisait que
 * tenir ses zones lisait « TERRITOIRE ÉTENDU ». Deux fois le même bug : l'écran
 * racontait une INTENTION là où il devait rapporter un VERDICT.
 *
 * Ce module est la porte d'entrée unique de ce choix. Il est PUR (zéro import,
 * zéro I/O, instant injecté) et donc Deno-testable, comme `revealSequence.ts`,
 * `openBoundaryClock.ts` et `narrative.ts`.
 *
 * ─── L'ORDRE DE DOMINANCE N'EST PAS RÉINVENTÉ ICI ───────────────────────────
 * `features/share/narrative.ts` fige déjà l'ordre de la planche E10
 * (capture > reprise > défense > boucle > crew > classement > record > effort)
 * et les DEUX écrans (Résultat, Partage) le lisent. Le redécider ici créerait
 * deux vérités : ce module PREND le récit dominant en entrée et se contente de
 * le traduire en composition d'écran, plus les deux cas que le récit ne connaît
 * pas (frontière crew refermée, trace partiellement exclue).
 *
 * ─── POURQUOI E33 PASSE DEVANT E29 ──────────────────────────────────────────
 * `boundaryCompleted` (le serveur : « cette sortie a REFERMÉ une frontière
 * ouverte par un membre du crew ») produit aussi des captures — donc un récit
 * dominant `capture`. Célébrer « TERRITOIRE ÉTENDU » serait attribuer à une
 * seule sortie une zone que DEUX personnes ont tracée. La spec E33 est
 * explicite : « la sortie ne crée pas seule une zone mais complète une
 * frontière commune ». La frontière refermée prime donc sur la conquête.
 *
 * ─── CE QUE CE MODULE NE FERA JAMAIS ────────────────────────────────────────
 * Remplir un trou. Chaque champ optionnel de la composition est `null` quand la
 * source ne le donne pas — surface non lue, rang non renvoyé, ancien
 * propriétaire masqué par la confidentialité §12. `null` ⇒ l'écran n'affiche
 * RIEN (pas un « — », pas un « 0 » : le zéro nu est le mensonge que ce projet
 * traque, et « +0 de rang » se lit comme une mesure).
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. LE RÉCIT DOMINANT, TEL QUE LE MOTEUR PARTAGÉ LE REND
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Miroir STRUCTUREL de `NarrativeId` (features/share/narrative.ts). Dupliqué
 * EXPRÈS, comme `narrative.ts` duplique `ShareTemplateId` : ce module doit
 * rester sans import pour être testable en Deno. La compatibilité est vérifiée
 * à la compilation par l'affectation faite dans `app/course-result.tsx`.
 */
export type DominantNarrative =
  | 'capture'
  | 'reprise'
  | 'defense'
  | 'boucle'
  | 'crew'
  | 'classement'
  | 'record'
  | 'effort';

/** Les six écrans de résultat de la spec §D, dans l'ordre E29 → E34. */
export type ResultVariantId =
  /** E29 — une zone a été prise sur du NEUTRE. */
  | 'conquest'
  /** E30 — une zone a été REPRISE à quelqu'un. */
  | 'reprise'
  /** E31 — une zone à moi a été TENUE. */
  | 'defense'
  /** E32 — boucle non fermée, ou aucune action territoriale. */
  | 'freeRun'
  /** E33 — la sortie a refermé une frontière ouverte par le crew. */
  | 'crewContribution'
  /** E34 — une partie de la trace a été exclue, et rien n'a été pris. */
  | 'partial';

// ═══════════════════════════════════════════════════════════════════════════
// 2. LES FAITS (tout vient du serveur, ou vaut une absence explicite)
// ═══════════════════════════════════════════════════════════════════════════

/** E33 — frontière crew REFERMÉE par cette sortie (verdict serveur). */
export interface CrewBoundaryClosed {
  /** Nom RÉEL de la frontière (secteur/zone), renvoyé par le serveur. */
  readonly name: string;
  /** Nombre de membres dont une contribution a été retenue (≥ 1). */
  readonly contributors: number;
  /** Ma part de la longueur validée ∈ [0, 1] — la « contribution » de la spec. */
  readonly myShare: number | null;
  /** Points crew attribués par la fermeture. 0 = rien à annoncer. */
  readonly crewPoints: number;
}

/** E32 — frontière OUVERTE par cette sortie : la boucle n'est pas fermée. */
export interface OpenBoundaryFact {
  readonly name: string;
  /** Mètres restants pour fermer, tels que le serveur les a mesurés. */
  readonly missingM: number;
}

/**
 * Ce que le serveur a jugé, plus les lectures RÉELLES que l'écran a pu faire.
 * Aucun champ n'a de défaut « optimiste » : une absence est une absence.
 */
export interface ResultFacts {
  /** Le récit dominant, rendu par le moteur partagé (source unique). */
  readonly narrative: DominantNarrative;
  /** Le serveur a rendu un verdict (sinon : hors-ligne, envoi en file). */
  readonly judged: boolean;
  /** La course est créditée (ni refusée §11 ni signalée par GRYD Verify). */
  readonly credited: boolean;
  /** `runs.status === 'partial'` : au moins un segment a été EXCLU. */
  readonly partial: boolean;
  /** Frontière crew refermée par cette sortie — `null` si aucune. */
  readonly boundaryClosed: CrewBoundaryClosed | null;
  /** Frontière ouverte (boucle non fermée) — `null` si aucune. */
  readonly openBoundary: OpenBoundaryFact | null;
  /** Le serveur a REFUSÉ l'intérieur de la boucle (forme trop étroite). */
  readonly loopRejectedNarrow: boolean;
  /**
   * Surface RÉELLE du territoire écrit par cette sortie (`territories.area_m2`,
   * m²). `null` = pas lue, pas écrite, ou illisible. JAMAIS une somme de
   * cellules : convertir des hexagones en surface ici serait un chiffre inventé.
   */
  readonly areaM2: number | null;
  /**
   * CETTE SURFACE DÉCRIT-ELLE CE QUI A ÉTÉ ENCERCLÉ PLUTÔT QU'OBTENU ?
   *
   * `territories.area_m2` est l'aire GÉODÉSIQUE de l'ANNEAU couru, et le serveur
   * l'écrit dès qu'UNE seule cellule de la boucle a été capturée
   * (`buildTerritoryRow` : polygone non nul, intérieur non refusé,
   * `capturedCellCount > 0`). Quand l'intérieur n'est pas intégralement devenu
   * la propriété du coureur — plafond d'aire (`capReached`), plafond quotidien,
   * zone privée, zone non capturable, cellule qu'un rival garde — cette aire
   * SURESTIME le gain. Le serveur le dit : `IngestRunResponse.interiorPartial`,
   * décidé par `loopInteriorPartial` (moteur pur).
   *
   * `composeResult` retire alors la surface. Il ne la remplace pas : aucune
   * surface exacte n'est calculable, et un ratio inventé serait un chiffre
   * plausible et faux. Une absence n'est pas un mensonge ; une surface
   * surévaluée en est un — et elle partait aussi dans le PNG partagé.
   *
   * `false` par défaut dans `UNJUDGED_FACTS` : sans verdict serveur il n'y a
   * de toute façon aucune surface lue à afficher.
   */
  readonly areaOverstated: boolean;
  /** Niveau de protection obtenu (`territories.defense_level`). `null` = inconnu. */
  readonly protectionLevel: number | null;
  /** Échéance de contestation ÉVITÉE (ISO 8601). `null` = aucune lue. */
  readonly deadlineAvoidedAt: string | null;
  /** Instant où la défense a tranché la contestation (ISO 8601). */
  readonly defendedAt: string | null;
  /**
   * Ancien propriétaire d'une zone reprise, DÉJÀ filtré par la confidentialité
   * §12 en amont. `null` = inconnu OU non divulgable — et dans les deux cas
   * l'écran se tait. On ne devine pas une identité.
   */
  readonly previousOwner: string | null;
  /**
   * Variation de rang renvoyée par le serveur. `null` aujourd'hui : AUCUNE
   * lecture de classement n'alimente cet écran. Le champ existe pour que la
   * ligne s'allume le jour où la source arrive — jamais avant, et jamais à 0.
   */
  readonly rankChange: number | null;
  /**
   * Une revue anti-triche EXISTE pour cette course et n'a pas encore d'appel :
   * c'est la seule condition dans laquelle `/appel` a quelque chose à montrer.
   * `false` ⇒ pas de lien d'appel (un lien vers un écran vide est un bouton mort).
   */
  readonly appealOpen: boolean;
}

/** Faits NEUTRES : « on ne sait rien ». Base de toute lecture partielle. */
export const UNJUDGED_FACTS: ResultFacts = {
  narrative: 'effort',
  judged: false,
  credited: false,
  partial: false,
  boundaryClosed: null,
  openBoundary: null,
  loopRejectedNarrow: false,
  areaM2: null,
  areaOverstated: false,
  protectionLevel: null,
  deadlineAvoidedAt: null,
  defendedAt: null,
  previousOwner: null,
  rankChange: null,
  appealOpen: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// 3. LA COMPOSITION D'ÉCRAN
// ═══════════════════════════════════════════════════════════════════════════

/** Pourquoi cette sortie n'a rien pris — factuel, jamais un reproche (E32). */
export type FreeRunReason =
  /** La boucle est restée ouverte : le serveur dit de combien. */
  | { readonly kind: 'loopOpen'; readonly missingM: number }
  /** Boucle fermée mais intérieur refusé : forme trop étroite (§16 §2). */
  | { readonly kind: 'narrow' }
  /** Aucune action territoriale, et rien de plus précis à dire. */
  | { readonly kind: 'noAction' };

/** Ce que l'écran a le DROIT d'afficher, une fois les absences retirées. */
export interface ResultComposition {
  readonly variant: ResultVariantId;
  /** Surface à afficher en héros secondaire (m²). `null` ⇒ bloc absent. */
  readonly areaM2: number | null;
  /** Variation de rang. `null` ⇒ ligne absente (jamais « +0 »). */
  readonly rankChange: number | null;
  /** Ancien propriétaire (E30). `null` ⇒ la reprise se raconte sans nommer. */
  readonly previousOwner: string | null;
  /** Heures d'avance sur l'échéance évitée (E31). `null` ⇒ ligne absente. */
  readonly deadlineAvoidedHours: number | null;
  /** Niveau de protection obtenu (E31). `null` ⇒ ligne absente. */
  readonly protectionLevel: number | null;
  /** Frontière crew refermée (E33). `null` ⇒ bloc absent. */
  readonly crewBoundary: CrewBoundaryClosed | null;
  /** Raison factuelle de l'absence de capture (E32). `null` hors E32. */
  readonly freeRunReason: FreeRunReason | null;
  /**
   * Une portion de la trace a été EXCLUE (E34). Vrai même quand la sortie a
   * capturé par ailleurs : l'exclusion est un fait, pas une variante — la taire
   * sous une célébration serait mentir par omission.
   */
  readonly excluded: boolean;
  /** Un recours RÉEL est ouvert : `/appel` a de quoi répondre. */
  readonly appealOpen: boolean;
}

/**
 * Au-delà, l'écart entre défense et échéance n'est plus crédible (skew
 * d'horloge, ISO aberrant) : on préfère se taire. Même plafond que
 * `openBoundaryClock` — une seule idée de « durée plausible » dans l'app.
 */
const MAX_PLAUSIBLE_HOURS = 24 * 14;

/**
 * Heures PLEINES d'avance prises sur une échéance de contestation.
 * Tronqué vers le BAS : « 6 h d'avance » quand il en restait 5 h 50 serait une
 * flatterie, et cet écran ne flatte pas. `null` dès qu'un des deux instants est
 * illisible, inversé ou aberrant.
 */
export function deadlineAvoidedHours(
  defendedAt: string | null,
  deadlineAt: string | null,
): number | null {
  if (!defendedAt || !deadlineAt) return null;
  const from = Date.parse(defendedAt);
  const to = Date.parse(deadlineAt);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  const aheadMs = to - from;
  // Défendu APRÈS l'échéance : ce n'est pas une avance, c'est une incohérence.
  if (aheadMs <= 0) return null;
  const hours = Math.floor(aheadMs / 3_600_000);
  if (hours > MAX_PLAUSIBLE_HOURS) return null;
  // Moins d'une heure d'avance : vrai, mais « 0 h » se lit comme « aucune ».
  if (hours < 1) return null;
  return hours;
}

/**
 * Une surface AFFICHABLE, ou rien.
 * Refuse le non-fini, le négatif et le zéro : `territories.area_m2` à 0 veut
 * dire « la base n'a pas su calculer », pas « tu as gagné zéro mètre carré ».
 */
export function displayableArea(
  areaM2: number | null | undefined,
  /**
   * L'aire décrit-elle l'anneau ENCERCLÉ plutôt que le gain ? (voir
   * `ResultFacts.areaOverstated`.) Vrai ⇒ rien à afficher : l'écran ne peut ni
   * l'annoncer comme un gain, ni la corriger — aucune surface exacte n'existe.
   * Défaut `false` : une surface dont personne n'a signalé le contraire est
   * réputée décrire ce qu'elle décrit.
   */
  overstated: boolean = false,
): number | null {
  if (overstated) return null;
  if (typeof areaM2 !== 'number' || !Number.isFinite(areaM2)) return null;
  if (areaM2 <= 0) return null;
  return areaM2;
}

/**
 * Une variation de rang AFFICHABLE, ou rien.
 * Le zéro est explicitement écarté : « rang inchangé » n'est pas une nouvelle,
 * et « +0 » est le zéro nu que la charte interdit. Le non-entier aussi : un
 * rang est un entier, une décimale trahirait un calcul client.
 */
export function displayableRankChange(delta: number | null | undefined): number | null {
  if (typeof delta !== 'number' || !Number.isFinite(delta)) return null;
  if (!Number.isInteger(delta)) return null;
  if (delta === 0) return null;
  return delta;
}

/**
 * Le niveau de protection AFFICHABLE. `defense_level` vaut 0 sur un territoire
 * jamais fortifié : ce n'est pas « niveau 0 de protection », c'est « aucune
 * fortification » — donc rien à annoncer sur un écran qui célèbre une défense.
 */
export function displayableProtection(level: number | null | undefined): number | null {
  if (typeof level !== 'number' || !Number.isFinite(level)) return null;
  if (!Number.isInteger(level) || level < 1) return null;
  return level;
}

/**
 * MA part d'une frontière crew refermée (E33), ∈ ]0, 1], ou rien.
 *
 * `boundaryCompleted.contributions[].user` est un IDENTIFIANT, pas un pseudo :
 * l'écran n'affiche donc jamais la liste, seulement MA part et le NOMBRE de
 * contributeurs. Sans session, sans ligne à mon nom, ou avec une part hors
 * bornes (donnée corrompue), on ne montre rien — une fausse part de mérite est
 * un mensonge comme un autre, et celui-là se dispute entre coéquipiers.
 */
export function myBoundaryShare(
  contributions: readonly { readonly user: string; readonly share: number }[] | undefined,
  meId: string | null,
): number | null {
  if (!contributions || !meId) return null;
  const mine = contributions.find((c) => c.user === meId);
  if (!mine || typeof mine.share !== 'number' || !Number.isFinite(mine.share)) return null;
  if (mine.share <= 0 || mine.share > 1) return null;
  return mine.share;
}

/** La raison factuelle de l'absence de capture (E32) — jamais un jugement. */
function freeRunReasonOf(facts: ResultFacts): FreeRunReason {
  if (facts.openBoundary && Number.isFinite(facts.openBoundary.missingM)) {
    return { kind: 'loopOpen', missingM: facts.openBoundary.missingM };
  }
  if (facts.loopRejectedNarrow) return { kind: 'narrow' };
  return { kind: 'noAction' };
}

/**
 * LA décision : quel des six écrans, et avec quoi.
 *
 * Ordre, et pourquoi chaque cran est là :
 *  1. rien de jugé / non crédité → E32. Un refus (§11) et un hors-ligne gardent
 *     leur propre dé-escalade dans l'écran ; ici, on ne peut RIEN raconter de
 *     territorial, et l'effort, lui, a bien eu lieu.
 *  2. frontière crew refermée → E33 (voir l'en-tête : la zone n'est pas d'une
 *     seule sortie).
 *  3. capture / reprise / défense → E29 / E30 / E31, dans l'ordre figé du
 *     moteur narratif partagé.
 *  4. trace partiellement exclue et rien de pris → E34.
 *  5. sinon → E32.
 *
 * `boucle`, `crew`, `classement`, `record` tombent en E32 : ces récits existent
 * pour le PARTAGE (choisir un style de card), mais aucun d'eux n'affirme une
 * prise de territoire. Les envoyer sur un écran de conquête faisait afficher
 * « 0 ZONES CAPTURÉES » sous un titre de victoire — le zéro nu, encore.
 */
export function composeResult(facts: ResultFacts): ResultComposition {
  const variant = variantOf(facts);
  return {
    variant,
    // La surface n'a de sens que là où une zone a changé de main ou été tenue —
    // ET seulement si elle décrit ce qui a été OBTENU. `areaOverstated` (verdict
    // serveur `interiorPartial`) la retire sinon : sur une boucle dont
    // l'intérieur a été tronqué, `territories.area_m2` porte l'anneau entier, et
    // l'annoncer « SURFACE GAGNÉE » serait afficher l'aire encerclée pour l'aire
    // gagnée. UN SEUL endroit décide, et le partage lit ce même champ : l'écran
    // et le PNG exporté ne peuvent plus avoir deux niveaux d'honnêteté.
    areaM2:
      variant === 'conquest' || variant === 'reprise' || variant === 'defense' ||
      variant === 'crewContribution'
        ? displayableArea(facts.areaM2, facts.areaOverstated)
        : null,
    rankChange: displayableRankChange(facts.rankChange),
    previousOwner: variant === 'reprise' ? facts.previousOwner : null,
    deadlineAvoidedHours:
      variant === 'defense'
        ? deadlineAvoidedHours(facts.defendedAt, facts.deadlineAvoidedAt)
        : null,
    protectionLevel:
      variant === 'defense' ? displayableProtection(facts.protectionLevel) : null,
    crewBoundary: variant === 'crewContribution' ? facts.boundaryClosed : null,
    // `judged && credited` EST INDISPENSABLE : la variante `freeRun` couvre
    // AUSSI le run pas encore jugé (hors-ligne, envoi en file). Y servir « la
    // prochaine fois, referme ta boucle » affirmerait qu'aucune zone n'a été
    // prise — alors que PERSONNE n'a encore jugé. Un état INCONNU n'est pas un
    // état vide : sans verdict, aucune raison, aucun conseil.
    freeRunReason:
      variant === 'freeRun' && facts.judged && facts.credited ? freeRunReasonOf(facts) : null,
    // L'exclusion se dit TOUJOURS quand elle a eu lieu — y compris sous une
    // conquête réussie. C'est la moitié de la vérité qui manquait (audit E34).
    excluded: facts.judged && facts.credited && facts.partial,
    appealOpen: facts.appealOpen,
  };
}

/** Le choix d'écran seul (exposé pour les tests et pour la lisibilité). */
export function variantOf(facts: ResultFacts): ResultVariantId {
  if (!facts.judged || !facts.credited) return 'freeRun';
  if (facts.boundaryClosed) return 'crewContribution';
  switch (facts.narrative) {
    case 'capture':
      return 'conquest';
    case 'reprise':
      return 'reprise';
    case 'defense':
      return 'defense';
    default:
      return facts.partial ? 'partial' : 'freeRun';
  }
}

/**
 * Une surface en toutes lettres : m² sous le seuil, km² au-dessus.
 * Rend la VALEUR et l'UNITÉ séparément — l'unité est un exposant gris dans la
 * planche, jamais du même corps que le chiffre. Le séparateur décimal est
 * injecté (la locale vit dans `ui/format`, pas ici : ce module reste pur).
 */
export interface AreaLabel {
  readonly value: string;
  readonly unit: 'm²' | 'km²';
}

/** Au-delà de 100 000 m² (0,1 km²), on lit mieux en km². */
const KM2_THRESHOLD_M2 = 100_000;

export function formatArea(areaM2: number, decimalSep: string): AreaLabel {
  if (areaM2 >= KM2_THRESHOLD_M2) {
    const km2 = areaM2 / 1_000_000;
    // 2 décimales : 0,42 km² est la granularité de la planche.
    return { value: km2.toFixed(2).replace('.', decimalSep), unit: 'km²' };
  }
  // Des m² se lisent en entiers — une virgule sur 12 340,7 m² n'apporte rien.
  return { value: String(Math.round(areaM2)), unit: 'm²' };
}
