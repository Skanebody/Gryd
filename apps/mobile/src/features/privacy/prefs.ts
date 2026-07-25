/**
 * GRYD — PRÉFÉRENCES DE CONFIDENTIALITÉ : la forme, les défauts, la lecture.
 * Module PUR (zéro import React / React Native / AsyncStorage) : il est donc
 * testable sous Deno, et c'est là que vit la seule logique subtile de la page.
 *
 * ═══ POURQUOI CE FICHIER A RÉTRÉCI DE DIX RÉGLAGES ═══════════════════════════
 * L'écran Confidentialité portait QUINZE préférences. Une recherche sur tout le
 * dépôt en a trouvé DIX sans le moindre consommateur hors du store et de l'écran
 * lui-même : `livePosition`, `territoryVisible`, `heartRatePrivate`,
 * `sportDataPrivate`, `whoCanAdd`, `whoCanInvite`, `whoCanMessage`,
 * `whoSeesStatus`, `runVisibility`, plus `maskRadius` / `maskHome` / `maskWork`.
 * Des interrupteurs sans effet, sur la page qui promet de gouverner l'exposition
 * de la géolocalisation. « Rayon de flou · 1 km » masquait 200 m — le seul
 * appelant (`app/partage.tsx`) appelle `applySharePrivacy(trace)` SANS `trimM`,
 * donc toujours `SHARE_TRIM_M`. « Autour du domicile » était inopérable par
 * construction : aucun écran ne permet de déclarer une adresse.
 *
 * La règle est sans ambiguïté : soit on câble, soit on retire. Le câblage exige
 * un miroir serveur (O1) qui n'existe pas — un réglage qui ne quitte jamais le
 * téléphone ne peut pas être respecté par un serveur. Donc on retire.
 *
 * ═══ CE QUI RESTE, ET POURQUOI ══════════════════════════════════════════════
 *  · `maskEndpoints` — RÉELLEMENT consommé (`app/partage.tsx` masque les
 *    extrémités de la trace partagée). C'est le seul réglage de cette page qui
 *    change quelque chose aujourd'hui.
 *  · `profileVisibility` — consommé en LECTURE par deux écrans recalés
 *    (`app/(tabs)/profil.tsx`, `app/profil-edit.tsx`) qui le REFLÈTENT et
 *    renvoient ici : le retirer laisserait deux écrans afficher une valeur que
 *    plus personne ne peut changer. L'écran dit en clair l'étendue RÉELLE de ce
 *    choix — GRYD n'expose encore aucun profil à un autre joueur.
 *
 * Le toggle maître « Mode privé » a disparu avec eux : verrouiller « tout » quand
 * il ne reste que deux réglages n'est plus une commande, c'est une figure de
 * style — et sa card affirmait « tout est verrouillé » sur un `every()` de
 * valeurs purement LOCALES, alors que rien n'est envoyé au serveur.
 */
import type { ProfileVisibility } from '@klaim/shared';

/** Les valeurs admises de `profileVisibility` (source : @klaim/shared). */
export const PROFILE_VISIBILITIES: readonly ProfileVisibility[] = [
  'public',
  'crew',
  'friends',
  'private',
];

/** Préférences de confidentialité persistées — uniquement ce qui AGIT. */
export interface PrivacyPrefs {
  /**
   * Visibilité du profil. Reflétée par le Profil et l'édition de profil ; aucune
   * exposition réelle à un autre joueur n'existe encore (l'écran le dit).
   */
  profileVisibility: ProfileVisibility;
  /**
   * Masquer départ & arrivée sur la trace PARTAGÉE. Seul réglage de la page qui
   * a un effet observable aujourd'hui (`app/partage.tsx`).
   */
  maskEndpoints: boolean;
}

/**
 * Défauts — DÉCISION FONDATEUR 20/07/2026 : « tout le monde par défaut » sur la
 * visibilité sociale (une conquête que personne d'extérieur ne voit ne recrute
 * personne), SAUF le plancher qui ne s'ouvre pas :
 *
 * `maskEndpoints` reste FERMÉ. Le départ et l'arrivée d'une course révèlent
 * l'ADRESSE du coureur — c'est le risque documenté n°1 des apps de running. Une
 * trace publique est acceptable ; une trace publique qui commence sur le
 * paillasson ne l'est pas. L'utilisateur peut l'ouvrir lui-même, en connaissance
 * de cause ; l'app ne le fait pas à sa place.
 */
export const DEFAULT_PRIVACY: PrivacyPrefs = {
  profileVisibility: 'public',
  maskEndpoints: true,
};

/** Clé AsyncStorage — inchangée : les réglages déjà posés restent lus. */
export const PRIVACY_STORAGE_KEY = 'gryd.privacy.prefs.v1';

/**
 * JSON stocké → préférences. PURE et TESTÉE.
 *
 * Elle ne fait PAS un simple `{ ...DEFAULT, ...parsed }` : les téléphones qui ont
 * déjà tourné portent en mémoire les dix réglages supprimés. Un spread les
 * ré-injecterait dans l'objet, qui les ré-écrirait au prochain patch — on
 * continuerait à persister, indéfiniment, des préférences que plus rien ne lit.
 * On PIOCHE donc les clés connues, en validant chaque valeur : une valeur
 * inconnue retombe sur le défaut plutôt que d'entrer telle quelle.
 */
export function parsePrivacyPrefs(raw: string | null): PrivacyPrefs {
  if (raw === null || raw.length === 0) return DEFAULT_PRIVACY;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return DEFAULT_PRIVACY;
  }
  if (parsed === null || typeof parsed !== 'object') return DEFAULT_PRIVACY;
  const o = parsed as Record<string, unknown>;
  const vis = o.profileVisibility;
  return {
    profileVisibility:
      typeof vis === 'string' && (PROFILE_VISIBILITIES as readonly string[]).includes(vis)
        ? (vis as ProfileVisibility)
        : DEFAULT_PRIVACY.profileVisibility,
    maskEndpoints:
      typeof o.maskEndpoints === 'boolean' ? o.maskEndpoints : DEFAULT_PRIVACY.maskEndpoints,
  };
}

/**
 * Applique un patch partiel. PURE : c'est elle qui dérive l'objet à persister,
 * garantissant que la valeur écrite est bien l'état patché (et jamais les
 * défauts d'un état React périmé).
 */
export function applyPatch(current: PrivacyPrefs, patch: Partial<PrivacyPrefs>): PrivacyPrefs {
  return { ...current, ...patch };
}
