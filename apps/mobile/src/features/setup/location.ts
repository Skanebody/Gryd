/**
 * GRYD — E08 : LIRE la position, sur la plateforme courante. Rien d'autre.
 *
 * ─── POURQUOI CE FICHIER EXISTE (et pourquoi il a un jumeau `.web.ts`) ──────
 * `mvp/run/gpsProvider.ts` porte en tête « fichier natif uniquement » : il
 * importe `expo-task-manager`, qui n'a pas de support web. L'importer depuis une
 * ROUTE le mettrait dans le bundle navigateur — c'est exactement la faute que
 * `MapScreen.web.tsx:112-117` documente et corrige de son côté en tapant dans
 * `features/map/webGeolocation.ts`.
 *
 * E08 n'a pas de variante `.web.tsx` (l'écran est strictement le même partout,
 * seule la lecture du capteur change), donc la séparation se fait ICI, au plus
 * petit endroit possible : deux ré-exports, une résolution par Metro
 * (`location.ts` natif / `location.web.ts` web). Même patron que
 * `session.tsx` / `session.web.tsx` et `registerBackgroundTask.ts` / `.web.ts`.
 *
 * ─── CE QUE CETTE SURFACE N'EXPOSE PAS, ET C'EST LE POINT ───────────────────
 * PAS de `requestForegroundPermission`. E08 LIT la permission, il ne la DEMANDE
 * jamais : la boîte système appartient à E05 (où elle est annoncée, après trois
 * garanties lues) et au premier GO. La faire tomber ici, dans la seconde qui
 * suit la création du compte, serait le défaut corrigé sur la carte le
 * 21/07/2026 — une invite système venue de nulle part. Ne pas l'exporter est ce
 * qui rend ce contrat vérifiable au lieu d'être une promesse en commentaire.
 */
export {
  checkForegroundPermission,
  getCurrentPositionOnce,
} from '../../mvp/run/gpsProvider';
