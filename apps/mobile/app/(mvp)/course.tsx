/**
 * GRYD — LIVE RUN : ce qu'on lit à bout de souffle (lot M4).
 *
 * ─── L5 : CINQ INFORMATIONS MAXIMUM, ET ON EN MET TROIS ─────────────────────
 * Le chrono, la distance, l'état du signal. Rien d'autre. Cet écran se lit en
 * courant, à bout de souffle, dans une fraction de seconde — chaque élément
 * ajouté se paye sur la lisibilité des deux qui comptent.
 *
 * ─── CE QUI EST VRAI, ET CE QUI EST DÉCLARÉ MANQUANT ────────────────────────
 * Tout ce qui est affiché ici est MESURÉ : les points viennent du capteur, la
 * distance est leur somme, le chrono est une durée réelle. Rien n'est simulé.
 *
 * LA JAUGE DIT LA MÊME CHOSE QUE LE SERVEUR
 * « Boucle fermée » vient de `loopClosureVerdict` — la copie GÉNÉRÉE du moteur
 * qui décide aussi le claim dans `ingest_run`, drift testée. Une seconde
 * implémentation « équivalente » aurait fini par diverger, et le joueur aurait
 * découvert l'écart après avoir couru. `gauge.ts` ajoute la seule chose que le
 * verdict ne dit pas : QUAND se taire (voir son en-tête — trois secondes après
 * le GO, l'écart vaut zéro et le verdict dit « fermée »).
 *
 * ─── NEVER-LOSE-A-RUN ───────────────────────────────────────────────────────
 * La trace est écrite sur le disque au fil de la course (`lib/runStore.ts`,
 * buffer à trois clés — voir `mvp/run/persist.ts` pour l'arbitrage). Deux
 * conséquences visibles ici :
 *   · au MONTAGE, cet écran REPREND une course trouvée sur le disque au lieu
 *     d'en commencer une nouvelle. Repartir de zéro par-dessus une trace
 *     survivante l'écraserait — le buffer aurait fait son travail pour rien ;
 *   · « TERMINER » écrit la trace COMPLÈTE une dernière fois, puis passe la
 *     main. Le buffer n'est effacé qu'une fois la course en sûreté — et ce
 *     n'est plus cet écran qui le sait (voir ci-dessous).
 *
 * ─── CE QUE CET ÉCRAN N'ATTEND PLUS ─────────────────────────────────────────
 * ⚠️ IL N'ENVOIE PAS. Il l'a fait, et c'était un blocage : `sendRun` était
 * attendu ICI avant de naviguer, sans timeout ni borne, bouton grisé — un
 * coureur à bout de souffle devant un écran qui ne dit rien. La navigation part
 * désormais IMMÉDIATEMENT après le maintien, dans l'état `sending` ; l'écran de
 * résultat relit la trace du disque et attend la réponse, en le disant.
 *
 * Le temps mort (kill, batterie) est retranché du chrono : voir `tempsMortRef`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, AppState, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { colors, fonts, fontSizes, motion, radii, spacing } from '@klaim/shared';
import { gpsGrade, type GpsGrade } from '../../src/mvp/run/countdown';
import { gauge } from '../../src/mvp/run/gauge';
import { gaugeHaptic, signalHaptic } from '../../src/mvp/run/feedback';
import { haptics } from '../../src/lib/haptics';
import { formatChrono, formatKm, mergeFixes, traceDistanceM, type TracePoint } from '../../src/mvp/run/trace';
import {
  requestBackgroundPermission,
  startBackgroundUpdates,
  stopBackgroundUpdates,
} from '../../src/mvp/run/gpsProvider';
import { stopWatch } from '../../src/mvp/run/watch';
import { activeElapsedMs, resumedDeadMs, shouldFlush } from '../../src/mvp/run/persist';
import { buildRunPayload } from '../../src/mvp/run/payload';
import type { SendState } from '../../src/mvp/run/outcome';
import {
  clearActiveRun,
  clearCurrentRun,
  drainBackgroundFixes,
  loadActiveRun,
  saveActiveRun,
  type StoredRun,
} from '../../src/lib/runStore';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';

const TOUCH_TARGET_PT = 44;

/**
 * Précision écrite quand le capteur n'en donne pas. 999 m se lit « aucune
 * confiance » côté moteur ; un `0` se lirait « parfait », ce qui serait une
 * précision INVENTÉE — et le trust serveur en dépend.
 */
const PRECISION_INCONNUE_M = 999;

/** Identité locale de la course — clé d'idempotence d'`ingest_run`. */
function nouvelId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Rafraîchissement du chrono. 500 ms : la seconde ne saute jamais. */
const TICK_MS = 500;

/**
 * L'issue passée au résultat quand l'envoi VIENT DE PARTIR.
 *
 * Constante et non un objet reconstruit : c'est une valeur, pas une décision.
 */
const ENVOI_EN_COURS: SendState = { kind: 'sending' };

/** Le capteur, réglé pour une trace — pas pour une position ponctuelle. */
const SUIVI = {
  accuracy: Location.Accuracy.BestForNavigation,
  timeInterval: 1000,
  distanceInterval: 5,
} as const;

export default function Course() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [points, setPoints] = useState<TracePoint[]>([]);
  const [grade, setGrade] = useState<GpsGrade>('searching');
  const [ecouleMs, setEcouleMs] = useState(0);
  const [reprise, setReprise] = useState(false);
  const debutRef = useRef<number>(Date.now());
  /**
   * TEMPS MORT — celui pendant lequel l'app NE TOURNAIT PAS.
   *
   * Le chrono était `Date.now() - debutRef.current`, et `debutRef` reprend le
   * `startedAt` de la course d'origine : une sortie tuée à 20 min et rouverte
   * 3 h plus tard affichait 3 h 20. L'app affirmait un temps que personne
   * n'avait couru — la définition même du mensonge que la constitution
   * interdit. La règle (mesure, cumul, garde-fous) vit dans `persist.ts`, PURE
   * et testée ; ici on ne fait que la porter et l'écrire sur le disque.
   */
  const tempsMortRef = useRef(0);
  // Identité de la course, FIXÉE au premier écrit et jamais régénérée : c'est
  // la clé d'idempotence qu'`ingest_run` attend. En changer à la reprise ferait
  // compter deux fois la même sortie.
  const runIdRef = useRef<string>(nouvelId());
  const dernierFlushRef = useRef<number | null>(null);
  const enAttenteRef = useRef(0);
  // Une clôture en cours ne se relance pas : deux `TERMINER` partiraient deux
  // fois vers le résultat. Elle ne dure plus que le temps des écritures locales
  // (drain + flush final) — l'envoi, lui, a quitté cet écran.
  const [envoi, setEnvoi] = useState(false);
  const envoiRef = useRef(false);

  useEffect(() => {
    screen('run_live');
  }, []);

  // REPRISE — avant tout enregistrement. Une course trouvée sur le disque est
  // continuée telle quelle : même identité, même départ, mêmes points.
  useEffect(() => {
    let vivant = true;
    loadActiveRun()
      .then((stored) => {
        if (!vivant || stored === null || stored.fixes.length === 0) return;
        runIdRef.current = stored.runId;
        debutRef.current = stored.startedAt;
        // ⚠️ AVANT le premier tick : l'écart entre le dernier relevé écrit et
        // maintenant est du temps que l'app n'a pas vécu. Il se CUMULE avec
        // celui d'une interruption antérieure (`stored.deadMs`) — sinon un
        // deuxième kill rendrait au chrono les heures perdues au premier.
        tempsMortRef.current = resumedDeadMs(stored, Date.now());
        setPoints(stored.fixes.map((f) => ({ lng: f.lng, lat: f.lat, t: f.ts })));
        setReprise(true);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
    };
  }, []);

  useEffect(() => {
    let vivant = true;
    let sub: Location.LocationSubscription | null = null;
    Location.watchPositionAsync(SUIVI, (p) => {
      if (!vivant) return;
      setGrade(gpsGrade(p.coords.accuracy));
      setPoints((prev) => {
        const fix = { lng: p.coords.longitude, lat: p.coords.latitude, t: p.timestamp };
        /**
         * ⚠️ `mergeFixes` RECONSTRUIT UNE `Map` ET RETRIE TOUT LE TABLEAU. À
         * ~1 Hz sur une heure de course, `n` monte vers 3 600 : chaque nouveau
         * point retriait un tableau qui grossit, donc un coût qui AUGMENTE avec
         * la durée — précisément quand la batterie est déjà la plus sollicitée.
         *
         * On ne peut pas le remplacer par un simple `push` pour autant : le
         * commentaire d'origine disait vrai, un même relevé peut arriver par le
         * capteur ET par la file background lors d'une bascule d'écran.
         *
         * D'où la voie rapide : si le relevé est STRICTEMENT plus récent que le
         * dernier connu, il ne peut être ni un doublon ni un désordre — on
         * ajoute en O(1). Tout le reste (doublon, arrivée tardive du background)
         * retombe sur la fusion complète, qui reste la seule à savoir dédupliquer.
         */
        const dernier = prev[prev.length - 1];
        const suite =
          dernier !== undefined && fix.t > dernier.t ? [...prev, fix] : mergeFixes(prev, [fix]);
        enAttenteRef.current += 1;
        const maintenant = Date.now();
        /**
         * ⚠️ PLUS AUCUNE ÉCRITURE UNE FOIS « TERMINER » ENGAGÉ.
         *
         * Le flush final écrit la trace COMPLÈTE — les points de l'écran ET la
         * file background vidée — et c'est elle que l'écran de résultat relit
         * pour ENVOYER. Un relevé qui arriverait entre ce flush et le démontage
         * réécrirait le disque depuis le seul état de l'écran, sans les points
         * de la file : la course partirait amputée de sa fin, c'est-à-dire
         * souvent du segment qui referme la boucle.
         */
        const aEcrire =
          !envoiRef.current &&
          shouldFlush(dernierFlushRef.current, maintenant, enAttenteRef.current);
        if (aEcrire) {
          dernierFlushRef.current = maintenant;
          enAttenteRef.current = 0;
          // `accuracy` est OBLIGATOIRE dans un `RawFix` : la jauge et le trust
          // serveur en vivent. `?? 0` serait une précision INVENTÉE — on écrit
          // ce que le capteur a dit, et s'il n'a rien dit on écrit un nombre
          // qui se lit « aucune confiance », pas « parfait ».
          const stored: StoredRun = {
            runId: runIdRef.current,
            // `conquete` : le mode par défaut, celui qui capture. Le MVP n'en
            // expose aucun autre — les modes sans claim (`social_run`,
            // `course_privee`) sont hors périmètre §7.
            mode: 'conquete',
            activity: 'run',
            startedAt: debutRef.current,
            fixes: suite.map((q, i) => ({
              lat: q.lat,
              lng: q.lng,
              ts: q.t,
              accuracy: i === suite.length - 1 ? (p.coords.accuracy ?? PRECISION_INCONNUE_M) : PRECISION_INCONNUE_M,
            })),
            userPausedMs: 0,
            // Écrit à CHAQUE flush : ce qui n'est pas sur le disque est ce
            // qu'un second kill emporterait — et le temps mort emporté
            // reviendrait gonfler le chrono à la reprise suivante.
            deadMs: tempsMortRef.current,
          };
          void saveActiveRun(stored);
        }
        return suite;
      });
    })
      .then((s) => {
        if (vivant) sub = s;
        else stopWatch(s);
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
      stopWatch(sub);
    };
  }, []);

  /**
   * SUIVI EN ARRIÈRE-PLAN — ce qui fait qu'une app de course est une app de
   * course. Sans lui, verrouiller son téléphone TROUE la trace, et la boucle ne
   * se referme jamais chez quelqu'un qui court écran éteint (c'est-à-dire tout
   * le monde).
   *
   * La permission « Toujours » est demandée ICI et nulle part ailleurs : la
   * chaîne de purpose strings d'`app.json` promet noir sur blanc qu'elle « n'est
   * lancée qu'au départ d'une course ». La demander plus tôt trahirait cette
   * phrase, et Apple la lit.
   *
   * Un REFUS n'arrête rien : la course continue en premier plan. Bloquer
   * quelqu'un qui vient de partir pour une permission facultative serait une
   * rançon (L17), et une trace partielle vaut mieux qu'une absence de trace.
   */
  useEffect(() => {
    let vivant = true;
    requestBackgroundPermission()
      .then((accorde) => {
        if (vivant && accorde) return startBackgroundUpdates();
        return undefined;
      })
      .catch(() => undefined);
    return () => {
      vivant = false;
      // Arrêt au démontage : laisser la tâche tourner après la course garderait
      // l'indicateur de localisation allumé sans raison — le contraire exact de
      // ce que la purpose string promet.
      void stopBackgroundUpdates();
    };
  }, []);

  /**
   * Récupération des points collectés pendant que l'écran était éteint.
   *
   * La tâche background les empile dans `runStore` (aucun écran n'écoute) : ils
   * n'existent à l'écran qu'une fois VIDÉS ici. Sans ce drain, le chrono
   * continuerait d'avancer pendant que la distance resterait figée — et le
   * joueur croirait avoir perdu ses mètres.
   */
  const draguer = useCallback(async () => {
    const bg = await drainBackgroundFixes().catch(() => []);
    if (bg.length === 0) return;
    setPoints((prev) => mergeFixes(prev, bg.map((f) => ({ lng: f.lng, lat: f.lat, t: f.ts }))));
  }, []);

  useEffect(() => {
    void draguer();
    const sub = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') void draguer();
    });
    return () => sub.remove();
  }, [draguer]);

  useEffect(() => {
    const id = setInterval(
      () => setEcouleMs(activeElapsedMs(debutRef.current, tempsMortRef.current, Date.now())),
      TICK_MS,
    );
    return () => clearInterval(id);
  }, []);

  /**
   * Clore la course.
   *
   * ⚠️ QUAND ON EFFACE LE BUFFER, ON ATTEND L'EFFACEMENT AVANT DE NAVIGUER, et
   * ce n'est pas de la prudence gratuite : la version `void clear();
   * router.replace()` a été écrite d'abord, et la preview l'a démentie.
   * L'accueil remonte et lit le buffer immédiatement — c'est-à-dire AVANT que
   * l'effacement asynchrone n'atterrisse. Il reproposait alors « Une course n'a
   * pas été terminée » pour la course qu'on venait justement de terminer, et
   * « Reprendre » ouvrait une trace déjà effacée.
   *
   * LES DEUX CLÉS, parce que l'accueil lit LES DEUX (`recoveryOffer`) : n'en
   * effacer qu'une laisserait l'autre reproposer éternellement un fantôme.
   *
   * Ne reste ici qu'un seul cas d'effacement — le GO annulé avant le premier
   * pas, qui n'a rien à envoyer. Sur une vraie course, le buffer est la charge
   * que l'écran de résultat va relire : c'est LUI qui l'efface, et seulement une
   * fois la course en sûreté.
   */
  const terminer = useCallback(async () => {
    if (envoiRef.current) return;
    envoiRef.current = true;
    setEnvoi(true);

    // ⚠️ UN DERNIER DRAIN AVANT D'ENVOYER. Les points collectés en arrière-plan
    // depuis le dernier retour au premier plan sont encore dans la file : partir
    // sans les vider amputerait la trace de sa fin — souvent le segment qui
    // REFERME la boucle.
    await stopBackgroundUpdates().catch(() => undefined);
    const restants = await drainBackgroundFixes().catch(() => []);
    const complet = mergeFixes(
      points,
      restants.map((f) => ({ lng: f.lng, lat: f.lat, t: f.ts })),
    );

    const distanceM = traceDistanceM(complet);
    // La durée ACTIVE, celle qu'on affichait pendant la course. La stat de fin
    // ne peut pas dire autre chose que le chrono que le coureur regardait.
    const dureeMs = activeElapsedMs(debutRef.current, tempsMortRef.current, Date.now());

    // Construit ICI pour une seule question : y a-t-il seulement quelque chose
    // à envoyer ? La charge réellement transmise est rebâtie par l'écran de
    // résultat depuis le disque, avec le MÊME `buildRunPayload` et les mêmes
    // points — deux constructeurs différents finiraient par diverger, et l'écart
    // ne se verrait qu'au 400 du serveur.
    const payload = buildRunPayload({
      clientRunId: runIdRef.current,
      startedAt: debutRef.current,
      points: complet.map((p) => ({ lat: p.lat, lng: p.lng, ts: p.t })),
    });

    // Aucun point envoyable : un GO annulé avant le premier pas n'est PAS une
    // course rejetée. On efface et on rend la main, sans écran de résultat —
    // il n'y a rien à raconter (L19 : on n'adresse pas un refus à quelqu'un qui
    // n'a rien fait).
    if (payload === null) {
      await Promise.all([clearActiveRun(), clearCurrentRun()]);
      router.replace('/carte');
      return;
    }

    /**
     * ⚠️ FLUSH FINAL — LA TRACE COMPLÈTE, AVANT L'ENVOI.
     *
     * Le buffer n'était écrit qu'une fois toutes les `FLUSH_INTERVAL_MS`
     * (5 000 ms), et à raison : écrire à chaque point coûterait O(n²) sur une
     * heure de course. Mais sur l'issue `lost`, ce buffer devient la SEULE
     * trace qui reste — et l'écran de résultat propose désormais de renvoyer
     * depuis lui. Il renvoyait donc une course amputée de ses ~5 dernières
     * secondes : parfois exactement le segment qui referme la boucle.
     *
     * Une écriture de plus, une seule fois, à l'instant où la course se termine.
     * ATTENDUE : partir avant qu'elle ait abouti reproduirait le défaut qu'on
     * corrige, au moment précis où il coûte le plus cher — et c'est aussi ce
     * disque que l'écran de résultat relit pour ENVOYER (voir plus bas).
     */
    await saveActiveRun({
      runId: runIdRef.current,
      mode: 'conquete',
      activity: 'run',
      startedAt: debutRef.current,
      fixes: complet.map((q) => ({
        lat: q.lat,
        lng: q.lng,
        ts: q.t,
        // La précision par point n'est pas conservée en mémoire — seule la
        // dernière l'était, à l'écriture. On écrit donc « aucune confiance »
        // plutôt qu'une valeur inventée : c'est déjà la règle du flush courant.
        accuracy: PRECISION_INCONNUE_M,
      })),
      userPausedMs: 0,
      deadMs: tempsMortRef.current,
    });

    /**
     * ⚠️ ON N'ATTEND PLUS L'ENVOI POUR NAVIGUER.
     *
     * `const issue = await sendRun(payload)` était ici, AVANT le `replace` — et
     * `sendRun` n'a ni timeout ni `AbortController`. Sur un réseau lent, un
     * coureur à bout de souffle restait donc devant un bouton grisé à 0,6,
     * pendant une durée que rien ne bornait, sans savoir si ça avançait. Sur
     * 100 % des courses.
     *
     * L'envoi part maintenant DEPUIS l'écran de résultat, qui relit la trace du
     * disque qu'on vient d'écrire (même `runId`, donc même clé d'idempotence
     * D14) et remplace l'état `sending` par le verdict à son arrivée. Le joueur
     * voit immédiatement que sa course est finie et ce qu'il a parcouru ; il
     * peut même quitter l'écran, l'envoi continue.
     *
     * ⚠️ ET DONC : LE BUFFER N'EST PAS EFFACÉ ICI. Il l'est par l'écran de
     * résultat, et seulement quand la course est en sûreté (répondue ou en
     * file). L'effacer avant l'envoi supprimerait la seule trace qui reste — et
     * la charge que l'envoi doit relire.
     */
    router.replace({
      pathname: '/resultat',
      params: {
        issue: JSON.stringify(ENVOI_EN_COURS),
        distanceM: String(Math.round(distanceM)),
        dureeMs: String(dureeMs),
      },
    });
  }, [points]);

  /**
   * LE MAINTIEN PROTÉGÉ (voir le commentaire du bouton, plus bas).
   *
   * L'haptique encadre le geste : une pulsation LÉGÈRE à l'appui dit « c'est
   * parti, continue », une MOYENNE au déclenchement dit « c'est fait ». Sans la
   * première, quelqu'un qui court ne sait pas que le maintien a été pris en
   * compte et relâche trop tôt ; sans la seconde, il ne sait pas quand lâcher.
   *
   * `finished` est vérifié : un `stop()` provoqué par le relâchement rappelle
   * aussi ce callback, et terminer la course sur un geste ANNULÉ serait
   * exactement le défaut qu'on corrige.
   */
  const maintien = useRef(new Animated.Value(0)).current;

  const commencerMaintien = useCallback(() => {
    haptics.light();
    Animated.timing(maintien, {
      toValue: 1,
      duration: motion.holdToStopMs,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished !== true) return;
      haptics.medium();
      void terminer();
    });
  }, [maintien, terminer]);

  const annulerMaintien = useCallback(() => {
    maintien.stopAnimation();
    // Retour RAPIDE : le remplissage doit visiblement refluer, sinon un
    // relâchement accidentel laisse croire que la course part quand même.
    Animated.timing(maintien, { toValue: 0, duration: 150, useNativeDriver: false }).start();
  }, [maintien]);

  /**
   * ⚠️ CES DEUX CALCULS SONT EN O(n), ET ILS TOURNAIENT À CHAQUE RENDU.
   *
   * `traceDistanceM` somme un haversine sur TOUS les segments ; `gauge` rappelle
   * `traceLengthM`, donc le fait une seconde fois. Or le chronomètre tique
   * toutes les 500 ms (`TICK_MS`) et provoque un rendu — sur lequel `points` n'a
   * PAS changé. Résultat : sur l'écran qu'on regarde une heure, à bout de
   * souffle, la trace entière était reparcourue quatre fois par seconde pour
   * rafraîchir un chrono.
   *
   * `useMemo` sur `points` supprime la moitié gratuite de ce travail sans
   * toucher aux algorithmes : le tick ne recalcule plus rien.
   */
  const km = useMemo(() => formatKm(traceDistanceM(points)), [points]);
  // ⚠️ `isFirstCapture` n'est pas passé : cet écran ne sait pas encore si le
  // joueur a déjà capturé (l'info vit dans la lecture de la carte). Le défaut
  // prend le seuil le PLUS HAUT, donc la jauge parle plus tard qu'elle ne
  // pourrait pour un premier joueur — se tromper dans ce sens fait dire moins,
  // l'autre ferait promettre une boucle que le moteur refuserait.
  const jauge = useMemo(() => gauge(points), [points]);

  // L6 — l'haptique se déclenche sur une TRANSITION, jamais sur un état : la
  // jauge est recalculée à chaque point GPS, et vibrer sur son état ferait
  // trembler le téléphone en continu. `feedback.ts` (pur, testé) décide.
  const jaugePrecRef = useRef<typeof jauge.kind>('silent');
  useEffect(() => {
    const quoi = gaugeHaptic(jaugePrecRef.current, jauge.kind);
    jaugePrecRef.current = jauge.kind;
    if (quoi !== null) haptics[quoi]();
  }, [jauge.kind]);

  const gradePrecRef = useRef<GpsGrade>('searching');
  useEffect(() => {
    const quoi = signalHaptic(gradePrecRef.current, grade);
    gradePrecRef.current = grade;
    if (quoi !== null) haptics[quoi]();
  }, [grade]);
  const phraseJauge =
    jauge.kind === 'closed'
      ? t(C.runLoopClosed)
      : jauge.kind === 'almost'
        ? t(C.runLoopAlmost)
        : jauge.kind === 'missing'
          ? t(C.runMetersLeft, { m: String(jauge.missingM) })
          : null;
  const phraseGps =
    grade === 'good' ? t(C.gpsGood) : grade === 'weak' ? t(C.gpsWeak) : t(C.gpsSearching);

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      <View style={styles.centre}>
        {/* UN chiffre héros, toujours VRAI (L12).
            Avant le premier mètre, le héros est le CHRONO — parce qu'il est
            juste dès la première seconde, alors que la distance ne l'est pas.
            Un « 0,00 km » serait un zéro nu (interdit), et un tiret de 88 pt se
            lit comme une censure, pas comme une attente. Dès que la distance
            existe, elle prend la place et le chrono passe en second. */}
        {km !== null ? (
          <>
            <View style={styles.ligne}>
              <Text style={styles.hero}>{km}</Text>
              <Text style={styles.unite}>{t(C.unitKm)}</Text>
            </View>
            <Text style={styles.chrono}>{formatChrono(ecouleMs)}</Text>
          </>
        ) : (
          <Text style={styles.hero}>{formatChrono(ecouleMs)}</Text>
        )}
        {/* La jauge — absente tant qu'il n'y a rien de vrai à en dire. Une
            ligne vide vaut mieux qu'une ligne qui meuble (L5). */}
        {phraseJauge !== null ? <Text style={styles.jauge}>{phraseJauge}</Text> : null}
        {/* On DIT que la course a été reprise : continuer en silence laisserait
            croire que le chrono repart de zéro. */}
        {reprise ? <Text style={styles.gps}>{t(C.runResumed)}</Text> : null}
        <Text style={styles.gps}>{phraseGps}</Text>
      </View>

      {/* ⚠️ MAINTENIR, PAS TAPER. Un tap suffisait à clore ET envoyer la course
          — sans retour possible. Le pouce à travers le tissu d'une poche, un
          brassard qui appuie, un appui involontaire à un feu rouge : la sortie
          était finie. Le HIG demande une intention explicite sur une action
          irréversible (c'est le modèle Apple Workout).
          Le token de la solution DORMAIT déjà dans la charte :
          `motion.holdToStopMs = 1200` — « stop protégé : maintenir 1,2 s ».
          `useNativeDriver: false` : la valeur pilote une LARGEUR, pas une
          transformation — le pilote natif ne sait pas animer `width`. */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaFinishHold)}
        // `busy` et non seulement `disabled` : VoiceOver dit alors « en cours »
        // au lieu de « désactivé », qui ferait croire à un bouton inerte.
        accessibilityState={{ disabled: envoi, busy: envoi }}
        disabled={envoi}
        onPressIn={commencerMaintien}
        onPressOut={annulerMaintien}
        style={[styles.cta, envoi && styles.dim]}
      >
        {/* Le remplissage EST le compte à rebours : sans lui, maintenir un
            bouton qui ne bouge pas est indiscernable d'un bouton en panne. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ctaProgression,
            { width: maintien.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
          ]}
        />
        <Text style={styles.ctaLabel}>{envoi ? t(C.ctaFinish) : t(C.ctaFinishHold)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.noir, paddingHorizontal: spacing.lg },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  ligne: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  hero: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.heroMax },
  unite: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.xl },
  chrono: { color: colors.blanc, fontFamily: fonts.display, fontSize: fontSizes.xl },
  jauge: { color: colors.chartreuse, fontFamily: fonts.textSemi, fontSize: fontSizes.lg },
  gps: { color: colors.gris, fontFamily: fonts.text, fontSize: fontSizes.sm },
  cta: {
    minHeight: TOUCH_TARGET_PT,
    borderRadius: radii.pill,
    backgroundColor: colors.chartreuse,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    // Sans lui, le remplissage du maintien déborderait du rayon pilule.
    overflow: 'hidden',
  },
  ctaPressed: { backgroundColor: colors.chartreusePressed },
  // Le remplissage du maintien : posé DERRIÈRE le libellé (`overflow: hidden`
  // sur `cta` le borne au rayon pilule), assombri plutôt que teinté — une
  // seconde couleur ferait croire à un second sens.
  ctaProgression: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.chartreusePressed,
  },
  dim: { opacity: 0.6 },
  ctaLabel: { color: colors.noir, fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '700' },
});
