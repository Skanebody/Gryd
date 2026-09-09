import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { fonts, refonteColors as c } from '@klaim/shared';
import { screen } from '../src/lib/analytics';
import { ProfileLink, ProfilePage, ProfileSection, s, useRefonteCopy } from '../src/features/refonte/ProfilePrimitives';

export default function TerritoryExplanation() {
  const copy = useRefonteCopy();
  useEffect(() => { screen('calcul_zones'); }, []);
  return <ProfilePage title={copy('Comment ça marche', 'How it works')} back>
    <Text style={s.kicker}>{copy('Une sortie. Une histoire.', 'One outing. Your story.')}</Text>
    <Text style={[s.title, { marginTop: 12 }]}>{copy('Ta trace.\nTon terrain.', 'Your route.\nYour terrain.')}</Text>
    <View style={local.art} accessible={false}><Svg width="100%" height={200} viewBox="0 0 320 200"><Path d="m60 149 11-86 89-31 86 40-14 87-96 12Z" fill={c.surfaceMuted} /><Path d="m60 149 11-86 89-31 86 40-14 87-96 12-76-22" stroke={c.forest} strokeWidth={12} strokeLinejoin="round" strokeLinecap="round" fill="none" /><Path d="m60 149 11-86 89-31 86 40-14 87-96 12-76-22" stroke={c.accent} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" fill="none" /></Svg></View>
    <ProfileSection title={copy('01 · Enregistre ta sortie', '01 · Record your outing')} />
    <Text style={s.body}>{copy('Cours ou roule sur ton parcours habituel. Ta trace raconte le déplacement réellement enregistré. Une sortie ouverte garde sa place dans ton journal, avec sa distance, sa durée et son souvenir.', 'Run or ride your usual route. Your trace shows the movement actually recorded. An open route still belongs in your journal, with its distance, duration and memory.')}</Text>
    <ProfileSection title={copy('02 · Une vraie boucle', '02 · A real loop')} />
    <Text style={s.body}>{copy('Une partie continue de ta trace revient près d’un point déjà parcouru : elle peut former une boucle. Le serveur vérifie la fermeture, la précision du GPS et la géométrie. Une pause ou un trou GPS ne sont jamais refermés par une ligne inventée.', 'A continuous part of your route comes back near a point you already passed: it may form a loop. The server checks closure, GPS accuracy and geometry. A pause or GPS gap is never closed with an invented line.')}</Text>
    <ProfileSection title={copy('03 · Un impact confirmé', '03 · Confirmed impact')} />
    <Text style={s.body}>{copy('Une boucle admissible peut prendre du terrain dans sa discipline. Course et vélo ont leurs cartes de possession séparées. Le nouveau terrain est la partie que tu ne possédais pas déjà : les surfaces superposées ne comptent jamais deux fois.', 'An eligible loop can capture terrain in its sport. Running and cycling have separate ownership maps. New terrain is the part you did not already own: overlapping areas are never counted twice.')}</Text>
    <ProfileSection title={copy('04 · L’histoire reste', '04 · Your story stays')} />
    <Text style={s.body}>{copy('Une boucle plus récente peut reprendre la partie de terrain qu’elle recouvre. L’ordre vient du moment réel de fermeture validé, pas du moment où tu appuies sur Terminer. Tu gardes ta sortie, ton empreinte et tes XP, même lorsque le terrain change de propriétaire.', 'A newer loop can retake the terrain it overlaps. The order follows the validated physical closing time, not when you tap Finish. You keep your activity, footprint and XP even when terrain changes owner.')}</Text>
    <ProfileSection title={copy('Et la confidentialité ?', 'What about privacy?')} />
    <Text style={s.body}>{copy('Une boucle qui expose une zone protégée reste privée par défaut. Une trace privée ne reprend pas de terrain public. Vérifie toujours le rendu avant de partager un souvenir.', 'A loop that exposes a protected area stays private by default. A private route does not retake public terrain. Always check the preview before sharing a memory.')}</Text>
    <Text style={[s.meta, { marginTop: 20 }]}>{copy('Un résultat en attente n’annonce pas encore de capture. La sauvegarde de ta séance et la décision territoriale sont deux étapes distinctes.', 'A pending result does not announce a capture yet. Saving your activity and deciding its territorial impact are separate steps.')}</Text>
    <ProfileLink title={copy('Toutes les questions', 'All your questions')} icon="aide" onPress={() => router.push('/faq')} />
  </ProfilePage>;
}
const local = StyleSheet.create({ art: { marginTop: 20 }, label: { fontFamily: fonts.text, color: c.muted } });
