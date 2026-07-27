/**
 * GRYD — ONBOARDING. LA SÉQUENCE DES PLANCHES E01b (fondateur, 27/07/2026).
 *
 * ═══ ORDRE DE COMPOSITION (le parcours) ═════════════════════════════════════
 *
 *   1. mechanic (E01) — LA PROMESSE            · photo plein cadre (E01Hero)
 *   2. loop     (E02) — FERME LA BOUCLE        · la boucle se dessine PUIS se remplit
 *   3. rivalry  (E03) — ON PEUT TE LA REPRENDRE · la zone coupée en deux
 *   4. crew     (E04) — PLUS FORTS EN CREW      · deux territoires qui se touchent
 *   5. location (E05) — TA POSITION CRÉE LE TRACÉ · la PRÉ-permission
 *          │
 *          └──→ (auth)/sign-in  (E06 — l'authentification, écran à part entière)
 *
 * L'ordre du flow vit dans `content.ts` : un seul endroit le décrit, et la frise
 * de points en DÉRIVE (`stepProgress`) — elle n'est jamais chiffrée dans ce JSX.
 *
 * ⚠️ CE CHANTIER RENVERSE UN ARBITRAGE ANTÉRIEUR, ET C'EST VOULU. Le 26/07 le
 * fondateur avait répondu « garder 4 cartes (AMENDEMENT-30) » à la question
 * d'ajouter la carte « FERME LA BOUCLE ». Cette réponse PRÉCÈDE la spec produit
 * (D-19, « prends le dernier »), qui définit explicitement E01→E06, et le
 * fondateur a depuis re-fourni les planches E01b en demandant que l'onboarding y
 * corresponde. Ne pas « recorriger » vers 4 cartes en invoquant A-30.
 *
 * ─── CE QUI A QUITTÉ CET ÉCRAN, ET OÙ ÇA VIT (vérifiable, pas promis) ───────
 * La planche 06 est explicite : « Aucune création de profil ici — pseudo et
 * ville arrivent au premier usage réel. » Trois blocs sortent donc du stepper :
 *   · L'AGE-GATE 16+ (Apple 5.1.1). Il n'est PAS perdu : il vit déjà, entier, au
 *     point de création du compte — `app/(auth)/sign-in.tsx` (question posée EN
 *     PLACE + blocage terminal) et son jumeau `sign-in.web.tsx`, qui importent
 *     tous deux `AGE` de `features/onboarding/content`. Il faisait doublon ici,
 *     et il y rendait menteur le CTA de l'écran précédent.
 *   · LE CHOIX DE VILLE → `app/profil-edit.tsx`, qui consomme le sélecteur
 *     PARTAGÉ `features/city/CityPicker` : les 7 870 villes réelles, la même
 *     recherche et les mêmes états qu'ici.
 *   · LE PSEUDO → même écran (champ borné par `DISPLAY_NAME_MAX`).
 * ⚠️ CE QUI RESTE À FAIRE, DIT SANS EMBELLISSEMENT : `profil-edit` écrit le
 * profil LOCAL, pas `onboarding.cityId`. `MapScreen` se servait de cette ville
 * DÉCLARÉE comme repli de CADRAGE quand aucun fix GPS n'est disponible ; ce repli
 * n'est plus alimenté. La carte garde alors sa vue monde, qui DIT la vérité
 * (« je ne sais pas encore où tu es ») au lieu de poser le joueur quelque part :
 * aucun mensonge n'est introduit, c'est un confort en moins. Le recâblage
 * appartient à l'écran E08 (`/setup/profile`) du premier usage réel.
 *
 * ─── L'APP NE MENT JAMAIS ───────────────────────────────────────────────────
 * L'onboarding est la PREMIÈRE expérience du produit : il n'a pas le droit d'y
 * fabriquer une course. Les trois démonstrations (boucle, reprise, crew)
 * ENSEIGNENT une règle — chip « Exemple » posée sur le visuel, aucun lieu nommé,
 * aucun nom de crew, aucun chiffre attribué au joueur, aucune célébration. Leur
 * géométrie est crédible mais elles ne se recentrent JAMAIS sur la ville du
 * joueur : le jour où le plateau d'exemple devient « ta ville », l'exemple ment
 * sur l'état de son monde.
 *
 * ─── UNE SEULE PERMISSION EST DEMANDÉE, ET SEULEMENT AU TAP ─────────────────
 * Ni notifications, ni santé, ni contacts, ni photothèque. Le GPS n'est demandé
 * qu'à UN endroit — le CTA de E05 — et JAMAIS à froid : les trois garanties de la
 * planche sont lues AVANT, donc la boîte système ne tombe jamais de nulle part.
 * « Plus tard » mène à la suite sans la moindre culpabilisation, et là où aucun
 * capteur ne peut répondre (web sans `navigator.geolocation`) le CTA
 * d'autorisation n'est PAS peint : un bouton qui échoue à coup sûr est un bouton
 * mort (§A4).
 *
 * ─── SESSION DÉJÀ OUVERTE → AUCUN DE CES ÉCRANS ─────────────────────────────
 * Un joueur connecté n'a rien à faire ici : dès que la session est là, on marque
 * l'onboarding fait et on file à la carte. La garde vit au NIVEAU DU STEPPER.
 *
 * ⚠️ AUCUNE NAVIGATION N'ATTEND LE DISQUE. `finish()` lance la persistance puis
 * route, sans l'attendre : un AsyncStorage lent, bloqué ou absent ne peut pas
 * retenir le joueur sur un écran. L'ordre des écritures reste garanti par la file
 * sérialisée du store, pas par un `await` sur le chemin de navigation.
 *
 * ⚠️ ET LA REPRISE NE TRANCHE JAMAIS SUR UN DÉFAUT. L'étape atteinte est persistée
 * pour que « quitter et reprendre » marche vraiment ; on ne la restaure QUE sur un
 * `status === 'ready'` (une lecture, pas un défaut) et seulement si le joueur n'a
 * pas déjà avancé dans CETTE session.
 *
 * ─── ÉCARTS ASSUMÉS AUX PLANCHES ────────────────────────────────────────────
 * · LA FLÈCHE RETOUR (coin haut-gauche, grise) n'est sur AUCUNE planche. Elle est
 *   conservée : §A demande de pouvoir rattraper un mistap sans quitter le flow, et
 *   un parcours de cinq écrans sans marche arrière fait payer cher un tap de
 *   travers. Elle n'est jamais un 2e CTA (gris, cible 44 px).
 * · PAS DE ScrollView, sur AUCUNE étape — un écran d'onboarding qui se scrolle est
 *   un écran de trop (§A). La copie est bornée par `copyFit.test.ts` plutôt que
 *   par une barre de défilement.
 * · LA MARQUE « GRYD » NE SIGNE PLUS LE HAUT DES ÉCRANS : les planches montrent
 *   un visuel plein cadre et un bloc bas, sans en-tête. Elle reste sur E01 (le
 *   logo de la photo) et sur E06.
 * · LE REGISTRE : les planches vouvoient (« votre tracé »), le dépôt tutoie
 *   partout et des tests le verrouillent. Le tutoiement gagne — deux registres
 *   dans la même app seraient pires que l'écart (cf. content.ts).
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { EdgeInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors, fontSizes, fonts, iconSizes, sizes, spacing, withAlpha } from '@klaim/shared';
import { EVENTS, track } from '../../src/lib/analytics';
import { haptics } from '../../src/lib/haptics';
import { useT } from '../../src/i18n/store';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { resolveLocation } from '../../src/features/map/locationState';
import {
  STORAGE_UNAVAILABLE_NOTICE,
  useOnboardingState,
} from '../../src/features/onboarding/store';
import { LOCATION_CAPABLE, LOCATION_PROVIDER } from '../../src/features/onboarding/locate';
import {
  CREW,
  LOCATION,
  LOOP,
  MECHANIC,
  NAV,
  ONB_SKIP,
  RIVALRY,
  STEP_EVENT_N,
  isOnboardingStep,
  stepAfter,
  stepBefore,
  stepProgress,
  type OnboardingStep,
} from '../../src/features/onboarding/content';
import {
  CrewAdjacent,
  PlancheStage,
  PrivacyRing,
  RivalrySplit,
  StreetGridBackground,
} from '../../src/features/onboarding/visuals';
import { E02Loop } from '../../src/features/onboarding/E02Loop';
import { E01Hero } from '../../src/features/onboarding/E01Hero';
import { StepDots } from '../../src/features/onboarding/StepDots';

/**
 * Titre display des planches : 40 / interligne 44, comme E01 — les cinq écrans se
 * lisent comme UNE séquence, pas comme un hero suivi de quatre cartes. Mesures de
 * COMPOSITION (pas des règles de jeu).
 */
const TITLE_LINE_HEIGHT = 44;
const TAGLINE_MAX_WIDTH = 320;

// ═══════════════════════════════════════════════════════════════════════════
// Écran
// ═══════════════════════════════════════════════════════════════════════════

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const t = useT();
  const { state: onboarding, status, persistenceFailed, update } = useOnboardingState();
  const { session, loading: sessionLoading } = useSession();
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
   *  · on ne restaure JAMAIS par-dessus une décision de session (`movedRef`) : la
   *    lecture peut atterrir après un tap, elle ne doit pas l'annuler ;
   *  · une étape inconnue (nom d'une version antérieure — `city`, `account`, …)
   *    est ignorée : le flow a changé, on repart du début plutôt que de rendre un
   *    écran disparu.
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
   * `firstCaptureDone` n'est PAS posé ici : aucune capture n'a eu lieu — le poser
   * était l'app qui se ment à elle-même (voir store.ts).
   *
   * Le verrou `exited` n'est pas décoratif : la sortie peut être demandée DEUX
   * fois quasi simultanément — la fin du flow route à la main, et l'événement
   * Supabase SIGNED_IN peut arriver juste après par la garde de session.
   */
  const exited = useRef(false);
  const finish = useCallback(
    (href: '/' | '/sign-in') => {
      if (exited.current) return;
      exited.current = true;
      // ⚠️ LA NAVIGATION N'ATTEND PAS LE DISQUE : `update()` enqueue de façon
      // SYNCHRONE avant de rendre la main, donc le démontage qui suit n'annule pas
      // la persistance, et un stockage lent ne peut pas retenir le joueur.
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

  /**
   * Avance/recule d'une étape, et se souvient d'où on en est.
   *
   * L'HAPTIQUE APPARTIENT AU CONTRÔLE, PAS AU DÉPLACEMENT : `Button` la joue déjà
   * au tap. La poser ici AUSSI produisait deux impulsions pour un seul geste. La
   * flèche retour, qui n'est pas un `Button`, joue la sienne.
   */
  const go = useCallback(
    (next: OnboardingStep) => {
      movedRef.current = true;
      setStep(next);
      void update({ reachedStep: next });
    },
    [update],
  );

  /**
   * Le CTA d'une étape : l'étape SUIVANTE s'il y en a une, la SORTIE vers E06
   * (l'authentification) sinon. Dérivé du flow — écrire « location → sign-in » à
   * la main ferait diverger ce JSX de `ONBOARDING_STEPS` au premier écran ajouté.
   */
  const advance = useCallback(
    (from: OnboardingStep) => {
      const next = stepAfter(from);
      if (next) go(next);
      else finish('/sign-in');
    },
    [go, finish],
  );

  /** Flèche retour : revient à l'étape précédente (sans effet sur la première). */
  const prevStep = stepBefore(step);
  const back = useCallback(() => {
    if (!prevStep) return;
    haptics.light();
    go(prevStep);
  }, [prevStep, go]);

  /** Où en est le joueur — DÉRIVÉ du flow, jamais compté à la main (cf. content). */
  const progress = stepProgress(step);
  const progressA11y = t(NAV.progressA11y, {
    n: progress.index + 1,
    total: progress.count,
  });

  // ⚠️ Règle des hooks : tous les hooks sont déclarés AVANT ce return.
  // Restauration de session en cours → fond noir muet, comme (tabs)/_layout : on
  // n'affirme rien sur le joueur (« un chargement n'est pas un état vide »), et
  // surtout on ne montre pas un écran d'accueil à quelqu'un déjà connecté.
  if (sessionLoading) return <View style={styles.root} />;

  // E01 « promesse » (planche) : photo plein cadre + promesse + CTA, rendu en
  // PLEIN ÉCRAN par son propre composant. Le contenu reste honnête : la photo est
  // une DA, pas une donnée de jeu ; aucune course n'est fabriquée.
  if (step === 'mechanic') {
    return (
      <E01Hero
        title={t(MECHANIC.title)}
        tagline={t(MECHANIC.tagline)}
        cta={t(MECHANIC.cta)}
        skipLabel={t(ONB_SKIP)}
        onNext={() => advance('mechanic')}
        // « Passer » ENTRE DANS L'APP : c'est (tabs)/_layout qui sait si une
        // session est exigée, pas cet écran. Router d'office vers /sign-in faisait
        // dire « Passer » à une porte de connexion.
        onSkip={() => finish('/')}
        insets={insets}
        stepIndex={progress.index}
        stepCount={progress.count}
        stepA11yLabel={progressA11y}
      />
    );
  }

  /** Le décor commun aux quatre planches suivantes — écrit UNE fois. */
  const chrome: PlancheChromeProps = {
    insets,
    skipLabel: t(ONB_SKIP),
    onSkip: () => finish('/'),
    backLabel: t(NAV.back),
    onBack: prevStep ? back : undefined,
    stepIndex: progress.index,
    stepCount: progress.count,
    stepA11yLabel: progressA11y,
  };

  if (step === 'loop') {
    return (
      <PlancheStep
        {...chrome}
        title={t(LOOP.title)}
        tagline={t(LOOP.tagline)}
        cta={t(LOOP.cta)}
        onNext={() => advance('loop')}
        analyticsId="onboarding_e02_next"
        visual={
          <PlancheStage exampleLabel={t(LOOP.exampleTag)}>
            <E02Loop />
          </PlancheStage>
        }
      />
    );
  }

  if (step === 'rivalry') {
    return (
      <PlancheStep
        {...chrome}
        title={t(RIVALRY.title)}
        tagline={t(RIVALRY.tagline)}
        cta={t(RIVALRY.cta)}
        onNext={() => advance('rivalry')}
        analyticsId="onboarding_e03_next"
        visual={
          <PlancheStage exampleLabel={t(RIVALRY.exampleTag)}>
            <RivalrySplit takenLabel={t(RIVALRY.takenLabel)} />
          </PlancheStage>
        }
      />
    );
  }

  if (step === 'crew') {
    return (
      <PlancheStep
        {...chrome}
        title={t(CREW.title)}
        tagline={t(CREW.tagline)}
        cta={t(CREW.cta)}
        onNext={() => advance('crew')}
        analyticsId="onboarding_e04_next"
        visual={
          <PlancheStage exampleLabel={t(CREW.exampleTag)}>
            <CrewAdjacent />
          </PlancheStage>
        }
      />
    );
  }

  return (
    <LocationStep
      {...chrome}
      persistenceFailed={persistenceFailed}
      onDone={() => advance('location')}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LE GABARIT DES PLANCHES — le visuel porte l'écran, le bloc bas le nomme
// ═══════════════════════════════════════════════════════════════════════════

interface PlancheChromeProps {
  insets: EdgeInsets;
  skipLabel: string;
  onSkip: () => void;
  backLabel: string;
  onBack?: () => void;
  stepIndex: number;
  stepCount: number;
  stepA11yLabel: string;
}

/**
 * Le décor commun : la GRILLE DE RUES plein cadre (planche), « Passer » en haut à
 * droite (planche), la flèche retour en haut à gauche (écart assumé, cf. l'entête)
 * et la frise de progression sous le CTA — comme sur E01.
 *
 * Les cinq écrans partagent ce gabarit EXPRÈS : cinq écrans qui se lisent pareil
 * enseignent une SUITE ; cinq gabarits différents enseigneraient cinq objets sans
 * rapport.
 */
function PlancheChrome({
  insets,
  skipLabel,
  onSkip,
  backLabel,
  onBack,
  stepIndex,
  stepCount,
  stepA11yLabel,
  children,
  footer,
}: PlancheChromeProps & { children: ReactNode; footer: ReactNode }) {
  return (
    <View style={styles.root}>
      <StreetGridBackground />

      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={backLabel}
          hitSlop={12}
          onPress={onBack}
          style={({ pressed }) => [
            styles.back,
            { top: insets.top + spacing.sm },
            pressed && styles.pressed,
          ]}
        >
          {/* Chevron pointé à gauche (le tracé pointe à droite → miroir). */}
          <View style={styles.backMirror}>
            <Icon name="chevron" size={iconSizes.lg} color={colors.gris} />
          </View>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={skipLabel}
        onPress={onSkip}
        hitSlop={12}
        style={({ pressed }) => [
          styles.skip,
          { top: insets.top + spacing.sm },
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.skipLabel}>{skipLabel}</Text>
      </Pressable>

      {/* LA SCÈNE : le visuel, centré dans l'espace qui reste au-dessus du bloc
          bas. `flex: 1` + centrage = c'est le contenu qui rentre, jamais la
          fenêtre qui s'allonge (il n'y a pas de ScrollView ici). */}
      <View style={[styles.scene, { paddingTop: insets.top + sizes.touchTarget }]}>{children}</View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        {footer}
        <StepDots
          index={stepIndex}
          count={stepCount}
          a11yLabel={stepA11yLabel}
          style={styles.dots}
        />
      </View>
    </View>
  );
}

/** Une planche pédagogique : visuel → titre → sous-titre → CTA unique → frise. */
function PlancheStep({
  visual,
  title,
  tagline,
  cta,
  onNext,
  analyticsId,
  ...chrome
}: PlancheChromeProps & {
  visual: ReactNode;
  title: string;
  tagline: string;
  cta: string;
  onNext: () => void;
  analyticsId: string;
}) {
  return (
    <PlancheChrome
      {...chrome}
      footer={
        <>
          {/* `adjustsFontSizeToFit` : le titre RÉTRÉCIT si une langue dépasse la
              largeur — jamais une 3e ligne, jamais un débordement sur un écran
              sans scroll (§A : aucun texte coupé). */}
          <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
            {title}
          </Text>
          <Text style={styles.tagline}>{tagline}</Text>
          {/* L'UNIQUE CTA chartreuse de l'écran (§A4). */}
          <Button
            label={cta}
            onPress={onNext}
            variant="primary"
            size="lg"
            analyticsId={analyticsId}
          />
        </>
      }
    >
      {visual}
    </PlancheChrome>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// E05 — LA PRÉ-PERMISSION DE LOCALISATION
//
// ⚠️ RÈGLE CAPITALE (planche + spec E05) : LE DIALOGUE SYSTÈME NE S'OUVRE QU'AU
// TAP SUR LE CTA, jamais au montage. Les trois garanties sont donc à l'écran
// AVANT le geste — la boîte système ne tombe jamais de nulle part.
//
// « Plus tard » mène à la suite, et la carte fonctionnera en lecture seule. AUCUNE
// culpabilisation : le libellé est neutre, aucune phrase ne dit au joueur ce qu'il
// « rate », et le lien est gris — jamais un 2e CTA (§A4).
//
// ET LÀ OÙ AUCUN CAPTEUR NE PEUT RÉPONDRE (web sans `navigator.geolocation`), le
// CTA d'autorisation n'est PAS peint : l'écran DIT pourquoi et le parcours
// continue avec un CTA neutre. L'absence d'un bouton n'est pas un mensonge ; un
// bouton qui échoue à coup sûr en est un.
// ═══════════════════════════════════════════════════════════════════════════

function LocationStep({
  persistenceFailed,
  onDone,
  ...chrome
}: PlancheChromeProps & {
  /** Le stockage local n'a pas retenu ce qui a été décidé — ça se DIT. */
  persistenceFailed: boolean;
  onDone: () => void;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const doneRef = useRef(false);

  /**
   * LE SEUL GESTE DE TOUT L'ONBOARDING QUI TOUCHE UN CAPTEUR.
   *
   * `resolveLocation` est la séquence commune et testée de la carte : elle ne
   * demande la permission que si elle n'est pas déjà accordée, et distingue le
   * REFUS (une décision du joueur) de l'INDISPONIBLE (capteur muet, GPS coupé,
   * timeout). On avance dans les TROIS cas — accordé, refusé, muet — parce que cet
   * écran ne fait pas de la position une condition d'entrée : la carte sait déjà
   * raconter chacun de ces états (`map/locationState`, matrice testée), et les
   * répéter ici produirait deux récits pour une seule situation (§A).
   */
  const ask = useCallback(async () => {
    if (busy || doneRef.current) return;
    setBusy(true);
    await resolveLocation(LOCATION_PROVIDER);
    doneRef.current = true;
    setBusy(false);
    onDone();
  }, [busy, onDone]);

  return (
    <PlancheChrome
      {...chrome}
      footer={
        <>
          <Text style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
            {t(LOCATION.title)}
          </Text>

          {/* LES TROIS GARANTIES : une par ligne, coche + filet séparateur
              (planche). Elles ne promettent rien que le code ne tienne. */}
          <View style={styles.guarantees}>
            {LOCATION.guarantees.map((entry, i) => (
              <View key={i} style={[styles.guarantee, i > 0 && styles.guaranteeDivided]}>
                <CheckMark />
                {/* Aucun `numberOfLines` : la ligne s'enroule plutôt que d'être
                    coupée — §A interdit le texte tronqué, pas le retour à la ligne. */}
                <Text style={styles.guaranteeLabel}>{t(entry)}</Text>
              </View>
            ))}
          </View>

          {LOCATION_CAPABLE ? (
            <>
              <Button
                label={t(LOCATION.cta)}
                onPress={() => void ask()}
                variant="primary"
                size="lg"
                loading={busy}
                analyticsId="onboarding_e05_allow"
              />
              {/* Sortie douce — elle mène à la suite, exactement comme le CTA. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(LOCATION.later)}
                onPress={onDone}
                style={({ pressed }) => [styles.link, pressed && styles.pressed]}
              >
                <Text style={styles.linkLabel}>{t(LOCATION.later)}</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.note}>{t(LOCATION.unavailable)}</Text>
              <Button
                label={t(LOCATION.continueCta)}
                onPress={onDone}
                variant="primary"
                size="lg"
                analyticsId="onboarding_e05_continue"
              />
            </>
          )}

          {/* CE QU'ON N'A PAS PU RETENIR SE DIT : sans cette ligne, l'échec vivait
              dans un `catch {}` — le joueur refaisait l'onboarding à chaque
              lancement en croyant l'app cassée. Gris, jamais chartreuse. */}
          {persistenceFailed ? (
            <Text style={styles.note}>{t(STORAGE_UNAVAILABLE_NOTICE)}</Text>
          ) : null}
        </>
      }
    >
      <PrivacyRing />
    </PlancheChrome>
  );
}

/**
 * La COCHE des trois garanties.
 *
 * ⚠️ ELLE N'EST PAS UNE ICÔNE DU SYSTÈME, ET C'EST UN MANQUE ASSUMÉ : la famille
 * `packages/shared/src/icons.ts` n'a pas de `coche` autonome (le seul chevron de
 * validation vit DANS le tracé du badge). Ajouter un glyphe à la famille se fait
 * dans `packages/shared`, hors du périmètre de ce chantier — c'est signalé en
 * handoff. En attendant, le tracé vit ici, aux mêmes proportions que la famille
 * (viewBox 24, trait 2, terminaisons rondes) et sur un token de couleur.
 */
function CheckMark() {
  return (
    <Svg width={iconSizes.md} height={iconSizes.md} viewBox="0 0 24 24">
      <Path
        d="M5 12.5l4.5 4.5L19 7"
        stroke={colors.chartreuse}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.carbonImmersive },

  // « Passer » (planche, haut-droit) et la flèche retour (écart assumé,
  // haut-gauche) : deux liens GRIS, jamais des CTA, cible ≥ 44 px avec hitSlop.
  skip: {
    position: 'absolute',
    right: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    zIndex: 2,
  },
  skipLabel: { color: colors.gris, fontFamily: fonts.textMedium, fontSize: fontSizes.sm },
  back: {
    position: 'absolute',
    left: spacing.xs,
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  backMirror: { transform: [{ scaleX: -1 }] },

  // La scène : le visuel centré dans l'espace laissé par le bloc bas. Le padding
  // haut dégage la rangée « Passer » / retour — un visuel qui passerait dessous
  // rendrait les deux illisibles.
  scene: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  // Le bloc bas des planches : titre → sous-titre → CTA → frise.
  bottom: { paddingHorizontal: spacing.md, gap: spacing.sm },
  // Titre display de la planche : 40 / interligne 44 / -0,01em (identique à E01).
  title: {
    color: colors.blanc,
    fontFamily: fonts.display, // Inter Tight 800 — la famille porte la graisse
    fontSize: fontSizes.xxl,
    letterSpacing: -0.4,
    lineHeight: TITLE_LINE_HEIGHT,
  },
  tagline: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    lineHeight: fontSizes.md * 1.4,
    maxWidth: TAGLINE_MAX_WIDTH,
  },
  // Frise SOUS le CTA (planche) — centrée.
  dots: { alignSelf: 'center' },

  // ── E05 : les trois garanties ──
  // Filet SÉPARATEUR entre les lignes (planche), jamais un cadre : une card autour
  // de trois lignes serait la card-in-card interdite par §A.
  guarantees: { marginTop: spacing.xxs },
  guarantee: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  guaranteeDivided: { borderTopWidth: 1, borderTopColor: withAlpha(colors.blanc, 0.1) },
  guaranteeLabel: {
    flex: 1,
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.sm,
    lineHeight: fontSizes.sm * 1.4,
  },

  // Lien secondaire (« Plus tard ») — cible ≥ 44 px, gris, jamais un 2e CTA.
  link: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: sizes.touchTarget,
  },
  linkLabel: { color: colors.gris, fontFamily: fonts.textMedium, fontSize: fontSizes.sm },

  // Notes d'honnêteté (capteur absent, stockage muet) : discrètes, jamais sous
  // 12 px, grises — ce ne sont pas des actions.
  note: {
    color: colors.gris,
    fontFamily: fonts.text,
    fontSize: fontSizes.xs,
    lineHeight: fontSizes.xs * 1.45,
    textAlign: 'center',
  },

  pressed: { opacity: 0.85 },
});
