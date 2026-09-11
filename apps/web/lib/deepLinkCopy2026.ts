/**
 * GRYD — LES TROIS PAGES D'ARRIVÉE, ET LA VRAIE 404 (lot W3).
 *
 * MOT POUR MOT `docs/product/GRYD_SITE_CONTENU_2026_09.md` §3.9.
 *
 * ─── POURQUOI CES PAGES VIVENT DANS LE 404 ──────────────────────────────────
 * `/c/<code>/`, `/r/<code>/` et `/u/<pseudo>/` sont déclarées dans
 * `apple-app-site-association` : sur un iPhone où Gryd est installé, iOS remet
 * ces adresses à l'app et la page web n'est JAMAIS chargée. Elle n'existe que
 * pour qui n'a pas l'app. Or un export statique ne pré-génère pas une page par
 * code inconnu, et GitHub Pages n'a ni réécriture ni 301. Seule voie :
 * `404.html` lit `location.pathname`, reconnaît les trois préfixes et peint le
 * contenu ; tout autre chemin garde la vraie 404.
 *
 * Deux conséquences, écrites dans le code : ces pages répondent en HTTP 404
 * (donc `noindex`, zéro référencement), et sans JavaScript elles ne se
 * résolvent pas — un `<noscript>` dit la vérité et renvoie vers
 * `/telecharger/`.
 *
 * ─── CE QUE CES PAGES N'AFFICHENT PAS, ET POURQUOI ──────────────────────────
 * Aucun nom de crew, aucun blason, aucun nombre de membres, aucune ville : la
 * page ne lit RIEN du serveur, et ces informations ne sont pas dans l'URL. Le
 * profil ne dit pas non plus « @x est sur Gryd » : rien ne prouve qu'un
 * visiteur anonyme puisse lire un profil public (l'audit du 11/09 a relevé que
 * `public_profiles` et `player_leaderboard` n'ont pas `security_invoker`, et le
 * point reste ouvert). La page dit donc où MÈNE le lien, ce qui est vrai sans
 * rien certifier.
 */
/**
 * Le schéma de l'application. MIROIR de `APP_SCHEME`
 * (`apps/mobile/src/lib/links.ts`) et de `expo.scheme` (`apps/mobile/app.json`) :
 * `apps/web` ne peut pas importer `apps/mobile`, la duplication est donc assumée
 * et bornée à cette ligne. Une divergence rendrait les trois boutons inertes sur
 * un téléphone où l'app EST installée : c'est le seul cas où cette page sert.
 */
export const APP_SCHEME = 'gryd' as const;

export interface DeepLinkPage {
  /** Le préfixe d'URL reconnu, avec ses deux slashs : `/c/`. */
  readonly prefix: string;
  /** Le chemin de l'application ouvert par le bouton : `c` pour `gryd://c/<code>`. */
  readonly host: string;
  readonly title: string;
  readonly body: string;
  /** Une seconde ligne, quand le cahier en écrit une. */
  readonly extra?: string;
  /** La ligne posée sous les boutons, où le code est réinjecté. */
  readonly codeNote?: { readonly before: string; readonly after: string };
  /** La clef de photographie dans `SITE_PHOTOS`, quand la page en porte une. */
  readonly photo?: 'inviteCrew' | 'parrainage';
}

/** Le libellé du bouton qui ouvre l'application. Le même sur les trois pages. */
export const OPEN_APP_LABEL = 'Ouvrir Gryd' as const;
/** Le renvoi pour qui n'a pas l'application. */
export const NO_APP_LINK = { label: 'Gryd n’est pas installé ?', href: '/telecharger/' } as const;

export const DEEP_LINK_PAGES = {
  crew: {
    prefix: '/c/',
    host: 'c',
    title: 'On t’invite dans un crew',
    body: 'Ce lien porte une invitation. Ouvre Gryd pour voir le crew, sa ville et ses conditions avant de décider.',
    codeNote: {
      before: 'Le code de cette invitation :',
      after: 'Garde-le : tu pourras l’entrer à la main dans l’application.',
    },
    photo: 'inviteCrew',
  },
  referral: {
    prefix: '/r/',
    host: 'r',
    title: 'Quelqu’un t’a passé le relais',
    body: 'Ce lien porte un code de parrainage. Ouvre Gryd, crée ton compte, fais une sortie validée : vous recevez tous les deux les objets du Relais, toi et la personne qui t’a invité.',
    extra: 'Le parrainage ne donne aucun terrain, aucun point de défi et aucune chance supplémentaire de gagner quoi que ce soit. Il donne des objets, et un peu d’XP de progression pendant sept jours.',
    photo: 'parrainage',
  },
  profile: {
    prefix: '/u/',
    host: 'u',
    title: 'Ce lien mène à un profil Gryd',
    body: 'Ouvre Gryd pour voir ce profil. Le web n’en montre rien : ni terrain, ni sorties, ni crew, ni photo.',
  },
} as const satisfies Record<string, DeepLinkPage>;

export type DeepLinkKey = keyof typeof DEEP_LINK_PAGES;

/** L'ordre de reconnaissance dans le routeur. Les préfixes sont disjoints. */
export const DEEP_LINK_ORDER: readonly DeepLinkKey[] = ['crew', 'referral', 'profile'];

/**
 * La vraie 404 : celle qui reste quand aucun préfixe ne correspond.
 *
 * Le cahier de contenu n'écrit PAS cette page (elle n'est pas au plan du site) :
 * ces quelques lignes sont donc du mobilier, pas une promesse. Elles disent ce
 * qui s'est passé et proposent deux sorties réelles, sans inventer ni cause, ni
 * délai, ni fonction.
 */
export const NOT_FOUND_COPY = {
  title: 'Cette page n’existe pas',
  body: 'L’adresse est peut-être incomplète, ou la page a changé de nom. Reviens à l’accueil, ou vois où en est la sortie.',
  home: { label: 'L’accueil', href: '/' },
  download: { label: 'Télécharger', href: '/telecharger/' },
  /**
   * Ce que voit un visiteur sans JavaScript. Il DIT la vérité plutôt que de
   * laisser une page vide : le routeur des liens partagés ne peut pas
   * fonctionner sans script, et le nier serait un mensonge de plus.
   */
  noscript:
    'Cette page a besoin de JavaScript pour reconnaître un lien d’invitation, de parrainage ou de profil. Sans lui, ouvre l’application, ou vois où en est la sortie.',
} as const;

/** `gryd://c/<code>` — construit ici, jamais écrit à la main dans une page. */
export function appDeepLink(host: string, code: string): string {
  return `${APP_SCHEME}://${host}/${encodeURIComponent(code)}`;
}
