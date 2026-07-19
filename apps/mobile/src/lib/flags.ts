/**
 * GRYD — D8 (MVP_CHANGESET) : feature flags MINIMAUX du pilote fermé.
 *
 * Surface MVP = Carte · Crew · Profil · Run · Résultat · Partage. Tout le
 * reste (Saison/classement, Missions/War Room, Arsenal/boutique) est MASQUÉ :
 * on cache la SURFACE (onglet, liens, route), on ne casse JAMAIS les moteurs —
 * saison/points/badges continuent d'accumuler côté serveur et seront
 * ré-affichés d'un flip de flag, avec l'historique intact.
 *
 * Un seul interrupteur env (pas un système de flags distant — MVP) :
 * EXPO_PUBLIC_FULL_SURFACE=1 ré-affiche tout (tests internes, démos).
 * Lecture statique au bundle (contrainte Expo : les env EXPO_PUBLIC_* sont
 * inlinées) — pas de flip à chaud, c'est assumé pour un pilote.
 */
const FULL_SURFACE = process.env.EXPO_PUBLIC_FULL_SURFACE === '1';

/**
 * VITRINE vs VRAI PRODUIT (retour terrain fondateur, 20/07/2026 — 1er test sur
 * iPhone : « je suis à Ouville-la-Rivière, l'app me met à République avec des
 * zones déjà prises »). La démo (territoires peints, missions, rivaux, POI,
 * villes) n'a le droit d'exister QUE sur la vitrine web (preview/showcase, où
 * aucune géoloc réelle n'existe). Sur l'app NATIVE installée, c'est un VRAI
 * produit : données réelles ou VIDES, jamais fabriquées — peu importe qu'une
 * session existe ou non (« l'app ne ment jamais »).
 */
import { Platform } from 'react-native';

export const isShowcasePlatform = Platform.OS === 'web';

export const flags = {
  /** Onglet Saison + classements de saison (les scores s'accumulent quand même). */
  season: FULL_SURFACE,
  /** Missions / War Room (la route (tabs)/warroom et ses liens d'entrée). */
  warRoom: FULL_SURFACE,
  /** Arsenal / boutique (skins, objets capés, GRYD Club). */
  arsenal: FULL_SURFACE,
} as const;
