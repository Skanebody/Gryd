/**
 * GRYD — ARSENAL, boutique de jeu (AMENDEMENT-08 §9, doc §20 ; remplace la
 * liste « produits Stripe » AMENDEMENT-06 §3). Écran POUSSÉ par-dessus les
 * tabs, accessible depuis Profil ET War Room. Header soldes Éclats/Foulées/
 * Club, sections Featured → Packs, chaque objet en `ArsenalItemCard`.
 * Achat DÉMO local : reveal du loot + solde qui descend (useCountUp) — aucun
 * paiement câblé (RevenueCat = O4, packs « Verrouillé »). ZÉRO pay-to-win :
 * jamais de hexes, km, victoire ni classement en vente (§52) — bannière
 * permanente « Le territoire ne s'achète pas. Le style et le confort, si. »
 * Prix : constantes économie de game-rules quand elles existent (bouclier,
 * skins, rename) ; le reste = données d'affichage DÉMO.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  CLUB_FOULEES_MULTIPLIER,
  CREW_RENAME_FOULEES,
  ECLATS_PACKS,
  SHIELD_CLUB_INCLUDED_PER_WEEK,
  SHIELD_DURATION_HOURS,
  SHIELD_EXTRA_ECLATS,
  SHIELD_MAX_ACTIVE_PER_WEEK,
  SKIN_EARNABLE_1_FOULEES,
  SKIN_EARNABLE_2_FOULEES,
  SKIN_PREMIUM_ECLATS_MAX,
  SKIN_PREMIUM_ECLATS_MIN,
  SKUS,
  STARTER_PACK_ECLATS,
  STREAK_FREEZE_CLUB_PER_MONTH,
  STREAK_FREEZE_FREE_PER_MONTH,
  colors,
  fontSizes,
  gameColors,
  motion,
  radii,
  spacing,
  type BadgeTier,
  type IconName,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { formatInt, formatMultiplier } from '../src/ui/format';
import {
  ArsenalItemCard,
  RewardCard,
  useCountUp,
  type ArsenalCurrency,
  type GameVisualState,
} from '../src/ui/game';
import { ArsenalIcon } from '../src/ui/game/ArsenalItemCard';

// ─── Catalogue DÉMO ──────────────────────────────────────────────────────────

interface ArsenalDemoItem {
  key: string;
  name: string;
  /** Slug d'icône personnalisée (registre arsenal-icons, AMENDEMENT-14 §5). */
  slug: string;
  /** Icône filaire de secours — reveal loot (RewardCard) uniquement. */
  icon: IconName;
  rarity: BadgeTier;
  usage: string;
  limit?: string;
  price?: { amount: number; currency: ArsenalCurrency };
  /** locked = paiement réel non câblé (O4) ou réservé au jeu. */
  state?: GameVisualState;
  /** Déjà dans l'arsenal (gagné en courant / offert Saison 0). */
  owned?: boolean;
}

interface ArsenalSection {
  key: string;
  label: string;
  /** Note courte sous le label (contexte, jamais de la vente). */
  note?: string;
  items: readonly ArsenalDemoItem[];
}

/** Soldes DÉMO du header doc §20 (Éclats 320 · Foulées 2 140 · Club inactif). */
const DEMO_WALLET = { eclats: 320, foulees: 2140 } as const;

/** Boucliers ACHETABLES par semaine = cap absolu − celui inclus au Club. */
const SHIELD_EXTRA_PER_WEEK = SHIELD_MAX_ACTIVE_PER_WEEK - SHIELD_CLUB_INCLUDED_PER_WEEK;

/** Exemple canonique doc §20 : Shield — Rare — 48 h — 1/semaine — 90 Éclats. */
const SHIELD_ITEM: ArsenalDemoItem = {
  key: 'shield',
  name: 'Bouclier de secteur',
  slug: 'shield',
  icon: 'bouclier',
  rarity: 'race',
  usage: `Protège un secteur ${SHIELD_DURATION_HOURS} h`,
  limit: `${SHIELD_EXTRA_PER_WEEK} / semaine`,
  price: { amount: SHIELD_EXTRA_ECLATS, currency: 'eclats' },
};

const SECTIONS: readonly ArsenalSection[] = [
  {
    key: 'featured',
    label: 'FEATURED',
    items: [
      SHIELD_ITEM,
      {
        key: 'skin-aurora',
        name: 'Skin territoire — Aurora',
        slug: 'skin_aurora',
        icon: 'skin',
        rarity: 'elite',
        usage: 'Halo boréal sur tes zones tenues',
        price: { amount: SKIN_PREMIUM_ECLATS_MAX, currency: 'eclats' },
      },
    ],
  },
  {
    key: 'pass',
    label: 'PASS SAISON',
    note: 'Des paliers de style et de confort toute la Saison 0 — zéro avantage de jeu.',
    items: [
      {
        key: 'pass-s0',
        name: 'Pass Saison 0',
        slug: 'pass_saison',
        icon: 'pass',
        rarity: 'elite',
        usage: 'Frames, skins et templates share à débloquer palier par palier',
        limit: 'Saison 0',
        state: 'locked', // paiement réel — RevenueCat O4, bientôt.
      },
    ],
  },
  {
    key: 'capped',
    label: 'OBJETS CAPÉS',
    note: 'Du confort, jamais un raccourci : chaque objet est limité.',
    items: [
      {
        key: 'streak-freeze',
        name: 'Gel de série',
        slug: 'streak_gel',
        icon: 'serie',
        rarity: 'tempo',
        usage: 'Fige ta série une semaine sans courir',
        limit: `${STREAK_FREEZE_FREE_PER_MONTH} / mois inclus`,
        owned: true,
      },
      {
        key: 'pace-report',
        name: "Rapport d'allure avancé",
        slug: 'pace_report',
        icon: 'performance',
        rarity: 'race',
        usage: 'Splits détaillés et régularité, course par course',
        limit: '1 actif',
        // Prix DÉMO (stats avancées = confort autorisé §20, pas de constante dédiée).
        price: { amount: 450, currency: 'foulees' },
      },
    ],
  },
  {
    key: 'skins-territory',
    label: 'SKINS TERRITOIRE',
    items: [
      {
        key: 'skin-circuit',
        name: 'Grille Circuit',
        slug: 'skin_circuit',
        icon: 'skin',
        rarity: 'tempo',
        usage: 'Motif circuit gravé sur tes zones tenues',
        price: { amount: SKIN_EARNABLE_1_FOULEES, currency: 'foulees' },
      },
      {
        key: 'skin-pulse',
        name: 'Pulse lent',
        slug: 'skin_pulse',
        icon: 'skin',
        rarity: 'carbon',
        usage: 'Battement discret sur tes zones tenues',
        price: { amount: SKIN_EARNABLE_2_FOULEES, currency: 'foulees' },
      },
      {
        key: 'skin-carbone',
        name: 'Carbone brossé',
        slug: 'skin_carbon_grid',
        icon: 'skin',
        rarity: 'carbon',
        usage: 'Finition carbone mat sur ton territoire',
        price: { amount: SKIN_PREMIUM_ECLATS_MIN, currency: 'eclats' },
      },
    ],
  },
  {
    key: 'skins-trace',
    label: 'SKINS TRACE',
    items: [
      {
        key: 'trace-comete',
        name: 'Trace Comète',
        slug: 'skin_trace',
        icon: 'route',
        rarity: 'race',
        usage: 'Traînée lumineuse derrière ta course',
        price: { amount: SKIN_PREMIUM_ECLATS_MIN, currency: 'eclats' },
      },
      {
        key: 'trace-pointilles',
        name: 'Trace Pointillés',
        slug: 'skin_ghost',
        icon: 'route',
        rarity: 'road',
        usage: 'Pointillés fins — gagnée en courant',
        owned: true,
      },
    ],
  },
  {
    key: 'crew-gear',
    label: 'CREW GEAR',
    items: [
      {
        key: 'crew-rename',
        name: 'Renommer le crew',
        slug: 'crew_gear',
        icon: 'crest',
        rarity: 'road',
        usage: 'Nouveau nom de crew — validé par le capitaine',
        price: { amount: CREW_RENAME_FOULEES, currency: 'foulees' },
      },
      {
        key: 'crew-frame-gold',
        name: 'Frame de blason — Or de saison',
        slug: 'frame_gold',
        icon: 'couronne',
        rarity: 'legend',
        usage: "Réservée au Top 10 de ligue. Ne s'achète pas.",
        state: 'locked',
      },
      {
        key: 'crew-share-template',
        name: 'Template Share crew',
        slug: 'share_template',
        icon: 'partage',
        rarity: 'tempo',
        usage: 'Habillage crew pour tes cartes de partage — offert Saison 0',
        owned: true,
      },
    ],
  },
  {
    key: 'packs',
    label: 'PACKS',
    note: "Paiement bientôt disponible — aucun pack ne contient d'avantage de jeu.",
    items: [
      {
        key: SKUS.starterPack,
        name: 'Pack Starter',
        slug: 'pack',
        icon: 'cadeau',
        rarity: 'tempo',
        usage: `${STARTER_PACK_ECLATS} Éclats — proposé une seule fois`,
        limit: '1 / compte',
        state: 'locked',
      },
      {
        key: SKUS.eclatsS,
        name: "Poignée d'Éclats",
        slug: 'eclats',
        icon: 'eclats',
        rarity: 'road',
        usage: `+${formatInt(ECLATS_PACKS[SKUS.eclatsS])} Éclats`,
        state: 'locked',
      },
      {
        key: SKUS.eclatsM,
        name: "Sacoche d'Éclats",
        slug: 'eclats_pouch',
        icon: 'eclats',
        rarity: 'tempo',
        usage: `+${formatInt(ECLATS_PACKS[SKUS.eclatsM])} Éclats`,
        state: 'locked',
      },
      {
        key: SKUS.eclatsL,
        name: "Coffre d'Éclats",
        slug: 'eclats_chest',
        icon: 'coffre',
        rarity: 'race',
        usage: `+${formatInt(ECLATS_PACKS[SKUS.eclatsL])} Éclats`,
        state: 'locked',
      },
      {
        key: SKUS.clubMonthly,
        name: 'Club GRYD',
        slug: 'club',
        icon: 'couronne',
        rarity: 'carbon',
        usage:
          `${SHIELD_CLUB_INCLUDED_PER_WEEK} bouclier / semaine · ` +
          `Foulées ${formatMultiplier(CLUB_FOULEES_MULTIPLIER)} · ` +
          `${STREAK_FREEZE_CLUB_PER_MONTH} gels de série / mois`,
        state: 'locked',
      },
    ],
  },
];

// ─── Écran ───────────────────────────────────────────────────────────────────

export default function ArsenalScreen() {
  useEffect(() => {
    screen('arsenal');
    // Ouvrir l'Arsenal = exposition au paywall (§8, props { trigger }).
    track(EVENTS.paywallView, { trigger: 'arsenal' });
  }, []);

  const [wallet, setWallet] = useState<{ eclats: number; foulees: number }>(DEMO_WALLET);
  const [ownedKeys, setOwnedKeys] = useState<Record<string, boolean>>({});
  /** Dernier objet obtenu (reveal façon ouverture de coffre sous le header). */
  const [loot, setLoot] = useState<ArsenalDemoItem | null>(null);
  /** Message « solde insuffisant » (anti-frustration : explique où gagner). */
  const [notice, setNotice] = useState<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (dismissTimer.current !== null) clearTimeout(dismissTimer.current);
    },
    [],
  );

  /** Soldes animés : l'achat fait DESCENDRE le compteur (doc §20 anim). */
  const eclatsDisplay = useCountUp(wallet.eclats);
  const fouleesDisplay = useCountUp(wallet.foulees);

  const obtain = useCallback(
    (item: ArsenalDemoItem) => {
      const price = item.price;
      if (!price) return;
      if (dismissTimer.current !== null) clearTimeout(dismissTimer.current);

      if (wallet[price.currency] < price.amount) {
        // Solde insuffisant : pas d'achat, message calme (jamais de pression).
        haptics.light();
        setLoot(null);
        setNotice(
          price.currency === 'foulees'
            ? 'Foulées insuffisantes — elles se gagnent en courant.'
            : 'Éclats insuffisants pour cet objet.',
        );
        dismissTimer.current = setTimeout(() => setNotice(null), motion.toastDismissMs);
        return;
      }
      // Achat DÉMO : solde qui descend + objet révélé (haptic achat doc §25).
      haptics.success();
      setWallet((prev) => ({ ...prev, [price.currency]: prev[price.currency] - price.amount }));
      setOwnedKeys((owned) => ({ ...owned, [item.key]: true }));
      setNotice(null);
      setLoot(item);
      dismissTimer.current = setTimeout(() => setLoot(null), motion.toastDismissMs * 2);
    },
    [wallet],
  );

  const preview = useCallback((item: ArsenalDemoItem) => {
    // TODO(O4) : préview visuelle des skins (hors MVP — statique en démo).
    if (__DEV__) console.log(`[arsenal] preview ${item.key}`);
  }, []);

  return (
    <StackScreen title="Arsenal" icon="boutique" kicker="ARSENAL · SAISON 0 · GEAR">
      {/* Soldes (doc §20) — compteurs animés, le Club reste inactif en démo. */}
      <View style={styles.wallet}>
        <View style={styles.walletCell}>
          <ArsenalIcon slug="eclats" size={16} color={colors.blanc} />
          <Text style={styles.walletValue}>{formatInt(eclatsDisplay)}</Text>
          <Text style={styles.walletLabel}>Éclats</Text>
        </View>
        <View style={styles.walletDivider} />
        <View style={styles.walletCell}>
          <ArsenalIcon slug="foulees" size={16} color={colors.blanc} />
          <Text style={styles.walletValue}>{formatInt(fouleesDisplay)}</Text>
          <Text style={styles.walletLabel}>Foulées</Text>
        </View>
        <View style={styles.walletDivider} />
        <View style={styles.walletCell}>
          <Icon name="couronne" size={16} color={colors.gris} />
          <Text style={styles.walletClubOff}>Club : inactif</Text>
        </View>
      </View>

      {/* Bannière permanente anti-pay-to-win (doc §20). */}
      <View style={styles.banner}>
        <Icon name="verrou" size={18} color={colors.blanc} />
        <View style={styles.bannerTextWrap}>
          <Text style={styles.bannerStrong}>Le territoire ne s'achète pas.</Text>
          <Text style={styles.bannerSoft}>Le style et le confort, si.</Text>
        </View>
      </View>

      {/* Loot obtenu : reveal façon coffre + glisse sous les soldes. */}
      {loot ? (
        <View style={styles.loot} key={loot.key}>
          <RewardCard
            icon={loot.icon}
            label={loot.name}
            sublabel="Dans ton arsenal"
            state="unlocked"
            reveal
          />
        </View>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {SECTIONS.map((section) => (
        <View key={section.key}>
          <Text style={styles.sectionLabel}>{section.label}</Text>
          {section.note ? <Text style={styles.sectionNote}>{section.note}</Text> : null}
          <View style={styles.sectionItems}>
            {section.items.map((item) => {
              const owned = item.owned === true || ownedKeys[item.key] === true;
              const buyable = item.price !== undefined && item.state !== 'locked' && !owned;
              return (
                <ArsenalItemCard
                  key={item.key}
                  name={item.name}
                  slug={item.slug}
                  rarity={item.rarity}
                  usage={item.usage}
                  limit={item.limit}
                  price={item.price}
                  state={item.state}
                  owned={owned}
                  onObtain={buyable ? () => obtain(item) : undefined}
                  onView={() => preview(item)}
                />
              );
            })}
          </View>
        </View>
      ))}

      <Text style={styles.footnote}>
        Aucun objet ne vend des zones, des kilomètres, une victoire ou un rang de ligue —
        tout ça se gagne en courant. Les Éclats s'achètent en pack, les Foulées se courent.
      </Text>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: gameColors.carbon,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 14,
    paddingHorizontal: spacing.cardPadding,
    marginTop: 8,
    gap: 12,
  },
  walletCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  walletLabel: { color: colors.gris, fontSize: fontSizes.xs },
  walletClubOff: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  walletDivider: { width: 1, height: 22, backgroundColor: colors.grisLigne },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.carbone,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingVertical: 12,
    paddingHorizontal: spacing.cardPadding,
    marginTop: 10,
  },
  bannerTextWrap: { flex: 1 },
  bannerStrong: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  bannerSoft: { color: colors.gris, fontSize: fontSizes.sm },
  loot: { marginTop: 10 },
  notice: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    marginTop: 10,
    textAlign: 'center',
  },
  sectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 26,
    marginBottom: 10,
  },
  sectionNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: -4,
    marginBottom: 10,
  },
  sectionItems: { gap: 10 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 22,
  },
});
