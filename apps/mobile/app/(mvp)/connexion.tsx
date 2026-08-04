/**
 * GRYD — LA CONNEXION : le dernier morceau de parcours reconstruit (lot M10).
 *
 * ─── POURQUOI CET ÉCRAN EXISTAIT EN LEGACY ET PAS EN MVP ────────────────────
 * La bascule d'entrée du 03/08 s'est arrêtée à l'accueil précisément parce que
 * ce fichier manquait : basculer sans lui aurait livré une app où un nouveau
 * joueur ne peut jamais créer de compte. C'est lui qui referme la bascule.
 *
 * ─── LE SEUL ÉCRAN QU'ON NE PEUT PAS CONTOURNER ─────────────────────────────
 * Ailleurs, un bouton mort coûte un tap. Ici, il coûte le JOUEUR : on ne passe
 * pas outre. « Continuer avec Apple » peint sur un Android, ou « Google » sans
 * client id, envoie dans une impasse au moment exact où quelqu'un acceptait de
 * s'engager.
 *
 * Les portes sont donc DÉRIVÉES de la capacité réelle (`signIn.ts`, pur et
 * testé sur les 8 combinaisons), et la capacité est SONDÉE, jamais déduite :
 * `Platform.OS === 'ios'` dit sur quel système on tourne, pas que Sign in with
 * Apple est utilisable.
 *
 * ─── CE QU'IL NE FAIT PAS ───────────────────────────────────────────────────
 * Il ne manipule AUCUN identifiant. Apple et Google ouvrent la feuille système ;
 * l'e-mail mène à l'écran legacy qui gère déjà le code à usage unique. Cet
 * écran choisit une porte, il n'authentifie personne.
 */
import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { colors, fonts, fontSizes, radii, spacing, withAlpha } from '@klaim/shared';
import {
  GOOGLE_CAPABLE,
  isAppleAuthAvailable,
  signInWithApple,
  signInWithGoogle,
} from '../../src/lib/auth';
import { isSupabaseConfigured } from '../../src/lib/supabase';
import {
  emailIsPrimary,
  hasAnyDoor,
  signInDoors,
  signInOutcome,
  type SignInDoors,
} from '../../src/mvp/onboarding/signIn';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';

const TOUCH_TARGET_PT = 44;

/** Paliers du voile — mêmes que `Stage`, mêmes raisons (lisibilité, L15). */
const VOILE_PALIERS = [0, 0, 0.1, 0.24, 0.42, 0.6, 0.78, 0.9, 0.97, 1] as const;

/** Là où mène une connexion réussie. */
const APRES = '/carte';

export default function Connexion() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [appleOk, setAppleOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [echec, setEchec] = useState(false);

  useEffect(() => {
    screen('sign_in');
    let vivant = true;
    // SONDE, et non déduction : entitlement absent, iOS ancien, simulateur sans
    // compte Apple. En cas d'échec de la sonde, on ne peint PAS le bouton — se
    // tromper vers « absent » coûte une porte, l'inverse coûte une impasse.
    isAppleAuthAvailable()
      .then((ok) => {
        if (vivant) setAppleOk(ok);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);

  const portes: SignInDoors = signInDoors({
    backend: isSupabaseConfigured,
    appleAvailable: appleOk,
    googleConfigured: GOOGLE_CAPABLE,
  });

  const tenter = useCallback(async (via: 'apple' | 'google') => {
    setBusy(true);
    setEchec(false);
    const r = await (via === 'apple' ? signInWithApple() : signInWithGoogle()).catch(() => null);
    setBusy(false);
    const suite = signInOutcome(r);
    if (suite === 'enter') {
      router.replace(APRES);
      return;
    }
    // `stay` : une ANNULATION. Aucun message — fermer une feuille système est un
    // geste volontaire, et répondre « connexion impossible » imputerait une
    // panne inexistante à quelqu'un qui a changé d'avis (L19).
    if (suite === 'explain') setEchec(true);
  }, []);

  return (
    <View style={styles.root}>
      {/* LA PHOTO DU FONDATEUR, conservée telle quelle (`assets/auth/`). */}
      {/* DIMENSIONS EXPLICITES, pas `absoluteFill` — voir `Stage.tsx` : sur
          react-native-web, `cover` recadrerait sur une surface plus grande que
          la fenêtre et donnerait un gros plan au lieu du peloton. */}
      <Image
        source={require('../../assets/auth/sign-in-crew.jpg')}
        resizeMode="cover"
        style={[styles.photo, { width, height }]}
      />
      <View style={styles.voile} pointerEvents="none">
        {VOILE_PALIERS.map((o, i) => (
          <View key={i} style={{ flex: 1, backgroundColor: withAlpha(colors.noir, o) }} />
        ))}
      </View>

      <View style={[styles.contenu, { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.bas}>
          <Text style={styles.titre}>{t(C.signInTitle)}</Text>
          <Text style={styles.corps}>{t(C.signInBody)}</Text>

          {/* AUCUNE porte : on DIT pourquoi. Trois boutons inertes vaudraient
              moins que zéro option assumée. */}
          {!hasAnyDoor(portes) ? <Text style={styles.echec}>{t(C.signInNoDoor)}</Text> : null}

          {echec ? <Text style={styles.echec}>{t(C.signInFailed)}</Text> : null}

          {portes.apple ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.signInApple)}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => void tenter('apple')}
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
            >
              <Text style={styles.ctaLabel}>{t(C.signInApple)}</Text>
            </Pressable>
          ) : null}

          {portes.google ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(C.signInGoogle)}
              accessibilityState={{ disabled: busy }}
              disabled={busy}
              onPress={() => void tenter('google')}
              style={({ pressed }) => [styles.ctaSecond, pressed && styles.dim]}
            >
              <Text style={styles.ctaSecondLabel}>{t(C.signInGoogle)}</Text>
            </Pressable>
          ) : null}

          {/* L'E-MAIL est le PLANCHER : il ne dépend d'aucune plateforme ni
              d'aucune clé. Il mène à l'écran legacy qui gère déjà le code à
              usage unique — cet écran-ci choisit une porte, il n'authentifie
              personne, et refaire un formulaire de code à la hâte serait
              exactement le genre de surface qu'on ne réécrit pas sans raison. */}
          {/* Quand l'e-mail est la SEULE porte, il se peint comme une PORTE —
              bouton plein, pas lien gris. `emailIsPrimary` (pur, testé) le
              décide : un écran de connexion sans bouton plein ressemble à une
              page qui a raté son chargement. */}
          {portes.email ? (
            <Pressable
              accessibilityRole={emailIsPrimary(portes) ? 'button' : 'link'}
              accessibilityLabel={t(C.signInEmail)}
              onPress={() => router.push('/sign-in')}
              hitSlop={spacing.sm}
              style={({ pressed }) =>
                emailIsPrimary(portes)
                  ? [styles.cta, pressed && styles.ctaPressed]
                  : [styles.lien, pressed && styles.dim]
              }
            >
              <Text style={emailIsPrimary(portes) ? styles.ctaLabel : styles.lienLabel}>
                {t(C.signInEmail)}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Le noir reste DERRIÈRE la photo : image absente ou lente → écran sombre,
  // jamais blanc, jamais vide.
  root: { flex: 1, backgroundColor: colors.noir },
  photo: { position: 'absolute', top: 0, left: 0 },
  voile: { ...StyleSheet.absoluteFillObject, flexDirection: 'column' },
  contenu: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: spacing.lg },
  bas: { gap: spacing.sm },
  titre: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.xxl },
  corps: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    lineHeight: 24,
    marginBottom: spacing.md,
  },
  echec: { color: colors.blanc, fontFamily: fonts.text, fontSize: fontSizes.sm, marginBottom: spacing.xs },
  cta: {
    minHeight: TOUCH_TARGET_PT,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ctaPressed: { backgroundColor: colors.chartreusePressed },
  ctaLabel: { color: colors.noir, fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '700' },
  // Google en SECOND rang : une seule action primaire à l'œil (L2).
  ctaSecond: {
    minHeight: TOUCH_TARGET_PT,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  ctaSecondLabel: { color: colors.blanc, fontFamily: fonts.textSemi, fontSize: fontSizes.md },
  lien: { minHeight: TOUCH_TARGET_PT, alignItems: 'center', justifyContent: 'center' },
  lienLabel: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
  dim: { opacity: 0.6 },
});
