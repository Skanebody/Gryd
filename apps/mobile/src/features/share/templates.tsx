/**
 * GRYD — LES CARTES DE PARTAGE (planche E10, recalage du 25/07/2026).
 *
 * ─── LE RETOUR FONDATEUR QUE CE FICHIER SOLDE ───────────────────────────────
 * « Le partage de conquête n'a rien de ressemblant à ce qu'on a mis en place
 * sur les nouveaux visuels. » C'était exact : l'ÉCRAN compositeur avait été
 * recalé, pas les CARTES qu'il produit. Cet en-tête revendiquait encore la
 * grammaire d'AMENDEMENT-20 (« ≤ 3 stats + 1 KPI, badge GRYD Verified ») et sur
 * huit templates, UN SEUL suivait la planche : les sept autres empilaient
 * kicker + titre + KPI + rangée de 3 stats + hashtag. Deux grammaires
 * cohabitaient dans le même écran.
 *
 * ─── LA GRAMMAIRE DE LA PLANCHE, UNE SEULE, POUR TOUS LES MODES ─────────────
 * La planche décrit un SYSTÈME, pas sept mises en page :
 *
 *   1. bandeau de LIEU discret (ville · secteur)
 *   2. TITRE de l'événement, display, deux lignes
 *   3. LA CARTE, zone REMPLIE — c'est la preuve, elle tient le centre optique
 *   4. le GAIN en chiffre héros
 *   5. une ligne de CONTEXTE courte (crew · classement · distance · durée)
 *   6. un CTA de DÉFI discret
 *   7. la SIGNATURE GRYD en pied
 *
 * Chaque template passe désormais par `shareCard()` : il ne choisit QUE son
 * titre, sa grandeur héros, son défi et son visuel. Le reste est identique
 * partout — c'est ça, « le même système ».
 *
 * ─── CE QUE CE FICHIER NE PEUT PAS TENIR, ET POURQUOI (écarts assumés) ───────
 * Quatre des sept emplacements sont décidés par `src/ui/game/ShareCard.tsx`,
 * hors du périmètre de ce lot. `ShareTemplate.build` ne peut renvoyer que des
 * `ShareCardProps` ; en mode héros, ShareCard place le wordmark GRYD en HAUT et
 * supprime tout le pied. Restent donc :
 *   · #1 BANDEAU DE LIEU : aucun slot au-dessus du titre → NON RENDU. Il n'a de
 *     toute façon aucune source (voir `knownPlaceName`), donc le peindre vide
 *     aurait été un emplacement mort ;
 *   · #7 SIGNATURE EN PIED : le wordmark existe, mais en haut à gauche ;
 *   · #6 DÉFI « DISCRET » : la capsule est pleine largeur et chartreuse. Ce lot
 *     la réserve aux trois récits qui l'ont MÉRITÉE (une zone a changé de main,
 *     ou une frontière a tenu) au lieu de la peindre partout ; son poids
 *     visuel, lui, se règle dans ShareCard.
 * Ces trois écarts sont listés dans le retour de lot, pas cachés ici.
 *
 * ─── LA CARTE NOMME LA BONNE DISCIPLINE (26/07/2026) ────────────────────────
 * Le vélo est une discipline RÉELLE depuis le 26/07/2026, et cette carte-ci
 * imprimait encore « COURSE ENREGISTRÉE » / « COURU POUR {crew} » sous le tracé
 * d'un cycliste : `ShareDemoData` ne portait AUCUNE discipline, donc l'image
 * exportée ne pouvait pas savoir ce qu'elle décrivait. C'est le pire endroit du
 * produit pour ce défaut — le PNG quitte l'app, et sa victime n'est pas le
 * joueur mais SON CREW, qui lit « COURSE » sous une photo de vélo sans aucun
 * moyen de corriger. `ShareDemoData.activity` porte donc la discipline jusqu'ici,
 * et les trois titres qui nomment l'effort passent par `copyOf(d)`.
 *
 * ─── ZÉRO DONNÉE FABRIQUÉE ──────────────────────────────────────────────────
 * Aucun scénario de démo (supprimé le 21/07/2026). `ShareDemoData` (nom
 * historique) décrit les données d'un run RÉEL ; ce qui n'est pas connu est VIDE
 * et la carte le TAIT (crew, rang) ou le DIT (chiffre héros indisponible, tracé
 * indisponible) — jamais un emprunt, jamais un « +0 » exporté.
 */
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, gameColors, type Activity } from '@klaim/shared';
import type { ShareCardProps } from '../../ui/game';
import { C, resultCopy } from '../../i18n/catalog/result';
import { t, useT } from '../../i18n/store';
import { type LatLngPoint } from '../map/realAnchors';
import { ShareMap } from './ShareMap';
import {
  contextParts,
  heroMetricFor,
  heroValueFor,
  knownPlaceName,
  type HeroMetricId,
  type ShareCardFacts,
} from './cardModel';

/** Un template = un id et une fabrique de props ShareCard (la grammaire est commune). */
export interface ShareTemplate {
  id: ShareTemplateId;
  /** Construit les props visuelles de la card (hors ratio/width, gérés à part). */
  build: (d: ShareDemoData, view?: ShareView) => Omit<ShareCardProps, 'ratio' | 'width' | 'style'>;
}

export type ShareTemplateId =
  | 'simple'
  | 'conquete'
  | 'defense'
  | 'boucle'
  | 'crew'
  | 'classement'
  | 'avantApres'
  | 'carte3d';

/**
 * État de RENDU (pas de la donnée) injecté par l'écran /partage dans chaque
 * carte : anime la trace, la rejoue, et fournit le tracé DÉJÀ masqué (privacy).
 */
export interface ShareView {
  animated?: boolean;
  replayKey?: number;
  /** Tracé du run, déjà masqué (départ/arrivée retirés). Vide = tracé inconnu. */
  trace?: readonly LatLngPoint[];
  /**
   * `false` = la course n'a RIEN capturé (social_run) : la zone ne se remplit
   * pas (pas de « secteur pris » mensonger). Défaut (undefined) → capturée.
   */
  captured?: boolean;
  /**
   * `true` = jouer la partition COMPLÈTE du replay (7,5 s, planche E10) plutôt
   * que l'entrée comprimée. Armé par le bouton « Rejouer » de /partage.
   */
  fullReplay?: boolean;
}

/** Données du run VALIDÉ projetées dans les cards (plus aucun scénario de démo). */
export interface ShareDemoData {
  /**
   * DISCIPLINE DE LA SORTIE DÉCRITE (26/07/2026). Sans ce champ, la carte
   * exportée ne pouvait pas savoir ce qu'elle décrivait : elle imprimait
   * « COURSE ENREGISTRÉE » / « COURU POUR {crew} » sous le tracé d'un cycliste,
   * dans un PNG qui SORT de l'app et que le crew lit sans pouvoir le corriger.
   *
   * Il vit ici — dans la DONNÉE de la carte — et non dans `ShareView`, qui ne
   * porte que de l'état de RENDU : la discipline est un fait du run, pas un
   * réglage d'affichage. Les libellés qui la nomment passent tous par
   * `resultCopy(d.activity)`, la même porte unique et exhaustive que le Résultat
   * et /partage : impossible qu'un des trois écrans nomme la sortie autrement.
   */
  activity: Activity;
  playerName: string;
  crewName: string;
  zoneName: string;
  zonesGained: number;
  loopBonusZones: number;
  zonesDefended: number;
  holdHours: number;
  crewPoints: number;
  distanceKm: string;
  paceLabel: string;
  clockLabel: string;
  /** VRAI tracé GPS du run. Vide = inconnu (jamais une ellipse, jamais un emprunt). */
  trace: readonly LatLngPoint[];
  /** GRYD Verified de CE run (serveur seul juge) — plus jamais un `true` en dur. */
  verified: boolean;
  /**
   * Rang atteint (« #8 ») — récit Classement. NULL = pas de classement réel
   * disponible (season_scores vide) → le style Classement est RETIRÉ de la liste
   * plutôt que d'inventer un rang (charte : zéro donnée fabriquée).
   */
  rankLabel: string | null;
  rankZone: string | null;
  rankDelta: string | null;
  /**
   * État de la zone AVANT la course (Avant/Après). NULL = inconnu → ligne masquée.
   *
   * CONFIDENTIALITÉ (contrainte non négociable) : ce champ est un TEXTE LIBRE
   * rendu au-dessus de la carte « avant ». C'est exactement l'endroit où le
   * handle d'un crew rival atterrirait le jour où une source l'alimentera. Il ne
   * doit JAMAIS porter l'identité d'un rival sans consentement explicite — la
   * planche est catégorique et le pipeline actuel ne recueille aucun consentement.
   */
  beforeState: string | null;
}

/**
 * Unité de distance : invariant du catalogue (jamais traduite, cf. l'en-tête de
 * i18n/catalog/result.ts). Elle est passée aux fonctions pures plutôt que
 * codée dedans — un modèle ne décide pas d'un libellé.
 */
const UNIT_KM = 'km';

/**
 * Les replis de nom de zone, dans les CINQ langues. Ce ne sont pas des noms de
 * lieu : ce sont les mots que le Résultat écrit quand il n'en a aucun. Les
 * comparer est la seule façon de ne pas publier « J'AI PRIS ZONE ».
 */
const ZONE_FALLBACKS: readonly string[] = Object.values(C.zoneFallback);

/**
 * Libellé du chiffre héros — un par grandeur AUTORISÉE (jamais une aire).
 *
 * Deux cas ne prennent pas de MOT, et c'est délibéré :
 *   · `distance` porte son UNITÉ (« 4,2 » + « KM ») : la valeur complète
 *     « 4,2 km » composée en 64 pt déborde une story de 232 pt, et §A.9 interdit
 *     un texte coupé. L'unité en libellé dit la même chose en deux caractères ;
 *   · `duration` n'en porte AUCUN : « 26:10 » se lit comme une durée, et cette
 *     valeur occupe déjà toute la ligne. Une chaîne vide n'est pas un texte
 *     manquant — c'est un libellé qui n'ajouterait rien.
 */
function heroLabel(m: HeroMetricId): string {
  switch (m) {
    case 'zones':
      return t(C.zonesStatLabel);
    case 'defended':
      return t(C.heroLabelHeld);
    case 'loop':
      return t(C.heroLabelBonus);
    case 'crew':
      return t(C.heroLabelCrew);
    case 'rank':
      return t(C.heroLabelRank);
    case 'distance':
      return UNIT_KM;
    case 'duration':
      return '';
  }
}

/** Projection vers le modèle PUR (cardModel.ts) — aucune décision ici. */
function factsOf(d: ShareDemoData): ShareCardFacts {
  return {
    zonesGained: d.zonesGained,
    zonesDefended: d.zonesDefended,
    loopBonusZones: d.loopBonusZones,
    crewPoints: d.crewPoints,
    rankLabel: d.rankLabel,
    distanceKm: d.distanceKm,
    clockLabel: d.clockLabel,
    crewName: d.crewName,
  };
}

/** Nom de LIEU réel, ou '' quand le Résultat n'en connaît aucun. */
function placeOf(d: ShareDemoData): string {
  return knownPlaceName(d.zoneName, ZONE_FALLBACKS);
}

/**
 * Les mots de LA DISCIPLINE de cette sortie. Les trois titres qui NOMMENT
 * l'effort (repli « Carte », et les deux variantes « Crew ») ne se lisent QUE
 * d'ici : écrire `C.heroRunLogged` en dur rendrait au cycliste le titre du
 * coureur, dans l'image exportée. Les autres titres (« TERRITOIRE CONQUIS »,
 * « FRONTIÈRE TENUE », « BOUCLE FERMÉE », « JE SUIS {rank} ») restent des `C.*`
 * directs : ils sont déjà vrais dans les deux mondes, et les dupliquer créerait
 * deux vérités à maintenir.
 */
function copyOf(d: ShareDemoData) {
  return resultCopy(d.activity);
}

/** Ce qu'un template a le droit de décider : son titre, sa grandeur, son défi, son visuel. */
interface CardGrammar {
  /** #2 — titre de l'événement, deux lignes display (le \n vient du catalogue). */
  event: string;
  /** #3 — la preuve visuelle. */
  visual: ReactNode;
  /** `true` = le visuel passe en FOND plein cadre au lieu du slot central. */
  fullBleed?: boolean;
  /** #4 — grandeur MISE EN AVANT. Le modèle décide si elle est disponible. */
  hero: HeroMetricId;
  /** #6 — défi, seulement là où un territoire a réellement changé de main/tenu. */
  challenge?: string;
}

/**
 * LA grammaire commune. Tous les modes passent ici : c'est ce qui fait « un
 * système » et non « sept mises en page ».
 *
 * Le chiffre héros n'est JAMAIS une aire (contrainte (a) : aucune source
 * serveur, ±20 % de variation d'un hexagone H3 selon la latitude) — voir
 * cardModel.ts, où l'interdiction est structurelle. Quand rien n'est
 * disponible, on affiche « — » et on DIT que la mesure manque, plutôt qu'un
 * « +0 » géant dans une image publiée.
 */
function shareCard(
  d: ShareDemoData,
  g: CardGrammar,
): Omit<ShareCardProps, 'ratio' | 'width' | 'style'> {
  const f = factsOf(d);
  const metric = heroMetricFor(g.hero, f);
  const value = heroValueFor(metric, f);
  const context = contextParts(f, metric, UNIT_KM).join(' · ');
  const base = {
    heroTitle: g.event,
    stat: value ?? '—',
    statLabel: metric !== null && value !== null ? heroLabel(metric) : t(C.heroMetricUnavailable),
    // Ligne de contexte (#5). Vide → aucun texte, jamais un « · » orphelin.
    title: context === '' ? undefined : context,
    challenge: g.challenge,
    verified: d.verified,
  };
  return g.fullBleed ? { ...base, mapBackground: g.visual } : { ...base, children: g.visual };
}

/**
 * LA CARTE (#3) — la preuve. `fill` : elle prend TOUTE la place que le slot lui
 * laisse, donc sa forme suit le ratio de la card, et son cadrage est recalculé
 * en conséquence (mapFrame.ts). C'est la lecture littérale de la planche : « la
 * carte est recalculée par ratio, le territoire n'est jamais coupé ».
 */
function proofMap(d: ShareDemoData, view?: ShareView): ReactNode {
  return (
    <ShareMap
      fill
      style={styles.mapProof}
      animated={view?.animated}
      replayKey={view?.replayKey}
      trace={view?.trace ?? d.trace ?? []}
      // social_run → captured=false : la zone ne se remplit pas (aucune capture).
      captured={view?.captured}
      fullReplay={view?.fullReplay}
    />
  );
}

/**
 * AVANT / APRÈS — même grammaire, visuel dédoublé : « avant » = zone contestée
 * (tracé rival, non remplie), « après » = zone tenue (chartreuse, remplie).
 * « Strava montre ce que tu as fait. GRYD montre ce que tu as changé. »
 */
function BeforeAfter({
  view,
  beforeState,
}: {
  view?: ShareView;
  beforeState: string | null;
}): ReactNode {
  const tt = useT();
  const trace = view?.trace;
  return (
    <View style={styles.beforeAfter}>
      <View style={styles.baCol}>
        <Text style={styles.baLabel}>{tt(C.beforeLabel)}</Text>
        {/* Zone NON capturée : le tracé apparaît en teinte RIVALE et la zone ne
            se remplit jamais — c'est l'état « avant », pas une conquête. */}
        <ShareMap
          style={styles.baMap}
          accent={gameColors.rival}
          captured={false}
          trace={trace ?? []}
        />
        {/* CONFIDENTIALITÉ : `beforeState` ne doit jamais porter le handle d'un
            rival sans consentement (voir ShareDemoData.beforeState). Null
            aujourd'hui — la ligne n'est simplement pas rendue. */}
        {beforeState ? <Text style={styles.baState}>{beforeState}</Text> : null}
      </View>
      <View style={styles.baCol}>
        <Text style={[styles.baLabel, styles.baLabelAfter]}>{tt(C.afterLabel)}</Text>
        <ShareMap
          style={styles.baMap}
          accent={colors.chartreuse}
          animated={view?.animated}
          replayKey={view?.replayKey}
          trace={trace ?? []}
        />
        <Text style={[styles.baState, styles.baStateAfter]}>{tt(C.heldState)}</Text>
      </View>
    </View>
  );
}

export const SHARE_TEMPLATES: readonly ShareTemplate[] = [
  // 1. CARTE — le repli honnête : son chiffre héros est la DISTANCE MESURÉE,
  //    qui existe dès qu'une sortie existe. Aucun défi : rien n'a changé de main.
  //    C'est le style le plus ATTEIGNABLE (servi dès qu'aucune zone n'a changé de
  //    main, et seul style d'un social_run), donc le plus exposé : son titre suit
  //    la discipline, sinon un cycliste exporte « COURSE ENREGISTRÉE ».
  {
    id: 'simple',
    build: (d, view) =>
      shareCard(d, {
        event: t(copyOf(d).cardHeroLogged),
        hero: 'distance',
        visual: proofMap(d, view),
      }),
  },
  // 2. CONQUÊTE — le récit dominant de la planche. Titre SANS lieu tant qu'aucun
  //    secteur réel n'est câblé : « J'AI PRIS ZONE » se lit comme un nom de lieu.
  {
    id: 'conquete',
    build: (d, view) => {
      const place = placeOf(d);
      return shareCard(d, {
        event: place
          ? t(C.heroTook, { zone: place.toUpperCase() })
          : t(C.heroTookNoPlace),
        hero: 'zones',
        challenge: t(C.challengeTakeIt),
        visual: proofMap(d, view),
      });
    },
  },
  // 3. DÉFENSE — la frontière tenue. Le chiffre héros est le nombre de zones
  //    DÉFENDUES (verdict serveur) et non `holdHours`, qui vaut 0 en dur côté
  //    Résultat (TODO O1) : un « +0 h » géant serait un chiffre inventé.
  {
    id: 'defense',
    build: (d, view) => {
      const place = placeOf(d);
      return shareCard(d, {
        event: place
          ? t(C.heroDefendedPlace, { zone: place.toUpperCase() })
          : t(C.heroDefendedNoPlace),
        hero: 'defended',
        challenge: t(C.challengeHoldTheLine),
        visual: proofMap(d, view),
      });
    },
  },
  // 4. BOUCLE — le geste malin : la boucle fait la zone.
  {
    id: 'boucle',
    build: (d, view) =>
      shareCard(d, {
        event: t(C.heroLoopClosed),
        hero: 'loop',
        visual: proofMap(d, view),
      }),
  },
  // 5. CREW — crew inconnu : le titre ne le nomme pas et la ligne de contexte
  //    l'omet. Ni titre vide, ni identité empruntée.
  {
    id: 'crew',
    build: (d, view) => {
      const A = copyOf(d);
      return shareCard(d, {
        event: d.crewName
          ? t(A.cardHeroForCrewNamed, { crew: d.crewName.toUpperCase() })
          : t(A.cardHeroForCrewNoName),
        hero: 'crew',
        visual: proofMap(d, view),
      });
    },
  },
  // 6. CLASSEMENT — moteur viral de base (jamais bloqué premium). Le rang vient
  //    du serveur ; sans rang, ce style n'est même pas proposé par /partage.
  {
    id: 'classement',
    build: (d, view) =>
      shareCard(d, {
        // Sans rang serveur, ce style retombe sur le MÊME repli que « Carte » —
        // donc sur le même titre discipliné (le rang, lui, est neutre).
        event: d.rankLabel
          ? t(C.heroRankLine, { rank: d.rankLabel })
          : t(copyOf(d).cardHeroLogged),
        hero: 'rank',
        visual: proofMap(d, view),
      }),
  },
  // 7. AVANT / APRÈS — ce que tu as CHANGÉ : zone contestée → zone tenue.
  {
    id: 'avantApres',
    build: (d, view) => {
      const place = placeOf(d);
      return shareCard(d, {
        event: place
          ? t(C.heroRetookPlace, { zone: place.toUpperCase() })
          : t(C.heroRetookNoPlace),
        hero: 'zones',
        challenge: t(C.challengeTakeIt),
        visual: <BeforeAfter view={view} beforeState={d.beforeState} />,
      });
    },
  },
  // 8. PLEIN CADRE — MÊME grammaire, la carte passe simplement en FOND : le
  //    territoire occupe tout le cadre et le texte se pose dessus.
  //
  //    ─── UN CONTRÔLE MAL ÉTIQUETÉ, CORRIGÉ (25/07/2026) ────────────────────
  //    Ce style s'appelait « Carte 3D ». `ShareMap3D` montait une géométrie de
  //    DÉMO FIGÉE (République) : elle n'acceptait aucun tracé, donc elle
  //    dessinait TOUJOURS la même conquête. Elle a été supprimée le 21/07, mais
  //    le LIBELLÉ est resté : l'utilisateur choisissait « Carte 3D » et
  //    exportait une carte SVG 2D. Un contrôle mal étiqueté ment autant qu'un
  //    bouton mort. Le libellé (i18n `styleMap3d`) dit désormais ce que ce style
  //    fait vraiment — la carte en plein cadre.
  {
    id: 'carte3d',
    build: (d, view) => {
      const place = placeOf(d);
      return shareCard(d, {
        event: place
          ? t(C.heroTook, { zone: place.toUpperCase() })
          : t(C.heroTookNoPlace),
        hero: 'zones',
        challenge: t(C.challengeTakeIt),
        fullBleed: true,
        visual: (
          <ShareMap
            fill
            style={styles.mapFullBleed}
            animated={view?.animated}
            replayKey={view?.replayKey}
            trace={view?.trace ?? d.trace ?? []}
            captured={view?.captured}
            fullReplay={view?.fullReplay}
          />
        ),
      });
    },
  },
];

/** Accès direct par id (fallback typé sûr — pas d'index possiblement undefined). */
export const SHARE_TEMPLATES_BY_ID: Record<ShareTemplateId, ShareTemplate> = {
  simple: SHARE_TEMPLATES[0]!,
  conquete: SHARE_TEMPLATES[1]!,
  defense: SHARE_TEMPLATES[2]!,
  boucle: SHARE_TEMPLATES[3]!,
  crew: SHARE_TEMPLATES[4]!,
  classement: SHARE_TEMPLATES[5]!,
  avantApres: SHARE_TEMPLATES[6]!,
  carte3d: SHARE_TEMPLATES[7]!,
};

const styles = StyleSheet.create({
  // La preuve occupe TOUT le slot central : sa forme suit le ratio de la card,
  // et ShareMap recalcule son cadrage sur la forme mesurée (mapFrame.ts).
  mapProof: { alignSelf: 'stretch' },
  // Plein cadre : la carte remplit le calque de fond de la ShareCard.
  mapFullBleed: { flex: 1 },
  // Avant/Après : deux colonnes égales, séparées par l'espace (pas de card-dans-card).
  beforeAfter: { flexDirection: 'row', gap: 12, alignItems: 'center', alignSelf: 'stretch' },
  baCol: { flex: 1, alignItems: 'center', gap: 6 },
  baMap: { width: '100%', maxWidth: 120, maxHeight: 120 },
  baLabel: { color: colors.gris, fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  baLabelAfter: { color: colors.chartreuse },
  baState: { color: gameColors.rival, fontSize: 12, fontWeight: '600' },
  baStateAfter: { color: colors.blanc },
});
