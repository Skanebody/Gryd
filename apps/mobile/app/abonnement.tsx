/**
 * GRYD — ABONNEMENT ET ACHATS : une page qui INFORME avant de vendre.
 *
 * ─── LE RETOUR QUI A PRODUIT CET ÉCRAN (fondateur, 10/09/2026) ─────────────
 * « La page Abonnements et achats ne montre aucun abonnement, aucun prix, aucun
 * achat, aucun statut. Il faut de l'information. »
 *
 * Il avait raison, et la cause était structurelle : TOUT l'écran descendait des
 * offres du Store. Sur son iPhone, sans clé RevenueCat de production,
 * `usePremium` rend `unavailable` — donc aucune offre, donc aucun prix, donc
 * aucun bloc. L'app ne mentait pas ; elle se taisait. Or se taire sur une page
 * qu'on a ouverte exprès, c'est laisser croire qu'il n'y a rien à savoir.
 *
 * ─── QUATRE BLOCS, ET AUCUN NE DÉPEND DE LA BOUTIQUE POUR EXISTER ─────────
 *  1. TON STATUT   — ce que le SERVEUR sait de tes droits, en quatre états
 *                    distincts (pas connecté · en cours · gratuit / actif ·
 *                    impossible de vérifier). Jamais un « 0 » nu (L8/L14/L19).
 *  2. GRYD+        — ce que l'offre contient, son TARIF PRÉVU, et la garantie
 *                    anti-pay-to-win. Lisible même boutique fermée.
 *  3. TES ACHATS   — la liste RÉELLE. Vide est un fait ; illisible en est un
 *                    autre, et les deux ne s'écrivent pas pareil.
 *  4. GÉRER        — la gestion Store (seulement si un abonnement est actif),
 *                    les CGV et la confidentialité.
 *
 * ─── LA SEULE CHOSE QUI DÉPEND DE LA BOUTIQUE : LES BOUTONS ───────────────
 * « S'abonner » et « Restaurer mes achats » n'apparaissent que si
 * `storeAvailability2026` est OUVERTE — c'est-à-dire clé de production, offres
 * lues, et au moins un prix confirmé. Un bouton d'achat sans produit derrière
 * est un bouton mort (MASTER §12, revue Apple 2.1) ; un prix affiché sans achat
 * possible serait 3.1.1. On dit donc le tarif PRÉVU, on ne peint pas l'achat.
 *
 * ─── CE QUI RESTE INTERDIT ICI ────────────────────────────────────────────
 * Cet écran ne lance JAMAIS d'achat : la seule surface de vente reste
 * `/premium`. Et il ne promet aucune DATE d'ouverture — ni le cahier ni
 * ADR-011 n'en fixent une, et « bientôt » sur une échéance inconnue est
 * exactement le dark pattern qu'ADR-011 interdit.
 */
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Text, View } from 'react-native';
import { router } from 'expo-router';
import { EVENTS, refonteColors as c } from '@klaim/shared';
import { useLocale } from '../src/i18n/store';
import { screen, track } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import {
  GRYD_PLUS_BENEFITS_2026,
  GRYD_PLUS_PLANNED_PRICES_2026,
  NO_PAID_ADVANTAGE_COPY_2026,
  NO_TRIAL_NOTICE_2026,
  PERIOD_COPY_2026,
  PERMANENT_COLLECTION_COPY_2026,
  PERMANENT_COLLECTION_PRICES_2026,
  PLANNED_PRICE_NOTICE_2026,
  PRE_SALE_INCLUDED_COPY_2026,
  PRE_SALE_SWITCH_NOTICE_2026,
  RENEWAL_NOTICE_2026,
  STORE_CLOSED_COPY_2026,
  STORE_CLOSED_TITLE_2026,
  benefitLabel2026,
  formatEurCents2026,
  noPaidGameAdvantage2026,
  pick2026,
  plannedYearlySavingsPercent2026,
  recentPurchases,
  refreshServerGrydPlusAccess,
  showsPlannedPrices2026,
  storeAvailability2026,
  storeSaysNotOnSale2026,
  useGrydPlusAccess,
  usePremium,
} from '../src/features/premium';
import { ProfileButton, ProfileLink, ProfilePage, ProfileSection, s, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';
import { AccountDoor2026 } from '../src/features/account/AccountDoor2026';

/** Gestion des abonnements iOS. Apple l'expose à cette adresse et à elle seule. */
const APPLE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

export default function AbonnementScreen() {
  const copy = useRefonteCopy(); const locale = useLocale();
  const premium = usePremium(); const access = useGrydPlusAccess();
  const [message, setMessage] = useState<string | null>(null); const [syncing, setSyncing] = useState(false);
  const { status, pro, purchases, managementUrl, busy } = premium;
  const store = storeAvailability2026({ status, offers: premium.offers, blockedReason: premium.blockedReason });
  const planned = showsPlannedPrices2026(store);
  const savings = plannedYearlySavingsPercent2026();
  /**
   * PRÉ-VENTE (décision fondateur du 11/09/2026) : les outils GRYD+ sont ouverts
   * à tout compte connecté tant que rien n'est en vente. `access.active` est
   * donc vrai sans abonnement — un cinquième état, distinct des quatre autres,
   * qu'on n'a pas le droit de replier sur « GRYD+ actif » (ce serait affirmer un
   * paiement) ni sur « Gratuit » (ce serait taire que les outils sont ouverts).
   */
  const included = access.reason === 'pre_sale_open';
  const subscribed = access.active && !included;
  const expiry = access.expiresAtMs ?? (subscribed && pro?.kind === 'active' ? pro.expiresAtMs : null);
  const shown = purchases ? recentPurchases(purchases) : null;
  // Un abonnement ACTIF est le seul cas où « Gérer » a une destination réelle :
  // sans droit ouvert, la page Store d'Apple ne montrerait rien à gérer.
  const manageUrl = managementUrl ?? (Platform.OS === 'ios' ? APPLE_SUBSCRIPTIONS_URL : null);
  useEffect(() => { screen('abonnement'); }, []);

  // Les libellés partagés avec `/premium` : une phrase par fait, écrite UNE fois
  // dans `planCopy2026.ts`. Deux écrans qui décrivent le même état de boutique
  // avec deux phrases différentes, c'est deux occasions de se contredire.
  const closedSentence = store.open ? null : pick2026(STORE_CLOSED_COPY_2026[store.reason], locale);

  return <ProfilePage title={copy('Abonnement et achats', 'Subscription and purchases')} back backHref="/parametres">

    {/* ─── 1. TON STATUT ─────────────────────────────────────────────────── */}
    <ProfileSection title={copy('Ton statut', 'Your status')} />
    {access.status === 'loading' ? <View style={[s.state, { flexDirection: 'row', alignItems: 'center' }]}>
      <ActivityIndicator color={c.darkInk} /><Text style={s.meta}>{copy('Vérification de tes droits…', 'Checking your access…')}</Text>
    </View> : access.status === 'signedOut' ? <AccountDoor2026 reason={copy('Un abonnement s’attache à un compte, jamais à un téléphone. Tes droits et tes achats se retrouvent avec lui.', 'A subscription belongs to an account, never to a phone. Your access and your purchases come back with it.')} /> : access.status === 'unavailable' ? <View style={s.state}>
      <Text style={s.title}>{copy('Impossible de vérifier', 'Cannot verify')}</Text>
      <Text style={s.body}>{copy('Tes droits n’ont pas pu être lus. Ce n’est pas « aucun abonnement » : on ne sait pas encore.', 'Your access could not be read. This is not “no subscription”: we do not know yet.')}</Text>
      <ProfileButton label={copy('Réessayer', 'Try again')} secondary busy={syncing} onPress={() => {
        setSyncing(true);
        void refreshServerGrydPlusAccess().then(ok => { access.reload(); premium.reload(); setMessage(ok ? copy('Tes droits sont actualisés.', 'Your access is refreshed.') : copy('La vérification reste indisponible.', 'Verification is still unavailable.')); })
          .catch(() => setMessage(copy('La vérification a échoué.', 'Verification failed.'))).finally(() => setSyncing(false));
      }} />
    </View> : access.status === 'pending' ? <View style={s.state}>
      <Text style={s.title}>{copy('Confirmation en cours', 'Confirming')}</Text>
      <Text style={s.body}>{copy('L’App Store a enregistré ton achat. Tes droits s’ouvriront dès que le serveur l’aura confirmé.', 'The App Store registered your purchase. Your access opens as soon as the server confirms it.')}</Text>
    </View> : included ? <View style={s.state}>
      <Text style={s.title}>{copy('Outils GRYD+ ouverts', 'GRYD+ tools open')}</Text>
      <Text style={s.body}>{pick2026(PRE_SALE_INCLUDED_COPY_2026, locale)}</Text>
      <Text style={s.meta}>{pick2026(PRE_SALE_SWITCH_NOTICE_2026, locale)}</Text>
    </View> : access.active ? <View style={s.state}>
      <Text style={s.title}>{copy('GRYD+ actif', 'GRYD+ active')}</Text>
      {expiry ? <Text style={s.body}>{access.cancelled
        ? copy('Renouvellement arrêté. Disponible jusqu’au ', 'Renewal stopped. Available until ') + new Date(expiry).toLocaleDateString(locale)
        : copy('Prochaine échéance le ', 'Next renewal on ') + new Date(expiry).toLocaleDateString(locale)}</Text>
        : <Text style={s.body}>{copy('Aucune échéance confirmée par le serveur pour l’instant.', 'No renewal date confirmed by the server yet.')}</Text>}
    </View> : <View style={s.state}>
      <Text style={s.title}>{copy('Gratuit', 'Free')}</Text>
      <Text style={s.body}>{copy('Tu n’as aucun abonnement en cours. Le sport, le jeu, les crews et les défis sont à toi sans payer.', 'You have no active subscription. Sport, the game, crews and challenges are yours without paying.')}</Text>
    </View>}

    {/* ─── 2. GRYD+ ──────────────────────────────────────────────────────── */}
    <ProfileSection title="GRYD+" />
    <Text style={s.body}>{copy('GRYD+ ajoute des outils d’analyse privée et de composition. Il ne touche à rien de ce qui se gagne sur le terrain.', 'GRYD+ adds private analysis and composition tools. It changes nothing of what is earned on the ground.')}</Text>
    {/* La même phrase que `/premium` et que l'outil lui-même : une seule voix. */}
    {included ? <Text style={[s.body, { marginTop: 10 }]}>{pick2026(PRE_SALE_INCLUDED_COPY_2026, locale)}</Text> : null}
    <View style={[s.gap, { marginTop: 14 }]}>{GRYD_PLUS_BENEFITS_2026.map(benefit =>
      <Text key={benefit.id} style={s.body}>{benefitLabel2026(benefit.id, benefit.count, locale)}</Text>)}</View>
    {noPaidGameAdvantage2026() ? <Text style={[s.meta, { marginTop: 14 }]}>{pick2026(NO_PAID_ADVANTAGE_COPY_2026, locale)}</Text> : null}

    <ProfileSection title={copy('Le prix', 'The price')} />
    {planned ? <View style={s.gap}>
      {GRYD_PLUS_PLANNED_PRICES_2026.map(price => {
        const amount = formatEurCents2026(price.cents, locale);
        return amount === null ? null : <View key={price.period} style={{ gap: 4 }}>
          <Text style={s.title}>{amount} <Text style={s.body}>{pick2026(PERIOD_COPY_2026[price.period], locale)}</Text></Text>
          {price.period === 'yearly' && savings !== null ? <Text style={s.meta}>{copy(`Soit ${savings} % de moins que douze mois payés un par un.`, `That is ${savings}% less than twelve months paid one by one.`)}</Text> : null}
        </View>;
      })}
      <Text style={s.meta}>{pick2026(PLANNED_PRICE_NOTICE_2026, locale)}</Text>
      <Text style={s.meta}>{pick2026(NO_TRIAL_NOTICE_2026, locale)}</Text>
    </View> : <View style={s.gap}>{premium.offers.map(offer => <View key={offer.packageId} style={{ gap: 4 }}>
      <Text style={s.title}>{offer.priceLabel} <Text style={s.body}>{pick2026(PERIOD_COPY_2026[offer.period === 'yearly' ? 'yearly' : 'monthly'], locale)}</Text></Text>
      {offer.period === 'yearly' && premium.savingsPercent !== null ? <Text style={s.meta}>{copy(`Soit ${premium.savingsPercent} % de moins que douze mois payés un par un.`, `That is ${premium.savingsPercent}% less than twelve months paid one by one.`)}</Text> : null}
      {offer.freeTrial ? <Text style={s.meta}>{copy('Un essai peut t’être proposé selon ton éligibilité. L’App Store confirme les conditions avant l’achat.', 'A trial may be offered if you are eligible. The App Store confirms the terms before purchase.')}</Text> : null}
    </View>)}
      <Text style={s.meta}>{pick2026(RENEWAL_NOTICE_2026, locale)}</Text>
    </View>}

    {store.open
      ? <View style={{ marginTop: 14, alignSelf: 'flex-start' }}><ProfileButton label={copy('S’abonner', 'Subscribe')} onPress={() => { haptics.light(); router.push('/premium'); }} /></View>
      : <View style={{ marginTop: 14, gap: 10 }}>
        {storeSaysNotOnSale2026(store) ? <Text style={s.title}>{pick2026(STORE_CLOSED_TITLE_2026, locale)}</Text> : null}
        <Text style={s.body}>{closedSentence}</Text>
        {store.reason === 'readFailed' ? <View style={{ alignSelf: 'flex-start' }}><ProfileButton label={copy('Réessayer', 'Try again')} secondary onPress={premium.reload} /></View> : null}
      </View>}

    <Text style={[s.meta, { marginTop: 14 }]}>{copy('À part : les collections permanentes sont des achats uniques, jamais inclus dans GRYD+.', 'Separately: permanent collections are one-time purchases, never included in GRYD+.')}</Text>
    <View style={[s.gap, { marginTop: 8 }]}>{PERMANENT_COLLECTION_PRICES_2026.map(collection => {
      const amount = formatEurCents2026(collection.cents, locale);
      return amount === null ? null : <Text key={collection.id} style={s.meta}>{pick2026(PERMANENT_COLLECTION_COPY_2026[collection.id], locale)} · {planned ? copy(`${amount} prévus`, `${amount} planned`) : amount}</Text>;
    })}</View>

    {/* ─── 3. TES ACHATS ─────────────────────────────────────────────────── */}
    <ProfileSection title={copy('Tes achats', 'Your purchases')} />
    {access.status === 'signedOut' ? <Text style={s.meta}>{copy('Connecte-toi pour retrouver tes achats.', 'Sign in to find your purchases.')}</Text>
      : shown === null ? <Text style={s.meta}>{copy('Tes achats n’ont pas pu être lus ici. Tes reçus complets restent dans ton App Store.', 'Your purchases could not be read here. Your full receipts remain in your App Store.')}</Text>
        : shown.length === 0 ? <Text style={s.meta}>{copy('Aucun achat pour l’instant.', 'No purchase yet.')}</Text>
          : <View style={s.gap}>{shown.map(record => <View key={record.productId} style={{ gap: 4 }}>
            <Text style={s.body}>{record.productId}</Text>
            <Text style={s.meta}>{new Date(record.atMs).toLocaleDateString(locale)}</Text>
          </View>)}
            <Text style={s.meta}>{purchases && purchases.length > shown.length ? copy('Derniers produits achetés uniquement. ', 'Latest purchased products only. ') : ''}{copy('Montants, renouvellements et reçus détaillés : consulte ton App Store.', 'Amounts, renewals and detailed receipts: see your App Store.')}</Text>
          </View>}
    {store.open ? <View style={{ marginTop: 12, alignSelf: 'flex-start' }}><ProfileButton label={copy('Restaurer mes achats', 'Restore purchases')} secondary busy={busy === 'restore'} disabled={busy !== null} onPress={() => {
      void premium.restore().then(result => {
        if (!result) return;
        track(EVENTS.purchasesRestored, { result: result.kind });
        access.reload();
        if (result.kind === 'restored') haptics.success(); else if (result.kind === 'failed') haptics.error();
        setMessage(result.kind === 'restored' ? copy('Tes droits sont restaurés.', 'Your access is restored.')
          : result.kind === 'nothing_to_restore' ? copy('Aucun achat à restaurer sur ce compte.', 'No purchase to restore on this account.')
            : copy('La restauration n’a pas abouti. Réessaie, ou écris au support.', 'Restore did not complete. Try again, or contact support.'));
      });
    }} /></View> : null}
    {message ? <Text accessibilityRole="alert" style={[s.body, { marginTop: 12 }]}>{message}</Text> : null}

    {/* ─── 4. GÉRER ──────────────────────────────────────────────────────── */}
    <ProfileSection title={copy('Gérer', 'Manage')} />
    {/* « Gérer mon abonnement » n'a de destination QUE s'il y a un abonnement.
        En pré-vente il n'y en a aucun : le bouton mènerait à une page Store
        vide, c'est-à-dire un bouton mort (MASTER §12). */}
    {subscribed ? manageUrl ? <View style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
      <ProfileButton label={copy('Gérer mon abonnement', 'Manage my subscription')} secondary onPress={() => {
        haptics.light();
        void Linking.openURL(manageUrl).catch(() => setMessage(copy('L’App Store n’a pas pu s’ouvrir. Retrouve ton abonnement dans les réglages de ton appareil.', 'The App Store could not open. Find your subscription in your device settings.')));
      }} />
    </View> : <Text style={[s.meta, { marginBottom: 12 }]}>{copy('Pour modifier ou résilier, ouvre les réglages d’abonnement de la boutique utilisée lors de l’achat.', 'To change or cancel, open the subscription settings of the store used for the purchase.')}</Text> : null}
    <Text style={s.body}>{copy('Après une résiliation, tes activités, tes exports et les objets déjà obtenus restent à toi. Les comparaisons et les contrôles Studio se ferment à la fin de la période payée. Le jeu et l’XP ne changent pas.', 'After cancelling, your activities, exports and earned objects remain yours. Comparisons and Studio controls close at the end of the paid period. The game and XP do not change.')}</Text>
    <Text style={[s.meta, { marginTop: 10 }]}>{copy('Supprimer ton compte GRYD ne résilie pas la facturation de l’App Store : ce sont deux gestes distincts.', 'Deleting your GRYD account does not cancel App Store billing: these are two separate actions.')}</Text>
    <ProfileLink title={copy('Conditions de vente', 'Terms of Sale')} icon="verrou" onPress={() => router.push('/legal/cgv')} />
    <ProfileLink title={copy('Confidentialité', 'Privacy')} icon="verrou" onPress={() => router.push('/legal/confidentialite')} />
    <ProfileLink title={copy('Contacter le support', 'Contact support')} icon="aide" onPress={() => router.push('/support')} />
    <ProfileLink title={copy('Voir GRYD+', 'View GRYD+')} icon="pass" onPress={() => router.push('/premium')} />
  </ProfilePage>;
}
