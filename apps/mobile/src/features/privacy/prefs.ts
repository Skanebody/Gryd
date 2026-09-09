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
 *
 * ═══ ONZIÈME RÉGLAGE PARTI LE 10/09/2026 : `profileVisibility` ══════════════
 * Il est devenu une décision SERVEUR. `user_profiles.profile_visibility` existe
 * depuis 0011 et `territory_owner_identity_2026` (0126) la LIT pour décider si
 * le nom du propriétaire d'un territoire s'affiche chez un autre joueur : un
 * miroir AsyncStorage à côté n'était pas un réglage, c'était une seconde source
 * de vérité que le serveur ignorait. La lecture et l'écriture vivent désormais
 * dans `./audience.ts` + `./audienceStore.ts` (RPC 0135). Ce module ne garde que
 * ce qui est VRAIMENT local : le masquage appliqué au moment du partage.
 *
 * Le toggle maître « Mode privé » a disparu avec eux : verrouiller « tout » quand
 * il ne reste que deux réglages n'est plus une commande, c'est une figure de
 * style — et sa card affirmait « tout est verrouillé » sur un `every()` de
 * valeurs purement LOCALES, alors que rien n'est envoyé au serveur.
 */
/** Préférences de confidentialité persistées — uniquement ce qui AGIT ICI. */
export interface PrivacyPrefs {
  /**
   * Masquer départ & arrivée sur la trace PARTAGÉE. Seul réglage de la page qui
   * a un effet observable aujourd'hui (`app/partage.tsx`).
   */
  maskEndpoints: boolean;
}

/**
 * Défaut — le plancher qui ne s'ouvre pas.
 *
 * `maskEndpoints` reste FERMÉ. Le départ et l'arrivée d'une course révèlent
 * l'ADRESSE du coureur — c'est le risque documenté n°1 des apps de running. Une
 * trace publique est acceptable ; une trace publique qui commence sur le
 * paillasson ne l'est pas. L'utilisateur peut l'ouvrir lui-même, en connaissance
 * de cause ; l'app ne le fait pas à sa place.
 */
export const DEFAULT_PRIVACY: PrivacyPrefs = {
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
  return {
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
