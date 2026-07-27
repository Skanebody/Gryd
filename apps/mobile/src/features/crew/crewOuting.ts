/**
 * GRYD — E49 · CRÉER UNE SORTIE CREW : la logique PURE (aucun React, aucune I/O).
 *
 * ═══ POURQUOI CE FICHIER EXISTE, SÉPARÉ DE L'ÉCRAN ══════════════════════════
 * Même partage que `crewEdit.ts` / `crewEditData.ts` : ce qui se DÉCIDE se teste
 * sans monter un composant. Quatre décisions vivent ici, et rien d'autre :
 *   1. composer une date-heure RÉELLE à partir de trois choix (jour, heure,
 *      minute) — parce qu'aucune bibliothèque de sélecteur n'est dans la stack
 *      et qu'en ajouter une pour trois nombres serait une dépendance de trop ;
 *   2. dire si un POINT DE RENDEZ-VOUS désigne une porte d'entrée (§12,
 *      constitution §7) — c'est la garde de vie privée de cet écran ;
 *   3. dire si le formulaire est SOUMETTABLE, et sinon POURQUOI, pour que le
 *      CTA chartreuse ne soit jamais un bouton mort (§A4) ;
 *   4. lire la réponse du serveur sans jamais lui prêter une forme qu'elle n'a
 *      pas (`parse*` rend `null` plutôt qu'un objet à moitié inventé).
 *
 * ═══ LE SERVEUR RESTE SEUL JUGE ════════════════════════════════════════════
 * Rien ici n'AUTORISE quoi que ce soit. `crew_outing_create` (migration 0085)
 * revérifie l'appartenance, le rôle (CREW_PERMISSIONS.createOuting), les
 * bornes, l'horizon, la modération et le refus d'adresse, quoi que ce module
 * ait pensé. Ces fonctions servent à ne pas PEINDRE une action condamnée.
 *
 * ═══ LA VIE PRIVÉE D'UN POINT DE RENDEZ-VOUS ═══════════════════════════════
 * Un lieu de rendez-vous EST une adresse, et le plus souvent le domicile de
 * quelqu'un. Le dépôt traite déjà ce problème pour les traces publiées
 * (`features/share/sharePrivacy.ts` : on coupe `SHARE_TRIM_M` = 250 m autour du
 * départ et de l'arrivée). La même exigence, transposée à un CHAMP DE TEXTE,
 * donne trois décisions — et une quatrième, qui est une abstention :
 *   · AUCUNE COORDONNÉE N'EST COLLECTÉE. Pas de lat/lng, même arrondie. La
 *     donnée qu'on ne stocke pas est la seule qui ne fuit jamais, et une
 *     coordonnée que personne n'affiche serait de la collecte sans usage.
 *   · LE LIBELLÉ EST REFUSÉ s'il ressemble à une adresse postale NUMÉROTÉE
 *     (« 12 rue X », « Hauptstrasse 4 ») ou s'il donne un détail de PORTE
 *     (digicode, interphone, étage). C'est `meetingPointRefusal`, miroir exact
 *     de `crew_outing_place_refusal` (0085) — et c'est le SERVEUR qui tranche.
 *   · CE QUI EST PUBLIÉ EST DIT DANS L'ÉCRAN : membres actifs du crew, personne
 *     d'autre (policy RLS `crew_events_select_member`, 0019).
 *
 * ⚠️ CE QUE `meetingPointRefusal` NE FAIT PAS, et qu'il ne faut promettre nulle
 * part : c'est une HEURISTIQUE de forme. Elle attrape le numéro + type de voie
 * et le vocabulaire de porte ; elle ne reconnaît PAS « chez moi », « la maison
 * bleue au bout du chemin », ni le nom d'une résidence privée. Elle réduit la
 * faute la plus courante — coller son adresse — elle ne rend pas le champ sûr.
 * La vraie protection reste le périmètre de lecture (crew seulement) et la
 * phrase de l'écran qui le dit.
 */
import {
  ACTIVITIES,
  CREW_OUTING_CAPACITY_MAX,
  CREW_OUTING_CAPACITY_MIN,
  CREW_OUTING_HORIZON_DAYS,
  CREW_OUTING_OBJECTIVES,
  CREW_OUTING_PLACE_LABEL_MAX,
  CREW_OUTING_TITLE_MAX,
  CREW_OUTING_ZONE_LABEL_MAX,
  type Activity,
  type CrewOutingObjective,
} from '@klaim/shared';

// ─── 1. La date et l'heure, composées de trois choix ─────────────────────────

/**
 * Pas de minutes : quatre quarts d'heure.
 *
 * POURQUOI PAS 60 VALEURS : un rendez-vous de crew se donne à « 19 h 30 », pas
 * à « 19 h 37 ». Soixante segments seraient une roue à faire défiler pour un
 * choix que personne ne fait — et un contrôle qu'on ne peut pas viser au doigt
 * (le plancher tactile est 44 pt, §A accessibilité).
 */
export const OUTING_MINUTE_STEPS: readonly number[] = [0, 15, 30, 45];

/** Le brouillon de « quand » : trois entiers, jamais un objet Date mutable. */
export interface WhenDraft {
  /** Jours à partir d'aujourd'hui (0 = aujourd'hui), borné par l'horizon. */
  dayOffset: number;
  /** Heure locale 0-23. */
  hour: number;
  /** Minute locale, dans `OUTING_MINUTE_STEPS`. */
  minute: number;
}

/**
 * Compose l'instant RÉEL (epoch ms) visé par le brouillon, dans le fuseau de
 * l'appareil.
 *
 * `nowMs` est un PARAMÈTRE et non `Date.now()` : sans lui cette fonction serait
 * intestable (« demain » change à minuit) et l'écran ne pourrait pas prouver
 * qu'il refuse une heure déjà passée. Aucune horloge n'est lue ici.
 *
 * Le calcul passe par `setDate` / `setHours` du fuseau LOCAL, à dessein : le
 * joueur choisit « demain 19 h » chez lui, pas « demain 19 h UTC ». Le passage
 * à l'heure d'été est donc géré par la plateforme, pas réimplémenté ici.
 */
export function outingStartsAtMs(draft: WhenDraft, nowMs: number): number {
  const d = new Date(nowMs);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + draft.dayOffset);
  d.setHours(draft.hour, draft.minute, 0, 0);
  return d.getTime();
}

/**
 * Le brouillon « quand » par défaut : la PROCHAINE borne de quart d'heure
 * strictement après `nowMs + OUTING_DEFAULT_LEAD_MIN`.
 *
 * POURQUOI PAS « MAINTENANT » : ouvrir sur une heure déjà passée ferait
 * apparaître le motif de blocage `when_past` avant que la personne ait touché
 * quoi que ce soit — on crierait une erreur à quelqu'un qui vient d'arriver
 * (même arbitrage que `pristine` dans `crewEdit.ts`).
 */
export const OUTING_DEFAULT_LEAD_MIN = 60;

export function defaultWhenDraft(nowMs: number): WhenDraft {
  const target = new Date(nowMs + OUTING_DEFAULT_LEAD_MIN * 60_000);
  const step = OUTING_MINUTE_STEPS[0] ?? 0;
  let minute = step;
  for (const m of OUTING_MINUTE_STEPS) if (m <= target.getMinutes()) minute = m;
  // On repart du jour de `target` (le +1 h peut avoir franchi minuit).
  const midnightNow = new Date(nowMs);
  midnightNow.setHours(0, 0, 0, 0);
  const midnightTarget = new Date(target.getTime());
  midnightTarget.setHours(0, 0, 0, 0);
  const dayOffset = Math.round(
    (midnightTarget.getTime() - midnightNow.getTime()) / 86_400_000,
  );
  return { dayOffset, hour: target.getHours(), minute };
}

// ─── 2. La garde de vie privée du point de rendez-vous ───────────────────────

/**
 * Motif interne de refus d'un point de rendez-vous.
 *   · `street_address` — un numéro collé à un type de voie (les deux ordres :
 *     « 12 rue X » roman, « Xstrasse 12 » germanique) ;
 *   · `door_detail`    — un mot qui ne décrit plus un lieu mais une ENTRÉE
 *     (digicode, interphone, appartement, étage…). Celui-là est plus grave que
 *     le premier : il n'y a aucune raison légitime de le publier à vingt
 *     personnes, et il désigne littéralement la porte.
 */
export type MeetingPointRefusal = 'street_address' | 'door_detail';

/**
 * Forme normalisée pour la détection : minuscules, ß→ss, accents retirés, tout
 * ce qui n'est ni lettre ni chiffre remplacé par une espace, encadrée d'espaces.
 *
 * ⚠️ CE N'EST PAS `moderation_fold` (0050), ET C'EST VOLONTAIRE : celui-là replie
 * le « leet » (`0`→o, `1`→i, `3`→e…). Il transformerait « 12 rue » en « i2 rue »
 * et rendrait la détection d'un NUMÉRO impossible. Deux besoins opposés — l'un
 * cherche des mots malgré les chiffres, l'autre cherche les chiffres.
 */
function foldPlace(text: string): string {
  const noSharpS = text.replace(/ß/g, 'ss');
  const flat = noSharpS.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ` ${flat.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

/**
 * Types de voie, dans les cinq langues de l'app. Les formes germaniques
 * (`strasse`, `weg`, `gasse`, `platz`) apparaissent en SUFFIXE de composé
 * (« Hauptstrasse ») : le motif les préfixe donc de `[a-z]*`.
 *
 * DÉLIBÉRÉMENT ABSENTS, parce qu'ils créeraient plus de faux positifs que de
 * vraies détections : `st` (« Saint »), `via`, `dr`, `ln`, `place` / `platz`
 * seul (« Place de la République » EST le lieu public qu'on recommande),
 * `porte` (« Porte de Vincennes » est une station de métro).
 */
const STREET_WORDS =
  'rue|avenue|av|ave|boulevard|bd|blvd|impasse|allee|chemin|quai|route|rte|passage|' +
  'street|road|rd|lane|drive|calle|avenida|paseo|rua|travessa|estrada|' +
  '[a-z]*strasse|[a-z]*weg|[a-z]*gasse|[a-z]*damm';

/**
 * Numéro PUIS type de voie, avec AU PLUS DEUX MOTS entre les deux.
 *
 * POURQUOI UNE FENÊTRE, ET POURQUOI DEUX : les langues ne rangent pas l'adresse
 * pareil. Le français colle le type au numéro (« 12 rue de la Paix », zéro mot
 * entre), l'anglais le rejette après le nom (« 221 Baker Street », un mot), et
 * « 45 bis boulevard Voltaire » en met un aussi. Trois autoriserait
 * « rendez-vous à 18 h devant la rue X » — un horaire suivi d'un mot de voie,
 * qui n'est pas une adresse. Deux couvre les cas réels sans ce faux refus.
 *
 * `[0-9]{1,4}[a-z]?` : « 221b Baker Street ».
 */
const STREET_NUMBER_FIRST = new RegExp(
  `(^| )[0-9]{1,4}[a-z]? ([a-z]+ ){0,2}(${STREET_WORDS})( |$)`,
);
/** Type de voie PUIS numéro : « Hauptstrasse 4 », « Kurfuerstendamm 12 ». */
const STREET_NUMBER_LAST = new RegExp(
  `(^| )[a-z]*(strasse|weg|gasse|damm|allee) [0-9]{1,4}( |$)`,
);

/**
 * Vocabulaire de PORTE — 5 langues. Ces mots ne décrivent pas un point de
 * ralliement, ils décrivent comment entrer chez quelqu'un.
 */
const DOOR_WORDS = new RegExp(
  '(^| )(digicode|interphone|intercom|sonnette|doorbell|klingel|' +
    'appartement|appart|apartamento|apartment|apt|' +
    'escalier|staircase|treppenhaus|etage)( |$)',
);

/**
 * Le libellé désigne-t-il une porte d'entrée ? `null` = il passe.
 *
 * PUR et sans horloge. Miroir exact de `crew_outing_place_refusal` (0085) : le
 * test PGlite fait passer LA MÊME liste de cas dans les deux implémentations et
 * exige le même verdict, pour qu'un écran ne promette jamais un refus que le
 * serveur ignore (ni l'inverse, qui ferait échouer un CTA peint comme valide).
 */
export function meetingPointRefusal(label: string): MeetingPointRefusal | null {
  const folded = foldPlace(label);
  if (folded.trim() === '') return null; // vide : c'est `place_empty`, pas un refus de vie privée
  if (DOOR_WORDS.test(folded)) return 'door_detail';
  if (STREET_NUMBER_FIRST.test(folded) || STREET_NUMBER_LAST.test(folded)) {
    return 'street_address';
  }
  return null;
}

/**
 * CAS DE RÉFÉRENCE PARTAGÉS AVEC LE SERVEUR — ne pas les déplacer.
 *
 * Cette liste est LUE PAR DEUX TESTS qui ne tournent pas dans le même monde :
 *   · `crewOuting.test.ts` (Deno) la passe dans `meetingPointRefusal` ;
 *   · `supabase/tests/crew_outing_create.pglite.test.mjs` RELIT CE FICHIER,
 *     extrait la liste, et la passe dans `crew_outing_place_refusal` (SQL).
 * Les deux exigent le même verdict. C'est la seule façon de prouver qu'un
 * écran ne refuse pas ce que le serveur accepte (frustration) et surtout qu'il
 * n'accepte pas ce que le serveur refuse (CTA mort), sans dupliquer la liste —
 * une liste dupliquée dérive au premier cas ajouté d'un seul côté.
 */
export const MEETING_POINT_FIXTURES: readonly (readonly [string, MeetingPointRefusal | null])[] = [
  // ── Ce qui PASSE : des lieux publics, le geste qu'on recommande ───────────
  ['Place de la République', null],
  ['Métro République, sortie Magenta', null],
  ['Parc de la Tête d’Or, entrée nord', null],
  ['Devant la fontaine', null],
  ['Grand Place', null],
  ['Porte de Vincennes', null],
  ['Hauptbahnhof', null],
  ['Estádio, portão 3', null],
  // Un nom de voie SANS numéro ne désigne aucune porte : c'est une rue entière.
  ['Rue Oberkampf', null],
  ['Hauptstrasse', null],
  ['Avenida Paulista', null],
  // ── Ce qui est REFUSÉ : un numéro + un type de voie (ordre roman) ─────────
  ['12 rue de la Paix', 'street_address'],
  ['3 avenue des Gobelins', 'street_address'],
  ['45 bis boulevard Voltaire', 'street_address'],
  ['7 impasse du Moulin', 'street_address'],
  ['221 Baker Street', 'street_address'],
  ['5 Calle Mayor', 'street_address'],
  ['30 Rua Augusta', 'street_address'],
  // ── … et l'ordre germanique (numéro APRÈS le nom composé) ────────────────
  ['Hauptstraße 4', 'street_address'],
  ['Bergmannstrasse 102', 'street_address'],
  // ── Le vocabulaire de PORTE : le pire, car il n'a aucun usage légitime ────
  ['Chez moi, digicode 45A12', 'door_detail'],
  ['Interphone Martin', 'door_detail'],
  ['Appartement 3, 2e etage', 'door_detail'],
  ['Ring the doorbell', 'door_detail'],
  ['Escalier B', 'door_detail'],
];

// ─── 3. Le brouillon, et ce qui l'empêche de partir ──────────────────────────

/** L'état du formulaire. `capacityText` est du TEXTE : « 12a » doit se refuser. */
export interface OutingDraft {
  title: string;
  when: WhenDraft;
  /**
   * `null` = AUCUNE discipline choisie, et c'est l'état d'ouverture.
   *
   * ⚠️ NE PAS PRÉSÉLECTIONNER « run ». `DEFAULT_ACTIVITY` existe pour les données
   * HÉRITÉES (toute course déjà enregistrée EST de la course à pied — un fait,
   * pas un repli). Ici il n'y a rien à hériter : une sortie qu'on est en train
   * d'écrire n'a pas de discipline tant que personne n'en a choisi une. Un
   * segment pré-allumé ferait publier « course à pied » à un crew de cyclistes
   * qui n'aurait rien touché — l'app affirmerait un choix que l'auteur n'a pas
   * fait. Même règle que E09 (`setupActivityLens.test.ts` : « n'allume son CTA
   * que sur un choix RÉEL, aucune présélection »).
   */
  activity: Activity | null;
  objective: CrewOutingObjective;
  /** Facultatif : chaîne vide = pas de zone visée. */
  zoneLabel: string;
  placeLabel: string;
  /** Facultatif : chaîne vide = pas de limite de places. */
  capacityText: string;
}

/** Le brouillon d'ouverture. Aucun champ pré-rempli d'un contenu inventé. */
export function emptyOutingDraft(nowMs: number): OutingDraft {
  return {
    title: '',
    when: defaultWhenDraft(nowMs),
    activity: null,
    objective: CREW_OUTING_OBJECTIVES[0],
    zoneLabel: '',
    placeLabel: '',
    capacityText: '',
  };
}

/**
 * Lecture du champ « places ».
 *   · vide            → `{ ok: true, value: null }` (facultatif, pas une faute)
 *   · entier borné    → `{ ok: true, value: n }`
 *   · le reste        → `{ ok: false }` : « 0 », « -3 », « 3,5 », « douze »,
 *                       « 12a », ou au-delà de CREW_OUTING_CAPACITY_MAX.
 *
 * Un nombre NÉGATIF est le cas que la mission nomme explicitement : sans ce
 * refus, `Number('-3')` vaut -3, l'écran laisserait partir la requête, et le
 * CHECK de la table lèverait une exception opaque au lieu d'un motif lisible.
 */
export function parseCapacity(text: string): { ok: true; value: number | null } | { ok: false } {
  const raw = text.trim();
  if (raw === '') return { ok: true, value: null };
  if (!/^[0-9]+$/.test(raw)) return { ok: false };
  const n = Number(raw);
  if (!Number.isInteger(n)) return { ok: false };
  if (n < CREW_OUTING_CAPACITY_MIN || n > CREW_OUTING_CAPACITY_MAX) return { ok: false };
  return { ok: true, value: n };
}

/**
 * Pourquoi la sortie ne peut pas partir. `null` = elle le peut.
 *
 * `pristine` n'existe PAS ici, contrairement à `crewEdit.ts` : une création
 * commence forcément vide, et « titre obligatoire » n'est pas un reproche —
 * c'est la description du travail restant. L'écran n'affiche toutefois le motif
 * d'un champ QU'APRÈS y avoir touché (`touched`), pour ne pas peindre trois
 * lignes rouges sur un formulaire qui vient de s'ouvrir.
 */
export type OutingBlock =
  | 'forbidden'
  | 'title_empty'
  | 'title_too_long'
  | 'when_past'
  | 'when_too_far'
  | 'activity_unset'
  | 'place_empty'
  | 'place_too_long'
  | 'place_street_address'
  | 'place_door_detail'
  | 'zone_too_long'
  | 'capacity_invalid';

/**
 * L'ordre des motifs est celui de la LECTURE HUMAINE (haut → bas du
 * formulaire), pas celui du coût de calcul : le motif rendu doit désigner le
 * premier champ que l'œil rencontre, sinon on renvoie quelqu'un vers le bas de
 * l'écran alors que le titre est vide en haut.
 */
export function outingBlockReason(
  canCreate: boolean,
  draft: OutingDraft,
  nowMs: number,
): OutingBlock | null {
  if (!canCreate) return 'forbidden';

  const title = draft.title.trim();
  if (title.length === 0) return 'title_empty';
  if (title.length > CREW_OUTING_TITLE_MAX) return 'title_too_long';

  const startsAt = outingStartsAtMs(draft.when, nowMs);
  // « Strictement après maintenant » : publier un rendez-vous déjà commencé
  // n'est pas une sortie, c'est une archive — et le serveur le refuse aussi.
  if (startsAt <= nowMs) return 'when_past';
  if (startsAt > nowMs + CREW_OUTING_HORIZON_DAYS * 86_400_000) return 'when_too_far';

  // Aucune discipline choisie : on ne devine pas, et le CTA reste éteint.
  if (draft.activity === null) return 'activity_unset';

  const place = draft.placeLabel.trim();
  if (place.length === 0) return 'place_empty';
  if (place.length > CREW_OUTING_PLACE_LABEL_MAX) return 'place_too_long';
  const refusal = meetingPointRefusal(place);
  if (refusal === 'street_address') return 'place_street_address';
  if (refusal === 'door_detail') return 'place_door_detail';

  if (draft.zoneLabel.trim().length > CREW_OUTING_ZONE_LABEL_MAX) return 'zone_too_long';

  if (!parseCapacity(draft.capacityText).ok) return 'capacity_invalid';

  return null;
}

/** La charge utile de `crew_outing_create`. Les facultatifs partent en `null`. */
export interface OutingPayload {
  p_title: string;
  /** ISO 8601 avec fuseau : le serveur reçoit un INSTANT, jamais « 19 h ». */
  p_starts_at: string;
  /**
   * `null` quand aucune discipline n'a été choisie. `outingPayloadOf` n'est
   * censé être appelé qu'après `outingBlockReason(...) === null`, donc ce cas
   * ne part pas sur le réseau — mais on ne SUBSTITUE pas une discipline par
   * défaut « au cas où » : le serveur refuse (`bad_activity`), ce qui est le
   * comportement honnête si un appelant se trompe un jour.
   */
  p_activity: Activity | null;
  p_objective: CrewOutingObjective;
  p_zone_label: string | null;
  p_place_label: string;
  p_capacity: number | null;
}

/**
 * ⚠️ N'APPELER QU'APRÈS `outingBlockReason(...) === null`. Cette fonction ne
 * valide RIEN : elle met en forme. La validation a un seul point d'entrée, et
 * dupliquer ses règles ici les ferait diverger au premier changement.
 */
export function outingPayloadOf(draft: OutingDraft, nowMs: number): OutingPayload {
  const capacity = parseCapacity(draft.capacityText);
  const zone = draft.zoneLabel.trim();
  return {
    p_title: draft.title.trim(),
    p_starts_at: new Date(outingStartsAtMs(draft.when, nowMs)).toISOString(),
    p_activity: draft.activity,
    p_objective: draft.objective,
    p_zone_label: zone.length > 0 ? zone : null,
    p_place_label: draft.placeLabel.trim(),
    p_capacity: capacity.ok ? capacity.value : null,
  };
}

/** Heures entières entre la création et le rendez-vous (event §18, sans PII). */
export function outingLeadHours(startsAtMs: number, nowMs: number): number {
  return Math.max(0, Math.floor((startsAtMs - nowMs) / 3_600_000));
}

// ─── 4. Lecture DÉFENSIVE des réponses serveur ───────────────────────────────

/** Une sortie TELLE QUE LE SERVEUR l'a écrite. Jamais un brouillon local. */
export interface CrewOuting {
  id: string;
  title: string;
  /** ISO du serveur. `null` = ligne héritée de 0019 (sans `starts_at`). */
  startsAt: string | null;
  /**
   * Libellé d'heure LIBRE des lignes antérieures à 0085. Le chemin d'écriture
   * actuel ne l'écrit PLUS (deux vérités sur l'heure, c'est une de trop) — il
   * n'est lu que pour ne pas rendre muette une vieille ligne.
   */
  whenLabel: string | null;
  activity: Activity | null;
  objective: CrewOutingObjective;
  placeLabel: string | null;
  zoneLabel: string | null;
  /** Places ANNONCÉES. Aucun RSVP ne les décompte (cf. game-rules E49). */
  capacity: number | null;
  hostPseudo: string | null;
}

const isActivity = (v: unknown): v is Activity =>
  typeof v === 'string' && (ACTIVITIES as readonly string[]).includes(v);

const isObjective = (v: unknown): v is CrewOutingObjective =>
  typeof v === 'string' && (CREW_OUTING_OBJECTIVES as readonly string[]).includes(v);

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

export function parseCrewOuting(raw: unknown): CrewOuting | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || typeof o.title !== 'string') return null;
  // L'objectif est le seul champ FERMÉ obligatoire : une valeur inconnue de ce
  // build n'a pas de libellé, et afficher la clé brute serait pire que rien.
  if (!isObjective(o.objective)) return null;
  return {
    id: o.id,
    title: o.title,
    startsAt: str(o.startsAt),
    whenLabel: str(o.whenLabel),
    activity: isActivity(o.activity) ? o.activity : null,
    objective: o.objective,
    placeLabel: str(o.placeLabel),
    zoneLabel: str(o.zoneLabel),
    capacity: typeof o.capacity === 'number' ? o.capacity : null,
    hostPseudo: str(o.hostPseudo),
  };
}

/** Ce que `crew_outing_context()` rend quand la lecture aboutit. */
export interface OutingContext {
  role: string;
  /** CREW_PERMISSIONS.createOuting, tranché SERVEUR — jamais dérivé ici. */
  canCreate: boolean;
  /** Les sorties À VENIR du crew, les plus proches d'abord. Peut être vide. */
  upcoming: readonly CrewOuting[];
  /** Plafond serveur de sorties à venir, pour dire le motif AVANT le refus. */
  maxUpcoming: number;
}

export type OutingRefusal =
  | 'signed_out'
  | 'no_crew'
  | 'forbidden'
  | 'bad_title'
  | 'bad_starts_at'
  | 'starts_at_past'
  | 'starts_at_too_far'
  | 'bad_activity'
  | 'bad_objective'
  | 'bad_place'
  | 'place_looks_like_address'
  | 'place_unavailable'
  | 'bad_zone'
  | 'bad_capacity'
  | 'too_many_upcoming';

const REFUSALS: readonly string[] = [
  'signed_out', 'no_crew', 'forbidden', 'bad_title', 'bad_starts_at',
  'starts_at_past', 'starts_at_too_far', 'bad_activity', 'bad_objective',
  'bad_place', 'place_looks_like_address', 'place_unavailable', 'bad_zone',
  'bad_capacity', 'too_many_upcoming',
];

/** Motif de refus d'une réponse serveur, ou `null` si ce n'en est pas un. */
export function outingRefusalOf(data: unknown): OutingRefusal | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  if (d.ok !== false) return null;
  const reason = typeof d.reason === 'string' ? d.reason : null;
  return reason && REFUSALS.includes(reason) ? (reason as OutingRefusal) : null;
}

export function parseOutingContext(raw: unknown): OutingContext | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.ok !== true) return null;
  if (typeof d.role !== 'string') return null;
  const list = Array.isArray(d.upcoming) ? d.upcoming : [];
  const upcoming: CrewOuting[] = [];
  for (const item of list) {
    const parsed = parseCrewOuting(item);
    // Une ligne illisible est ÉCARTÉE, jamais devinée : afficher une sortie à
    // moitié inventée serait le mensonge que cet écran doit éviter.
    if (parsed) upcoming.push(parsed);
  }
  return {
    role: d.role,
    canCreate: d.canCreate === true,
    upcoming,
    maxUpcoming: typeof d.maxUpcoming === 'number' ? d.maxUpcoming : 0,
  };
}
