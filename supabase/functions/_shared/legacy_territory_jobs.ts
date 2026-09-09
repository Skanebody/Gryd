/**
 * GRYD — LES TROIS CRONS DU JEU TERRITORIAL D'AVANT SONT DÉSACTIVÉS.
 *
 * ─── CE QUI A CHANGÉ SOUS EUX ──────────────────────────────────────────────
 * `decay_job`, `steal_push_job` et `digest_job` lisent tous `hex_claims` et en
 * tirent des messages : « ton territoire s'efface bientôt », « on t'a pris une
 * zone », « 3 zones défendues, 1 zone perdue ». Deux choses les ont rendus
 * faux, et aucune n'est réparable dans le job :
 *
 *  1. LA MIGRATION 0118. Le trigger `prevent_legacy_hex_capture_2026` LÈVE dès
 *     qu'une activité `ruleset_version = '2026.1'` tenterait d'écrire dans
 *     `hex_claims` ou `territories`. Toute activité nouvelle est en 2026.1 :
 *     ces tables ne reçoivent donc plus rien, et ce qu'elles contiennent est
 *     une ARCHIVE. Un cron qui « neutralise » une archive détruit une mémoire ;
 *     un cron qui pousse une alerte à son sujet parle d'un monde disparu.
 *
 *  2. LE CAHIER §5.3 ET §14.2. « Il n'y a ni bouclier, ni contestation de
 *     18 heures, ni défense achetable, ni dette de connexion » : rien ne
 *     s'efface, donc l'alerte d'effacement n'a plus d'objet. Et « une reprise
 *     de terrain par un rival alimente le journal du jeu et le résumé choisi,
 *     PAS une alarme immédiate » : l'alerte de vol est explicitement interdite.
 *
 * ─── POURQUOI DÉSACTIVER PLUTÔT QUE SUPPRIMER ──────────────────────────────
 * Les trois fonctions restent déployées et gardent leurs tests. Les supprimer
 * effacerait la seule description exécutable de ce que le jeu FAISAIT, et une
 * fonction Edge retirée du dépôt ne disparaît pas du projet Supabase pour
 * autant : elle continuerait de répondre au scheduler avec l'ancien code. Une
 * garde EN TÊTE DE HANDLER, elle, est déployable et vérifiable.
 *
 * ─── LA GARDE DÉRIVE DU CAHIER, PAS D'UN BOOLÉEN LOCAL ─────────────────────
 * `NOTIFICATION_RULES_2026.territoryDecayPush` et `.immediateTerritoryLossPush`
 * valent `false` dans `packages/shared/src/game-rules.ts`. Le jour où une règle
 * de jeu réhabiliterait l'une des deux, il faudra la remettre à `true` LÀ-BAS —
 * c'est-à-dire dans la constitution des constantes, pas dans un cron.
 */
import { NOTIFICATION_RULES_2026 } from './game-rules.ts';

/** Ce que le handler rend quand il refuse de tourner. Explicite, jamais un 500. */
export interface LegacyJobDisabled {
  disabled: true;
  /** La règle du cahier qui l'éteint — lisible dans les logs du scheduler. */
  reason: string;
  /** La migration qui a gelé la table que ce job lisait. */
  frozenBy: '0118';
}

/**
 * `decay_job` doit-il refuser de tourner ? Il neutralise des `hex_claims` et
 * pousse « ton territoire s'efface » — la mécanique supprimée par §5.3.
 */
export function decayJobDisabled(): LegacyJobDisabled | null {
  if (NOTIFICATION_RULES_2026.territoryDecayPush) return null;
  return { disabled: true, reason: 'cahier_5_3_no_decay', frozenBy: '0118' };
}

/**
 * `steal_push_job` doit-il refuser de tourner ? Il draine `steal_push_queue`
 * pour pousser « on t'a pris une zone » — l'alarme immédiate interdite par
 * §14.2. Le journal du jeu et le résumé choisi la remplacent.
 */
export function stealPushJobDisabled(): LegacyJobDisabled | null {
  if (NOTIFICATION_RULES_2026.immediateTerritoryLossPush) return null;
  return { disabled: true, reason: 'cahier_14_2_no_immediate_loss_alarm', frozenBy: '0118' };
}

/**
 * `digest_job` doit-il refuser de tourner ? Son résumé est bâti sur des zones
 * défendues et perdues (`hex_claims`), des boosts de crew, des frontières
 * partielles et des bonus ciblés — tout ce que la refonte a retiré. §14.1 garde
 * un « résumé hebdomadaire », mais il devra être construit sur les faits 2026
 * (`ownership_2026`, `progress_*_2026`) et passer par `can_notify_2026`.
 * Rebrancher CELUI-CI reviendrait à raconter au joueur la semaine d'un autre jeu.
 */
export function digestJobDisabled(): LegacyJobDisabled | null {
  if (NOTIFICATION_RULES_2026.territoryDecayPush) return null;
  return { disabled: true, reason: 'cahier_14_1_digest_rebuilt_on_2026_facts', frozenBy: '0118' };
}
