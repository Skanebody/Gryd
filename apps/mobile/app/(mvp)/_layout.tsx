/**
 * GRYD — groupe de routes de l'UI MVP (ADR-001, lot M2).
 *
 * ─── POURQUOI UN GROUPE À PART, ET PAS UN REMPLACEMENT EN PLACE ─────────────
 * Les écrans legacy sont en quarantaine LOGIQUE : on ne les lit pas, on ne les
 * importe pas. Mais l'app doit rester utilisable pendant toute la Phase 1 —
 * remplacer écran par écran casserait le parcours entre deux lots, et il n'y a
 * pas de branche de repli puisque `main` est la branche de travail.
 *
 * Les huit écrans du MVP se construisent donc ICI, à côté, et la bascule sera
 * UN changement de route d'entrée, une fois les huit passés sous `ux-gate`.
 * Tant que ce n'est pas fait, ce groupe n'est atteint que par une URL directe :
 * aucun joueur n'y tombe par accident, aucun écran à moitié fini n'est exposé.
 *
 * `headerShown: false` : la scène porte son propre titre (L12, un chiffre/titre
 * héros par écran) — un header système ajouterait une seconde hiérarchie.
 */
import { Stack } from 'expo-router';
import { colors } from '@klaim/shared';

/**
 * ⚠️ LES ÉCRANS DONT ON NE SORT PAS PAR UN GESTE.
 *
 * Le geste de retour iOS est ACTIF par défaut sur une pile native. Or la pile
 * réelle est `carte → push('/prete') → replace('/course')` : `course` est donc
 * empilé directement sur `carte`, et un effleurement du bord gauche — en
 * sortant le téléphone de sa poche, en pleine course — DÉMONTE l'écran. Le
 * suivi s'arrête (`stopBackgroundUpdates`), et le coureur n'a rien décidé.
 *
 * La trace n'est pas perdue (le buffer la propose en « course interrompue »),
 * mais c'est un accident silencieux sur l'écran le plus long du produit. Le HIG
 * demande de couper le geste quand la sortie est destructive : une activité en
 * cours se présente comme un moment à part, pas comme une page qu'on feuillette.
 *
 * `resultat` suit la même règle pour la raison inverse : revenir en arrière y
 * ramènerait sur une course déjà close et déjà envoyée.
 */
const SANS_GESTE_RETOUR = ['prete', 'course', 'resultat'] as const;

export default function MvpLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.noir },
        // L14 : pas d'animation coûteuse entre deux écrans d'onboarding.
        animation: 'fade',
      }}
    >
      {SANS_GESTE_RETOUR.map((nom) => (
        <Stack.Screen key={nom} name={nom} options={{ gestureEnabled: false }} />
      ))}
    </Stack>
  );
}
