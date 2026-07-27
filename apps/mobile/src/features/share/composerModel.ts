/**
 * GRYD — MODÈLE PUR DU COMPOSITEUR DE PARTAGE (planche E10, spec E35/E36).
 *
 * Deux décisions vivent ici, et pas dans l'écran : ce sont des RÈGLES, donc
 * elles doivent être testables sans React (règle projet « toute logique de règle
 * = fonction PURE + tests Deno »). Zéro import, comme `cardModel.ts`,
 * `narrative.ts` et `shareTargets.ts`.
 *
 * ═══ 1. LE BROUILLON DU SHEET « PERSONNALISER » ═════════════════════════════
 * La planche : « "Personnaliser" ouvre un sheet 50→90 % (Format · Style · Photo
 * · Donnée · Texte · Confidentialité), une section à la fois. » La spec E36
 * ajoute : « aperçu ; onglet actif ; 3 à 6 choix maximum ; CTA APPLIQUER. Aucun
 * éditeur de design libre complexe. »
 *
 * ─── POURQUOI UN BROUILLON, ET PAS UN RÉGLAGE EN DIRECT ─────────────────────
 * Parce que la copie du sheet a déjà tranché : le contrôle de fermeture s'appelle
 * `customizeCloseA11y` = « Fermer SANS APPLIQUER » (features/share/copy.ts).
 * Un sheet qui appliquerait en direct rendrait ce libellé faux — et il porterait
 * un CTA `APPLIQUER` qui n'appliquerait rien, c'est-à-dire un bouton mort au sens
 * de la constitution §2. Le brouillon est donc la seule lecture cohérente :
 * on modifie une COPIE, `APPLIQUER` la commit, la croix la jette. L'« aperçu »
 * exigé par E36 vit DANS le sheet et suit le brouillon — c'est lui qui tient la
 * promesse « l'aperçu suit » (`customizeHint`).
 *
 * ─── LA SECTION « PHOTO » N'EXISTE PAS ICI, ET C'EST UNE DÉCISION ───────────
 * La planche la liste ; `apps/mobile/app.json` déclare
 * `NSPhotoLibraryUsageDescription` pour un usage PHOTO DE PROFIL uniquement.
 * Peindre un mode Photo ferait servir à un autre usage une permission demandée
 * pour celui-là — l'app dirait une chose au système et en ferait une autre.
 * Élargir cette chaîne est une décision de fondation (app.json, revue App
 * Store), pas un détail d'écran : la section n'est donc pas ouverte, et
 * `CUSTOMIZE_SECTIONS` est volontairement à CINQ entrées.
 *
 * ═══ 2. CE QUE LE BADGE « PROTÉGÉ » A LE DROIT DE PROMETTRE ═════════════════
 * La planche veut le badge PERMANENT avec « détail au tap ». Un badge permanent
 * ne peut donc pas porter une phrase unique et figée : ce qui est réellement
 * protégé dépend de l'état (le tracé est-il publié ? le joueur masque-t-il ses
 * extrémités ? ses zones privées sont-elles connues ?).
 * `protectionLines()` dérive cette liste de l'état RÉEL du pipeline
 * (`applySharePrivacy`, features/share/sharePrivacy.ts) — jamais d'une intention
 * de produit. Une protection que le code ne tient pas n'a pas d'identifiant ici :
 * c'est ce qui empêche le détail de promettre plus que le pipeline.
 */

// ═══════════════════════════════════════════════════════════════════════════
// 1. SHEET « PERSONNALISER » (E36)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Les sections du sheet. Vocabulaire ALIGNÉ sur `share_customize_opened` /
 * `share_customize_applied` (packages/shared/src/events.ts) : ce que l'écran
 * peint et ce que l'analytics compte doivent porter le même nom, sinon le KPI
 * décrit un écran qui n'existe pas.
 *
 * `'media'` (la photo) est absent — voir l'en-tête. `'data'` est la section
 * « Donnée » de la planche : QUEL chiffre la carte met en géant.
 */
export type CustomizeSectionId = 'format' | 'style' | 'data' | 'text' | 'privacy';

/**
 * ORDRE de la planche (« Format · Style · Photo · Donnée · Texte ·
 * Confidentialité »), Photo retirée. L'ordre est une source unique : un ordre
 * qui bouge d'un rendu à l'autre transforme un geste appris en loterie.
 */
export const CUSTOMIZE_SECTIONS: readonly CustomizeSectionId[] = [
  'format',
  'style',
  'data',
  'text',
  'privacy',
];

/**
 * L'état modifiable par le sheet. Les trois premiers champs sont des ids
 * (`'auto'` compris) : ce module ne connaît ni les formats de card ni les
 * templates — les CONNAÎTRE l'obligerait à importer l'UI et il cesserait d'être
 * testable en Deno. L'écran les renarrowe (`interface Draft extends
 * ComposerDraft { ratio: ShareCardRatio; … }`), donc rien n'est perdu côté
 * typage à l'usage.
 */
export interface ComposerDraft {
  /** Format d'export (`story` | `feed` | `square` | `mapOnly`). */
  readonly ratio: string;
  /** Style narratif : `'auto'` (le moteur) ou un id de template. */
  readonly style: string;
  /** Chiffre héros : `'auto'` (le choix du template) ou un `HeroMetricId`. */
  readonly hero: string;
  /** La capsule de défi est-elle imprimée sur la carte ? */
  readonly showChallenge: boolean;
  /** La ligne de contexte (crew · rang · distance · durée) est-elle imprimée ? */
  readonly showContext: boolean;
  /** Réglage JOUEUR : couper les extrémités du tracé publié (§12.1). */
  readonly maskEndpoints: boolean;
}

/**
 * Quelles SECTIONS ont réellement changé entre deux états. Sert à n'émettre
 * `share_customize_applied` que pour ce qui a été appliqué : un `APPLIQUER` qui
 * ne change rien ne doit pas gonfler le KPI, sinon l'analytics ment aussi.
 *
 * Ordre de sortie = `CUSTOMIZE_SECTIONS` (stable, testé).
 */
export function changedSections(
  before: ComposerDraft,
  after: ComposerDraft,
): readonly CustomizeSectionId[] {
  const out: CustomizeSectionId[] = [];
  if (before.ratio !== after.ratio) out.push('format');
  if (before.style !== after.style) out.push('style');
  if (before.hero !== after.hero) out.push('data');
  if (before.showChallenge !== after.showChallenge || before.showContext !== after.showContext) {
    out.push('text');
  }
  if (before.maskEndpoints !== after.maskEndpoints) out.push('privacy');
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. BADGE « PROTÉGÉ » — LE DÉTAIL AU TAP
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Une protection RÉELLEMENT appliquée par le pipeline, ou une limite RÉELLE
 * qu'il faut dire. Chaque identifiant renvoie à une ligne de code, jamais à une
 * intention :
 *   · `noRoute`      aucun tracé n'est publié sur cette carte (safeTrace vide ou
 *                    style/format sans trace) — la protection la plus forte, et
 *                    la seule vraie quand il n'y a rien à masquer ;
 *   · `endpoints`    `trimTraceEnds(trace, SHARE_TRIM_M)` (sharePrivacy.ts:132) ;
 *   · `simplify`     `simplifyForShare(…, SHARE_SIMPLIFY_EPSILON_M)` (:228) —
 *                    NON désactivable, c'est une règle du produit ;
 *   · `zonesApplied` `applyPrivacyZones` a écarté les points tombant dans les
 *                    zones du joueur, lues en base (:186) ;
 *   · `zonesNone`    le pipeline les applique, mais le joueur n'en a AUCUNE et
 *                    aucun écran ne permet encore d'en déclarer une. Le dire est
 *                    le contraire d'une promesse : c'est l'aveu que la case est
 *                    vide (constitution : une doc ne promet jamais au-delà du
 *                    code) ;
 *   · `noClock`      la carte ne porte aucune heure d'horloge — seulement une
 *                    DURÉE (`clockLabel`), qui ne dit pas quand on est sorti.
 */
export type ProtectionId =
  | 'noRoute'
  | 'endpoints'
  | 'simplify'
  | 'zonesApplied'
  | 'zonesNone'
  | 'noClock';

export interface ProtectionInput {
  /** Un tracé est-il RÉELLEMENT dessiné sur la carte partagée ? */
  readonly routePublished: boolean;
  /** Réglage joueur `maskEndpoints` (features/privacy/prefs.ts). */
  readonly maskEndpoints: boolean;
  /** Zones privées LUES pour ce joueur (0 = aucune déclarée). */
  readonly declaredZones: number;
}

/**
 * CE QUE LE DÉTAIL DU BADGE A LE DROIT DE DIRE, dans cet ordre de lecture.
 *
 * Deux règles gouvernent tout :
 *   1. sans tracé publié, RIEN de géométrique n'est promis — annoncer
 *      « départ et arrivée masqués » sur une carte qui ne montre aucun tracé
 *      serait revendiquer un masquage qui n'a rien masqué ;
 *   2. `endpoints` n'apparaît que si le joueur l'a laissé actif : le pipeline
 *      passe alors `trimM = 0` et il n'y a plus rien à revendiquer.
 * `noClock` est vrai dans tous les cas : aucune carte ne porte d'heure.
 */
export function protectionLines(i: ProtectionInput): readonly ProtectionId[] {
  const out: ProtectionId[] = [];
  if (!i.routePublished) {
    out.push('noRoute');
    out.push('noClock');
    return out;
  }
  if (i.maskEndpoints) out.push('endpoints');
  out.push('simplify');
  out.push(i.declaredZones > 0 ? 'zonesApplied' : 'zonesNone');
  out.push('noClock');
  return out;
}
