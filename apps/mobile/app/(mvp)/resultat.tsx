/**
 * GRYD — LE RÉSULTAT : le pic émotionnel, ou le refus qui n'accuse pas (M7).
 *
 * ─── CE QUE CET ÉCRAN NE FAIT PAS ───────────────────────────────────────────
 * Il ne DÉCIDE rien. L'envoi a eu lieu dans l'écran de course, et l'issue lui
 * est passée telle quelle ; `outcome.resultView` (pur, testé) dit ce qu'on a le
 * droit d'afficher. Ce fichier ne fait que peindre.
 *
 * ─── LES DEUX FAUTES QUI COÛTERAIENT LE PLUS CHER ICI ───────────────────────
 * 1. Annoncer « aucun territoire » sur une course PAS ENCORE ENVOYÉE. Personne
 *    n'a rien refusé : ce serait inventer un verdict, et décourager quelqu'un
 *    qui a peut-être tout gagné. L'attente est une issue à part entière.
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
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, fontSizes, radii, spacing } from '@klaim/shared';
import { resultView, type ResultView, type SendResult } from '../../src/mvp/run/outcome';
import { formatChrono } from '../../src/mvp/run/trace';
import { heroArea } from '../../src/mvp/ui/area';
import { TerritoryMark } from '../../src/mvp/ui/TerritoryMark';
import { C } from '../../src/i18n/catalog/mvp';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';
import { resultHaptic } from '../../src/mvp/run/feedback';
import { haptics } from '../../src/lib/haptics';

const TOUCH_TARGET_PT = 44;

/**
 * Durée de la célébration (ms).
 *
 * L7 demande 2 à 3 s pour la séquence complète (contour → remplissage → gain).
 * Ce lot en tient la PREMIÈRE moitié : l'objet apparaît, puis le chiffre. Un
 * peu plus d'une seconde — assez pour que le chiffre soit une RÉVÉLATION et non
 * un affichage, pas assez pour retenir quelqu'un qui veut déjà revoir sa carte.
 * Le reste de la chorégraphie, et le son, sont déclarés manquants au BACKLOG.
 */
const FETE_MS = 1_100;

/**
 * L'issue de l'envoi transite par l'URL, sérialisée.
 *
 * ⚠️ Une valeur illisible (lien profond bricolé, navigation rejouée) ne devient
 * PAS un refus : elle devient `lost`, la seule issue qui dit honnêtement « on
 * ne sait pas ce qu'il est advenu de ta course ». Se tromper vers un refus
 * annoncerait au joueur une décision que personne n'a prise.
 */
function issueDepuisParam(brut: string | string[] | undefined): SendResult {
  const texte = Array.isArray(brut) ? brut[0] : brut;
  if (typeof texte !== 'string' || texte.length === 0) return { kind: 'lost' };
  try {
    const parsed = JSON.parse(texte) as SendResult;
    if (parsed.kind === 'queued' || parsed.kind === 'lost') return { kind: parsed.kind };
    if (parsed.kind === 'answered' && typeof parsed.verdict === 'object' && parsed.verdict !== null) {
      return parsed;
    }
    return { kind: 'lost' };
  } catch {
    return { kind: 'lost' };
  }
}

function nombre(v: string | string[] | undefined): number {
  const t = Array.isArray(v) ? v[0] : v;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export default function Resultat() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const vue: ResultView = resultView(issueDepuisParam(params.issue));
  const distanceM = nombre(params.distanceM);
  const dureeMs = nombre(params.dureeMs);

  useEffect(() => {
    screen('run_result');
    // L7 — le pic émotionnel. Un refus, lui, ne vibre pas : ajouter un coup de
    // semonce physique à une nouvelle décevante serait accuser (L19), et ça
    // vaut aussi pour ce que l'app fait SENTIR.
    const quoi = resultHaptic(vue.kind);
    if (quoi !== null) haptics[quoi]();
    // Au MONTAGE seulement : la vue est figée par les paramètres de route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aire = vue.kind === 'captured' ? heroArea(vue.areaM2) : null;

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
  const [reduit, setReduit] = useState(false);

  useEffect(() => {
    let vivant = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((r) => {
        if (!vivant) return;
        setReduit(r);
        if (r || !fete) {
          anim.setValue(1);
          return;
        }
        Animated.timing(anim, {
          toValue: 1,
          duration: FETE_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
      })
      .catch(() => anim.setValue(1));
    return () => {
      vivant = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const passer = () => anim.setValue(1);

  // L'objet arrive d'abord, le chiffre ensuite : c'est cet écart qui fait du
  // nombre une révélation. `extrapolate: 'clamp'` évite qu'il déborde.
  const opaciteMarque = anim.interpolate({ inputRange: [0, 0.45], outputRange: [0, 1], extrapolate: 'clamp' });
  const echelleMarque = anim.interpolate({ inputRange: [0, 0.45], outputRange: [0.86, 1], extrapolate: 'clamp' });
  const opaciteChiffre = anim.interpolate({ inputRange: [0.45, 1], outputRange: [0, 1], extrapolate: 'clamp' });

  const phrase =
    vue.kind === 'captured'
      ? vue.assisted
        ? t(C.resAssisted)
        : null
      : vue.kind === 'takenNoArea'
        ? t(C.resTakenNoArea)
        : vue.kind === 'missing'
          ? t(C.verifyGap, { m: String(vue.missingM) })
          : vue.kind === 'noLoop'
            ? t(C.resNoLoop)
            : vue.kind === 'refused'
              ? vue.reason === 'narrow'
                ? t(C.resNarrow)
                : t(C.resRefused)
              : vue.kind === 'pending'
                ? t(C.resPending)
                : t(C.resLost);

  // La distance vient de la trace locale : `formatKm` refuse le zéro nu, donc
  // une course sans mètre parcouru n'affiche pas « 0,00 km ».
  const km = distanceM > 0 ? (Math.round(distanceM / 10) / 100).toFixed(2).replace('.', ',') : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg }]}>
      {/* Toute la scène est tapable : c'est ce qui rend la célébration
          SKIPPABLE sans ajouter un bouton « passer » qui volerait l'unique
          action primaire de l'écran (L2). */}
      <Pressable
        style={styles.centre}
        onPress={passer}
        accessibilityRole={fete && !reduit ? 'button' : 'none'}
        accessibilityLabel={fete && !reduit ? t(C.ctaBackToMap) : undefined}
      >
        {/* L'objet signature n'apparaît QUE sur une prise : le montrer sur un
            refus ferait miroiter ce qu'on vient de dire non obtenu. */}
        {fete ? (
          <Animated.View style={{ opacity: opaciteMarque, transform: [{ scale: echelleMarque }] }}>
            <TerritoryMark size={140} />
          </Animated.View>
        ) : null}

        {aire !== null ? (
          <Animated.View style={[styles.bloc, { opacity: opaciteChiffre }]}>
            <Text style={styles.titre}>{t(C.resTakenTitle)}</Text>
            <View style={styles.ligne}>
              <Text style={styles.hero}>{aire}</Text>
              <Text style={styles.unite}>{t(C.unitM2)}</Text>
            </View>
          </Animated.View>
        ) : null}

        {phrase !== null ? <Text style={styles.phrase}>{phrase}</Text> : null}

        {/* L19 — TOUJOURS présentes, quelle que soit l'issue. */}
        {km !== null ? (
          <Text style={styles.stats}>{t(C.resStats, { km, duree: formatChrono(dureeMs) })}</Text>
        ) : null}
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(C.ctaBackToMap)}
        onPress={() => router.replace('/carte')}
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
  hero: { color: colors.chartreuse, fontFamily: fonts.display, fontSize: fontSizes.hero },
  unite: { color: colors.chartreuse, fontFamily: fonts.text, fontSize: fontSizes.lg },
  phrase: {
    color: colors.blanc,
    fontFamily: fonts.text,
    fontSize: fontSizes.md,
    lineHeight: 24,
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
});
