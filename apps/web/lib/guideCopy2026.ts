/**
 * GRYD — LA COPIE DE « COMMENT ÇA MARCHE » (lot W3).
 *
 * Chaque phrase vient MOT POUR MOT de `docs/product/GRYD_SITE_CONTENU_2026_09.md`
 * §3.2. La page ne compose que la mise en forme : rien ne s'écrit dans le JSX,
 * donc rien ne peut y être réécrit sans passer par ce fichier, que
 * `siteCopy2026.test.ts` relit à chaque `npm run gate`.
 *
 * ─── LES ANCRES SONT CELLES DE L'APPLICATION ────────────────────────────────
 * `#bouger`, `#boucle`, `#terrain`, `#points`, `#crew`, `#saison`, `#fair-play`
 * sont les identifiants de `HELP_CHAPTER_IDS`
 * (`apps/mobile/src/features/help/helpChapters2026.ts`). Ils sont en français
 * PARCE QU'ILS SONT PUBLICS, et ils sont les MÊMES des deux côtés : une adresse
 * partagée depuis le guide de l'app doit tomber sur le bon chapitre du site.
 * `apps/web` ne peut pas importer `apps/mobile` (deux React, deux bundlers) ; le
 * test relit donc le fichier de l'app sur le disque et refuse toute dérive.
 *
 * Le huitième identifiant de l'app (`faq`) n'est pas un chapitre ici : le site
 * lui donne une page entière, `/faq/`, vers laquelle ce guide renvoie.
 *
 * ─── AUCUN CHIFFRE N'EST TAPÉ ───────────────────────────────────────────────
 * Tous viennent de `facts2026.ts`, donc de `packages/shared/src/game-rules.ts`.
 * Chaque chiffre affiché porte le nom de sa constante (`rule`), que `Stat` pose
 * en `data-rule` dans le DOM.
 */
import { SITE_FACTS, type SiteStat, stat } from './facts2026';

/**
 * Les planches disponibles. Écrites ICI et pas importées de
 * `components/ui/Diagram` : ce module est lu par DENO (`npm run test:web`), et
 * importer un composant y tirerait ses `*.module.css`, que Deno ne sait pas
 * résoudre. La sécurité de type ne se perd pas pour autant — la page passe cette
 * valeur à `<Diagram kind={…} />`, donc `tsc` refuse toute planche inexistante.
 */
export type GuideDiagram = 'trace' | 'closure' | 'territory';

export interface GuideChapter {
  /** L'ancre publique, sans dièse. Identique à `HELP_CHAPTER_IDS` de l'app. */
  readonly id: string;
  /** Le numéro affiché, « 01 » à « 07 ». */
  readonly index: string;
  readonly title: string;
  readonly body: string;
  /**
   * La planche du chapitre. Ce sont EXACTEMENT les trois dessins du guide de
   * l'application (`helpArt2026.ts`, mêmes coordonnées) : `trace` pour
   * « bouger », `closure` pour « boucle » (l'app l'appelle `loop`), `territory`
   * pour « terrain ». Les quatre chapitres suivants n'en ont pas sur le web :
   * le système de design n'en porte que trois, et en inventer une quatrième
   * serait dessiner un écran que personne n'a recetté.
   */
  readonly diagram?: GuideDiagram;
  /** Les faits du chapitre, chacun avec la constante dont il sort. */
  readonly facts?: readonly SiteStat[];
  /** La note de bas de chapitre : ce que le chapitre refuse de laisser croire. */
  readonly note?: string;
  /** Un renvoi, quand le chapitre en appelle un. */
  readonly cta?: { readonly label: string; readonly href: string };
}

export const GUIDE_COPY = {
  seo: {
    title: 'Comment marche Gryd : la boucle et le terrain',
    description:
      'Le guide complet : la boucle, le terrain, les XP, le crew, la saison et le fair-play. Les mêmes chiffres que dans l’application, lus à la source.',
  },

  hero: {
    title: 'Comment ça marche',
    lead: 'Sept chapitres, dans l’ordre. Les chiffres sont ceux que l’application applique vraiment.',
  },

  /** Le sommaire interne : sept ancres, pas un fil d'Ariane (le plan du site est PLAT). */
  tocLabel: 'Sommaire',

  chapters: [
    {
      id: 'bouger',
      index: '01',
      title: 'Tu cours ou tu roules',
      diagram: 'trace',
      body: 'Choisis ton sport : course à pied ou vélo. Puis appuie sur GO. Le GPS suit ton trajet pendant toute la sortie. Ce trajet, c’est ta trace. À la fin, ta trace rejoint ton journal avec sa distance et sa durée.',
      note: 'Une sortie sans boucle compte quand même. Tu ne perds rien.',
    },
    {
      id: 'boucle',
      index: '02',
      title: 'Tu fermes une boucle',
      diagram: 'closure',
      body: 'Fermer une boucle, c’est revenir près d’un endroit où tu es déjà passé. Pas besoin de viser juste : une tolérance existe, parce que le GPS bouge un peu. La boucle doit aussi être assez longue. Sinon, tourner autour d’un rond-point suffirait.',
      facts: [
        stat(SITE_FACTS.closureRun, 'd’écart de fermeture, à pied'),
        stat(SITE_FACTS.closureBike, 'd’écart de fermeture, à vélo'),
        stat(SITE_FACTS.minLoopRun, 'de longueur minimale, à pied'),
        stat(SITE_FACTS.minLoopBike, 'de longueur minimale, à vélo'),
        stat(SITE_FACTS.endpointAccuracy, 'de précision GPS attendue aux deux bouts'),
      ],
      note: 'Une pause ou un trou de signal ne sont jamais rebouchés par une ligne inventée.',
    },
    {
      id: 'terrain',
      index: '03',
      title: 'La boucle devient ton terrain',
      diagram: 'territory',
      body: 'L’intérieur de ta boucle devient ton terrain sur la carte de ce sport. Tu gagnes seulement la part que tu n’avais pas déjà : deux boucles au même endroit ne comptent pas double. Une boucle plus récente peut reprendre ce terrain ; ta sortie, elle, reste dans ton journal. Course et vélo ont deux cartes séparées.',
      facts: [
        stat(SITE_FACTS.minAreaRun, 'de surface minimale, à pied'),
        stat(SITE_FACTS.minAreaBike, 'de surface minimale, à vélo'),
        stat(SITE_FACTS.publicationDelay, 'de publication après la fin de la sortie'),
        stat(SITE_FACTS.receiptMaxAge, 'pour envoyer une sortie'),
      ],
      note: 'Une boucle qui montrerait une zone protégée reste privée. Elle ne change alors rien sur la carte publique.',
    },
    {
      id: 'points',
      index: '04',
      title: 'Les points',
      body: 'Deux choses avancent en même temps, et elles ne se mélangent pas. Le terrain se mesure en surface : il change de mains quand quelqu’un repasse. Les XP mesurent ta régularité : ils ne baissent jamais, même si tu te reposes. Le classement de ta commune regarde le terrain nouveau de la semaine, pas le terrain gardé.',
      facts: [
        stat(SITE_FACTS.dailyMovement, 'de mouvement pour valider une journée'),
        stat(SITE_FACTS.xpPerDay, 'pour une journée validée'),
        stat(SITE_FACTS.creditedDaysPerWeek, 'journées rapportent par semaine'),
        stat(SITE_FACTS.rankedMinimum, 'classés au moins, sinon pas de classement'),
      ],
      note: 'Aucun achat n’augmente le terrain, les XP ou les points de défi.',
    },
    {
      id: 'crew',
      index: '05',
      title: 'Le crew',
      body: 'Un crew, c’est un petit groupe : des amis, un club, un quartier. Tu peux en rejoindre un, en créer un, ou jouer seul. Rien n’est obligatoire. Chacun a un rôle : membre, organisateur, modérateur ou capitaine. Un défi oppose deux équipes sur des secteurs annoncés à l’avance.',
      facts: [
        stat(SITE_FACTS.teamSize, 'par équipe'),
        stat(SITE_FACTS.teamCount, 'équipes par défi'),
        stat(SITE_FACTS.challengeDays, 'de défi'),
        stat(SITE_FACTS.sectorCount, 'secteurs'),
        stat(SITE_FACTS.contributiveDays, 'journées comptées par joueur'),
        stat(SITE_FACTS.maxPointsPerPlayer, 'au plus par joueur'),
        stat(SITE_FACTS.maxPointsPerTeam, 'par équipe au plus'),
      ],
      note: 'Courir plus vite ou plus loin ne rapporte rien de plus dans un défi.',
    },
    {
      id: 'saison',
      index: '06',
      title: 'La saison',
      body: 'Une saison est un thème commun et une série de récompenses. Elle ne détruit rien : tes XP, tes sorties et tes objets restent à toi. Les paliers avancent avec les mêmes journées actives que ton niveau.',
      facts: [
        stat(SITE_FACTS.seasonWeeks, 'de saison'),
        stat(SITE_FACTS.seasonTiers, 'paliers de collection'),
        stat(SITE_FACTS.seasonXpPerTier, 'par palier'),
      ],
      cta: { label: 'La Saison 0', href: '/saison/' },
    },
    {
      id: 'fair-play',
      index: '07',
      title: 'Fair-play et sécurité',
      body: 'C’est le serveur qui décide d’une capture, jamais ton téléphone. Une trace impossible est refusée : un saut brutal, une horloge fausse, un signal trop flou. Un refus n’efface jamais ta sortie : distance, durée et souvenir restent. Sur la route, la sécurité passe avant le jeu. Regarde devant toi, pas ton écran.',
      facts: [
        stat(SITE_FACTS.clockTolerance, 'd’écart d’horloge toléré'),
        stat(SITE_FACTS.finalSyncWindow, 'de fenêtre d’envoi après un défi'),
      ],
      note: 'Aucune vitesse seule ne condamne une sortie. Un cycliste rapide en descente reste un cycliste.',
    },
  ] as readonly GuideChapter[],

  faqCta: { label: 'Les questions fréquentes', href: '/faq/' },
} as const;

/** Les sept ancres, dans l'ordre. Le test les confronte à celles de l'application. */
export function guideChapterIds(): string[] {
  return GUIDE_COPY.chapters.map((chapter) => chapter.id);
}
