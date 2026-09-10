/**
 * GRYD — LE GUIDE « Comment ça marche », chapitre par chapitre.
 *
 * ─── CE QUE CE MODULE EST ───────────────────────────────────────────────────
 * Le CONTENU du guide, sous forme de données pures : huit chapitres, leur
 * ordre, leur schéma, leurs phrases et leurs chiffres. Aucun import React
 * Native : les tests Deno lisent exactement ce que l'écran affiche, et l'écran
 * n'a plus qu'à peindre.
 *
 * ─── LES TROIS RÈGLES D'ÉCRITURE, ET POURQUOI ───────────────────────────────
 *  1. AUCUN CHIFFRE ÉCRIT À LA MAIN. Tout passe par `helpFacts2026`, qui lit
 *     `packages/shared/src/game-rules.ts`. Une règle de jeu recopiée dans une
 *     phrase est une promesse qui survit au code (ADR-003).
 *  2. PHRASES COURTES, TUTOIEMENT, NIVEAU COLLÈGE. Le guide doit se lire à
 *     quinze ans comme à soixante. Pas de tiret long, pas de subordonnée qui
 *     traverse trois lignes.
 *  3. RIEN QUE LE CAHIER DE SEPTEMBRE. Chaque phrase se rattache à
 *     `docs/product/GRYD_REFONTE_INTEGRALE_2026_09.md` (§5 boucle et terrain,
 *     §6 crew et saison, §7 XP, §13 communauté). Aucune mécanique inventée.
 */
import type { GrydIconName } from '../../ui/gryd/glyphs';
import { helpFacts2026, say } from './helpFacts2026';

/**
 * L'ordre est le parcours : on part du geste (courir), on finit par les
 * questions. Les identifiants sont FRANÇAIS parce qu'ils sont publics : ils
 * voyagent dans l'URL (`/comment-ca-marche?chapitre=terrain`) et dans les liens
 * partagés entre joueurs.
 */
export const HELP_CHAPTER_IDS = ['bouger', 'boucle', 'terrain', 'points', 'crew', 'saison', 'fair-play', 'faq'] as const;
export type HelpChapterId = (typeof HELP_CHAPTER_IDS)[number];

/** Le schéma affiché en tête de chapitre. `loop` est l'exemple INTERACTIF. */
export type HelpArtKind = 'trace' | 'loop' | 'closure' | 'territory' | 'points' | 'crew' | 'season' | 'fairplay' | 'questions';

export interface HelpFactLine {
  readonly label: string;
  readonly value: string;
  readonly icon: GrydIconName;
}

export interface HelpChapter {
  readonly id: HelpChapterId;
  /** « 01 » … « 08 » — dérivé du rang, jamais tapé. */
  readonly step: string;
  /** Libellé court du sélecteur de chapitre. */
  readonly chip: string;
  readonly icon: GrydIconName;
  readonly title: string;
  /** Deux à quatre phrases. Au-delà, ce n'est plus un guide, c'est une notice. */
  readonly lines: readonly string[];
  readonly art: HelpArtKind;
  /** Ce que le schéma raconte, pour qui ne le voit pas (L15). */
  readonly artLabel: string;
  /** Un second schéma, quand le premier est interactif. */
  readonly secondaryArt?: HelpArtKind;
  readonly secondaryArtLabel?: string;
  readonly facts: readonly HelpFactLine[];
  /** La précision qui évite un malentendu. Une seule, jamais un paragraphe. */
  readonly note?: string;
}

/** Rang → « 01 ». Mise en forme, pas une règle. */
function step(index: number): string {
  return String(index + 1).padStart(2, '0');
}

/**
 * Le chapitre demandé par l'URL. Une valeur inconnue ouvre le premier chapitre :
 * un lien périmé ne doit jamais rendre un écran vide.
 */
export function resolveHelpChapter(raw: string | readonly string[] | undefined | null): HelpChapterId {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const found = HELP_CHAPTER_IDS.find((id) => id === value);
  return found ?? HELP_CHAPTER_IDS[0];
}

/** Où l'on en est, et où l'on peut aller. `ratio` alimente la barre chartreuse. */
export function helpChapterProgress(id: HelpChapterId) {
  const index = HELP_CHAPTER_IDS.indexOf(id);
  const count = HELP_CHAPTER_IDS.length;
  return {
    index,
    count,
    ratio: (index + 1) / count,
    previous: index > 0 ? HELP_CHAPTER_IDS[index - 1] ?? null : null,
    next: HELP_CHAPTER_IDS[index + 1] ?? null,
  };
}

/** Les huit chapitres, dans l'ordre, prêts à peindre. */
export function helpChapters2026(fr: boolean): readonly HelpChapter[] {
  const f = helpFacts2026(fr);
  const chapters: readonly Omit<HelpChapter, 'step'>[] = fr ? [
    {
      id: 'bouger', icon: 'run', chip: 'Bouger', title: 'Tu cours ou tu roules',
      lines: [
        'Choisis ton sport : course à pied ou vélo. Puis appuie sur GO.',
        'Le GPS suit ton trajet pendant toute la sortie. Ce trajet, c’est ta trace.',
        'À la fin, ta trace rejoint ton journal avec sa distance et sa durée.',
      ],
      art: 'trace',
      artLabel: 'Schéma : une trace GPS se dessine sur un plan de rues, du point de départ jusqu’au point où tu te trouves.',
      facts: [],
      note: 'Une sortie sans boucle compte quand même. Tu ne perds rien.',
    },
    {
      id: 'boucle', icon: 'loop', chip: 'La boucle', title: 'Tu fermes une boucle',
      lines: [
        'Fermer une boucle, c’est revenir près d’un endroit où tu es déjà passé.',
        'Pas besoin de viser juste : une tolérance existe, parce que le GPS bouge un peu.',
        'La boucle doit aussi être assez longue. Sinon, tourner autour d’un rond-point suffirait.',
        'Touche le dessin de l’exemple pour fermer la boucle.',
      ],
      art: 'loop',
      artLabel: 'Exemple interactif : une trace presque fermée que tu peux refermer d’un toucher.',
      secondaryArt: 'closure',
      secondaryArtLabel: 'Schéma : les deux bouts d’une boucle et le cercle de tolérance qui les relie.',
      facts: [
        { label: 'Écart de fermeture, à pied', value: say(f.closureGapRun), icon: 'run' },
        { label: 'Écart de fermeture, à vélo', value: say(f.closureGapBike), icon: 'bike' },
        { label: 'Longueur minimale, à pied', value: say(f.minLoopRun), icon: 'route' },
        { label: 'Longueur minimale, à vélo', value: say(f.minLoopBike), icon: 'route' },
        { label: 'Précision GPS attendue aux deux bouts', value: say(f.endpointAccuracy), icon: 'location' },
      ],
      note: 'Une pause ou un trou de signal ne sont jamais rebouchés par une ligne inventée.',
    },
    {
      id: 'terrain', icon: 'map', chip: 'Le terrain', title: 'La boucle devient ton terrain',
      lines: [
        'L’intérieur de ta boucle devient ton terrain sur la carte de ce sport.',
        'Tu gagnes seulement la part que tu n’avais pas déjà. Deux boucles au même endroit ne comptent pas double.',
        'Une boucle plus récente peut reprendre ce terrain. Ta sortie, elle, reste dans ton journal.',
        'Course et vélo ont deux cartes séparées.',
      ],
      art: 'territory',
      artLabel: 'Schéma : la surface d’une boucle remplie en chartreuse, la part déjà possédée en hachures, et la limite de commune en pointillés.',
      facts: [
        { label: 'Surface minimale, à pied', value: say(f.minAreaRun), icon: 'run' },
        { label: 'Surface minimale, à vélo', value: say(f.minAreaBike), icon: 'bike' },
        { label: 'Publication après la fin de la sortie', value: say(f.publicationDelay), icon: 'clock' },
        { label: 'Délai pour envoyer une sortie', value: say(f.receiptMaxAge), icon: 'clock' },
      ],
      note: 'Une boucle qui montrerait une zone protégée reste privée. Elle ne change alors rien sur la carte publique.',
    },
    {
      id: 'points', icon: 'chart', chip: 'Les points', title: 'Les points',
      lines: [
        'Deux choses avancent en même temps, et elles ne se mélangent pas.',
        'Le terrain se mesure en surface. Il change de mains quand quelqu’un repasse.',
        'Les XP mesurent ta régularité. Ils ne baissent jamais, même si tu te reposes.',
        'Le classement de ta commune regarde le terrain nouveau de la semaine, pas le terrain gardé.',
      ],
      art: 'points',
      artLabel: 'Schéma : une semaine de sept jours, dont les journées qui rapportent des XP sont marquées.',
      facts: [
        { label: 'Mouvement pour valider une journée', value: say(f.dailyMovement), icon: 'clock' },
        { label: 'Une journée validée vaut', value: say(f.xpPerDay), icon: 'chart' },
        { label: 'Journées qui rapportent par semaine', value: say(f.creditedDaysPerWeek), icon: 'calendar' },
        { label: 'Sans ce nombre de joueurs, pas de classement', value: say(f.rankedMinimum), icon: 'crew' },
      ],
      note: 'Aucun achat n’augmente le terrain, les XP ou les points de défi.',
    },
    {
      id: 'crew', icon: 'crew', chip: 'Le crew', title: 'Le crew',
      lines: [
        'Un crew, c’est un petit groupe : des amis, un club, un quartier.',
        'Tu peux en rejoindre un, en créer un, ou jouer seul. Rien n’est obligatoire.',
        'Chacun a un rôle : membre, organisateur, modérateur ou capitaine.',
        'Un défi oppose deux équipes sur des secteurs annoncés à l’avance.',
      ],
      art: 'crew',
      artLabel: 'Schéma : trois secteurs, et deux équipes qui y déposent leurs journées.',
      facts: [
        { label: 'Joueurs par équipe', value: say(f.teamSize), icon: 'crew' },
        { label: 'Équipes par défi', value: say(f.teamCount), icon: 'versus' },
        { label: 'Durée d’un défi', value: say(f.challengeDays), icon: 'calendar' },
        { label: 'Secteurs en jeu', value: say(f.sectorCount), icon: 'map' },
        { label: 'Journées qui comptent, par joueur', value: say(f.contributiveDays), icon: 'calendar' },
        { label: 'Maximum par joueur', value: say(f.maxPointsPerPlayer), icon: 'profile' },
        { label: 'Maximum par équipe', value: say(f.maxPointsPerTeam), icon: 'trophy' },
      ],
      note: 'Courir plus vite ou plus loin ne rapporte rien de plus dans un défi.',
    },
    {
      id: 'saison', icon: 'calendar', chip: 'La saison', title: 'La saison',
      lines: [
        'Une saison est un thème commun et une série de récompenses.',
        'Elle ne détruit rien. Tes XP, tes sorties et tes objets restent à toi.',
        'Les paliers avancent avec les mêmes journées actives que ton niveau.',
        'L’état de la saison en cours s’affiche plus bas. S’il n’y en a aucune, l’app le dit.',
      ],
      art: 'season',
      artLabel: 'Schéma : les paliers d’une saison alignés sur un rail, du premier au dernier.',
      facts: [
        { label: 'Durée d’une saison', value: say(f.seasonWeeks), icon: 'calendar' },
        { label: 'Paliers de collection', value: say(f.seasonTiers), icon: 'collection' },
        { label: 'Par palier', value: say(f.seasonXpPerTier), icon: 'chart' },
      ],
      note: 'Aucune date n’est inventée ici. Le bloc ci-dessous lit la saison réelle du serveur.',
    },
    {
      id: 'fair-play', icon: 'shield', chip: 'Fair-play', title: 'Fair-play et sécurité',
      lines: [
        'C’est le serveur qui décide d’une capture, jamais ton téléphone.',
        'Une trace impossible est refusée : un saut brutal, une horloge fausse, un signal trop flou.',
        'Un refus n’efface jamais ta sortie. Distance, durée et souvenir restent.',
        'Sur la route, la sécurité passe avant le jeu. Regarde devant toi, pas ton écran.',
      ],
      art: 'fairplay',
      artLabel: 'Schéma : un bouclier de vérification, et un saut impossible dans une trace, marqué comme refusé.',
      facts: [
        { label: 'Écart d’horloge toléré', value: say(f.clockTolerance), icon: 'clock' },
        { label: 'Fenêtre d’envoi après un défi', value: say(f.finalSyncWindow), icon: 'clock' },
      ],
      note: 'Aucune vitesse seule ne condamne une sortie. Un cycliste rapide en descente reste un cycliste.',
    },
    {
      id: 'faq', icon: 'faq', chip: 'Questions', title: 'Questions fréquentes',
      lines: [
        'Les réponses courtes, rangées par thème.',
        'Touche une question pour ouvrir sa réponse.',
      ],
      art: 'questions',
      artLabel: 'Schéma : une bulle de question posée sur une pile de réponses.',
      facts: [],
    },
  ] : [
    {
      id: 'bouger', icon: 'run', chip: 'Move', title: 'You run or you ride',
      lines: [
        'Pick your sport: running or cycling. Then tap GO.',
        'GPS follows your route for the whole outing. That route is your trace.',
        'At the end, your trace joins your journal with its distance and time.',
      ],
      art: 'trace',
      artLabel: 'Diagram: a GPS trace drawing itself over a street grid, from the start to where you are now.',
      facts: [],
      note: 'An outing without a loop still counts. You lose nothing.',
    },
    {
      id: 'boucle', icon: 'loop', chip: 'The loop', title: 'You close a loop',
      lines: [
        'Closing a loop means coming back near a spot you already passed.',
        'You do not have to be exact: there is a tolerance, because GPS drifts a little.',
        'The loop must also be long enough. Otherwise circling a roundabout would do.',
        'Tap the example drawing to close the loop.',
      ],
      art: 'loop',
      artLabel: 'Interactive example: an almost closed trace you can close with one tap.',
      secondaryArt: 'closure',
      secondaryArtLabel: 'Diagram: the two ends of a loop and the tolerance circle that joins them.',
      facts: [
        { label: 'Closing gap, running', value: say(f.closureGapRun), icon: 'run' },
        { label: 'Closing gap, cycling', value: say(f.closureGapBike), icon: 'bike' },
        { label: 'Minimum length, running', value: say(f.minLoopRun), icon: 'route' },
        { label: 'Minimum length, cycling', value: say(f.minLoopBike), icon: 'route' },
        { label: 'GPS accuracy expected at both ends', value: say(f.endpointAccuracy), icon: 'location' },
      ],
      note: 'A pause or a signal gap is never patched with an invented line.',
    },
    {
      id: 'terrain', icon: 'map', chip: 'The terrain', title: 'The loop becomes your terrain',
      lines: [
        'The inside of your loop becomes your terrain on that sport’s map.',
        'You only gain the part you did not already hold. Two loops in the same place do not count twice.',
        'A newer loop can take that terrain back. Your outing still stays in your journal.',
        'Running and cycling have two separate maps.',
      ],
      art: 'territory',
      artLabel: 'Diagram: the area of a loop filled in chartreuse, the part already owned shown in hatching, and the town boundary as a dashed line.',
      facts: [
        { label: 'Minimum area, running', value: say(f.minAreaRun), icon: 'run' },
        { label: 'Minimum area, cycling', value: say(f.minAreaBike), icon: 'bike' },
        { label: 'Published after the outing ends', value: say(f.publicationDelay), icon: 'clock' },
        { label: 'Time allowed to send an outing', value: say(f.receiptMaxAge), icon: 'clock' },
      ],
      note: 'A loop that would reveal a protected area stays private. It then changes nothing on the public map.',
    },
    {
      id: 'points', icon: 'chart', chip: 'Points', title: 'Points',
      lines: [
        'Two things move forward at once, and they never mix.',
        'Terrain is measured as an area. It changes hands when someone runs it again.',
        'XP measures how regular you are. It never goes down, even when you rest.',
        'Your town ranking looks at new terrain from this week, not at terrain you keep.',
      ],
      art: 'points',
      artLabel: 'Diagram: a week of seven days, with the days that earn XP marked.',
      facts: [
        { label: 'Movement needed to validate a day', value: say(f.dailyMovement), icon: 'clock' },
        { label: 'One validated day is worth', value: say(f.xpPerDay), icon: 'chart' },
        { label: 'Days that earn XP each week', value: say(f.creditedDaysPerWeek), icon: 'calendar' },
        { label: 'Below this many players, no ranking', value: say(f.rankedMinimum), icon: 'crew' },
      ],
      note: 'No purchase increases terrain, XP or challenge points.',
    },
    {
      id: 'crew', icon: 'crew', chip: 'The crew', title: 'The crew',
      lines: [
        'A crew is a small group: friends, a club, a neighbourhood.',
        'You can join one, create one, or play alone. Nothing is required.',
        'Everyone has a role: member, organiser, moderator or captain.',
        'A challenge puts two teams against each other on sectors announced in advance.',
      ],
      art: 'crew',
      artLabel: 'Diagram: three sectors, and two teams placing their days on them.',
      facts: [
        { label: 'Players per team', value: say(f.teamSize), icon: 'crew' },
        { label: 'Teams per challenge', value: say(f.teamCount), icon: 'versus' },
        { label: 'Challenge length', value: say(f.challengeDays), icon: 'calendar' },
        { label: 'Sectors in play', value: say(f.sectorCount), icon: 'map' },
        { label: 'Days that count, per player', value: say(f.contributiveDays), icon: 'calendar' },
        { label: 'Maximum per player', value: say(f.maxPointsPerPlayer), icon: 'profile' },
        { label: 'Maximum per team', value: say(f.maxPointsPerTeam), icon: 'trophy' },
      ],
      note: 'Running faster or further earns nothing extra in a challenge.',
    },
    {
      id: 'saison', icon: 'calendar', chip: 'The season', title: 'The season',
      lines: [
        'A season is a shared theme and a run of rewards.',
        'It destroys nothing. Your XP, your outings and your items stay yours.',
        'Tiers move with the same active days as your level.',
        'The current season is shown below. If there is none, the app says so.',
      ],
      art: 'season',
      artLabel: 'Diagram: the tiers of a season lined up on a rail, from first to last.',
      facts: [
        { label: 'Season length', value: say(f.seasonWeeks), icon: 'calendar' },
        { label: 'Collection tiers', value: say(f.seasonTiers), icon: 'collection' },
        { label: 'Per tier', value: say(f.seasonXpPerTier), icon: 'chart' },
      ],
      note: 'No date is invented here. The block below reads the real season from the server.',
    },
    {
      id: 'fair-play', icon: 'shield', chip: 'Fair play', title: 'Fair play and safety',
      lines: [
        'The server decides a capture, never your phone.',
        'An impossible trace is refused: a sudden jump, a wrong clock, a signal too blurry.',
        'A refusal never erases your outing. Distance, time and memory stay.',
        'On the road, safety comes before the game. Look ahead, not at your screen.',
      ],
      art: 'fairplay',
      artLabel: 'Diagram: a verification shield, and an impossible jump in a trace, marked as refused.',
      facts: [
        { label: 'Clock drift allowed', value: say(f.clockTolerance), icon: 'clock' },
        { label: 'Upload window after a challenge', value: say(f.finalSyncWindow), icon: 'clock' },
      ],
      note: 'No speed alone condemns an outing. A fast cyclist on a descent is still a cyclist.',
    },
    {
      id: 'faq', icon: 'faq', chip: 'Questions', title: 'Frequently asked questions',
      lines: [
        'Short answers, sorted by topic.',
        'Tap a question to open its answer.',
      ],
      art: 'questions',
      artLabel: 'Diagram: a question bubble resting on a stack of answers.',
      facts: [],
    },
  ];
  return chapters.map((chapter, index) => ({ ...chapter, step: step(index) }));
}
