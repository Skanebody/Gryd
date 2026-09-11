/**
 * GRYD — LA COPIE DES CREWS (lot W3).
 *
 * MOT POUR MOT `docs/product/GRYD_SITE_CONTENU_2026_09.md` §3.3.
 *
 * ⚠️ CE QUE CETTE PAGE NE DIT PAS, ET C'EST UNE RÈGLE : aucun nombre de crews,
 * aucun nom de crew, aucun classement de crew. Aucun crew réel n'existe en base
 * à ce jour (3 comptes, 0 donnée de jeu au 12/09/2026) ; un exemple « pour
 * illustrer » serait exactement la donnée factice que la constitution interdit.
 */
import { SITE_COUNTS, SITE_FACTS, type SiteStat, stat } from './facts2026';

export interface CrewsSection {
  readonly id: string;
  readonly kicker: string;
  readonly title: string;
  readonly body: string;
  readonly facts?: readonly SiteStat[];
}

export const CREWS_COPY = {
  seo: {
    title: 'Les crews Gryd : courir à plusieurs pour de vrai',
    description:
      'Rejoins un crew par QR ou par code, crée le tien, organise des sorties et lance un défi de 7 jours à 5 contre 5. Aucun kilométrage imposé.',
  },

  hero: {
    title: 'Un crew, c’est un petit groupe qui court vraiment ensemble',
    lead: 'Des amis, un club, un quartier. Tu peux en rejoindre un, en créer un, ou jouer seul. Rien n’est obligatoire, et aucun crew ne te demande un kilométrage pour exister.',
  },

  sections: [
    {
      id: 'rejoindre',
      kicker: 'Entrer',
      title: 'Rejoindre',
      body: 'Trois chemins, tous en un geste : tu scannes le QR d’un membre, tu entres son code, ou tu ouvres son lien. Avant de rejoindre, tu vois le nom du crew, sa ville, ses conditions d’entrée et sa charte. Si une condition n’est pas remplie, Gryd te dit laquelle et combien il te manque.',
    },
    {
      id: 'creer',
      kicker: 'Fonder',
      title: 'Créer',
      body: 'Un nom, un blason parmi douze emblèmes, une ville, et tu choisis si l’entrée est libre ou sur candidature. Tu es capitaine de ce que tu crées.',
    },
    {
      id: 'gerer',
      kicker: 'Tenir',
      title: 'Gérer',
      body: 'Le tableau de bord montre qui est actif, qui ne l’est plus, qui a candidaté. Tu peux avertir, exclure avec un motif, inviter par pseudo, poser une charte que chacun accepte en entrant, et tenir un journal des décisions. Quatre rôles : membre, organisateur, modérateur, capitaine. Dissoudre un crew se fait en deux temps, et se refuse pendant un défi.',
    },
    {
      id: 'se-retrouver',
      kicker: 'Ensemble',
      title: 'Se retrouver',
      body: 'Un rendez-vous se pose avec son point de départ, son heure et son allure. Les membres s’inscrivent. Une conversation de crew existe, avec trois réactions. Le journal du crew garde les arrivées et les sorties.',
    },
    {
      id: 'defi',
      kicker: 'Se mesurer',
      title: 'Le défi',
      body: `Un défi oppose deux équipes de ${SITE_COUNTS.teamSize} pendant ${SITE_COUNTS.challengeDays} jours, sur ${SITE_COUNTS.sectorCount} secteurs annoncés à l’avance. Chaque joueur peut faire compter ${SITE_COUNTS.contributiveDays} journées au maximum, pour ${SITE_COUNTS.maxPointsPerPlayer} points au plus ; une équipe plafonne à ${SITE_COUNTS.maxPointsPerTeam}. Un groupe coordonné bat un groupe de gros rouleurs : c’est une règle, pas un slogan. Pour qu’une journée compte dans un secteur, il faut qu’une part de ta trace y passe : ${SITE_FACTS.insideSectorRun.value} à pied, ${SITE_FACTS.insideSectorBike.value} à vélo.`,
      facts: [
        stat(SITE_FACTS.insideSectorRun, 'de trace dans le secteur, à pied'),
        stat(SITE_FACTS.insideSectorBike, 'de trace dans le secteur, à vélo'),
        stat(SITE_FACTS.pointsPerDay, 'pour chaque journée comptée'),
      ],
    },
  ] as readonly CrewsSection[],

  /**
   * Le renvoi de fin. Un crew se rejoint DANS l'application : la seule action
   * honnête depuis le web est d'aller voir où en est la sortie.
   */
  cta: { label: 'Télécharger', href: '/telecharger/' },
} as const;
