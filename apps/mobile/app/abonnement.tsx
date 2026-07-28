/**
 * GRYD — E75 « GESTION D'ABONNEMENT ET ACHATS » (route `/abonnement`).
 *
 * ══ CE QUE CET ÉCRAN EST, ET CE QU'IL N'EST PAS ═══════════════════════════
 * Il CONSTATE, il ne vend pas. Aucune offre, aucun prix, aucun CTA d'achat n'y
 * vit : E74 (`/premium`) est le seul écran qui vend, et le seul qui affiche des
 * montants — venus du Store. Séparer les deux n'est pas cosmétique : un écran
 * de gestion qui repropose de payer transforme « où en suis-je ? » en tunnel de
 * conversion, et la spec E75 ne demande que cinq choses — statut, prochaine
 * échéance, gérer dans le store, restaurer, historique minimal, support.
 *
 * ══ AUCUN BOUTON MORT, VÉRIFIÉ FAIT PAR FAIT ══════════════════════════════
 *  · « Gérer dans le Store » n'est peint QUE si le SDK a donné une
 *    `managementURL` (`managementUrlOf`). Sans elle, il n'y a rien à ouvrir :
 *    l'écran dit alors où aller (réglages d'abonnement de l'appareil) au lieu
 *    d'un bouton qui échouerait ;
 *  · « Restaurer mes achats » n'est peint QUE dans les états 'ready' et
 *    'empty' — les DEUX seuls qui PROUVENT que `configurePurchases` a réussi.
 *    En 'error', la configuration a pu échouer : un bouton de restauration y
 *    échouerait à coup sûr, on propose donc « Réessayer » ;
 *  · « Se connecter » n'est peint que si un écran de connexion existe
 *    réellement (`canSignIn`) ;
 *  · « Contacter le support » mène à `/support`, qui existe.
 *
 * ══ QUATRE ÉTATS DE LECTURE, JAMAIS CONFONDUS ═════════════════════════════
 * chargement · pas connecté · pas de Store ici · échec de lecture — puis, la
 * lecture aboutie, deux faits distincts : « aucun achat sur ce compte » et
 * « voici ton abonnement ». Sur un écran de facturation cette distinction est
 * vitale : quelqu'un qui vient de payer et à qui on afficherait « aucun
 * abonnement » parce que le réseau a échoué croirait avoir perdu son argent.
 *
 * ══ L'HISTORIQUE EST MINIMAL PARCE QUE LA SOURCE L'EST ════════════════════
 * `CustomerInfo.allPurchaseDatesByProduct` donne QUOI et QUAND, rien d'autre :
 * ni montant, ni moyen de paiement, ni remboursement. On affiche donc exactement
 * ça, on DIT pourquoi il n'y a pas de montant, et on DIT quand la liste est
 * tronquée. Quand le SDK ne fournit pas le champ (`purchases === null`), on ne
 * conclut pas « aucun achat » : on renvoie au Store.
 *
 * ANTI PAY-TO-WIN (§1.6) : la note est rendue à l'endroit où l'on résilie,
 * parce que c'est là qu'est la peur — « si j'arrête, est-ce que je perds mon
 * territoire ? ». Non : aucune règle de jeu ne lit le droit Premium.
 */
import { useEffect } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import {
  colors,
  gameColors,
  iconSizes,
  radii,
  spacing,
  typography,
  EVENTS,
} from '@klaim/shared';
import { useLocale, useT } from '../src/i18n/store';
import { C } from '../src/i18n/catalog/abonnement';
import { screen, track } from '../src/lib/analytics';
import { Button } from '../src/ui/Button';
import { Icon } from '../src/ui/Icon';
import { SectionLabel } from '../src/ui/SectionLabel';
import { StackScreen } from '../src/ui/StackScreen';
import {
  PURCHASE_HISTORY_MAX_ROWS,
  recentPurchases,
  usePremium,
  type PremiumActionResult,
  type ProStatus,
  type PurchaseRecord,
} from '../src/features/premium';
import type { Locale } from '../src/i18n/types';

export default function AbonnementScreen() {
  const t = useT();
  const locale = useLocale();
  const premium = usePremium();
  const { status, pro, purchases, managementUrl, busy, lastResult } = premium;

  useEffect(() => {
    screen('abonnement');
  }, []);

  /**
   * Les DEUX seuls états qui prouvent que le SDK est configuré pour ce joueur —
   * donc les deux seuls où une restauration peut aboutir (cf. en-tête).
   */
  const sdkReady = status === 'ready' || status === 'empty';

  return (
    <StackScreen title={t(C.title)} icon="couronne" kicker={t(C.kicker)}>
      {/* ══ ÉTATS NON NOMINAUX ═══════════════════════════════════════════════ */}
      {status === 'loading' ? (
        <View style={styles.block} accessibilityRole="progressbar">
          <ActivityIndicator color={colors.chartreuse} />
          <Text style={styles.body}>{t(C.loading)}</Text>
        </View>
      ) : null}

      {status === 'signedOut' ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t(C.signedOutTitle)}</Text>
          <Text style={styles.body}>{t(C.signedOutBody)}</Text>
          {premium.canSignIn ? (
            <Button
              label={t(C.ctaSignIn)}
              onPress={() => router.push('/sign-in')}
              analyticsId="abonnement_sign_in"
            />
          ) : null}
        </View>
      ) : null}

      {status === 'unavailable' ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t(C.unavailableTitle)}</Text>
          <Text style={styles.body}>{t(C.unavailableBody)}</Text>
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.block}>
          <Text style={styles.blockTitle}>{t(C.failedTitle)}</Text>
          <Text style={styles.body}>{t(C.failedBody)}</Text>
          <Button
            label={t(C.ctaRetry)}
            variant="ghost"
            onPress={premium.reload}
            analyticsId="abonnement_retry"
          />
        </View>
      ) : null}

      {/* ══ 1. STATUT — lu, ou rien ═════════════════════════════════════════ */}
      {sdkReady ? (
        <>
          <SectionLabel style={styles.sectionLabel}>{t(C.statusLabel)}</SectionLabel>
          {pro === null || pro.kind === 'none' ? (
            <View style={styles.block}>
              <Text style={styles.blockTitle}>{t(C.noneTitle)}</Text>
              <Text style={styles.body}>{t(C.noneBody)}</Text>
            </View>
          ) : (
            <StatusBlock pro={pro} locale={locale} />
          )}

          {/* ══ 2. GÉRER DANS LE STORE ═══════════════════════════════════════ */}
          <SectionLabel style={styles.sectionLabel}>{t(C.manageLabel)}</SectionLabel>
          {managementUrl !== null ? (
            <>
              <Button
                label={t(C.ctaManage)}
                variant="raised"
                icon="lien"
                onPress={() => {
                  track(EVENTS.ctaTapped, { cta: 'abonnement_manage' });
                  void Linking.openURL(managementUrl).catch(() => undefined);
                }}
              />
              <Text style={styles.note}>{t(C.manageNote)}</Text>
            </>
          ) : (
            <Text style={styles.note}>{t(C.manageUnavailable)}</Text>
          )}

          {/* ══ 3. RESTAURER ═════════════════════════════════════════════════ */}
          <SectionLabel style={styles.sectionLabel}>{t(C.restoreLabel)}</SectionLabel>
          <Button
            label={t(C.ctaRestore)}
            variant="ghost"
            loading={busy === 'restore'}
            onPress={() => void premium.restore()}
            analyticsId="abonnement_restore"
          />
          <Text style={styles.note}>{t(C.restoreNote)}</Text>
          {lastResult ? <Text style={styles.result}>{t(restoreEntry(lastResult.kind))}</Text> : null}

          {/* ══ 4. HISTORIQUE MINIMAL ════════════════════════════════════════ */}
          <SectionLabel style={styles.sectionLabel}>{t(C.historyLabel)}</SectionLabel>
          <History records={purchases} locale={locale} />
        </>
      ) : null}

      {/* ══ 5. SUPPORT — utile dans TOUS les états ══════════════════════════ */}
      <SectionLabel style={styles.sectionLabel}>{t(C.supportLabel)}</SectionLabel>
      <Button
        label={t(C.ctaSupport)}
        variant="ghost"
        onPress={() => router.push('/support')}
        analyticsId="abonnement_support"
      />
      <Text style={styles.note}>{t(C.supportNote)}</Text>

      {/* ══ ANTI PAY-TO-WIN, là où l'on résilie ════════════════════════════ */}
      <Text style={styles.antiP2w}>{t(C.antiP2wNote)}</Text>

      {/* Vers E74 : le SEUL écran qui vende. Peint hors des états où vendre
          n'aurait aucun sens (pas de Store, pas de compte). */}
      {status !== 'unavailable' && status !== 'signedOut' ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t(C.ctaSeePremium)}
          onPress={() => router.push('/premium')}
          style={({ pressed }) => [styles.link, pressed && styles.pressed]}
        >
          <Text style={styles.linkLabel}>{t(C.ctaSeePremium)}</Text>
          <Icon name="chevron" size={iconSizes.sm} color={colors.gris} />
        </Pressable>
      ) : null}
    </StackScreen>
  );
}

// ─── Sous-vues ───────────────────────────────────────────────────────────────

/**
 * Le statut et son échéance. Chaque libellé correspond à UNE branche de
 * `ProStatus` — aucun n'existe sans un fait qui le produise. Quand le Store n'a
 * pas donné de date, on le DIT (`dateUnknown`) : une échéance ne s'estime pas.
 */
function StatusBlock({ pro, locale }: { pro: ProStatus; locale: Locale }) {
  const t = useT();
  if (pro.kind === 'expired') {
    const date = pro.expiredAtMs !== null ? formatDay(pro.expiredAtMs, locale) : null;
    return (
      <View style={styles.statusCard}>
        <Icon name="couronne" size={iconSizes.md} color={colors.gris} />
        <View style={styles.statusText}>
          <Text style={styles.statusTitle}>{t(C.statusExpired)}</Text>
          <Text style={styles.body}>{date ? t(C.expiredOn, { date }) : t(C.dateUnknown)}</Text>
        </View>
      </View>
    );
  }
  if (pro.kind !== 'active') return null;

  const title = pro.trial
    ? C.statusTrial
    : pro.lifetime
      ? C.statusLifetime
      : pro.cancelled
        ? C.statusCancelled
        : C.statusActive;

  const date = pro.expiresAtMs !== null ? formatDay(pro.expiresAtMs, locale) : null;
  const detail = pro.lifetime
    ? t(C.noExpiry)
    : date === null
      ? t(C.dateUnknown)
      : pro.trial
        ? t(C.trialEndsOn, { date })
        : pro.cancelled
          ? t(C.endsOn, { date })
          : t(C.renewsOn, { date });

  return (
    <View style={styles.statusCard}>
      <Icon name="couronne" size={iconSizes.md} color={colors.chartreuse} />
      <View style={styles.statusText}>
        <Text style={styles.statusTitle}>{t(title)}</Text>
        <Text style={styles.body}>{detail}</Text>
      </View>
    </View>
  );
}

/**
 * Historique minimal. TROIS cas distincts :
 *  · `null` — le SDK n'a pas fourni le champ : on ne SAIT pas, on renvoie au
 *    Store (jamais « aucun achat », qui serait une affirmation non lue) ;
 *  · vide — lu, et ce compte n'a rien acheté. C'est un FAIT ;
 *  · des lignes — bornées, et la troncature est DITE.
 */
function History({
  records,
  locale,
}: {
  records: readonly PurchaseRecord[] | null;
  locale: Locale;
}) {
  const t = useT();
  if (records === null) return <Text style={styles.note}>{t(C.historyUnavailable)}</Text>;
  if (records.length === 0) return <Text style={styles.note}>{t(C.historyEmpty)}</Text>;

  const shown = recentPurchases(records);
  return (
    <View style={styles.history}>
      {shown.map((record) => (
        <Text key={record.productId} style={styles.historyRow} numberOfLines={2}>
          {t(C.historyRow, {
            product: record.productId,
            date: formatDay(record.atMs, locale),
          })}
        </Text>
      ))}
      {records.length > PURCHASE_HISTORY_MAX_ROWS ? (
        <Text style={styles.note}>{t(C.historyTruncated)}</Text>
      ) : null}
      <Text style={styles.note}>{t(C.historyNoAmount)}</Text>
    </View>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Date courte. `Intl` n'est pas garanti sur tous les moteurs JS embarqués (même
 * précaution que `app/premium.tsx`) : en cas d'échec, format numérique non
 * ambigu plutôt qu'une chaîne vide — une échéance est un FAIT, elle ne
 * disparaît jamais d'un écran de facturation.
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

function restoreEntry(kind: PremiumActionResult['kind']) {
  switch (kind) {
    case 'restored':
      return C.restoreOk;
    case 'nothing_to_restore':
      return C.restoreNone;
    // 'purchased' et 'purchase_pending' n'arrivent pas ici : cet écran
    // n'achète rien (E74 est le seul qui vende). Il ne reste que l'échec, et on
    // ne l'habille pas d'un message de succès.
    default:
      return C.restoreFailed;
  }
}

const styles = StyleSheet.create({
  sectionLabel: { marginTop: spacing.xl, marginBottom: spacing.sm },
  block: { marginTop: spacing.md, gap: spacing.sm },
  blockTitle: { ...typography.cardTitle, color: colors.blanc },
  body: { ...typography.body, color: colors.gris },
  note: { ...typography.meta, color: colors.gris, marginTop: spacing.sm, lineHeight: 18 },
  result: { ...typography.body, color: colors.blanc, marginTop: spacing.md },
  antiP2w: { ...typography.meta, color: colors.chartreuse, marginTop: spacing.xl, lineHeight: 18 },

  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: gameColors.gold,
    backgroundColor: colors.carbone,
  },
  statusText: { flex: 1, gap: 2 },
  statusTitle: { ...typography.cardTitle, color: colors.blanc },

  history: { gap: spacing.xs },
  historyRow: { ...typography.body, color: colors.blanc, lineHeight: 20 },

  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 44,
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
  },
  linkLabel: { ...typography.meta, color: colors.gris, textDecorationLine: 'underline' },
  pressed: { opacity: 0.6 },
});
