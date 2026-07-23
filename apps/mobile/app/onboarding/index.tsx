/**
 * GRYD — ONBOARDING. Refonte « 3 cartes + profil » (demande fondateur
 * 22/07/2026), posée sur l'AMENDEMENT-30 (« sans friction ») qu'elle ne renie
 * pas : on ne reconstruit rien de ce qui marchait — l'age-gate, la porte « J'ai
 * déjà un compte », l'écran compte et son anti-bouton-mort sont REPRIS TELS
 * QUELS, seule la colonne vertébrale du parcours change.
 *
 * ═══ LE PARCOURS ════════════════════════════════════════════════════════════
 *
 *   mechanic → rivalry → age → city → profile → account
 *      │                                                  (l'ordre vit dans
 *      └──── « J'ai déjà un compte » ──────→ (auth)/sign-in     content.ts)
 *
 * L'onboarding ne fait que TROIS choses : faire comprendre le concept,
 * personnaliser un peu, entrer dans l'app. LA PREMIÈRE COURSE VIENT APRÈS,
 * jamais pendant. Il doit être utilisable ASSIS, SANS GPS, SANS courir, SANS
 * crew, SANS donner une seule permission, à une main, et il doit survivre à une
 * fermeture d'app.
 *
 * Quatre écrans de PRODUIT (les quatre demandés) : le geste, la menace, la
 * ville, le pseudo. Deux écrans qu'on ne peut pas retirer sans mentir : `age`
 * (gate légal, avant la carte ville qui peut LIRE la position) et `account` (la
 * carte exige une session dès qu'un backend existe — cf. (tabs)/_layout). Le
 * détail du raisonnement est en tête de `content.ts`, à côté de la liste des
 * étapes : un seul endroit décrit le flow.
 *
 * ─── CE QUI A ÉTÉ SUPPRIMÉ ICI, LITTÉRALEMENT SUR DEMANDE ───────────────────
 * Le splash `hook` et son décor : rues grises traversant l'écran
 * (`HookMapBackground`), petite forme G flottante (`LogoRouteMark`), point
 * chartreuse isolé, polygone perdu. Les icônes DANS les CTA (l'hexagone du CTA
 * carte, le bouclier, la conquête, le profil) : un CTA n'a pas besoin d'un
 * pictogramme pour être compris, et il en devient plus lisible. Le mot CREW du
 * premier écran : il n'apparaît qu'à la carte 2, quand il répond enfin à une
 * question que le joueur vient de se poser.
 *
 * ─── L'APP NE MENT JAMAIS ───────────────────────────────────────────────────
 * L'onboarding est la PREMIÈRE expérience du produit : il n'a pas le droit d'y
 * fabriquer une course. Les deux démonstrations animées ENSEIGNENT une règle —
 * chip « Exemple » posée sur le visuel, aucun lieu nommé, aucun chiffre attribué
 * au joueur, aucune célébration. Leur géométrie est réelle (un tracé doit être
 * crédible) mais elles ne se recentrent JAMAIS sur la ville choisie à l'écran
 * suivant : le jour où le plateau d'exemple devient « ta ville », l'exemple
 * devient un mensonge sur l'état de son monde. Et la chip « Exemple » ne migre
 * pas sur l'onglet Carte : cette surface-là dit la vérité, ou elle est vide.
 *
 * ─── AUCUNE PERMISSION N'EST DEMANDÉE PAR CE FLOW ───────────────────────────
 * Ni notifications, ni santé, ni contacts, ni photothèque (d'où l'absence de
 * choix d'avatar : « facultatif » ne veut pas dire « proposé quand même »). Le
 * GPS n'est demandé qu'à UN endroit, et seulement si le joueur touche le bouton
 * FACULTATIF « Utiliser ma position » de l'écran ville — dont la phrase
 * d'explication est affichée EN PERMANENCE juste en dessous, donc avant le tap :
 * la boîte système ne tombe jamais de nulle part. Le GPS de COURSE, lui, reste
 * annoncé par `PROFILE.gpsNote` et demandé au premier GO.
 *
 * ─── SESSION DÉJÀ OUVERTE → AUCUN DE CES ÉCRANS ─────────────────────────────
 * Un joueur connecté n'a rien à faire ici : dès que la session est là, on marque
 * l'onboarding fait et on file à la carte. La garde vit au NIVEAU DU STEPPER.
 *
 * ⚠️ AUCUNE NAVIGATION N'ATTEND LE DISQUE. `finish()` lance la persistance puis
 * route, sans l'attendre : un AsyncStorage lent, bloqué ou absent ne peut pas
 * retenir le joueur sur un écran. L'ordre des écritures reste garanti par la
 * file sérialisée du store, pas par un `await` sur le chemin de navigation.
 *
 * ⚠️ ET LA REPRISE NE TRANCHE JAMAIS SUR UN DÉFAUT. L'étape atteinte est
 * persistée pour que « quitter et reprendre » marche vraiment ; on ne la
 * restaure QUE sur un `status === 'ready'` (une lecture, pas un défaut) et
 * seulement si le joueur n'a pas déjà avancé dans CETTE session.
 *
 * Discipline (§A) : 1 écran = 1 décision, 1 CTA chartreuse maximum, texte court
 * jamais tronqué, pas de card-dans-card, compris en < 3 s. Copy 100 %
 * centralisée dans content.ts (5 langues, parité forcée par le typage).
 *
 * ⚠️ VOCABULAIRE DE CTA — arbitrage fondateur 22/07/2026. « Continuer » est
 * ADMIS sur les deux cartes pédagogiques, qui ne décident de rien : trois cartes
 * qui s'enchaînent sont UN parcours, et trois verbes différents y feraient croire
 * à trois décisions. Dès qu'il y a décision, le CTA NOMME la suite (« Choisir ma
 * ville », « Continuer avec Paris », « Entrer sur la carte »). Ne pas
 * « recorriger » ce point au prochain audit §A — et ne pas le confondre avec
 * l'override AMENDEMENT-38 (« GO »), qui ne concerne QUE le bouton d'action
 * central de l'app, jamais l'onboarding.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fontSizes, iconSizes, radii, spacing } from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { GOOGLE_CAPABLE, signInWithApple, signInWithGoogle, type AuthResult } from '../../src/lib/auth';
import { useSession } from '../../src/lib/session';
import { Icon } from '../../src/ui/Icon';
import { withAlpha } from '../../src/features/map/mapStyle';
import { resolveLocation } from '../../src/features/map/locationState';
import { CitySearch, type CityEntry } from '../../src/features/city/CityPicker';
import {
  cityEntryLabel,
  findCityEntry,
  nearestCityEntry,
} from '../../src/features/city/catalog';
import { useCityCatalog } from '../../src/features/city/useCityCatalog';
import { DISPLAY_NAME_MAX, saveProfile } from '../../src/features/social/profileStore';
import { OnboardingAppleButton } from '../../src/features/onboarding/AppleButton';
import {
  STORAGE_UNAVAILABLE_NOTICE,
  useOnboardingState,
} from '../../src/features/onboarding/store';
import { LOCATION_CAPABLE, LOCATION_PROVIDER } from '../../src/features/onboarding/locate';
import {
  ACCOUNT,
  AGE,
  BRAND,
  CITY,
  CITY_CTA_LABEL_MAX,
  MECHANIC,
  NAV,
  PROFILE,
  RIVALRY,
  SIGN_IN_DOOR,
  STEP_EVENT_N,
  isOnboardingStep,
  stepAfterRivalry,
  stepBeforeCity,
  type OnboardingStep,
} from '../../src/features/onboarding/content';
import { CaptureDemo, RivalryDemo } from '../../src/features/onboarding/visuals';

/**
 * Étape précédente pour la flèche retour discrète (§A : rattraper un mistap sans
 * quitter le flow). La première n'a pas de précédent → aucune flèche.
 */
const STEP_PREV: Partial<Record<OnboardingStep, OnboardingStep>> = {
  rivalry: 'mechanic',
  city: 'rivalry',
  profile: 'city',
  account: 'profile',
};


/**
 * Part de la HAUTEUR d'écran occupée par la démonstration animée (demande
 * fondateur : « l'illustration occupe ~35-40 % de la hauteur, pas un petit
 * polygone perdu »). Constante de RENDU, pas une règle de jeu.
 *
 * ⚠️ ELLE SE MESURE, ELLE NE SE DÉCRÈTE PAS. Il n'y a pas de ScrollView dans
 * l'onboarding (un écran d'onboarding qui se scrolle est un écran de trop, §A),
 * et l'ancien écran `learn` a déjà débordé d'environ 70 px sur un 375×667 : le
 * texte passait SOUS le CTA. Le plateau est donc borné par la hauteur ET par la
 * largeur disponible — c'est le contenu qui rentre, jamais la fenêtre qui
 * s'allonge.
 */
const DEMO_HEIGHT_RATIO = 0.38;
/** Rapport du plateau (viewBox 320×300 de `demoPhases`) : h = w × 0,9375. */
const DEMO_ASPECT = 300 / 320;


// ═══════════════════════════════════════════════════════════════════════════
// Écran
// ═══════════════════════════════════════════════════════════════════════════

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { state: onboarding, status, persistenceFailed, update } = useOnboardingState();
  const { session, loading: sessionLoading, configured } = useSession();
  const [step, setStep] = useState<OnboardingStep>('mechanic');

  // Funnel §8 : un event par étape atteinte (n dédié, content.STEP_EVENT_N).
  useEffect(() => {
    track(EVENTS.onboardingStep, { n: STEP_EVENT_N[step] });
  }, [step]);

  /**
   * QUITTER ET REPRENDRE. Le joueur a le droit de fermer l'app au milieu ; le
   * rouvrir à l'écran 1 lui ferait relire ce qu'il a compris.
   *
   * Trois garde-fous, chacun pour une faute déjà payée sur ce repo :
   *  · on ne restaure que sur `status === 'ready'` — une lecture impossible
   *    (`unavailable`) n'est PAS une réponse, et trancher une porte sur un défaut
   *    de stockage a déjà briqué l'app en boucle ;
   *  · on ne restaure JAMAIS par-dessus une décision de session (`movedRef`) :
   *    la lecture peut atterrir après un tap, elle ne doit pas l'annuler ;
   *  · une étape inconnue (nom d'une version antérieure) est ignorée : le flow a
   *    changé, on repart du début plutôt que de rendre un écran disparu.
   */
  const movedRef = useRef(false);
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || movedRef.current) return;
    if (status !== 'ready') return;
    restoredRef.current = true;
    const saved = onboarding.reachedStep;
    if (isOnboardingStep(saved)) setStep(saved);
  }, [status, onboarding.reachedStep]);

  /**
   * Sortie du flow : marque l'onboarding fait (pré-compte) + route vers `href`.
   * `firstCaptureDone` n'est PAS posé ici : aucune capture n'a eu lieu — le
   * poser était l'app qui se ment à elle-même (voir store.ts).
   *
   * Le verrou `exited` n'est pas décoratif : la sortie peut être demandée DEUX
   * fois quasi simultanément — une auth qui réussit avance l'écran à la main, et
   * l'événement Supabase SIGNED_IN arrive juste après par la garde de session.
   */
  const exited = useRef(false);
  const finish = useCallback(
    (href: '/' | '/sign-in') => {
      if (exited.current) return;
      exited.current = true;
      // ⚠️ LA NAVIGATION N'ATTEND PAS LE DISQUE : `update()` enqueue de façon
      // SYNCHRONE avant de rendre la main, donc le démontage qui suit n'annule
      // pas la persistance, et un stockage lent ne peut pas retenir le joueur.
      void update({ onboardingDone: true });
      router.replace(href);
    },
    [update],
  );

  // Session déjà ouverte (retour d'un sign-in, ou arrivée directe sur la route) :
  // aucun de ces écrans n'a d'objet.
  useEffect(() => {
    if (session) finish('/');
  }, [session, finish]);

  /** Avance/recule d'une étape, et se souvient d'où on en est. */
  const go = useCallback(
    (next: OnboardingStep) => {
      haptics.light();
      movedRef.current = true;
      setStep(next);
      void update({ reachedStep: next });
    },
    [update],
  );

  /**
   * Déclaration d'âge. Elle est posée dans l'état AVANT toute navigation : le
   * `update` du store met `state`/`stateRef` à jour de façon synchrone, donc
   * l'étape suivante la voit immédiatement, que le disque suive ou non.
   *
   * Depuis l'étape `age`, répondre avance vers la ville. Quand la question est
   * posée EN PLACE devant l'étape compte (garde structurelle, plus bas), y
   * répondre démasque simplement l'étape — il n'y a nulle part où aller.
   */
  const confirmAge = useCallback(() => {
    void update({ ageConfirmed: true });
  }, [step, update, go]);

  /**
   * La ville CHOISIE (jamais devinée, jamais préremplie par un repli).
   *
   * On persiste le LIBELLÉ COMPLET, pays inclus (« Brest (FR) ») : sans lui,
   * l'écran suivant afficherait « Brest » sans dire lequel des deux — et 71 noms
   * de villes européennes sont ambigus.
   */
  const chooseCity = useCallback(
    (city: CityEntry) => {
      void update({ cityId: city.cityId, cityName: cityEntryLabel(city) });
    },
    [update],
  );

  /**
   * Flèche retour : revient à l'étape précédente (sans effet sur la première).
   * Un âge déjà déclaré retire son écran des DEUX sens de marche — sinon le
   * retour reposerait une question à laquelle l'aller ne s'arrête plus.
   */
  const prevStep =
    step === 'city' ? stepBeforeCity() : STEP_PREV[step];
  const back = useCallback(() => {
    if (!prevStep) return;
    go(prevStep);
  }, [prevStep, go]);

  // ⚠️ Règle des hooks : tous les hooks sont déclarés AVANT ce return.
  // Restauration de session en cours → fond noir muet, comme (tabs)/_layout : on
  // n'affirme rien sur le joueur (« un chargement n'est pas un état vide »), et
  // surtout on ne montre pas un écran d'accueil à quelqu'un déjà connecté.
  if (sessionLoading) return <View style={styles.root} />;

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* En-tête commun : marque DISCRÈTE en haut à gauche (elle ne concurrence
          pas le titre) + flèche retour, dans la même rangée — deux éléments
          absolus au même coin se seraient recouverts. */}
      <StepHeader onBack={prevStep ? back : undefined} backLabel={t(NAV.back)} />

      {step === 'mechanic' ? (
        <DemoCard
          kicker={t(MECHANIC.kicker)}
          title={t(MECHANIC.title)}
          tagline={t(MECHANIC.tagline)}
          cta={t(MECHANIC.cta)}
          onNext={() => go('rivalry')}
          demo={
            <CaptureDemo
              exampleLabel={t(MECHANIC.exampleTag)}
              label={t(MECHANIC.demoLabel)}
              replayA11y={t(MECHANIC.demoReplay)}
            />
          }
          // Sans backend, /sign-in renvoie aussitôt vers la carte : le lien ne
          // connecterait personne. On ne le peint donc pas (§ bouton mort).
          // Il vit sur le PREMIER écran : celui qui réinstalle ne doit pas
          // traverser tout le produit pour retrouver son compte.
          signInLabel={configured ? t(SIGN_IN_DOOR) : undefined}
          onSignIn={() => finish('/sign-in')}
        />
      ) : null}

      {step === 'rivalry' ? (
        <DemoCard
          kicker={t(RIVALRY.kicker)}
          title={t(RIVALRY.title)}
          tagline={t(RIVALRY.tagline)}
          cta={t(RIVALRY.cta)}
          onNext={() => go(stepAfterRivalry())}
          demo={
            <RivalryDemo
              exampleLabel={t(RIVALRY.exampleTag)}
              label={t(RIVALRY.demoLabel)}
              replayA11y={t(RIVALRY.demoReplay)}
            />
          }
        />
      ) : null}


      {step === 'city' ? (
        <CityStep
          chosenId={onboarding.cityId}
          chosenName={onboarding.cityName}
          onChoose={chooseCity}
          onNext={() => go('profile')}
          ageConfirmed={onboarding.ageConfirmed}
          onConfirmAge={confirmAge}
        />
      ) : null}

      {step === 'profile' ? (
        <ProfileStep
          cityName={onboarding.cityName}
          // Un écran compte suit encore quand un backend existe : le CTA ne peut
          // pas promettre la carte tant qu'il reste un écran devant.
          accountAhead={configured}
          onNext={() => (configured ? go('account') : finish('/'))}
        />
      ) : null}

      {/* ⚠️ LE GATE EST STRUCTUREL, PLUS SEULEMENT ORDINAL. L'étape compte crée
          un compte (Apple/Google) : elle ne s'affiche donc QUE si l'âge a été
          déclaré, au lieu de faire confiance à l'ordre des écrans. Si un jour un
          chemin l'atteint sans passer par `age` — une reprise depuis le disque,
          par exemple — il tombe sur la question, pas sur une porte de création
          ouverte. Aucune navigation : répondre démasque l'étape sur place. */}
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
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Briques de layout partagées (§A : 1 titre géant, texte court, 1 CTA)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * En-tête de chaque étape : la marque, discrète, et la flèche retour.
 *
 * La marque est un MOT, plus un logo couru de 116 px au milieu de l'écran : le
 * fondateur veut qu'elle signe la page sans concurrencer le titre. La flèche est
 * grise, jamais un 2e CTA, et sa cible fait 44 px (+ hitSlop).
 */
function StepHeader({ onBack, backLabel }: { onBack?: () => void; backLabel: string }) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={12}
          onPress={onBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          {/* Chevron pointé à gauche (le tracé pointe à droite → miroir). */}
          <View style={styles.backMirror}>
            <Icon name="chevron" size={iconSizes.lg} color={colors.gris} />
          </View>
        </Pressable>
      ) : (
        <View style={styles.back} />
      )}
      <Text style={styles.brand}>{BRAND}</Text>
    </View>
  );
}

/** Sur-titre mono gris (kicker) — jamais chartreuse sur clair (ici fond noir). */
function Kicker({ children }: { children: string }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

/**
 * CTA primaire chartreuse plein, pleine largeur, 56 px, texte NOIR, sans icône
 * (§A4 : un par écran ; demande fondateur : « aucune icône inutile »).
 *
 * `disabled` n'est pas un bouton mort : il ne s'emploie que sur l'écran ville,
 * où la décision attendue est à quelques pixels au-dessus (choisir une ville) et
 * où continuer sans elle n'aurait aucun sens. L'état est annoncé aux lecteurs
 * d'écran, pas seulement peint.
 */
function PrimaryCta({
  label,
  onPress,
  a11yLabel,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  a11yLabel?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        disabled && styles.ctaDisabled,
        pressed && !disabled && styles.pressed,
      ]}
    >
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
// 1 & 2 — LES CARTES PÉDAGOGIQUES : la démonstration porte l'écran
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Carte pédagogique : kicker, titre en 2 lignes typographiques, DÉMONSTRATION,
 * une phrase, un CTA. Les deux cartes partagent ce gabarit exprès — deux écrans
 * qui se lisent pareil enseignent une SUITE ; deux gabarits différents
 * enseigneraient deux objets sans rapport.
 *
 * L'animation ne décore pas : elle démontre. Elle est tapable pour être rejouée
 * (sauf en mouvement réduit, où elle est déjà à son état final — un bouton qui
 * ne montrerait rien serait un bouton mort), et le joueur peut continuer sans
 * l'attendre : le CTA est actif dès la première image.
 */
function DemoCard({
  kicker,
  title,
  tagline,
  cta,
  demo,
  onNext,
  signInLabel,
  onSignIn,
}: {
  kicker: string;
  title: string;
  tagline: string;
  cta: string;
  demo: React.ReactNode;
  onNext: () => void;
  signInLabel?: string;
  onSignIn?: () => void;
}) {
  const { width, height } = useWindowDimensions();
  // Le plateau est borné par la HAUTEUR (≈ 38 %) ET par la largeur utile : sur
  // un écran court c'est la hauteur qui gagne, sur un écran étroit la largeur.
  const boardWidth = Math.min(
    width - 2 * (spacing.cardPadding + 4),
    (height * DEMO_HEIGHT_RATIO) / DEMO_ASPECT,
  );
  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{kicker}</Kicker>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.boardWrap, { width: boardWidth }]}>{demo}</View>
        <Text style={styles.tagline}>{tagline}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta label={cta} onPress={onNext} />
        {signInLabel && onSignIn ? (
          <TextLink label={signInLabel} onPress={onSignIn} underline />
        ) : null}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 3 — AGE-GATE 16+ (Apple 5.1.1 / mineurs) : AVANT toute collecte — et l'écran
// ville en est une, puisqu'il peut LIRE la position. Il est aussi posé sur
// l'autre chemin : (auth)/sign-in, car l'OTP e-mail crée un compte quand
// l'adresse est inconnue.
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
        <PrimaryCta label={t(AGE.confirm)} onPress={onConfirm} a11yLabel={t(AGE.confirmA11y)} />
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
// 4 — LA VILLE, CHOISIE À LA MAIN. SANS GPS.
//
// « Autorise ta localisation pour continuer » n'existe pas ici : on peut être
// assis dans un train, en vacances, loin de chez soi, ou simplement ne pas
// vouloir donner sa position à une app qu'on découvre. La position est un
// RACCOURCI, secondaire, et il n'est même pas peint là où il ne peut rien
// produire (web sans `navigator.geolocation`).
//
// AUCUNE VILLE N'EST INVENTÉE — et depuis le 23/07/2026 elles sont TOUTES là.
// L'écran ne propose plus les deux villes du seed : il consomme le SÉLECTEUR
// PARTAGÉ (`features/city/CityPicker`), donc les 7 870 villes réelles d'Europe
// du référentiel GeoNames, la même liste et la même recherche que la création de
// crew et le profil. Trois sélecteurs différents, c'était trois vérités
// différentes sur ce qu'est « ma ville ».
//
// Ce que l'écran continue de ne PAS faire : promettre qu'une ville est jouable.
// Le sélecteur marque « Ouverte » ce que le serveur a confirmé ouvert, ne marque
// RIEN tant qu'il n'a rien lu (ici, avant le compte, c'est le cas normal), et
// une position hors de toute ville le dit — jamais de repli silencieux sur
// Paris, très exactement le mensonge démonté par AMENDEMENT-47.
//
// Et il ne propose PAS d'ouvrir une ville ici, alors qu'il sait le faire
// ailleurs : ouvrir est une écriture, le serveur exige un compte, et cet écran
// vit AVANT le compte. Peindre le bouton quand même serait un bouton mort — la
// décision se prend dans le sélecteur, qui lit sa capacité réelle et se tait
// quand elle est absente.
// ═══════════════════════════════════════════════════════════════════════════

function CityStep({
  chosenId,
  chosenName,
  onChoose,
  onNext,
  ageConfirmed,
  onConfirmAge,
}: {
  chosenId: string | null;
  /**
   * Nom PERSISTÉ de la ville choisie. Il n'est pas redondant avec `chosenId` :
   * une ville de démarrage (`paris`, `lille`) n'est retrouvable dans l'index
   * qu'APRÈS une lecture de `city_zones` — impossible ici, l'écran ville vit
   * avant le compte. Sans ce nom, un joueur revenant sur cet écran avec un
   * `paris` déjà persisté verrait son CTA désactivé et resterait bloqué.
   */
  chosenName: string | null;
  onChoose: (city: CityEntry) => void;
  onNext: () => void;
  /** L'âge a-t-il déjà été déclaré ? Gouverne le SEUL geste qui lit un capteur. */
  ageConfirmed: boolean;
  onConfirmAge: () => void;
}) {
  const t = useT();
  const catalog = useCityCatalog();
  const [locBusy, setLocBusy] = useState(false);
  /** La question d'âge, posée seulement si l'on tente d'utiliser sa position. */
  const [askAge, setAskAge] = useState(false);
  /** Ce que la dernière tentative de position a produit — dit, jamais tu. */
  const [locNotice, setLocNotice] = useState<Entry | null>(null);

  const chosen = findCityEntry(catalog.index, chosenId);
  /**
   * Ce que le CTA affiche. L'index d'abord (le nom y est à jour) ; à défaut le
   * nom persisté ; à défaut rien — et alors le CTA attend, parce qu'aucune ville
   * n'a été choisie. On ne se sert JAMAIS de `chosenId` comme libellé : afficher
   * « Continuer avec 2988507 » serait pire que de ne rien afficher.
   */
  const chosenLabel = chosen?.name ?? (chosenName && chosenName.length > 0 ? chosenName : null);

  /**
   * Le CTA NOMME la ville — tant que ça TIENT. « Continuer avec
   * Villeneuve-d'Ascq » déborde la pill de hauteur fixe et se ferait rogner ;
   * dans ce cas on repasse au libellé neutre, et la ville reste nommée en entier
   * dans le sélecteur juste au-dessus (§A : rien n'est coupé, l'info est
   * déplacée). Le plafond est mesuré, pas deviné — cf. CITY_CTA_LABEL_MAX.
   */
  const namedCta = chosenLabel ? t(CITY.ctaWithCity, { city: chosenLabel }) : null;
  const ctaLabel =
    namedCta && namedCta.length <= CITY_CTA_LABEL_MAX ? namedCta : t(CITY.cta);

  /**
   * LE RACCOURCI FACULTATIF. Il PRÉSÉLECTIONNE une ville que le joueur confirme
   * ensuite avec le CTA — qui la nomme. Rien n'est décidé à sa place.
   *
   * `resolveLocation` est la séquence commune et testée de la carte : elle ne
   * demande la permission que si elle n'est pas déjà accordée, et distingue le
   * REFUS (une décision du joueur) de l'INDISPONIBLE (capteur muet, GPS coupé,
   * timeout). Deux causes, deux phrases : appeler « panne » un refus, ou
   * « refus » une panne, met sur le dos du joueur ce qu'il n'a pas fait.
   */
  const useMyLocation = useCallback(async () => {
    if (locBusy) return;
    // ⚠️ LE SEUL GESTE DE CET ÉCRAN QUI TOUCHE UN CAPTEUR. L'age-gate a quitté le
    // parcours (il vit au point de création du compte, là où il a un sens légal),
    // mais il ne disparaît PAS d'ici : la raison qui le plaçait devant la ville
    // était précisément ce raccourci. On pose donc la question À CET INSTANT,
    // jamais en écran obligatoire — « au moment utile », comme les permissions.
    // La recherche MANUELLE, elle, n'est jamais gatée : l'écran doit rester
    // utilisable assis, sans GPS et sans avoir rien déclaré.
    if (!ageConfirmed) {
      setAskAge(true);
      return;
    }
    haptics.light();
    setLocBusy(true);
    setLocNotice(null);
    const outcome = await resolveLocation(LOCATION_PROVIDER);
    setLocBusy(false);
    if (!outcome.point) {
      setLocNotice(outcome.state === 'denied' ? CITY.locationDenied : CITY.locationFailed);
      return;
    }
    // `nearestCityEntry` interroge les villes OUVERTES d'abord : sans cette
    // priorité, quelqu'un dans le 15ᵉ se verrait proposer « Paris 15 Vaugirard »
    // (le référentiel GeoNames contient les arrondissements) au lieu de Paris.
    const match = nearestCityEntry(catalog.index, outcome.point);
    if (!match) {
      setLocNotice(CITY.locationOutside);
      return;
    }
    onChoose(match);
  }, [ageConfirmed, catalog.index, locBusy, onChoose]);

  // La question d'âge prend TOUT l'écran le temps d'être répondue : une question
  // légale ne se glisse pas en encart au milieu d'un choix de ville (§A1, une
  // décision à la fois). On revient ensuite exactement là où on était.
  if (askAge) {
    return (
      <AgeStep
        onConfirm={() => {
          onConfirmAge();
          setAskAge(false);
        }}
      />
    );
  }

  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(CITY.kicker)}</Kicker>
        <Text style={styles.title}>{t(CITY.title)}</Text>
        <Text style={styles.tagline}>{t(CITY.tagline)}</Text>

        {/* LE SÉLECTEUR PARTAGÉ — même champ, même recherche, mêmes états que
            la création de crew et le profil. Il porte lui-même son placeholder,
            sa liste bornée, son « aucun résultat » et sa ligne d'état : les
            réécrire ici, c'était la deuxième vérité qu'on vient de supprimer. */}
        <CitySearch catalog={catalog} selectedId={chosenId} onSelect={onChoose} />

        {/* LE RACCOURCI — action SECONDAIRE (jamais le CTA chartreuse), et pas
            peint du tout là où aucun capteur ne peut répondre. */}
        {LOCATION_CAPABLE ? (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(CITY.useLocation)}
              accessibilityState={{ disabled: locBusy }}
              disabled={locBusy}
              onPress={() => void useMyLocation()}
              style={({ pressed }) => [styles.ghost, (pressed || locBusy) && styles.pressed]}
            >
              <Text style={styles.ghostLabel}>{t(CITY.useLocation)}</Text>
            </Pressable>
            {/* LA PRÉ-PERMISSION. Affichée EN PERMANENCE sous le bouton, donc
                lue AVANT le tap : la boîte système ne tombe jamais de nulle
                part. Un écran de plus pour dire une phrase aurait été un écran
                de plus (§A) ; une phrase invisible n'aurait rien expliqué. */}
            <Text style={styles.note}>{t(CITY.locationWhy)}</Text>
          </>
        ) : null}

        {locNotice ? (
          <Text style={styles.notice} accessibilityRole="alert">
            {t(locNotice)}
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        {/* Le CTA NOMME la ville dès qu'elle est choisie. Tant qu'aucune ne
            l'est, il attend la décision de l'écran — qui est juste au-dessus. */}
        <PrimaryCta
          label={ctaLabel}
          onPress={onNext}
          disabled={!chosenLabel}
        />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 5 — PROFIL MINIMAL : un pseudo. Rien d'autre.
//
// Ce qui n'est PAS demandé, et ne doit jamais revenir ici : photo obligatoire,
// niveau sportif, poids, taille, objectif kilométrique, fréquence, contacts,
// notifications, HealthKit, Strava, crew. Ni même un choix d'avatar : ouvrir la
// photothèque est une permission, et ce flow n'en demande aucune.
//
// La ville est RAPPELÉE, pas redemandée : elle vient d'être choisie à l'écran
// précédent, et la redemander donnerait deux décisions à un écran (§A1).
// ═══════════════════════════════════════════════════════════════════════════

function ProfileStep({
  cityName,
  accountAhead,
  onNext,
}: {
  cityName: string | null;
  accountAhead: boolean;
  onNext: () => void;
}) {
  const t = useT();
  const [pseudo, setPseudo] = useState('');

  /**
   * Le pseudo n'est PAS un péage : le CTA reste actif si le champ est vide, et
   * rien n'est alors enregistré — le joueur gardera l'identité neutre de l'app
   * et pourra la choisir dans Profil. Un onboarding qui bloque sur un champ
   * texte est exactement la friction que ce chantier retire.
   *
   * Ce qu'il fait quand il est rempli est RÉEL et vérifiable tout de suite : il
   * écrit le nom affiché du profil local (`profileStore`, le même que
   * /profil-edit), donc l'onglet Profil le montre dès l'arrivée. Ce store est
   * local tant que `user_profiles` n'est pas branché (O1) — d'où une copy qui
   * parle de ce qui est vrai (« rien n'est publié ici ») et jamais d'une
   * diffusion que le code ne tient pas encore.
   */
  const submit = useCallback(() => {
    const name = pseudo.trim();
    if (name.length > 0) void saveProfile({ displayName: name });
    onNext();
  }, [pseudo, onNext]);

  return (
    <View style={styles.step}>
      <View style={styles.body}>
        <Kicker>{t(PROFILE.kicker)}</Kicker>
        <Text style={styles.title}>{t(PROFILE.title)}</Text>
        <Text style={styles.tagline}>{t(PROFILE.tagline)}</Text>

        <Text style={styles.fieldLabel}>{t(PROFILE.pseudoLabel)}</Text>
        <TextInput
          style={styles.input}
          value={pseudo}
          onChangeText={setPseudo}
          maxLength={DISPLAY_NAME_MAX}
          autoCorrect={false}
          autoCapitalize="none"
          // Même raison que la recherche ville : « OK » valide depuis le clavier,
          // sans obliger à le refermer pour atteindre un CTA qu'il recouvre.
          returnKeyType="done"
          onSubmitEditing={submit}
          accessibilityLabel={t(PROFILE.pseudoLabel)}
        />

        {/* La ville choisie, RAPPELÉE — et seulement si elle existe : sans
            choix, on n'affiche pas une ligne vide qui laisserait croire à un
            réglage manquant. */}
        {cityName ? (
          <Text style={styles.recap}>
            {t(PROFILE.cityLabel)} · {cityName}
          </Text>
        ) : null}

        <Text style={styles.note}>{t(PROFILE.privacyNote)}</Text>
        {/* Le seul héritage de l'écran `permission` supprimé, posé au plus près
            du premier GO : le GPS s'allume au départ d'une course, jamais avant. */}
        <Text style={styles.note}>{t(PROFILE.gpsNote)}</Text>
      </View>
      <View style={styles.footer}>
        <PrimaryCta
          label={t(accountAhead ? PROFILE.ctaBeforeAccount : PROFILE.cta)}
          onPress={submit}
        />
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 6 — COMPTE : CRÉER **OU** SE CONNECTER (§6). Apple / Google / e-mail, 1 tap.
//
// ─── DEUX PORTES, DITES ─────────────────────────────────────────────────────
// L'écran s'intitulait « Crée ton compte. » et sa 3e voie « Continuer avec un
// e-mail » : deux libellés qui ne parlaient que de CRÉATION, alors que les trois
// voies savent aussi CONNECTER. Le titre nomme donc les deux portes, et
// `emailHint` dit ce que fait réellement le code OTP — il connecte si l'adresse
// existe, il crée sinon.
//
// « Plus tard » n'est proposé QUE s'il passe réellement : sans backend, aucune
// garde d'auth en aval, il tient sa promesse ; avec backend, il n'en tenait
// aucune (cul-de-sac /sign-in) — il disparaît, et l'écran DIT que le compte est
// nécessaire au lieu de faire semblant.
//
// ─── ON NE PEINT PLUS DE BOUTON MORT ────────────────────────────────────────
// La capacité réelle d'un fournisseur, c'est TROIS conditions, pas une :
//   plateforme (le module natif existe) + identifiant OAuth + backend Supabase.
// D'où : `CAN_*` (statique, plateforme + env inlinée au build) × `configured`
// (connu du composant) — et le JSX ne lit jamais `Platform.OS`.
//
// Ce que ça donne selon l'état réel :
//   · iOS + backend            → bouton système Apple, Google en secondaire s'il
//                                est configuré, lien e-mail ;
//   · Android + backend + O2   → Google = CTA chartreuse + lien e-mail ;
//   · Android/Web + backend, O2 ouvert (état actuel) → aucun fournisseur ;
//                                l'e-mail (OTP, HTTP pur) monte en CTA
//                                chartreuse — c'est la seule porte, elle doit
//                                être LA décision ;
//   · pas de backend (O1)      → AUCUN fournisseur, AUCUN e-mail (tous
//                                retournent `supabase_not_configured`) : il ne
//                                reste que « Plus tard », qui lui passe vraiment.
//                                L'écran n'a alors PAS de CTA chartreuse — §A4
//                                en autorise un au plus, pas au moins.
// Le jour où O2 est fermé, c'est `GOOGLE_CONFIGURED` qui bascule — pas le JSX.
// ═══════════════════════════════════════════════════════════════════════════

/* La visibilité vient de la MÊME source que le moteur : `GOOGLE_CAPABLE` est
   dérivé de `googleClientId()`, qui lit l'identifiant de LA plateforme courante.
   Un bouton ne se peint pas d'après ce qui lui ressemble, mais d'après ce qui le
   fait marcher. */
const GOOGLE_CONFIGURED = GOOGLE_CAPABLE;
const CAN_APPLE = Platform.OS === 'ios'; // expo-apple-authentication : iOS only
// expo-auth-session : natif only (web = O2) ET client id présent (O2 encore).
const CAN_GOOGLE = Platform.OS !== 'web' && GOOGLE_CONFIGURED;

function AccountStep({
  persistenceFailed,
  onDone,
  onEmail,
}: {
  /** Le stockage local n'a pas retenu ce qui a été décidé — ça se DIT. */
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
        {canApple ? <OnboardingAppleButton onPress={() => void run(signInWithApple)} /> : null}
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
            <PrimaryCta label={t(ACCOUNT.google)} onPress={() => void run(signInWithGoogle)} />
          )
        ) : null}
        {/* UNE seule voie secondaire (§A), et elle mène TOUJOURS quelque part. */}
        {!accountRequired ? (
          <TextLink label={t(ACCOUNT.skip)} onPress={onDone} />
        ) : emailIsOnlyDoor ? (
          <PrimaryCta label={t(ACCOUNT.email)} onPress={onEmail} />
        ) : (
          <TextLink label={t(ACCOUNT.email)} onPress={onEmail} underline />
        )}
        {accountRequired ? <Text style={styles.hint}>{t(ACCOUNT.emailHint)}</Text> : null}
        {/* CE QU'ON N'A PAS PU RETENIR SE DIT : sans cette ligne, l'échec vivait
            dans un `catch {}` — le joueur refaisait l'onboarding à chaque
            lancement en croyant l'app cassée. Gris, jamais chartreuse. */}
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

  // ── En-tête commun : marque discrète + flèche retour, sur une rangée ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.cardPadding,
    gap: spacing.xxs,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backMirror: { transform: [{ scaleX: -1 }] },
  // La marque SIGNE la page sans la dominer : petite, chartreuse sur fond noir
  // (jamais sur clair), très espacée — elle se lit comme un logo, pas un titre.
  brand: {
    color: colors.chartreuse,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    letterSpacing: 3.5,
  },

  step: { flex: 1, paddingHorizontal: spacing.cardPadding + 4 },
  // Corps : contenu principal (titre + visuel + textes) — centré verticalement.
  body: { flex: 1, justifyContent: 'center' },
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
  // Notes d'honnêteté (confidentialité, GPS, pré-permission) : discrètes, jamais
  // sous 12 px, grises — ce ne sont pas des actions.
  note: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    marginTop: spacing.xs,
  },
  // Retour d'une tentative de position : plus lisible qu'une note (c'est une
  // réponse à un geste), blanc, jamais chartreuse — ce n'est pas un gain.
  notice: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
    marginTop: spacing.sm,
    fontWeight: '500',
  },

  // CTA primaire chartreuse : pleine largeur, 56 px, texte noir, SANS icône.
  cta: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
  },
  // En attente de la décision de l'écran (ville non choisie) : atténué, et
  // annoncé comme désactivé aux lecteurs d'écran.
  ctaDisabled: { opacity: 0.35 },
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
    marginTop: spacing.sm,
  },
  ghostLabel: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500' },

  // Lien secondaire (porte de connexion, « Plus tard ») — cible ≥ 44 px.
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  linkLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '500' },
  linkUnderline: { textDecorationLine: 'underline' },

  // ── Cartes pédagogiques : le plateau de démonstration ──
  // Largeur calculée au rendu (≈ 38 % de la hauteur d'écran, bornée par la
  // largeur utile) : c'est le contenu qui rentre, pas la fenêtre qui s'allonge.
  boardWrap: { alignSelf: 'center', marginTop: spacing.md, marginBottom: spacing.xxs },

  // ── Ville : recherche + liste ──
  input: {
    height: 48,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone2,
    color: colors.blanc,
    fontSize: fontSizes.md,
  },
  listLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  cityRow: {
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    backgroundColor: colors.carbone,
  },
  // Sélection : bordure chartreuse sur fond sombre (jamais de chartreuse sur
  // clair), et le nom passe en blanc plein — l'état ne tient pas à la seule
  // couleur, il est aussi annoncé par `accessibilityState`.
  cityRowSelected: { borderColor: colors.chartreuse, backgroundColor: colors.chartreuse14 },
  cityName: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '500' },
  cityNameSelected: { fontWeight: '700' },

  // ── Profil ──
  fieldLabel: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    letterSpacing: 2,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  recap: { color: colors.blanc, fontSize: fontSizes.sm, marginTop: spacing.md },

  // ── Age / compte : hero icône ──
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
