import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { fonts } from '@klaim/shared';
import { GrydIcon } from './GrydIcon';
import { GrydMark } from './GrydMark';
import { RewardEmblem } from './RewardEmblem';
import { EMBLEM_ARTWORK, REWARD_VARIANTS } from './emblems';
import { GRYD_GLYPHS, type GrydIconName } from './glyphs';
import { grydGraphicColors as c } from './palette';

/** Internal component sheet; deliberately has no public route or entitlement controls. */
export function GrydDesignBoard() {
  return <ScrollView style={s.root} contentContainerStyle={s.content}>
    <View style={s.header}><GrydMark variant="wordmark" size={22} color={c.white} /><Text style={s.code}>IDENTITÉ GRAPHIQUE / 03</Text></View>
    <Text style={s.title}>Une identité de terrain.</Text><Text style={s.note}>Logo d’origine, signes de sport et patches vectoriels. Aperçus de création, sans attribution de récompense.</Text>
    <View style={s.rewards}>{REWARD_VARIANTS.map((variant, i) => <View key={variant} style={s.reward}>
      <RewardEmblem variant={variant} size={176} tone="accent" state="preview" serial={`GRYD / ${String(i + 1).padStart(2, '0')}`} />
      <Text style={s.label}>{EMBLEM_ARTWORK[variant].label}</Text>
      <View style={s.sizes}><RewardEmblem variant={variant} size={32} /><RewardEmblem variant={variant} size={72} state="locked" /><GrydIcon name="loop" color={c.silver} size={20} /></View>
    </View>)}</View>
    <Text style={s.section}>Des signes pour bouger.</Text>
    <View style={s.icons}>{(Object.keys(GRYD_GLYPHS) as GrydIconName[]).map(name => <View key={name} style={s.icon}>
      <GrydIcon name={name} color={c.white} size={24} /><Text style={s.iconName}>{name}</Text>
    </View>)}</View>
    <View style={s.light}><GrydMark size={56} /><GrydMark variant="wordmark" size={32} /><RewardEmblem variant="origin" size={112} tone="accent" /></View>
  </ScrollView>;
}
const s = StyleSheet.create({
  root: { backgroundColor: c.black }, content: { padding: 32, gap: 24 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }, code: { fontFamily: fonts.mono, color: c.silver, fontSize: 10, letterSpacing: 2 }, title: { fontFamily: fonts.text, color: c.white, fontSize: 27, letterSpacing: -.5 }, note: { fontFamily: fonts.text, color: c.silver, fontSize: 13 }, rewards: { flexDirection: 'row', flexWrap: 'wrap', gap: 28 }, reward: { width: 176, alignItems: 'center', gap: 12 }, label: { color: c.pearl, fontFamily: fonts.text, fontSize: 15 }, sizes: { flexDirection: 'row', gap: 16, alignItems: 'center' }, section: { color: c.white, fontFamily: fonts.text, fontSize: 22, marginTop: 24, letterSpacing: -.4 }, icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, icon: { width: 100, height: 84, alignItems: 'center', justifyContent: 'center', gap: 14 }, iconName: { color: c.silver, fontFamily: fonts.mono, fontSize: 8 }, light: { backgroundColor: c.white, borderRadius: 24, padding: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', flexWrap: 'wrap', gap: 24 },
});
