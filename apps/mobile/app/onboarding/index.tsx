/**
 * GRYD — ONBOARDING (AMENDEMENT-30, refondu le 21/07/2026 sur retour fondateur :
 * « trop de cliques avant la première utilisation, et ça propose pas juste de se
 * connecter quand on a déjà un compte »).
 *
 * ═══ QUATRE ÉCRANS, ET UNE PORTE DE CONNEXION DÈS LE PREMIER ═══════════════
 *
 *     hook → age → learn → account          (l'ordre vit dans content.ts)
 *      └──── « J'ai déjà un compte » ──────────→ (auth)/sign-in
 *
 * Il y en avait SEPT (hook · age · city · learn · permission · account · crew).
 * Le détail de ce qui est tombé et pourquoi est en tête de `content.ts`, à côté
 * de la liste des étapes — un seul endroit décrit le flow. En deux mots : `city`
 * et `learn` enseignaient la même chose (le plateau EST l'explication), l'écran
 * `permission` ne demandait aucune permission (la vraie demande vit au 1er GO),
 * et `crew` doublonnait un onglet permanent en contredisant §7.
 *
 * ─── LA CONNEXION VA DROIT AU BUT — LE GATE L'ATTEND LÀ-BAS (21/07/2026) ────
 * « J'ai déjà un compte » a d'abord fait un DÉTOUR par l'étape `age`, puisque
 * `requestEmailOtp` envoie `shouldCreateUser: true` : l'écran de connexion crée
 * un compte quand l'adresse est inconnue, il ne pouvait donc pas être atteint
 * sans gate. Ce détour a été retiré, parce que le gate est désormais posé DANS
 * `(auth)/sign-in` lui-même, juste devant les voies qui créent (entête de
 * sign-in.tsx). Deux gains, pas un :
 *   · un tap de moins pour celui qui revient — le motif exact du retour fondateur ;
 *   · surtout, UNE SEULE question. Avec le détour, un stockage qui ne retient
 *     rien faisait poser l'âge ICI puis À NOUVEAU sur /sign-in (l'écran suivant
 *     est un autre montage, il relit le disque). Le gate au point de création
 *     n'a pas ce défaut : il est posé là où il sert, une fois.
 * L'étape `age` reste sur le chemin de DÉCOUVERTE : elle précède la collecte GPS
 * et pré-répond au gate, qui devient alors invisible sur /sign-in.
 *
 * ─── L'APP NE MENT JAMAIS ───────────────────────────────────────────────────
 * L'onboarding est la PREMIÈRE expérience du produit : il n'a pas le droit d'y
 * fabriquer une course. Aucun run n'est mis en scène, aucune capture n'est
 * célébrée, aucun chiffre n'est attribué au joueur. L'exemple du plateau ENSEIGNE
 * la règle, étiqueté « Exemple » sur le visuel — la première capture du joueur
 * est sa VRAIE première capture. Les étapes `choose`/`sync`/`run`/`capture` de la
 * vitrine ont été SUPPRIMÉES, pas masquées.
 *
 * Corollaire pour la porte de connexion : elle n'est peinte que si un backend
 * existe (`configured`). Sans backend, `(auth)/sign-in` renvoie aussitôt vers la
 * carte — un lien « J'ai déjà un compte » qui ne connecte personne serait le
 * bouton mort de §A4, en pire (il promet une porte au lieu d'une action).
 *
 * ─── SESSION DÉJÀ OUVERTE → AUCUN DE CES ÉCRANS ─────────────────────────────
 * Un joueur connecté n'a rien à faire ici : dès que la session est là, on marque
 * l'onboarding fait et on file à la carte. La garde vit au NIVEAU DU STEPPER
 * (elle couvre les 4 étapes) et non plus dans le seul écran de compte, où elle
 * ne rattrapait que le retour d'un sign-in.
 *
 * ─── LE « PLUS TARD » DU COMPTE N'EST PAS UN CUL-DE-SAC ─────────────────────
 * `(tabs)/_layout` redirige tout visiteur sans session vers `(auth)/sign-in` dès
 * que Supabase est configuré. Un « Plus tard » y serait un mensonge : il n'est
 * donc proposé QUE sans backend (aucune garde d'auth en aval), et l'écran DIT
 * que le compte est nécessaire dans l'autre cas.
 *
 * Gating : chaque sortie marque l'état PRÉ-COMPTE persistant (onboarding/store)
 * AVANT de naviguer — y compris vers /sign-in, sinon `(tabs)/_layout` renverrait
 * le joueur fraîchement connecté vers /onboarding (rebond infini déjà payé une
 * fois). `firstCaptureDone` n'est JAMAIS posé ici : aucune capture n'a eu lieu.
 *
 * ⚠️ CONSÉQUENCE, ET SON ANTIDOTE (21/07/2026). Marquer AVANT la connexion rend
 * la porte irréversible côté flag : celui qui renonce à se connecter ne serait
 * plus jamais repoussé vers l'onboarding, et `(tabs)/_layout` le renverrait sur
 * /sign-in à chaque lancement — enfermé. Marquer APRÈS, à l'inverse, ramène le
 * rebond ci-dessus. La sortie ne vit donc pas dans le flag mais dans l'ÉCRAN :
 * `(auth)/sign-in` (et sa variante web) porte une flèche de retour vers
 * /onboarding. Toute évolution de l'un des deux doit vérifier l'autre.
 *
 * ⚠️ ET AUCUNE NAVIGATION N'ATTEND LE DISQUE. `finish()` lance la persistance
 * puis route, sans l'attendre : un AsyncStorage lent, bloqué ou absent ne peut
 * pas retenir le joueur sur un écran. L'ordre des écritures reste garanti par la
 * file sérialisée du store, pas par un `await` sur le chemin de navigation.
 *
 * Discipline (§A) : 1 écran = 1 décision, 1 CTA chartreuse contextuel (VERBES,
 * jamais « GO »/« Continuer »), texte court non tronqué, pas de card-dans-card,
 * compris en < 3 s. Copy 100 % centralisée dans content.ts. Une flèche retour
 * DISCRÈTE (gris, coin haut-gauche, ≥ 44 px, jamais un 2e CTA) rattrape un
 * mistap sans quitter le flow — absente sur le hook (STEP_PREV).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/i18n/store';
import { GOOGLE_CAPABLE, signInWithApple, signInWithGoogle, type AuthResult } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { Icon } from '../../src/ui/Icon';
import { withAlpha } from '../../src/features/map/mapStyle';
import { OnboardingAppleButton } from '../../src/features/onboarding/AppleButton';
import {
  STORAGE_UNAVAILABLE_NOTICE,
  useOnboardingState,
} from '../../src/features/onboarding/store';
import {
  ACCOUNT,
  AGE,
  HOOK,
  LEARN,
  NAV,
  STEP_EVENT_N,
  type OnboardingStep,
} from '../../src/features/onboarding/content';
import {
  HookMapBackground,
  LogoRouteMark,
  TerrainVisual,
} from '../../src/features/onboarding/visuals';

/**
 * Étape précédente pour la flèche retour discrète (§A : rattraper un mistap sans
 * quitter le flow). `hook` n'a pas de précédent → aucune flèche.
 */
const STEP_PREV: Partial<Record<OnboardingStep, OnboardingStep>> = {
  age: 'hook',
  learn: 'age',
  account: 'learn',
};

// ═══════════════════════════════════════════════════════════════════════════
// Écran
// ═══════════════════════════════════════════════════════════════════════════

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { state: onboarding, persistenceFailed, update } = useOnboardingState();
  const { session, loading: sessionLoading, configured } = useSession();
  const [step, setStep] = useState<OnboardingStep>('hook');

  // Funnel §8 : un event par étape atteinte (n dédié A-30, content.STEP_EVENT_N).
  useEffect(() => {
    track(EVENTS.onboardingStep, { n: STEP_EVENT_N[step] });
  }, [step]);

  /**
   * Sortie du flow : marque l'onboarding fait (pré-compte) + route vers `href`.
   * `firstCaptureDone` n'est PAS posé ici : aucune capture n'a eu lieu — le
   * poser était l'app qui se ment à elle-même (voir store.ts).
   *
   * Le verrou `exited` n'est pas décoratif : la sortie peut être demandée DEUX
   * fois quasi simultanément — une auth qui réussit avance l'écran à la main, et
   * l'événement Supabase SIGNED_IN arrive juste après par la garde de session.
   * Sans lui : deux `router.replace`, deux écritures concurrentes du store.
   */
  const exited = useRef(false);
  const finish = useCallback(
    (href: '/' | '/sign-in') => {
      if (exited.current) return;
      exited.current = true;
      // ⚠️ LA NAVIGATION N'ATTEND PAS LE DISQUE (21/07/2026). C'était un `await
      // update(...)` : la sortie du flow dépendait alors d'une écriture
      // AsyncStorage. Sur un stockage lent ou bloqué, le joueur restait planté
      // sur l'onboarding, sans un mot. L'ordre des écritures est garanti par la
      // file sérialisée du store — un `await` ici n'y ajoutait rien, et
      // `update()` enqueue de façon SYNCHRONE avant de rendre la main, donc le
      // démontage qui suit n'annule pas la persistance.
      void update({ onboardingDone: true });
      router.replace(href);
    },
    [update],
  );

  // Session déjà ouverte (retour d'un sign-in, ou arrivée directe sur la route) :
  // aucun de ces écrans n'a d'objet. On marque l'onboarding fait — le joueur A un
  // compte, lui refaire le flow serait exactement la friction dénoncée.
  useEffect(() => {
    if (session) finish('/');
  }, [session, finish]);

  const go = useCallback((next: OnboardingStep) => {
    haptics.light();
    setStep(next);
  }, []);

  /**
   * Déclaration d'âge. Elle est posée dans l'état AVANT toute navigation : le
   * `update` du store met `state`/`stateRef` à jour de façon synchrone, donc
   * l'étape `account` la voit immédiatement, que le disque suive ou non.
   *
   * Retour à `learn` uniquement depuis l'étape `age` : quand la question est
   * posée EN PLACE devant l'étape compte (voir le rendu), y répondre démasque
   * simplement l'étape — il n'y a nulle part où aller.
   */
  const confirmAge = useCallback(() => {
    void update({ ageConfirmed: true });
    if (step === 'age') go('learn');
  }, [step, update, go]);

  /** Flèche retour : revient à l'étape précédente (sans effet sur `hook`). */
  const back = useCallback(() => {
    const prev = STEP_PREV[step];
    if (!prev) return;
    haptics.light();
    setStep(prev);
  }, [step]);

  // ⚠️ Règle des hooks : tous les hooks sont déclarés AVANT ce return.
  // Restauration de session en cours → fond noir muet, comme (tabs)/_layout : on
  // n'affirme rien sur le joueur (« un chargement n'est pas un état vide »), et
  // surtout on ne montre pas un écran d'accueil à quelqu'un qui est déjà connecté.
  if (sessionLoading) return <View style={styles.root} />;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {step === 'hook' ? (
        <HookStep
          // Sans backend, /sign-in renvoie aussitôt vers la carte : le lien ne
          // connecterait personne. On ne le peint donc pas (§ bouton mort).
          canSignIn={configured}
          onNext={() => go('age')}
          // Droit à la connexion : c'est /sign-in qui porte le gate désormais
          // (entête). Un détour par `age` ici ferait poser la question DEUX fois
          // dès que le stockage ne retient rien.
          onSignIn={() => finish('/sign-in')}
        />
      ) : null}
      {step === 'age' ? <AgeStep onConfirm={confirmAge} /> : null}
      {/* Le terrain ET la règle : un plateau déjà occupé, une boucle qui le
          fait basculer. Rien n'est attribué au joueur — la chip « Exemple » et
          la note le disent sur le visuel lui-même. */}
      {step === 'learn' ? <LearnStep onNext={() => go('account')} /> : null}
      {/* ⚠️ LE GATE EST STRUCTUREL, PLUS SEULEMENT ORDINAL. L'étape compte crée
          un compte (Apple/Google) : elle ne s'affiche donc QUE si l'âge a été
          déclaré, au lieu de faire confiance à l'ordre des écrans. Si un jour un
          chemin l'atteint sans passer par `age`, il tombe sur la question — pas
          sur une porte de création ouverte. Aucune navigation : répondre démasque
          l'étape sur place. */}
      {step === 'account' ? (
        onboarding.ageConfirmed ? (
          <AccountStep
            persistenceFailed={persistenceFailed}
            onDone={() => finish('/')}
            onEmail={() => finish('/sign-in')}
          />
        ) : (
          <AgeStep onConfirm={confirmAge} />
        )
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

/**
 * Lien secondaire — texte gris discret, jamais un 2e CTA (§A4). `underline` le
 * réserve aux liens qui MÈNENT AILLEURS (la porte de connexion) : une sortie
 * douce (« Plus tard ») reste dans le flow et ne le porte pas.
 */
function TextLink({
  label,
  onPress,
  underline = false,
}: {
  label: string;
  onPress: () => void;
  underline?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.link, pressed && styles.pressed]}
    >
      <Text style={[styles.linkLabel, underline && styles.linkUnderline]}>{label}</Text>
    </Pressable>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 1 — HOOK / SPLASH (§1) : 1 phrase + carte animée en fond, pas de carrousel.
// C'est ICI que vit la porte de connexion : celui qui réinstalle ne doit pas
// traverser le produit pour retrouver son compte.
// ═══════════════════════════════════════════════════════════════════════════

function HookStep({
  canSignIn,
  onNext,
  onSignIn,
}: {
  canSignIn: boolean;
  onNext: () => void;
  onSignIn: () => void;
}) {
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
          {canSignIn ? <TextLink label={t(HOOK.signIn)} onPress={onSignIn} underline /> : null}
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 2 — AGE-GATE 16+ (Apple 5.1.1 / mineurs) : AVANT toute collecte GPS/compte,
// et sur les DEUX chemins — découverte comme connexion (l'OTP e-mail crée un
// compte quand l'adresse est inconnue, cf. en-tête).
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Auto-déclaration d'âge. « 16+ » = CTA chartreuse (avance) ; « moins de 16 » =
 * lien gris secondaire → écran de blocage TERMINAL (aucun chemin vers l'avant :
 * §A 1 CTA). Le blocage est un état local (remount = nouvelle tentative — une
 * auto-déclaration reste par nature contournable ; c'est le gate attendu).
 *
 * Le kicker de la variante « connexion » (`ageKickerSignIn`) a quitté cet écran
 * avec le détour de « J'ai déjà un compte » : il vit maintenant sur
 * `(auth)/sign-in`, où la question est réellement posée à qui vient se connecter.
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
        <TextLink
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
// 3 — LE TERRAIN **ET** LA RÈGLE, sur un exemple : enseigner, pas célébrer
// ═══════════════════════════════════════════════════════════════════════════

/**
 * L'écran qui remplace `city` + `learn`. Le plateau montre le quartier DÉJÀ
 * OCCUPÉ (zone contestée, zone rivale) puis la boucle qui en fait basculer une :
 * le terrain de jeu et la règle sont la même démonstration, pas deux écrans.
 *
 * Ce qui reste interdit ici (et l'était déjà) : un compteur héros « +47 zones »
 * (un chiffre attribué à qui n'a rien couru), l'haptique de succès (le corps du
 * joueur reçoit « tu as réussi »), un event de célébration dans le funnel. Restent
 * le geste, la chip « Exemple » sur le visuel, une note qui dit que ses zones à
 * lui arrivent après sa première course, et un CTA qui l'y emmène.
 *
 * L'animation est portée par le visuel (qui respecte le mouvement réduit) : cet
 * écran n'a plus d'`Animated` à piloter depuis que le compteur a disparu.
 */
function LearnStep({ onNext }: { onNext: () => void }) {
  const t = useT();
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(LEARN.kicker)}</Kicker>
        <Text style={styles.title}>{t(LEARN.title)}</Text>
        <View style={styles.boardWrap}>
          <TerrainVisual exampleLabel={t(LEARN.exampleTag)} />
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
// 4 — COMPTE : CRÉER **OU** SE CONNECTER (§6). Apple / Google / e-mail, 1 tap.
//
// ─── DEUX PORTES, DITES ─────────────────────────────────────────────────────
// L'écran s'intitulait « Crée ton compte. » et sa 3e voie « Continuer avec un
// e-mail » : deux libellés qui ne parlaient que de CRÉATION, alors que les trois
// voies savent aussi CONNECTER. Un joueur qui a déjà un compte y lisait un mur.
// Le titre nomme donc les deux portes, et `emailHint` dit ce que fait réellement
// le code OTP — il connecte si l'adresse existe, il crée sinon. On l'écrit
// plutôt que de le cacher : c'est la même règle que « l'app ne ment jamais ».
//
// « Plus tard » n'est proposé QUE s'il passe réellement : sans backend, aucune
// garde d'auth en aval, il tient sa promesse ; avec backend, il n'en tenait
// aucune (cul-de-sac /sign-in) — il disparaît, et l'écran DIT que le compte est
// nécessaire au lieu de faire semblant.
//
// ─── ON NE PEINT PLUS DE BOUTON MORT ────────────────────────────────────────
// L'écran affichait Apple ET Google sur TOUTES les plateformes : le seul fork
// était `Platform.OS === 'ios'`, qui choisissait l'APPARENCE du bouton Apple,
// jamais s'il fallait l'afficher. Deux boutons échouaient donc à coup sûr :
//   · sur WEB, `auth.web.ts` retourne `web_unsupported` pour Apple ET Google
//     (O2 + URL de redirection non allowlistée) — et le CTA chartreuse de
//     l'écran, l'UNIQUE de §A4, était précisément ce bouton mort ;
//   · sur ANDROID, ce même CTA appelait `AppleAuthentication`, module iOS-only.
//
// Corrigé une première fois par un fork de PLATEFORME — ce qui ne suffisait pas,
// et laissait le même bouton mort ailleurs (21/07/2026, 2e passe) :
//   · Google échoue AUSSI sur natif tant que `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
//     est absent (`signInWithGoogle` → `google_not_configured`) — l'état O2 du
//     projet AUJOURD'HUI. Sur Android, où il n'y a pas d'Apple, ce Google-là
//     devenait le CTA chartreuse : l'UNIQUE bouton coloré de l'écran, mort à
//     100 %. `app/(auth)/sign-in.tsx` gardait déjà ce cas (`GOOGLE_CONFIGURED`) :
//     deux écrans, le même bouton, deux règles — et c'est l'onboarding, celui
//     qui n'a pas de seconde chance, qui avait la mauvaise ;
//   · Apple ET Google commencent par `if (!supabase) return {ok:false}` : sans
//     backend (O1), les DEUX échouent quelle que soit la plateforme.
//
// La capacité réelle d'un fournisseur, c'est donc TROIS conditions, pas une :
//   plateforme (le module natif existe) + identifiant OAuth + backend Supabase.
// D'où : `CAN_*` (statique, plateforme + env inlinée au build) × `configured`
// (connu du composant) — et le JSX ne lit plus jamais `Platform.OS`.
//
// Ce que ça donne selon l'état réel :
//   · iOS + backend            → bouton système Apple, Google en secondaire s'il
//                                est configuré, lien e-mail ;
//   · Android + backend + O2   → Google = CTA chartreuse + lien e-mail ;
//   · Android + backend, O2 ouvert (état actuel) → aucun fournisseur ; l'e-mail
//                                (OTP, HTTP pur) monte en CTA chartreuse — c'est
//                                la seule porte, elle doit être LA décision ;
//   · Web + backend            → idem : e-mail seul, en CTA chartreuse ;
//   · pas de backend (O1)      → AUCUN fournisseur, AUCUN e-mail (tous
//                                retournent `supabase_not_configured`) : il ne
//                                reste que « Plus tard », qui lui passe vraiment.
//                                L'écran n'a alors PAS de CTA chartreuse — §A4
//                                en autorise un au plus, pas au moins — plutôt
//                                qu'un CTA décoratif.
// Le jour où O2 est fermé, c'est `GOOGLE_CONFIGURED` qui bascule — pas le JSX.
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ce que la PLATEFORME et la CONFIG rendent possible — constantes de module
 * (`Platform.OS` est figé au runtime, `process.env.EXPO_PUBLIC_*` est inliné au
 * build) : aucun hook, aucun re-rendu.
 *
 * ⚠️ Elles ne suffisent PAS à peindre un bouton : Apple comme Google exigent
 * en plus un client Supabase (`configured`), connu du composant seul. Voir
 * `canApple` / `canGoogle` dans AccountStep — c'est LÀ qu'est la vérité peinte.
 */
/* La visibilité vient de la MÊME source que le moteur : `GOOGLE_CAPABLE` est
   dérivé de `googleClientId()`, qui lit l'identifiant de LA plateforme courante.
   L'ancienne version lisait `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` — un identifiant
   explicitement iOS — pour décider d'afficher le bouton sur ANDROID : le seul
   CTA chartreuse de l'écran échouait alors à 100 %. Un bouton ne se peint pas
   d'après ce qui lui ressemble, mais d'après ce qui le fait marcher. */
const GOOGLE_CONFIGURED = GOOGLE_CAPABLE;
const CAN_APPLE = Platform.OS === 'ios'; // expo-apple-authentication : iOS only
// expo-auth-session : natif only (web = O2) ET client id présent (O2 encore).
const CAN_GOOGLE = Platform.OS !== 'web' && GOOGLE_CONFIGURED;

function AccountStep({
  persistenceFailed,
  onDone,
  onEmail,
}: {
  /** Le stockage local n'a pas retenu ce qui a été décidé — ça se DIT (§ ci-dessous). */
  persistenceFailed: boolean;
  onDone: () => void;
  onEmail: () => void;
}) {
  const t = useT();
  // `configured` = un backend existe → (tabs)/_layout exigera une session.
  const { configured } = useSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const accountRequired = configured;

  const run = async (fn: () => Promise<AuthResult>) => {
    // Garde de réentrance : le bouton Apple (natif) n'a pas de prop `disabled`,
    // donc un double-tap — ou Apple puis Google pendant l'attente — pourrait
    // relancer l'auth. On ignore tout appel tant qu'un run est en cours.
    if (busy) return;
    setBusy(true);
    setFailed(false);
    const result = await fn();
    setBusy(false);
    // Honnêteté (§ charte n°1) : un refus/échec n'est PAS un succès — on ne sort
    // que si l'auth réussit. On reste sur l'écran avec un message court, et la
    // voie e-mail reste offerte (Apple/Google peuvent être indisponibles — O2).
    if (result.ok) onDone();
    else setFailed(true);
  };

  /**
   * CE QUE L'ÉCRAN A LE DROIT DE PEINDRE. `CAN_*` dit ce que la plateforme et la
   * config permettent ; `configured` dit qu'il existe un client Supabase —
   * `signInWithApple` comme `signInWithGoogle` commencent par
   * `if (!supabase) return {ok:false, reason:'supabase_not_configured'}`, donc
   * sans backend les deux échouent à 100 %, iOS compris.
   */
  const canApple = CAN_APPLE && configured;
  const canGoogle = CAN_GOOGLE && configured;

  /** L'e-mail est la seule porte quand aucun fournisseur n'est utilisable. */
  const emailIsOnlyDoor = !canApple && !canGoogle;

  return (
    <View style={styles.step}>
      <View style={styles.body}>
        {/* Rien n'a encore été conquis : la copy parle au FUTUR (« les zones que
            tu prendras »), jamais d'une conquête à sauvegarder. */}
        <Kicker>{t(ACCOUNT.kicker)}</Kicker>
        <View style={styles.iconHero}>
          <View style={styles.iconHeroRing}>
            <Icon name="bouclier" size={40} color={colors.chartreuse} />
          </View>
        </View>
        <Text style={styles.title}>{t(ACCOUNT.title)}</Text>
        <Text style={styles.tagline}>
          {/* Le compte est requis : on le dit AVANT que le joueur tape « Plus
              tard » et se retrouve devant une porte fermée. */}
          {t(accountRequired ? ACCOUNT.taglineRequired : ACCOUNT.tagline)}
        </Text>
      </View>
      <View style={styles.footer}>
        {failed ? (
          <Text style={styles.authError} accessibilityRole="alert">
            {t(ACCOUNT.error)}
          </Text>
        ) : null}
        {/* Apple : iOS (le module natif existe) ET backend présent. Ailleurs,
            rien — pas de CTA générique en repli : il n'avait aucun moteur
            derrière. */}
        {canApple ? <OnboardingAppleButton onPress={() => void run(signInWithApple)} /> : null}
        {/* Google : natif + client id O2 + backend. Il devient le CTA chartreuse
            quand c'est le SEUL fournisseur utilisable (Android configuré) —
            sinon il reste secondaire, sous le bouton système Apple. */}
        {canGoogle ? (
          canApple ? (
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
            · backend + au moins un fournisseur → e-mail en LIEN ;
            · backend SANS fournisseur (web) → l'e-mail est la seule porte : il
              monte en CTA chartreuse, il n'est plus « secondaire » de rien ;
            · pas de backend → « Plus tard » passe vraiment (aucune garde en
              aval). Proposer l'e-mail ici serait un bouton qui ne peut rien. */}
        {!accountRequired ? (
          <TextLink label={t(ACCOUNT.skip)} onPress={onDone} />
        ) : emailIsOnlyDoor ? (
          <PrimaryCta label={t(ACCOUNT.email)} icon="profil" onPress={onEmail} />
        ) : (
          <TextLink label={t(ACCOUNT.email)} onPress={onEmail} underline />
        )}
        {/* Ce que fait le code, dit une fois, sous la voie qui l'envoie : « il te
            connecte si ton compte existe, il le crée sinon ». Sans cette ligne,
            le joueur qui revient devait deviner que cette porte était la sienne. */}
        {accountRequired ? <Text style={styles.hint}>{t(ACCOUNT.emailHint)}</Text> : null}
        {/* CE QU'ON N'A PAS PU RETENIR SE DIT. C'est le dernier écran du flow, et
            le seul où le joueur s'arrête assez longtemps pour le lire : l'étape
            `age` écrit puis avance aussitôt. Sans cette ligne, l'échec vivait
            dans un `catch {}` — le joueur refaisait l'onboarding à chaque
            lancement en croyant l'app cassée. Gris, jamais chartreuse : ce n'est
            pas une action, et ça n'empêche rien de fonctionner. */}
        {persistenceFailed ? (
          <Text style={styles.hint}>{t(STORAGE_UNAVAILABLE_NOTICE)}</Text>
        ) : null}
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

  // Lien secondaire (porte de connexion, « Plus tard ») — cible tactile ≥ 44 px.
  link: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingVertical: spacing.sm },
  linkLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },
  linkUnderline: { textDecorationLine: 'underline' },

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

  // ── 3 LEARN : le plateau ──
  // ⚠️ HAUTEUR PLAFONNÉE (21/07/2026). Le plateau est en `aspectRatio` 320/300 :
  // à `width: '100%'` il mesurait 327×307 sur un 375 px, et l'écran fusionné
  // (kicker + titre + plateau + légende + note + CTA) débordait de ~70 px — le
  // texte passait SOUS le CTA, personne ne scrollait puisqu'il n'y a pas de
  // ScrollView. Deux leviers ont été tirés ensemble : la copy a été RACCOURCIE
  // (catalog/onboarding : titre, légende, note) et le plateau est borné à 288 px
  // de large → 270 de haut. Un onboarding qui se scrolle est un écran de trop
  // (§A) : c'est le contenu qui rentre, pas la fenêtre qui s'allonge.
  boardWrap: {
    width: '100%',
    maxWidth: 288,
    alignSelf: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxs,
  },
  // Note d'honnêteté sous l'exemple : discrète, jamais < 12 px, gris.
  learnNote: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.45,
    marginTop: spacing.sm,
  },

  // ── 2 / 4 : hero icône ──
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

  // Précision sous la voie e-mail : ce que le code fait vraiment. Centrée,
  // lisible (≥ 12 px), gris — jamais chartreuse : ce n'est pas une action.
  hint: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    textAlign: 'center',
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
