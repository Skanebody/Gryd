/**
 * GRYD — L'IDENTITÉ DE REPLI D'UN JOUEUR, EN FONCTIONS PURES (26/07/2026).
 *
 * ─── CE QUE CE CODE FAIT VRAIMENT, ET QUI N'ÉTAIT ÉCRIT NULLE PART ──────────
 * Ces deux valeurs ne sont JAMAIS persistées et ne partent JAMAIS au serveur :
 * `profileStore.defaultEditable()` rend un `displayName` et un `handle` VIDES,
 * et `saveProfile()` n'écrit que ce que le joueur a tapé dans /profil-edit.
 * Ce sont des REPLIS D'AFFICHAGE, recalculés à chaque rendu — donc dépendants
 * de la langue courante, puisque le mot de repli vient du catalogue i18n.
 *
 * C'est exactement pourquoi le mot de repli et le @handle doivent changer
 * ENSEMBLE, et jamais à moitié : le pseudo affiché est DÉRIVÉ du nom affiché.
 *
 * ─── LE DÉFAUT QUE L'EXTRACTION MET AU JOUR ─────────────────────────────────
 * Le filtre du @handle est ASCII (`a-z0-9_`, HANDLE_REGEX, base 0011). Avec
 * l'ancien mot allemand « Läufer », il produisait « lufer » : le « ä » était
 * SUPPRIMÉ, pas translittéré. Un joueur germanophone sans nom de compte voyait
 * donc un pseudo qui ne veut rien dire dans aucune langue. Les cinq mots de
 * repli actuels (Joueur / Player / Jugador / Spieler / Jogador) traversent le
 * filtre intacts, et `playerHandle.test.ts` le VÉRIFIE pour les 5 langues :
 * une traduction future qui mutilerait le pseudo échoue au test.
 *
 * ─── OÙ CE REPLI EST VISIBLE, ET OÙ IL NE L'EST PAS ─────────────────────────
 * Il s'affiche sur l'onglet Profil (ProfileHero). Il ne s'affiche PAS comme une
 * identité PARTAGEABLE : `app/amis.tsx:64` et `app/qr.tsx:87` exigent
 * `editable.handle` non vide OU une session — un joueur non connecté ne voit
 * donc jamais ce repli présenté comme « son » code à montrer.
 *
 * PUR : aucun React, aucun i18n, aucun réseau — Deno-testable.
 */
import { HANDLE_REGEX } from '@klaim/shared';

/**
 * Réduit un texte libre à l'alphabet technique du @handle (base 0011).
 *
 * ⚠️ Les caractères hors ASCII sont SUPPRIMÉS, pas translittérés : « Läufer »
 * → « lufer ». C'est le comportement historique et on ne le change pas ici —
 * une translittération serait une règle de plus à maintenir dans 5 langues.
 * On choisit à la place des mots de repli qui n'en ont pas besoin.
 */
export function sanitizeHandle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
}

/** Ultime filet, jamais localisé : il ne sert que si tout le reste est vide. */
export const LAST_RESORT_HANDLE = 'player';

/** Ce que la session (et la langue) permettent de savoir de l'identité. */
export interface IdentityInput {
  /** Nom du compte (user_metadata.full_name ?? .name), s'il existe. */
  accountName?: string | undefined;
  /** Préfixe de l'e-mail de session, s'il existe. */
  emailPrefix?: string | undefined;
  /** Mot de repli TRADUIT (« Joueur »/« Player »/…), jamais vide. */
  fallbackName: string;
}

/**
 * PURE. Nom affiché + @handle de repli.
 *
 * Ordre du NOM : nom de compte → préfixe e-mail → mot de repli traduit.
 * Ordre du HANDLE : préfixe e-mail → nom affiché → mot de repli → dernier
 * filet. Le préfixe e-mail passe AVANT parce qu'il est stable d'une langue à
 * l'autre : un joueur connecté ne voit pas son @ changer quand il change la
 * langue de son téléphone. Le repli traduit, lui, change — c'est assumé : il
 * ne désigne personne en particulier et n'est jamais partagé comme un code.
 */
export function fallbackIdentity(input: IdentityInput): {
  displayName: string;
  handle: string;
} {
  const fallbackName = input.fallbackName.trim();
  const accountName = (input.accountName ?? '').trim();
  const emailPrefix = (input.emailPrefix ?? '').trim();
  const displayName = accountName || emailPrefix || fallbackName;
  const handle =
    sanitizeHandle(emailPrefix || displayName) ||
    sanitizeHandle(fallbackName) ||
    LAST_RESORT_HANDLE;
  return { displayName, handle };
}

/** PURE. Le @handle produit est-il acceptable par la base (regex 0011) ? */
export function isUsableHandle(handle: string): boolean {
  return HANDLE_REGEX.test(handle);
}
