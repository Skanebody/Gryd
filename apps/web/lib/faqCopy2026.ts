/**
 * GRYD — LES TREIZE QUESTIONS (lot W3).
 *
 * Reprises MOT POUR MOT de `apps/mobile/src/features/help/helpFaq2026.ts`
 * (version `fr`), comme l'exige `docs/product/GRYD_SITE_CONTENU_2026_09.md`
 * §3.7 : cinq groupes, treize questions, et les chiffres lus aux constantes.
 *
 * ⚠️ LE `FAQPage` DE LA PAGE EST CONSTRUIT DEPUIS CE FICHIER, PAS À CÔTÉ. Un
 * `FAQPage` dont les réponses diffèrent de celles affichées est une pénalité, pas
 * un bonus (cahier §3.10) : les données structurées et l'accordéon lisent donc la
 * MÊME donnée, et il n'existe aucun chemin pour les faire diverger.
 *
 * ⚠️ POURQUOI LES TEXTES SONT RECOPIÉS ET NON IMPORTÉS : `apps/web` ne peut pas
 * importer `apps/mobile` (deux React, deux bundlers, `react-native` d'un côté).
 * La duplication est donc assumée et BORNÉE à ce fichier. Ce qui n'est PAS
 * dupliqué, ce sont les chiffres : ils viennent des mêmes constantes
 * (`@klaim/shared`) des deux côtés, donc une règle qui change les change ici et
 * là-bas au même instant.
 */
import { SITE_COUNTS, SITE_FACTS } from './facts2026';

export interface FaqEntryCopy {
  readonly question: string;
  readonly answer: string;
}

export interface FaqGroupCopy {
  readonly id: string;
  readonly title: string;
  readonly entries: readonly FaqEntryCopy[];
}

export const FAQ_COPY = {
  seo: {
    title: 'Questions fréquentes sur Gryd',
    description:
      'Treize réponses courtes : sorties sans boucle, terrain repris, XP, repos, classement, crew, points de défi, vie privée et argent.',
  },

  hero: {
    title: 'Questions fréquentes',
    lead: 'Treize réponses courtes : sorties sans boucle, terrain repris, XP, repos, classement, crew, points de défi, vie privée et argent.',
  },

  groups: [
    {
      id: 'sorties',
      title: 'Tes sorties',
      entries: [
        {
          question: 'Une sortie sans boucle compte-t-elle ?',
          answer: 'Oui. Son tracé, sa distance et sa durée restent dans ton journal. Elle peut rapporter des XP sans prendre de terrain.',
        },
        {
          question: 'La course et le vélo se mélangent-ils ?',
          answer: 'Un compte, un journal, un niveau. Chaque sport garde sa carte et ses défis. Choisis ta discipline avant de partir.',
        },
        {
          question: 'Que veut dire « synchronisation en attente » ?',
          answer: 'Ta sortie est gardée sur ce téléphone et attend d’être envoyée. Rien n’est annoncé avant la confirmation du serveur. Reconnecte-toi pour finir.',
        },
      ],
    },
    {
      id: 'terrain',
      title: 'Le terrain',
      entries: [
        {
          question: 'Comment gagner du terrain ?',
          answer: 'Ferme une boucle qui respecte les règles. Le serveur vérifie la trace et te donne la surface à l’intérieur, dans ce sport.',
        },
        {
          question: 'Et si quelqu’un reprend ma zone ?',
          answer: 'La boucle la plus récente prend la part qu’elle recouvre. Tu gardes ta sortie, ton empreinte et tes XP. Une nouvelle boucle est la seule façon de la reprendre.',
        },
        {
          question: 'Pourquoi ma boucle a-t-elle été refusée ?',
          answer: 'L’app te donne la raison exacte : pas de boucle complète, surface trop petite, ou précision GPS insuffisante. Ta sortie est gardée dans tous les cas.',
        },
      ],
    },
    {
      id: 'progression',
      title: 'La progression',
      entries: [
        {
          question: 'Comment marchent les XP ?',
          answer: `Une journée avec au moins ${SITE_FACTS.dailyMovement.value} de mouvement vaut ${SITE_FACTS.xpPerDay.value}. Les ${SITE_COUNTS.creditedDaysPerWeek} premières journées de la semaine rapportent, les deux sports confondus.`,
        },
        {
          question: 'Est-ce que le repos me coûte quelque chose ?',
          answer: 'Non. Le repos ne retire ni XP, ni niveau, ni souvenir, ni objet. Il n’y a aucune série quotidienne à tenir.',
        },
        {
          question: 'Pourquoi n’y a-t-il pas de classement chez moi ?',
          answer: `Un classement n’apparaît qu’à partir de ${SITE_FACTS.rankedMinimum.value} classés dans la zone. En dessous, un podium serait un chiffre inventé.`,
        },
      ],
    },
    {
      id: 'crew',
      title: 'Le crew',
      entries: [
        {
          question: 'Faut-il rejoindre un crew ?',
          answer: 'Non. Tu peux explorer, enregistrer et progresser seul. Un crew sert à retrouver des gens et à organiser de vraies sorties.',
        },
        {
          question: 'Comment gagner des points de défi ?',
          answer: `Ferme une boucle avec une part de trace dans le secteur : ${SITE_FACTS.insideSectorRun.value} à pied, ${SITE_FACTS.insideSectorBike.value} à vélo. Chaque journée comptée vaut ${SITE_FACTS.pointsPerDay.value}.`,
        },
      ],
    },
    {
      id: 'vie-privee',
      title: 'Vie privée et argent',
      entries: [
        {
          question: 'Mes lieux privés sont-ils publics ?',
          answer: 'Tes réglages de confidentialité décident de ce qui est partagé. Une boucle qui montrerait une zone protégée reste privée par défaut. Vérifie l’aperçu avant de partager.',
        },
        {
          question: 'Faut-il payer pour jouer ?',
          answer: 'Non. Le sport, la capture, le crew et la progression sont gratuits. Aucun achat n’augmente le terrain, les XP ou les points de défi.',
        },
      ],
    },
  ] as readonly FaqGroupCopy[],

  cta: { label: 'Lire le guide complet', href: '/comment-ca-marche/' },
} as const;

/** Les treize entrées à plat, dans l'ordre d'affichage. Sert au `FAQPage`. */
export function faqEntries(): FaqEntryCopy[] {
  return FAQ_COPY.groups.flatMap((group) => [...group.entries]);
}
