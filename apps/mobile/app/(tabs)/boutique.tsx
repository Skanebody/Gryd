/**
 * GRYD — onglet Boutique (placeholder MVP, SPEC §5 + AMENDEMENT-02 §8 :
 * MVP = Club + Starter + Éclats ; Pass, boutique quotidienne, artefacts = V1).
 * Catalogue dérivé de SKUS/@klaim/shared — AUCUN paiement câblé (RevenueCat = O4) :
 * prix affichés par le store plus tard, boutons inertes « Bientôt ».
 * Jamais vendu : hexes, points, Foulées, stats (anti pay-to-win).
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CLUB_FOULEES_MULTIPLIER,
  ECLATS_PACKS,
  SHIELD_CLUB_INCLUDED_PER_WEEK,
  SHIELD_EXTRA_ECLATS,
  SKUS,
  STARTER_PACK_ECLATS,
  STREAK_FREEZE_CLUB_PER_MONTH,
  colors,
  fontSizes,
  radii,
  spacing,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../../src/lib/analytics';
import { GhostButton } from '../../src/ui/GhostButton';
import { TabScreen } from '../../src/ui/TabScreen';
import { formatInt } from '../../src/ui/format';

interface ShopItem {
  sku: string;
  name: string;
  description: string;
}

const CLUB_BENEFITS =
  `${SHIELD_CLUB_INCLUDED_PER_WEEK} bouclier de cluster inclus/semaine · ` +
  `Foulées ×${CLUB_FOULEES_MULTIPLIER} · ` +
  `${STREAK_FREEZE_CLUB_PER_MONTH} gels de série/mois`;

const CLUB_ITEMS: readonly ShopItem[] = [
  { sku: SKUS.clubMonthly, name: 'Club — mensuel', description: CLUB_BENEFITS },
  { sku: SKUS.clubAnnual, name: 'Club — annuel', description: CLUB_BENEFITS },
];

const STARTER_ITEM: ShopItem = {
  sku: SKUS.starterPack,
  name: 'Pack Starter',
  description: `${STARTER_PACK_ECLATS} Éclats pour bien démarrer — proposé une seule fois.`,
};

const ECLATS_ITEMS: readonly ShopItem[] = [
  { sku: SKUS.eclatsS, name: `${formatInt(ECLATS_PACKS[SKUS.eclatsS])} Éclats`, description: 'Poignée' },
  { sku: SKUS.eclatsM, name: `${formatInt(ECLATS_PACKS[SKUS.eclatsM])} Éclats`, description: 'Sacoche' },
  { sku: SKUS.eclatsL, name: `${formatInt(ECLATS_PACKS[SKUS.eclatsL])} Éclats`, description: 'Coffre' },
];

function ShopRow({ item }: { item: ShopItem }) {
  return (
    <View style={styles.itemRow}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemDescription}>{item.description}</Text>
        <Text style={styles.itemSku}>{item.sku}</Text>
      </View>
      {/* Paiement non câblé (O4 RevenueCat) — bouton inerte, jamais un faux achat */}
      <GhostButton label="Bientôt" disabled />
    </View>
  );
}

function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

export default function BoutiqueScreen() {
  useEffect(() => {
    screen('boutique');
    // Ouvrir la boutique = exposition au paywall (§8, props { trigger }).
    track(EVENTS.paywallView, { trigger: 'boutique_tab' });
  }, []);

  return (
    <TabScreen
      title="Boutique"
      kicker="SAISON 0"
      subtitle="Le territoire ne s'achète pas. Le style et le confort, si."
    >
      <SectionLabel>CLUB</SectionLabel>
      {CLUB_ITEMS.map((item) => (
        <ShopRow key={item.sku} item={item} />
      ))}

      <SectionLabel>PACK</SectionLabel>
      <ShopRow item={STARTER_ITEM} />

      <SectionLabel>ÉCLATS</SectionLabel>
      {ECLATS_ITEMS.map((item) => (
        <ShopRow key={item.sku} item={item} />
      ))}

      <Text style={styles.footnote}>
        Les Éclats n’achètent jamais d’hexes, de points ni de Foulées — un bouclier
        supplémentaire coûte {SHIELD_EXTRA_ECLATS} Éclats, le reste se gagne en courant.
      </Text>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 26,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 16,
    paddingHorizontal: spacing.cardPadding,
    marginBottom: 10,
  },
  itemInfo: { flex: 1 },
  itemName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '700', letterSpacing: -0.2 },
  itemDescription: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: 4,
  },
  itemSku: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 6,
    letterSpacing: 1,
    opacity: 0.7,
    fontVariant: ['tabular-nums'],
  },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 18,
  },
});
