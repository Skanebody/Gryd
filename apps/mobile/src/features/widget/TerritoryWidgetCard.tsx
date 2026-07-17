/**
 * GRYD — widget « Mon territoire » : CARD COMPACTE (étape 2 de la spec, Profil).
 *
 * Même fondation pure que le peek de la carte (une seule logique,
 * buildRealWidgetView) — rendu compact : titre de situation + 1-2 lignes + UNE
 * action en lien. RÉEL uniquement : sans session ou sans données, le composant
 * ne rend RIEN (le profil garde ses modules démo étiquetés) — on n'ajoute pas
 * un widget démo de plus.
 */
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, radii, sizes, spacing, typography } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { useEffectOncePerState } from './useEffectOncePerState';
import { useRealTerritories } from '../map/hexClaims';
import { getLastRunResult } from '../run/runResult';
import { buildRealWidgetView, type TerritoryWidgetView } from './territoryWidget';

/** Routage MVP des actions : partage → /partage ; le reste → la Carte. */
function actOn(view: TerritoryWidgetView): void {
  track(EVENTS.territoryWidgetActionTapped, {
    widget_state: view.state,
    primary_action: view.action,
  });
  router.push(view.action === 'share' ? '/partage' : '/');
}

/** Le widget RÉEL, ou null (démo/pas de données) — le parent choisit son fallback. */
export function useTerritoryWidgetView(): TerritoryWidgetView | null {
  const { territories, isReal } = useRealTerritories();
  return useMemo(() => {
    if (!isReal || territories === null) return null;
    const lastResult = getLastRunResult();
    const ob = lastResult?.openBoundary;
    return buildRealWidgetView({
      mineAreasM2: territories
        .filter((t) => t.props.status === 'crew')
        .map((t) => t.props.areaM2),
      openBoundary: ob ? { name: ob.name, missingM: ob.missingM } : null,
      capturedInLastRun: lastResult
        ? lastResult.hexes.claimed + lastResult.hexes.stolen + lastResult.hexes.pioneer > 0
        : false,
    });
  }, [isReal, territories]);
}

export function TerritoryWidgetCard({ view }: { view: TerritoryWidgetView }) {
  useEffectOncePerState(view?.state ?? null, (state) => {
    track(EVENTS.territoryWidgetViewed, { widget_state: state });
  });

  return (
    // Pas de kicker « MON TERRITOIRE » ici : le profil porte déjà cet en-tête de
    // section juste au-dessus (audit : jamais deux fois le même titre empilés).
    <View style={styles.card} accessibilityLabel={`Mon territoire : ${view.title}`}>
      {/* Titre = DONNÉE réelle (« LENA A REPRIS RÉPUBLIQUE ») : on rétrécit pour
          tenir, jamais de coupure silencieuse (§A.9). */}
      <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
        {view.title}
      </Text>
      {view.lines.map((line) => (
        <Text key={line} style={styles.line} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.9}>
          {line}
        </Text>
      ))}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={view.ctaLabel}
        hitSlop={8}
        onPress={() => actOn(view)}
        style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
      >
        <Text style={styles.action}>{view.ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
    gap: spacing.xxs,
  },
  title: { ...typography.cardTitle, color: colors.blanc },
  line: { ...typography.body, color: colors.gris },
  // Lien d'action (anti double-CTA §A.4) — chartreuse sur fond sombre (charte).
  // Plancher tactile 44 (P1 : le lien faisait ~17 px de haut).
  actionRow: { minHeight: sizes.touchTarget, justifyContent: 'center', marginTop: spacing.xxs },
  action: { color: colors.chartreuse, fontSize: fontSizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
