/**
 * GRYD — E74 « GRYD PREMIUM » (route `/premium`).
 *
 * ══ RÈGLE CONSTITUTIONNELLE, ÉCRITE ICI PARCE QU'ELLE S'APPLIQUE ICI ═══════
 * ANTI PAY-TO-WIN STRICT (§1.6) : **aucun achat de cet écran ne donne du
 * territoire, des points, de la vitesse, une protection, une priorité de
 * classement ni une immunité.** Premium est COSMÉTIQUE, STATUTAIRE et SOCIAL.
 * Ce n'est pas une préférence de design qu'un futur chantier pourrait
 * rééquilibrer « pour la conversion » : c'est la constitution du jeu. Le jour où
 * un `if (pro)` apparaîtrait dans le moteur de capture, de défense ou de
 * classement, ce serait un défaut de conformité à corriger, pas une feature.
 *
 * ══ AUCUN PRIX N'EST ÉCRIT DANS CE FICHIER ════════════════════════════════
 * Les montants viennent des OFFERINGS RevenueCat (`product.priceString`), déjà
 * localisés par le Store. Spec E74 : « les valeurs 39,99 €/an et 4,99 €/mois
 * sont des valeurs de CONFIGURATION, jamais codées en dur ». Si le Store ne
 * rend pas un prix, la formule s'affiche « Prix indisponible » ET n'est pas
 * achetable — on ne vend jamais un montant qu'on ne sait pas nommer.
 * Rien d'autre non plus n'est mis en scène : aucun compte à rebours, aucune
 * rareté, aucune « offre qui expire ». La spec l'interdit, et de toute façon ce
 * serait faux.
 *
 * ══ SIX ÉTATS DISTINCTS ═══════════════════════════════════════════════════
 * chargement · pas connecté · plateforme/config sans achat · échec de lecture ·
 * lu mais aucune formule · formules réelles. Un chargement n'affirme RIEN ; un
 * échec ne se déguise jamais en « pas d'offre » ; l'absence d'offre ne se
 * déguise jamais en panne. §A : un seul CTA chartreuse — et il n'existe que
 * quand il peut aboutir (jamais de bouton mort).
 *
 * ══ LA GESTION VIT DANS E75, PAS ICI (28/07/2026) ═════════════════════════
 * Cet écran VEND. La gestion (statut, prochaine échéance, ouverture du Store,
 * restauration, historique minimal, support) est l'écran E75 `/abonnement`,
 * créé le 28/07/2026 — le docblock disait jusque-là « E75 n'existe pas
 * encore », ce qui n'est plus vrai. Le bouton « Gérer » y mène ; c'est E75 qui
 * décide s'il peut ouvrir le Store (il lui faut une `managementURL`).
 */
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  colors,
  fontSizes,
  gameColors,
  iconSizes,
  radii,
  spacing,
  typography,
  EVENTS,
} from '@klaim/shared';
import { useLocale, useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/premium';
import { screen, track } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import { isPurchasable, offerLabelEntry, trialUnitEntry, usePremium } from '../src/features/premium';
import type { PremiumActionResult, PremiumOffer, ProStatus } from '../src/features/premium';
import type { Locale } from '../src/i18n/types';
import type { PurchaseBlockedReason } from '../src/features/premium';

export default function PremiumScreen() {
  const t = useT();
  const locale = useLocale();
  const premium = usePremium();
  const { status, offers, selected, selectedOffer, pro, lastResult, busy } = premium;

  useEffect(() => {
    screen('premium');
    // §8 — `paywall_view` : le déclencheur est l'écran lui-même (E74), pas une
    // offre poussée dans un autre contexte.
    track(EVENTS.paywallView, { trigger: 'e74_screen' });
  }, []);

  const trial = selectedOffer?.freeTrial ?? null;
  const canPurchase =
    status === 'ready' && selectedOffer !== null && isPurchasable(selectedOffer) && busy === null;

  async function onPurchase(): Promise<void> {
    if (!selectedOffer) return;
    track(EVENTS.purchaseInitiated, { sku: selectedOffer.productId });
    const result = await premium.purchaseSelected();
    // `purchaseCompleted` n'est émis que sur un droit RELU actif — pas sur le
    // simple fait que `purchasePackage()` n'a pas jeté (28/07/2026). Un achat
    // différé ('purchase_pending') n'est pas un achat complété : le compter
    // comme tel fausserait la conversion autant que la phrase d'écran.
    if (result?.kind === 'purchased') {
      track(EVENTS.purchaseCompleted, { sku: selectedOffer.productId });
    }
  }

  return (
    <StackScreen title={t(C.title)} icon="pass" kicker={t(C.kicker)} subtitle={t(C.promise)}>
      {/* ── Droit déjà possédé — affiché AVANT toute vente ─────────────────── */}
      {pro && pro.kind !== 'none' ? <ProBanner pro={pro} locale={locale} /> : null}

      {/* ── Bénéfices : trois MAXIMUM, et uniquement ce qui existe ─────────── */}
      <SectionLabel style={styles.sectionLabel}>{t(C.benefitsLabel)}</SectionLabel>
      <View style={styles.benefits}>
        <Benefit label={t(C.benefitStatus)} />
        <Benefit label={t(C.benefitSupport)} />
      </View>
      <Text style={styles.note}>{t(C.honestyNote)}</Text>
      <Text style={styles.antiP2w}>{t(C.antiP2wNote)}</Text>

      {/* ── L'état de la vente ─────────────────────────────────────────────── */}
      {status === 'loading' ? (
        <View style={styles.stateBlock} accessibilityRole="progressbar">
          <ActivityIndicator color={colors.chartreuse} />
          <Text style={styles.stateBody}>{t(C.loading)}</Text>
        </View>
      ) : null}

      {status === 'signedOut' ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateTitle}>{t(C.signedOutTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.signedOutBody)}</Text>
          {/* Sans backend (O1), `/sign-in` n'a personne au bout : aucun bouton. */}
          {premium.canSignIn ? (
            <Button
              label={t(C.ctaSignIn)}
              onPress={() => router.push('/sign-in')}
              analyticsId="premium_sign_in"
            />
          ) : null}
        </View>
      ) : null}

      {status === 'unavailable' ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateTitle}>{t(C.unavailableTitle)}</Text>
          <Text style={styles.stateBody}>{t(blockedEntry(premium.blockedReason))}</Text>
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateTitle}>{t(C.errorTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.errorBody)}</Text>
          <Button
            label={t(C.ctaRetry)}
            variant="ghost"
            onPress={premium.reload}
            analyticsId="premium_retry"
          />
        </View>
      ) : null}

      {status === 'empty' ? (
        <View style={styles.stateBlock}>
          <Text style={styles.stateTitle}>{t(C.emptyTitle)}</Text>
          <Text style={styles.stateBody}>{t(C.emptyBody)}</Text>
        </View>
      ) : null}

      {/* ── Formules réelles ───────────────────────────────────────────────── */}
      {status === 'ready' ? (
        <>
          <SectionLabel style={styles.sectionLabel}>{t(C.offersLabel)}</SectionLabel>
          <View style={styles.offers}>
            {offers.map((offer) => (
              <OfferRow
                key={offer.packageId}
                offer={offer}
                selected={offer.period === selected}
                savingsPercent={offer.period === 'yearly' ? premium.savingsPercent : null}
                onPress={() => premium.select(offer.period)}
              />
            ))}
          </View>

          {/* Essai : annoncé UNIQUEMENT s'il est réellement configuré sur l'offre. */}
          {trial && selectedOffer?.priceLabel ? (
            <Text style={styles.note}>
              {t(C.trialNote, {
                duration: t(trialUnitEntry(trial), { n: trial.units }),
                price: selectedOffer.priceLabel,
              })}
            </Text>
          ) : null}
          <Text style={styles.note}>
            {t(selectedOffer?.period === 'lifetime' ? C.lifetimeNote : C.renewalNote)}
          </Text>

          {/* L'UNIQUE CTA chartreuse — peint seulement s'il peut aboutir. */}
          {canPurchase && selectedOffer ? (
            <View style={styles.cta}>
              <Button
                label={t(ctaEntry(selectedOffer))}
                onPress={() => void onPurchase()}
                loading={busy === 'purchase'}
                analyticsId="premium_purchase"
              />
            </View>
          ) : null}
          {selectedOffer && !isPurchasable(selectedOffer) ? (
            <Text style={styles.stateBody}>{t(C.priceUnavailableHint)}</Text>
          ) : null}
        </>
      ) : null}

      {/* ── Restauration : possible dès que la plateforme sait acheter ─────── */}
      {status === 'ready' || status === 'empty' ? (
        <View style={styles.secondary}>
          <Button
            label={t(C.ctaRestore)}
            variant="ghost"
            onPress={() => void premium.restore()}
            loading={busy === 'restore'}
            analyticsId="premium_restore"
          />
          {/* ── GESTION : E75 EXISTE DEPUIS LE 28/07/2026 ──────────────────────
              Ce bouton ouvrait directement `managementURL` avec `Linking`, et
              n'était donc peint que quand le Store en donnait une. Il mène
              maintenant à l'écran E75 `/abonnement`, qui porte le statut, la
              prochaine échéance, l'historique minimal et le support — et qui
              décide LUI-MÊME s'il peut peindre « Gérer dans le Store » selon
              qu'une `managementURL` existe. La route est toujours atteignable
              ici : E75 gère ses propres états vides, ce n'est pas un bouton
              mort.
              SON LIBELLÉ A ÉTÉ CORRIGÉ LE MÊME JOUR : il disait « Gérer dans le
              Store » alors qu'il ne va PLUS au Store — il navigue vers E75, qui
              peut très bien n'avoir aucun lien Store à offrir. Un libellé
              annonçait donc une destination que le bouton ne tenait pas, dans
              les 5 langues (cf. `catalog/premium.ts`, `ctaManage`). */}
          <Button
            label={t(C.ctaManage)}
            variant="ghost"
            onPress={() => router.push('/abonnement')}
            analyticsId="premium_manage"
          />
        </View>
      ) : null}

      {lastResult ? <Text style={styles.result}>{t(resultEntry(lastResult.kind))}</Text> : null}

      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t(C.ctaTerms)}
        onPress={() => router.push('/legal/cgv')}
        style={({ pressed }) => [styles.terms, pressed && styles.pressed]}
      >
        <Text style={styles.termsLabel}>{t(C.ctaTerms)}</Text>
      </Pressable>
    </StackScreen>
  );
}

// ─── Sous-vues ───────────────────────────────────────────────────────────────

function Benefit({ label }: { label: string }) {
  return (
    <View style={styles.benefitRow}>
      <Icon name="conquete" size={iconSizes.sm} color={colors.chartreuse} />
      <Text style={styles.benefitLabel}>{label}</Text>
    </View>
  );
}

/**
 * Une formule. Le prix affiché est EXACTEMENT `priceLabel` (chaîne du Store) ;
 * quand il manque, la ligne le dit et devient non sélectionnable — sélectionner
 * une offre qu'on ne peut pas acheter n'amènerait qu'à un CTA mort.
 */
function OfferRow({
  offer,
  selected,
  savingsPercent,
  onPress,
}: {
  offer: PremiumOffer;
  selected: boolean;
  savingsPercent: number | null;
  onPress: () => void;
}) {
  const t = useT();
  const label = t(offerLabelEntry(offer.period));
  const buyable = isPurchasable(offer);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: !buyable }}
      accessibilityLabel={t(C.a11ySelectOffer, { label })}
      disabled={!buyable}
      onPress={onPress}
      style={({ pressed }) => [
        styles.offer,
        selected && styles.offerSelected,
        !buyable && styles.offerDisabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.offerText}>
        <Text style={styles.offerLabel} numberOfLines={1} ellipsizeMode="clip">
          {label}
        </Text>
        {savingsPercent !== null ? (
          <Text style={styles.offerSavings}>{t(C.savings, { pct: savingsPercent })}</Text>
        ) : null}
      </View>
      <Text style={buyable ? styles.offerPrice : styles.offerPriceMissing} numberOfLines={1}>
        {offer.priceLabel ?? t(C.priceUnavailable)}
      </Text>
    </Pressable>
  );
}

/** Le droit déjà possédé — un FAIT, avec sa date quand elle est connue. */
function ProBanner({ pro, locale }: { pro: ProStatus; locale: Locale }) {
  const t = useT();
  if (pro.kind === 'expired') {
    return (
      <View style={styles.proBanner}>
        <Icon name="couronne" size={iconSizes.md} color={colors.gris} />
        <Text style={styles.proTitle}>{t(C.proExpiredTitle)}</Text>
      </View>
    );
  }
  if (pro.kind !== 'active') return null;
  const title = pro.trial ? C.proTrialTitle : pro.lifetime ? C.proLifetimeTitle : C.proActiveTitle;
  const date = pro.expiresAtMs !== null ? formatDay(pro.expiresAtMs, locale) : null;
  return (
    <View style={styles.proBanner}>
      <Icon name="couronne" size={iconSizes.md} color={colors.chartreuse} />
      <View style={styles.proText}>
        <Text style={styles.proTitle}>{t(title)}</Text>
        {date ? (
          <Text style={styles.proMeta}>{t(pro.cancelled ? C.proEndsOn : C.proRenewsOn, { date })}</Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Helpers de rendu ────────────────────────────────────────────────────────

/**
 * Date courte. `Intl` n'est pas garanti sur tous les moteurs JS embarqués (même
 * précaution que `history/RealRunCard`) : en cas d'échec, format numérique non
 * ambigu plutôt qu'une chaîne vide — une échéance est un FAIT, elle ne
 * disparaît jamais de l'écran où l'on paie.
 */
function formatDay(ms: number, locale: Locale): string {
  const d = new Date(ms);
  try {
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    const p2 = (n: number) => n.toString().padStart(2, '0');
    return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
  }
}

/** Le CTA nomme ce qui va SE PASSER : essai, abonnement, ou achat unique. */
function ctaEntry(offer: PremiumOffer) {
  if (offer.freeTrial) return C.ctaStartTrial;
  return offer.period === 'lifetime' ? C.ctaBuy : C.ctaSubscribe;
}

function blockedEntry(reason: PurchaseBlockedReason | null) {
  switch (reason) {
    case 'platform_without_iap':
      return C.unavailableWeb;
    case 'sdk_missing':
      return C.unavailableSdk;
    case 'key_is_secret':
      return C.unavailableSecretKey;
    default:
      return C.unavailableKey;
  }
}

function resultEntry(kind: PremiumActionResult['kind']) {
  switch (kind) {
    case 'purchased':
      return C.resultPurchased;
    // Le Store a accepté, le droit n'est pas (encore) actif : deux faits
    // distincts, jamais confondus (cf. `PremiumActionResult`).
    case 'purchase_pending':
      return C.resultPurchasePending;
    case 'restored':
      return C.resultRestored;
    case 'nothing_to_restore':
      return C.resultNothingToRestore;
    case 'failed':
      return C.resultFailed;
  }
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  benefits: { gap: spacing.sm },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  benefitLabel: { ...typography.body, color: colors.blanc, flex: 1 },
  note: { ...typography.meta, color: colors.gris, marginTop: spacing.md, lineHeight: 18 },
  antiP2w: { ...typography.meta, color: colors.chartreuse, marginTop: spacing.sm, lineHeight: 18 },

  stateBlock: { marginTop: spacing.xl, gap: spacing.sm },
  stateTitle: { ...typography.cardTitle, color: colors.blanc },
  stateBody: { ...typography.body, color: colors.gris },

  offers: { gap: spacing.sm },
  offer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  offerSelected: { borderColor: colors.chartreuse },
  offerDisabled: { opacity: 0.55 },
  offerText: { flex: 1, gap: 2 },
  offerLabel: { ...typography.cardTitle, color: colors.blanc },
  offerSavings: { ...typography.meta, color: colors.chartreuse },
  offerPrice: { ...typography.cardTitle, color: colors.blanc, fontSize: fontSizes.md },
  offerPriceMissing: { ...typography.meta, color: colors.gris },

  cta: { marginTop: spacing.lg },
  secondary: { marginTop: spacing.lg, gap: spacing.sm },
  result: { ...typography.body, color: colors.blanc, marginTop: spacing.md },

  proBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: gameColors.gold,
    backgroundColor: colors.carbone,
  },
  proText: { flex: 1, gap: 2 },
  proTitle: { ...typography.cardTitle, color: colors.blanc },
  proMeta: { ...typography.meta, color: colors.gris },

  terms: { marginTop: spacing.xl, alignSelf: 'flex-start', paddingVertical: spacing.xs },
  termsLabel: { ...typography.meta, color: colors.gris, textDecorationLine: 'underline' },
  pressed: { opacity: 0.6 },
});
