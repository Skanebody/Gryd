/**
 * GRYD — TOI : le suivi, le compte, le légal (lot M12).
 *
 * ─── POURQUOI CET ÉCRAN EXISTE ──────────────────────────────────────────────
 * La bascule d'entrée avait rendu injoignables la suppression de compte,
 * l'export, la confidentialité et l'aide. Ce n'était pas une perte de confort :
 * **Apple 5.1.1(v)** exige qu'une app permettant de créer un compte permette de
 * le supprimer DANS l'app, et le RGPD exige la portabilité. Sans cet écran, le
 * build est refusé — et il le mériterait.
 *
 * ─── LE TABLEAU DE BORD, ET SA MARGE DÉLIBÉRÉE ──────────────────────────────
 * Quatre chiffres : territoire, sorties, distance, dernière course. C'est ce
 * qu'un coureur regarde entre deux sorties. Ce qui n'y est pas — allures par
 * segment, dénivelé, tendances, carte de chaleur — n'est pas un oubli : c'est la
 * place laissée à une offre payante future (ADR-011), qui pourra s'installer
 * sans rien reprendre.
 *
 * ─── UNE SEULE ACTION PRIMAIRE, ET CE N'EST PAS LA SUPPRESSION ──────────────
 * Tout est en TEXTE ici. Peindre « Supprimer mon compte » en bouton plein
 * chartreuse en ferait l'action la plus visible de l'écran — exactement
 * l'inverse de ce qu'on veut d'une action irréversible (L17 en miroir).
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, fontSizes, spacing } from '@klaim/shared';
import { useSession } from '../../src/lib/session';
import { signOut } from '../../src/lib/auth';
import {
  canRetryStats,
  statAreaM2,
  statDistanceM,
  statRuns,
  statsStatus,
  type StatsRead,
} from '../../src/mvp/profil/stats';
import {
  accountView,
  canExport,
  DELETION_NEEDS_CONFIRMATION,
  type DeletionStatus,
} from '../../src/mvp/profil/account';
import {
  cancelDeletion,
  readDeletionStatus,
  readMyStats,
  requestDeletion,
} from '../../src/mvp/profil/read';
import { heroArea } from '../../src/mvp/ui/area';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';

const TOUCH_TARGET_PT = 44;

export default function Profil() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  const [read, setRead] = useState<StatsRead>({ kind: 'idle' });
  const [suppression, setSuppression] = useState<DeletionStatus | null>(null);

  useEffect(() => {
    screen('profil');
  }, []);

  const charger = useCallback(async () => {
    if (userId === null) return;
    setRead({ kind: 'loading' });
    setRead(await readMyStats(userId));
    setSuppression(await readDeletionStatus());
  }, [userId]);

  useEffect(() => {
    void charger();
  }, [charger]);

  const etat = { signedIn: userId !== null, read };
  const statut = statsStatus(etat);
  const compte = accountView(suppression);

  const aire = heroArea(statAreaM2(etat));
  const sorties = statRuns(etat);
  const distM = statDistanceM(etat);
  const km = distM !== null && distM > 0 ? (Math.round(distM / 10) / 100).toFixed(2).replace('.', ',') : null;

  const demanderSuppression = useCallback(() => {
    const jours = suppression?.graceDays ?? 0;
    const faire = async () => {
      if (await requestDeletion()) setSuppression(await readDeletionStatus());
    };
    // L17 en miroir : une action irréversible ne s'atteint jamais en un tap.
    if (!DELETION_NEEDS_CONFIRMATION) {
      void faire();
      return;
    }
    Alert.alert(t(C.accountDelete), t(C.accountDeleteConfirm, { d: String(jours) }), [
      { text: t(C.ctaCancel), style: 'cancel' },
      { text: t(C.accountDelete), style: 'destructive', onPress: () => void faire() },
    ]);
  }, [suppression, t]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
      <ScrollView
        contentContainerStyle={[styles.contenu, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.titre}>{t(C.profilTitle)}</Text>

        {/* ── LE SUIVI ───────────────────────────────────────────────────── */}
        {statut === 'ready' ? (
          <View style={styles.chiffres}>
            {/* Le territoire domine (L12). `heroArea` rend `null` sur zéro ; ici
                un zéro est une RÉPONSE (on a couru sans refermer), donc on
                l'écrit explicitement plutôt que de laisser un blanc. */}
            <View style={styles.bloc}>
              <Text style={styles.hero}>{aire ?? '0'}</Text>
              <Text style={styles.unite}>{t(C.unitM2)}</Text>
            </View>
            <Text style={styles.legende}>{t(C.statTerritory)}</Text>

            <View style={styles.ligne}>
              <View style={styles.demi}>
                <Text style={styles.second}>{sorties}</Text>
                <Text style={styles.legende}>{t(C.statRuns)}</Text>
              </View>
              <View style={styles.demi}>
                <Text style={styles.second}>{km ?? '—'}</Text>
                <Text style={styles.legende}>
                  {t(C.statDistance)} · {t(C.unitKm)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.phrase}>
            {statut === 'loading'
              ? t(C.mapLoading)
              : statut === 'failed'
                ? t(C.statsFailed)
                : statut === 'signedOut'
                  ? t(C.mapSignedOut)
                  : t(C.statsEmpty)}
          </Text>
        )}

        {canRetryStats(etat) ? (
          <Lien label={t(C.mapRetry)} onPress={() => void charger()} />
        ) : null}

        {/* ── LE COMPTE (App Store 5.1.1(v) + RGPD) ──────────────────────── */}
        {userId !== null ? (
          <>
            <Text style={styles.section}>{t(C.accountTitle)}</Text>
            <Lien
              label={t(C.accountSignOut)}
              onPress={() => {
                void signOut();
                router.replace('/carte');
              }}
            />
            {canExport(true) ? (
              // L'export vit sur l'écran legacy de confidentialité, qui le gère
              // déjà. Refaire une surface de portabilité RGPD à la hâte serait
              // exactement le genre de réécriture qu'on ne fait pas sans raison.
              <Lien label={t(C.accountExport)} onPress={() => router.push('/confidentialite')} />
            ) : null}

            {/* Une demande EN COURS n'offre PAS de re-supprimer : elle DIT le
                délai et offre d'annuler. Reproposer « Supprimer » ferait croire
                que la première demande n'a pas pris. */}
            {compte.kind === 'pending' ? (
              <>
                <Text style={styles.phrase}>
                  {t(C.accountDeletePending, { d: String(compte.graceDays) })}
                </Text>
                <Lien
                  label={t(C.accountDeleteCancel)}
                  onPress={() => {
                    void (async () => {
                      if (await cancelDeletion()) setSuppression(await readDeletionStatus());
                    })();
                  }}
                />
              </>
            ) : null}
            {compte.kind === 'deletable' ? (
              <Lien label={t(C.accountDelete)} onPress={demanderSuppression} danger />
            ) : null}
            {/* `unknown` → RIEN. Offrir de supprimer sans savoir où en est une
                demande précédente est le pire des deux mondes. */}
          </>
        ) : null}

        {/* ── LE LÉGAL ───────────────────────────────────────────────────── */}
        <Text style={styles.section}>{t(C.legalTitle)}</Text>
        <Lien label={t(C.legalPrivacy)} onPress={() => router.push('/confidentialite')} />
        <Lien label={t(C.legalConduct)} onPress={() => router.push('/code-conduite')} />
        <Lien label={t(C.legalSupport)} onPress={() => router.push('/support')} />
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaBackToMap)}
        onPress={() => router.replace('/carte')}
        hitSlop={spacing.sm}
        style={[styles.retour, { top: insets.top + spacing.sm }]}
      >
        <Text style={styles.retourLabel}>{t(C.ctaBackToMap)}</Text>
      </Pressable>
    </View>
  );
}

/** Tout est en TEXTE ici — voir l'en-tête : rien ne doit dominer visuellement. */
function Lien({
  label,
  onPress,
  danger,
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={spacing.xs}
      style={({ pressed }) => [styles.item, pressed && styles.dim]}
    >
      <Text style={[styles.itemLabel, danger === true && styles.danger]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  contenu: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  titre: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.xxl, marginBottom: spacing.md },
  chiffres: { gap: spacing.xs, marginBottom: spacing.md },
  bloc: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  hero: { color: colors.chartreuse, fontFamily: fonts.display, fontSize: fontSizes.hero },
  unite: { color: colors.chartreuse, fontFamily: fonts.text, fontSize: fontSizes.lg },
  ligne: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
  demi: { flex: 1 },
  second: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.xl },
  legende: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
  phrase: { color: colors.blanc, fontFamily: fonts.text, fontSize: fontSizes.md, lineHeight: 24 },
  section: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
  },
  item: { minHeight: TOUCH_TARGET_PT, justifyContent: 'center' },
  itemLabel: { color: colors.blanc, fontFamily: fonts.text, fontSize: fontSizes.md },
  // Le rouge dit « irréversible ». Il ne CRIE pas : c'est un texte, pas un
  // bouton plein — l'action la plus grave ne doit pas être la plus visible.
  danger: { color: colors.gris },
  retour: { position: 'absolute', right: spacing.lg, minHeight: TOUCH_TARGET_PT, justifyContent: 'center' },
  retourLabel: { color: colors.gris, fontFamily: fonts.textSemi, fontSize: fontSizes.sm },
  dim: { opacity: 0.6 },
});
