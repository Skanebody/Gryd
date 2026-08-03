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
 *   · « TERMINER » efface le buffer. Ne pas l'effacer ferait reproposer
 *     indéfiniment une course déjà close.
 *
 * ⚠️ Ce que ça ne fait PAS encore : ENVOYER. Rien à l'écran ne le promet — le
 * bouton dit « Terminer », pas « Enregistrer ». La trace attend sur le disque,
 * ce qui est exactement ce que garantit never-lose-a-run.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { colors, fonts, fontSizes, radii, spacing } from '@klaim/shared';
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
import { shouldFlush } from '../../src/mvp/run/persist';
import { buildRunPayload } from '../../src/mvp/run/payload';
import { sendRun } from '../../src/mvp/run/sendRun';
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
  // Identité de la course, FIXÉE au premier écrit et jamais régénérée : c'est
  // la clé d'idempotence qu'`ingest_run` attend. En changer à la reprise ferait
  // compter deux fois la même sortie.
  const runIdRef = useRef<string>(nouvelId());
  const dernierFlushRef = useRef<number | null>(null);
  const enAttenteRef = useRef(0);
  // Un envoi en cours ne se relance pas : deux `TERMINER` enverraient deux fois
  // la même course. L'idempotence serveur (D14) l'absorberait, mais l'écran, lui,
  // partirait deux fois vers le résultat.
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
        // `mergeFixes` et non un `push` : le même relevé peut arriver par le
        // capteur ET par la file background au moment d'une bascule d'écran.
        const suite = mergeFixes(prev, [
          { lng: p.coords.longitude, lat: p.coords.latitude, t: p.timestamp },
        ]);
        enAttenteRef.current += 1;
        const maintenant = Date.now();
        if (shouldFlush(dernierFlushRef.current, maintenant, enAttenteRef.current)) {
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
    const id = setInterval(() => setEcouleMs(Date.now() - debutRef.current), TICK_MS);
    return () => clearInterval(id);
  }, []);

  /**
   * Clore la course.
   *
   * ⚠️ ON ATTEND l'effacement AVANT de naviguer, et ce n'est pas de la
   * prudence gratuite : la version `void clear(); router.replace()` a été
   * écrite d'abord, et la preview l'a démentie. L'accueil remonte et lit le
   * buffer immédiatement — c'est-à-dire AVANT que l'effacement asynchrone
   * n'atterrisse. Il reproposait alors « Une course n'a pas été terminée »
   * pour la course qu'on venait justement de terminer, et « Reprendre »
   * ouvrait une trace déjà effacée.
   *
   * LES DEUX CLÉS, parce que l'accueil lit LES DEUX (`recoveryOffer`) : n'en
   * effacer qu'une laisserait l'autre reproposer éternellement un fantôme.
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
    const dureeMs = Date.now() - debutRef.current;

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

    const issue = await sendRun(payload);

    // ⚠️ ON N'EFFACE LE BUFFER QUE SI LA COURSE EST EN SÛRETÉ : répondue par le
    // serveur, ou acceptée dans la file d'envoi. Sur `lost`, la file a refusé —
    // le buffer `runStore` est alors le DERNIER filet, et l'effacer perdrait
    // pour de bon une course que le joueur vient de courir.
    if (issue.kind !== 'lost') {
      await Promise.all([clearActiveRun(), clearCurrentRun()]);
    }

    router.replace({
      pathname: '/resultat',
      params: {
        issue: JSON.stringify(issue),
        distanceM: String(Math.round(distanceM)),
        dureeMs: String(dureeMs),
      },
    });
  }, [points]);

  const km = formatKm(traceDistanceM(points));
  // ⚠️ `isFirstCapture` n'est pas passé : cet écran ne sait pas encore si le
  // joueur a déjà capturé (l'info vit dans la lecture de la carte). Le défaut
  // prend le seuil le PLUS HAUT, donc la jauge parle plus tard qu'elle ne
  // pourrait pour un premier joueur — se tromper dans ce sens fait dire moins,
  // l'autre ferait promettre une boucle que le moteur refuserait.
  const jauge = gauge(points);

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

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaFinish)}
        accessibilityState={{ disabled: envoi }}
        disabled={envoi}
        onPress={() => void terminer()}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaLabel}>{t(C.ctaFinish)}</Text>
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
  },
  ctaPressed: { backgroundColor: colors.chartreusePressed },
  ctaLabel: { color: colors.noir, fontFamily: fonts.textSemi, fontSize: fontSizes.md, fontWeight: '700' },
});
