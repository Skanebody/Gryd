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

export default function MvpLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.noir },
        // L14 : pas d'animation coûteuse entre deux écrans d'onboarding.
        animation: 'fade',
      }}
    />
  );
}
