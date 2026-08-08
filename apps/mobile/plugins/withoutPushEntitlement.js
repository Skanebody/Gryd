/**
 * GRYD — RETIRE `aps-environment` DU BUILD iOS.
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * `expo-notifications` applique son plugin de configuration DU SEUL FAIT D'ÊTRE
 * INSTALLÉ (autolinking) : retirer son entrée de `app.json` enlève l'icône et la
 * couleur, mais PAS l'entitlement. Vérifié, pas supposé — `expo prebuild` génère
 * encore `ios/GRYD/GRYD.entitlements` avec `aps-environment` après le retrait.
 *
 * Or le profil de provisioning ne porte pas la capacité Push (les étapes APNs de
 * `_note_push_perimetre3` n'ont jamais été faites côté fondateur), donc le build
 * iOS échoue en 2 min sur XCODE_BUILD_ERROR — avant même de compiler.
 *
 * ─── POURQUOI PAS AUTREMENT ─────────────────────────────────────────────────
 * · Désinstaller `expo-notifications` : le legacy en quarantaine l'importe
 *   (`features/notifications/push.ts`, `setup/permissions.tsx`, …) et le
 *   typecheck couvre tout `src/` — le gate deviendrait rouge.
 * · Ajouter la capacité Push au profil : demande un accès au portail Apple,
 *   c'est-à-dire les identifiants du fondateur. Ce n'est pas à faire à sa place.
 *
 * ─── CE QUE ÇA NE CASSE PAS ─────────────────────────────────────────────────
 * Seul le push DISTANT a besoin de cet entitlement. Les notifications LOCALES
 * continuent de fonctionner, et toute la chaîne serveur reste intacte (migration
 * 0048, `_shared/push.ts`, `_shared/expo-push.ts`, `decay_job`). Au MVP, rien
 * n'appelle tout ça : L16 est « sans objet, Phase 2 », et aucun fichier de
 * `app/(mvp)/` ou `src/mvp/` n'importe `expo-notifications`.
 *
 * ─── POUR RÉACTIVER LE PUSH ─────────────────────────────────────────────────
 * 1. Faire les étapes (1)-(3) de `_note_push_perimetre3` (clé APNs .p8 via
 *    `eas credentials`, `google-services.json` FCM, rebuild).
 * 2. Retirer ce plugin de `app.json`, remettre le bloc `expo-notifications`.
 * L'ordre compte : sans (1), remettre (2) rend le build rouge à nouveau.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (cfg) => {
    // `delete` sur une clé absente est sans effet : le jour où le push
    // reviendra, ce plugin retiré, ce fichier ne laissera aucune trace.
    delete cfg.modResults['aps-environment'];
    return cfg;
  });
};
