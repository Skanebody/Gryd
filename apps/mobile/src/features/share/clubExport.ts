/**
 * GRYD — CE QUE LE CLUB AJOUTE AU PARTAGE, ET CE QU'IL NE CHANGE JAMAIS.
 *
 * Le catalogue Arsenal VEND au Club « export HD » et « templates mensuels ».
 * `users.is_club` était LU (features/arsenal/inventory.ts, features/social/
 * economy.ts) et AFFICHÉ (app/arsenal.tsx) — mais aucun écran ne conditionnait
 * quoi que ce soit à cette valeur. Ce module est la moitié PURE de la réponse :
 * il décide quelle qualité d'export et quelles éditions de carte sont ouvertes,
 * et il calcule les dimensions RÉELLES de la sortie.
 *
 * ═══ ANTI PAY-TO-WIN (§1.6) — CE QUI EST VENDU ICI ══════════════════════════
 * Une qualité d'image et des éditions de carte. RIEN d'autre. Aucun export ne
 * donne un mètre de territoire, un point, une vitesse, une protection, une
 * priorité de classement ni une immunité — et il ne peut PAS en donner : ce
 * module ne lit ni n'écrit aucune grandeur de jeu, il ne connaît que des
 * PIXELS, un statut d'abonnement et une trace déjà masquée. Un joueur non-Club
 * qui exporte en standard publie exactement les mêmes FAITS qu'un membre Club :
 * mêmes zones, mêmes chiffres, mêmes mots. Seule la définition de l'image
 * change. Un test (`clubExport.test.ts`) relit ce fichier pour qu'aucune
 * grandeur de jeu ne s'y glisse un jour par distraction.
 *
 * ═══ LE PIÈGE ÉVIDENT : « HD RÉVÈLE PLUS » ══════════════════════════════════
 * Un export plus défini d'une trace non masquée exposerait mieux le domicile.
 * D'où l'ordre imposé ici : le masquage (`applySharePrivacy`, SHARE_TRIM_M +
 * zones floutées) est calculé UNE fois, AVANT toute décision de qualité, et la
 * même trace est rendue aux deux plans. La qualité ne touche pas `trimM`, ne
 * touche pas les zones, et n'a aucun moyen de les atteindre : elle est
 * consommée APRÈS. Le test l'exige par égalité stricte des deux traces, zones
 * floutées comprises.
 *
 * ═══ POURQUOI ON NE PASSE JAMAIS `width`/`height` À `captureRef` ════════════
 * C'est le levier qui SEMBLE fait pour ça, et c'est un faux levier — vérifié
 * dans le natif embarqué, pas supposé :
 *   · Android (node_modules/react-native-view-shot/android/…/ViewShot.java:439)
 *     `Bitmap.createScaledBitmap(bitmap, width, height, true)` — un simple
 *     rééchantillonnage du bitmap DÉJÀ rendu ;
 *   · iOS (ios/RNViewShot.mm:113-122) `UIGraphicsBeginImageContextWithOptions
 *     (size, NO, 0)` puis `drawViewHierarchyInRect` — l'instantané de la vue
 *     est dessiné dans un rectangle plus grand, donc étiré.
 * Dans les deux cas : un fichier plus lourd, ZÉRO détail supplémentaire. Vendre
 * ça comme « HD » serait vendre du vent. Le seul gain réel s'obtient en
 * RE-RENDANT la carte (Views, Text, SVG — tout est vectoriel) à une taille
 * logique supérieure, puis en capturant SANS option de redimensionnement :
 * c'est l'étage `ShareExportStage`, et c'est ce que ce module planifie.
 *
 * ═══ AUCUN BOUTON MORT (constitution) ═══════════════════════════════════════
 * `FeatureAccess` distingue QUATRE états, jamais confondus — un format fermé
 * n'est pas un bouton qui échoue, c'est une invitation :
 *   · `granted`    — membre Club : le format s'exporte réellement ;
 *   · `invite`     — pas membre : le contrôle mène à /premium, il ne rate rien ;
 *   · `pending`    — statut en cours de LECTURE : on n'affirme rien, on attend ;
 *   · `unreadable` — la lecture a ÉCHOUÉ : on le dit, on ne prétend ni l'un ni
 *     l'autre (proposer « Rejoindre le Club » à un membre serait un mensonge,
 *     et exporter en HD sans savoir en serait un autre).
 * Et le plan d'export ne PROMET jamais ce qu'il ne peut pas produire : sans
 * accès, sans étage monté, ou sans gain de pixels réel, il retombe en standard
 * et DIT pourquoi (`downgradeReason`) au lieu d'annoncer un HD imaginaire.
 *
 * PUR : aucune I/O, aucune horloge, aucun composant. Testable en Deno.
 */
import { applySharePrivacy, SHARE_TRIM_M, type PrivacyZone } from './sharePrivacy';
import type { LatLngPoint } from '../map/realAnchors';

/** Qualité de l'image produite. Deux valeurs, pas une échelle continue. */
export type ExportQualityId = 'standard' | 'hd';

/** Liste exhaustive (sert au rendu du sélecteur ET au test). */
export const EXPORT_QUALITIES: readonly ExportQualityId[] = ['standard', 'hd'];

/**
 * Ce que l'app SAIT du statut Club de ce joueur. Quatre valeurs parce que
 * « je ne sais pas encore » et « je n'ai pas pu savoir » ne se rendent pas
 * pareil (constitution : quatre états distincts, jamais confondus).
 *
 * La SOURCE est `users.is_club`, lue par features/arsenal/inventory.ts et
 * features/social/economy.ts. Elle n'est pas importée ici : ce module doit
 * rester pur et sans dépendance sur un chantier voisin — l'écran projette son
 * état de lecture sur ce type.
 */
export type ClubStatus = 'member' | 'nonMember' | 'reading' | 'unreadable';

/** Ce qu'un contrôle a le droit de FAIRE, dérivé du statut. Jamais un échec. */
export type FeatureAccess = 'granted' | 'invite' | 'pending' | 'unreadable';

/**
 * Raison d'un repli en standard — affichable, jamais silencieuse. « Pas membre »
 * et « statut non résolu » sont SÉPARÉS : l'écran doit inviter dans le premier
 * cas et se taire dans le second (inviter un membre au Club serait un mensonge).
 */
export type DowngradeReason =
  | 'none'
  | 'notClubMember'
  | 'statusUnknown'
  | 'stageMissing'
  | 'noGain';

/**
 * Accès d'une fonction RÉSERVÉE au Club (qualité HD, éditions de cartes).
 * C'est la seule porte : ni la qualité ni les templates ne re-dérivent le
 * statut dans leur coin, sinon deux réponses pourraient diverger.
 */
export function clubAccess(status: ClubStatus): FeatureAccess {
  switch (status) {
    case 'member':
      return 'granted';
    case 'nonMember':
      return 'invite';
    case 'reading':
      return 'pending';
    case 'unreadable':
      return 'unreadable';
  }
}

/**
 * Accès d'une QUALITÉ d'export.
 *
 * `standard` est TOUJOURS `granted`, y compris quand le statut est illisible :
 * l'export de base n'a jamais été payant et une panne de lecture ne doit pas
 * retirer au joueur ce qu'il avait déjà. C'est aussi ce qui garantit qu'il
 * reste toujours un chemin de partage qui marche — jamais un écran sans issue.
 */
export function qualityAccess(q: ExportQualityId, status: ClubStatus): FeatureAccess {
  return q === 'standard' ? 'granted' : clubAccess(status);
}

/** Une entrée du sélecteur de qualité, prête à rendre. */
export interface ExportQualityOption {
  readonly id: ExportQualityId;
  readonly access: FeatureAccess;
  /**
   * `true` = appuyer PRODUIT une image. `false` ne veut pas dire « désactivé
   * mort » : `invite` mène à /premium (une action réelle), `pending` et
   * `unreadable` ne proposent rien du tout plutôt qu'un bouton qui échouerait.
   */
  readonly exports: boolean;
}

/** Le sélecteur de qualité pour ce statut — dans l'ordre standard puis HD. */
export function exportQualityOptions(status: ClubStatus): readonly ExportQualityOption[] {
  return EXPORT_QUALITIES.map((id) => {
    const access = qualityAccess(id, status);
    return { id, access, exports: access === 'granted' };
  });
}

/**
 * Cible en PIXELS de l'export HD : 1080 px de large, la définition native des
 * stories et des posts Instagram/TikTok. Ce n'est PAS une constante de jeu (elle
 * ne décide rien du territoire, des points ni des règles) — sa place n'est donc
 * pas dans `packages/shared/src/game-rules.ts`, qui est la source unique des
 * constantes de JEU. C'est une cible de RENDU, et elle vit avec le rendu.
 */
export const HD_TARGET_WIDTH_PX = 1080;

/**
 * Garde-fou mémoire : au-delà, l'étage hors écran coûterait plus cher que le
 * gain. 1080 pt correspond à un appareil de densité 1 (le web) rendant la cible
 * exacte — personne n'a besoin de plus.
 */
export const HD_STAGE_MAX_WIDTH_PT = 1080;

/** Densité minimale plausible (web/densité inconnue) — évite une division absurde. */
const MIN_DEVICE_SCALE = 1;

/**
 * Largeur LOGIQUE (points) de l'étage HD pour atteindre `targetPx` pixels réels
 * sur un appareil de densité `deviceScale`.
 *
 * C'est ici que le gain est VRAI : la carte est re-mise en page à cette largeur
 * (le titre héros recalcule sa taille sur la largeur mesurée, la carte recalcule
 * son cadrage), donc les pixels supplémentaires portent du dessin, pas de
 * l'interpolation.
 */
export function hdStageWidthPt(
  deviceScale: number,
  targetPx: number = HD_TARGET_WIDTH_PX,
): number {
  const scale = Math.max(MIN_DEVICE_SCALE, Number.isFinite(deviceScale) ? deviceScale : 1);
  return Math.min(HD_STAGE_MAX_WIDTH_PT, Math.ceil(targetPx / scale));
}

/** Pixels réellement produits par une capture d'une vue large de `widthPt`. */
export function capturedPixelWidth(widthPt: number, deviceScale: number): number {
  const scale = Math.max(MIN_DEVICE_SCALE, Number.isFinite(deviceScale) ? deviceScale : 1);
  return Math.round(Math.max(0, widthPt) * scale);
}

/**
 * Options de capture EXPÉDIÉES à `captureRef`. Aucune clé `width`/`height` :
 * voir l'en-tête — ce sont des rééchantillonnages, pas de la définition. Le type
 * est fermé exprès pour qu'on ne puisse pas en ajouter sans rouvrir ce fichier
 * (et son test, qui refuse ces deux clés).
 */
export interface SafeCaptureOptions {
  readonly format: 'png';
  readonly quality: 1;
  readonly result: 'tmpfile';
}

/** Les seules options de capture autorisées, partagées par les deux qualités. */
export const SAFE_CAPTURE_OPTIONS: SafeCaptureOptions = {
  format: 'png',
  quality: 1,
  result: 'tmpfile',
};

/** Ce que l'écran sait au moment d'exporter. */
export interface ExportPlanInput {
  /** Qualité DEMANDÉE par le joueur. */
  readonly quality: ExportQualityId;
  /** Statut Club tel que l'écran l'a lu (jamais deviné). */
  readonly status: ClubStatus;
  /** L'étage HD est-il RÉELLEMENT monté et mesuré ? Sans lui, pas de HD. */
  readonly hdStageMounted: boolean;
  /** Largeur logique de l'aperçu à l'écran (la cible de l'export standard). */
  readonly previewWidthPt: number;
  /** Aspect largeur/hauteur du format choisi (`SHARE_CARD_ASPECT[ratio]`). */
  readonly aspect: number;
  /** Densité de l'écran (`PixelRatio.get()`). */
  readonly deviceScale: number;
  /** Tracé BRUT du run — il sera masqué ici, avant toute décision de qualité. */
  readonly trace: readonly LatLngPoint[];
  /** Coupe des extrémités. Défaut : la constante de jeu SHARE_TRIM_M. */
  readonly trimM?: number;
  /** Zones floutées déclarées. Elles prévalent sur tout rendu social (§1.5). */
  readonly zones?: readonly PrivacyZone[];
}

/** Ce qui sera RÉELLEMENT produit — jamais ce qui a été demandé. */
export interface ExportPlan {
  readonly requested: ExportQualityId;
  readonly quality: ExportQualityId;
  readonly downgradeReason: DowngradeReason;
  /** Quelle vue capturer : l'aperçu à l'écran, ou l'étage hors écran. */
  readonly stage: 'preview' | 'hd';
  readonly widthPt: number;
  readonly heightPt: number;
  readonly widthPx: number;
  readonly heightPx: number;
  /**
   * Tracé PUBLIABLE — identique quelle que soit la qualité. Vide = rien de
   * publiable (l'appelant a déjà son état « tracé inconnu »).
   */
  readonly trace: readonly LatLngPoint[];
  readonly captureOptions: SafeCaptureOptions;
}

/**
 * Pourquoi le HD demandé ne peut PAS être tenu (`'none'` = il peut l'être).
 *
 * L'ordre des refus est celui de la vérité la plus forte : on ne peut pas
 * reprocher au joueur de ne pas être membre si on n'a même pas lu son statut, et
 * on ne parle de pixels que si tout le reste est en place.
 */
function hdRefusal(i: ExportPlanInput, stagePx: number, previewPx: number): DowngradeReason {
  if (i.quality === 'standard') return 'none';
  const access = qualityAccess('hd', i.status);
  // `pending` / `unreadable` : on ne SAIT pas. On n'ouvre pas le HD, et on ne
  // prétend pas non plus que le joueur n'est pas abonné.
  if (access !== 'granted') return access === 'invite' ? 'notClubMember' : 'statusUnknown';
  if (!i.hdStageMounted) return 'stageMissing';
  // Un « HD » qui ne produirait pas plus de pixels que l'aperçu ne serait qu'un
  // mot : on le refuse au lieu de le facturer.
  return stagePx <= previewPx ? 'noGain' : 'none';
}

/**
 * Le plan d'export de CE partage.
 *
 * ORDRE NON NÉGOCIABLE, et c'est tout l'intérêt de la fonction :
 *   1. on masque la trace (`applySharePrivacy`) — AVANT de regarder la qualité ;
 *   2. on décide la qualité RÉELLEMENT tenable ;
 *   3. on en déduit des dimensions.
 * L'étape 2 n'a aucun moyen d'atteindre l'étape 1 : `trimM` et `zones` sont
 * consommés avant, et le résultat est partagé tel quel par les deux plans.
 */
export function buildExportPlan(i: ExportPlanInput): ExportPlan {
  // ── 1. CONFIDENTIALITÉ D'ABORD, toujours, quelle que soit la qualité ──────
  const trace = applySharePrivacy(i.trace, i.trimM ?? SHARE_TRIM_M, i.zones ?? []);

  // ── 2. La qualité que l'app peut TENIR ────────────────────────────────────
  const previewWidthPt = Math.max(0, i.previewWidthPt);
  const previewPx = capturedPixelWidth(previewWidthPt, i.deviceScale);
  const stageWidthPt = hdStageWidthPt(i.deviceScale);
  const stagePx = capturedPixelWidth(stageWidthPt, i.deviceScale);

  const reason = hdRefusal(i, stagePx, previewPx);
  const quality: ExportQualityId = i.quality === 'hd' && reason === 'none' ? 'hd' : 'standard';

  // ── 3. Dimensions ─────────────────────────────────────────────────────────
  const widthPt = quality === 'hd' ? stageWidthPt : previewWidthPt;
  const aspect = i.aspect > 0 ? i.aspect : 1;
  const heightPt = Math.round(widthPt / aspect);
  return {
    requested: i.quality,
    quality,
    downgradeReason: reason,
    stage: quality === 'hd' ? 'hd' : 'preview',
    widthPt,
    heightPt,
    widthPx: capturedPixelWidth(widthPt, i.deviceScale),
    heightPx: capturedPixelWidth(heightPt, i.deviceScale),
    trace,
    captureOptions: SAFE_CAPTURE_OPTIONS,
  };
}
