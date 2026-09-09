/**
 * GRYD — LES DEUX FAITS DE SESSION QUI N'ATTEIGNAIENT AUCUN ÉCRAN.
 *
 * ─── CE QUI SE PASSAIT AVANT LE 10/09/2026 ──────────────────────────────────
 *
 * 1. SUPPRESSION DE COMPTE ANNULÉE EN SILENCE. `session.tsx` calculait
 *    `deletionCancelled` depuis la RPC `cancel_account_deletion` (0046) et
 *    exposait même son acquittement — mais AUCUN composant du dépôt ne lisait
 *    l'un ni l'autre. Un joueur qui avait demandé la suppression de son compte,
 *    puis se reconnectait pendant le délai de grâce, voyait sa suppression
 *    annulée sans qu'un seul mot le lui dise. Il continuait de croire son compte
 *    programmé pour disparaître. C'est un fait RGPD, pas une notification de
 *    confort.
 *
 * 2. SESSION EXPIRÉE, RETOUR EN VISITEUR SANS UN MOT. Un `SIGNED_OUT` issu d'un
 *    rafraîchissement raté faisait basculer l'app en visiteur : la carte
 *    s'ouvrait vide, les zones du joueur avaient disparu, et rien n'expliquait
 *    pourquoi. Une déconnexion DEMANDÉE, elle, ne dit rien — le joueur sait ce
 *    qu'il vient de faire (`features/account/signOutIntent2026.ts`).
 *
 * ─── CE QUE CE COMPOSANT EST, ET CE QU'IL N'EST PAS ─────────────────────────
 * Un bandeau ACQUITTABLE, jamais un blocage : il se pose au-dessus de l'écran
 * courant, il ne remplace rien, il ne redirige personne. Un seul à la fois — les
 * deux faits sont mutuellement exclusifs par construction (l'un suit un
 * `SIGNED_IN`, l'autre un `SIGNED_OUT`), et l'ordre ci-dessous ne fait que dire
 * lequel gagnerait si l'impossible arrivait.
 *
 * L15 (jamais la couleur seule) : le motif est porté par une ICÔNE + un TITRE +
 * un corps de texte. Aucun état n'est signifié par une teinte.
 */
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '@klaim/shared';
import { C } from '../../i18n/catalog/auth';
import { useT } from '../../i18n/store';
import { Button } from '../../ui/Button';
import { GrydIcon } from '../../ui/gryd/GrydIcon';
import { useSession } from '../../lib/session';

export function SessionNotices2026() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const {
    deletionCancelled,
    acknowledgeDeletionCancelled,
    sessionExpired,
    acknowledgeSessionExpired,
  } = useSession();

  if (!deletionCancelled && !sessionExpired) return null;

  const deletion = deletionCancelled;
  const title = deletion ? C.deletionCancelledTitle : C.sessionExpiredTitle;
  const body = deletion ? C.deletionCancelledBody : C.sessionExpiredBody;
  const acknowledge = deletion ? acknowledgeDeletionCancelled : acknowledgeSessionExpired;

  return (
    <View
      // Le bandeau flotte AU-DESSUS de l'écran courant sans en pousser le
      // contenu : la carte ne doit pas se recadrer parce qu'une phrase arrive.
      pointerEvents="box-none"
      style={[styles.layer, { paddingTop: insets.top + spacing.xs }]}
    >
      <View accessibilityRole="alert" style={styles.card}>
        <View style={styles.head}>
          {/* Motif + libellé, jamais la couleur seule (L15). */}
          <GrydIcon name={deletion ? 'bouclier' : 'alerte'} size={20} color={colors.chartreuse} />
          <Text accessibilityRole="header" style={styles.title}>{t(title)}</Text>
        </View>
        <Text style={styles.body}>{t(body)}</Text>
        <View style={styles.actions}>
          {sessionExpired ? (
            <Button
              size="md"
              label={t(C.sessionExpiredCta)}
              onPress={() => { acknowledgeSessionExpired(); router.push('/sign-in'); }}
              analyticsId="session_expired_sign_in"
            />
          ) : null}
          <Button label={t(C.noticeDismiss)} onPress={acknowledge} variant="ghost" size="md" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 14, zIndex: 20 },
  card: {
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone2,
    padding: 16,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  title: { flex: 1, color: colors.blanc, fontFamily: fonts.displayBold, fontSize: 16, lineHeight: 22 },
  body: { color: colors.gris, fontFamily: fonts.text, fontSize: 13, lineHeight: 19 },
  actions: { gap: 8 },
});
