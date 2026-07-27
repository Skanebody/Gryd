/**
 * GRYD — LE DIAGNOSTIC D'ENREGISTREMENT PUSH, ISOLÉ DE SES DÉPENDANCES NATIVES.
 *
 * POURQUOI CE FICHIER EXISTE. `PushStatus` vivait dans `push.ts`, qui importe
 * `react-native`, `expo-constants` et `@react-native-async-storage` — des
 * modules que Deno ne sait pas type-vérifier. Toute règle PURE portant sur ce
 * type était donc intestable : importer le type suffisait à traîner tout le
 * graphe natif dans `npm run test:mobile`. Le type descend ici, sans une seule
 * dépendance ; `push.ts` le RÉ-EXPORTE, donc aucun appelant ne change.
 *
 * C'est le même geste que partout dans le dépôt : la règle est pure et testée,
 * l'I/O reste au-dessus.
 */

/** Diagnostic d'enregistrement — chaque valeur a un message d'écran distinct. */
export type PushStatus =
  /** Pas encore tenté sur cet appareil. */
  | 'idle'
  /** Web / preview : il n'y a pas de push à activer ici. */
  | 'unsupported'
  /** Module natif absent du build installé (ajout postérieur). */
  | 'module_missing'
  /** Le joueur a refusé — c'est un choix, pas une panne. */
  | 'permission_denied'
  /** Pas de backend / pas de session : rien à enregistrer côté serveur. */
  | 'not_configured'
  /**
   * Le service de push n'a délivré aucun token : build sans credentials APNs
   * ou FCM, ou simulateur. C'est l'étape qui attend le fondateur.
   */
  | 'unavailable'
  /** Le serveur a refusé l'enregistrement (réseau, RLS, session expirée). */
  | 'error'
  /** L'appareil recevra les notifications de ses canaux actifs. */
  | 'registered';

/** Tous les statuts, dans l'ordre du cycle de vie. La liste est EXHAUSTIVE et
 *  typée : ajouter une valeur à `PushStatus` sans l'inscrire ici ne compile pas. */
export const PUSH_STATUSES: readonly PushStatus[] = [
  'idle',
  'unsupported',
  'module_missing',
  'permission_denied',
  'not_configured',
  'unavailable',
  'error',
  'registered',
];
