/**
 * GRYD — point d'entrée de l'application.
 *
 * ─── POURQUOI CE FICHIER EXISTE (crash mesuré le 11/09/2026) ─────────────────
 * Le TextDecoder du runtime Expo (`expo/src/winter`, chargé par Metro avant le
 * module principal) ne connaît que l'UTF-8. h3-js (Emscripten) évalue à l'import
 * `new TextDecoder("utf-16le")` : sans le wrapper `src/lib/textDecoderUtf16`,
 * l'app meurt avant le premier écran (« RangeError: Unknown encoding: utf-16le »,
 * lu sur la console de l'iPhone via `xcrun devicectl … launch --console`).
 *
 * Le wrapper était importé en 2ᵉ position de `app/_layout.tsx`. C'était trop
 * tard : expo-router charge chaque `_layout` dans l'ordre des chemins pour lire
 * `unstable_settings` (`getDirectoryTree` → `getLayoutNode` → `loadRoute()`),
 * et `(tabs)/_layout.tsx` passe AVANT `_layout.tsx`. Depuis la barre de
 * navigation unique (commit e9b7d70), `(tabs)/_layout` atteint h3-js
 * (GrydNavBar → useRunAction2026 → mapPref → mapStyle → sectorView) : tous les
 * builds iOS depuis le 11/09 après-midi plantaient au lancement.
 *
 * Ici, le wrapper précède expo-router, donc tout module de route. `expo` est
 * importé d'abord : c'est lui (`Expo.fx` → `winter`) qui installe le TextDecoder
 * d'Expo que le wrapper enveloppe ; dans l'ordre inverse, une réinstallation
 * écraserait le wrapper. L'ordre de ces trois lignes est gardé par
 * `src/lib/textDecoderUtf16.entry.test.ts`.
 */
import 'expo';
import './src/lib/textDecoderUtf16';
import 'expo-router/entry';
