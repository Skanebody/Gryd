/**
 * GRYD — LA COPIE DE L'ACCUEIL (lot W2).
 *
 * Chaque phrase de `app/page.tsx` vit ici, et vient MOT POUR MOT de
 * `docs/product/GRYD_SITE_CONTENU_2026_09.md` §3.1. La page ne compose que la
 * mise en forme : rien ne s'écrit dans le JSX, donc rien ne peut y être
 * réécrit sans passer par ce fichier, que `homeCopy2026.test.ts` relit.
 *
 * ─── POURQUOI LA COPIE EST UNE DONNÉE, ET PAS DU JSX ────────────────────────
 * Trois règles de la charte ne se vérifient que sur du texte :
 *   · aucun tiret long, ni `—` ni `–` (cahier §4.1) ;
 *   · « GRYD » en capitales n'existe que dans le logo dessiné et dans le nom de
 *     l'offre `GRYD+` (§4.2) ;
 *   · aucun mot de l'ancien site (« War Room », « GRYD Club », « Founder
 *     Pack », « quartier débloqué »… §4.4).
 * Écrite dans du JSX, cette copie ne serait relisable que par un test de rendu,
 * donc par un navigateur, donc jamais dans le gate. Écrite en données, elle est
 * relue par un test PUR qui tourne en 200 µs sous Deno.
 *
 * ─── AUCUN CHIFFRE DE JEU N'EST TAPÉ ────────────────────────────────────────
 * §4.3 : « Aucun chiffre de jeu ne se tape à la main. » Le site a un jour
 * affiché un Founder Pack à 149 € contre 9,99 € dans la source, un facteur 15
 * entre le lien public et la vérité. Les tolérances de fermeture, la coupe de
 * partage et les multiplicateurs commerciaux sont donc INTERPOLÉS depuis
 * `@klaim/shared`. Changer une règle change la page, sans que personne y pense.
 */
import { COMMERCIAL_PROPOSAL_2026, SHARE_TRIM_M, TERRITORY_RULES_2026 } from '@klaim/shared';

/**
 * Espace INSÉCABLE entre un nombre et son unité (typographie française). Écrite
 * par son point de code : un caractère invisible tapé au clavier finit un jour
 * remplacé par une espace ordinaire, et la ligne casse entre « 25 » et « m ».
 */
const NB = ' ';

/** « 25 m » — le nombre vient de la règle, l'unité de la mise en page. */
function metres(value: number): string {
  return `${value}${NB}m`;
}

const CLOSURE_RUN = metres(TERRITORY_RULES_2026.run.closureMaxGapM);
const CLOSURE_BIKE = metres(TERRITORY_RULES_2026.bike.closureMaxGapM);
const TRIM = metres(SHARE_TRIM_M);

/** Le nom de l'offre, tel que la source de vérité l'écrit. Seule forme en capitales. */
const OFFER = COMMERCIAL_PROPOSAL_2026.subscriptionName;

/** Un multiplicateur commercial, affiché comme un facteur : « × 1 ». */
function factor(value: number): string {
  return `×${NB}${value}`;
}

export interface HomeStat {
  readonly value: string;
  readonly label: string;
  /** Le nom de la constante d'où vient la valeur, cité en `data-rule` dans le DOM. */
  readonly rule: string;
}

export interface HomeStep {
  readonly index: string;
  readonly title: string;
  readonly body: string;
}

/**
 * LA COPIE. Un objet gelé, lu par la page et par le test.
 *
 * La note de provenance du cahier (« ADR-019, migration 0197 en prod ») reste
 * un commentaire : c'est une référence interne, pas une phrase à afficher. Idem
 * pour les noms de constantes, qui sortent par `rule` et non dans la prose.
 */
export const HOME_COPY = {
  seo: {
    title: 'Gryd, cours ou roule et prends du terrain',
    description:
      'Ferme une boucle en courant ou à vélo : la surface à l’intérieur devient ton terrain sur la carte. Gratuit, sans achat qui fait gagner.',
  },

  hero: {
    title: 'Cours ou roule. Ferme ta boucle. Le terrain est à toi.',
    lead: 'Ferme une boucle en courant ou en roulant. La surface à l’intérieur devient ton terrain sur la carte de ce sport. Ta sortie, elle, reste à toi dans tous les cas.',
    primary: { label: 'Comment ça marche', href: '/comment-ca-marche/' },
    secondary: { label: 'Télécharger', href: '/telecharger/' },
    /** Une ligne d'état, sans emphase. Elle dit l'état réel avant qu'on le découvre. */
    status: 'Gryd n’est pas encore sur l’App Store.',
  },

  steps: {
    kicker: 'Le geste',
    title: 'Le geste tient en trois temps',
    items: [
      {
        index: '01',
        title: 'Tu bouges.',
        body: 'Choisis ton sport, course ou vélo, puis appuie sur GO. Le GPS suit ton trajet. À la fin, ta trace rejoint ton journal avec sa distance et sa durée.',
      },
      {
        index: '02',
        title: 'Tu fermes.',
        body: `Reviens près d’un endroit où tu es déjà passé. Il y a une tolérance, parce que le GPS bouge un peu : ${CLOSURE_RUN} à pied, ${CLOSURE_BIKE} à vélo.`,
      },
      {
        index: '03',
        title: 'Tu prends.',
        body: 'L’intérieur de ta boucle devient ton terrain. Tu gagnes seulement la part que tu n’avais pas déjà. Une boucle plus récente peut te la reprendre.',
      },
    ] as readonly HomeStep[],
    cta: { label: 'Lire le guide complet', href: '/comment-ca-marche/' },
  },

  /**
   * ADR-019, migration 0197 en production : la discipline est honnête à
   * l'arrivée. Les deux tolérances de fermeture sont posées ICI et pas sous
   * l'étape 02, où elles ne feraient que répéter la phrase : côte à côte, elles
   * PROUVENT que les deux sports ne partagent pas leurs seuils.
   */
  sports: {
    kicker: 'Deux disciplines',
    title: 'Deux sports, deux cartes',
    body: 'Course et vélo ne se mélangent pas sur la carte. Un compte, un journal, un niveau, mais chaque sport garde son terrain et ses défis. Tu choisis ta discipline avant de partir, et si tu te trompes, Gryd te le dit à l’arrivée et te laisse basculer.',
    stats: [
      {
        value: CLOSURE_RUN,
        label: 'd’écart toléré à la fermeture, à pied',
        rule: 'TERRITORY_RULES_2026.run.closureMaxGapM',
      },
      {
        value: CLOSURE_BIKE,
        label: 'd’écart toléré à la fermeture, à vélo',
        rule: 'TERRITORY_RULES_2026.bike.closureMaxGapM',
      },
    ] as readonly HomeStat[],
  },

  crew: {
    kicker: 'À plusieurs',
    title: 'Un crew, si tu veux',
    body: 'Un crew, c’est un petit groupe : des amis, un club, un quartier. Tu peux en rejoindre un, en créer un, ou jouer seul. Rien n’est obligatoire. Un crew sert à retrouver des gens et à organiser de vraies sorties.',
    cta: { label: 'Voir les crews', href: '/crews/' },
  },

  fairPlay: {
    kicker: 'Fair-play',
    title: 'Rien ne s’achète qui fait gagner',
    body: `Le sport, la capture, le crew et la progression sont gratuits. Aucun achat n’augmente le terrain, les XP ou les points de défi. ${OFFER} vendra un jour des outils d’analyse et de création. Jamais un avantage.`,
    cta: { label: `Ce que contient ${OFFER}`, href: '/gryd-plus/' },
    stats: [
      {
        value: factor(COMMERCIAL_PROPOSAL_2026.paidCaptureMultiplier),
        label: 'sur le terrain pris',
        rule: 'COMMERCIAL_PROPOSAL_2026.paidCaptureMultiplier',
      },
      {
        value: factor(COMMERCIAL_PROPOSAL_2026.paidXpMultiplier),
        label: 'sur les XP gagnés',
        rule: 'COMMERCIAL_PROPOSAL_2026.paidXpMultiplier',
      },
      {
        value: factor(COMMERCIAL_PROPOSAL_2026.paidChallengeMultiplier),
        label: 'sur les points de défi',
        rule: 'COMMERCIAL_PROPOSAL_2026.paidChallengeMultiplier',
      },
    ] as readonly HomeStat[],
    statsNote: 'Les trois multiplicateurs que peut acheter un compte payant valent 1, et c’est écrit dans le code.',
  },

  privacy: {
    kicker: 'Vie privée',
    title: 'Ta sortie t’appartient',
    body: `Les extrémités de ta trace sont coupées avant tout partage public, sur ${TRIM} de chaque côté. Tu choisis combien de temps Gryd garde tes tracés : pour toujours, un an, ou 90 jours. Une boucle qui montrerait une zone que tu as protégée reste privée.`,
    cta: { label: 'Sécurité et vie privée', href: '/securite-et-vie-privee/' },
    stat: {
      value: TRIM,
      label: 'coupés à chaque bout avant tout partage public',
      rule: 'SHARE_TRIM_M',
    } as HomeStat,
  },

  /**
   * Le bloc de fin : la reprise courte de `/telecharger/`. Aucun badge App
   * Store, aucun lien `apps.apple.com` : il n'existe aucune fiche, donc un
   * bouton serait mort. Le seuil de 500 inscrits de l'ancien formulaire a
   * disparu de l'écran : les communes s'ouvrent par présence réelle.
   */
  waitlist: {
    kicker: 'Sortie',
    title: 'Gryd n’est pas encore sur l’App Store',
    body: 'C’est l’état réel, au 12 septembre 2026. L’application tourne, elle est testée tous les jours sur iPhone, et elle n’a pas encore de fiche publique. Laisse ton e-mail : tu seras prévenu le jour où elle en aura une.',
    emailLabel: 'Ton adresse e-mail',
    postalLabel: 'Ton code postal',
    postalHelp: 'Il nous dit où le produit est attendu. Il ne débloque rien et il n’ouvre aucune commune.',
    submit: 'Me prévenir',
    success: 'C’est noté. On t’écrit quand Gryd ouvre.',
  },
} as const;

/**
 * Toutes les chaînes de la copie, à plat. Le test les relit une par une ; la
 * page, elle, lit `HOME_COPY` par ses clefs. Une fonction plutôt qu'une
 * constante : elle n'a aucun coût tant que personne ne l'appelle.
 */
export function homeCopyStrings(): string[] {
  const found: string[] = [];
  const walk = (node: unknown): void => {
    if (typeof node === 'string') {
      found.push(node);
      return;
    }
    if (Array.isArray(node)) {
      for (const item of node) walk(item);
      return;
    }
    if (typeof node === 'object' && node !== null) {
      for (const value of Object.values(node as Record<string, unknown>)) walk(value);
    }
  };
  walk(HOME_COPY);
  return found;
}
