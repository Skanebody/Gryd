/**
 * GRYD — MÉTADONNÉES DES SOUS-PAGES DE RÉGLAGES. Une seule chose, une seule fois.
 *
 * ═══ CE QUI A ÉTÉ SUPPRIMÉ LE 10/09/2026, ET POURQUOI ═══════════════════════
 * Ce fichier portait aussi `SETTINGS_GROUPS` : trois groupes, une vingtaine de
 * lignes, leurs `href`, leurs icônes, leurs détails i18n, et deux conditions
 * `flags.paidOffer` / `flags.arsenal` avec leur commentaire ADR-011.
 * PERSONNE NE LE RENDAIT. `app/parametres.tsx` réécrit sa propre liste depuis
 * le 09/09 ; seuls les TITRES DE SOUS-PAGES d'ici étaient encore lus, par
 * `app/parametres/[section].tsx`.
 *
 * Ce n'était pas seulement du code mort : c'était une DEUXIÈME VÉRITÉ. Les deux
 * listes avaient déjà divergé (libellés, ordre, destinations), et surtout
 * `sections.test.ts` prouvait « les portes de dernier recours existent » sur la
 * liste QUE PERSONNE NE VOIT — un vert qui ne prouvait rien de ce que l'écran
 * affiche. Le catalogue mort est donc parti ; la liste vit dans l'écran, et ce
 * fichier ne garde que ce qui est réellement lu : le titre, le détail et
 * l'icône de chaque sous-page.
 *
 * `/mes-parcours` n'était référencée que par ce catalogue mort : elle est
 * désormais peinte dans `app/parametres.tsx`, donc atteignable pour de vrai.
 *
 * ═══ HUIT SLUGS → TROIS (10/09/2026, LOT RÉGLAGES ET PROFIL) ════════════════
 * `profil`, `crew`, `carte`, `apropos`, `avance` ne décrivaient plus une
 * sous-page : `app/parametres/[section].tsx` les intercepte par un `<Redirect>`
 * avant tout rendu, et leurs branches JSX viennent d'être supprimées. Garder
 * leur titre ici aurait entretenu le catalogue d'un écran qui n'existe plus —
 * exactement la « deuxième vérité » que ce fichier a déjà payée une fois.
 * Les redirections, elles, restent : ce sont des liens profonds, pas des pages.
 *
 * Aucun nombre, aucune constante de jeu ici : navigation et texte seulement.
 */
import type { IconName } from '@klaim/shared';
import { C } from '../../i18n/catalog/reglages';
import type { Entry } from '../../i18n/types';

/** Slug d'une sous-page interne rendue par app/parametres/[section].tsx. */
export type SettingsSectionId = 'compte' | 'course' | 'notifications';

export interface SettingsSectionMeta {
  /** Libellé — `Entry` i18n, jamais une chaîne déjà résolue (règle 17). */
  label: Entry;
  /** Une ligne = un sous-titre court, jamais un paragraphe. */
  detail: Entry;
  icon: IconName;
}

/**
 * Le titre de chaque sous-page. Le SLUG `course` reste (URL déjà installée) ;
 * son LIBELLÉ ne dit pas « Course » : la sous-page règle le style de jeu, les
 * haptiques et les unités de TOUTE sortie, vélo compris.
 */
export const SETTINGS_SECTIONS: Readonly<Record<SettingsSectionId, SettingsSectionMeta>> = {
  compte: { label: C.rowCompte, detail: C.rowCompteDetail, icon: 'profil' },
  course: { label: C.rowActivite, detail: C.rowActiviteDetail, icon: 'route' },
  notifications: { label: C.rowNotifs, detail: C.rowNotifsDetail, icon: 'cloche' },
};

/** Titre/détail/icône d'une sous-page. `undefined` reste possible pour un slug
 * inconnu venu de l'URL : l'écran retombe alors sur son titre générique. */
export function settingsRowBySection(id: SettingsSectionId): SettingsSectionMeta | undefined {
  return Object.hasOwn(SETTINGS_SECTIONS, id) ? SETTINGS_SECTIONS[id] : undefined;
}
