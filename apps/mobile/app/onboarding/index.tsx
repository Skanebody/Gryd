/**
 * GRYD — ONBOARDING SANS FRICTION (AMENDEMENT-30, stratégie §6/§7). Un stepper
 * qui déplace TOUTE la friction hors de la course. Règle cardinale : « aucun
 * écran ne demande avant d'avoir donné » — on montre le terrain de jeu et on
 * explique la règle AVANT de demander quoi que ce soit ; la permission GPS
 * arrive juste avant d'aller courir, le compte et le crew ensuite, et les
 * notifications sont HORS onboarding (opt-in au 1er contexte utile, copy
 * NOTIFICATIONS conservée dans content.ts).
 *
 * ─── L'APP NE MENT JAMAIS (décision fondateur 21/07/2026) ───────────────────
 * L'onboarding est la PREMIÈRE expérience du produit : il n'a pas le droit d'y
 * fabriquer une course. L'ancien flow « importer une course » DÉTECTAIT un run
 * de 6,4 km « ce matin » depuis Apple Health (import non branché — O7/O8), puis
 * le CÉLÉBRAIT : compteur héros « +47 zones », haptique de succès + heavy, event
 * de célébration. Le joueur croyait avoir capturé 47 zones.
 *
 * Un exemple a le droit d'ENSEIGNER ; il n'a pas le droit d'être présenté comme
 * les données du joueur, ni d'être CÉLÉBRÉ comme son accomplissement. D'où un
 * flow UNIQUE — le mode vitrine est ABANDONNÉ (plus de `isShowcasePlatform`) :
 *
 *     1 hook → 1b âge (16+) → 2 le terrain de jeu (plateau ÉTIQUETÉ « Exemple »)
 *     → 2b LA RÈGLE sur un exemple (`learn` : la boucle se ferme, la zone
 *     bascule — aucun chiffre attribué au joueur, aucune haptique de succès,
 *     aucun event de célébration) → 3b permission GPS (pédagogique) → 5 compte
 *     → 6 crew → sortie.
 *     La première capture du joueur est sa VRAIE première capture.
 *
 * Les étapes `choose` / `sync` / `run` / `capture` (import mis en scène, course
 * de 3 s, moment signature « +47 zones ») ont été SUPPRIMÉES, pas masquées :
 * elles n'existaient que pour la vitrine, et la vitrine n'existe plus.
 *
 * Discipline (§A) : 1 écran = 1 décision, 1 CTA chartreuse contextuel (VERBES,
 * jamais « GO »/« Continuer »), texte court non tronqué, pas de card-dans-card,
 * compris en < 3 s, reduce motion + haptique (§5.3 : capture = success + heavy).
 * Copy 100 % centralisée dans content.ts, honnête (aucun nom de lieu tant
 * qu'aucun GPS). Une flèche retour DISCRÈTE (gris, coin haut-gauche, ≥ 44 px,
 * jamais un 2e CTA) rattrape un mistap sans quitter le flow — absente sur le
 * hook (STEP_PREV).
 *
 * ─── LE « PLUS TARD » DU COMPTE N'EST PLUS UN CUL-DE-SAC (21/07/2026) ────────
 * Le commentaire de `AccountStep` promettait « ce n'est pas un mur : Plus tard
 * laisse toujours passer sans compte ». C'était FAUX quand Supabase est
 * configuré (iPhone ET localhost) : `(tabs)/_layout` redirige alors tout
 * visiteur sans session vers `(auth)/sign-in`, écran qui n'a aucune sortie — et
 * comme `onboardingDone` est persisté, relancer l'app n'y ramenait même plus.
 * Le joueur était enfermé À VIE sur /sign-in.
 *
 * On RETIRE donc la promesse là où elle est fausse, plutôt que de la répéter :
 *   · Supabase configuré → le compte est REQUIS, l'écran le dit, et il offre
 *     une 3e voie qui MARCHE (e-mail → `(auth)/sign-in`, code OTP) pour le cas
 *     où Apple et Google sont indisponibles (O2). Aucun « Plus tard » menteur.
 *   · Supabase non configuré (dev sans backend) → aucune garde d'auth en aval :
 *     « Plus tard » passe réellement, donc il reste proposé.
 *   · Session déjà ouverte (retour dans l'onboarding après un sign-in) →
 *     l'étape s'efface : on ne redemande pas un compte qui existe.
 * Rendre la promesse VRAIE dans les deux cas demanderait de lever la garde de
 * `(tabs)/_layout` (hors de ce lot) — c'est signalé, pas fait en douce.
 *
 * Gating : à la sortie, on marque l'état PRÉ-COMPTE persistant (onboarding/store)
 * pour que (tabs)/_layout ne re-pousse plus l'onboarding. Un utilisateur DÉJÀ
 * authentifié (session réelle native) ne voit jamais cet écran (garde du layout).
 * `firstCaptureDone` n'est JAMAIS posé ici : aucune capture n'a eu lieu (store).
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
import { useSession } from '../../src/lib/session';
import { Icon } from '../../src/ui/Icon';
import { useReduceMotion } from '../../src/ui/game';
import { withAlpha } from '../../src/features/map/mapStyle';
import { OnboardingAppleButton } from '../../src/features/onboarding/AppleButton';
import { useOnboardingState } from '../../src/features/onboarding/store';
import {
  ACCOUNT,
  AGE,
  CITY,
  CREW,
  HOOK,
  LEARN,
  NAV,
  PERMISSION,
  STEP_EVENT_N,
  type OnboardingStep,
} from '../../src/features/onboarding/content';
import {
  CaptureFillVisual,
  CityBoard,
  HookMapBackground,
  LogoRouteMark,
} from '../../src/features/onboarding/visuals';

// ─── Durées de scénario (présentation, pas des règles) ───────────────────────

/** Montée du remplissage de l'exemple pédagogique (§5). */
const CAPTURE_FILL_MS = 1100;

/**
 * Étape précédente pour la flèche retour discrète (§A : rattraper un mistap sans
 * quitter le flow). `hook` n'a pas de précédent → aucune flèche. Chaîne UNIQUE
 * (la vitrine et ses branches sync/run/capture n'existent plus).
 */
const STEP_PREV: Partial<Record<OnboardingStep, OnboardingStep>> = {
  age: 'hook',
  city: 'age',
  learn: 'city',
  permission: 'learn',
  account: 'permission',
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

  /**
   * Sortie du flow : marque l'onboarding fait (pré-compte) + route vers `href`.
   * `firstCaptureDone` n'est PAS posé ici : aucune capture n'a eu lieu — le
   * poser était l'app qui se ment à elle-même (voir store.ts).
   *
   * `/sign-in` est une sortie LÉGITIME : marquer l'onboarding fait AVANT d'y
   * aller évite le rebond (`(tabs)/_layout` renverrait vers /onboarding une fois
   * connecté, faisant refaire tout le stepper à un joueur qui a un compte).
   */
  const finish = useCallback(
    async (href: '/' | '/crew-discovery' | '/crew' | '/sign-in') => {
      await update({ onboardingDone: true });
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
      {step === 'city' ? <CityStep onNext={() => go('learn')} /> : null}
      {/* On ENSEIGNE la règle sur un exemple étiqueté, puis on va la vérifier en
          courant pour de vrai (permission GPS juste après). */}
      {step === 'learn' ? (
        <LearnStep reduce={reduce} onNext={() => go('permission')} />
      ) : null}
      {/* Le GPS reste pédagogique ; aucun run n'est mis en scène derrière — le
          joueur enchaîne sur son compte, puis va courir POUR DE VRAI. */}
      {step === 'permission' ? <PermissionStep onNext={() => go('account')} /> : null}
      {step === 'account' ? (
        <AccountStep onNext={() => go('crew')} onEmail={() => void finish('/sign-in')} />
      ) : null}
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
        {/* La marque n'est pas posée : elle est COURUE. Le tracé dessine le G,
            puis le mot s'affiche — la promesse du produit avant la première
            phrase. En mouvement réduit, le logo apparaît complet, sans course. */}
        <LogoRouteMark size={116} />
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
          {/* Le plateau est un EXEMPLE (aucune géoloc obtenue à ce stade) : la
              chip le dit SUR le visuel, pas seulement dans la copy. */}
          <CityBoard exampleLabel={t(LEARN.exampleTag)} />
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
// 2b — LA RÈGLE, SUR UN EXEMPLE (produit installé) : enseigner, pas célébrer
// ═══════════════════════════════════════════════════════════════════════════

/**
 * L'exemple qui ENSEIGNE. La vraie boucle se dessine et la zone se remplit —
 * exactement ce que le joueur verra après SA course. Ce qui a été retiré par
 * rapport à l'ancien « moment signature » (et pourquoi) :
 *   · le compteur héros « +47 zones » — un chiffre attribué au joueur alors
 *     qu'il n'a rien couru ;
 *   · l'haptique success + heavy — le corps du joueur reçoit « tu as réussi » ;
 *   · l'event `celebrationViewed` — une célébration comptée dans le funnel ;
 *   · la sous-ligne « dont N en boucle · autour de toi » — des zones à lui.
 * Restent : le geste, la chip « Exemple » sur le visuel, une note qui dit que
 * ses zones à lui arrivent après sa première course, et un CTA qui l'y emmène.
 */
function LearnStep({ reduce, onNext }: { reduce: boolean; onNext: () => void }) {
  const t = useT();
  const [p, setP] = useState(reduce ? 1 : 0);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduce) {
      setP(1);
      return;
    }
    const id = anim.addListener(({ value }) => setP(value));
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

  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(LEARN.kicker)}</Kicker>
        <Text style={styles.title}>{t(LEARN.title)}</Text>
        <View style={styles.boardWrap}>
          <CaptureFillVisual p={p} exampleLabel={t(LEARN.exampleTag)} />
        </View>
        <Text style={styles.tagline}>{t(LEARN.tagline)}</Text>
        <Text style={styles.learnNote}>{t(LEARN.note)}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={t(LEARN.cta)} icon="conquete" onPress={onNext} />
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
// 5 — COMPTE APRÈS LA VALEUR (§6) : Apple / Google / e-mail, 1 tap.
//
// « Plus tard » n'est proposé QUE s'il passe réellement (voir l'en-tête du
// fichier) : sans backend configuré, il n'y a aucune garde d'auth en aval, donc
// il tient sa promesse ; avec backend, il n'en tenait aucune — il disparaît, et
// l'écran DIT que le compte est nécessaire au lieu de faire semblant.
//
// ─── ON NE PEINT PLUS DE BOUTON MORT (21/07/2026) ───────────────────────────
// L'écran affichait « Continuer avec Apple » ET « Continuer avec Google » sur
// TOUTES les plateformes : le seul fork était `Platform.OS === 'ios'`, qui
// choisissait l'APPARENCE du bouton Apple (bouton système vs CTA générique),
// jamais s'il fallait l'afficher. Deux boutons échouaient donc à coup sûr :
//   · sur WEB, `auth.web.ts` retourne `{ ok: false, reason: 'web_unsupported' }`
//     pour Apple ET Google (O2 + URL de redirection non allowlistée) — et le CTA
//     chartreuse de l'écran, l'UNIQUE de §A4, était précisément ce bouton mort ;
//   · sur ANDROID, ce même CTA chartreuse appelait `AppleAuthentication`, module
//     iOS-only (`AppleButton.tsx` renvoie d'ailleurs déjà `null` hors iOS — le
//     CTA générique était son repli, donc un bouton sans moteur derrière).
// Le tap ne menait nulle part : `run()` posait `failed`, l'écran affichait
// « Connexion impossible » et le joueur restait planté. Un CTA qui échoue
// TOUJOURS n'est pas une erreur d'exécution, c'est un mensonge d'interface.
//
// On dérive donc l'affichage de la CAPACITÉ RÉELLE de chaque fournisseur
// (CAN_APPLE / CAN_GOOGLE), au lieu de forker sur l'apparence :
//   · iOS      → bouton système Apple + Google en secondaire + lien e-mail ;
//   · Android  → Google DEVIENT le CTA chartreuse (seul fournisseur qui marche)
//                + lien e-mail ; plus aucun bouton Apple ;
//   · Web      → aucun fournisseur ; l'e-mail (OTP, HTTP pur) monte en CTA
//                chartreuse : c'est la seule porte d'entrée, elle doit être LA
//                décision de l'écran, pas un lien gris sous deux boutons morts.
// Même parti pris que `(auth)/sign-in.web.tsx` : leur ABSENCE n'est pas un
// mensonge ; un bouton qui échoue toujours en serait un. Le jour où O2 est
// fermé côté web, c'est `CAN_GOOGLE` qui bascule — pas le JSX.
//
// Reste un cas SANS AUCUNE porte : web + Supabase non configuré (dev sans
// backend). L'e-mail y échouerait aussi (`supabase_not_configured`), donc il
// n'est pas proposé : il ne reste que « Plus tard », qui lui passe vraiment
// (aucune garde d'auth en aval). L'écran n'a alors PAS de CTA chartreuse —
// §A4 en autorise un au plus, pas au moins — plutôt qu'un CTA décoratif.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fournisseurs réellement utilisables sur la plateforme courante — la SEULE
 * source de vérité de ce que l'écran peint. Constantes de module (`Platform.OS`
 * est figé au runtime) : aucun hook, aucun re-rendu, aucune branche à oublier.
 *
 * La voie e-mail, elle, ne dépend pas de la plateforme mais du BACKEND
 * (`requestEmailOtp` renvoie `supabase_not_configured` sans client Supabase) :
 * elle se décide dans le composant, où `configured` est connu.
 */
const CAN_APPLE = Platform.OS === 'ios'; // expo-apple-authentication : iOS only
const CAN_GOOGLE = Platform.OS !== 'web'; // expo-auth-session : natif only (web = O2)

function AccountStep({ onNext, onEmail }: { onNext: () => void; onEmail: () => void }) {
  const t = useT();
  // `configured` = un backend existe → (tabs)/_layout exigera une session.
  // `session` = le joueur est DÉJÀ connecté (retour dans l'onboarding après un
  // sign-in) : lui redemander un compte serait une friction absurde.
  const { configured, session } = useSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const accountRequired = configured;

  // Session déjà ouverte → l'étape n'a plus d'objet, on enchaîne. Effet (jamais
  // un return avant les hooks) : l'ordre des hooks reste inconditionnel.
  // `advanced` évite le double passage quand `run()` avance DÉJÀ à la main et
  // que l'événement Supabase SIGNED_IN arrive juste après (2 haptiques).
  const advanced = useRef(false);
  const advance = () => {
    if (advanced.current) return;
    advanced.current = true;
    onNext();
  };
  useEffect(() => {
    // `onNext`/`advance` sont recréés à chaque rendu du parent : les suivre
    // relancerait l'effet. La session est la seule condition qui compte ici.
    if (session) advance();
  }, [session]);

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
    // que si l'auth réussit. On reste sur l'écran avec un message court, et la
    // voie e-mail reste offerte (Apple/Google peuvent être indisponibles — O2).
    if (result.ok) {
      advance();
    } else {
      setFailed(true);
    }
  };
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        {/* Rien n'a encore été conquis : la copy parle au FUTUR (« les zones que
            tu prendras »), jamais d'une conquête à sauvegarder. */}
        <Kicker>{t(ACCOUNT.kickerFirstRun)}</Kicker>
        <View style={styles.iconHero}>
          <View style={styles.iconHeroRing}>
            <Icon name="bouclier" size={40} color={colors.chartreuse} />
          </View>
        </View>
        <Text style={styles.title}>{t(ACCOUNT.titleFirstRun)}</Text>
        <Text style={styles.tagline}>
          {/* Le compte est requis : on le dit AVANT que le joueur tape « Plus
              tard » et se retrouve devant une porte fermée. */}
          {t(accountRequired ? ACCOUNT.taglineRequired : ACCOUNT.taglineFirstRun)}
        </Text>
      </View>
      <View style={styles.footer}>
        {failed ? (
          <Text style={styles.authError} accessibilityRole="alert">
            {t(ACCOUNT.error)}
          </Text>
        ) : null}
        {/* Apple : UNIQUEMENT sur iOS, où le module natif existe (CAN_APPLE).
            Ailleurs, rien — pas de CTA générique en repli : il n'avait aucun
            moteur derrière. */}
        {CAN_APPLE ? <OnboardingAppleButton onPress={() => void run(signInWithApple)} /> : null}
        {/* Google : natif seulement. Il devient le CTA chartreuse quand c'est le
            SEUL fournisseur disponible (Android) — sinon il reste secondaire,
            sous le bouton système Apple qui prime sur iOS. */}
        {CAN_GOOGLE ? (
          CAN_APPLE ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(ACCOUNT.google)}
              disabled={busy}
              onPress={() => void run(signInWithGoogle)}
              style={({ pressed }) => [styles.ghost, (pressed || busy) && styles.pressed]}
            >
              <Text style={styles.ghostLabel}>{t(ACCOUNT.google)}</Text>
            </Pressable>
          ) : (
            <PrimaryCta
              label={t(ACCOUNT.google)}
              icon="profil"
              onPress={() => void run(signInWithGoogle)}
            />
          )
        ) : null}
        {/* UNE seule voie secondaire (§A), et elle mène TOUJOURS quelque part :
            · backend + au moins un fournisseur → e-mail en LIEN (3e voie réelle,
              code OTP — la seule qui marche si Apple/Google sont coupés côté
              serveur, O2) ;
            · backend SANS fournisseur (web) → l'e-mail est la seule porte : il
              monte en CTA chartreuse, il n'est plus « secondaire » de rien ;
            · pas de backend → « Plus tard » passe vraiment (aucune garde en
              aval). Proposer l'e-mail ici serait un bouton qui ne peut rien. */}
        {!accountRequired ? (
          <SkipLink label={t(ACCOUNT.skip)} onPress={onNext} />
        ) : CAN_APPLE || CAN_GOOGLE ? (
          <SkipLink label={t(ACCOUNT.email)} onPress={onEmail} />
        ) : (
          <PrimaryCta label={t(ACCOUNT.email)} icon="profil" onPress={onEmail} />
        )}
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

  // ── 2 CITY / 2b LEARN / 4 CAPTURE : le plateau ──
  boardWrap: { marginTop: spacing.lg, marginBottom: spacing.xxs },
  // Note d'honnêteté sous l'exemple (2b) : discrète, jamais < 12 px, gris.
  learnNote: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    marginTop: spacing.sm,
  },

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

  // Message d'échec d'auth (honnête) : centré, lisible (≥ 12 px), non chartreuse.
  authError: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: spacing.xxs,
  },
});
