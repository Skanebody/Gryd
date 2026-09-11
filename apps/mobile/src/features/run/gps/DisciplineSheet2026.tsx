/**
 * GRYD — « UN PROBLÈME AVEC TA SORTIE » : LA QUESTION POSÉE À L'ARRIVÉE.
 *
 * ═══ LA DÉCISION QUE CET ÉCRAN SERT (12/09/2026) ════════════════════════════
 * Mot pour mot : « à la fin, si la personne s'est trompée, on lui met le
 * message comme quoi il y a un problème avec sa course ; s'il ne veut pas
 * basculer, on ne comptabilise pas pour certaines choses ».
 *
 * ─── OÙ IL S'INTERCALE, ET POURQUOI EXACTEMENT LÀ ───────────────────────────
 * Entre le tap sur « Terminer » et `run.finish()`. À cet instant précis :
 * le tracker vit encore, la trace est en mémoire ET sur le disque de reprise,
 * rien n'est parti au serveur, et la discipline du payload n'est pas figée.
 * Un pas plus tard, tout est irréversible (capteurs coupés, envoi awaité).
 *
 * ─── AUCUNE ALERTE PENDANT LA COURSE, ET C'EST STRUCTUREL ───────────────────
 * La discipline est figée au départ (`tracker.ts`, `readonly activity`) parce
 * qu'elle fixe les bornes de nettoyage §3.2 appliquées à chaque relevé. La
 * rebasculer en pleine sortie produirait une trace filtrée à deux barèmes.
 *
 * ═══ DEUX ISSUES DE MÊME RANG, ET AUCUNE TROISIÈME ══════════════════════════
 * Ni croix, ni « plus tard », ni tap hors de la feuille, ni retour Android
 * silencieux : une troisième issue laisserait la sortie partir sans que
 * personne ait décidé ce qu'elle vaut, c'est-à-dire exactement la situation
 * qu'on corrige. Les deux boutons partagent le même style : aucun n'est
 * « le bon ». Basculer n'est pas un aveu ; garder n'est pas une punition.
 *
 * ─── CE QUE L'ÉCRAN AFFIRME, ET CE QU'IL N'AFFIRME PAS ──────────────────────
 * Il énonce des MESURES (« 24 km/h », « aucun pas », « 5 minutes ») et une
 * ressemblance (« ça ressemble à du vélo »). Jamais un verdict, jamais un
 * soupçon de triche : se tromper de bouton au départ est l'erreur la plus
 * banale du produit. Sans podomètre, cet écran ne s'affiche pas du tout — le
 * contrôle rend alors `no_steps`, et on ne devine pas une cadence.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type Activity, fonts, refonteColors as c } from '@klaim/shared';
import { useT } from '../../../i18n/store';
import { C } from '../../../i18n/catalog/courseLive';
import type { DisciplineVerdict2026 } from './engine/disciplineCheck2026';

const S_PER_MIN = 60;

export interface DisciplineSheet2026Props {
  /** Le verdict à montrer. `suspected` est garanti non nul par l'appelant. */
  readonly verdict: DisciplineVerdict2026;
  /** Bascule vers la discipline mesurée. */
  readonly onSwitch: () => void;
  /** Garde la discipline déclarée, en connaissance de cause. */
  readonly onKeep: () => void;
  /** Une réponse est en cours de traitement : les deux boutons se figent. */
  readonly busy: boolean;
}

/** Un entier lisible : on n'affiche jamais « 23,87 km/h » à quelqu'un d'essoufflé. */
function round(value: number | null): number {
  return value === null || !Number.isFinite(value) ? 0 : Math.round(value);
}

export function DisciplineSheet2026({ verdict, onSwitch, onKeep, busy }: DisciplineSheet2026Props) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const suspected: Activity = verdict.suspected ?? 'bike';
  const minutes = Math.max(1, Math.round(verdict.evidence.windowS / S_PER_MIN));
  const kmh = round(verdict.evidence.sustainedKmh);
  const spm = round(verdict.evidence.stepsPerMin);
  return (
    <View style={s.overlay} accessibilityViewIsModal accessibilityLabel={t(C.a11yDisciplineSheet)}>
      <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <Text accessibilityRole="header" style={s.title}>{t(C.disciplineTitle)}</Text>
        {/* LES CHIFFRES MESURÉS, AVANT TOUTE INTERPRÉTATION. */}
        <Text style={s.body}>
          {suspected === 'bike'
            ? t(C.disciplineBodyBike, { min: minutes, kmh })
            : t(C.disciplineBodyRun, { min: minutes, spm, kmh })}
        </Text>
        <Text style={s.cost}>{t(C.disciplineKeepCost)}</Text>
        <Text style={s.safe}>{t(C.disciplineSafe)}</Text>
        {/* ── LES DEUX ISSUES. Même style, même taille, même rang. ────────── */}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onSwitch}
          style={({ pressed }) => [s.choice, pressed && s.pressed, busy && s.disabled]}
        >
          <Text style={s.choiceText} numberOfLines={2}>
            {t(suspected === 'bike' ? C.disciplineSwitchToBike : C.disciplineSwitchToRun)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={onKeep}
          style={({ pressed }) => [s.choice, pressed && s.pressed, busy && s.disabled]}
        >
          <Text style={s.choiceText} numberOfLines={2}>
            {t(verdict.declared === 'run' ? C.disciplineKeepRun : C.disciplineKeepBike)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Opaque à 88 % : la carte reste devinable derrière (on sort d'une sortie, pas
  // d'un formulaire), mais rien du dock n'est atteignable — la feuille couvre
  // l'écran entier et intercepte tous les gestes.
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', backgroundColor: 'rgba(10,10,10,0.88)' },
  sheet: { backgroundColor: c.carbon, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 22, gap: 12 },
  title: { color: c.darkInk, fontFamily: fonts.displayMedium, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  body: { color: c.darkInk, fontFamily: fonts.text, fontSize: 15, lineHeight: 22 },
  cost: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 },
  safe: { color: c.darkMuted, fontFamily: fonts.text, fontSize: 12, lineHeight: 18 },
  // AUCUN ACCENT CHARTREUSE ICI. La charte réserve l'accent au rôle, et teinter
  // l'un des deux boutons désignerait « la bonne réponse » : ce serait décider
  // à la place de quelqu'un dont on ne sait pas ce qu'il a fait.
  choice: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: c.darkSurfaceMuted, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  choiceText: { color: c.darkInk, fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.45 },
});
