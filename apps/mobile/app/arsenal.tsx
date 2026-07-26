/**
 * GRYD — E17 « BOUTIQUE & PREMIUM ». Vendre du STATUT, jamais de la capacité.
 *
 * Composition de la planche, dans l'ordre : hero saisonnier · chips de
 * catégories · grille 2 colonnes (aperçu réel dans le contexte GRYD, prix,
 * propriété claire) · note permanente « Cosmétique uniquement… » · paywall
 * Premium (titre, promesse, 3 bénéfices MAX, 2 prix, Conditions). Tap sur une
 * case → sheet de détail (§A : les détails au tap, jamais imposés).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CET ÉCRAN NE VEND RIEN (25/07/2026) — la décision la plus lourde
 * ══════════════════════════════════════════════════════════════════════════
 * LE PAIEMENT N'EXISTE PAS. Aucune dépendance RevenueCat/IAP dans `apps/mobile`,
 * aucune RPC d'achat, `purchase_initiated`/`purchase_completed` jamais émis (O3
 * ouvert). Or l'écran d'avant SIMULAIT l'achat : `buy()` appelait
 * `grantLocalItem()` et, pour un prix en Éclats, `spendEclats()` ne retranchait
 * qu'un delta React. Résultat, sur un tap :
 *   · un DÉBIT annoncé que personne n'a jamais enregistré ;
 *   · « Dans ton arsenal » — une possession que l'app perdait au remontage ;
 *   · et l'objet devenait ÉQUIPABLE : `equipCosmetic` persistait le choix en
 *     AsyncStorage, et l'onglet Profil peignait un cadre et un titre que le
 *     joueur n'avait ni payés ni gagnés.
 * C'est la pire catégorie de mensonge d'interface : celle qui fait croire à une
 * action. Un bouton MORT ne trompe qu'une fois ; un bouton MENTEUR fait croire
 * qu'on possède.
 *
 * Ce qui a été fait : les deux méthodes ont été retirées de
 * `ArsenalInventoryStore` (à la source, pas seulement d'ici — aucun futur écran
 * ne pourra les rappeler), et le CTA d'achat est devenu un ÉTAT. Les PRIX
 * restent affichés : ils sont vrais (game-rules), et un catalogue consultable
 * est utile. L'écran dit, en haut et sans détour, que la boutique n'est pas
 * ouverte et que rien n'est débité ni attribué. Même traitement pour
 * l'abonnement : ni « ESSAYER 7 JOURS » ni « Restaurer les achats » — aucune API
 * ne les back, et l'absence d'un bouton n'est pas un mensonge quand son
 * affichage en serait un.
 *
 * L'OFFRANDE AU CREW a disparu pour la même raison : `confirmGift()` n'envoyait
 * RIEN et affichait « Message posté au feed » — un message social attribué à
 * quelqu'un, fabriqué de toutes pièces. Tant qu'aucune RPC de don n'existe, le
 * flux entier est retiré plutôt que déguisé en « bientôt ».
 *
 * ══ HERO PREMIUM : PAS DE HEATMAP (2ᵉ point d'honnêteté) ═══════════════════
 * La planche veut « la VRAIE heatmap territoriale du joueur (90 jours) ». Il
 * n'existe AUCUN composant heatmap dans l'app — « heatmap » n'y est que de la
 * COPIE — et la seule donnée territoriale réelle (`hex_claims`) vaut [] à ce
 * jour. Une heatmap d'illustration serait une donnée fabriquée, et pire, placée
 * en hero elle se lirait comme « ton territoire ». Le hero est donc
 * TYPOGRAPHIQUE : le titre et la promesse, qui sont vrais. Aucune image qui
 * pourrait passer pour les données du joueur.
 *
 * ══ AUTRES ÉCARTS ASSUMÉS À LA PLANCHE ════════════════════════════════════
 * · « SAISON 3 · HIVER — Collection Night Print · 18 j » : le numéro et les
 *   jours viennent de la RPC `season_current` (réels, 4 états distincts) ; la
 *   « collection saisonnière » n'existe sur aucun item du catalogue — l'inventer
 *   serait fabriquer, elle est donc absente.
 * · « 39,99 €/an · soit 3,33 €/mois » : placeholders de maquette. Le prix annuel
 *   réel est `SKU_PRICES_EUR.club_annual` et l'équivalent mensuel est CALCULÉ
 *   (`monthlyEquivalentEur`, testé) — jamais recopié.
 * · Les chips sont des catégories d'OBJET (planche) : les chips de « besoin » et
 *   la carte « CHOISI POUR TOI » ont été retirées. Deux rangées de chips
 *   concurrentes = deux navigations pour une seule décision (§A) ; et surtout,
 *   recommander en tête ce que personne ne peut obtenir est un cul-de-sac —
 *   c'est déjà la règle appliquée aux objets fonctionnels.
 *
 * ANTI PAY-TO-WIN : aucun item ne vend territoire, distance, défense, position
 * live d'un rival, rang ni victoire ; aucune loot box ; aucun rabais affiché ;
 * aucune confidentialité payante. Prix = constantes de game-rules uniquement.
 * Et aucun chemin d'achat n'est accessible PENDANT une course (`useRunInProgress`).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BADGE_TIER_LABEL,
  borderState,
  colors,
  fonts,
  elevation,
  fontSizes,
  gameColors,
  iconSizes,
  isFunctionalItemKey,
  motion,
  radii,
  seasonProgress,
  spacing,
  withAlpha,
} from '@klaim/shared';
import { Redirect, router } from 'expo-router';
import { C } from '../src/i18n/catalog/flagged';
import { SHOP_C, shopPauseCopy } from '../src/i18n/catalog/arsenal';
import { useT } from '../src/i18n/store';
import { flags } from '../src/lib/flags';
import { useSession } from '../src/lib/session';
import { EVENTS, screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { StackScreen } from '../src/ui/StackScreen';
import { formatInt } from '../src/ui/format';
import { ArsenalIcon, RewardCard, Segmented, useCountUp, useReveal } from '../src/ui/game';
import { useActiveSeason } from '../src/features/season/useActiveSeason';
import { ArsenalPreview } from '../src/features/arsenal/preview';
import {
  PREMIUM_MAX_BENEFITS,
  ShopGridCard,
  equipScopeOf,
  explainArsenalItem,
  ownershipKindOf,
  premiumItem,
  premiumPrices,
  shopCategoryKeys,
  shopItems,
  useArsenalInventory,
  useArsenalSignals,
  useRunInProgress,
  type ArsenalCatalogItem,
  type ArsenalPlayerSignals,
  type ShopCategoryKey,
} from '../src/features/arsenal';
import { formatEclats, formatEur } from '../src/features/arsenal/ShopGridCard';
import {
  arsenalContents,
  arsenalDescription,
  arsenalEquipScopeLabel,
  arsenalLimit,
  arsenalName,
  arsenalSectionLabel,
} from '../src/features/arsenal/copy';

/** Largeur (px) de l'aperçu dans la sheet de détail — prominent, tient sur mobile. */
const PREVIEW_ILLUS_SIZE = 208;

/** Puce pleine (le set d'icônes n'a pas de coche — dot chartreuse cohérent DA). */
function Dot({ color = gameColors.crew, size = 6 }: { color?: string; size?: number }) {
  return <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />;
}

/**
 * D8 — surface hors MVP : la route est masquée (les moteurs restent intacts).
 *
 * RÈGLE DES HOOKS : le garde-fou vit dans un composant SANS hook. `flags.arsenal`
 * est une constante de bundle aujourd'hui, mais le jour où les flags deviendraient
 * dynamiques, un `return` conditionnel avant les hooks ferait crasher l'écran.
 */
export default function ArsenalScreen() {
  if (!flags.arsenal) return <Redirect href="/" />;
  return <ArsenalBody />;
}

function ArsenalBody() {
  const insets = useSafeAreaInsets();
  const t = useT();
  useEffect(() => {
    screen('arsenal');
  }, []);

  /** Item ouvert en détail (sheet). */
  const [detail, setDetail] = useState<ArsenalCatalogItem | null>(null);
  /** Catégorie explorée (chips de la planche) — l'écran démarre sur « Tout ». */
  const [category, setCategory] = useState<ShopCategoryKey>('all');
  /** Reveal d'un ÉQUIPEMENT (la seule action réelle de l'écran). */
  const [equipFlash, setEquipFlash] = useState<ArsenalCatalogItem | null>(null);

  const { signals: arsenalSignals } = useArsenalSignals();
  const arsenalInventory = useArsenalInventory();
  const { wallet: rawWallet, ownedKeys: rawOwned, equipped } = arsenalInventory;
  const season = useActiveSeason();
  const runInProgress = useRunInProgress();
  /** Copie de la pause boutique, dans le monde de la sortie EN COURS (E14). */
  const runPause = shopPauseCopy(runInProgress.activity);

  /**
   * SOLDE ET INVENTAIRE : LUS, OU RIEN. `useArsenalInventory` ne fabrique plus
   * ni solde ni possession ; il reste ici la seconde moitié de la règle — on
   * n'affiche que ce qui vient du serveur. Un solde inconnu se dit « — » et PAS
   * « 0 » : zéro serait une affirmation (un compte à sec) alors que la vérité
   * est qu'on n'a pas lu. La note en dessous distingue les deux causes.
   */
  const { session, configured, loading: sessionLoading } = useSession();
  const signedIn = configured && (session !== null || sessionLoading);
  const inventoryIsReal = arsenalInventory.source === 'server';
  const wallet = useMemo(
    () => (inventoryIsReal ? rawWallet : { eclats: 0, foulees: 0, isClub: false }),
    [inventoryIsReal, rawWallet],
  );
  // Rien de « possédé » tant que rien n'a été lu : sinon la grille proposerait
  // d'équiper un objet fictif.
  const owned = useMemo(
    () => (inventoryIsReal ? rawOwned : (new Set<string>() as ReadonlySet<string>)),
    [inventoryIsReal, rawOwned],
  );

  const eclatsDisplay = useCountUp(wallet.eclats);

  const equipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (equipTimer.current !== null) clearTimeout(equipTimer.current);
    },
    [],
  );

  const isEquipped = (item: ArsenalCatalogItem): boolean => {
    const scope = equipScopeOf(item.key);
    return scope !== null && equipped[scope] === item.key;
  };

  /**
   * Équiper un cosmétique DÉJÀ possédé : la seule action de l'écran qui change
   * réellement quelque chose (la Player Card et la carte suivent). Elle ne
   * dépense rien et n'accorde rien.
   */
  const equip = (item: ArsenalCatalogItem): void => {
    const scope = equipScopeOf(item.key);
    if (scope === null || !owned.has(item.key)) return;
    haptics.light();
    void arsenalInventory.equipItem(item.key);
    // `item`/`scope` sont des clés de catalogue (non-PII), jamais un libellé.
    track(EVENTS.skinEquipped, { item: item.key, scope });
    setDetail(null);
    if (equipTimer.current !== null) clearTimeout(equipTimer.current);
    setEquipFlash(item);
    equipTimer.current = setTimeout(() => setEquipFlash(null), motion.toastDismissMs * 2);
  };

  // ─── Hero saisonnier : QUATRE états, jamais un numéro écrit en dur ─────────
  const activeSeason = season.status === 'active' ? season.season : null;
  const seasonDaysLeft =
    activeSeason === null
      ? null
      : seasonProgress(activeSeason.startsAt, activeSeason.endsAt).joursRestants;
  const kicker =
    activeSeason === null
      ? t(SHOP_C.kicker)
      : t(SHOP_C.kickerSeason, { season: activeSeason.number });

  // ─── Grille ────────────────────────────────────────────────────────────────
  const categories = useMemo(() => shopCategoryKeys(), []);
  const items = useMemo(() => shopItems(category), [category]);

  // Course en cours = AUCUN chemin d'achat (planche E17). Tant que la lecture du
  // buffer n'a pas abouti, on n'affirme rien : on ne peint ni la boutique ni le
  // blocage — un chargement ne conclut jamais à la place du joueur.
  const shopReadable = !runInProgress.loading && !runInProgress.running;

  return (
    <StackScreen title={t(C.arsenalTitle)} icon="boutique" kicker={kicker}>
      {/* ══ 1. HERO SAISONNIER ══════════════════════════════════════════════ */}
      <SeasonHero
        status={season.status}
        number={activeSeason?.number ?? null}
        daysLeft={seasonDaysLeft}
      />

      {/* ══ 2. SOLDE — lu, ou « — » (jamais un 0 affirmatif) ════════════════ */}
      <View style={styles.wallet}>
        <View style={styles.walletCell}>
          <View style={styles.walletValueRow}>
            <ArsenalIcon slug="eclats" size={16} color={colors.blanc} />
            <Text style={styles.walletValue}>
              {inventoryIsReal ? formatInt(eclatsDisplay) : t(C.walletUnknown)}
            </Text>
          </View>
          <Text style={styles.walletLabel}>Éclats</Text>
        </View>
        <View style={styles.walletDivider} />
        <View style={styles.walletCell}>
          <Icon name="couronne" size={iconSizes.md} color={wallet.isClub ? colors.chartreuse : colors.gris} />
          <Text style={wallet.isClub ? styles.walletClubOn : styles.walletClubOff}>
            {inventoryIsReal ? t(wallet.isClub ? C.clubActive : C.clubInactive) : t(C.walletUnknown)}
          </Text>
        </View>
      </View>
      {!inventoryIsReal ? (
        <Text style={styles.mutedNote}>
          {t(signedIn ? C.walletUnreadNote : C.walletSignedOutNote)}
        </Text>
      ) : null}

      {/* ══ 3. NOTE PERMANENTE (libellé exact de la planche) ════════════════ */}
      <View style={styles.permanentNote}>
        <Icon name="verrou" size={iconSizes.md} color={colors.blanc} />
        <Text style={styles.permanentNoteText}>{t(SHOP_C.cosmeticOnlyNote)}</Text>
      </View>

      {equipFlash ? (
        <View style={styles.loot} key={equipFlash.key}>
          <RewardCard
            icon="cadeau"
            label={arsenalName(equipFlash, t)}
            sublabel={t(C.lootEquipped)}
            state="unlocked"
            reveal
          />
        </View>
      ) : null}

      {runInProgress.running ? (
        /* Sortie en cours : la boutique se met en pause, on le DIT — et on le
           dit DANS LE MONDE DE CETTE SORTIE. `useRunInProgress` remonte la
           discipline persistée au départ (`activity`) depuis le 26/07 ; cet
           écran ne lisait que le booléen `running` et rendait « Course en
           cours. / on ne te vend rien pendant que tu cours » à un cycliste au
           milieu de sa sortie. La donnée était là, seul le câblage manquait.
           `activity` vaut `null` quand la discipline est INCONNUE : la copie
           neutre s'applique alors — on ne devine pas (cf. shopPauseCopy). */
        <View style={styles.statePanel}>
          <Text style={styles.statePanelTitle}>{t(runPause.title)}</Text>
          <Text style={styles.statePanelBody}>{t(runPause.body)}</Text>
        </View>
      ) : null}

      {shopReadable ? (
        <>
          {/* ══ 4. LA BOUTIQUE N'EST PAS OUVERTE — dit AVANT les prix ══════ */}
          <View style={styles.statePanel}>
            <Text style={styles.statePanelTitle}>{t(SHOP_C.notOpenTitle)}</Text>
            <Text style={styles.statePanelBody}>{t(SHOP_C.notOpenBody)}</Text>
          </View>

          {/* ══ 5. CHIPS DE CATÉGORIES ════════════════════════════════════ */}
          <Segmented
            accessibilityLabel={t(SHOP_C.categoriesA11y)}
            tone="surface"
            scrollable
            value={category}
            onChange={setCategory}
            options={categories.map((key) => ({
              id: key,
              label: key === 'all' ? t(SHOP_C.categoryAll) : arsenalSectionLabel(key, t),
            }))}
            style={styles.categories}
          />

          {/* ══ 6. GRILLE 2 COLONNES ══════════════════════════════════════ */}
          {items.length === 0 ? (
            <Text style={styles.mutedNote}>{t(SHOP_C.emptyCategory)}</Text>
          ) : (
            <View style={styles.grid}>
              {items.map((item) => (
                <ShopGridCard
                  key={item.key}
                  item={item}
                  owned={owned.has(item.key)}
                  equipped={isEquipped(item)}
                  onPress={() => setDetail(item)}
                />
              ))}
            </View>
          )}

          {/* ══ 7. PAYWALL PREMIUM ════════════════════════════════════════ */}
          <PremiumBlock />
        </>
      ) : null}

      {/* ══ DÉTAIL ITEM (sheet §25) ══ */}
      <Modal
        visible={detail !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setDetail(null)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            accessibilityLabel={t(C.fermer)}
            style={styles.sheetBackdrop}
            onPress={() => setDetail(null)}
          />
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            {detail ? (
              <ItemDetail
                item={detail}
                signals={arsenalSignals}
                owned={owned.has(detail.key)}
                equipped={isEquipped(detail)}
                onEquip={() => equip(detail)}
                onClose={() => setDetail(null)}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </StackScreen>
  );
}

// ─── Hero saisonnier ─────────────────────────────────────────────────────────

/**
 * Saison RÉELLE (RPC `season_current`) ou rien. Quatre états DISTINCTS :
 * lecture en cours / saison active / aucune saison / échec de lecture. Aucun
 * ne se confond avec un autre, et aucun n'écrit « Saison 0 » de sa propre
 * autorité — c'était le défaut du kicker précédent.
 *
 * La « Collection Night Print » de la planche n'a aucune source : aucun champ de
 * collection saisonnière n'existe sur les items. Le hero dit donc ce qui est
 * vrai — quelle saison tourne, et combien de temps il reste.
 */
function SeasonHero({
  status,
  number,
  daysLeft,
}: {
  status: 'loading' | 'active' | 'none' | 'error';
  number: number | null;
  daysLeft: number | null;
}) {
  const t = useT();
  if (status === 'loading') return <Text style={styles.heroMuted}>{t(SHOP_C.seasonReading)}</Text>;
  if (status === 'error') return <Text style={styles.heroMuted}>{t(SHOP_C.seasonError)}</Text>;
  if (status === 'none' || number === null) {
    return <Text style={styles.heroMuted}>{t(SHOP_C.seasonNone)}</Text>;
  }
  return (
    <View style={styles.hero}>
      <Text style={styles.heroTitle}>{t(SHOP_C.seasonHeroTitle, { season: number })}</Text>
      <Text style={styles.heroSub}>
        {daysLeft !== null && daysLeft <= 1
          ? t(SHOP_C.seasonHeroLastDay)
          : t(SHOP_C.seasonHeroDays, { days: daysLeft ?? 0 })}
      </Text>
    </View>
  );
}

// ─── Paywall Premium ─────────────────────────────────────────────────────────

/**
 * Bloc Premium de la planche : titre · promesse · 3 bénéfices MAX · 2 prix
 * visibles avec l'équivalent mensuel · Conditions.
 *
 * CE QUI N'Y EST PAS, ET POURQUOI :
 *  · pas de HEATMAP en hero — il n'en existe aucune dans l'app, et une
 *    illustration serait prise pour les données du joueur (cf. en-tête) ;
 *  · pas d'« ESSAYER 7 JOURS » — aucun essai, aucun entitlement, aucun webhook
 *    côté client : ce serait un bouton mort sur l'accent le plus fort de la
 *    scène (§A4) ;
 *  · pas de « Restaurer les achats » — aucune API de restauration n'existe.
 * « Conditions » est le SEUL lien vivant du bloc (`/legal/cgv` existe).
 *
 * `paywall_view` est émis ICI, au rendu réel du paywall. Avant, il partait au
 * montage de l'écran alors qu'aucun paywall n'y était rendu : l'analytique
 * mentait aussi.
 */
function PremiumBlock() {
  const t = useT();
  const club = premiumItem();
  const prices = premiumPrices();

  useEffect(() => {
    track(EVENTS.paywallView, { trigger: 'arsenal' });
  }, []);

  if (!club) return null;
  const benefits = (arsenalContents(club, t) ?? []).slice(0, PREMIUM_MAX_BENEFITS);

  return (
    <View style={styles.premium}>
      <Text style={styles.premiumTitle}>{t(SHOP_C.premiumTitle)}</Text>
      <Text style={styles.premiumPromise}>{t(SHOP_C.premiumPromise)}</Text>

      <Text style={styles.premiumSectionLabel}>{t(SHOP_C.premiumBenefits)}</Text>
      <View style={styles.premiumBenefits}>
        {benefits.map((line, i) => (
          <View key={i} style={styles.premiumBenefitRow}>
            <Dot />
            <Text style={styles.premiumBenefitText}>{line}</Text>
          </View>
        ))}
      </View>

      {/* Deux prix RÉELS (game-rules). L'équivalent mensuel est une DIVISION
          vérifiable, jamais un rabais annoncé : ni prix barré, ni pourcentage. */}
      <View style={styles.premiumPrices}>
        <View style={styles.premiumPrice}>
          <Text style={styles.premiumPriceLabel}>{t(SHOP_C.premiumAnnualLabel)}</Text>
          <Text style={styles.premiumPriceValue}>
            {t(SHOP_C.premiumAnnualPrice, { price: formatEur(prices.annualEur) })}
          </Text>
          <Text style={styles.premiumPriceNote}>
            {t(SHOP_C.premiumAnnualPerMonth, { price: formatEur(prices.annualPerMonthEur) })}
          </Text>
        </View>
        <View style={styles.premiumPrice}>
          <Text style={styles.premiumPriceLabel}>{t(SHOP_C.premiumMonthlyLabel)}</Text>
          <Text style={styles.premiumPriceValue}>
            {t(SHOP_C.premiumMonthlyPrice, { price: formatEur(prices.monthlyEur) })}
          </Text>
          <Text style={styles.premiumPriceNote}>{t(SHOP_C.premiumMonthlyNote)}</Text>
        </View>
      </View>

      <Text style={styles.premiumNotOpen}>{t(SHOP_C.premiumNotOpen)}</Text>

      <Pressable
        accessibilityRole="link"
        onPress={() => {
          track(EVENTS.ctaTapped, { cta: 'premium_terms' });
          router.push('/legal/cgv');
        }}
        style={({ pressed }) => [styles.premiumTerms, pressed && styles.pressed]}
      >
        <Text style={styles.premiumTermsText}>{t(SHOP_C.premiumTerms)}</Text>
        <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
      </Pressable>
    </View>
  );
}

// ─── Détail item (sheet §25) ─────────────────────────────────────────────────

function ItemDetail({
  item,
  signals,
  owned,
  equipped,
  onEquip,
  onClose,
}: {
  item: ArsenalCatalogItem;
  signals: ArsenalPlayerSignals;
  owned: boolean;
  equipped: boolean;
  onEquip: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const { opacity, scale } = useReveal(true);
  const scope = equipScopeOf(item.key);
  const isSkin = item.section === 'skins_territory' || item.section === 'skins_trace';
  const neverForSale = isFunctionalItemKey(item.key);
  const advice = explainArsenalItem(item, signals);
  const kind = ownershipKindOf(item, owned);

  // Les prix sont des FAITS affichés, plus un choix de devise : sans achat
  // possible, un segmented « Éclats / € » demanderait de choisir comment payer
  // une chose qui ne se paie pas.
  const priceText =
    item.priceShards !== undefined && item.priceEur !== undefined
      ? t(SHOP_C.priceDual, {
          eclats: formatEclats(item.priceShards),
          eur: formatEur(item.priceEur),
        })
      : item.priceShards !== undefined
        ? formatEclats(item.priceShards)
        : item.priceEur !== undefined
          ? formatEur(item.priceEur)
          : null;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <View style={styles.sheetHandle} />
      {/* Aperçu ILLUSTRÉ « à quoi ça sert » : rendu fidèle du cosmétique OU
          schéma de mécanique honnête de l'objet — jamais une icône générique. */}
      <View style={styles.detailPreview}>
        <View style={styles.detailIllus}>
          <ArsenalPreview item={item} size={PREVIEW_ILLUS_SIZE} />
        </View>
        <Text style={styles.detailName}>{arsenalName(item, t)}</Text>
        <Text style={styles.detailMeta}>
          {BADGE_TIER_LABEL[item.rarity]}
          {item.draft ? t(C.saison1Suffix) : ''}
        </Text>
      </View>

      <Text style={styles.detailDesc}>
        {arsenalDescription(item, t)} {t(advice.mechanic, advice.vars)}
      </Text>

      <View style={styles.detailExplain}>
        <ExplanationLine label={t(C.labelSertA)} text={t(advice.benefit, advice.vars)} />
        <ExplanationLine label={t(C.labelPourquoi)} text={t(advice.whyNow, advice.vars)} />
        <ExplanationLine label={t(C.labelLimite)} text={t(advice.guardrail, advice.vars)} />
      </View>

      {item.limit ? (
        <View style={styles.detailChip}>
          <Icon name="verrou" size={iconSizes.xs} color={colors.gris} />
          <Text style={styles.detailChipText}>
            {t(C.plafond, { limit: arsenalLimit(item, t) ?? item.limit })}
          </Text>
        </View>
      ) : null}

      {/* Objet fonctionnel : ni prix, ni voie d'obtention promise. Écrire « se
          gagne en courant » serait promettre au-delà du code — aucune RPC ne
          crédite ces clés à ce jour. */}
      {neverForSale ? (
        <View style={styles.detailChip}>
          <Icon name="verrou" size={iconSizes.xs} color={colors.gris} />
          <Text style={styles.detailChipText}>{t(C.neverForSaleNote)}</Text>
        </View>
      ) : null}

      {/* Où ça se voit — dit une SEULE fois : ici quand l'objet n'est pas
          possédé (c'est alors une info « à quoi ça sert »), sinon dans la ligne
          de statut plus bas. L'ancien libellé annonçait « à la Saison 0 », un
          numéro de saison que personne n'avait lu. */}
      {isSkin && scope !== null && !owned ? (
        <View style={styles.detailChip}>
          <Icon name="carte" size={iconSizes.xs} color={gameColors.crew} />
          <Text style={styles.detailChipText}>{arsenalEquipScopeLabel(scope, t)}</Text>
        </View>
      ) : null}

      {item.contents ? (
        <View style={styles.detailContents}>
          {arsenalContents(item, t)!.map((line, i) => (
            <View key={i} style={styles.packLine}>
              <Dot />
              <Text style={styles.packLineText}>{line}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {owned ? (
        <View style={styles.detailOwned}>
          <Dot size={7} />
          <Text style={styles.detailOwnedText}>
            {equipped ? t(C.lootEquipped) : t(C.lootOwnedSub)}
            {scope ? ` · ${arsenalEquipScopeLabel(scope, t)}` : ''}
          </Text>
        </View>
      ) : null}

      {/* Prix = information, jamais une promesse d'achat. */}
      {priceText !== null && !owned ? (
        <View style={styles.detailPriceRow}>
          <Text style={styles.detailPriceValue}>{priceText}</Text>
        </View>
      ) : null}

      {/* CTA : un SEUL cas est une vraie action — équiper ce qu'on possède. */}
      <View style={styles.detailActions}>
        {owned && scope && !equipped ? (
          <Pressable
            accessibilityRole="button"
            onPress={onEquip}
            style={({ pressed }) => [styles.detailPrimary, pressed && styles.pressed]}
          >
            <Text style={styles.detailPrimaryText}>{t(C.equiper)}</Text>
          </Pressable>
        ) : (
          /* ÉTAT, PAS BOUTON. Un « Obtenir » qui n'obtient rien serait le bouton
             mort que CLAUDE.md interdit — sur l'accent le plus fort de la scène. */
          <View style={[styles.detailPrimary, styles.detailLocked]}>
            <Icon
              name={owned ? 'couronne' : 'verrou'}
              size={15}
              color={owned ? colors.chartreuse : colors.gris}
            />
            <Text style={styles.detailLockedText}>
              {owned
                ? equipped
                  ? t(C.lootEquipped)
                  : t(C.possede)
                : kind === 'neverForSale'
                  ? t(SHOP_C.neverForSaleLabel)
                  : kind === 'draft'
                    ? t(SHOP_C.draftLabel)
                    : kind === 'packOnly'
                      ? t(SHOP_C.packOnlyLabel)
                      : t(SHOP_C.notOpenTitle)}
            </Text>
          </View>
        )}
      </View>

      <Pressable accessibilityRole="button" onPress={onClose} style={styles.detailClose}>
        <Text style={styles.detailCloseText}>{t(C.fermer)}</Text>
      </Pressable>
      {/* Anim wrapper (reveal) — placé en fin pour ne pas gêner le scroll. */}
      <View style={{ opacity, transform: [{ scale }], height: 0 }} pointerEvents="none" />
    </ScrollView>
  );
}

function ExplanationLine({ label, text }: { label: string; text: string }) {
  return (
    <View style={styles.explainLine}>
      <Text style={styles.explainLabel} numberOfLines={1} ellipsizeMode="clip">
        {label}
      </Text>
      <Text style={styles.explainText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Hero saisonnier : texte posé sur l'espace (pas de boîte de plus) ──
  hero: { marginTop: 4, marginBottom: 12 },
  heroTitle: { color: colors.blanc, fontSize: fontSizes.lg, fontFamily: fonts.display, fontWeight: '800' },
  heroSub: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 2 },
  heroMuted: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.5,
    marginTop: 4,
    marginBottom: 12,
  },

  // ── Solde : UNE surface qui flotte, chiffres GRANDS ──
  wallet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    paddingVertical: 16,
    paddingHorizontal: spacing.cardPadding,
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
  walletClubOn: { color: colors.blanc, fontSize: fontSizes.xs, fontFamily: fonts.textSemi, fontWeight: '700' },
  walletClubOff: { color: colors.gris, fontSize: fontSizes.xs, fontFamily: fonts.textSemi, fontWeight: '600' },
  walletDivider: { width: 1, height: 34, backgroundColor: colors.grisLigne },

  mutedNote: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.5,
    marginTop: spacing.xs,
  },

  // ── Note permanente anti-p2w : posée sur l'espace, jamais encadrée ──
  permanentNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  permanentNoteText: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: 19,
    fontFamily: fonts.textSemi,
    fontWeight: '600',
  },

  loot: { marginTop: 10 },

  // ── Panneau d'ÉTAT (boutique fermée / course en cours) : surface N1, pas
  //    un bouton — rien à taper, tout à lire. ──
  statePanel: {
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: 16,
    gap: 6,
    marginTop: 6,
    marginBottom: 14,
  },
  statePanelTitle: { color: colors.blanc, fontSize: fontSizes.sm, fontFamily: fonts.textSemi, fontWeight: '700' },
  statePanelBody: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: fontSizes.xs * 1.6 },

  categories: { marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // ── Paywall Premium ──
  premium: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: borderState.hairline,
    gap: 6,
  },
  premiumTitle: { color: colors.blanc, fontSize: fontSizes.xl, fontFamily: fonts.display, fontWeight: '800' },
  premiumPromise: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
  premiumSectionLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 16,
  },
  premiumBenefits: { gap: 8, marginTop: 4 },
  premiumBenefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  premiumBenefitText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 19 },
  premiumPrices: { flexDirection: 'row', gap: 10, marginTop: 18 },
  premiumPrice: {
    flex: 1,
    backgroundColor: elevation.surface,
    borderRadius: radii.card,
    padding: 14,
    gap: 3,
  },
  premiumPriceLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  premiumPriceValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  premiumPriceNote: { color: colors.gris, fontSize: fontSizes.xs, lineHeight: 16 },
  premiumNotOpen: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.6,
    marginTop: 14,
  },
  premiumTerms: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    marginTop: 4,
  },
  premiumTermsText: { color: colors.blanc, fontSize: fontSizes.sm, fontFamily: fonts.textSemi, fontWeight: '700' },

  pressed: { opacity: 0.85 },
  packLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  packLineText: { color: colors.blanc, fontSize: fontSizes.sm, flex: 1 },

  // ── Sheet de détail ──
  sheetRoot: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: withAlpha(colors.noir, 0.6) },
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
  // Panneau d'ILLUSTRATION : surface N2 relevée — les aperçus de skin territoire
  // y fondent leur masque de décor (cf. preview/cosmetic.tsx).
  detailIllus: {
    alignSelf: 'stretch',
    borderRadius: radii.card,
    backgroundColor: elevation.raised,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    overflow: 'hidden',
  },
  detailName: { color: colors.blanc, fontSize: fontSizes.lg, fontFamily: fonts.display, fontWeight: '800', textAlign: 'center' },
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
  explainLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  explainLabel: {
    // 80 px : « POURQUOI » (majuscules + letterSpacing) tient sur UNE ligne.
    width: 80,
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  explainText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 19 },
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
  // `flexShrink` : sans lui, un texte long dans un chip en ROW déborde au lieu
  // de passer à la ligne (§A — un texte d'information n'est jamais coupé).
  detailChipText: { color: colors.gris, fontSize: fontSizes.xs, flexShrink: 1 },
  detailContents: {
    gap: 7,
    backgroundColor: elevation.raised,
    borderRadius: radii.card,
    padding: 14,
    marginBottom: 12,
  },
  detailOwned: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  detailOwnedText: { color: colors.blanc, fontSize: fontSizes.sm, fontFamily: fonts.textSemi, fontWeight: '600', flex: 1 },
  detailPriceRow: { marginBottom: 12 },
  detailPriceValue: {
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontFamily: fonts.display,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
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
  detailPrimaryText: { color: colors.noir, fontSize: fontSizes.sm, fontFamily: fonts.display, fontWeight: '800' },
  // État verrouillé : surface N2 relevée, sans contour (pas d'action = pas de
  // chartreuse ; le gris dit « indisponible »).
  detailLocked: { backgroundColor: elevation.raised },
  detailLockedText: { color: colors.gris, fontSize: fontSizes.sm, fontFamily: fonts.textSemi, fontWeight: '700' },
  detailClose: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
  detailCloseText: { color: colors.gris, fontSize: fontSizes.sm, fontFamily: fonts.textSemi, fontWeight: '600' },
});
