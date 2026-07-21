/**
 * GRYD — onglet MISSIONS (ex-War Room).
 *
 * ─── FIN DU MODE VITRINE (décision fondateur, 21/07/2026) ────────────────────
 * Ce fichier contenait ~1 600 lignes de War Room démo : mission « défends
 * Canal », raid weekend, revanche, rapports scout, historique de guerre, rang du
 * crew, coffre, bonus — TOUT venait de `features/warroom/demo`. Ce n'étaient pas
 * des données en attente de chargement : elles étaient inventées. La branche
 * n'était atteignable que sous `isShowcasePlatform` ; hors vitrine l'écran
 * affichait déjà `WarRoomEmpty`.
 *
 * La vitrine est abandonnée → il ne reste que l'état honnête, et le fichier se
 * réduit à lui. Une mission n'a de sens que si elle décrit un terrain
 * RÉELLEMENT couru ; tant que ce calcul n'est pas servi, cet écran dit d'où
 * viendront les missions et renvoie à la carte, la seule chose réelle.
 *
 * D8 : la surface reste hors MVP (`flags.warRoom`, défaut OFF) — l'onglet et la
 * route sont masqués, les moteurs serveur ne sont pas touchés.
 *
 * Aucun hook n'est appelé avant un `return` : `WarRoomRoute` ne fait que router,
 * `WarRoomEmpty` est monté seulement quand il a le droit d'exister et exécute
 * alors toujours les mêmes hooks.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import { colors, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import { flags } from '../../src/lib/flags';
import { C } from '../../src/i18n/catalog/flagged';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';
import { Icon } from '../../src/ui/Icon';
import { TabScreen } from '../../src/ui/TabScreen';
import { InlineRunCTA } from '../../src/ui/game';

export default function WarRoomRoute() {
  // D8 — surface hors MVP : route masquée (les moteurs restent intacts).
  if (!flags.warRoom) return <Redirect href="/" />;
  return <WarRoomEmpty />;
}

/**
 * ÉTAT VIDE de l'onglet Missions. Il ne s'excuse pas et ne fait pas patienter :
 * il explique D'OÙ viendront les missions (du terrain réellement couru) et
 * propose la seule chose qui existe déjà — la carte. 1 CTA, §A.
 *
 * Ce n'est PAS un état de chargement déguisé : il n'y a rien à charger, aucune
 * requête n'est en vol. C'est le troisième cas assumé — « la fonction n'est pas
 * encore servie » — et il le dit au lieu de faire tourner un spinner.
 */
function WarRoomEmpty() {
  const t = useT();

  useEffect(() => {
    screen('war_room');
  }, []);

  return (
    <TabScreen title={t(C.missionsTitle)} icon="guerre" subtitle={t(C.missionsSubtitle)}>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyCardTitle}>{t(C.warNoDataTitle)}</Text>
        <Text style={styles.emptyCardBody}>{t(C.warNoDataBody)}</Text>
        <View style={styles.emptyCardCta}>
          <InlineRunCTA
            label={t(C.warNoDataCta)}
            leading={<Icon name="carte" size={iconSizes.md} color={colors.noir} />}
            onPress={() => router.push('/(tabs)')}
          />
        </View>
      </View>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  // ── État vide : UNE card, UN CTA (§A) ──
  emptyCard: {
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    padding: spacing.cardPadding,
  },
  emptyCardTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700' },
  emptyCardBody: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: spacing.xs,
  },
  emptyCardCta: { marginTop: spacing.md },
});
