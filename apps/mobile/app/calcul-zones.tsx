/**
 * GRYD — `/calcul-zones` : le calcul du terrain, EN DÉTAIL.
 *
 * ─── CE QUI A CHANGÉ LE 10/09/2026, ET POURQUOI ─────────────────────────────
 * Cette page est désormais le SECOND niveau du guide « Comment ça marche » :
 * le chapitre 03 y renvoie quand on veut la mécanique complète. Elle garde donc
 * son texte, qui était juste, et perd ce qui la rendait illisible.
 *
 * LA CAUSE RACINE, MESURÉE. `ProfilePage` a deux tonalités. En tonalité SOMBRE
 * (le défaut, fond `refonteColors.carbon` #0A0A0A), le dessin d'en-tête était
 * peint avec les jetons de la tonalité CLAIRE : `fill={c.surfaceMuted}`
 * (#EBEBEB, une tache blanche) et `stroke={c.forest}` (#151515, invisible sur
 * le fond). Le même défaut d'aiguillage vidait `/faq` de son texte. Les jetons
 * de tonalité sont désormais ceux de la page : `mapTokens.mineFill` pour la
 * surface possédée, `c.carbon` pour l'ombre du trait, `c.accent` pour la trace.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { fonts, mapTokens, refonteColors as c } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { GrydIcon } from '../src/ui/gryd';
import { ProfileLink, ProfilePage, s, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';
import { useLocale } from '../src/i18n/store';
import { helpFacts2026, say } from '../src/features/help/helpFacts2026';
import { HELP_GRID_PATH, HELP_OWNED_D, HELP_OWNED_HATCH, HELP_TERRITORY_D } from '../src/features/help/helpArt2026';

/** Le numéro d'étape en chartreuse, le titre en blanc : la couleur sert de repère. */
function Step({ index, title }: { index: number; title: string }) {
  return <View style={local.step}>
    <Text style={local.stepNumber}>{String(index).padStart(2, '0')}</Text>
    <Text accessibilityRole="header" style={local.stepTitle}>{title}</Text>
  </View>;
}

function Threshold({ label, value }: { label: string; value: string }) {
  return <View style={local.threshold} accessible accessibilityLabel={`${label} : ${value}`}>
    <Text style={local.thresholdLabel}>{label}</Text>
    <Text style={local.thresholdValue}>{value}</Text>
  </View>;
}

export default function TerritoryExplanation() {
  const copy = useRefonteCopy();
  const fr = useLocale() !== 'en';
  const f = helpFacts2026(fr);
  useEffect(() => { screen('calcul_zones'); }, []);
  return <ProfilePage title={copy('Le calcul du terrain', 'How terrain is calculated')} back backHref="/comment-ca-marche">
    <Text style={s.kicker}>{copy('Une sortie. Une histoire.', 'One outing. Your story.')}</Text>
    <Text style={[s.title, { marginTop: 12 }]}>{copy('Ta trace.\nTon terrain.', 'Your route.\nYour terrain.')}</Text>
    <View style={local.art} accessibilityRole="image" accessibilityLabel={copy(
      'Schéma : la surface d’une boucle remplie en chartreuse, et la part déjà possédée montrée en hachures.',
      'Diagram: the area of a loop filled in chartreuse, with the part already owned shown in hatching.')}>
      <Svg aria-hidden width="100%" height={180} viewBox="0 0 320 180">
        <Path d={HELP_GRID_PATH} stroke={c.darkSurfaceMuted} strokeWidth={1} fill="none" />
        <Path d={HELP_TERRITORY_D} fill={mapTokens.mineFill} stroke="none" />
        <Path d={HELP_TERRITORY_D} fill="none" stroke={c.carbon} strokeWidth={9} strokeLinejoin="round" />
        <Path d={HELP_TERRITORY_D} fill="none" stroke={c.accent} strokeWidth={3} strokeLinejoin="round" />
        <G>
          <Path d={HELP_OWNED_D} fill={c.carbon} fillOpacity={0.55} stroke={c.darkInk} strokeWidth={1} strokeDasharray="4 4" />
          {HELP_OWNED_HATCH.map(([a, b], index) => <Path key={index} d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`} stroke={c.darkInk} strokeWidth={1.4} opacity={0.7} />)}
        </G>
        <Circle cx={52} cy={130} r={7} fill={c.carbon} stroke={c.darkInk} strokeWidth={1.5} />
      </Svg>
    </View>

    <Step index={1} title={copy('Enregistre ta sortie', 'Record your outing')} />
    <Text style={s.body}>{copy('Cours ou roule sur ton parcours habituel. Ta trace raconte le déplacement réellement enregistré. Une sortie ouverte garde sa place dans ton journal, avec sa distance, sa durée et son souvenir.', 'Run or ride your usual route. Your trace shows the movement actually recorded. An open route still belongs in your journal, with its distance, duration and memory.')}</Text>

    <Step index={2} title={copy('Une vraie boucle', 'A real loop')} />
    <Text style={s.body}>{copy('Une partie continue de ta trace revient près d’un point déjà parcouru : elle peut former une boucle. Le serveur vérifie la fermeture, la précision du GPS et la géométrie. Une pause ou un trou GPS ne sont jamais refermés par une ligne inventée.', 'A continuous part of your route comes back near a point you already passed: it may form a loop. The server checks closure, GPS accuracy and geometry. A pause or GPS gap is never closed with an invented line.')}</Text>
    <View style={local.thresholds}>
      <Threshold label={copy('Écart de fermeture, à pied', 'Closing gap, running')} value={say(f.closureGapRun)} />
      <Threshold label={copy('Écart de fermeture, à vélo', 'Closing gap, cycling')} value={say(f.closureGapBike)} />
      <Threshold label={copy('Longueur minimale, à pied', 'Minimum length, running')} value={say(f.minLoopRun)} />
      <Threshold label={copy('Longueur minimale, à vélo', 'Minimum length, cycling')} value={say(f.minLoopBike)} />
      <Threshold label={copy('Précision attendue aux deux bouts', 'Accuracy expected at both ends')} value={say(f.endpointAccuracy)} />
    </View>

    <Step index={3} title={copy('Un impact confirmé', 'Confirmed impact')} />
    <Text style={s.body}>{copy('Une boucle admissible peut prendre du terrain dans sa discipline. Course et vélo ont leurs cartes de possession séparées. Le nouveau terrain est la partie que tu ne possédais pas déjà : les surfaces superposées ne comptent jamais deux fois.', 'An eligible loop can capture terrain in its sport. Running and cycling have separate ownership maps. New terrain is the part you did not already own: overlapping areas are never counted twice.')}</Text>
    <View style={local.thresholds}>
      <Threshold label={copy('Surface minimale, à pied', 'Minimum area, running')} value={say(f.minAreaRun)} />
      <Threshold label={copy('Surface minimale, à vélo', 'Minimum area, cycling')} value={say(f.minAreaBike)} />
      <Threshold label={copy('Publication après la fin', 'Published after the end')} value={say(f.publicationDelay)} />
      <Threshold label={copy('Délai pour envoyer la sortie', 'Time allowed to send the outing')} value={say(f.receiptMaxAge)} />
    </View>

    <Step index={4} title={copy('L’histoire reste', 'Your story stays')} />
    <Text style={s.body}>{copy('Une boucle plus récente peut reprendre la partie de terrain qu’elle recouvre. L’ordre vient du moment réel de fermeture validé, pas du moment où tu appuies sur Terminer. Tu gardes ta sortie, ton empreinte et tes XP, même lorsque le terrain change de propriétaire.', 'A newer loop can retake the terrain it overlaps. The order follows the validated physical closing time, not when you tap Finish. You keep your activity, footprint and XP even when terrain changes owner.')}</Text>

    <Step index={5} title={copy('Et la confidentialité ?', 'What about privacy?')} />
    <Text style={s.body}>{copy('Une boucle qui expose une zone protégée reste privée par défaut. Une trace privée ne reprend pas de terrain public. Vérifie toujours le rendu avant de partager un souvenir.', 'A loop that exposes a protected area stays private by default. A private route does not retake public terrain. Always check the preview before sharing a memory.')}</Text>

    <View style={local.note}>
      <GrydIcon name="info" size={18} color={c.accent} />
      <Text style={local.noteText}>{copy('Un résultat en attente n’annonce pas encore de capture. La sauvegarde de ta séance et la décision territoriale sont deux étapes distinctes.', 'A pending result does not announce a capture yet. Saving your activity and deciding its territorial impact are separate steps.')}</Text>
    </View>

    <ProfileLink title={copy('Revenir au guide', 'Back to the guide')} grydIcon="mechanics" onPress={() => router.push('/comment-ca-marche?chapitre=terrain')} />
    <ProfileLink title={copy('Questions fréquentes', 'Frequently asked questions')} grydIcon="faq" onPress={() => router.push('/faq')} />
  </ProfilePage>;
}

const local = StyleSheet.create({
  art: { marginTop: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: c.darkSurface, paddingVertical: 4 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 26, marginBottom: 10 },
  stepNumber: { fontFamily: fonts.mono, fontSize: 12, letterSpacing: 1.5, color: c.accent },
  stepTitle: { flex: 1, fontFamily: fonts.displayRegular, fontSize: 18, letterSpacing: -0.3, color: c.darkInk },
  thresholds: { marginTop: 14, borderRadius: 20, backgroundColor: c.darkSurface, paddingHorizontal: 16 },
  threshold: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 46 },
  thresholdLabel: { flex: 1, fontFamily: fonts.text, fontSize: 13, lineHeight: 18, color: c.darkInk },
  thresholdValue: { fontFamily: fonts.textSemi, fontSize: 14, color: c.accent },
  note: { marginTop: 24, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noteText: { flex: 1, fontFamily: fonts.text, fontSize: 13, lineHeight: 19, color: c.darkMuted },
});
