/**
 * GRYD — L'ÉCRAN NE S'ÉTEINT PAS PENDANT UNE SORTIE (LOT R, 11/09/2026).
 *
 * ─── CE QUE ÇA RÉPARE ───────────────────────────────────────────────────────
 * L'écran de course s'éteignait après le délai système (30 s par défaut sur
 * iPhone). Toute app de course garde l'écran allumé pendant l'enregistrement —
 * c'est même la première chose qu'on remarque quand elle ne le fait pas : on
 * regarde son allure, l'écran est noir, on rallume, on a perdu trois secondes
 * et l'information qu'on cherchait.
 *
 * Ce n'est PAS l'enregistrement en arrière-plan (qui, lui, demande la permission
 * « Toujours » et vit dans `useRealRunCore`) : la mesure continuait déjà écran
 * éteint quand cette permission est accordée. C'est le CONFORT DE LECTURE, et
 * il ne coûte aucune permission.
 *
 * ─── CHARGEMENT DÉFENSIF, MÊME DOCTRINE QUE `voice.ts` ET `lib/haptics.ts` ──
 * `expo-keep-awake` vient d'être ajouté aux dépendances : AUCUN build déjà
 * installé sur un appareil n'a son module natif, et `requireNativeModule` jette
 * au chargement quand il manque. Un import statique ferait tomber l'écran de
 * COURSE sur ces builds-là. Garder l'écran allumé est un confort ; il ne peut
 * pas coûter une sortie. Sans module, le hook est un no-op silencieux et
 * l'écran s'éteindra comme avant — rien n'est promis nulle part à ce sujet.
 *
 * ⚠️ Un build EAS est nécessaire pour que le module natif existe sur l'appareil.
 * Au navigateur, `expo-keep-awake` s'appuie sur l'API Wake Lock : elle n'existe
 * pas partout, et son absence est, là aussi, un no-op.
 */

/** La part d'`expo-keep-awake` qu'on utilise — le reste n'a pas à être typé ici. */
interface KeepAwakeModule {
  useKeepAwake(tag?: string): void;
}

let mod: KeepAwakeModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  mod = require('expo-keep-awake') as KeepAwakeModule;
} catch {
  mod = null;
}

/**
 * Garde l'écran allumé tant que le composant appelant est monté.
 *
 * `TAG` nommé plutôt qu'implicite : `useKeepAwake()` sans étiquette en génère
 * une par composant, si bien qu'un remontage de l'écran (rotation, retour de la
 * carte) laisserait un verrou orphelin sous l'ancienne. Une étiquette stable
 * garantit qu'il n'existe jamais qu'UN verrou, et qu'il tombe avec l'écran.
 *
 * ⚠️ C'est un HOOK : l'appeler inconditionnellement, comme n'importe quel hook.
 * La branche « module absent » n'appelle aucun hook du tout, ce qui est légal
 * parce que `mod` est figé au chargement du module et ne change jamais pendant
 * la vie de l'application — l'ordre des hooks reste identique à chaque rendu.
 */
export function useKeepScreenAwake2026(): void {
  mod?.useKeepAwake(TAG);
}

const TAG = 'gryd-course-live';
