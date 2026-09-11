/**
 * GRYD — L'ACCUEIL. Ce que l'app dit à la seconde où le compte devient réel.
 *
 * ═══ POURQUOI UN COMPOSANT, ET PAS UN BOUT DE `callback.tsx` ════════════════
 * Parce qu'il y a DEUX arrivées, et qu'elles doivent dire la même chose :
 *
 *   · LE LIEN E-MAIL — `app/(auth)/callback.tsx`. Le `type` posé par GoTrue
 *     (`signup` / `magiclink`) tranche à lui seul, sans aucune lecture ;
 *   · APPLE — `app/(auth)/bienvenue.tsx`, où `AuthEntry2026` dépose le joueur
 *     après `signInWithIdToken`. Il n'y a AUCUNE URL de retour dans ce flux :
 *     le verdict vient donc de `handle_chosen_2026` (0175), puis de la date de
 *     création du compte. `welcomeKind2026` sait déjà faire les deux — c'est
 *     exactement pour ça qu'il prend ses trois sources séparément.
 *
 * Deux copies de ce JSX auraient divergé au premier retouchage, et la moitié
 * des nouveaux joueurs aurait lu une phrase différente de l'autre moitié.
 *
 * ═══ §A — UN TITRE, UNE LIGNE, UN BOUTON ════════════════════════════════════
 * Le G chartreuse est le seul ornement : c'est la marque qui accueille, pas une
 * illustration de circonstance. Aucun second accent, aucune card dans une card.
 */
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, spacing } from '@klaim/shared';
import { C as AuthC } from '../../i18n/catalog/auth';
import { C } from '../../i18n/catalog/authWelcome';
import { useT } from '../../i18n/store';
import { haptics } from '../../lib/haptics';
import { useOnboardingState } from '../onboarding/store';
import { rememberOnboardingCompletion2026 } from '../onboarding/sessionCompletion2026';
import { Button } from '../../ui/Button';
import { GrydMark } from '../../ui/gryd/GrydMark';
import { TranslucentControl2026 } from '../../ui/gryd/Surface2026';
import {
  callbackType2026,
  welcomeDestination2026,
  welcomeHandle2026,
  welcomeKind2026,
  type WelcomeRead2026,
} from './welcome2026';

/** Taille du G d'accueil. Une mesure de composition, pas une règle de jeu. */
const HERO_MARK = 72;

export interface AccountWelcome2026Props {
  readonly insets: { readonly top: number; readonly bottom: number };
  /**
   * L'URL de retour, quand il y en a une. `null` pour Apple : ce flux n'a pas
   * d'URL, et c'est une information — pas une donnée manquante.
   */
  readonly callbackUrl: string | null;
  /** `user.created_at` de la session (ISO), dernier recours du verdict. */
  readonly accountCreatedAt: string | null;
  /** Ce que `my_handle_status_2026` a répondu, ou pas encore. */
  readonly read: WelcomeRead2026;
}

export function AccountWelcome2026({
  insets,
  callbackUrl,
  accountCreatedAt,
  read,
}: AccountWelcome2026Props) {
  const t = useT();
  const { update } = useOnboardingState();

  /**
   * ─── CE QUE CET ÉCRAN INSCRIT, ET POURQUOI C'EST ICI ──────────────────────
   * Il est rendu à l'instant précis où un compte devient réel sur cet appareil,
   * par le lien e-mail COMME par Apple. Ce fait prouve deux choses : le joueur
   * a vu la porte de compte (la découverte n'a plus à lui être repoussée) et il
   * a déclaré son âge quelque part, sans quoi aucun compte n'existerait.
   *
   * Sans cette écriture, une reconnexion sur un téléphone neuf redemanderait la
   * découverte ET le gate 16+ à quelqu'un qui a déjà un compte — exactement la
   * friction que ce lot supprime. Elle vit dans le COMPOSANT et non dans l'une
   * des deux routes : deux copies auraient divergé, et la moitié des arrivées
   * aurait gardé la friction.
   *
   * Rien ne l'attend : le magasin la rend visible avant sa persistance, donc un
   * disque lent ne retient personne devant un logo.
   */
  const acquitted = useRef(false);
  useEffect(() => {
    if (acquitted.current) return;
    acquitted.current = true;
    haptics.success();
    rememberOnboardingCompletion2026(true);
    void update({ onboardingDone: true, reachedStep: 'map', ageConfirmed: true, ageDeclined: false });
  }, [update]);

  const kind = welcomeKind2026({
    callbackType: callbackType2026(callbackUrl),
    read,
    accountCreatedAt,
    now: Date.now(),
  });

  const handle = welcomeHandle2026(read);
  const go = () => {
    if (kind === null) return;
    router.replace(welcomeDestination2026(kind));
  };

  return <View style={styles.root}>
    <View style={[
      styles.frame,
      { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
    ]}>
      {/* UN SEUL G, ET IL EST GRAND. L'écran portait la petite marque d'entête
          EN PLUS du G d'accueil : deux fois le même signe à 250 px d'écart, et
          un vide entre les deux qui faisait croire à un chargement. Ici la
          marque EST l'accueil — c'est le seul écran du parcours où elle a le
          droit d'occuper la place. */}
      <View style={styles.hero}>
        <GrydMark variant="symbol" size={HERO_MARK} color={colors.chartreuse} />
      </View>
      <TranslucentControl2026 tone="dark" style={styles.panel}>
        <View style={styles.content}>
          {kind === null ? <>
            {/* La lecture court encore. Un chargement n'affirme rien : ni
                « compte créé », ni « bon retour ». */}
            <ActivityIndicator color={colors.chartreuse} />
            <Text accessibilityRole="header" style={styles.title}>{t(AuthC.callbackChecking)}</Text>
          </> : kind === 'fresh' ? <>
            <Text accessibilityRole="header" style={styles.title}>{t(C.freshTitle)}</Text>
            <Text style={styles.body}>{t(C.freshBody)}</Text>
            <Button size="md" label={t(C.freshCta)} onPress={go} analyticsId="auth_welcome_fresh" />
          </> : kind === 'returning' ? <>
            <Text accessibilityRole="header" style={styles.title}>
              {handle ? t(C.returningTitleNamed, { handle }) : t(C.returningTitle)}
            </Text>
            <Text style={styles.body}>{t(C.returningBody)}</Text>
            <Button size="md" label={t(C.returningCta)} onPress={go} analyticsId="auth_welcome_back" />
          </> : <>
            <Text accessibilityRole="header" style={styles.title}>{t(C.unknownTitle)}</Text>
            <Text style={styles.body}>{t(C.unknownBody)}</Text>
            <Button size="md" label={t(C.returningCta)} onPress={go} analyticsId="auth_welcome_unknown" />
          </>}
        </View>
      </TranslucentControl2026>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  frame: { flex: 1, width: '100%', maxWidth: 540, alignSelf: 'center', paddingHorizontal: 18 },
  // Le G prend tout l'espace libre au-dessus du panneau : il est optiquement
  // centré quelle que soit la hauteur du texte d'accueil.
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  panel: { borderRadius: 24, overflow: 'hidden' },
  content: { position: 'relative', zIndex: 1, padding: 18, gap: 12, alignItems: 'stretch' },
  title: { color: colors.blanc, fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 26, textAlign: 'center' },
  body: { color: colors.gris, fontFamily: fonts.text, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
