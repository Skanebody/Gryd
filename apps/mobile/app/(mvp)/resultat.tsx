/**
 * GRYD — LE RÉSULTAT : le pic émotionnel, ou le refus qui n'accuse pas (M7).
 *
 * ─── CE QUE CET ÉCRAN NE FAIT PAS ───────────────────────────────────────────
 * Il ne DÉCIDE rien. `outcome.resultView` (pur, testé) dit ce qu'on a le droit
 * d'afficher de l'issue reçue. Ce fichier ne fait que peindre.
 *
 * ─── CE QU'IL FAIT EN PLUS, ET QUI N'EST PAS UN JUGEMENT ────────────────────
 * Il ENVOIE — parce que l'écran de course ne le fait plus. `sendRun` y était
 * attendu AVANT la navigation, sans timeout ni borne : un coureur à bout de
 * souffle restait devant un bouton grisé pendant que le réseau ramait. Cet
 * écran s'ouvre donc dans l'état `sending`, relit la trace du disque (écrite
 * juste avant la navigation, MÊME `runId`) et remplace l'attente par le verdict
 * quand il arrive. Le joueur, lui, voit tout de suite sa course terminée et ses
 * stats — et peut partir quand il veut : l'envoi ne le retient pas.
 *
 * Sur `lost`, il peut REJOUER cet envoi. Rien n'est réinterprété : la même
 * charge, le même `clientRunId`, la même fonction — c'est `resultView` qui
 * tranche ce qu'on affiche de la réponse.
 *
 * ─── LES DEUX FAUTES QUI COÛTERAIENT LE PLUS CHER ICI ───────────────────────
 * 1. Annoncer « aucun territoire » sur une course PAS ENCORE ENVOYÉE, ou dont
 *    l'envoi est EN ROUTE. Personne n'a rien refusé : ce serait inventer un
 *    verdict, et décourager quelqu'un qui a peut-être tout gagné. L'attente est
 *    une issue à part entière — et il y en a deux, qui ne disent pas la même
 *    chose (`pending` dort dans la file, `sending` est en vol).
 * 2. Annoncer une aire qui SURESTIME le gain (`interiorPartial`). C'est le
 *    chiffre que le joueur retient, annonce à son crew et met dans une carte de
 *    partage : un mensonge chiffré voyage plus loin que tous les autres.
 *
 * ─── L19 — LES STATS SONT TOUJOURS LÀ ───────────────────────────────────────
 * Distance et durée viennent de la trace LOCALE : elles existent avant l'envoi,
 * survivent à un refus et à l'absence de réseau. Ce ne sont pas une consolation
 * qu'on ajoute après un « non » — ce sont des faits mesurés, affichés dans
 * TOUTES les issues (`showsLocalStats`, invariant testé).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { colors, fonts, fontSizes, iconSizes, radii, spacing, typography } from '@klaim/shared';
import { resultView, type ResultView, type SendState } from '../../src/mvp/run/outcome';
import { formatChrono } from '../../src/mvp/run/trace';
import { buildRunPayload, type RunPayload } from '../../src/mvp/run/payload';
import { sendRun } from '../../src/mvp/run/sendRun';
import { clearActiveRun, clearCurrentRun, loadActiveRun } from '../../src/lib/runStore';
import { heroArea } from '../../src/mvp/ui/area';
import { retourCarte } from '../../src/mvp/ui/nav';
import {
  CELEBRATION_MS,
  FILL,
  GAIN,
  OUTLINE,
  OUTLINE_SCALE,
} from '../../src/mvp/ui/celebration';
import { Glyph } from '../../src/mvp/ui/Glyph';
import { SkeletonBlock, SkeletonGroup } from '../../src/mvp/ui/Skeleton';
import { TerritoryMark } from '../../src/mvp/ui/TerritoryMark';
import { ShareCard, SHARE_CARD_W } from '../../src/mvp/ui/ShareCard';
import {
  estFichierPartageable,
  shareTracePath,
  type SharePoint,
} from '../../src/mvp/share/trace';
import { useAnnonce } from '../../src/mvp/ui/announce';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';
import { resultHaptic } from '../../src/mvp/run/feedback';
import { haptics } from '../../src/lib/haptics';

const TOUCH_TARGET_PT = 44;

/**
 * Interligne du corps, en MULTIPLE de la taille de police.
 *
 * ⚠️ Pas dans `StyleSheet.create` : un `lineHeight` numérique ne suit PAS
 * Dynamic Type alors que `fontSize` le suit. Figé à 24 pt, il faisait se
 * recouvrir les lignes dès AX3 (~2,35× : un corps à ~38 pt dans un interligne
 * de 24) — ici, sur la phrase qui explique un refus, c'est-à-dire exactement le
 * texte qu'il ne faut pas rendre illisible (L19).
 */
const INTERLIGNE = 1.5;

/**
 * Le rôle typo R6 (`typography.stat`), rendu ÉTALABLE dans un `StyleSheet`.
 *
 * Il porte `fontVariant: ['tabular-nums']` — indispensable ici : le chiffre héros
 * ne s'affiche plus, il se COMPTE (voir `aireComptee`), et sans chasse fixe les
 * digits changent de largeur à chaque incrément. Le nombre danserait pendant
 * toute la montée, sur le seul écran que le joueur regarde fixement.
 *
 * ⚠️ `{ ...typography.stat }` ne compile pas tel quel : le token est figé par
 * `as const`, donc son `fontVariant` est un tuple EN LECTURE SEULE là où
 * `TextStyle` attend un tableau mutable. On recopie le tableau.
 */
const STAT = { ...typography.stat, fontVariant: [...typography.stat.fontVariant] };

/**
 * Type du fichier remis à la feuille de partage. PAS des nombres magiques : ce
 * sont les identifiants normalisés d'un PNG sur chaque plateforme — `mimeType`
 * pour l'`Intent` Android, `UTI` pour iOS. Sans eux, le système devine d'après
 * l'extension et certaines cibles refusent le fichier.
 */
const MIME_PNG = 'image/png';
const UTI_PNG = 'public.png';

/**
 * ─── L'ÉTAT DU PARTAGE (L13) ────────────────────────────────────────────────
 *
 * Cinq valeurs, parce que « pas de bouton » et « bouton qui ne marchera pas »
 * ne sont pas la même chose :
 *   · `inconnu`     — on ne sait pas encore si la plateforme sait partager, ni
 *                     si la card a pu être gravée. AUCUN bouton : promettre un
 *                     partage avant de savoir, c'est le bouton mort que la
 *                     constitution interdit.
 *   · `impossible`  — pas de feuille de partage, pas de tracé publiable, ou la
 *                     capture a échoué. Aucun bouton non plus, et RIEN n'est
 *                     dit : personne n'a rien promis, il n'y a pas d'échec à
 *                     annoncer.
 *   · `pret`        — la card EXISTE, sur le disque, prête à partir. Le lien
 *                     apparaît, et le tap n'attend rien.
 *   · `envoi`       — la feuille s'ouvre. `busy` à l'oreille, atténué à l'œil.
 *   · `echec`       — le partage a été refusé par le système APRÈS un tap.
 *                     Là, une promesse a été faite : le lien reste, et il DIT
 *                     qu'il faut réessayer.
 */
type EtatPartage =
  | { readonly kind: 'inconnu' }
  | { readonly kind: 'impossible' }
  | { readonly kind: 'pret'; readonly uri: string }
  | { readonly kind: 'envoi'; readonly uri: string }
  | { readonly kind: 'echec'; readonly uri: string };

/**
 * L'issue de l'envoi transite par l'URL, sérialisée.
 *
 * ⚠️ Une valeur illisible (lien profond bricolé, navigation rejouée) ne devient
 * PAS un refus : elle devient `lost`, la seule issue qui dit honnêtement « on
 * ne sait pas ce qu'il est advenu de ta course ». Se tromper vers un refus
 * annoncerait au joueur une décision que personne n'a prise.
 */
function issueDepuisParam(brut: string | string[] | undefined): SendState {
  const texte = Array.isArray(brut) ? brut[0] : brut;
  if (typeof texte !== 'string' || texte.length === 0) return { kind: 'lost' };
  try {
    const parsed = JSON.parse(texte) as SendState;
    if (parsed.kind === 'sending' || parsed.kind === 'queued' || parsed.kind === 'lost') {
      return { kind: parsed.kind };
    }
    if (parsed.kind === 'answered' && typeof parsed.verdict === 'object' && parsed.verdict !== null) {
      return parsed;
    }
    return { kind: 'lost' };
  } catch {
    return { kind: 'lost' };
  }
}

/**
 * La trace du disque → la charge à envoyer. `null` = rien d'envoyable.
 *
 * ⚠️ AUCUN IDENTIFIANT N'EST FABRIQUÉ. La trace attend sur le disque avec SON
 * `runId` (écrit par l'écran de course juste avant de naviguer), et c'est celui
 * d'un premier envoi comme d'un renvoi : la clé d'idempotence D14 garantit
 * qu'une course ne peut pas compter deux fois. En générer un ici créerait le
 * doublon que cette clé existe pour empêcher.
 *
 * `buildRunPayload` est le MÊME constructeur que celui de la course : deux
 * façons de fabriquer la charge finiraient par diverger, et l'écart ne se
 * verrait qu'au 400 du serveur.
 */
async function chargeDuDisque(): Promise<RunPayload | null> {
  const stocke = await loadActiveRun();
  if (stocke === null) return null;
  return buildRunPayload({
    clientRunId: stocke.runId,
    startedAt: stocke.startedAt,
    points: stocke.fixes.map((f) => ({
      lat: f.lat,
      lng: f.lng,
      ts: f.ts,
      accuracy: f.accuracy,
    })),
    activity: stocke.activity,
  });
}

function nombre(v: string | string[] | undefined): number {
  const t = Array.isArray(v) ? v[0] : v;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function Resultat() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { fontScale } = useWindowDimensions();
  const interligne = { lineHeight: Math.round(fontSizes.md * INTERLIGNE * fontScale) };
  // Même raison que `INTERLIGNE` : le rôle `statUnit` porte un `lineHeight`
  // NUMÉRIQUE (18), qui ne suit pas Dynamic Type. Laissé tel quel, il rognait
  // l'unité dès les grandes tailles — on le remet à l'échelle du corps réel.
  const ligneUnite = { lineHeight: Math.round(typography.statUnit.lineHeight * fontScale) };
  const params = useLocalSearchParams();
  /**
   * L'issue est un ÉTAT, plus une simple lecture de l'URL — parce qu'un RENVOI
   * réussi (voir `renvoyer`) en produit une NOUVELLE, et que la remplacer par
   * une navigation ne rejouerait ni l'haptique ni la célébration.
   *
   * ⚠️ L'écran ne DÉCIDE toujours rien : il ne fait que garder la dernière issue
   * qu'un envoi a réellement rendue. `resultView` reste seul juge de ce qui
   * s'affiche.
   */
  const [issue, setIssue] = useState<SendState>(() => issueDepuisParam(params.issue));
  const vue: ResultView = resultView(issue);
  const distanceM = nombre(params.distanceM);
  const dureeMs = nombre(params.dureeMs);

  useEffect(() => {
    screen('run_result');
  }, []);

  useEffect(() => {
    // L7 — le pic émotionnel. Un refus, lui, ne vibre pas : ajouter un coup de
    // semonce physique à une nouvelle décevante serait accuser (L19), et ça
    // vaut aussi pour ce que l'app fait SENTIR.
    // Sur `vue.kind` et non au montage : après un renvoi, la nouvelle issue est
    // un événement de jeu à part entière — la première capture d'un joueur peut
    // arriver ici, et elle doit se SENTIR (L6).
    const quoi = resultHaptic(vue.kind);
    if (quoi !== null) haptics[quoi]();
  }, [vue.kind]);

  /** L'aire FINALE, celle que le serveur a réellement écrite. */
  const aireFinaleM2 = vue.kind === 'captured' ? vue.areaM2 : null;
  const aire = heroArea(aireFinaleM2);

  /**
   * LA CÉLÉBRATION (L7) — et ses deux garde-fous.
   *
   * · REDUCE MOTION (L15) : si le système le demande, TOUT est visible
   *   immédiatement. Une animation qu'on ne peut pas refuser est une animation
   *   subie, et pour certains c'est un malaise physique.
   * · SKIPPABLE (L7, mot pour mot) : un tap n'importe où la termine sur-le-champ.
   *   Le pic émotionnel ne doit jamais devenir une attente.
   *
   * Elle ne joue QUE sur une capture : animer un refus mettrait en scène une
   * déception.
   */
  const fete = vue.kind === 'captured' || vue.kind === 'takenNoArea';
  const anim = useRef(new Animated.Value(fete ? 0 : 1)).current;
  /**
   * Reduce Motion — TROIS valeurs, pas deux. `null` = « le système n'a pas
   * encore répondu ». Un booléen à `false` par défaut ferait démarrer
   * l'animation pendant la lecture de la préférence, c'est-à-dire animer chez
   * quelqu'un qui a précisément demandé qu'on ne l'anime pas.
   *
   * Une lecture qui ÉCHOUE vaut `true` : on renonce à l'animation plutôt que de
   * l'imposer sans savoir.
   */
  const [reduit, setReduit] = useState<boolean | null>(null);

  useEffect(() => {
    let vivant = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        if (vivant) setReduit(r);
      })
      .catch(() => {
        if (vivant) setReduit(true);
      });
    return () => {
      vivant = false;
    };
  }, []);

  /**
   * LE DÉCOMPTE — « les valeurs ne se téléportent jamais » (HIG, game-feel).
   *
   * Le gain apparaissait en FONDU : le nombre était déjà écrit derrière une
   * opacité nulle, puis révélé. Sur le pic émotionnel du produit, un fondu est
   * le minimum ; c'est le décompte qui transforme un affichage en récompense.
   *
   * ─── TROIS GARDE-FOUS ─────────────────────────────────────────────────────
   * · MÊME horloge que le reste : on écoute `anim`, on n'ouvre pas un second
   *   timer. Deux horloges finiraient par se désynchroniser, et le chiffre
   *   atterrirait avant ou après la marque.
   * · JAMAIS « 0 » : la valeur intermédiaire repasse par `heroArea`, qui rend
   *   `null` sous 1 m². Tant que le décompte n'a pas atteint le premier entier,
   *   il n'y a rien à peindre — et surtout pas le zéro nu que la constitution
   *   interdit. C'est la MÊME garde que pour la valeur finale, pas une seconde
   *   règle écrite à côté.
   * · REDUCE MOTION : la valeur finale est peinte d'emblée, sans compter (voir
   *   la célébration, juste en dessous). Un tap qui passe l'animation
   *   (`passer`) fait de même, par `setValue(1)`.
   *
   * `p >= 1 ? 1` n'est pas une coquetterie : sans cette borne, un dernier
   * rappel à 0,999 arrondirait 64 m² à 63 — un chiffre FAUX comme mot de la fin.
   */
  const [aireComptee, setAireComptee] = useState<number | null>(null);

  useEffect(() => {
    if (aireFinaleM2 === null) {
      setAireComptee(null);
      return;
    }
    const ecoute = anim.addListener(({ value }) => {
      const brut = (value - GAIN.from) / (GAIN.to - GAIN.from);
      const p = brut <= 0 ? 0 : brut >= 1 ? 1 : brut;
      setAireComptee(aireFinaleM2 * p);
    });
    return () => anim.removeListener(ecoute);
  }, [anim, aireFinaleM2]);

  /** Le chiffre PEINT à cet instant. `null` = rien de vrai à écrire encore. */
  const aireEnCours = heroArea(aireComptee);

  /**
   * ⚠️ Cette célébration se (re)JOUE quand la vue DEVIENT une fête, pas
   * seulement au montage : après un renvoi réussi (constat ②), l'écran passe de
   * `lost` à `captured` sans changer de route. Câblée au montage seulement, la
   * séquence ne repartait pas — et comme le chiffre est désormais piloté par
   * cette même valeur, le joueur voyait la marque… sans aucun nombre.
   */
  useEffect(() => {
    if (reduit === null) return; // on ne sait pas encore : on n'anime pas.
    if (!fete || reduit) {
      anim.setValue(1);
      /**
       * GARDE-FOU REDUCE MOTION, ÉCRIT PLUTÔT QU'ESPÉRÉ.
       *
       * `setValue` notifie ses écouteurs, donc le décompte ci-dessous atterrit
       * en général tout seul sur la valeur finale. « En général » ne suffit pas :
       * quand la vue devient une capture APRÈS un renvoi, React démonte les
       * effets dont les dépendances ont changé AVANT de rejouer leurs corps —
       * l'écouteur est donc déjà retiré à l'instant de ce `setValue`, et le
       * joueur verrait la marque sans aucun chiffre. On peint la valeur finale
       * ici, explicitement : c'est ce que la loi demande (valeur finale d'emblée,
       * sans compter), et ça ne dépend d'aucun ordre.
       */
      setAireComptee(aireFinaleM2);
      return;
    }
    anim.setValue(0);
    const sequence = Animated.timing(anim, {
      toValue: 1,
      duration: CELEBRATION_MS,
      easing: Easing.out(Easing.cubic),
      // ⚠️ `false` OBLIGATOIRE : cette valeur pilote aussi `fillOpacity` et
      // `strokeOpacity`, qui sont des props SVG et non des styles — elles ne
      // passent pas par le pilote natif. Mélanger les deux pilotes sur une
      // MÊME valeur lève une erreur à l'exécution.
      useNativeDriver: false,
    });
    sequence.start();
    return () => sequence.stop();
  }, [anim, aireFinaleM2, fete, reduit]);

  const passer = () => anim.setValue(1);

  // Les trois temps de L7 (voir `mvp/ui/celebration.ts`). `extrapolate: 'clamp'`
  // partout :
  // sans lui, une interpolation déborde de ses bornes et rend des opacités
  // supérieures à 1 ou négatives — invisibles au test, visibles à l'écran.
  // Les bornes viennent de `celebration.ts` — PAS écrites ici. Trois
  // `interpolate` côte à côte se chevauchent sans qu'aucune relecture ne le
  // voie, et une capture d'écran ne le montre pas non plus (son aller-retour
  // dépasse la durée de la séquence). Là-bas, l'ordre se TESTE.
  const opaciteContour = anim.interpolate({
    inputRange: [OUTLINE.from, OUTLINE.to],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const echelleMarque = anim.interpolate({
    inputRange: [...OUTLINE_SCALE.input],
    outputRange: [...OUTLINE_SCALE.output],
    extrapolate: 'clamp',
  });
  const opaciteRemplissage = anim.interpolate({
    inputRange: [FILL.from, FILL.to],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });
  const opaciteChiffre = anim.interpolate({
    inputRange: [GAIN.from, GAIN.to],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  /**
   * ─── LE RENVOI, ET SEULEMENT SUR `lost` ───────────────────────────────────
   *
   * `lost` est le seul vrai échec : l'envoi a échoué ET la file d'envoi a
   * refusé. L'écran le DISAIT (« ta course est encore sur cet appareil ») sans
   * rien proposer pour la faire partir — un état d'erreur sans issue, ce que le
   * HIG (« Error States : Retry action ») refuse.
   *
   * ⚠️ AUCUN IDENTIFIANT N'EST FABRIQUÉ. C'est précisément parce que la course
   * est `lost` que le buffer `runStore` n'a PAS été purgé : la trace y attend
   * avec SON `runId`, celui du premier essai — voir `chargeDuDisque`, qui porte
   * cette règle pour les deux envois.
   *
   * ⚠️ ET AUCUN BOUTON MORT : le lien n'apparaît que si une charge ENVOYABLE
   * a réellement été relue du disque. Une trace absente, illisible ou trop
   * courte ne donne pas un bouton qui échouerait au tap.
   */
  const chargeRef = useRef<RunPayload | null>(null);
  const monteRef = useRef(true);
  useEffect(() => {
    return () => {
      monteRef.current = false;
    };
  }, []);
  const [renvoi, setRenvoi] = useState<'inconnu' | 'indisponible' | 'possible' | 'envoi'>(
    'inconnu',
  );

  /**
   * ─── LES POINTS, RETENUS AVANT LA PURGE ───────────────────────────────────
   *
   * La card de partage a besoin du TRACÉ, et le tracé n'existe qu'ici : dès que
   * l'envoi aboutit, `resoudre` efface le buffer du disque (`clearActiveRun`),
   * parce qu'une course en sûreté côté serveur n'a plus à traîner sur
   * l'appareil. Après ça, plus rien n'est relisible — et c'est très bien ainsi.
   *
   * Cet état retient donc les points À L'INSTANT où la charge est relue, avant
   * l'envoi. Ce n'est PAS une seconde source de vérité : c'est la même charge
   * que `chargeRef`, tenue par une valeur d'état parce qu'un `ref` ne
   * redéclenche aucun rendu — et qu'il faut bien que la card se dessine.
   *
   * ⚠️ Conséquence assumée : une issue reçue directement par l'URL (navigation
   * rejouée, lien profond) n'a JAMAIS de tracé, puisque aucune relecture n'a eu
   * lieu. Il n'y a alors pas de bouton de partage. C'est la seule réponse
   * honnête : on ne fabrique pas une forme qu'on n'a pas.
   */
  const [tracePartage, setTracePartage] = useState<readonly SharePoint[] | null>(null);

  /**
   * Le SEUL endroit qui pose la charge relue — ref (pour le renvoi) et points
   * (pour la card) à la fois. Deux affectations séparées finiraient par
   * diverger : un chemin qui met à jour l'une sans l'autre donnerait un bouton
   * de partage sans tracé, ou un tracé sans renvoi possible.
   */
  const retenirCharge = useCallback((charge: RunPayload | null) => {
    chargeRef.current = charge;
    setTracePartage(charge === null ? null : charge.points);
  }, []);

  useEffect(() => {
    if (vue.kind !== 'lost') return;
    let vivant = true;
    chargeDuDisque()
      .then((charge) => {
        if (!vivant) return;
        retenirCharge(charge);
        setRenvoi(charge === null ? 'indisponible' : 'possible');
      })
      .catch(() => {
        if (vivant) setRenvoi('indisponible');
      });
    return () => {
      vivant = false;
    };
  }, [vue.kind, retenirCharge]);

  /**
   * Envoyer, puis POSER L'ISSUE. Le seul endroit qui écrit `issue`.
   *
   * Partagé par le premier envoi (état `sending`) et par le renvoi manuel : ce
   * sont le même geste, et deux copies auraient fini par purger le buffer selon
   * deux règles différentes.
   */
  const resoudre = useCallback(async (charge: RunPayload) => {
    const suite = await sendRun(charge);
    // Le buffer n'est effacé QUE si la course est en sûreté — répondue ou mise
    // en file. Sur un `lost`, ce buffer reste le dernier filet, et il porte la
    // charge que le renvoi relira.
    if (suite.kind !== 'lost') {
      await Promise.all([clearActiveRun(), clearCurrentRun()]);
    }
    if (!monteRef.current) return;
    // Un second échec REDONNE l'action : la charge est toujours là, et un
    // renvoi qui laisserait le lien figé sur « en cours » se lirait en panne.
    setRenvoi(suite.kind === 'lost' ? 'possible' : 'indisponible');
    setIssue(suite);
  }, []);

  /**
   * ─── LE PREMIER ENVOI, DEPUIS ICI ─────────────────────────────────────────
   *
   * Il avait lieu dans l'écran de course, AWAITÉ avant la navigation. `sendRun`
   * n'a ni timeout ni `AbortController` : le joueur restait donc bloqué sur la
   * course, bouton grisé, pour une durée que rien ne bornait. Ici, il voit sa
   * course terminée et ses stats pendant que l'envoi se fait — et il peut
   * partir : rien ne le retient.
   *
   * ⚠️ UNE SEULE FOIS (`envoiLanceRef`). L'effet se rejoue à chaque changement
   * de `vue.kind` ; sans ce garde-fou, un remontage renverrait la course.
   */
  const envoiLanceRef = useRef(false);
  useEffect(() => {
    if (vue.kind !== 'sending' || envoiLanceRef.current) return;
    envoiLanceRef.current = true;
    void (async () => {
      const charge = await chargeDuDisque().catch(() => null);
      // ⚠️ AVANT `resoudre`, qui purgera le buffer : c'est la seule fenêtre où
      // les points existent encore (voir `tracePartage`).
      retenirCharge(charge);
      if (charge === null) {
        /**
         * Rien d'envoyable sur le disque, alors que l'écran de course venait
         * d'y écrire la trace complète : le stockage est hors service. Dans ce
         * monde-là, la mise en file (même stockage) échouerait aussi — `lost`
         * est donc exactement ce qui se serait passé, et c'est la seule issue
         * qui dit « on ne sait pas ce qu'il est advenu de ta course ». On ne
         * prononce surtout pas de verdict de territoire.
         */
        if (monteRef.current) setIssue({ kind: 'lost' });
        return;
      }
      if (monteRef.current) setRenvoi('envoi');
      await resoudre(charge);
    })();
  }, [vue.kind, resoudre, retenirCharge]);

  const renvoyer = useCallback(async () => {
    const charge = chargeRef.current;
    if (charge === null || renvoi === 'envoi') return;
    setRenvoi('envoi');
    haptics.light();
    await resoudre(charge);
  }, [renvoi, resoudre]);

  /**
   * LA PHRASE DE L'ISSUE — un `switch` EXHAUSTIF, et pas une chaîne de ternaires.
   *
   * ⚠️ La chaîne se terminait par `: t(C.resLost)`, un fourre-tout parfaitement
   * typé : toute issue non traitée y tombait et s'affichait « ta course est
   * encore sur cet appareil ». C'est exactement le défaut que la couture a
   * attrapé sur la carte (`homeAction` rendait une action que l'écran ne
   * peignait pas) — ici il aurait été pire, parce que le fourre-tout AFFIRME
   * quelque chose de faux au lieu de ne rien afficher.
   *
   * Le `never` final le rend impossible : ajouter une issue à `ResultView` sans
   * lui écrire sa phrase ne compile plus.
   */
  const phraseDeLIssue = (v: ResultView): string | null => {
    switch (v.kind) {
      // La capture parle d'elle-même par son chiffre : une phrase de plus
      // volerait l'attention au seul nombre qui compte (L12). Sauf si GRYD a
      // refermé à la place du joueur — ça, il faut le DIRE.
      case 'captured':
        return v.assisted ? t(C.resAssisted) : null;
      case 'takenNoArea':
        return t(C.resTakenNoArea);
      case 'missing':
        return t(C.verifyGap, { m: String(v.missingM) });
      case 'noLoop':
        return t(C.resNoLoop);
      case 'refused':
        return v.reason === 'narrow' ? t(C.resNarrow) : t(C.resRefused);
      case 'sending':
        return t(C.resSending);
      case 'pending':
        return t(C.resPending);
      case 'lost':
        // « Ta course est encore sur cet appareil » n'est vrai QUE si la relecture
        // du disque a rendu une charge. `indisponible` = rien n'est resté
        // (stockage HS, buffer purgé) : on le dit tel quel, sans consolation
        // fausse — c'est le refus inexpliqué qui a tué Stride.
        return renvoi === 'indisponible' ? t(C.resLostNoTrace) : t(C.resLost);
      default: {
        const jamais: never = v;
        return jamais;
      }
    }
  };
  const phrase = phraseDeLIssue(vue);

  /**
   * L'ANNONCE DU VERDICT, à l'oreille (L15 par la bande).
   *
   * VoiceOver lit l'écran à l'arrivée : il entendait donc « Envoi en cours »,
   * puis plus rien — le verdict remplace le texte SANS navigation, et aucun
   * lecteur d'écran n'apprend qu'il est arrivé. Quelqu'un qui explore au doigt
   * resterait persuadé que ça charge encore.
   *
   * `useAnnonce` ne dit rien de la PREMIÈRE valeur (elle vient d'être lue) et
   * pousse chaque changement. Sur une capture non assistée, `phrase` est `null`
   * — c'est le nombre qui porte la nouvelle : on annonce donc le libellé du
   * chiffre héros, celui-là même que la zone porte déjà.
   */
  const aAnnoncer =
    vue.kind === 'captured' && aire !== null ? t(C.a11yAreaTaken, { n: aire }) : phrase;
  useAnnonce(aAnnoncer);

  // La distance vient de la trace locale : `formatKm` refuse le zéro nu, donc
  // une course sans mètre parcouru n'affiche pas « 0,00 km ».
  const km = distanceM > 0 ? (Math.round(distanceM / 10) / 100).toFixed(2).replace('.', ',') : null;
  const chrono = formatChrono(dureeMs);

  /**
   * ═══ LE PARTAGE EN UN TAP (L13) ═══════════════════════════════════════════
   *
   * ─── QUAND LA CARD EXISTE, ET QUAND ELLE N'EXISTE PAS ────────────────────
   * UNIQUEMENT sur `captured`. Trois raisons, et chacune suffirait :
   *   · on ne partage pas une déception (refus, boucle manquée) ;
   *   · on ne partage pas une course que le serveur n'a pas tranchée
   *     (`sending`, `pending`, `lost`) : ce serait annoncer un territoire que
   *     personne n'a accordé ;
   *   · `takenNoArea` est EXCLU alors qu'il s'agit bien d'une prise — parce que
   *     son aire n'est justement PAS connue. La card est faite de trois
   *     chiffres dont les m² sont le héros, et `shareText` les réclame
   *     (`{m2}`). Il faudrait donc soit inventer le nombre (« un mensonge
   *     chiffré voyage plus loin que tous les autres », en-tête de cet écran),
   *     soit publier une card amputée du seul chiffre qui fait sa forme. Ni
   *     l'un ni l'autre : pas de card. Le jour où une phrase de partage sans
   *     m² existera dans le catalogue, ce cas pourra rouvrir.
   *
   * Et il faut TOUT le reste : les points retenus avant la purge, un tracé qui
   * survive au masquage des extrémités, la distance et le chrono. Chaque
   * élément manquant retire le bouton — jamais ne le remplit d'un repli.
   */
  // `useMemo` : `shareTracePath` fait tourner un Douglas-Peucker sur toute la
  // trace. Recalculé à chaque rendu, il repasserait sur ~2 000 points à chaque
  // image du décompte — pendant la seule animation que le joueur regarde.
  const cheminTrace = useMemo(
    () => (tracePartage === null ? null : shareTracePath(tracePartage)),
    [tracePartage],
  );
  const cardPossible =
    vue.kind === 'captured' && aire !== null && km !== null && cheminTrace !== null;

  const [partage, setPartage] = useState<EtatPartage>({ kind: 'inconnu' });
  const carteRef = useRef<View>(null);
  const captureLanceeRef = useRef(false);

  /**
   * LA CAPACITÉ RÉELLE DE LA PLATEFORME, DEMANDÉE — jamais supposée.
   *
   * TROIS valeurs, pas deux — même raison que `reduit` plus haut : `null` = « le
   * système n'a pas encore répondu ». Un booléen à `false` par défaut ferait
   * graver la card avant de savoir si elle a la moindre chance de partir ;
   * un booléen à `true` peindrait un lien qui n'ouvrirait rien.
   *
   * `isAvailableAsync` est faux sur le web de bureau (pas de `navigator.share`)
   * et peut l'être ailleurs — un lien peint sans cette réponse serait le bouton
   * mort que la constitution interdit : « l'affichage se dérive de la capacité
   * RÉELLE de la plateforme ». Une lecture qui ÉCHOUE vaut `false` : on retire
   * le lien plutôt que de promettre sans savoir.
   */
  const [partageDispo, setPartageDispo] = useState<boolean | null>(null);

  useEffect(() => {
    if (!cardPossible || partageDispo !== null) return;
    let vivant = true;
    const repondre = (dispo: boolean): void => {
      if (!vivant) return;
      setPartageDispo(dispo);
      // Pas de feuille de partage sur cette plateforme : l'état le DIT, plutôt
      // que de rester « inconnu » pour toujours. Aucun message pour autant —
      // rien n'avait été promis.
      if (!dispo) setPartage({ kind: 'impossible' });
    };
    Sharing.isAvailableAsync()
      .then(repondre)
      .catch(() => repondre(false));
    return () => {
      vivant = false;
    };
  }, [cardPossible, partageDispo]);

  /**
   * LA GRAVURE, PENDANT QUE LE JOUEUR REGARDE SA CÉLÉBRATION.
   *
   * L13 dit « card pré-générée pendant l'écran de résultat » : c'est ici que ça
   * se joue. La card est montée hors écran, `onLayout` dit qu'elle a une
   * taille, et on la rasterise tout de suite. Au tap, il ne reste que
   * l'ouverture de la feuille — donc aucune attente à habiller.
   *
   * ⚠️ `useRenderInContext` : la card est HORS VIEWPORT, et la stratégie iOS par
   * défaut (`drawViewHierarchyInRect`) capture ce qui est à l'écran — elle
   * rendrait une image vide. `renderInContext` dessine le calque, qu'il soit
   * visible ou non. `collapsable={false}` joue le même rôle côté Android, où
   * une vue sans style propre est aplatie hors de l'arbre natif.
   *
   * ⚠️ Aucune option `quality` : elle n'est lue que par les formats à PERTE
   * (jpg), et le PNG est sans perte. La passer donnerait l'illusion d'un
   * réglage qui n'agit pas.
   */
  const graver = useCallback(async () => {
    if (captureLanceeRef.current) return;
    captureLanceeRef.current = true;
    try {
      const uri = await captureRef(carteRef, {
        format: 'png',
        result: 'tmpfile',
        useRenderInContext: true,
      });
      if (!monteRef.current) return;
      // Une capture WEB rend une `data:` URI, que la feuille de partage
      // refusera : ce n'est pas une card, c'est un bouton mort en devenir.
      setPartage(estFichierPartageable(uri) ? { kind: 'pret', uri } : { kind: 'impossible' });
    } catch {
      // La card n'a pas pu être gravée. Rien n'avait été promis : pas de lien,
      // et surtout pas de message d'erreur pour une action que personne n'a
      // demandée.
      if (monteRef.current) setPartage({ kind: 'impossible' });
    }
  }, []);

  /**
   * LE TEXTE QUI ACCOMPAGNE — dans la seule mesure où la plateforme le permet.
   *
   * ⚠️ `expo-sharing` partage un FICHIER, pas un message : ses options sont
   * `mimeType` (Android), `UTI` (iOS) et `dialogTitle` (Android et web). Il n'y
   * a AUCUN champ de texte remis à l'app cible — sur iOS, la phrase ne peut
   * donc pas voyager avec l'image, et rien ici ne prétend le contraire. Le
   * chiffre, lui, est GRAVÉ DANS LA CARD : c'est ce qui fait que le partage dit
   * quelque chose sur toutes les plateformes.
   */
  const textePartage = aire === null ? null : t(C.shareText, { m2: aire });

  const partager = useCallback(async () => {
    if (partage.kind !== 'pret' && partage.kind !== 'echec') return;
    if (textePartage === null) return;
    const uri = partage.uri;
    setPartage({ kind: 'envoi', uri });
    haptics.light();
    try {
      await Sharing.shareAsync(uri, {
        mimeType: MIME_PNG,
        UTI: UTI_PNG,
        dialogTitle: textePartage,
      });
      if (monteRef.current) setPartage({ kind: 'pret', uri });
    } catch {
      // L6 — l'échec se SENT. Et il se voit : le lien change de libellé plutôt
      // que de disparaître, parce qu'ici une promesse avait été faite.
      haptics.error();
      if (monteRef.current) setPartage({ kind: 'echec', uri });
    }
  }, [partage, textePartage]);

  const partageVisible =
    partage.kind === 'pret' || partage.kind === 'envoi' || partage.kind === 'echec';
  // ⚠️ CLÉ MANQUANTE, ASSUMÉE : le catalogue MVP n'a aucune phrase pour « le
  // partage n'a pas abouti ». En employer une d'un autre domaine (`mapFailed`,
  // `signInFailed`) affirmerait quelque chose de faux — la faute exacte que le
  // `switch` de `phraseDeLIssue` existe pour empêcher. En attendant qu'une clé
  // soit écrite, l'échec se dit par ce que l'app A DÉJÀ : le glyphe d'échec et
  // un libellé qui redevient « Réessayer ».
  const libellePartage = partage.kind === 'echec' ? t(C.shareFailed) : t(C.ctaShare);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      {/* Toute la scène est tapable : c'est ce qui rend la célébration
          SKIPPABLE sans ajouter un bouton « passer » qui volerait l'unique
          action primaire de l'écran (L2). */}
      <Pressable
        style={styles.centre}
        onPress={passer}
        // ⚠️ `passer` ARRÊTE L'ANIMATION, il ne navigue pas. Cette zone
        // s'annonçait « VOIR LA CARTE » — le libellé exact du vrai bouton, 40 pt
        // plus bas. Un utilisateur VoiceOver la rencontre EN PREMIER, tape,
        // n'entend rien changer, et croit avoir navigué. Deux contrôles
        // homonymes dont un seul tient sa promesse : c'est le même mensonge que
        // partout ailleurs, transposé au canal auditif.
        accessibilityRole={fete && reduit === false ? 'button' : 'none'}
        accessibilityLabel={fete && reduit === false ? t(C.ctaSkipAnimation) : undefined}
      >
        {/* L'objet signature n'apparaît QUE sur une prise : le montrer sur un
            refus ferait miroiter ce qu'on vient de dire non obtenu. */}
        {fete ? (
          <Animated.View style={{ transform: [{ scale: echelleMarque }] }}>
            <TerritoryMark
              size={140}
              strokeOpacity={opaciteContour}
              fillOpacity={opaciteRemplissage}
            />
          </Animated.View>
        ) : null}

        {aire !== null && aireEnCours !== null ? (
          // UN SEUL élément d'accessibilité pour le pic du jeu : le titre, le
          // nombre et l'unité sont trois `Text` à l'œil (échelle typographique),
          // et c'était trois arrêts à l'oreille — « Territoire pris » … « 64 » …
          // « m² ». L'unité est dite en toutes lettres dans le label : « m² » se
          // prononce « m » chez la plupart des synthèses, et 64 m² devenait
          // 64 mètres.
          //
          // ⚠️ LE LABEL DIT `aire`, PAS `aireEnCours` : à l'oreille, un décompte
          // n'existe pas — VoiceOver annonce le chiffre FINAL, jamais une valeur
          // de passage qui serait, elle, un chiffre faux.
          <Animated.View
            style={[styles.bloc, { opacity: opaciteChiffre }]}
            accessible
            accessibilityLabel={t(C.a11yAreaTaken, { n: aire })}
          >
            <Text style={styles.titre}>{t(C.resTakenTitle)}</Text>
            <View style={styles.ligne}>
              <Text style={styles.hero}>{aireEnCours}</Text>
              <Text style={[styles.unite, ligneUnite]}>{t(C.unitM2)}</Text>
            </View>
          </Animated.View>
        ) : null}

        {phrase !== null ? <Text style={[styles.phrase, interligne]}>{phrase}</Text> : null}

        {/* L'ATTENTE SE VOIT, ET ELLE NE PROMET RIEN.
            Une ligne pulsée, à la place et à la hauteur de la PHRASE de verdict
            qui va la remplacer — la forme du contenu à venir, jamais sa valeur
            (L14, et l'en-tête de `Skeleton.tsx`).
            ⚠️ CE N'EST PAS UN SKELETON DE CÉLÉBRATION : ni la marque de
            territoire, ni le bloc du chiffre héros ne sont esquissés. Les
            dessiner en avance ferait miroiter une prise que personne n'a encore
            accordée — la faute n°1 de cet écran, prise par l'autre bout.
            DÉCORATIVE : `SkeletonGroup` la masque aux lecteurs d'écran, qui
            entendent la phrase juste au-dessus puis le verdict (`useAnnonce`). */}
        {vue.kind === 'sending' ? (
          <SkeletonGroup>
            <SkeletonBlock width="60%" height={fontSizes.md} />
          </SkeletonGroup>
        ) : null}

        {/* L19 — TOUJOURS présentes, quelle que soit l'issue. */}
        {km !== null ? (
          <Text style={styles.stats}>{t(C.resStats, { km, duree: chrono })}</Text>
        ) : null}
      </Pressable>

      {/* ═══ LA CARD, GRAVÉE HORS ÉCRAN ═══════════════════════════════════════
          Elle est montée le temps d'être mesurée puis rasterisée, et disparaît
          ensuite : `partage` quitte `inconnu`, la condition tombe. Le joueur ne
          la voit jamais à l'écran — il la découvre dans la feuille de partage.

          `left: -SHARE_CARD_W * 2` la sort du viewport SANS l'aplatir : une
          opacité nulle, elle, ferait capturer une image transparente sur iOS.
          `pointerEvents="none"` pour que rien de tout ça n'intercepte le tap
          qui passe la célébration. */}
      {cardPossible && cheminTrace !== null && aire !== null && km !== null &&
      partageDispo === true && partage.kind === 'inconnu' ? (
        <View style={styles.horsEcran} pointerEvents="none">
          <View
            ref={carteRef}
            collapsable={false}
            onLayout={() => {
              void graver();
            }}
          >
            <ShareCard path={cheminTrace} area={aire} km={km} chrono={chrono} />
          </View>
        </View>
      ) : null}

      {/* L2 — « Voir la carte » RESTE l'action primaire. Le partage est un
          LIEN : il prolonge la joie, il ne dispute pas la sortie de l'écran.
          Il n'existe que quand la card est réellement sur le disque et que la
          plateforme sait ouvrir une feuille de partage — voir `EtatPartage`.
          L15 — pas de glyphe sur l'état normal (le vocabulaire de `Glyph` n'en
          a pas pour le partage) : le libellé porte le sens seul, ce qui est la
          forme la plus sûre. Sur l'échec, le glyphe s'ajoute AU libellé. */}
      {partageVisible ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={libellePartage}
          // `busy` en plus de `disabled` : VoiceOver dit « en cours » au lieu de
          // « désactivé », qui ferait croire à un lien inerte.
          accessibilityState={{
            disabled: partage.kind === 'envoi',
            busy: partage.kind === 'envoi',
          }}
          disabled={partage.kind === 'envoi'}
          onPress={() => {
            void partager();
          }}
          style={({ pressed }) => [
            styles.lien,
            (pressed || partage.kind === 'envoi') && styles.lienAttenue,
          ]}
        >
          {partage.kind === 'echec' ? (
            <Glyph name="echec" size={iconSizes.sm} color={colors.blanc} />
          ) : null}
          <Text style={styles.lienLabel}>{libellePartage}</Text>
        </Pressable>
      ) : null}

      {/* L2 — UNE seule action primaire. « Voir la carte » la garde ; le renvoi
          est un LIEN : il répare un échec, il ne concurrence pas la sortie de
          l'écran. Il n'apparaît que sur `lost`, et seulement quand une charge
          envoyable existe vraiment (voir `renvoi`).
          L15 — le glyphe ne porte pas le sens tout seul : le libellé est écrit
          à côté, et c'est lui que VoiceOver annonce. */}
      {vue.kind === 'lost' && (renvoi === 'possible' || renvoi === 'envoi') ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(C.ctaRetrySend)}
          // `busy` en plus de `disabled` : VoiceOver dit « en cours » au lieu de
          // « désactivé », qui ferait croire à un lien inerte.
          accessibilityState={{ disabled: renvoi === 'envoi', busy: renvoi === 'envoi' }}
          disabled={renvoi === 'envoi'}
          onPress={() => {
            void renvoyer();
          }}
          style={({ pressed }) => [
            styles.lien,
            (pressed || renvoi === 'envoi') && styles.lienAttenue,
          ]}
        >
          <Glyph name="reessayer" size={iconSizes.sm} color={colors.blanc} />
          <Text style={styles.lienLabel}>{t(C.ctaRetrySend)}</Text>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaBackToMap)}
        // `retourCarte` REMONTE à la carte déjà en dessous (`carte → push('/prete')
        // → replace('/course') → replace('/resultat')`) au lieu d'en empiler une
        // seconde — voir `mvp/ui/nav.ts`.
        onPress={() => retourCarte('/carte')}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaLabel}>{t(C.ctaBackToMap)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir, paddingHorizontal: spacing.lg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  bloc: { alignItems: 'center', gap: spacing.xs },
  titre: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.md },
  ligne: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  // R6 — le rôle du chiffre héros, `tabular-nums` compris (voir `STAT`).
  hero: { ...STAT, color: colors.chartreuse, fontSize: fontSizes.hero },
  // R6 bis — l'unité reste PETITE à côté du nombre : c'est le rôle `statUnit`,
  // pas une taille choisie ici. Son `lineHeight` est remis à l'échelle dans le
  // composant (`ligneUnite`).
  unite: { ...typography.statUnit, color: colors.chartreuse },
  // `lineHeight` VOLONTAIREMENT ABSENT : il est dérivé du `fontScale` dans le
  // composant (voir `INTERLIGNE`). Le remettre ici le re-figerait.
  phrase: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    textAlign: 'center',
  },
  stats: { color: colors.gris, fontFamily: fonts.textSemi, fontSize: fontSizes.md },
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
  // Le renvoi : un LIEN, pas un bouton plein. Sans aplat ni chartreuse, il ne
  // dispute pas la primauté de « Voir la carte » (L2) — mais il garde la cible
  // de 44 pt, parce qu'une action de réparation qu'on rate au doigt n'en est
  // pas une.
  lien: {
    minHeight: TOUCH_TARGET_PT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  // Un seul atténuement pour l'appui ET l'attente : inventer une seconde valeur
  // d'opacité ferait croire à deux états distincts là où il n'y en a qu'un —
  // « ce lien ne répond pas à l'instant ». 0,6 est la valeur déjà employée par
  // l'écran de course pour un envoi en cours.
  lienAttenue: { opacity: 0.6 },
  lienLabel: { color: colors.blanc, fontFamily: fonts.textSemi, fontSize: fontSizes.md },
  /**
   * LA CARD, HORS DU VIEWPORT.
   *
   * Elle est POSITIONNÉE ailleurs, pas rendue invisible : sur iOS, capturer une
   * hiérarchie dont l'opacité est nulle rend une image vide. Décalée de deux
   * largeurs, elle est hors de l'écran sur n'importe quel appareil — et
   * `useRenderInContext` la dessine quand même (voir `graver`).
   */
  horsEcran: { position: 'absolute', left: -SHARE_CARD_W * 2, top: 0 },
});
