/**
 * GRYD — ATTERRISSAGE D'UN LIEN DE PARRAINAGE (`gryd://r/CODE`).
 *
 * C'est l'écran que traverse TOUT nouveau filleul — donc celui qui a le moins le
 * droit de mentir. Il ne DÉCIDE rien : `redeem_referral_code_2026` (0186)
 * tranche seule, avec six refus nommés.
 *
 * ─── LES QUATRE ÉTATS, NOMMÉS SÉPARÉMENT ────────────────────────────────────
 *  ① code illisible → aucune navigation, aucune écriture. Le lien peut venir
 *    de n'importe où : un deep link est une entrée hostile comme une autre. On
 *    le dit, et on laisse la porte de la saisie manuelle.
 *  ② pas connecté   → on MÉMORISE l'intention et on montre la porte de compte
 *    unique du dépôt. La reprise se fait dans `startPendingReferralWatcher`,
 *    branché sur le layout racine : cet écran est démonté par la redirection
 *    post-inscription à l'instant précis où la session arrive.
 *  ③ session en cours de restauration → une ligne, jamais un écran noir.
 *  ④ connecté       → on applique, puis on emmène sur `/parrainage`, qui porte
 *    l'état réel — succès ou refus exact.
 *
 * ⚠️ IL N'AFFICHE PAS LE PSEUDO DU PARRAIN. Aucune RPC publique ne résout un
 * code en identité, et en écrire une exposerait un pseudo à quiconque devine
 * six caractères — une fuite, et une énumération. Même arbitrage qu'`/c/[code]`
 * pour le nom d'un crew : mieux vaut un écran sobre qu'un nom inventé.
 */
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { refonteColors as c } from '@klaim/shared';
import { useLocale } from '../../i18n/store';
import { resolve, type Entry } from '../../i18n/types';
import { C } from '../../i18n/catalog/referral';
import { EVENTS, screen, track } from '../../lib/analytics';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { AccountDoor2026 } from '../account/AccountDoor2026';
import { ProfileButton, ProfilePage, s, lightStyles } from '../refonte/ProfilePrimitives';
import { rememberPendingReferral } from './pendingReferral';
import { normalizeReferralCode, parseRedeemResult2026 } from './referral2026';

export function ReferralLanding2026() {
  const locale = useLocale();
  const params = useLocalSearchParams<{ code?: string }>();
  const { session, loading: sessionLoading, configured } = useSession();
  const code = normalizeReferralCode(typeof params.code === 'string' ? params.code : null);
  const [applying, setApplying] = useState(false);
  const attempted = useRef(false);
  const t = (entry: Entry) => resolve(entry, locale);

  useEffect(() => { screen('parrainage-lien'); }, []);

  /**
   * MÉMORISATION INCONDITIONNELLE, et AVANT toute décision de session : au
   * démarrage à froid, `sessionLoading` est vrai et `(tabs)/_layout` peut poser
   * un `<Redirect>` qui remplace la pile entière. Deux lectures asynchrones en
   * course — et si la redirection gagne, l'invitation est perdue en silence,
   * exactement pour la personne pas encore inscrite que ce parcours vise.
   * L'intention est purgée à la consommation, jamais rejouée.
   */
  useEffect(() => {
    if (code === null) return;
    track(EVENTS.deepLinkOpened, { kind: 'referral' });
    void rememberPendingReferral(code);
  }, [code]);

  /** Compte déjà là : on applique tout de suite, une seule fois. */
  useEffect(() => {
    if (code === null || sessionLoading || !session || !supabase || attempted.current) return;
    attempted.current = true;
    setApplying(true);
    const client = supabase;
    void (async () => {
      try {
        const { data, error } = await client.rpc('redeem_referral_code_2026', { p_code: code });
        const result = error ? { ok: false as const, reason: 'network' as const } : parseRedeemResult2026(data);
        router.replace({ pathname: '/parrainage', params: result.ok ? {} : { refus: result.reason } });
      } catch {
        router.replace({ pathname: '/parrainage', params: { refus: 'network' } });
      }
    })();
  }, [code, session, sessionLoading]);

  return <ProfilePage tone="light" title={t(C.lienTitre)} back backHref="/(tabs)/profil">
    {code === null ? <View style={s.state}>
      <Text style={[s.body, lightStyles.body]}>{t(C.lienCodeIllisible)}</Text>
      <ProfileButton tone="light" label={t(C.lienAllerAuParrainage)} onPress={() => router.replace('/parrainage')} />
    </View> : <>
      <View style={local.plate}><Text selectable accessibilityLabel={code.split('').join(' ')} style={local.code}>{code}</Text></View>
      {sessionLoading ? <View style={s.state}>
        <ActivityIndicator color={c.ink} />
        <Text style={[s.meta, lightStyles.meta]}>{t(C.etatLecture)}</Text>
      </View> : session ? <View style={s.state}>
        {applying ? <ActivityIndicator color={c.ink} /> : null}
        <Text style={[s.body, lightStyles.body]}>{t(C.lienCorpsConnecte)}</Text>
      </View> : !configured ? <View style={s.state}>
        <Text style={[s.body, lightStyles.body]}>{t(C.etatIndisponible)}</Text>
      </View> : <>
        <Text style={[s.body, lightStyles.body, local.body]}>{t(C.lienCorpsInvite)}</Text>
        <AccountDoor2026 reason={t(C.etatDeconnecte)} />
      </>}
    </>}
  </ProfilePage>;
}

const local = StyleSheet.create({
  plate: {
    minHeight: 64, borderRadius: 18, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  code: { fontSize: 26, letterSpacing: 4, color: c.ink },
  body: { marginBottom: 14 },
});
