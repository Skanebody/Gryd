/**
 * GRYD — LA PHOTOTHÈQUE DU SITE (lot W2).
 *
 * Douze photographies, leur `alt` repris MOT POUR MOT de
 * `docs/product/GRYD_SITE_CONTENU_2026_09.md` §3 (règle §4.6 : « Les alt de §3
 * se reprennent tels quels »), et leur page d'affectation.
 *
 * ─── DEUX TAILLES, ET POURQUOI PAS TROIS ────────────────────────────────────
 * Les sources vivent dans `apps/mobile/assets/photos/` en 1080 × 1920, sous
 * 450 Ko. Le cahier interdit de « dépasser la qualité de la source » : un
 * agrandissement à 1600 px produirait un fichier plus lourd sans un pixel de
 * détail en plus, donc un mensonge sur la qualité. Le site sert donc :
 *   · `<nom>.jpg`      — la source, COPIÉE À L'OCTET (1080 px de large) ;
 *   · `<nom>-800.jpg`  — une réduction à 800 px, JPEG qualité 78 (`sips`).
 * Le nom de la grande garde exactement celui de la source : il a été écrit pour
 * le référencement, et le renommer perdrait ce travail.
 *
 * ─── CE QU'UNE PHOTO N'EST PAS ──────────────────────────────────────────────
 * Une photographie ne remplace JAMAIS une capture d'écran. Tant qu'aucune
 * capture iOS n'est recettée, le site ne montre ni faux écran, ni maquette de
 * téléphone remplie de chiffres inventés, ni carte peuplée de territoires
 * fictifs (cahier §4.6). C'est la faute la plus facile à commettre sur une page
 * d'accueil, et la plus grave ici.
 */

/** La largeur native des sources, en pixels. Sert à écrire un `srcset` honnête. */
export const PHOTO_WIDTH_FULL = 1080;
/** La largeur de la variante réduite, en pixels. */
export const PHOTO_WIDTH_SMALL = 800;
/** La hauteur native des sources (format portrait 9:16). */
export const PHOTO_HEIGHT_FULL = 1920;

export interface SitePhoto {
  /** Le nom de fichier, sans extension : il sert de clef et d'URL. */
  readonly name: string;
  /** Le texte alternatif. Décrit la scène, jamais la marque. */
  readonly alt: string;
}

/** Les photographies, clef par clef. Une clef absente est une erreur de compilation. */
export const SITE_PHOTOS = {
  heroAccueil: {
    name: 'gryd-duo-sprint-ville-lunettes-chartreuse',
    alt: 'Deux coureurs en plein sprint dans une rue de ville, lunettes chartreuse, les immeubles filés par la vitesse.',
  },
  crewAccueil: {
    name: 'gryd-crew-course-montee-ville-foule',
    alt: 'Un crew entier remonte une rue en pente, la ville derrière, les visages du premier rang hurlant de joie.',
  },
  guideOuverture: {
    name: 'gryd-coureurs-vue-plongeante-paves',
    alt: 'Vue en plongée verticale sur huit coureurs dispersés sur des pavés, leurs ombres allongées, semelles chartreuse.',
  },
  crewsHero: {
    name: 'gryd-crew-femmes-cercle-selfie-ciel',
    alt: 'Neuf coureuses en cercle vues depuis le sol, têtes tournées vers l’objectif, signes de victoire.',
  },
  crewsGerer: {
    name: 'gryd-crew-pause-cafe-terrasse',
    alt: 'Après la sortie : deux hommes debout et trois coureuses au comptoir d’un café, gobelets à la main.',
  },
  saisonHero: {
    name: 'gryd-foule-place-depart-collectif',
    alt: 'Des dizaines de coureurs en noir massés sur une allée arborée, à l’instant du départ.',
  },
  offre: {
    name: 'gryd-materiel-sol-apres-course-medailles',
    alt: 'Vue de haut sur un plancher de bois, un cercle de jambes assises, deux médailles à ruban et des chaussures usées.',
  },
  securite: {
    name: 'gryd-coureur-nuit-pluie-eclairs',
    alt: 'Une rue étroite de nuit, les pavés luisants de pluie, un coureur seul dans des éclats de lumière blanche.',
  },
  faq: {
    name: 'gryd-coureuse-lunettes-chartreuse-portrait-groupe',
    alt: 'Vue de haut avant le départ : une coureuse aux lunettes chartreuse au centre, le groupe serré autour d’elle.',
  },
  telecharger: {
    name: 'gryd-duo-traversee-passage-pieton-pluie',
    alt: 'Chaussée mouillée, circulation à l’arrêt, un homme et une femme traversent au pas de course.',
  },
  inviteCrew: {
    name: 'gryd-groupe-hommes-course-pluie-brique',
    alt: 'Six coureurs de profil sous une pluie visible, le long d’un mur de brique, semelles chartreuse.',
  },
  parrainage: {
    name: 'gryd-coureurs-vitesse-file-rue',
    alt: 'Filé latéral sur quatre coureurs lancés, le décor réduit à des traînées grises.',
  },
} as const satisfies Record<string, SitePhoto>;

export type SitePhotoKey = keyof typeof SITE_PHOTOS;

/** L'URL de la grande version (1080 px), celle qui porte le nom de référencement. */
export function photoSrc(photo: SitePhoto): string {
  return `/photos/${photo.name}.jpg`;
}

/**
 * Le `srcset` des deux tailles réellement produites. `next/image` est
 * désactivé par l'export statique (`images: { unoptimized: true }`) : le site
 * écrit donc son `srcset` lui-même, et n'annonce que des largeurs qui existent
 * sur le disque.
 */
export function photoSrcSet(photo: SitePhoto): string {
  return `/photos/${photo.name}-${PHOTO_WIDTH_SMALL}.jpg ${PHOTO_WIDTH_SMALL}w, /photos/${photo.name}.jpg ${PHOTO_WIDTH_FULL}w`;
}
