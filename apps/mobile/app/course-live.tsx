/**
 * GRYD — COURSE LIVE. Cet écran n'est plus qu'un AIGUILLAGE : il lit la
 * position réelle de la plateforme et, selon ce qu'il obtient, rend la course
 * réelle ou dit honnêtement pourquoi il n'y en a pas.
 *
 * ─── CE QUI A DISPARU LE 21/07/2026 (A-47, lot « DemoCourseLive ») ──────────
 * Ce fichier portait 1 969 lignes dont l'essentiel était `DemoCourseLive` : une
 * course FABRIQUÉE, jouée tick par tick depuis `run/simulation.ts`, guidée par
 * `run/liveNav.ts` sur les polylignes d'authoring de `route/demo.ts`
 * (checkpoints « Passerelle Alibert », boucle République), avec alliés
 * (`run/livemates.ts`), indications scriptées (`run/indications.ts`), boucle
 * fermée (`run/loop.ts`) et carte de navigation (`run/LiveNavMap.tsx`). Elle
 * affichait une distance qui montait, une allure, des « zones estimées », puis
 * partait sur un écran de Résultat de conquête — pour un joueur qui n'avait pas
 * bougé, où qu'il soit sur Terre.
 *
 * Elle n'avait plus d'appelant depuis la fin du mode vitrine, mais la garantie
 * ne tenait alors que par UNE condition (`gate.kind`) : rebrancher un `else`
 * suffisait à faire réapparaître la course fabriquée. Elle est SUPPRIMÉE, avec
 * toute la chaîne qui n'existait que pour elle. La garantie tient désormais par
 * le typage et par l'absence de code : une course simulée n'est plus
 * REPRÉSENTABLE dans l'app (cf. `RealRunGate`, qui n'a plus de branche
 * `'simulation'`, et `run/simulation.ts`, qui ne sait plus fabriquer de tracé).
 *
 * Les QUATRE états restent distincts et aucun n'affirme rien de faux :
 *   - lecture EN COURS (`RunStarting`) — on cherche, on n'affirme rien ;
 *   - course RÉELLE (`RealCourseLive`) — capteur de la plateforme
 *     (expo-location sur l'appareil, `navigator.geolocation` au navigateur) ;
 *   - AUCUNE position (`RunUnavailable`) — on nomme LA raison + l'action qui
 *     débloque, et on n'enregistre rien ;
 *   - pas de compte : traité en amont par le flux d'authentification.
 */
import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { haptics } from '../src/lib/haptics';
import { Icon } from '../src/ui/Icon';
import { runModeFromParam } from '../src/features/run/simulation';
import { useRealRun } from '../src/features/run/gps/useRealRun';
import type { RunUnavailableReason } from '../src/features/run/gps/locationAdapter';
import { RealCourseLive } from '../src/features/run/gps/RealCourseLive';
import { C } from '../src/i18n/catalog/courseLive';
import { useT } from '../src/i18n/store';

/**
 * Point d'entrée de la route. Il ne porte QU'UNE chose : la possibilité de
 * RÉESSAYER. Une position peut manquer pour une raison réversible (autorisation
 * qu'on vient de changer dans le navigateur, capteur qui n'avait pas encore
 * répondu) ; sans remontage, le seul recours était de quitter l'écran. Le `key`
 * relance le gate — donc une VRAIE nouvelle tentative de lecture du capteur,
 * jamais un simple rafraîchissement d'affichage.
 */
export default function CourseLiveScreen() {
  const [attempt, setAttempt] = useState(0);
  return <CourseLiveGate key={attempt} onRetry={() => setAttempt((a) => a + 1)} />;
}

function CourseLiveGate({ onRetry }: { onRetry: () => void }) {
  const params = useLocalSearchParams<{ mode?: string }>();
  // Le mode est la SEULE chose que l'URL décide encore. Les autres paramètres
  // d'autrefois (`route`, `intention`, `boundary`, `mission`, `planned`) ne
  // pilotaient que la course fabriquée : ils choisissaient une polyligne
  // d'authoring, un nom de zone, une frontière crew inventée. Le tracé réel n'a
  // besoin d'aucun d'eux — et le serveur (ingest_run) reste seul à classer
  // conquis/défendu, APRÈS la course, d'après ce qui a été vraiment couru.
  const mode = runModeFromParam(params.mode);
  const gate = useRealRun(mode);
  // Lecture EN COURS : on cherche la position, on n'affirme RIEN.
  // (Avant : `<View style={styles.root} />` — un rectangle noir muet. Derrière
  //  la boîte de dialogue système ça passait ; dans un navigateur, où l'invite
  //  est une barre discrète en haut de la fenêtre, c'était un écran mort.)
  if (gate.kind === 'starting') return <RunStarting />;
  if (gate.kind === 'real') return <RealCourseLive run={gate.run} />;
  // Il n'existe AUCUN troisième chemin : le type `RealRunGate` n'a que ces
  // trois branches, et aucune ne fabrique de course.
  return <RunUnavailable reason={gate.reason} onRetry={onRetry} />;
}

/**
 * LECTURE EN COURS — le quatrième état, distinct des trois autres. Un
 * chargement n'affirme RIEN sur le joueur : ni qu'il n'a pas de position, ni
 * qu'il en a une. On dit ce qu'on est en train de faire et ce qu'on attend de
 * lui (répondre à l'invite), sans compteur qui tourne dans le vide.
 */
function RunStarting() {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, styles.blockedRoot, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.blockedIcon}>
        <Icon name="gps" size={28} color={colors.chartreuse} />
      </View>
      <Text style={styles.blockedTitle}>{t(C.startingTitle)}</Text>
      <Text style={styles.blockedBody}>{t(C.startingBody)}</Text>
    </View>
  );
}

/**
 * COURSE IMPOSSIBLE — état vide HONNÊTE (jamais un écran blanc, jamais une
 * course fabriquée). On nomme LA raison exacte (elles ne se règlent pas au même
 * endroit), puis UNE action qui débloque : les Réglages sur l'appareil, une
 * nouvelle tentative dans le navigateur (l'autorisation d'un site se change
 * dans le navigateur, puis on réessaie). Quand rien ne peut débloquer
 * (`no-sensor`), on ne propose PAS de faux bouton — seulement le retour.
 * §A : 1 écran = 1 décision, 1 CTA chartreuse max, texte jamais tronqué.
 */
function RunUnavailable({
  reason,
  onRetry,
}: {
  reason: RunUnavailableReason;
  onRetry: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const web = Platform.OS === 'web';

  useEffect(() => {
    // Mesure du mur : combien de GO meurent faute de position, et POURQUOI
    // (le funnel pilote distinguait « pas de GPS » sans jamais savoir laquelle).
    screen('course_live_no_gps', { platform: Platform.OS, reason });
  }, [reason]);

  /** Une raison = une phrase. Elles ne se règlent pas au même endroit. */
  const body =
    reason === 'no-sensor'
      ? C.noGpsNoSensorBody
      : reason === 'services-off'
        ? C.noGpsServicesOffBody
        : reason === 'denied'
          ? web
            ? C.noGpsDeniedWebBody
            : C.noGpsNativeBody
          : C.noGpsUnavailableBody;

  /**
   * L'UNIQUE action chartreuse (§A). Les Réglages système n'existent que sur
   * l'appareil ; dans un navigateur, ce qui débloque est de changer
   * l'autorisation du site puis de RÉESSAYER (le retry relance vraiment la
   * lecture du capteur). `no-sensor` : rien ne débloque ici — pas de bouton.
   */
  const action: 'settings' | 'retry' | null =
    reason === 'no-sensor'
      ? null
      : // Le capteur n'a rien rendu : le texte dit « ressaie dehors » — le CTA
        // doit dire la même chose, sur appareil comme dans un navigateur.
        reason === 'position-unavailable'
        ? 'retry'
        : web
          ? 'retry'
          : 'settings';

  const openSettings = () => {
    haptics.light();
    void Linking.openSettings();
  };
  const retry = () => {
    haptics.light();
    onRetry();
  };
  const back = () => {
    haptics.light();
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.root, styles.blockedRoot, { paddingTop: insets.top + spacing.xl }]}>
      <View style={styles.blockedIcon}>
        <Icon name="gps" size={28} color={colors.gris} />
      </View>
      <Text style={styles.blockedTitle}>{t(C.noGpsTitle)}</Text>
      <Text style={styles.blockedBody}>{t(body)}</Text>

      <View style={[styles.blockedActions, { paddingBottom: insets.bottom + spacing.lg }]}>
        {action === null ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(action === 'settings' ? C.a11yNoGpsSettings : C.a11yNoGpsRetry)}
            onPress={action === 'settings' ? openSettings : retry}
            style={({ pressed }) => [styles.blockedCta, pressed && styles.pressed]}
          >
            <Text style={styles.blockedCtaLabel}>
              {t(action === 'settings' ? C.noGpsSettingsCta : C.noGpsRetryCta)}
            </Text>
          </Pressable>
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.noGpsBack)}
          onPress={back}
          style={({ pressed }) => [styles.blockedGhost, pressed && styles.pressed]}
        >
          <Text style={styles.blockedGhostLabel}>{t(C.noGpsBack)}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  pressed: { opacity: 0.7 },

  // ── Course impossible / démarrage : état plein écran, une seule décision ──
  blockedRoot: { paddingHorizontal: spacing.xl, justifyContent: 'center' },
  blockedIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  blockedTitle: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  blockedBody: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
  },
  blockedActions: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 0,
    gap: spacing.sm,
  },
  blockedCta: {
    minHeight: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Chartreuse = fond, texte NOIR (jamais de chartreuse sur clair — charte).
  blockedCtaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '700' },
  blockedGhost: {
    minHeight: 52,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  blockedGhostLabel: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
});
