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
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
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

const TOUCH_TARGET_PT = 44;

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
  }, []);

  const aire = vue.kind === 'captured' ? heroArea(vue.areaM2) : null;

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
      <View style={styles.centre}>
        {/* L'objet signature n'apparaît QUE sur une prise : le montrer sur un
            refus ferait miroiter ce qu'on vient de dire non obtenu. */}
        {vue.kind === 'captured' || vue.kind === 'takenNoArea' ? <TerritoryMark size={140} /> : null}

        {aire !== null ? (
          <>
            <Text style={styles.titre}>{t(C.resTakenTitle)}</Text>
            <View style={styles.ligne}>
              <Text style={styles.hero}>{aire}</Text>
              <Text style={styles.unite}>{t(C.unitM2)}</Text>
            </View>
          </>
        ) : null}

        {phrase !== null ? <Text style={styles.phrase}>{phrase}</Text> : null}

        {/* L19 — TOUJOURS présentes, quelle que soit l'issue. */}
        {km !== null ? (
          <Text style={styles.stats}>{t(C.resStats, { km, duree: formatChrono(dureeMs) })}</Text>
        ) : null}
      </View>

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
