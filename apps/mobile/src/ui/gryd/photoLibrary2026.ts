/**
 * GRYD — LA PHOTOTHÈQUE DU FONDATEUR (LOT P, 10/09/2026).
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * Douze photographies originales sont arrivées d'un coup, nommées `1.PNG` …
 * `18.PNG`. Deux problèmes, un seul remède :
 *   1. un nom qui ne dit rien ne se retrouve pas. Six mois plus tard, personne
 *      ne sait laquelle est « celle de la terrasse ». Chaque fichier porte
 *      désormais son sujet dans son nom (`gryd-crew-pause-cafe-terrasse.jpg`),
 *      en minuscules, sans accent, séparé par des tirets : c'est aussi ce que
 *      lisent les moteurs quand une de ces images partira sur `apps/web`.
 *   2. une photo posée dans `assets/` sans être décrite finit soit oubliée,
 *      soit peinte au hasard. Chaque entrée dit sa SCÈNE (ce qu'on y voit) et
 *      ses EMPLACEMENTS possibles (où elle aurait du sens).
 *
 * ─── LE STOCK N'ENTRE PAS DANS LE BINAIRE, ET C'EST MESURÉ ──────────────────
 * Metro n'embarque que ce qu'un `require()` atteint. Preuve prise sur l'IPA du
 * 10/09/2026 (`gryd-0a07b73c.ipa`) : `Payload/GRYD.app/assets/assets/` ne
 * contient QUE `auth/sign-in-crew.jpg` et `onboarding/e01-crew.jpg`, les deux
 * seules photos requises par le code. `editorial/urban-running-2026.png`
 * (2,6 Mo) dort dans le dépôt sans qu'un octet ne parte sur l'iPhone, parce
 * qu'aucune ligne ne le require. `app.json` ne déclare aucun
 * `assetBundlePatterns`, donc rien ne rattrape le stock par une glob.
 *
 * DONC : `source` n'est présent QUE sur les photos réellement peintes. Ajouter
 * un `require()` ici, c'est ajouter son poids à chaque téléchargement de l'app.
 * `photoLibrary2026.test.ts` compte ces `require()` et refuse le deuxième tant
 * qu'aucun écran ne l'affiche.
 *
 * ─── CE FICHIER NE SE CHARGE PAS SOUS DENO ──────────────────────────────────
 * Il contient un `require()`, que seul Metro sait résoudre. Son test le lit
 * donc comme du TEXTE, jamais comme un module : c'est la même méthode que
 * `src/i18n/noDashFr2026.test.ts`.
 */
import type { ImageSourcePropType } from 'react-native';

/**
 * Les endroits de GRYD qui peuvent accueillir une photographie. Ce sont des
 * SUGGESTIONS de direction artistique, pas des promesses : tant qu'un écran ne
 * l'affiche pas, la photo reste en stock (voir `docs/product/
 * GRYD_PHOTOTHEQUE_2026_09.md` pour le détail, écran par écran).
 */
export type EmplacementPhoto2026 =
  | 'herosProfil'
  | 'crewVide'
  | 'partage'
  | 'webAccueil'
  | 'appStore';

export type Photo2026 = {
  /** Nom du fichier dans `apps/mobile/assets/photos/`. */
  readonly file: string;
  /** Texte alternatif RENDU (accessibilityLabel) le jour où la photo est peinte. */
  readonly alt: { readonly fr: string; readonly en: string };
  /** Ce que l'on voit. Documentation d'équipe, jamais affichée. */
  readonly scene: { readonly fr: string; readonly en: string };
  /** Où cette image aurait du sens. Aucune de ces places n'est réservée. */
  readonly suggestedUse: readonly EmplacementPhoto2026[];
  /** Recadrage : le fichier d'origine dont cette variante est tirée. */
  readonly derivedFrom?: string;
  /**
   * Présent UNIQUEMENT si un écran l'affiche : c'est ce `require()` qui met
   * l'image dans le binaire.
   */
  readonly source?: ImageSourcePropType;
};

/** Une photo réellement peinte : son `source` est garanti présent. */
export type PhotoEmbarquee2026 = Photo2026 & { readonly source: ImageSourcePropType };

/**
 * ─── LE RECADRAGE DU HÉROS DU PROFIL, ET SA GÉOMÉTRIE ───────────────────────
 * React Native ne sait pas viser un point focal : `resizeMode="cover"` centre,
 * point. Le bloc « Tout commence dehors » du Profil mesure 148 pt de haut et
 * peint son image dans un cadre de `largeur × 1,5 largeur` décalé vers le haut
 * de 24 % du débordement (`MovementPhoto2026`, `ProfileHomeScreen.tsx`). Une
 * photo au ratio 2:3 y entre donc SANS recoupe latérale, et la fenêtre visible
 * tombe entre 17 % et 46 % de sa hauteur selon la largeur de l'écran.
 *
 * `…-heros-profil.jpg` est cette photo-là : la 18 recadrée en 1080 × 1620 à
 * partir de la ligne 255 de l'original (1080 × 1920). Fenêtre réellement vue,
 * en lignes de l'ORIGINAL (marge de 20 pt de large prise par `ProfilePage`) :
 *   · 375 pt d'écran → 529 … 1007     · 390 pt → 534 … 991
 *   · 428 pt         → 545 … 957      · 430 pt → 545 … 955  (le plus serré)
 * Le premier rang de visages occupe 584 … 900. Il tient donc entier dans le cas
 * le plus serré, avec de l'air au-dessus et en dessous. Captures de preuve :
 * `docs/product/GRYD_PHOTOTHEQUE_2026_09.md`, § Cadrage.
 *
 * SI QUELQU'UN CHANGE `MovementPhoto2026` (hauteur, ratio 1,5 ou décalage
 * 0,24), CE CADRAGE BOUGE. Le contrat est ici, et nulle part ailleurs.
 *
 * Son `source` n'est pas optionnel : le héros du Profil ne peut pas être une
 * image absente, et le typage l'interdit (`PhotoEmbarquee2026`).
 */
const HEROS_PROFIL: PhotoEmbarquee2026 = {
  file: 'gryd-crew-course-montee-ville-foule-heros-profil.jpg',
  derivedFrom: 'gryd-crew-course-montee-ville-foule.jpg',
  alt: {
    fr: 'Photo GRYD : le crew remonte une rue en ville, visages hilares au premier rang',
    en: 'GRYD photograph: the crew charging up a city street, laughing faces in the front row',
  },
  scene: {
    fr: 'Recadrage du premier rang de la photo de foule, calibré pour le bloc de 148 pt du Profil.',
    en: 'Crop of the crowd photograph front row, calibrated for the 148 pt Profile block.',
  },
  suggestedUse: ['herosProfil'],
  source: require('../../../assets/photos/gryd-crew-course-montee-ville-foule-heros-profil.jpg') as ImageSourcePropType,
};

/**
 * LES DOUZE ORIGINAUX, EN 1080 DE LARGE, SANS RECOUPE. Aucun `source` : ils
 * dorment dans le dépôt jusqu'à ce qu'un écran en ait besoin. Les recadrages
 * futurs se font comme celui du héros : un fichier `…-<emplacement>.jpg` en
 * plus, jamais une transformation à l'exécution.
 */
export const photothequeGryd2026: readonly Photo2026[] = [
  HEROS_PROFIL,
  {
    file: 'gryd-crew-course-montee-ville-foule.jpg',
    alt: {
      fr: 'Photo GRYD : une foule de coureurs remonte une rue en ville, débardeur GRYD CREW au premier plan',
      en: 'GRYD photograph: a crowd of runners charging up a city street, GRYD CREW vest in the foreground',
    },
    scene: {
      fr: 'Le crew au complet monte une rue en pente, la ville en fond, visages hurlants de joie au premier rang, chaussures et lunettes chartreuse.',
      en: 'The whole crew running up a sloped street, city skyline behind, front row screaming with joy, chartreuse shoes and shades.',
    },
    suggestedUse: ['herosProfil', 'crewVide', 'webAccueil', 'appStore'],
  },
  {
    file: 'gryd-crew-femmes-cercle-selfie-ciel.jpg',
    alt: {
      fr: 'Photo GRYD : un cercle de coureuses penchées vers l’objectif, ciel gris au centre',
      en: 'GRYD photograph: a circle of women runners leaning into the lens, grey sky at the centre',
    },
    scene: {
      fr: 'Vue depuis le sol : neuf coureuses en cercle, têtes vers l’objectif, signes de victoire, détails chartreuse sur les tenues noires.',
      en: 'Ground level view: nine women runners in a circle, heads to the lens, victory signs, chartreuse details on black kit.',
    },
    suggestedUse: ['crewVide', 'partage', 'webAccueil'],
  },
  {
    file: 'gryd-coureurs-vue-plongeante-paves.jpg',
    alt: {
      fr: 'Photo GRYD : groupe de coureurs vu de haut sur une chaussée claire',
      en: 'GRYD photograph: a group of runners seen from above on pale paving',
    },
    scene: {
      fr: 'Plongée verticale sur huit coureurs dispersés, ombres longues, chaussures chartreuse détachées sur le gris de la chaussée.',
      en: 'Overhead view of eight scattered runners, long shadows, chartreuse shoes standing out on the grey paving.',
    },
    suggestedUse: ['partage', 'webAccueil', 'appStore'],
  },
  {
    file: 'gryd-duo-sprint-ville-lunettes-chartreuse.jpg',
    alt: {
      fr: 'Photo GRYD : deux coureurs en sprint, lunettes chartreuse, buildings filés derrière',
      en: 'GRYD photograph: two runners sprinting, chartreuse shades, city towers blurred behind',
    },
    scene: {
      fr: 'Gros plan sur un duo en plein effort, lunettes chartreuse, avenue et gratte-ciel filés par la vitesse.',
      en: 'Close up on a sprinting pair, chartreuse shades, avenue and towers streaked by speed.',
    },
    suggestedUse: ['webAccueil', 'appStore'],
  },
  {
    file: 'gryd-coureuse-lunettes-chartreuse-portrait-groupe.jpg',
    alt: {
      fr: 'Photo GRYD : portrait en plongée d’une coureuse à lunettes chartreuse, entourée de son groupe',
      en: 'GRYD photograph: overhead portrait of a woman runner in chartreuse shades, surrounded by her group',
    },
    scene: {
      fr: 'Avant le départ, vue de haut : une coureuse au centre, regard vers l’objectif, le reste du groupe serré autour d’elle.',
      en: 'Before the start, seen from above: one runner at the centre looking to the lens, the group close around her.',
    },
    suggestedUse: ['herosProfil', 'partage', 'appStore'],
  },
  {
    file: 'gryd-coureurs-vitesse-file-rue.jpg',
    alt: {
      fr: 'Photo GRYD : coureurs de profil à pleine vitesse, décor filé',
      en: 'GRYD photograph: runners in profile at full speed, background streaked',
    },
    scene: {
      fr: 'Filé latéral sur quatre coureurs lancés, jambes tendues, barrières et arbres réduits à des traînées grises.',
      en: 'Side panning shot of four runners at full tilt, barriers and trees reduced to grey streaks.',
    },
    suggestedUse: ['partage', 'webAccueil'],
  },
  {
    file: 'gryd-coureur-nuit-pluie-eclairs.jpg',
    alt: {
      fr: 'Photo GRYD : un coureur seul dans une rue mouillée la nuit, traînées de lumière autour de lui',
      en: 'GRYD photograph: a lone runner on a wet street at night, light trails around him',
    },
    scene: {
      fr: 'Rue étroite de nuit, pavés luisants, un seul coureur face à l’objectif, éclats de lumière blanche autour du buste.',
      en: 'Narrow street at night, glistening cobbles, a single runner facing the lens, white light bursts around his chest.',
    },
    suggestedUse: ['partage', 'appStore'],
  },
  {
    file: 'gryd-duo-traversee-passage-pieton-pluie.jpg',
    alt: {
      fr: 'Photo GRYD : deux coureurs traversent un passage piéton devant une façade en pierre',
      en: 'GRYD photograph: two runners crossing a zebra crossing in front of a stone facade',
    },
    scene: {
      fr: 'Chaussée mouillée, camion et voitures arrêtés, un homme et une femme en veste noire traversent au pas de course.',
      en: 'Wet road, a lorry and cars at a halt, a man and a woman in black jackets running across.',
    },
    suggestedUse: ['webAccueil', 'appStore'],
  },
  {
    file: 'gryd-groupe-hommes-course-pluie-brique.jpg',
    alt: {
      fr: 'Photo GRYD : un groupe de coureurs sous la pluie devant un mur de brique',
      en: 'GRYD photograph: a group of runners in the rain in front of a brick wall',
    },
    scene: {
      fr: 'Six coureurs de profil sous une pluie visible, bitume trempé, mur de brique gris, semelles chartreuse.',
      en: 'Six runners in profile under visible rain, soaked tarmac, grey brick wall, chartreuse soles.',
    },
    suggestedUse: ['crewVide', 'webAccueil'],
  },
  {
    file: 'gryd-crew-pause-cafe-terrasse.jpg',
    alt: {
      fr: 'Photo GRYD : cinq membres du crew en pause devant une terrasse de café',
      en: 'GRYD photograph: five crew members taking a break outside a café terrace',
    },
    scene: {
      fr: 'Après la sortie : deux hommes debout de dos, trois coureuses assises au comptoir, gobelets à la main, lumière rasante.',
      en: 'After the run: two men standing with their backs turned, three women seated at the counter, cups in hand, low light.',
    },
    suggestedUse: ['crewVide', 'partage'],
  },
  {
    file: 'gryd-foule-place-depart-collectif.jpg',
    alt: {
      fr: 'Photo GRYD : une foule de coureurs rassemblée sous les arbres avant le départ',
      en: 'GRYD photograph: a crowd of runners gathered under the trees before the start',
    },
    scene: {
      fr: 'Densité maximale : des dizaines de coureurs en noir sur une allée arborée, mouvement de foule, quelques touches chartreuse.',
      en: 'Maximum density: dozens of runners in black on a tree lined path, crowd movement, a few chartreuse touches.',
    },
    suggestedUse: ['crewVide', 'webAccueil', 'appStore'],
  },
  {
    file: 'gryd-materiel-sol-apres-course-medailles.jpg',
    alt: {
      fr: 'Photo GRYD : médailles, chaussures et gourdes posées au sol après la course',
      en: 'GRYD photograph: medals, shoes and bottles laid on the floor after the run',
    },
    scene: {
      fr: 'Plancher de bois vu de haut, cercle de jambes assises, deux médailles à ruban, chaussures usées, gourdes et repas posés.',
      en: 'Wooden floor seen from above, a circle of seated legs, two ribboned medals, worn shoes, bottles and food.',
    },
    suggestedUse: ['partage', 'appStore'],
  },
];

/**
 * Le dossier qui les contient, relatif à la racine du dépôt. Les photos de
 * stock n'ont pas de `source` : c'est par ce CHEMIN qu'on les désigne tant
 * qu'aucun écran ne les affiche (copie vers `apps/web/public/`, planche de
 * direction artistique, capture App Store).
 */
export const dossierPhotosGryd2026 = 'apps/mobile/assets/photos/';

/** Le chemin complet d'une photo, depuis la racine du dépôt. */
export function cheminPhotoGryd2026(photo: Photo2026): string {
  return `${dossierPhotosGryd2026}${photo.file}`;
}

/** Retrouve une photo par son nom de fichier. `undefined` si elle n'existe pas. */
export function photoGryd2026(file: string): Photo2026 | undefined {
  return photothequeGryd2026.find((photo) => photo.file === file);
}

/** La seule photo de la photothèque que le binaire embarque aujourd'hui. */
export const photoHerosProfil2026: PhotoEmbarquee2026 = HEROS_PROFIL;
