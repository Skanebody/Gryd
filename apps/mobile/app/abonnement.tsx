import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, View } from 'react-native';
import { router } from 'expo-router';
import { EVENTS, refonteColors as c } from '@klaim/shared';
import { useLocale } from '../src/i18n/store';
import { screen, track } from '../src/lib/analytics';
import { recentPurchases, refreshServerGrydPlusAccess, useGrydPlusAccess, usePremium } from '../src/features/premium';
import { ProfileButton, ProfileLink, ProfilePage, ProfileSection, s, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';

/** Management never launches a purchase; the only sale surface remains /premium. */
export default function AbonnementScreen() {
  const copy = useRefonteCopy(); const locale = useLocale(); const premium = usePremium(); const access = useGrydPlusAccess();
  const [message, setMessage] = useState<string | null>(null); const [syncing, setSyncing] = useState(false);
  const { status, pro, purchases, managementUrl, busy } = premium;
  const active = access.active || pro?.kind === 'active';
  const expiry = pro?.kind === 'active' ? pro.expiresAtMs : access.expiresAtMs;
  const known = pro !== null || access.status === 'active' || access.status === 'inactive';
  const shown = purchases ? recentPurchases(purchases) : null;
  useEffect(() => { screen('abonnement'); }, []);
  return <ProfilePage title={copy('Mon abonnement', 'My subscription')} back backHref="/premium">
    <Text style={s.title}>GRYD+</Text>
    {status === 'loading' && !known ? <View style={s.state}><ActivityIndicator color={c.darkInk} /><Text style={s.meta}>{copy('Vérification de tes droits…', 'Checking access…')}</Text></View> : status === 'signedOut' ? <View style={s.state}><Text style={s.body}>{copy('Connecte-toi pour retrouver ton abonnement.', 'Sign in to find your subscription.')}</Text>{premium.canSignIn ? <ProfileButton label={copy('Me connecter', 'Sign in')} onPress={() => router.push('/sign-in')} /> : null}</View> : <View style={s.state}>
      <Text style={s.sectionTitle}>{active ? pro?.kind === 'active' && pro.trial ? copy('Essai actif', 'Trial active') : pro?.kind === 'active' && pro.cancelled ? copy('Actif · renouvellement arrêté', 'Active · renewal cancelled') : copy('Abonnement actif', 'Subscription active') : known ? copy('Aucun abonnement actif', 'No active subscription') : copy('Droits indisponibles', 'Access unavailable')}</Text>
      {active && expiry ? <Text style={s.meta}>{copy('Fin de période : ', 'Period ends: ')}{new Date(expiry).toLocaleDateString(locale)}</Text> : pro?.kind === 'active' && pro.lifetime ? <Text style={s.meta}>{copy('Ton droit à vie existant est conservé.', 'Your existing lifetime access is retained.')}</Text> : pro?.kind === 'expired' && pro.expiredAtMs ? <Text style={s.meta}>{copy('Expiré le ', 'Expired on ')}{new Date(pro.expiredAtMs).toLocaleDateString(locale)}</Text> : null}
      {managementUrl ? <ProfileButton label={copy('Gérer dans le Store', 'Manage in Store')} onPress={() => { void Linking.openURL(managementUrl).catch(() => setMessage(copy('Le Store n’a pas pu être ouvert. Retrouve ton abonnement dans les réglages de ton appareil.', 'The Store could not open. Find your subscription in device settings.'))); }} /> : <Text style={s.meta}>{copy('Pour modifier ou résilier un abonnement, ouvre les réglages d’abonnement du Store utilisé lors de l’achat.', 'To change or cancel a subscription, open subscription settings in the Store used for the purchase.')}</Text>}
      {status === 'error' ? <ProfileButton label={copy('Réessayer la lecture', 'Retry loading')} secondary onPress={premium.reload} /> : null}
      {status === 'ready' || status === 'empty' || status === 'error' ? <ProfileButton label={copy('Restaurer mes achats', 'Restore purchases')} secondary busy={busy === 'restore'} disabled={busy !== null} onPress={() => { void premium.restore().then(result => { if (!result) return; track(EVENTS.purchasesRestored, { result: result.kind }); access.reload(); setMessage(result.kind === 'restored' ? copy('Tes droits sont restaurés.', 'Your access is restored.') : result.kind === 'nothing_to_restore' ? copy('Aucun abonnement actif à restaurer.', 'No active subscription to restore.') : copy('La restauration a échoué. Réessaie ou contacte le support.', 'Restore failed. Try again or contact support.')); }); }} /> : null}
      {status === 'unavailable' ? <ProfileButton label={copy('Actualiser mes droits', 'Refresh access')} secondary busy={syncing} onPress={() => { setSyncing(true); void refreshServerGrydPlusAccess().then(ok => { access.reload(); setMessage(ok ? copy('Tes droits sont actualisés.', 'Your access is refreshed.') : copy('La vérification est indisponible.', 'Verification is unavailable.')); }).catch(() => setMessage(copy('La vérification a échoué.', 'Verification failed.'))).finally(() => setSyncing(false)); }} /> : null}
    </View>}
    {message ? <Text accessibilityRole="alert" style={[s.body, { marginBottom: 16 }]}>{message}</Text> : null}
    <ProfileSection title={copy('Historique d’achats', 'Purchase history')} />
    {shown === null ? <Text style={s.meta}>{copy('L’historique n’est pas disponible ici. Les reçus complets restent dans ton Store.', 'History is unavailable here. Full receipts remain in your Store.')}</Text> : shown.length === 0 ? <Text style={s.meta}>{copy('Aucun achat dans l’historique communiqué par le Store.', 'No purchases in the history provided by the Store.')}</Text> : <View style={s.gap}>{shown.map(record => <View key={record.productId} style={{ gap: 4 }}><Text style={s.body}>{record.productId}</Text><Text style={s.meta}>{new Date(record.atMs).toLocaleDateString(locale)}</Text></View>)}<Text style={s.meta}>{purchases && purchases.length > shown.length ? copy('Derniers produits achetés uniquement. ', 'Latest purchased products only. ') : ''}{copy('Montants, renouvellements et reçus détaillés : consulte ton Store.', 'Amounts, renewals and detailed receipts: see your Store.')}</Text></View>}
    <ProfileSection title={copy('Après résiliation', 'After cancellation')} />
    <Text style={s.body}>{copy('Tes activités, tes exports et tes objets de saison obtenus restent à toi. Les comparaisons et les contrôles Studio avancés se ferment à la fin de la période payée. Le jeu et l’XP ne changent pas.', 'Your activities, exports and earned season objects remain yours. Comparisons and advanced Studio controls close at the end of the paid period. The game and XP do not change.')}</Text>
    <Text style={[s.meta, { marginTop: 12 }]}>{copy('Supprimer ton compte GRYD ne résilie pas la facturation du Store.', 'Deleting your GRYD account does not cancel Store billing.')}</Text>
    <ProfileLink title={copy('Contacter le support', 'Contact support')} icon="aide" onPress={() => router.push('/support')} />
    <ProfileLink title={copy('Voir GRYD+', 'View GRYD+')} icon="pass" onPress={() => router.push('/premium')} />
  </ProfilePage>;
}
