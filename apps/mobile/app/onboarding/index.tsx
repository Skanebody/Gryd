/**
 * GRYD — ONBOARDING SANS FRICTION (AMENDEMENT-30, stratégie §6/§7). Un stepper
 * qui déplace TOUTE la friction hors de la course et active (1re capture) le
 * plus vite. Règle cardinale : « aucun écran ne demande avant d'avoir donné » —
 * la permission GPS ne vit QUE dans la branche « run » (juste avant Lancer le
 * run ; la branche « sync » ne la voit jamais), compte et crew viennent après
 * la 1re capture, et les notifications sont HORS onboarding (opt-in au 1er
 * contexte utile, copy NOTIFICATIONS conservée dans content.ts).
 *
 * Flow : 1 hook → 1b âge (16+) → 2 le terrain de jeu (plateau démo AVANT tout
 * compte) → 3 choix du chemin → 3a sync (démo import, pas de GPS) OU
 * 3b permission GPS → premier run (1 tap) → 4 1re capture MOMENT SIGNATURE
 * (remplissage + haptique success+heavy + « +X zones » + Partager, CTA
 * « Défendre ma zone ») → 5 compte APRÈS la valeur → 6 crew → sortie.
 * Max 7 écrans jusqu'à la capture (6 sur la branche sync).
 *
 * Discipline (§A) : 1 écran = 1 décision, 1 CTA chartreuse contextuel (VERBES,
 * jamais « GO »/« Continuer »), texte court non tronqué, pas de card-dans-card,
 * compris en < 3 s, reduce motion + haptique (§5.3 : capture = success + heavy).
 * Copy 100 % centralisée dans content.ts, honnête (aucun nom de lieu tant
 * qu'aucun GPS). Une flèche retour DISCRÈTE (gris, coin haut-gauche, ≥ 44 px,
 * jamais un 2e CTA) rattrape un mistap sans quitter le flow — absente sur le
 * hook (STEP_PREV). Web preview (`configured=false`) : la permission GPS est
 * SIMULÉE (bouton démo), l'auth est no-op « ok » (auth.web) — le flow tourne
 * de bout en bout.
 *
 * Gating : à la sortie, on marque l'état PRÉ-COMPTE persistant (onboarding/store)
 * pour que (tabs)/_layout ne re-pousse plus l'onboarding. Un utilisateur DÉJÀ
 * authentifié (session réelle native) ne voit jamais cet écran (garde du layout).
 * CÂBLÉ DÉMO : la capture est simulée (import réel = O7/O8).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/i18n/store';
import { signInWithApple, signInWithGoogle, type AuthResult } from '../../src/lib/auth';
import { Icon } from '../../src/ui/Icon';
import { useCountUp, useReduceMotion } from '../../src/ui/game';
import { withAlpha } from '../../src/features/map/mapStyle';
import { OnboardingAppleButton } from '../../src/features/onboarding/AppleButton';
import { useOnboardingState } from '../../src/features/onboarding/store';
import {
  ACCOUNT,
  AGE,
  CAPTURE,
  CHOOSE,
  CITY,
  CREW,
  HOOK,
  NAV,
  PERMISSION,
  RUN,
  STEP_EVENT_N,
  SYNC,
  type OnboardingStep,
} from '../../src/features/onboarding/content';
import {
  SYNC_DEMO_RUN,
  SYNC_PHASES,
  SYNC_SOURCES,
  syncPhaseIndex,
  syncSource,
  useSyncDemo,
  type SyncSourceKey,
} from '../../src/features/onboarding/syncDemo';
import {
  CaptureFillVisual,
  CityBoard,
  HookMapBackground,
  SyncProgressBar,
} from '../../src/features/onboarding/visuals';

// ─── Durées de scénario (présentation, pas des règles) ───────────────────────

/** Déroulé de l'import sync (§4a — « 1re zone en secondes »). */
const SYNC_DURATION_MS = 3600;
/** Déroulé du premier run démo (§4b — plus court : un objectif simple). */
const RUN_DURATION_MS = 3000;
/** Montée du remplissage + compteur au moment signature (§5). */
const CAPTURE_FILL_MS = 1100;

/**
 * Étape précédente pour la flèche retour discrète (§A : rattraper un mistap sans
 * quitter le flow). `hook` n'a pas de précédent → aucune flèche. La branche sync
 * et la capture reviennent au CHOIX du chemin (re-choisir sync ou run) ; la
 * branche run remonte sa propre séquence (run → permission → choose).
 */
const STEP_PREV: Partial<Record<OnboardingStep, OnboardingStep>> = {
  age: 'hook',
  city: 'age',
  choose: 'city',
  sync: 'choose',
  permission: 'choose',
  run: 'permission',
  capture: 'choose',
  account: 'capture',
  crew: 'account',
};

// ═══════════════════════════════════════════════════════════════════════════
// Écran
// ═══════════════════════════════════════════════════════════════════════════

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const t = useT();
  const { update } = useOnboardingState();
  const [step, setStep] = useState<OnboardingStep>('hook');

  // Funnel §8 : un event par étape atteinte (n dédié A-30, content.STEP_EVENT_N).
  useEffect(() => {
    track(EVENTS.onboardingStep, { n: STEP_EVENT_N[step] });
  }, [step]);

  const go = useCallback((next: OnboardingStep) => {
    haptics.light();
    setStep(next);
  }, []);

  /** Flèche retour : revient à l'étape précédente (sans effet sur `hook`). */
  const back = useCallback(() => {
    const prev = STEP_PREV[step];
    if (!prev) return;
    haptics.light();
    setStep(prev);
  }, [step]);

  /** Sortie du flow : marque l'onboarding fait (pré-compte) + route vers `href`. */
  const finish = useCallback(
    async (href: '/' | '/crew-discovery' | '/crew') => {
      await update({ onboardingDone: true, firstCaptureDone: true });
      router.replace(href);
    },
    [update],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {step === 'hook' ? <HookStep onNext={() => go('age')} /> : null}
      {step === 'age' ? (
        <AgeStep
          onConfirm={() => {
            void update({ ageConfirmed: true });
            go('city');
          }}
        />
      ) : null}
      {step === 'city' ? <CityStep onNext={() => go('choose')} /> : null}
      {step === 'choose' ? (
        <ChooseStep
          onSync={() => {
            void update({ path: 'sync' });
            go('sync');
          }}
          onRun={() => {
            void update({ path: 'run' });
            // La permission GPS n'existe QUE sur ce chemin (juste avant le run).
            go('permission');
          }}
        />
      ) : null}
      {step === 'permission' ? <PermissionStep onNext={() => go('run')} /> : null}
      {step === 'sync' ? (
        <SyncStep
          onDone={() => {
            void update({ firstCaptureDone: true });
            go('capture');
          }}
        />
      ) : null}
      {step === 'run' ? (
        <RunStep
          onDone={() => {
            void update({ firstCaptureDone: true });
            go('capture');
          }}
        />
      ) : null}
      {step === 'capture' ? (
        <CaptureStep reduce={reduce} onNext={() => go('account')} />
      ) : null}
      {step === 'account' ? <AccountStep onNext={() => go('crew')} /> : null}
      {step === 'crew' ? (
        <CrewStep
          // « Rejoindre » menait à /crew-discovery = des crews INVENTÉS, avec un
          // CTA d'adhésion qui ne faisait rien. Il mène à l'onglet Crew réel, où
          // rejoindre par code fonctionne vraiment (RPC serveur 0042).
          onJoin={() => void finish('/crew')}
          onCreate={() => void finish('/crew')}
          onSkip={() => void finish('/')}
        />
      ) : null}
      {/* Flèche retour discrète (rendue en dernier = au-dessus) — jamais sur le hook. */}
      {STEP_PREV[step] ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(NAV.back)}
          hitSlop={12}
          onPress={back}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          {/* Chevron pointé à gauche (le tracé pointe à droite → miroir, comme StackScreen). */}
          <View style={styles.backMirror}>
            <Icon name="chevron" size={iconSizes.lg} color={colors.gris} />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Briques de layout partagées (§A : 1 titre géant, texte court, 1 CTA)
// ═══════════════════════════════════════════════════════════════════════════

/** Sur-titre mono gris (kicker) — jamais chartreuse sur clair (ici fond noir). */
function Kicker({ children }: { children: string }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

/** CTA primaire chartreuse plein (1 par écran, §A4). Icône optionnelle. */
function PrimaryCta({
  label,
  icon,
  onPress,
  a11yLabel,
}: {
  label: string;
  icon?: React.ComponentProps<typeof Icon>['name'];
  onPress: () => void;
  a11yLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
    >
      {icon ? <Icon name={icon} size={20} color={colors.noir} /> : null}
      <Text style={styles.ctaLabel}>{label}</Text>
    </Pressable>
  );
}

/** Lien de sortie douce (« Plus tard ») — texte gris discret, jamais un 2e CTA. */
function SkipLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
    >
      <Text style={styles.skipLabel}>{label}</Text>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 — HOOK / SPLASH (§1) : 1 phrase + carte animée en fond, pas de carrousel
// ═══════════════════════════════════════════════════════════════════════════

function HookStep({ onNext }: { onNext: () => void }) {
  const t = useT();
  return (
    <View style={styles.step}>
      <HookMapBackground />
      {/* Dégradé sombre implicite : le fond carte est déjà atténué (visuals). */}
      <View style={styles.hookContent} pointerEvents="box-none">
        <Text style={styles.brand}>{HOOK.brand}</Text>
        <View style={styles.grow} />
        <Text style={styles.hookTitle}>{t(HOOK.title)}</Text>
        <Text style={styles.hookTagline}>{t(HOOK.tagline)}</Text>
        <View style={styles.footer}>
          <PrimaryCta label={t(HOOK.cta)} icon="carte" onPress={onNext} />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1b — AGE-GATE 16+ (Apple 5.1.1 / mineurs) : AVANT toute collecte GPS/compte
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Auto-déclaration d'âge. « 16+ » = CTA chartreuse (avance) ; « moins de 16 » =
 * lien gris secondaire → écran de blocage TERMINAL (aucun chemin vers l'avant :
 * §A 1 CTA). Le blocage est un état local (remount = nouvelle tentative — une
 * auto-déclaration reste par nature contournable ; c'est le gate attendu).
 */
function AgeStep({ onConfirm }: { onConfirm: () => void }) {
  const t = useT();
  const [blocked, setBlocked] = useState(false);

  if (blocked) {
    return (
      <View style={styles.step}>
        <View style={styles.body}>
          <Kicker>{t(AGE.kicker)}</Kicker>
          <View style={styles.iconHero}>
            <View style={styles.iconHeroRing}>
              <Icon name="verrou" size={40} color={colors.chartreuse} />
            </View>
          </View>
          <Text style={styles.title}>{t(AGE.blockedTitle)}</Text>
          <Text style={styles.tagline}>{t(AGE.blockedTagline)}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(AGE.kicker)}</Kicker>
        <View style={styles.iconHero}>
          <View style={styles.iconHeroRing}>
            <Icon name="profil" size={40} color={colors.chartreuse} />
          </View>
        </View>
        <Text style={styles.title}>{t(AGE.title)}</Text>
        <Text style={styles.tagline}>{t(AGE.tagline)}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta
          label={t(AGE.confirm)}
          icon="bouclier"
          onPress={onConfirm}
          a11yLabel={t(AGE.confirmA11y)}
        />
        <SkipLink
          label={t(AGE.under)}
          onPress={() => {
            haptics.light();
            setBlocked(true);
          }}
        />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 — LE TERRAIN DE JEU (§2) : plateau démo AVANT tout compte (copy honnête :
// aucune localisation obtenue → jamais « ton quartier »)
// ═══════════════════════════════════════════════════════════════════════════

function CityStep({ onNext }: { onNext: () => void }) {
  const t = useT();
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(CITY.kicker)}</Kicker>
        <Text style={styles.title}>{t(CITY.title)}</Text>
        <View style={styles.boardWrap}>
          <CityBoard />
        </View>
        <Text style={styles.tagline}>{t(CITY.tagline)}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={t(CITY.cta)} icon="cible" onPress={onNext} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3b — PERMISSION GPS PÉDAGOGIQUE : UNIQUEMENT sur la branche « run », juste
// avant Lancer le run (la branche « sync » ne la voit jamais)
// ═══════════════════════════════════════════════════════════════════════════

function PermissionStep({ onNext }: { onNext: () => void }) {
  const t = useT();
  const askGps = () => {
    // Honnêteté (§ charte n°1) : cet écran est PÉDAGOGIQUE, il ne déclenche AUCUNE
    // boîte système ici — ni sur web (simulé), ni sur natif. La vraie demande
    // expo-location vit dans le flow de course (useRealRun), en contexte, au 1er
    // run réel. Le tap enregistre donc une INTENTION (funnel `onboarding_accept`,
    // jamais un « granted » OS) — c'est un accord de principe, pas une activation.
    haptics.medium();
    track(EVENTS.permissionLocation, { result: 'onboarding_accept' });
    onNext();
  };
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(PERMISSION.kicker)}</Kicker>
        <View style={styles.iconHero}>
          <View style={styles.iconHeroRing}>
            <Icon name="gps" size={40} color={colors.chartreuse} />
          </View>
        </View>
        <Text style={styles.title}>{t(PERMISSION.title)}</Text>
        <Text style={styles.tagline}>{t(PERMISSION.tagline)}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={t(PERMISSION.cta)} icon="gps" onPress={askGps} />
        <SkipLink label={t(PERMISSION.skip)} onPress={onNext} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 — CHOIX DU CHEMIN (§4) : 2 options claires (sync / run), verbes pas « GO »
// ═══════════════════════════════════════════════════════════════════════════

function ChooseStep({ onSync, onRun }: { onSync: () => void; onRun: () => void }) {
  const t = useT();
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(CHOOSE.kicker)}</Kicker>
        <Text style={styles.title}>{t(CHOOSE.title)}</Text>
        <Text style={styles.tagline}>{t(CHOOSE.tagline)}</Text>
        <View style={styles.pathList}>
          <PathCard
            icon="lien"
            title={t(CHOOSE.syncTitle)}
            subtitle={t(CHOOSE.syncSubtitle)}
            onPress={onSync}
          />
          <PathCard
            icon="conquete"
            title={t(CHOOSE.runTitle)}
            subtitle={t(CHOOSE.runSubtitle)}
            onPress={onRun}
          />
        </View>
      </View>
    </View>
  );
}

/** Grande carte-choix pleine largeur (une décision par tap — pas de card-in-card). */
function PathCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.pathCard, pressed && styles.pathCardPressed]}
    >
      <View style={styles.pathIcon}>
        <Icon name={icon} size={iconSizes.lg} color={colors.chartreuse} />
      </View>
      <View style={styles.pathText}>
        <Text style={styles.pathTitle}>{title}</Text>
        <Text style={styles.pathSubtitle}>{subtitle}</Text>
      </View>
      {/* Chevron par défaut → pointe déjà vers la droite (affordance « entrer »). */}
      <Icon name="chevron" size={18} color={colors.gris} />
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3a — SYNC (démo) (§4a) : import d'un run récent → 1re zone en secondes.
// Le tap sur une source LANCE l'import (pas de CTA séparé — une décision, un tap).
// ═══════════════════════════════════════════════════════════════════════════

function SyncStep({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [source, setSource] = useState<SyncSourceKey | null>(null);
  const [running, setRunning] = useState(false);
  const p = useSyncDemo(running, SYNC_DURATION_MS, onDone);
  const activeIndex = syncPhaseIndex(p);
  const chosen = source ? syncSource(source) : null;

  const start = (key: SyncSourceKey) => {
    haptics.medium();
    setSource(key);
    setRunning(true);
  };

  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(SYNC.kicker)}</Kicker>
        <Text style={styles.title}>{t(SYNC.title)}</Text>
        <Text style={styles.tagline}>{t(SYNC.tagline)}</Text>

        {!running ? (
          // Choix de la source (Apple Health / Strava — libellés sources/catalog).
          <View style={styles.sourceList}>
            {SYNC_SOURCES.map((s) => (
              <Pressable
                key={s.key}
                accessibilityRole="button"
                accessibilityLabel={`${s.name} — ${s.trust}`}
                onPress={() => start(s.key)}
                style={({ pressed }) => [styles.sourceCard, pressed && styles.pathCardPressed]}
              >
                <View style={styles.pathIcon}>
                  <Icon name={s.icon} size={24} color={colors.chartreuse} />
                </View>
                <View style={styles.pathText}>
                  <Text style={styles.pathTitle}>{s.name}</Text>
                  <Text style={styles.pathSubtitle}>{s.trust}</Text>
                </View>
                <Icon name="chevron" size={iconSizes.md} color={colors.gris} />
              </Pressable>
            ))}
          </View>
        ) : (
          // Déroulé de l'import : source + run détecté + étapes cochées + barre.
          <View style={styles.syncRunning}>
            <View style={styles.syncSourceRow}>
              {chosen ? <Icon name={chosen.icon} size={20} color={colors.chartreuse} /> : null}
              <Text style={styles.syncSourceName} numberOfLines={1} adjustsFontSizeToFit>
                {chosen?.name} · {SYNC_DEMO_RUN.whenLabel}
              </Text>
              {/* Honnêteté (§ charte n°1) : l'import réel n'est pas branché (O7/O8) —
                  ce run détecté est un EXEMPLE, jamais présenté comme une vraie sync. */}
              <View style={styles.demoTag}>
                <Text style={styles.demoTagLabel}>{t(SYNC.demoTag)}</Text>
              </View>
            </View>
            <Text style={styles.syncRunMeta}>
              {(SYNC_DEMO_RUN.distanceM / 1000).toFixed(1).replace('.', ',')} km ·{' '}
              {t(SYNC.loopMeta)}
            </Text>
            <View style={styles.syncSteps}>
              {SYNC_PHASES.map((ph, i) => {
                const done = i < activeIndex || p >= 1;
                const active = i === activeIndex && p < 1;
                return (
                  <View key={ph.key} style={styles.syncStepRow}>
                    <View
                      style={[
                        styles.syncDot,
                        done && styles.syncDotDone,
                        active && styles.syncDotActive,
                      ]}
                    >
                      {/* L'état ne repose jamais sur la seule couleur : fait =
                          badge coché (cue « TERMINÉ », pas « verrouillé »), en
                          cours = point plein (forme). */}
                      {done ? <Icon name="badge" size={12} color={colors.noir} /> : null}
                      {active ? <View style={styles.syncDotInner} /> : null}
                    </View>
                    <Text style={[styles.syncStepLabel, (done || active) && styles.syncStepLabelOn]}>
                      {ph.label}
                    </Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.syncBarWrap}>
              <SyncProgressBar p={p} />
            </View>
            <Text style={styles.syncHint}>{t(SYNC.running)}…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3b — PREMIER RUN (§4b) : 1 tap RUN, objectif ultra-simple, zéro config
// ═══════════════════════════════════════════════════════════════════════════

function RunStep({ onDone }: { onDone: () => void }) {
  const t = useT();
  const [running, setRunning] = useState(false);
  const p = useSyncDemo(running, RUN_DURATION_MS, onDone);
  const start = () => {
    haptics.medium();
    track(EVENTS.runStart, { context: 'onboarding' });
    setRunning(true);
  };
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(RUN.kicker)}</Kicker>
        <Text style={styles.title}>{t(RUN.title)}</Text>
        <Text style={styles.tagline}>{t(RUN.tagline)}</Text>
        {running ? (
          <View style={styles.runningWrap}>
            <CaptureFillVisual p={p} />
            <Text style={styles.syncHint}>{t(RUN.running)}…</Text>
          </View>
        ) : (
          <View style={styles.runHeroWrap}>
            <View style={styles.runHeroRing}>
              <Icon name="conquete" size={44} color={colors.chartreuse} />
            </View>
            <Text style={styles.runHeroObjective}>{t(RUN.objective)}</Text>
          </View>
        )}
      </View>
      {!running ? (
        <View style={styles.footer}>
          <PrimaryCta label={t(RUN.cta)} icon="conquete" onPress={start} />
        </View>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 — 1re CAPTURE : MOMENT SIGNATURE (§5) — remplissage + haptique + « +X ».
// Copy honnête : « autour de toi » (aucun nom de lieu tant qu'aucun GPS).
// ═══════════════════════════════════════════════════════════════════════════

function CaptureStep({ reduce, onNext }: { reduce: boolean; onNext: () => void }) {
  const t = useT();
  // Progression 0..1 du remplissage + compteur (montent ensemble). Reduce
  // motion → état final direct (la valeur reste lisible, jamais dépend de l'anim).
  const [p, setP] = useState(reduce ? 1 : 0);
  const anim = useRef(new Animated.Value(0)).current;
  // Haptique signature (§5.3) : success + heavy, tirée UNE fois à l'arrivée.
  const fired = useRef(false);
  const zones = useCountUp(SYNC_DEMO_RUN.zones, CAPTURE_FILL_MS);

  useEffect(() => {
    const fireHaptic = () => {
      if (fired.current) return;
      fired.current = true;
      haptics.success();
      haptics.heavy();
      track(EVENTS.celebrationViewed, { mode: 'conquete' });
    };
    if (reduce) {
      setP(1);
      fireHaptic();
      return;
    }
    const id = anim.addListener(({ value }) => {
      setP(value);
      if (value >= 0.66) fireHaptic();
    });
    Animated.timing(anim, {
      toValue: 1,
      duration: CAPTURE_FILL_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => {
      anim.removeListener(id);
      anim.stopAnimation();
    };
  }, [reduce, anim]);

  // Honnêteté (§ charte n°1) : PAS d'affordance « Partager » ici — rien n'est
  // partagé en pré-compte et aucune card n'est générée. Le vrai partage (carte
  // de replay) vit dans /partage, APRÈS le compte ; on n'émet donc jamais
  // shareCardGenerated sans partage réel. Un seul CTA : « Défendre ma zone ».

  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(CAPTURE.kicker)}</Kicker>
        <Text style={styles.captureTitle}>{t(CAPTURE.title)}</Text>
        <View style={styles.boardWrap}>
          <CaptureFillVisual p={p} />
        </View>
        {/* Le gros chiffre héros (+X zones) — signature typographique. */}
        <View style={styles.captureStat}>
          <Text style={styles.captureNumber}>+{zones}</Text>
          <Text style={styles.captureUnit}>{t(CAPTURE.zonesLabel)}</Text>
        </View>
        <Text style={styles.captureSub}>
          {t(CAPTURE.sub, { n: SYNC_DEMO_RUN.enclosedZones })}
        </Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={t(CAPTURE.cta)} icon="conquete" onPress={onNext} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 — COMPTE APRÈS LA VALEUR (§6) : Apple / passkey, 1 tap. Jamais un mur.
// ═══════════════════════════════════════════════════════════════════════════

function AccountStep({ onNext }: { onNext: () => void }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const run = async (fn: () => Promise<AuthResult>) => {
    // Garde de réentrance : le bouton Apple (natif) n'a pas de prop `disabled`,
    // donc un double-tap — ou Apple puis Google pendant l'attente — pourrait
    // relancer l'auth. On ignore tout appel tant qu'un run est en cours.
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await fn();
    setBusy(false);
    // Honnêteté (§ charte n°1) : un refus/échec n'est PAS un succès — on n'avance
    // que si l'auth réussit. On reste sur l'écran avec un message court. Ce n'est
    // pas un mur (§4.1) : « Plus tard » laisse toujours passer sans compte.
    if (result.ok) {
      onNext();
    } else {
      setFailed(true);
    }
  };
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(ACCOUNT.kicker)}</Kicker>
        <View style={styles.iconHero}>
          <View style={styles.iconHeroRing}>
            <Icon name="bouclier" size={40} color={colors.chartreuse} />
          </View>
        </View>
        <Text style={styles.title}>{t(ACCOUNT.title)}</Text>
        <Text style={styles.tagline}>{t(ACCOUNT.tagline)}</Text>
      </View>
      <View style={styles.footer}>
        {failed ? (
          <Text style={styles.authError} accessibilityRole="alert">
            {t(ACCOUNT.error)}
          </Text>
        ) : null}
        {Platform.OS === 'ios' ? (
          // Vrai bouton système Apple (fork natif — jamais bundlé sur web).
          <OnboardingAppleButton onPress={() => void run(signInWithApple)} />
        ) : (
          // Web/Android : CTA Apple générique (auth.web = no-op « ok » en preview).
          <PrimaryCta
            label={t(ACCOUNT.apple)}
            icon="profil"
            onPress={() => void run(signInWithApple)}
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(ACCOUNT.google)}
          disabled={busy}
          onPress={() => void run(signInWithGoogle)}
          style={({ pressed }) => [styles.ghost, (pressed || busy) && styles.pressed]}
        >
          <Text style={styles.ghostLabel}>{t(ACCOUNT.google)}</Text>
        </Pressable>
        <SkipLink label={t(ACCOUNT.skip)} onPress={onNext} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 — CREW (§7) : proposé APRÈS la 1re capture, jamais imposé. Dernière étape :
// chaque sortie (rejoindre / créer / plus tard) quitte le flow.
// ═══════════════════════════════════════════════════════════════════════════

function CrewStep({
  onJoin,
  onCreate,
  onSkip,
}: {
  onJoin: () => void;
  onCreate: () => void;
  onSkip: () => void;
}) {
  const t = useT();
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(CREW.kicker)}</Kicker>
        <View style={styles.iconHero}>
          <View style={styles.iconHeroRing}>
            <Icon name="crew" size={40} color={colors.chartreuse} />
          </View>
        </View>
        <Text style={styles.title}>{t(CREW.title)}</Text>
        <Text style={styles.tagline}>{t(CREW.tagline)}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={t(CREW.join)} icon="crew" onPress={onJoin} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(CREW.create)}
          onPress={onCreate}
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
        >
          <Text style={styles.ghostLabel}>{t(CREW.create)}</Text>
        </Pressable>
        <SkipLink label={t(CREW.skip)} onPress={onSkip} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  // Flèche retour discrète : coin haut-gauche, au-dessus du contenu de l'étape.
  // `top` posé sur la boîte de padding (root paddingTop = insets.top) → juste
  // sous l'encoche. Gris discret, jamais un 2e CTA (§A). Cible ≥ 44×44 (+hitSlop).
  back: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backMirror: { transform: [{ scaleX: -1 }] },
  step: { flex: 1, paddingHorizontal: spacing.cardPadding + 4 },
  // Corps : contenu principal (titre + visuel + tagline) — centré verticalement.
  body: { flex: 1, justifyContent: 'center', paddingTop: spacing.md },
  grow: { flex: 1 },
  footer: { paddingBottom: spacing.md, paddingTop: spacing.sm, gap: 10 },

  kicker: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2.5,
    marginBottom: 14,
    fontVariant: ['tabular-nums'],
  },
  title: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: fontSizes.xl * 1.14,
  },
  tagline: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    marginTop: 14,
  },

  // CTA primaire chartreuse (pill 56, texte noir 600, icône + texte — §A10).
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },
  ctaLabel: { color: colors.noir, fontSize: fontSizes.md, fontWeight: '600', letterSpacing: 0.2 },
  pressed: { opacity: 0.85 },

  // Bouton secondaire ghost (bordure gris-ligne, texte blanc).
  ghost: {
    height: 54,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostLabel: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500' },

  // Sortie douce « Plus tard » — cible tactile ≥ 44 px.
  skip: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: spacing.sm },
  skipLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },

  // ── 1 HOOK ──
  hookContent: { flex: 1, paddingHorizontal: 0, paddingTop: spacing.lg, paddingBottom: 0 },
  brand: {
    color: colors.chartreuse, // emploi §C.3 : accent, sur fond noir (jamais clair)
    fontSize: fontSizes.lg,
    fontWeight: '700',
    letterSpacing: 3,
  },
  hookTitle: {
    color: colors.blanc,
    fontSize: fontSizes.hero,
    lineHeight: fontSizes.hero * 1.02,
    fontWeight: '700',
    letterSpacing: -1.4,
  },
  hookTagline: {
    color: colors.gris,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.5,
    marginTop: 18,
    maxWidth: 320,
  },

  // ── 2 CITY / 4 CAPTURE : le plateau ──
  boardWrap: { marginTop: spacing.lg, marginBottom: spacing.xxs },

  // ── 1b / 3b / 5 / 6 : hero icône ──
  iconHero: { alignItems: 'center', marginBottom: 26 },
  iconHeroRing: {
    width: 92,
    height: 92,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: withAlpha(colors.chartreuse, 0.4),
    backgroundColor: withAlpha(colors.chartreuse, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── 3 CHOOSE : cartes-chemin ──
  pathList: { marginTop: 26, gap: spacing.sm },
  pathCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    padding: spacing.cardPadding,
  },
  pathCardPressed: { opacity: 0.85, borderColor: withAlpha(colors.chartreuse, 0.5) },
  pathIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.card - 6,
    backgroundColor: withAlpha(colors.chartreuse, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pathText: { flex: 1 },
  pathTitle: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  pathSubtitle: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    marginTop: 3,
  },

  // ── 3a SYNC ──
  sourceList: { marginTop: 22, gap: spacing.sm },
  sourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.card,
    padding: spacing.cardPadding - 2,
  },
  syncRunning: { marginTop: spacing.xl },
  syncSourceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  syncSourceName: { flexShrink: 1, color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  // Tag « Exemple » discret : dit la vérité (import démo) sans casser la scène.
  demoTag: {
    borderWidth: 1,
    borderColor: colors.grisLigne,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  demoTagLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  syncRunMeta: { color: colors.gris, fontSize: fontSizes.sm, marginTop: spacing.xxs },
  syncSteps: { marginTop: 22, gap: 14 },
  syncStepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  syncDot: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.grisLigne,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncDotActive: { borderColor: colors.chartreuse },
  /** Point plein de l'étape EN COURS (cue de forme, pas seulement de couleur). */
  syncDotInner: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },
  syncDotDone: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse },
  syncStepLabel: { color: colors.gris, fontSize: fontSizes.md, fontWeight: '500' },
  syncStepLabelOn: { color: colors.blanc },
  syncBarWrap: { marginTop: spacing.xl },
  syncHint: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: spacing.md,
  },

  // ── 3b RUN ──
  runHeroWrap: { alignItems: 'center', marginTop: 30 },
  runHeroRing: {
    width: 108,
    height: 108,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: withAlpha(colors.chartreuse, 0.4),
    backgroundColor: withAlpha(colors.chartreuse, 0.08),
    alignItems: 'center',
    justifyContent: 'center',
  },
  runHeroObjective: {
    color: colors.gris,
    fontSize: fontSizes.md,
    textAlign: 'center',
    marginTop: 22,
    maxWidth: 260,
    lineHeight: fontSizes.md * 1.45,
  },
  runningWrap: { marginTop: 18, alignItems: 'center' },

  // ── 4 CAPTURE ──
  captureTitle: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  captureStat: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: spacing.lg },
  captureNumber: {
    color: colors.chartreuse,
    fontSize: fontSizes.heroMax,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    lineHeight: fontSizes.heroMax,
  },
  captureUnit: { color: colors.gris, fontSize: fontSizes.md, fontWeight: '500' },
  captureSub: { color: colors.gris, fontSize: fontSizes.sm, marginTop: spacing.xs },

  // Message d'échec d'auth (honnête) : centré, lisible (≥ 12 px), non chartreuse.
  authError: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
});
