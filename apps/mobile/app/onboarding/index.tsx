/**
 * GRYD — ONBOARDING SANS FRICTION (AMENDEMENT-30, stratégie §6/§7). REFONTE :
 * un stepper 8 étapes qui déplace TOUTE la friction hors de la course et active
 * (1re capture) le plus vite. Règle cardinale : « aucun écran ne demande avant
 * d'avoir donné » — permission GPS, compte, crew et notifications viennent
 * TOUJOURS après la valeur (la 1re capture, §5).
 *
 * Flow (§7) : 1 hook → 2 ta ville (plateau AVANT compte) → 3 permission GPS
 * pédagogique → 4 choix du chemin → 4a sync (démo import) OU 4b premier run
 * (1 tap) → 5 1re capture MOMENT SIGNATURE (remplissage + haptique success+heavy
 * + « +X zones » + Partager) → 6 compte APRÈS la valeur → 7 crew → 8 notifs.
 *
 * Discipline (§A) : 1 écran = 1 décision, 1 CTA chartreuse contextuel (VERBES,
 * jamais « GO »), texte court non tronqué, pas de card-dans-card, compris en
 * < 3 s, reduce motion + haptique (§5.3 : capture = success + heavy). Web preview
 * (`configured=false`) : la permission GPS et les notifs sont SIMULÉES (boutons
 * démo), l'auth est no-op « ok » (auth.web) — le flow tourne de bout en bout.
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
import { colors, fontSizes, radii, spacing } from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { signInWithApple, signInWithGoogle, type AuthResult } from '../../src/lib/auth';
import { Icon } from '../../src/ui/Icon';
import { useCountUp, useReduceMotion } from '../../src/ui/game';
import { withAlpha } from '../../src/features/map/mapStyle';
import { OnboardingAppleButton } from '../../src/features/onboarding/AppleButton';
import { useOnboardingState } from '../../src/features/onboarding/store';
import {
  ACCOUNT,
  CAPTURE,
  CHOOSE,
  CITY,
  CREW,
  HOOK,
  INVITE,
  NOTIFICATIONS,
  PERMISSION,
  RUN,
  STEP_EVENT_N,
  SYNC,
  type OnboardingStep,
} from '../../src/features/onboarding/content';
import {
  buildInviteLink,
  copyInviteLink,
  demoInviteToken,
  shareInviteLink,
} from '../../src/features/crew/invite';
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
  CrewDensityBoard,
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

// ═══════════════════════════════════════════════════════════════════════════
// Écran
// ═══════════════════════════════════════════════════════════════════════════

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
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
      {step === 'hook' ? <HookStep onNext={() => go('city')} /> : null}
      {step === 'city' ? <CityStep onNext={() => go('permission')} /> : null}
      {step === 'permission' ? (
        <PermissionStep onNext={() => go('choose')} />
      ) : null}
      {step === 'choose' ? (
        <ChooseStep
          onSync={() => {
            void update({ path: 'sync' });
            go('sync');
          }}
          onRun={() => {
            void update({ path: 'run' });
            go('run');
          }}
        />
      ) : null}
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
        <CaptureStep reduce={reduce} onNext={() => go('invite')} />
      ) : null}
      {step === 'invite' ? (
        <InviteStep onNext={() => go('account')} onSkip={() => go('account')} />
      ) : null}
      {step === 'account' ? <AccountStep onNext={() => go('crew')} /> : null}
      {step === 'crew' ? (
        <CrewStep
          onJoin={() => void finish('/crew-discovery')}
          onCreate={() => void finish('/crew')}
          onSkip={() => go('notifications')}
        />
      ) : null}
      {step === 'notifications' ? (
        <NotificationsStep onDone={() => void finish('/')} />
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
  return (
    <View style={styles.step}>
      <HookMapBackground />
      {/* Dégradé sombre implicite : le fond carte est déjà atténué (visuals). */}
      <View style={styles.hookContent} pointerEvents="box-none">
        <Text style={styles.brand}>{HOOK.brand}</Text>
        <View style={styles.grow} />
        <Text style={styles.hookTitle}>{HOOK.title}</Text>
        <Text style={styles.hookTagline}>{HOOK.tagline}</Text>
        <View style={styles.footer}>
          <PrimaryCta label={HOOK.cta} icon="carte" onPress={onNext} />
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 — TA VILLE MAINTENANT (§2) : quartier en plateau AVANT tout compte
// ═══════════════════════════════════════════════════════════════════════════

function CityStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{CITY.kicker}</Kicker>
        <Text style={styles.title}>{CITY.title}</Text>
        <View style={styles.boardWrap}>
          <CityBoard />
        </View>
        <Text style={styles.tagline}>{CITY.tagline}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={CITY.cta} icon="cible" onPress={onNext} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 — PERMISSION GPS PÉDAGOGIQUE (§3) : on explique AVANT la demande système
// ═══════════════════════════════════════════════════════════════════════════

function PermissionStep({ onNext }: { onNext: () => void }) {
  const askGps = () => {
    // Web preview : SIMULÉ (aucune API système). Natif : la vraie demande
    // expo-location vit dans le flow de course (useRealRun) au 1er run réel —
    // ici on pose l'INTENTION et on log le funnel (permission pédagogique §3).
    haptics.medium();
    track(EVENTS.permissionLocation, { result: 'onboarding_accept' });
    onNext();
  };
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{PERMISSION.kicker}</Kicker>
        <View style={styles.iconHero}>
          <View style={styles.iconHeroRing}>
            <Icon name="gps" size={40} color={colors.chartreuse} />
          </View>
        </View>
        <Text style={styles.title}>{PERMISSION.title}</Text>
        <Text style={styles.tagline}>{PERMISSION.tagline}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={PERMISSION.cta} icon="gps" onPress={askGps} />
        <SkipLink label={PERMISSION.skip} onPress={onNext} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4 — CHOIX DU CHEMIN (§4) : 2 options claires (sync / run), verbes pas « GO »
// ═══════════════════════════════════════════════════════════════════════════

function ChooseStep({ onSync, onRun }: { onSync: () => void; onRun: () => void }) {
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{CHOOSE.kicker}</Kicker>
        <Text style={styles.title}>{CHOOSE.title}</Text>
        <Text style={styles.tagline}>{CHOOSE.tagline}</Text>
        <View style={styles.pathList}>
          <PathCard
            icon="lien"
            title={CHOOSE.syncTitle}
            subtitle={CHOOSE.syncSubtitle}
            onPress={onSync}
          />
          <PathCard
            icon="conquete"
            title={CHOOSE.runTitle}
            subtitle={CHOOSE.runSubtitle}
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
        <Icon name={icon} size={26} color={colors.chartreuse} />
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
// 4a — SYNC (démo) (§4a) : import d'un run récent → 1re zone en secondes
// ═══════════════════════════════════════════════════════════════════════════

function SyncStep({ onDone }: { onDone: () => void }) {
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
        <Kicker>{SYNC.kicker}</Kicker>
        <Text style={styles.title}>{SYNC.title}</Text>
        <Text style={styles.tagline}>{SYNC.tagline}</Text>

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
                <Icon name="chevron" size={18} color={colors.gris} />
              </Pressable>
            ))}
          </View>
        ) : (
          // Déroulé de l'import : source + run détecté + étapes cochées + barre.
          <View style={styles.syncRunning}>
            <View style={styles.syncSourceRow}>
              {chosen ? <Icon name={chosen.icon} size={20} color={colors.chartreuse} /> : null}
              <Text style={styles.syncSourceName}>
                {chosen?.name} · {SYNC_DEMO_RUN.whenLabel}
              </Text>
            </View>
            <Text style={styles.syncRunMeta}>
              {(SYNC_DEMO_RUN.distanceM / 1000).toFixed(1).replace('.', ',')} km · une boucle
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
                      {done ? <Icon name="verrou" size={11} color={colors.noir} /> : null}
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
            <Text style={styles.syncHint}>{SYNC.running}…</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4b — PREMIER RUN (§4b) : 1 tap RUN, objectif ultra-simple, zéro config
// ═══════════════════════════════════════════════════════════════════════════

function RunStep({ onDone }: { onDone: () => void }) {
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
        <Kicker>{RUN.kicker}</Kicker>
        <Text style={styles.title}>{RUN.title}</Text>
        <Text style={styles.tagline}>{RUN.tagline}</Text>
        {running ? (
          <View style={styles.runningWrap}>
            <CaptureFillVisual p={p} />
            <Text style={styles.syncHint}>{RUN.running}…</Text>
          </View>
        ) : (
          <View style={styles.runHeroWrap}>
            <View style={styles.runHeroRing}>
              <Icon name="conquete" size={44} color={colors.chartreuse} />
            </View>
            <Text style={styles.runHeroObjective}>Ferme une boucle. La zone est à toi.</Text>
          </View>
        )}
      </View>
      {!running ? (
        <View style={styles.footer}>
          <PrimaryCta label={RUN.cta} icon="conquete" onPress={start} a11yLabel="Lancer le run" />
        </View>
      ) : null}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 — 1re CAPTURE : MOMENT SIGNATURE (§5) — remplissage + haptique + « +X »
// ═══════════════════════════════════════════════════════════════════════════

function CaptureStep({ reduce, onNext }: { reduce: boolean; onNext: () => void }) {
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

  const share = () => {
    haptics.light();
    track(EVENTS.shareCardGenerated, { source: 'onboarding' });
    // Câblé démo : le partage réel arrive après le compte — ici on continue le
    // flow (la carte de partage vit dans /partage, hors onboarding pré-compte).
    onNext();
  };

  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{CAPTURE.kicker}</Kicker>
        <Text style={styles.captureTitle}>{CAPTURE.title}</Text>
        <View style={styles.boardWrap}>
          <CaptureFillVisual p={p} />
        </View>
        {/* Le gros chiffre héros (+X zones) — signature typographique. */}
        <View style={styles.captureStat}>
          <Text style={styles.captureNumber}>+{zones}</Text>
          <Text style={styles.captureUnit}>{CAPTURE.zonesLabel}</Text>
        </View>
        <Text style={styles.captureSub}>
          dont {SYNC_DEMO_RUN.enclosedZones} {CAPTURE.loopLabel} · {SYNC_DEMO_RUN.zoneName}
        </Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={CAPTURE.cta} icon="conquete" onPress={onNext} />
        <SkipLink label={CAPTURE.share} onPress={share} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5b — AMÈNE TON CREW (AMENDEMENT-31 §1) : seeding densité, APRÈS la capture
// ═══════════════════════════════════════════════════════════════════════════

/**
 * « Prends le quartier à plusieurs » — l'étape densité, juste après la 1re
 * capture (le joueur vient de prendre sa 1re zone → on lui montre qu'à plusieurs
 * il TIENT le quartier). Un lien de partage démo (build via crew/invite) +
 * [Partager] (CTA) + [Copier] (secondaire) + [Plus tard]. Jamais imposé (§7).
 * CÂBLÉ DÉMO : lien réaliste `gryd.run/c/…` ; l'invite réelle = deep link prod.
 * ANTI PAY-TO-WIN : inviter n'achète rien, ne donne aucun territoire — social pur.
 */
function InviteStep({ onNext, onSkip }: { onNext: () => void; onSkip: () => void }) {
  // Lien démo dérivé d'un nom de crew de scénario (prod : code émis serveur).
  const link = buildInviteLink(demoInviteToken('Foulées 93'));
  // Feedback court sous le lien (jamais bloquant) — « Lien copié » / « prêt ».
  const [feedback, setFeedback] = useState<string | null>(null);

  const doShare = async () => {
    haptics.medium();
    // §8 : l'invite est le levier densité — on log l'INTENTION (câblé démo).
    track(EVENTS.inviteSent, { via: 'onboarding_share' });
    const res = await shareInviteLink(link);
    if (res.ok) {
      track(EVENTS.shareCompleted, { channel: res.via });
      setFeedback(INVITE.shared);
      haptics.success();
      // Le partage abouti fait avancer le flow (la valeur densité est passée).
      onNext();
    }
    // Un « annulé » ne fait rien avancer (l'utilisateur reste sur l'écran).
  };

  const doCopy = async () => {
    haptics.light();
    track(EVENTS.inviteSent, { via: 'onboarding_copy' });
    const res = await copyInviteLink(link);
    if (res.ok) {
      setFeedback(res.via === 'clipboard' ? INVITE.copied : INVITE.shared);
      haptics.success();
    }
  };

  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{INVITE.kicker}</Kicker>
        <Text style={styles.title}>{INVITE.title}</Text>
        <View style={styles.boardWrap}>
          <CrewDensityBoard />
        </View>
        <Text style={styles.tagline}>{INVITE.tagline}</Text>

        {/* Le lien de partage (démo) : étiquette + URL lisible + Copier inline. */}
        <Text style={styles.inviteLinkLabel}>{INVITE.linkLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${INVITE.copy} — ${link}`}
          onPress={() => void doCopy()}
          style={({ pressed }) => [styles.inviteLinkRow, pressed && styles.pressed]}
        >
          <Icon name="lien" size={18} color={colors.chartreuse} />
          <Text style={styles.inviteLinkText} numberOfLines={1}>
            {link.replace('https://', '')}
          </Text>
          <Icon name="copier" size={18} color={colors.gris} />
        </Pressable>

        {/* Objectif doux + feedback (jamais un quota bloquant). */}
        <Text style={styles.inviteGoal}>{feedback ?? INVITE.goal}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={INVITE.cta} icon="partage" onPress={() => void doShare()} />
        <SkipLink label={INVITE.skip} onPress={onSkip} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 — COMPTE APRÈS LA VALEUR (§6) : Apple / passkey, 1 tap. Jamais un mur.
// ═══════════════════════════════════════════════════════════════════════════

function AccountStep({ onNext }: { onNext: () => void }) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<AuthResult>) => {
    setBusy(true);
    const result = await fn();
    setBusy(false);
    // Un échec/refus n'est jamais un mur (§4.1) : on avance quand même (la valeur
    // est déjà donnée) ; un succès enchaîne pareil vers le crew.
    if (result.ok || !result.ok) onNext();
  };
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{ACCOUNT.kicker}</Kicker>
        <View style={styles.iconHero}>
          <View style={styles.iconHeroRing}>
            <Icon name="bouclier" size={40} color={colors.chartreuse} />
          </View>
        </View>
        <Text style={styles.title}>{ACCOUNT.title}</Text>
        <Text style={styles.tagline}>{ACCOUNT.tagline}</Text>
      </View>
      <View style={styles.footer}>
        {Platform.OS === 'ios' ? (
          // Vrai bouton système Apple (fork natif — jamais bundlé sur web).
          <OnboardingAppleButton onPress={() => void run(signInWithApple)} />
        ) : (
          // Web/Android : CTA Apple générique (auth.web = no-op « ok » en preview).
          <PrimaryCta
            label={ACCOUNT.apple}
            icon="profil"
            onPress={() => void run(signInWithApple)}
            a11yLabel="Continuer avec Apple"
          />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ACCOUNT.google}
          disabled={busy}
          onPress={() => void run(signInWithGoogle)}
          style={({ pressed }) => [styles.ghost, (pressed || busy) && styles.pressed]}
        >
          <Text style={styles.ghostLabel}>{ACCOUNT.google}</Text>
        </Pressable>
        <SkipLink label={ACCOUNT.skip} onPress={onNext} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 7 — CREW (§7) : proposé APRÈS la 1re capture, jamais imposé
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
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{CREW.kicker}</Kicker>
        <View style={styles.iconHero}>
          <View style={styles.iconHeroRing}>
            <Icon name="crew" size={40} color={colors.chartreuse} />
          </View>
        </View>
        <Text style={styles.title}>{CREW.title}</Text>
        <Text style={styles.tagline}>{CREW.tagline}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={CREW.join} icon="crew" onPress={onJoin} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={CREW.create}
          onPress={onCreate}
          style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
        >
          <Text style={styles.ghostLabel}>{CREW.create}</Text>
        </Pressable>
        <SkipLink label={CREW.skip} onPress={onSkip} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 8 — NOTIFICATIONS (§8) : opt-in cadré, APRÈS la valeur
// ═══════════════════════════════════════════════════════════════════════════

function NotificationsStep({ onDone }: { onDone: () => void }) {
  const enable = () => {
    // Web preview : SIMULÉ. Natif : la vraie demande de permission notifs se
    // fera au premier contexte utile (push contextuel §35) — ici on cadre
    // l'opt-in et on log l'intention.
    haptics.medium();
    track(EVENTS.notificationOpened, { type: 'onboarding_optin' });
    onDone();
  };
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{NOTIFICATIONS.kicker}</Kicker>
        <View style={styles.iconHero}>
          <View style={styles.iconHeroRing}>
            <Icon name="cloche" size={40} color={colors.chartreuse} />
          </View>
        </View>
        <Text style={styles.title}>{NOTIFICATIONS.title}</Text>
        <Text style={styles.tagline}>{NOTIFICATIONS.tagline}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={NOTIFICATIONS.cta} icon="cloche" onPress={enable} />
        <SkipLink label={NOTIFICATIONS.skip} onPress={onDone} />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir },
  step: { flex: 1, paddingHorizontal: spacing.cardPadding + 4 },
  // Corps : contenu principal (titre + visuel + tagline) — centré verticalement.
  body: { flex: 1, justifyContent: 'center', paddingTop: 16 },
  grow: { flex: 1 },
  footer: { paddingBottom: 16, paddingTop: 12, gap: 10 },

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

  // Sortie douce « Plus tard ».
  skip: { alignItems: 'center', paddingVertical: 12 },
  skipLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },

  // ── 1 HOOK ──
  hookContent: { flex: 1, paddingHorizontal: 0, paddingTop: 20, paddingBottom: 0 },
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

  // ── 2 CITY / 5 CAPTURE : le plateau ──
  boardWrap: { marginTop: 20, marginBottom: 4 },

  // ── 3 / 6 / 7 / 8 : hero icône ──
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

  // ── 4 CHOOSE : cartes-chemin ──
  pathList: { marginTop: 26, gap: 12 },
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

  // ── 4a SYNC ──
  sourceList: { marginTop: 22, gap: 12 },
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
  syncRunning: { marginTop: 24 },
  syncSourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  syncSourceName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  syncRunMeta: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 4 },
  syncSteps: { marginTop: 22, gap: 14 },
  syncStepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  syncDotDone: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse },
  syncStepLabel: { color: colors.gris, fontSize: fontSizes.md, fontWeight: '500' },
  syncStepLabelOn: { color: colors.blanc },
  syncBarWrap: { marginTop: 24 },
  syncHint: {
    color: colors.chartreuse,
    fontSize: fontSizes.xs,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 16,
  },

  // ── 4b RUN ──
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

  // ── 5 CAPTURE ──
  captureTitle: {
    color: colors.blanc,
    fontSize: fontSizes.xl,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  captureStat: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 20 },
  captureNumber: {
    color: colors.chartreuse,
    fontSize: fontSizes.heroMax,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
    lineHeight: fontSizes.heroMax,
  },
  captureUnit: { color: colors.gris, fontSize: fontSizes.md, fontWeight: '500' },
  captureSub: { color: colors.gris, fontSize: fontSizes.sm, marginTop: 8 },

  // ── 5b INVITE : lien de partage démo (une couche, pas de card-dans-card) ──
  inviteLinkLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: 18,
    marginBottom: 8,
  },
  inviteLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  inviteLinkText: {
    flex: 1,
    color: colors.blanc,
    fontSize: fontSizes.md,
    fontWeight: '500',
  },
  inviteGoal: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    marginTop: 12,
  },
});
