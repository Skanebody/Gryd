/**
 * GRYD — ARSENAL V2 (AMENDEMENT-16 §4, doc §25). Boutique = vrai écran de jeu.
 * Sections §25 : Featured · Packs · Objets · Skins Territoire · Skins Trace ·
 * Frames & statut · Blasons Crew · Bannières Crew · Templates Share · Crew
 * Boosts · Club & Pass. Chaque item ouvre un DÉTAIL (sheet) : nom, type,
 * rareté, prix (Éclats OU €), preview, possédé/équipé, description, limite,
 * contenu des packs. Achat DÉMO = purchase reveal + inventaire local ;
 * ÉQUIPER depuis l'inventaire (rendu réel des skins carte = V1 → copy honnête
 * « visible sur ta carte à la Saison 0 »). Gifting « Offrir au crew » depuis
 * les items crew : choisir → confirmer → offrande anonyme optionnelle →
 * message feed sobre. JAMAIS de classement de payeurs ni de montant (§14).
 *
 * ANTI PAY-TO-WIN (doc §12, bannière permanente) : aucun item ne vend
 * territoire, km, zones, points ni attaque/défense. Un Crew Boost n'agit QUE
 * sur la progression du coffre crew. Prix : constantes de game-rules
 * (SKU_PRICES_EUR, ECLATS_PACKS, SHIELD/STREAK/SCOUT/BANNER_*) — zéro nombre
 * magique de prix dans cet écran.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BADGE_TIER_LABEL,
  CREW_BOOST_MAX_ACTIVE,
  borderState,
  colors,
  elevation,
  fontSizes,
  gameColors,
  motion,
  radii,
  spacing,
} from '@klaim/shared';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { formatInt } from '../src/ui/format';
import {
  ArsenalIcon,
  ArsenalItemCard,
  RewardCard,
  Segmented,
  useCountUp,
  useReveal,
  type ArsenalPriceCurrency,
} from '../src/ui/game';
import {
  ARSENAL_NEED_OPTIONS,
  BOOST_CHEST_BONUS_LABEL,
  EQUIP_SCOPE_LABEL,
  equipScopeOf,
  explainArsenalItem,
  rankArsenalItems,
  useArsenalInventory,
  useArsenalSignals,
  type ArsenalCatalogItem,
  type ArsenalNeedKey,
  type ArsenalPlayerSignals,
  type ArsenalRecommendation,
} from '../src/features/arsenal';

/** Puce pleine (le set d'icônes n'a pas de coche — dot chartreuse cohérent DA). */
function Dot({ color = gameColors.crew, size = 6 }: { color?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/** Prix affichable d'un item selon la devise préférée (Éclats prioritaire). */
function priceFor(
  item: ArsenalCatalogItem,
  prefer: ArsenalPriceCurrency,
): { amount: number; currency: ArsenalPriceCurrency } | undefined {
  if (prefer === 'eclats' && item.priceShards !== undefined)
    return { amount: item.priceShards, currency: 'eclats' };
  if (prefer === 'eur' && item.priceEur !== undefined)
    return { amount: item.priceEur, currency: 'eur' };
  if (item.priceShards !== undefined) return { amount: item.priceShards, currency: 'eclats' };
  if (item.priceEur !== undefined) return { amount: item.priceEur, currency: 'eur' };
  return undefined;
}

export default function ArsenalScreen() {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    screen('arsenal');
    track(EVENTS.paywallView, { trigger: 'arsenal' });
  }, []);

  /** Item ouvert en détail (sheet). */
  const [detail, setDetail] = useState<ArsenalCatalogItem | null>(null);
  /** Devise choisie dans le détail (items double-prix : Éclats OU €). */
  const [detailCurrency, setDetailCurrency] = useState<ArsenalPriceCurrency>('eclats');
  /** Loot révélé (reveal façon coffre sous le header). */
  const [loot, setLoot] = useState<{ item: ArsenalCatalogItem; kind: 'buy' | 'equip' | 'gift' } | null>(null);
  /** Message calme (solde insuffisant / gifting confirmé). */
  const [notice, setNotice] = useState<string | null>(null);
  /** Item en cours d'offrande au crew (flux gifting). */
  const [gifting, setGifting] = useState<ArsenalCatalogItem | null>(null);
  const [giftAnonymous, setGiftAnonymous] = useState(false);
  /** Besoin exploré : l'écran démarre toujours sur le conseil algorithmique. */
  const [selectedNeed, setSelectedNeed] = useState<ArsenalNeedKey>('for_you');
  const { signals: arsenalSignals, loading: arsenalSignalsLoading } = useArsenalSignals();
  const arsenalInventory = useArsenalInventory();
  const { wallet, ownedKeys: owned, equipped } = arsenalInventory;

  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (dismissTimer.current !== null) clearTimeout(dismissTimer.current);
    },
    [],
  );

  const eclatsDisplay = useCountUp(wallet.eclats);
  const fouleesDisplay = useCountUp(wallet.foulees);

  const isOwned = useCallback((key: string) => owned.has(key), [owned]);
  const isEquipped = useCallback(
    (item: ArsenalCatalogItem) => {
      const scope = equipScopeOf(item.key);
      return scope !== null && equipped[scope] === item.key;
    },
    [equipped],
  );

  const flashLoot = useCallback((item: ArsenalCatalogItem, kind: 'buy' | 'equip' | 'gift') => {
    if (dismissTimer.current !== null) clearTimeout(dismissTimer.current);
    setLoot({ item, kind });
    dismissTimer.current = setTimeout(() => setLoot(null), motion.toastDismissMs * 2);
  }, []);

  const flashNotice = useCallback((msg: string) => {
    if (dismissTimer.current !== null) clearTimeout(dismissTimer.current);
    setNotice(msg);
    dismissTimer.current = setTimeout(() => setNotice(null), motion.toastDismissMs);
  }, []);

  /** Achat DÉMO : Éclats → solde descend ; EUR → reveal (paiement réel = O3). */
  const buy = useCallback(
    (item: ArsenalCatalogItem, currency: ArsenalPriceCurrency) => {
      const price = priceFor(item, currency);
      if (!price) return;
      if (price.currency === 'eclats') {
        if (!arsenalInventory.spendEclats(price.amount)) {
          haptics.light();
          flashNotice('Éclats insuffisants — un pack d’Éclats les recharge.');
          return;
        }
      }
      // EUR : pas de vrai débit en démo (O3), on révèle directement le loot.
      haptics.success();
      arsenalInventory.grantLocalItem(item.key);
      setDetail(null);
      flashLoot(item, 'buy');
    },
    [arsenalInventory, wallet.eclats, flashLoot, flashNotice],
  );

  /** Équiper un skin/frame/bannière possédé (rendu carte réel = V1). */
  const equip = useCallback(
    (item: ArsenalCatalogItem) => {
      const scope = equipScopeOf(item.key);
      if (scope === null) return;
      haptics.light();
      void arsenalInventory.equipItem(item.key);
      setDetail(null);
      flashLoot(item, 'equip');
    },
    [arsenalInventory, flashLoot],
  );

  /** Confirme l'offrande au crew (démo) : reveal + message sobre, zéro montant. */
  const confirmGift = useCallback(
    (item: ArsenalCatalogItem, anonymous: boolean) => {
      haptics.success();
      setGifting(null);
      setDetail(null);
      flashLoot(item, 'gift');
      flashNotice(
        anonymous
          ? `Un membre a offert ${item.name} au crew. Message posté sans nom.`
          : `Tu as offert ${item.name} au crew. Message posté au feed.`,
      );
    },
    [flashLoot, flashNotice],
  );

  const openDetail = useCallback((item: ArsenalCatalogItem) => {
    setDetailCurrency(item.priceShards !== undefined ? 'eclats' : 'eur');
    setDetail(item);
  }, []);

  const recommendations = useMemo(
    () =>
      rankArsenalItems(arsenalSignals, {
        ownedKeys: owned,
        equipped,
        walletEclats: wallet.eclats,
      }),
    [arsenalSignals, owned, equipped, wallet.eclats],
  );

  const primaryRecommendation = recommendations[0];
  const primaryRecommendationKey = primaryRecommendation?.item.key;

  const visibleRecommendations = useMemo(
    () => {
      const entries = recommendations.filter(
        (entry) =>
          entry.item.key !== primaryRecommendationKey &&
          (selectedNeed === 'for_you' || entry.advice.need === selectedNeed),
      );
      return selectedNeed === 'for_you' ? entries.slice(0, 5) : entries;
    },
    [recommendations, primaryRecommendationKey, selectedNeed],
  );

  const renderCard = useCallback(
    (entry: ArsenalRecommendation, emphasis: 'primary' | 'secondary' = 'secondary') => {
      const { item, advice } = entry;
      const ownedNow = isOwned(item.key);
      const equippedNow = isEquipped(item);
      const canEquip = equipScopeOf(item.key) !== null;
      const price = priceFor(item, 'eclats');
      const buyable = !ownedNow && !item.packOnly && !item.draft && price !== undefined;
      return (
        <ArsenalItemCard
          key={item.key}
          name={item.name}
          slug={item.slug}
          rarity={item.rarity}
          usage={advice.headline}
          explanation={[
            { label: 'Effet', text: advice.benefit },
            { label: 'Limite', text: advice.guardrail },
          ]}
          limit={item.limit}
          price={buyable ? price : undefined}
          state={item.draft ? 'locked' : item.packOnly && !ownedNow ? 'locked' : 'unlocked'}
          owned={ownedNow}
          equipped={equippedNow}
          emphasis={emphasis}
          onEquip={canEquip && ownedNow && !equippedNow ? () => equip(item) : undefined}
          onObtain={buyable ? () => openDetail(item) : undefined}
          onView={() => openDetail(item)}
        />
      );
    },
    [isOwned, isEquipped, equip, openDetail],
  );

  return (
    <StackScreen title="Arsenal" icon="boutique" kicker="ARSENAL · SAISON 0 · GEAR">
      {/* Soldes — Éclats & Foulées animés, Club inactif en démo. */}
      <View style={styles.wallet}>
        <View style={styles.walletCell}>
          <View style={styles.walletValueRow}>
            <ArsenalIcon slug="eclats" size={16} color={colors.blanc} />
            <Text style={styles.walletValue}>{formatInt(eclatsDisplay)}</Text>
          </View>
          <Text style={styles.walletLabel}>Éclats</Text>
        </View>
        <View style={styles.walletDivider} />
        <View style={styles.walletCell}>
          <View style={styles.walletValueRow}>
            <ArsenalIcon slug="foulees" size={16} color={colors.blanc} />
            <Text style={styles.walletValue}>{formatInt(fouleesDisplay)}</Text>
          </View>
          <Text style={styles.walletLabel}>Foulées</Text>
        </View>
        <View style={styles.walletDivider} />
        <View style={styles.walletCell}>
          <Icon name="couronne" size={18} color={wallet.isClub ? colors.chartreuse : colors.gris} />
          <Text style={wallet.isClub ? styles.walletClubOn : styles.walletClubOff}>
            Club : {wallet.isClub ? 'actif' : 'inactif'}
          </Text>
        </View>
      </View>

      {/* Bannière permanente anti-pay-to-win (copy §28) — posée sur l'espace,
          plus de boîte : un filet supérieur discret la sépare du solde. */}
      <View style={styles.banner}>
        <Icon name="verrou" size={18} color={colors.blanc} />
        <View style={styles.bannerTextWrap}>
          <Text style={styles.bannerStrong}>Le territoire ne s'achète pas.</Text>
          <Text style={styles.bannerSoft}>Le style, le statut et l'organisation, oui.</Text>
        </View>
      </View>

      {loot ? (
        <View style={styles.loot} key={`${loot.item.key}-${loot.kind}`}>
          <RewardCard
            icon="cadeau"
            label={loot.item.name}
            sublabel={
              loot.kind === 'equip'
                ? 'Équipé'
                : loot.kind === 'gift'
                  ? 'Offert au crew'
                  : 'Dans ton arsenal'
            }
            state="unlocked"
            reveal
          />
        </View>
      ) : null}
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}

      {/* ── Conseil algorithmique : GRYD choisit d'abord, l'utilisateur explore ensuite. */}
      {primaryRecommendation ? (
        <AdvisorCard
          entry={primaryRecommendation}
          owned={isOwned(primaryRecommendation.item.key)}
          equipped={isEquipped(primaryRecommendation.item)}
          price={priceFor(primaryRecommendation.item, 'eclats')}
          onView={() => openDetail(primaryRecommendation.item)}
        />
      ) : null}

      <Text style={styles.sectionLabel}>EXPLORER PAR BESOIN</Text>
      <Segmented
        accessibilityLabel="Besoin Arsenal"
        tone="surface"
        scrollable
        value={selectedNeed}
        onChange={setSelectedNeed}
        options={ARSENAL_NEED_OPTIONS}
        style={styles.needSegmented}
      />
      <Text style={styles.sectionNote}>
        {selectedNeed === 'for_you'
          ? arsenalSignalsLoading || arsenalInventory.loading
            ? 'Tri en cours avec ton contexte : carte, crew, streak, partage et solde.'
            : 'Trié avec ton contexte : carte, crew, streak, solde et items possédés.'
          : 'Même catalogue, filtré par utilité immédiate. Le détail explique toujours la limite.'}
      </Text>

      <View style={styles.sectionItems}>
        {visibleRecommendations.map((entry) => renderCard(entry))}
      </View>

      <Text style={styles.footnote}>
        Aucun objet ne vend des zones, des kilomètres, une victoire ou un rang de ligue —
        tout ça se gagne en courant. Les Éclats servent au style ; le confort reste capé.
      </Text>

      {/* ══ DÉTAIL ITEM (sheet §25) ══ */}
      <Modal
        visible={detail !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityLabel="Fermer"
            style={styles.sheetBackdrop}
            onPress={() => setDetail(null)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            {detail ? (
              <ItemDetail
                item={detail}
                signals={arsenalSignals}
                owned={isOwned(detail.key)}
                equipped={isEquipped(detail)}
                currency={detailCurrency}
                onCurrency={setDetailCurrency}
                onBuy={(cur) => buy(detail, cur)}
                onEquip={() => equip(detail)}
                onGift={() => {
                  setGiftAnonymous(false);
                  setGifting(detail);
                }}
                onClose={() => setDetail(null)}
              />
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ══ GIFTING « Offrir au crew » (§14) ══ */}
      <Modal
        visible={gifting !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setGifting(null)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityLabel="Fermer"
            style={styles.sheetBackdrop}
            onPress={() => setGifting(null)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            {gifting ? (
              <GiftFlow
                item={gifting}
                signals={arsenalSignals}
                anonymous={giftAnonymous}
                onToggleAnonymous={() => setGiftAnonymous((a) => !a)}
                onConfirm={() => confirmGift(gifting, giftAnonymous)}
                onCancel={() => setGifting(null)}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </StackScreen>
  );
}

function priceLabel(price: { amount: number; currency: ArsenalPriceCurrency } | undefined): string {
  if (!price) return 'Déjà débloqué ou pack';
  if (price.currency === 'eur') {
    return `${price.amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} €`;
  }
  return `${formatInt(price.amount)} ${price.currency === 'eclats' ? 'Éclats' : 'Foulées'}`;
}

function AdvisorCard({
  entry,
  owned,
  equipped,
  price,
  onView,
}: {
  entry: ArsenalRecommendation;
  owned: boolean;
  equipped: boolean;
  price: { amount: number; currency: ArsenalPriceCurrency } | undefined;
  onView: () => void;
}) {
  const { item, advice } = entry;
  return (
    <View style={styles.advisor}>
      <View style={styles.advisorHeader}>
        <View style={styles.advisorIcon}>
          <ArsenalIcon slug={item.slug} size={42} color={colors.blanc} />
        </View>
        <View style={styles.advisorTitleWrap}>
          <Text style={styles.advisorKicker}>CHOISI POUR TOI</Text>
          <Text style={styles.advisorName}>{item.name}</Text>
          <Text style={styles.advisorMeta}>
            {BADGE_TIER_LABEL[item.rarity]} · {owned ? (equipped ? 'Équipé' : 'Possédé') : priceLabel(price)}
          </Text>
        </View>
      </View>

      <View style={styles.advisorLines}>
        <ExplanationLine label="Pourquoi" text={advice.whyNow} />
        <ExplanationLine label="Comment" text={advice.mechanic} />
        <ExplanationLine label="Sert à" text={advice.benefit} />
        <ExplanationLine label="Limite" text={advice.guardrail} />
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onView}
        style={({ pressed }) => [styles.advisorCta, pressed && styles.pressed]}
      >
        <Text style={styles.advisorCtaText}>{owned ? 'Gérer l’item' : 'Comprendre et obtenir'}</Text>
      </Pressable>
    </View>
  );
}

function ExplanationLine({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.explainLine}>
      <Text style={styles.explainLabel}>{label}</Text>
      <Text style={styles.explainText}>{text}</Text>
    </View>
  );
}

// ─── Détail item (sheet §25) ─────────────────────────────────────────────────

function ItemDetail({
  item,
  signals,
  owned,
  equipped,
  currency,
  onCurrency,
  onBuy,
  onEquip,
  onGift,
  onClose,
}: {
  item: ArsenalCatalogItem;
  signals: ArsenalPlayerSignals;
  owned: boolean;
  equipped: boolean;
  currency: ArsenalPriceCurrency;
  onCurrency: (c: ArsenalPriceCurrency) => void;
  onBuy: (currency: ArsenalPriceCurrency) => void;
  onEquip: () => void;
  onGift: () => void;
  onClose: () => void;
}) {
  const { opacity, scale } = useReveal(true);
  const scope = equipScopeOf(item.key);
  const isSkin = item.section === 'skins_territory' || item.section === 'skins_trace';
  const dual = item.priceShards !== undefined && item.priceEur !== undefined;
  const hasEclats = item.priceShards !== undefined;
  const hasEur = item.priceEur !== undefined;
  const advice = explainArsenalItem(item, signals);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sheetHandle} />
      {/* Preview : grande icône encadrée (rendu réel skins = V1). */}
      <View style={styles.detailPreview}>
        <View style={styles.detailPreviewBox}>
          <ArsenalIcon slug={item.slug} size={64} color={colors.blanc} />
        </View>
        <Text style={styles.detailName}>{item.name}</Text>
        <Text style={styles.detailMeta}>
          {BADGE_TIER_LABEL[item.rarity]}
          {item.draft ? ' · Saison 1' : ''}
        </Text>
      </View>

      <Text style={styles.detailDesc}>{item.description}</Text>

      <View style={styles.detailExplain}>
        <ExplanationLine label="Usage" text={advice.headline} />
        <ExplanationLine label="Comment" text={advice.mechanic} />
        <ExplanationLine label="Sert à" text={advice.benefit} />
        <ExplanationLine label="Pourquoi" text={advice.whyNow} />
        <ExplanationLine label="Limite" text={advice.guardrail} />
      </View>

      {item.limit ? (
        <View style={styles.detailChip}>
          <Icon name="verrou" size={13} color={colors.gris} />
          <Text style={styles.detailChipText}>Limite : {item.limit}</Text>
        </View>
      ) : null}

      {isSkin ? (
        <View style={styles.detailChip}>
          <Icon name="carte" size={13} color={gameColors.crew} />
          <Text style={styles.detailChipText}>Visible sur ta carte à la Saison 0.</Text>
        </View>
      ) : null}

      {item.contents ? (
        <View style={styles.detailContents}>
          {item.contents.map((line) => (
            <View key={line} style={styles.packLine}>
              <Dot />
              <Text style={styles.packLineText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Statut possédé / équipé */}
      {owned ? (
        <View style={styles.detailOwned}>
          <Dot size={7} />
          <Text style={styles.detailOwnedText}>
            {equipped ? 'Équipé' : 'Dans ton arsenal'}
            {scope ? ` · ${EQUIP_SCOPE_LABEL[scope]}` : ''}
          </Text>
        </View>
      ) : null}

      {/* Bascule devise (items double-prix : Éclats OU €) = UN segmented (pas
          deux pills séparées). tone `surface` : le CTA chartreuse est le seul
          focus fort de la scène. */}
      {dual && !owned ? (
        <Segmented
          accessibilityLabel="Devise de paiement"
          tone="surface"
          value={currency}
          onChange={onCurrency}
          options={[
            {
              id: 'eclats',
              label: `${item.priceShards?.toLocaleString('fr-FR')} Éclats`,
            },
            {
              id: 'eur',
              label: `${item.priceEur?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`,
            },
          ]}
          style={styles.currencySegmented}
        />
      ) : null}

      {/* CTA principal */}
      <View style={styles.detailActions}>
        {item.draft ? (
          <View style={[styles.detailPrimary, styles.detailLocked]}>
            <Icon name="verrou" size={15} color={colors.gris} />
            <Text style={styles.detailLockedText}>Bientôt — Saison 1</Text>
          </View>
        ) : item.packOnly && !owned ? (
          <View style={[styles.detailPrimary, styles.detailLocked]}>
            <Icon name="verrou" size={15} color={colors.gris} />
            <Text style={styles.detailLockedText}>Exclusif au pack</Text>
          </View>
        ) : owned ? (
          scope && !equipped ? (
            <Pressable
              accessibilityRole="button"
              onPress={onEquip}
              style={({ pressed }) => [styles.detailPrimary, pressed && styles.pressed]}
            >
              <Text style={styles.detailPrimaryText}>Équiper</Text>
            </Pressable>
          ) : (
            <View style={[styles.detailPrimary, styles.detailLocked]}>
              <Text style={styles.detailLockedText}>{equipped ? 'Équipé' : 'Possédé'}</Text>
            </View>
          )
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => onBuy(dual ? currency : hasEclats ? 'eclats' : 'eur')}
            style={({ pressed }) => [styles.detailPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.detailPrimaryText}>
              {hasEclats && (!dual || currency === 'eclats')
                ? `Obtenir · ${item.priceShards?.toLocaleString('fr-FR')} Éclats`
                : `Obtenir · ${item.priceEur?.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`}
            </Text>
          </Pressable>
        )}

        {/* Offrir au crew (items de portée crew, §14) */}
        {item.giftable ? (
          <Pressable
            accessibilityRole="button"
            onPress={onGift}
            style={({ pressed }) => [styles.detailGhost, pressed && styles.pressed]}
          >
            <Icon name="cadeau" size={15} color={colors.blanc} />
            <Text style={styles.detailGhostText}>Offrir au crew</Text>
          </Pressable>
        ) : null}
      </View>

      <Pressable accessibilityRole="button" onPress={onClose} style={styles.detailClose}>
        <Text style={styles.detailCloseText}>Fermer</Text>
      </Pressable>
      {/* Anim wrapper (reveal) — placé en fin pour ne pas gêner le scroll. */}
      <View style={{ opacity, transform: [{ scale }], height: 0 }} pointerEvents="none" />
    </ScrollView>
  );
}

// ─── Flux gifting (choisir → confirmer → anonyme, §14) ───────────────────────

function GiftFlow({
  item,
  signals,
  anonymous,
  onToggleAnonymous,
  onConfirm,
  onCancel,
}: {
  item: ArsenalCatalogItem;
  signals: ArsenalPlayerSignals;
  anonymous: boolean;
  onToggleAnonymous: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isBoost = item.section === 'crew_boosts' && item.key.startsWith('crew_boost');
  const advice = explainArsenalItem(item, signals);
  return (
    <View>
      <View style={styles.sheetHandle} />
      <Text style={styles.giftTitle}>Offrir au crew</Text>
      <Text style={styles.giftSubtitle}>{item.name}</Text>

      <View style={styles.giftPreview}>
        <View style={styles.detailPreviewBox}>
          <ArsenalIcon slug={item.slug} size={40} color={colors.blanc} />
        </View>
        <View style={styles.giftPreviewText}>
          <Text style={styles.giftEffect}>
            {isBoost ? BOOST_CHEST_BONUS_LABEL : 'Cadeau cosmétique au crew'}
          </Text>
          <Text style={styles.giftDesc}>{item.description}</Text>
        </View>
      </View>

      <View style={styles.giftExplain}>
        <ExplanationLine label="Effet" text={advice.benefit} />
        <ExplanationLine label="Comment" text={advice.mechanic} />
        <ExplanationLine label="Limite" text={advice.guardrail} />
      </View>

      {/* Copy contribution gelée §28 */}
      <View style={styles.giftContribBox}>
        <Text style={styles.giftContribLine}>Tous les runs comptent plus fort pour le coffre.</Text>
        <Text style={styles.giftContribStrong}>Aucune obligation. La victoire reste sur la route.</Text>
      </View>

      {/* Offrande anonyme (§14 — jamais de classement de payeurs) */}
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: anonymous }}
        onPress={onToggleAnonymous}
        style={styles.giftAnonRow}
      >
        <View style={[styles.checkbox, anonymous && styles.checkboxOn]}>
          {anonymous ? <Dot color={colors.noir} size={8} /> : null}
        </View>
        <View style={styles.giftAnonText}>
          <Text style={styles.giftAnonLabel}>Offrir anonymement</Text>
          <Text style={styles.giftAnonSub}>
            Le feed dira « Un membre a offert… » — jamais ton nom ni le montant.
          </Text>
        </View>
      </Pressable>

      <Text style={styles.giftCap}>
        {CREW_BOOST_MAX_ACTIVE} boost actif à la fois · tout le crew en profite · aucun montant
        affiché.
      </Text>

      <Pressable
        accessibilityRole="button"
        onPress={onConfirm}
        style={({ pressed }) => [styles.detailPrimary, pressed && styles.pressed]}
      >
        <Text style={styles.detailPrimaryText}>
          Confirmer ·{' '}
          {item.priceEur !== undefined
            ? `${item.priceEur.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`
            : `${item.priceShards?.toLocaleString('fr-FR')} Éclats`}
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onCancel} style={styles.detailClose}>
        <Text style={styles.detailCloseText}>Annuler</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // N1 : lecture de solde, UNE surface qui flotte (pas de contour — c'est de
  // l'info, pas un état). Chiffres GRANDS (fontSizes.lg).
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 16,
    paddingHorizontal: spacing.cardPadding,
    marginTop: 8,
    gap: 12,
  },
  walletCell: { flex: 1, alignItems: 'center', gap: 3 },
  walletValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  walletValue: {
    color: colors.blanc,
    fontSize: fontSizes.lg,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  walletLabel: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 0.3 },
  walletClubOn: { color: colors.blanc, fontSize: fontSizes.xs, fontWeight: '700' },
  walletClubOff: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  walletDivider: { width: 1, height: 34, backgroundColor: colors.grisLigne },
  // Bannière doctrine (§28) : plus de boîte — texte posé sur l'ESPACE avec un
  // filet supérieur discret (séparateur, pas un cadre).
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  bannerTextWrap: { flex: 1 },
  bannerStrong: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  bannerSoft: { color: colors.gris, fontSize: fontSizes.sm },
  loot: { marginTop: 10 },
  notice: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 10, textAlign: 'center' },
  advisor: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: borderState.activeSoft,
    padding: 16,
    gap: 14,
    marginTop: 14,
  },
  advisorHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  advisorIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: elevation.raised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisorTitleWrap: { flex: 1, gap: 2 },
  advisorKicker: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  advisorName: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800' },
  advisorMeta: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600' },
  advisorLines: {
    gap: 9,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
    paddingTop: 12,
  },
  explainLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  explainLabel: {
    width: 70,
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  explainText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 19 },
  advisorCta: {
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advisorCtaText: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800' },
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
  needSegmented: { marginBottom: 10 },
  sectionItems: { gap: 10 },
  footnote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 22,
  },
  pressed: { opacity: 0.85 },
  packLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  packLineText: { color: colors.blanc, fontSize: fontSizes.sm, flex: 1 },

  // Sheets (détail + gifting)
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  // Bottom sheet = plan N1. Filet hairline en bord haut seulement (séparateur
  // du backdrop, pas un cadre). Fond noir profond pour que les surfaces N2
  // relevées à l'intérieur ressortent.
  sheet: {
    backgroundColor: colors.noir,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
    paddingHorizontal: spacing.cardPadding,
    paddingTop: 10,
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.grisLigne,
    marginBottom: 14,
  },
  detailPreview: { alignItems: 'center', gap: 8, marginBottom: 14 },
  // Preview d'objet = disque N2 relevé qui FLOTTE sur la surface du sheet (pas
  // de cadre encadré : le contour est réservé aux états).
  detailPreviewBox: {
    width: 96,
    height: 96,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: elevation.raised,
  },
  detailName: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800', textAlign: 'center' },
  detailMeta: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  detailDesc: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20, marginBottom: 12 },
  detailExplain: {
    gap: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: borderState.hairline,
    paddingVertical: 12,
    marginBottom: 12,
  },
  // Chip N2 relevé, sans contour (info légère, pas un état).
  detailChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: elevation.raised,
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  detailChipText: { color: colors.gris, fontSize: fontSizes.xs },
  // VRAIE preview de contenu (contenu du pack) = l'unique nesting autorisé ;
  // surface N2 relevée, sans contour.
  detailContents: {
    gap: 7,
    backgroundColor: elevation.raised,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 12,
  },
  detailOwned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailOwnedText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600', flex: 1 },
  currencySegmented: { marginBottom: 14 },
  detailActions: { gap: 10, marginTop: 4 },
  detailPrimary: {
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: gameColors.crew,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailPrimaryText: { color: colors.noir, fontSize: fontSizes.sm, fontWeight: '800' },
  // État verrouillé : surface N2 relevée, sans contour (pas d'action = pas de
  // chartreuse ; le gris dit « indisponible »).
  detailLocked: { backgroundColor: elevation.raised },
  detailLockedText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '700' },
  // Action secondaire (Offrir) : surface N2 relevée, sans contour — un seul gros
  // CTA chartreuse (Obtenir/Équiper) domine la scène.
  detailGhost: {
    height: 50,
    borderRadius: radii.pill,
    backgroundColor: elevation.raised,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  detailGhostText: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  detailClose: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  detailCloseText: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },

  // Gifting
  giftTitle: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '800', textAlign: 'center' },
  giftSubtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
  },
  // Preview de l'offrande = surface N2 relevée, sans contour.
  giftPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: elevation.raised,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 14,
  },
  giftPreviewText: { flex: 1 },
  giftEffect: { color: gameColors.crew, fontSize: fontSizes.sm, fontWeight: '800' },
  giftDesc: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 4, lineHeight: 16 },
  giftExplain: {
    gap: 9,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: borderState.hairline,
    paddingVertical: 12,
    marginBottom: 14,
  },
  // Copy de contribution = texte posé sur l'espace, plus de boîte encadrée.
  giftContribBox: {
    paddingVertical: 4,
    marginBottom: 14,
    gap: 4,
  },
  giftContribLine: { color: colors.blanc, fontSize: fontSizes.sm },
  giftContribStrong: { color: colors.gris, fontSize: fontSizes.xs, fontStyle: 'italic' },
  giftAnonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkboxOn: { backgroundColor: gameColors.crew, borderColor: gameColors.crew },
  giftAnonText: { flex: 1 },
  giftAnonLabel: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },
  giftAnonSub: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 2, lineHeight: 16 },
  giftCap: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: 16,
    marginBottom: 14,
  },
});
