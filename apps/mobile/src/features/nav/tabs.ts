/**
 * GRYD — LES TROIS DESTINATIONS DE LA BARRE BASSE (spec §2.1, arbitrage A2,
 * LOT 5 — 27/07/2026).
 *
 * ─── CE QUI CHANGE ────────────────────────────────────────────────────────
 * Avant ce chantier, `GrydNavBar` ajoutait CONDITIONNELLEMENT un 4ᵉ onglet
 * (« Saison » → /classement) dès que `flags.season` valait `true` — et ce
 * drapeau vaut `true` depuis la Vague 1 (26/07/2026, cf. `lib/flags.ts`,
 * « VISIBLE PAR DÉFAUT DEPUIS LA VAGUE 1 »). La barre montrait donc RÉELLEMENT
 * quatre destinations (Carte · Crew · Saison · Profil), en contradiction avec
 * §2.1 de la spec unifiée, catégorique : la barre basse a EXACTEMENT trois
 * onglets, toujours — pas un interrupteur qui peut en ajouter un 4ᵉ.
 *
 * « Saison » n'est PAS retirée du jeu : `/classement` reste un ÉCRAN et une
 * ROUTE entiers (fichier `app/(tabs)/classement.tsx`, toujours déclaré dans
 * `_layout.tsx` pour ses métadonnées de titre) — seule sa PRÉSENCE DANS LA
 * BARRE disparaît. Le Profil porte les chemins qui y mènent (raccourci
 * « Saison › » de la liste de liens + lien de la section Progression, tous
 * deux déjà présents dans `app/(tabs)/profil.tsx`, gardés par `flags.season`).
 * « Missions » (`/warroom`) n'a JAMAIS été dans la barre — rien ne change pour
 * cette route ici.
 *
 * PUR : aucune dépendance react-native/expo-router — testable sous Deno
 * (`npm run test:mobile`). `GrydNavBar.tsx` consomme CE module comme source
 * unique de ses destinations, pour qu'un test sur ce fichier fasse foi sur ce
 * qui est réellement rendu (pas une liste dupliquée qui pourrait diverger).
 */
import type { IconName } from '@klaim/shared';
import { C } from '../../i18n/catalog/nav';
import type { Entry } from '../../i18n/types';

export interface NavTabDef {
  /** Route expo-router EXACTE (comparée par égalité stricte au pathname). */
  readonly href: string;
  readonly icon: IconName;
  /** `null` = libellé INVARIANT (jamais traduit) — c'est le cas de « Crew ». */
  readonly label: Entry | null;
}

/** Libellé invariant de l'onglet Crew — jamais traduit (concept produit). */
export const CREW_LABEL = 'Crew';

/**
 * EXACTEMENT trois — ne JAMAIS en ajouter un 4ᵉ ici, flag ou pas (spec §2.1).
 * L'ORDRE est celui de la barre : Carte · Crew · Profil.
 */
export const NAV_TABS: readonly NavTabDef[] = [
  { href: '/', icon: 'carte', label: C.tabCarte },
  { href: '/crew', icon: 'crew', label: null },
  { href: '/profil', icon: 'profil', label: C.tabMoi },
];

/** Résout le libellé d'un onglet : invariant tel quel, sinon traduit via `t`. */
export function resolveTabLabel(tab: NavTabDef, t: (entry: Entry) => string): string {
  return tab.label === null ? CREW_LABEL : t(tab.label);
}

/** Un onglet est actif ssi le pathname courant est EXACTEMENT sa route. */
export function isTabActive(pathname: string, href: string): boolean {
  return pathname === href;
}

/**
 * Nombre d'onglets actifs pour un pathname donné parmi `tabs`. Doit TOUJOURS
 * valoir 0 (route hors barre, ex. /classement, /warroom) ou 1 (jamais deux
 * onglets actifs à la fois — l'état actif est une couleur+trait+icône pleine,
 * il ne peut pas être ambigu).
 */
export function activeTabCount(pathname: string, tabs: readonly NavTabDef[] = NAV_TABS): number {
  return tabs.filter((tab) => isTabActive(pathname, tab.href)).length;
}
