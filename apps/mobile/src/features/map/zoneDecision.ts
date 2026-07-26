/**
 * GRYD — LOGIQUE PURE des deux sheets de décision de la Carte :
 *   • E04 « Territoire rival · zone à reprendre » — quelles métriques existent
 *     VRAIMENT, et quelle hauteur la sheet doit épouser ;
 *   • E05 « Briefing de mission » — les quatre états distincts du tracé
 *     recommandé, et la hauteur correspondante.
 *
 * Zéro import React/RN : Deno charge ce module tel quel.
 *
 * ─── LA RÈGLE QUI GOUVERNE TOUT CE FICHIER ─────────────────────────────────
 * Les planches montrent 3 métriques (E04) et 4 (E05). La plupart n'ont AUCUNE
 * source : « effort estimé », « dernière activité » du rival, « reprise 2 fois
 * ce mois », « gain potentiel », « difficulté ». Une métrique sans source ne
 * devient pas un tiret, ni un « — », ni un zéro : SA LIGNE DISPARAÎT. D'où une
 * hauteur de sheet qui ne peut pas être une constante devinée — elle se DÉDUIT
 * de ce qui est réellement rendu, sinon on choisit entre du texte tronqué (§A9)
 * et une bande carbone vide (§A).
 *
 * Aucune constante de JEU ici : uniquement des hauteurs de rangée, calibrées sur
 * les styles réellement écrits dans BattleMapOverlays / MissionBriefingSheet.
 */

// ─── E04 — métriques d'une zone ──────────────────────────────────────────────

/**
 * Les SEULES métriques de zone qui aient une source aujourd'hui :
 *   • `area`        — somme EXACTE des `cellArea(cell,'m2')` des cellules
 *                     réellement possédées (territoryBuild.ts) ;
 *   • `zones`       — nombre de cellules du territoire ;
 *   • `lastCapture` — le `claimed_at` le plus RÉCENT du territoire.
 * Volontairement PAS de « tenu depuis » : `capturedAt` est le maximum des
 * claims, pas le début de possession — « tenu depuis 6 jours » serait faux dès
 * qu'un seul hex a été repris entre-temps.
 */
export type ZoneMetricKey = 'area' | 'zones' | 'lastCapture';

/** Ordre d'affichage (planche E04 : surface, puis zones, puis temporalité). */
export const ZONE_METRIC_ORDER: readonly ZoneMetricKey[] = ['area', 'zones', 'lastCapture'];

export interface ZoneMetricsInput {
  areaKm2: number;
  zones: number;
  /** Jours depuis la dernière prise. `null` = aucune source (la ligne saute). */
  capturedDaysAgo: number | null;
}

/**
 * Les métriques RÉELLEMENT affichables, dans l'ordre de la planche. Jamais plus
 * de trois — et souvent moins, ce qui est le comportement recherché.
 */
export function zoneMetricKeys(input: ZoneMetricsInput): readonly ZoneMetricKey[] {
  const out: ZoneMetricKey[] = [];
  // Une surface nulle ou non finie n'est pas « 0 km² » : c'est une absence de
  // mesure. On se tait plutôt que d'afficher un zéro nu (§ zéro-mensonge).
  if (Number.isFinite(input.areaKm2) && input.areaKm2 > 0) out.push('area');
  if (Number.isFinite(input.zones) && input.zones > 0) out.push('zones');
  if (input.capturedDaysAgo !== null && Number.isFinite(input.capturedDaysAgo)) {
    out.push('lastCapture');
  }
  return out;
}

// ─── FORMATAGE « GRAND NOMBRE + PETITE UNITÉ » (planches E04/E05) ────────────
//
// Les planches composent chaque métrique en DEUX niveaux typographiques : la
// valeur en gros (rôle `typography.stat` — Inter Tight 800, tabular), l'unité
// PETITE à côté (« 0,42 » grand, « km² » petit). Le rendu a donc besoin des deux
// morceaux SÉPARÉS, pas d'une chaîne « 0,42 km² » déjà collée. La règle décimale
// est la même que partout dans l'app : virgule sauf en anglais. Fonctions PURES
// (aucun import i18n : on compare la locale à `'en'`) pour rester chargeables tel
// quel par Deno et testables sans rendu.

export interface StatParts {
  /** Valeur formatée dans la langue du joueur, SANS unité (« 0,42 », « 4,2 »). */
  value: string;
  /** Unité affichée petite à côté (« km² », « km ») — jamais collée à la valeur. */
  unit: string;
}

/** « 0,42 km² » → { value: '0,42', unit: 'km²' } — zéros de fin retirés (jamais tronqué). */
export function areaStatParts(km2: number, locale: string): StatParts {
  const s = km2.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return { value: locale === 'en' ? s : s.replace('.', ','), unit: 'km²' };
}

/** « 4,2 km » → { value: '4,2', unit: 'km' } — une décimale, même règle de virgule. */
export function distanceStatParts(km: number, locale: string): StatParts {
  const s = km.toFixed(1);
  return { value: locale === 'en' ? s : s.replace('.', ','), unit: 'km' };
}

const MS_PER_DAY = 86_400_000;

/**
 * Jours écoulés depuis `capturedAt` (ISO). `null` si la date est absente ou
 * illisible — on ne devine pas une ancienneté.
 *
 * Une date dans le FUTUR (dérive d'horloge entre le téléphone et le serveur)
 * rend 0 (« aujourd'hui ») et non un nombre négatif : « il y a -1 j » serait un
 * bug affiché au joueur.
 */
export function daysSinceCapture(capturedAt: string | null, now: Date): number | null {
  if (!capturedAt) return null;
  const ms = Date.parse(capturedAt);
  if (!Number.isFinite(ms)) return null;
  const diff = now.getTime() - ms;
  if (!Number.isFinite(diff)) return null;
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

// ─── HAUTEURS — la sheet épouse ce qui est RÉELLEMENT rendu ─────────────────
//
// Calibrées sur les styles écrits en face (police, gap de 6, paddings de
// `styles.info`, dégagement haut du panneau fixe de MapAnchoredSheet). La marge
// `ROW_SLACK` absorbe les écarts de métrique de police entre iOS, Android et
// react-native-web : sous-estimer ferait passer le CTA sous la ligne de flottaison.

/** Dégagement haut du panneau FIXE (MapAnchoredSheet.fixedTopGap) + bas de `info`. */
const SHEET_CHROME = 14 + 12;
/** Rangée d'en-tête : pastille + kicker + bouton Fermer (cible tactile 32). */
const HEAD_ROW = 32;
/**
 * Nom de zone — TITRE HÉROS de la planche (`typography.title`, 28 px, lineHeight
 * 31 + marginTop 4). Était calibré à 26 pour un titre de 16 px : le recalage
 * fidèle aux planches E04/E05 (« Quartier Saint-Rémy » mesure ~30 px à l'écran)
 * l'élève à 36, sinon le CTA repasserait sous la ligne de flottaison (§A9).
 */
const NAME_ROW = 36;
/** Ligne de propriétaire / phrase courte (12 px). */
const LINE_ROW = 16;
/**
 * Bloc de métriques à séparateurs. La valeur est désormais le GROS NOMBRE de la
 * planche (`typography.stat`, 28 px) + son unité petite, puis le libellé (12 px)
 * dessous — d'où 64 (contre 56 quand la valeur était à 15 px).
 */
const METRICS_BLOCK = 64;
/** CTA plein (54, mesuré sur la planche) + son dégagement haut (12). */
const CTA_ROW = 66;
/** Lien tertiaire — cible tactile a11y de 44. */
const LINK_ROW = 44;
/** Espacement vertical entre deux blocs de `styles.info`. */
const GAP = 6;
/** Marge de sécurité : métriques de police variables selon la plateforme. */
const ROW_SLACK = 20;

export interface ZoneSheetHeightInput {
  /** Nombre de métriques réellement rendues (0 ⇒ pas de bloc du tout). */
  metrics: number;
  /** CTA « Reprendre » présent (zone rivale uniquement). */
  hasCta: boolean;
  /** Lien tertiaire « Planifier pour plus tard ». */
  hasTertiary: boolean;
}

/**
 * Hauteur du peek E04. La planche dit « sheet à 52 % » ; on ÉPOUSE le contenu à
 * la place, et c'est délibéré : les lignes de métriques disparaissent quand leur
 * source manque, si bien qu'un palier fixe à 52 % laisserait, sur les zones les
 * moins documentées, une bande carbone vide — un écran qui se lit comme cassé
 * (§A). La composition, l'ordre et la hiérarchie de la planche, eux, sont tenus.
 */
export function zoneSheetHeight(input: ZoneSheetHeightInput): number {
  let h = SHEET_CHROME + HEAD_ROW + GAP + NAME_ROW + GAP + LINE_ROW + ROW_SLACK;
  if (input.metrics > 0) h += GAP + METRICS_BLOCK;
  if (input.hasCta) h += CTA_ROW;
  if (input.hasTertiary) h += GAP + LINK_ROW;
  return h;
}

// ─── E05 — état du tracé recommandé ─────────────────────────────────────────

/**
 * LES QUATRE ÉTATS DISTINCTS du tracé, appliqués à la lettre :
 *   • `no-position` — on ne sait pas où est le joueur, donc on ne peut RIEN
 *     router. Ce n'est ni un échec réseau ni un calcul en cours, et surtout ce
 *     n'est pas une raison d'ouvrir l'invite système de localisation sans geste
 *     (défaut corrigé le 21/07 sur le planificateur) ;
 *   • `loading`     — un calcul est réellement en vol ;
 *   • `failed`      — OSRM/le réseau n'a rien rendu ;
 *   • `ready`       — un VRAI tracé rue par rue existe, avec sa distance OSRM.
 * Il n'existe volontairement AUCUN cinquième état « aperçu » : on ne peint
 * jamais une polyligne décorative qui n'a pas été calculée.
 */
export type BriefRouteState = 'no-position' | 'loading' | 'failed' | 'ready';

/** Choisit l'état du tracé à partir de faits, jamais d'une supposition. */
export function briefRouteState(input: {
  hasPosition: boolean;
  loading: boolean;
  /** Distance RÉELLE du tracé calculé (km) — null tant qu'il n'y en a pas. */
  distanceKm: number | null;
}): BriefRouteState {
  if (!input.hasPosition) return 'no-position';
  if (input.distanceKm !== null && input.distanceKm > 0) return 'ready';
  return input.loading ? 'loading' : 'failed';
}

/**
 * Métriques du briefing. UNE SEULE a une source : la distance, celle que OSRM a
 * réellement mesurée sur le tracé rendu. Les trois autres de la planche sont
 * supprimées et ce n'est pas un oubli :
 *   • « ≈ 26 min » viendrait d'une allure fixe de 5'50/km codée dans l'écran du
 *     planificateur — un chiffre qui prétend connaître le joueur ;
 *   • « +0,42 km² gain potentiel » promettrait une capture AVANT la course,
 *     alors que le serveur seul tranche, APRÈS ;
 *   • « Difficulté » sort de trois seuils de km arbitraires, non traduits.
 */
export type BriefMetricKey = 'distance';

export function briefMetricKeys(state: BriefRouteState): readonly BriefMetricKey[] {
  return state === 'ready' ? ['distance'] : [];
}

/** Hauteur de l'aperçu de tracé quand il existe vraiment (mini-carte SVG). */
export const BRIEF_PREVIEW_H = 150;
/** Hauteur du bloc d'ÉTAT qui remplace l'aperçu (phrase + action éventuelle). */
const BRIEF_STATE_BLOCK = 64;
/** Microtexte sous le CTA (11 px). */
const MICRO_ROW = 18;
/** Phrase de valeur tactique — deux lignes autorisées, jamais coupée (§A9). */
const SENTENCE_ROW = 34;

export interface BriefSheetHeightInput {
  state: BriefRouteState;
  metrics: number;
  /** Le bloc d'état porte-t-il une action (Réessayer / ouvrir le planificateur) ? */
  hasStateAction: boolean;
}

/**
 * Hauteur du briefing. La planche dit 58 % : avec un tracé RÉEL affiché, le
 * contenu y arrive de lui-même (~500 px sur un écran de 812). Sans tracé, la
 * sheet se resserre — parce qu'il n'y a réellement pas 58 % d'écran à dire.
 */
export function briefSheetHeight(input: BriefSheetHeightInput): number {
  let h = SHEET_CHROME + HEAD_ROW + GAP + NAME_ROW + ROW_SLACK;
  h += GAP + (input.state === 'ready' ? BRIEF_PREVIEW_H : BRIEF_STATE_BLOCK);
  if (input.hasStateAction) h += GAP + LINK_ROW;
  if (input.metrics > 0) h += GAP + METRICS_BLOCK;
  h += GAP + SENTENCE_ROW;
  h += CTA_ROW;
  h += GAP + MICRO_ROW;
  return h;
}
