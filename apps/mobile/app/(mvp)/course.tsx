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
 * ⚠️ CE QUI N'EST PAS ENCORE LÀ, et qui est inscrit au BACKLOG plutôt que
 * maquillé : le NEVER-LOSE-A-RUN — la trace vit en mémoire, une course perdue
 * par un crash reste possible. C'est une faiblesse de robustesse DÉCLARÉE, pas
 * un mensonge à l'écran : rien ici ne promet que la course est sauvegardée.
 * Tant que ce point tient, cet écran n'a pas passé son `ux-gate` M5 et le
 * groupe `(mvp)` reste sans porte d'entrée.
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import { colors, fonts, fontSizes, radii, spacing } from '@klaim/shared';
import { gpsGrade, type GpsGrade } from '../../src/mvp/run/countdown';
import { gauge } from '../../src/mvp/run/gauge';
import { formatChrono, formatKm, traceDistanceM, type TracePoint } from '../../src/mvp/run/trace';
import { stopWatch } from '../../src/mvp/run/watch';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';

const TOUCH_TARGET_PT = 44;

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
  const debutRef = useRef<number>(Date.now());

  useEffect(() => {
    screen('run_live');
  }, []);

  useEffect(() => {
    let vivant = true;
    let sub: Location.LocationSubscription | null = null;
    Location.watchPositionAsync(SUIVI, (p) => {
      if (!vivant) return;
      setGrade(gpsGrade(p.coords.accuracy));
      setPoints((prev) => [
        ...prev,
        { lng: p.coords.longitude, lat: p.coords.latitude, t: p.timestamp },
      ]);
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

  useEffect(() => {
    const id = setInterval(() => setEcouleMs(Date.now() - debutRef.current), TICK_MS);
    return () => clearInterval(id);
  }, []);

  const km = formatKm(traceDistanceM(points));
  // ⚠️ `isFirstCapture` n'est pas passé : cet écran ne sait pas encore si le
  // joueur a déjà capturé (l'info vit dans la lecture de la carte). Le défaut
  // prend le seuil le PLUS HAUT, donc la jauge parle plus tard qu'elle ne
  // pourrait pour un premier joueur — se tromper dans ce sens fait dire moins,
  // l'autre ferait promettre une boucle que le moteur refuserait.
  const jauge = gauge(points);
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
        <Text style={styles.gps}>{phraseGps}</Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaFinish)}
        onPress={() => router.replace('/carte')}
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
