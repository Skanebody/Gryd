/**
 * GRYD — LE GUIDE « Comment ça marche » (G29 · aide).
 *
 * ─── CE QU'IL REMPLACE, ET POURQUOI ─────────────────────────────────────────
 * Trois surfaces racontaient la même chose sans jamais se rencontrer :
 * `/calcul-zones` (le territoire), `/faq` (dix questions à plat) et les trois
 * écrans de découverte de l'onboarding. Retour du fondateur, 10/09/2026 :
 * « les textes ne sont pas visibles, fond noir », « je veux que ce soit
 * interactif, avec du design et des schémas », « les pages de découverte
 * doivent être déplacées dedans », « le bouton Revoir la découverte est
 * incompréhensible ».
 *
 * D'où UN parcours de huit chapitres, chacun avec son schéma, deux à quatre
 * phrases et ses chiffres réels. On peut le suivre en tapant « Suivant », ou
 * sauter directement à un chapitre. La barre chartreuse dit où l'on en est.
 *
 * ─── LA CAUSE RACINE DE L'INVISIBILITÉ, CORRIGÉE À LA SOURCE ────────────────
 * `ProfilePage` a DEUX tonalités. En tonalité sombre (le défaut), le fond est
 * `refonteColors.carbon` (#0A0A0A) et le texte doit être `darkInk` (#FAFAFA).
 * L'ancienne `/faq` peignait ses questions en `refonteColors.ink` (#101010) —
 * la valeur du texte de la tonalité CLAIRE. Contraste mesuré : 1,03:1. Le
 * texte était là, parfaitement rendu, et parfaitement illisible. Ce guide
 * n'emploie que les jetons de la tonalité sombre, et le test de couture refuse
 * désormais `c.ink`, `c.forest`, `c.muted` et `c.border` dans `features/help`.
 *
 * ─── CE QU'IL N'INVENTE PAS ─────────────────────────────────────────────────
 * Aucun chiffre n'est tapé ici : ils viennent tous de `helpFacts2026`, donc de
 * `game-rules.ts`. La saison n'affiche aucune date : elle monte `SeasonStatus`,
 * qui lit le serveur et rend ses quatre états honnêtes (lecture / active /
 * aucune / échec).
 */
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { fonts, refonteColors as c } from '@klaim/shared';
import { GrydIcon, type GrydIconName } from '../../ui/gryd';
import { screen } from '../../lib/analytics';
import { haptics } from '../../lib/haptics';
import { goBack } from '../../lib/nav';
import { useLocale } from '../../i18n/store';
import { ProfileButton, ProfilePage, s } from '../refonte/ProfilePrimitives';
import { DiscoveryLoop2026 } from '../onboarding/DiscoveryLoop2026';
import { SeasonStatus } from '../season/SeasonStatus';
import { HelpDiagram2026 } from './HelpDiagram2026';
import { helpChapterProgress, helpChapters2026, resolveHelpChapter, type HelpChapter, type HelpChapterId } from './helpChapters2026';
import { helpFaq2026 } from './helpFaq2026';

/** Une ligne de chiffre : icône, ce que c'est, et la valeur en chartreuse. */
function FactRow({ label, value, icon }: { label: string; value: string; icon: GrydIconName }) {
  return <View style={local.fact} accessible accessibilityLabel={`${label} : ${value}`}>
    <GrydIcon name={icon} size={18} color={c.darkMuted} />
    <Text style={local.factLabel}>{label}</Text>
    <Text style={local.factValue}>{value}</Text>
  </View>;
}

/** Les questions, repliées par défaut : le détail arrive AU TAP (L10). */
function FaqBlock({ fr }: { fr: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const groups = helpFaq2026(fr);
  return <View style={local.faq}>
    {groups.map((group) => <View key={group.id} style={local.group}>
      <View style={local.groupHead}>
        <View style={local.groupRule} />
        <GrydIcon name={group.icon} size={16} color={c.accent} />
        <Text style={local.groupTitle}>{group.title}</Text>
      </View>
      {group.entries.map((entry) => {
        const expanded = open === entry.id;
        return <View key={entry.id} style={local.question}>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded}
            onPress={() => { haptics.light(); setOpen(expanded ? null : entry.id); }}
            style={({ pressed }) => [local.questionRow, pressed && local.pressed]}>
            <Text style={local.questionText}>{entry.question}</Text>
            <GrydIcon name={expanded ? 'minus' : 'plus'} size={18} color={c.accent} />
          </Pressable>
          {expanded ? <Text style={local.answer}>{entry.answer}</Text> : null}
        </View>;
      })}
    </View>)}
  </View>;
}

export default function HelpGuide2026() {
  const fr = useLocale() !== 'en';
  const text = (a: string, b: string) => fr ? a : b;
  const requested = resolveHelpChapter(useLocalSearchParams<{ chapitre?: string }>().chapitre);
  const [current, setCurrent] = useState<HelpChapterId>(requested);
  const lastRequested = useRef(requested);
  useEffect(() => {
    if (lastRequested.current === requested) return;
    lastRequested.current = requested;
    setCurrent(requested);
  }, [requested]);
  useEffect(() => { screen('comment_ca_marche', { chapitre: current }); }, [current]);

  const chapters = helpChapters2026(fr);
  const chapter: HelpChapter = chapters.find((entry) => entry.id === current) ?? chapters[0]!;
  const progress = helpChapterProgress(chapter.id);
  const go = (next: HelpChapterId) => { haptics.light(); setCurrent(next); };
  const finish = () => { haptics.success(); goBack('/parametres'); };

  return <ProfilePage key={chapter.id} title={text('Comment ça marche', 'How it works')} back backHref="/parametres" masthead={
    <View style={local.masthead}>
      <View accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: progress.count, now: progress.index + 1 }}
        accessibilityLabel={text(`Chapitre ${progress.index + 1} sur ${progress.count}`, `Chapter ${progress.index + 1} of ${progress.count}`)}
        style={local.track}>
        <View style={[local.fill, { width: `${Math.round(progress.ratio * 100)}%` }]} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={local.chips}>
        <View accessibilityRole="tablist" style={local.chipRow}>
          {chapters.map((entry) => {
            const on = entry.id === chapter.id;
            return <Pressable key={entry.id} accessibilityRole="tab" accessibilityState={{ selected: on }} aria-selected={on}
              accessibilityLabel={`${entry.step} ${entry.chip}`} onPress={() => go(entry.id)}
              style={({ pressed }) => [local.chip, on && local.chipOn, pressed && local.pressed]}>
              <Text style={[local.chipStep, on && local.chipStepOn]}>{entry.step}</Text>
              <Text style={[local.chipText, on && local.chipTextOn]}>{entry.chip}</Text>
            </Pressable>;
          })}
        </View>
      </ScrollView>
    </View>
  }>
    <View style={local.head}>
      <Text style={local.step}>{chapter.step}</Text>
      <Text accessibilityRole="header" style={local.title}>{chapter.title}</Text>
    </View>

    {chapter.art === 'loop'
      ? <View style={local.interactive}><DiscoveryLoop2026 fr={fr} /></View>
      : <HelpDiagram2026 kind={chapter.art} label={chapter.artLabel} />}

    <View style={local.lines}>
      {chapter.lines.map((line) => <View key={line} style={local.line}>
        <View style={local.bullet} />
        <Text style={s.body}>{line}</Text>
      </View>)}
    </View>

    {chapter.secondaryArt && chapter.secondaryArt !== 'loop'
      ? <HelpDiagram2026 kind={chapter.secondaryArt} label={chapter.secondaryArtLabel ?? chapter.artLabel} />
      : null}

    {chapter.facts.length > 0 ? <View style={local.facts}>
      <Text style={local.factsTitle}>{text('Les valeurs exactes', 'The exact values')}</Text>
      {chapter.facts.map((fact) => <FactRow key={fact.label} label={fact.label} value={fact.value} icon={fact.icon} />)}
    </View> : null}

    {chapter.note ? <View style={local.note}>
      <GrydIcon name="info" size={18} color={c.accent} />
      <Text style={local.noteText}>{chapter.note}</Text>
    </View> : null}

    {chapter.id === 'saison' ? <View style={local.live}><SeasonStatus /></View> : null}
    {chapter.id === 'faq' ? <FaqBlock fr={fr} /> : null}

    <View style={local.actions}>
      <ProfileButton label={progress.next
        ? text('Suivant', 'Next')
        : text('J’ai compris', 'Got it')}
        onPress={() => progress.next ? go(progress.next) : finish()} />
      {progress.previous ? <Pressable accessibilityRole="button" onPress={() => go(progress.previous!)} style={({ pressed }) => [local.back, pressed && local.pressed]}>
        <GrydIcon name="chevronLeft" size={18} color={c.darkMuted} />
        <Text style={local.backText}>{text('Chapitre précédent', 'Previous chapter')}</Text>
      </Pressable> : null}
    </View>

    <View style={local.doors}>
      {chapter.id === 'terrain' ? <Pressable accessibilityRole="button" onPress={() => router.push('/calcul-zones')} style={({ pressed }) => [local.door, pressed && local.pressed]}>
        <GrydIcon name="layers" size={20} color={c.accent} />
        <Text style={local.doorText}>{text('Le calcul du terrain en détail', 'The terrain calculation in detail')}</Text>
        <GrydIcon name="chevronRight" size={18} color={c.darkMuted} />
      </Pressable> : null}
      {chapter.id === 'crew' ? <Pressable accessibilityRole="button" onPress={() => router.push('/(tabs)/crew')} style={({ pressed }) => [local.door, pressed && local.pressed]}>
        <GrydIcon name="crew" size={20} color={c.accent} />
        <Text style={local.doorText}>{text('Ouvrir mon crew', 'Open my crew')}</Text>
        <GrydIcon name="chevronRight" size={18} color={c.darkMuted} />
      </Pressable> : null}
      {chapter.id === 'faq' ? <>
        <Pressable accessibilityRole="button" onPress={() => router.push('/support')} style={({ pressed }) => [local.door, pressed && local.pressed]}>
          <GrydIcon name="support" size={20} color={c.accent} />
          <Text style={local.doorText}>{text('Aide et signalement', 'Help and reporting')}</Text>
          <GrydIcon name="chevronRight" size={18} color={c.darkMuted} />
        </Pressable>
        {/* « Revoir la découverte » ne disait pas ce qu'on allait voir. Ici, le
            libellé nomme l'écran : les trois pages d'accueil, rien d'autre. */}
        <Pressable accessibilityRole="button" onPress={() => router.push('/onboarding?replay=1')} style={({ pressed }) => [local.door, pressed && local.pressed]}>
          <GrydIcon name="replay" size={20} color={c.accent} />
          <Text style={local.doorText}>{text('Revoir l’écran d’accueil', 'Replay the welcome screen')}</Text>
          <GrydIcon name="chevronRight" size={18} color={c.darkMuted} />
        </Pressable>
      </> : null}
    </View>
  </ProfilePage>;
}

const local = StyleSheet.create({
  masthead: { gap: 14, paddingTop: 10 },
  track: { height: 4, borderRadius: 2, backgroundColor: c.darkSurfaceMuted, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2, backgroundColor: c.accent },
  chips: { paddingRight: 20 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, borderColor: c.darkSurfaceMuted },
  chipOn: { backgroundColor: c.accent, borderColor: c.accent },
  chipStep: { fontFamily: fonts.mono, fontSize: 11, color: c.accent },
  chipStepOn: { color: c.ink }, // sur chartreuse
  chipText: { fontFamily: fonts.textMedium, fontSize: 13, color: c.darkInk },
  chipTextOn: { color: c.ink }, // sur chartreuse
  head: { marginTop: 18, marginBottom: 16, gap: 6 },
  step: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 2, color: c.accent },
  title: { fontFamily: fonts.displayMedium, fontSize: 26, lineHeight: 32, letterSpacing: -0.6, color: c.darkInk },
  interactive: { width: '100%', borderRadius: 24, overflow: 'hidden', backgroundColor: c.darkSurface, padding: 12 },
  lines: { marginTop: 18, gap: 12 },
  line: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.accent, marginTop: 8 },
  facts: { marginTop: 22, borderRadius: 20, backgroundColor: c.darkSurface, paddingHorizontal: 16, paddingVertical: 6 },
  factsTitle: { fontFamily: fonts.textSemi, fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase', color: c.darkMuted, paddingTop: 12, paddingBottom: 4 },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46, borderTopWidth: 1, borderTopColor: c.darkSurfaceMuted },
  factLabel: { flex: 1, fontFamily: fonts.text, fontSize: 13, lineHeight: 18, color: c.darkInk },
  factValue: { fontFamily: fonts.textSemi, fontSize: 14, color: c.accent },
  note: { marginTop: 18, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.darkMuted },
  live: { marginTop: 20 },
  faq: { marginTop: 20, gap: 6 },
  group: { paddingBottom: 6 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 18, paddingBottom: 4 },
  groupRule: { width: 18, height: 2, borderRadius: 1, backgroundColor: c.accent },
  groupTitle: { fontFamily: fonts.displayRegular, fontSize: 17, letterSpacing: -0.3, color: c.darkInk },
  question: { borderBottomWidth: 1, borderBottomColor: c.darkSurfaceMuted },
  questionRow: { flexDirection: 'row', alignItems: 'center', gap: 16, minHeight: 60, paddingVertical: 16 },
  questionText: { flex: 1, fontFamily: fonts.textMedium, fontSize: 15, lineHeight: 21, color: c.darkInk },
  answer: { fontFamily: fonts.text, fontSize: 14, lineHeight: 21, color: c.darkMuted, paddingBottom: 18 },
  actions: { marginTop: 26, gap: 6 },
  back: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  backText: { fontFamily: fonts.textMedium, fontSize: 13, color: c.darkMuted },
  doors: { marginTop: 10 },
  door: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderTopWidth: 1, borderTopColor: c.darkSurfaceMuted },
  doorText: { flex: 1, fontFamily: fonts.textMedium, fontSize: 14, color: c.darkInk },
  pressed: { opacity: 0.65 },
});
