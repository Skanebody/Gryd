import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { EVENTS, fonts, refonteColors as c, PROGRESSION_RULES_2026 } from '@klaim/shared';
import { GrydIcon, RewardEmblem } from '../../ui/gryd';
import { isPurchasable, refreshServerGrydPlusAccess, useGrydPlusAccess, usePremium } from '../premium';
import { screen, track } from '../../lib/analytics';
import { useLocale } from '../../i18n/store';
import { ProfileButton, ProfilePage, s, useRefonteCopy } from './ProfilePrimitives';

import { PremiumObjectsPreview2026 } from './PremiumObjectsPreview2026';
export function ProfilePremiumScreen() {
  const copy = useRefonteCopy(); const locale = useLocale();
  const premium = usePremium(); const access = useGrydPlusAccess();
  const { status, pro, lastResult, busy } = premium;
  const [syncing, setSyncing] = useState(false); const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditions, setShowEditions] = useState(false);
  // G28 : « "Premium activé" n'apparaît qu'après confirmation des droits. »
  // Le cache du SDK ne suffit plus ; il produit l'état intermédiaire `pending`.
  const active = access.active;
  const awaitingConfirmation = !active && (access.status === 'pending' || lastResult?.kind === 'purchase_pending');
  useEffect(() => { screen('premium'); track(EVENTS.paywallView, { trigger: 'profile_gryd_plus' }); }, []);
  // Sept états nommés (G28), et jamais un message de panne pour un refus, une
  // annulation ou un droit déjà détenu — trois faits qu'un « réessaie » insulte.
  const resultMessage = lastResult?.kind === 'purchased' ? copy('GRYD+ est actif.', 'GRYD+ is active.')
    : lastResult?.kind === 'purchase_pending' ? copy('Achat enregistré, en attente de confirmation. Tes outils s’ouvriront dès que le droit est confirmé.', 'Purchase registered, awaiting confirmation. Your tools open as soon as access is confirmed.')
    : lastResult?.kind === 'cancelled' ? copy('Achat annulé. Rien n’a été facturé.', 'Purchase cancelled. Nothing was charged.')
    : lastResult?.kind === 'declined' ? copy('Le Store a refusé l’achat. Vérifie ton moyen de paiement dans les réglages du Store.', 'The Store declined the purchase. Check your payment method in the Store settings.')
    : lastResult?.kind === 'already_owned' ? copy('Ce compte détient déjà GRYD+. Restaure tes achats plutôt que d’acheter à nouveau.', 'This account already owns GRYD+. Restore your purchases instead of buying again.')
    : lastResult?.kind === 'restored' ? copy('Tes droits sont restaurés.', 'Your access is restored.')
    : lastResult?.kind === 'nothing_to_restore' ? copy('Aucun abonnement actif trouvé sur ce compte.', 'No active subscription found for this account.')
    : lastResult?.kind === 'failed' ? lastResult.failure === 'network' ? copy('La connexion au Store a échoué. Réessaie une fois en ligne.', 'The Store connection failed. Try again once online.')
      : lastResult.failure === 'store_problem' ? copy('Le Store est indisponible pour le moment. Réessaie plus tard.', 'The Store is unavailable right now. Try again later.')
      : copy('L’action n’a pas abouti. Réessaie ou contacte le support.', 'This action did not complete. Try again or contact support.')
    : null;
  const buy = async () => {
    const sku = premium.selectedOffer?.productId; if (!sku || busy) return;
    track(EVENTS.purchaseInitiated, { sku });
    const result = await premium.purchaseSelected();
    if (result?.kind === 'purchased') { track(EVENTS.purchaseCompleted, { sku }); access.reload(); }
  };
  const restore = async () => { const result = await premium.restore(); if (result) { track(EVENTS.purchasesRestored, { result: result.kind }); access.reload(); } };
  // Une échéance CONFIRMÉE d'abord ; celle du Store ne sert que d'information
  // quand le serveur a déjà ouvert le droit.
  const expiry = access.expiresAtMs ?? (active && pro?.kind === 'active' ? pro.expiresAtMs : null);
  return <ProfilePage tone="light" title="GRYD+" back>
    <View style={local.intro}>
      <View style={local.statusLine}><View style={[local.statusDot, active && local.statusActive]} /><Text style={local.heroMeta}>{active ? copy('Abonnement actif', 'Subscription active') : awaitingConfirmation ? copy('Achat enregistré · confirmation en cours', 'Purchase registered · confirming') : access.status === 'unavailable' ? copy('Droits non vérifiés', 'Access not verified') : copy('GRYD · ÉDITION PLUS', 'GRYD · PLUS EDITION')}</Text></View>
      <Text style={local.title}>{copy('Une autre dimension\npour tes sorties.', 'Another dimension\nfor your activities.')}</Text>
      <Text style={local.heroMeta}>{copy('Analyse. Compose. Garde une trace.', 'Analyse. Compose. Keep a memory.')}</Text>
      <View style={local.heroObject} pointerEvents="none"><RewardEmblem variant="contour" size={100} tone="neutral" state="preview" accessibilityLabel={copy('Édition en aperçu', 'Edition preview')} /></View>
    </View>
    <View style={local.tools}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/premium-analytics')} style={local.tool}>
        <View style={local.toolTop}><Text style={local.index}>01</Text><View style={local.circle}><GrydIcon name="chart" size={19} color={c.ink} /></View></View>
        <Text style={local.toolTitle}>{copy('Comparer', 'Compare')}</Text><Text style={local.meta}>{copy('Tes sorties, côte à côte.', 'Your activities, side by side.')}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/partage')} style={local.tool}>
        <View style={local.toolTop}><Text style={local.index}>02</Text><View style={local.circle}><GrydIcon name="share" size={19} color={c.ink} /></View></View>
        <Text style={local.toolTitle}>{copy('Composer', 'Compose')}</Text><Text style={local.meta}>{copy('4 formats dans le Studio.', '4 formats in the Studio.')}</Text>
      </Pressable>
    </View>
    <Pressable accessibilityRole="button" accessibilityState={{expanded:showEditions}} aria-expanded={showEditions} onPress={() => setShowEditions(value=>!value)} style={local.editions}>
      <View style={s.flex}><Text style={local.toolTitle}>{copy('Les éditions de saison', 'Season editions')}</Text><Text style={local.meta}>{copy(`${PROGRESSION_RULES_2026.premiumVariantTiers.length} variantes à découvrir`, `${PROGRESSION_RULES_2026.premiumVariantTiers.length} variants to discover`)}</Text></View><View style={local.circle}><GrydIcon name={showEditions ? 'minus' : 'plus'} size={19} color={c.ink} /></View>
    </Pressable>
    {showEditions ? <PremiumObjectsPreview2026 tone="light" locale={locale==='en'?'en':'fr'}/> : null}
    {active ? <View style={local.account}>
      {expiry ? <Text style={local.meta}>{access.cancelled || pro?.kind === 'active' && pro.cancelled ? copy('Résilié · disponible jusqu’au ', 'Cancelled · available until ') : copy('Échéance le ', 'Period ends on ')}{new Date(expiry).toLocaleDateString(locale)}</Text> : null}
      <View style={local.compactAction}><ProfileButton tone="light" label={copy('Gérer mon abonnement', 'Manage subscription')} onPress={() => router.push('/abonnement')} /></View>
    </View> : <View style={local.account}>
      <Text style={local.sectionTitle}>{copy('Abonnement', 'Subscription')}</Text>
      {status === 'ready' ? <View>{premium.offers.map(offer => <Pressable key={offer.packageId} accessibilityRole="radio" aria-checked={premium.selected === offer.period} accessibilityState={{ selected: premium.selected === offer.period, disabled: busy !== null || !isPurchasable(offer) }} disabled={busy !== null || !isPurchasable(offer)} onPress={() => premium.select(offer.period)} style={[local.plan, premium.selected === offer.period && local.planSelected]}>
        <View style={[local.radio, premium.selected === offer.period && local.radioSelected]}>{premium.selected === offer.period ? <View style={local.radioDot} /> : null}</View>
        <View style={s.flex}><View style={local.planHeading}><Text style={local.toolTitle}>{offer.period === 'yearly' ? copy('Annuel', 'Yearly') : copy('Mensuel', 'Monthly')}</Text>{offer.period === 'yearly' && premium.savingsPercent ? <Text style={local.savings}>−{premium.savingsPercent}%</Text> : null}</View><Text style={local.meta}>{offer.period === 'yearly' ? copy('Facturé chaque année', 'Billed each year') : copy('Facturé chaque mois', 'Billed each month')}</Text></View>
        <Text style={local.price}>{offer.priceLabel ?? copy('Prix indisponible', 'Price unavailable')}</Text>
      </Pressable>)}</View> : status === 'loading' ? <View style={local.loading}><ActivityIndicator size="small" color={c.ink} /><Text style={local.meta}>{copy('Lecture des offres du Store…', 'Loading Store plans…')}</Text></View> : status === 'signedOut' ? <><Text style={local.meta}>{copy('Connecte-toi pour retrouver les offres et tes droits.', 'Sign in to view plans and your access.')}</Text>{premium.canSignIn ? <View style={local.compactAction}><ProfileButton tone="light" label={copy('Me connecter', 'Sign in')} onPress={() => router.push('/sign-in')} /></View> : null}</> : <><Text style={local.meta}>{status === 'unavailable' && premium.blockedReason === 'platform_without_iap' ? copy('Les offres sont disponibles dans l’app iOS ou Android. Tes droits restent liés à ton compte.', 'Plans are available in the iOS or Android app. Access stays linked to your account.') : copy('Les offres du Store sont indisponibles. Aucun achat sans prix confirmé.', 'Store plans are unavailable. No purchase without a confirmed price.')}</Text>{status !== 'unavailable' ? <View style={local.compactAction}><ProfileButton tone="light" label={copy('Réessayer', 'Retry')} secondary onPress={premium.reload} /></View> : null}</>}
      {status === 'ready' ? <><View style={local.compactAction}><ProfileButton tone="light" label={copy('S’abonner', 'Subscribe')} busy={busy === 'purchase'} disabled={busy !== null || !premium.selectedOffer || !isPurchasable(premium.selectedOffer)} onPress={() => void buy()} /></View><Text style={local.meta}>{copy('Renouvellement automatique. Résiliation dans les réglages du Store ; accès jusqu’à la fin de la période payée.', 'Renews automatically. Cancel in Store settings; access lasts until the paid period ends.')}</Text>{premium.selectedOffer?.freeTrial ? <Text style={local.meta}>{copy('Un essai peut être proposé selon ton éligibilité. Conditions confirmées par le Store avant achat.', 'A trial may be offered if eligible. The Store confirms terms before purchase.')}</Text> : null}</> : null}
    </View>}
    {resultMessage || syncMessage ? <Text accessibilityRole="alert" style={local.notice}>{resultMessage ?? syncMessage}</Text> : null}
    {status === 'ready' || status === 'empty' || status === 'error' ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy !== null, busy: busy === 'restore' }} disabled={busy !== null} onPress={() => void restore()} style={local.utility}>{busy === 'restore' ? <ActivityIndicator size="small" color={c.ink} /> : <GrydIcon name="clock" size={18} color={c.muted} />}<Text style={local.utilityText}>{copy('Restaurer mes achats', 'Restore purchases')}</Text></Pressable> : null}
    {status === 'unavailable' || access.status === 'unavailable' || awaitingConfirmation ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: syncing, busy: syncing }} disabled={syncing} onPress={() => { setSyncing(true); void refreshServerGrydPlusAccess().then(ok => { access.reload(); setSyncMessage(ok ? copy('Tes droits ont été actualisés.', 'Your access has been refreshed.') : copy('Tes droits n’ont pas pu être vérifiés. Réessaie dans l’app ou contacte le support.', 'Your access could not be verified. Retry in the app or contact support.')); }).catch(() => setSyncMessage(copy('Vérification indisponible.', 'Verification unavailable.'))).finally(() => setSyncing(false)); }} style={local.utility}>{syncing ? <ActivityIndicator size="small" color={c.ink} /> : <GrydIcon name="clock" size={18} color={c.muted} />}<Text style={local.utilityText}>{copy('Actualiser mes droits', 'Refresh access')}</Text></Pressable> : null}
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: showDetails }} aria-expanded={showDetails} onPress={() => setShowDetails(value => !value)} style={local.disclosure}><Text style={local.utilityText}>{copy('Ce qui reste à toi', 'What stays yours')}</Text><GrydIcon name={showDetails ? 'minus' : 'plus'} size={18} color={c.muted} /></Pressable>
    {showDetails ? <View style={local.details}><Text style={local.meta}>{copy('Les variantes obtenues restent acquises après résiliation. Les paliers déjà atteints dans la collection suivie sont pris en compte à l’activation.', 'Earned variants remain yours after cancellation. Milestones already reached in your followed collection count when you subscribe.')}</Text><Text style={local.meta}>{copy('Tes activités et tes exports restent accessibles. Le suivi sportif, le jeu, les défis et les crews restent gratuits. GRYD+ ne change ni les captures ni l’XP. Les achats uniques ne sont pas inclus.', 'Your activities and exports remain accessible. Sport tracking, the game, challenges and crews stay free. GRYD+ changes neither capture nor XP. One-time purchases are not included.')}</Text><Pressable accessibilityRole="button" onPress={() => router.push('/abonnement')} style={local.utility}><Text style={local.utilityText}>{copy('Mes achats', 'My purchases')}</Text><GrydIcon name="arrowUpRight" size={18} color={c.muted} /></Pressable></View> : null}
    <View style={local.legal}><Pressable accessibilityRole="link" onPress={() => router.push('/legal/cgv')} style={local.legalLink}><Text style={local.meta}>{copy('Conditions d’achat', 'Purchase terms')}</Text></Pressable><Pressable accessibilityRole="link" onPress={() => router.push('/legal/confidentialite')} style={local.legalLink}><Text style={local.meta}>{copy('Confidentialité', 'Privacy')}</Text></Pressable></View>
  </ProfilePage>;
}
const local = StyleSheet.create({
  intro: { backgroundColor: c.carbon, padding: 16, borderRadius: 24, minHeight: 164, gap: 10, overflow: 'hidden', justifyContent: 'center', marginBottom: 12 },
  title: { fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28, letterSpacing: -.6, color: c.darkInk, maxWidth: 260 }, heroMeta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.darkMuted },
  heroObject: { position: 'absolute', right: -22, bottom: -33, transform: [{ rotate: '-22deg' }], opacity: .7 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 7 }, statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.darkMuted }, statusActive: { backgroundColor: c.accent }, meta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted },
  tools: { flexDirection: 'row', gap: 12 }, tool: { flex: 1, minWidth: 0, padding: 14, gap: 6, borderRadius: 24, backgroundColor: c.surface, minHeight: 124 }, toolTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }, circle: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: c.canvas, borderWidth: 1, borderColor: c.border },
  index: { fontFamily: fonts.mono, fontSize: 12, color: c.muted, fontVariant: ['tabular-nums'] }, toolTitle: { fontFamily: fonts.displaySemi, fontSize: 14, lineHeight: 20, color: c.ink },
  editions: { marginTop: 12, backgroundColor: c.surface, padding: 14, borderRadius: 24, minHeight: 72, flexDirection: 'row', gap: 12, alignItems: 'center' },
  account: { marginTop: 16, paddingBottom: 14, gap: 12 }, sectionTitle: { fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 22, color: c.ink }, loading: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }, compactAction: { alignSelf: 'flex-start', marginTop: 2 }, plan: { minHeight: 68, flexDirection: 'row', gap: 12, alignItems: 'center', borderWidth: 1, borderColor: c.border, borderRadius: 18, padding: 12, marginBottom: 10, backgroundColor: c.surface }, planSelected: { borderColor: c.ink }, planHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, radio: { width: 18, height: 18, borderWidth: 1, borderColor: c.muted, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, radioSelected: { borderColor: c.ink }, radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.ink }, savings: { color: c.ink, fontFamily: fonts.textMedium, fontSize: 12, backgroundColor: c.accent, paddingHorizontal: 6, borderRadius: 4 }, price: { fontFamily: fonts.displayMedium, fontSize: 16, lineHeight: 22, color: c.ink, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' }, notice: { fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.ink, paddingBottom: 14 }, utility: { minHeight: 44, paddingVertical: 10, flexDirection: 'row', gap: 10, alignItems: 'center' }, utilityText: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19, color: c.ink }, disclosure: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border }, details: { gap: 10, paddingVertical: 14 }, legal: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, marginTop: 8 }, legalLink: { minHeight: 44, justifyContent: 'center' },
});
