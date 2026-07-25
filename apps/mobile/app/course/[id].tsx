/**
 * GRYD — DÉTAIL D'UNE COURSE (/course/[id]).
 *
 * ─── CE QUE CET ÉCRAN SAIT FAIRE AUJOURD'HUI : RIEN, ET IL LE DIT ───────────
 * ⚠ IL N'EXISTE AUCUNE LECTURE D'UNE COURSE PAR IDENTIFIANT (O1). Ni requête,
 * ni RPC : lire `runs` filtrée par id (policy `runs_select_own`, jamais un
 * autre coureur) reste à écrire. Cet écran ne peut donc RIEN afficher d'une
 * course — et il n'est atteignable que par deep link : aucune route de l'app
 * ne le pousse (vérifié : zéro référent).
 *
 * ─── ORDRE DE COMPOSITION ───────────────────────────────────────────────────
 *   1. `StackScreen` : retour + titre de barre ;
 *   2. la card d'état NOMMÉE : ce que GRYD ne sait pas encore faire ;
 *   3. l'unique CTA chartreuse — vers l'historique, là où les courses SONT.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI (25/07/2026) ──────────────────────────
 * · ~500 LIGNES DE RENDU MORT : bloc effort héro, pastille Verify, scène 2D/3D
 *   du parcours, bloc de refus, mini-carte avant/après, détail du calcul,
 *   segments, trois CTA. Tout cela était COMPILÉ mais jamais exécuté — le seam
 *   de lecture renvoyait `undefined` sans condition, donc le rendu s'arrêtait
 *   toujours à l'état vide. Garder des centaines de lignes qui ne s'exécutent
 *   jamais garantit qu'elles divergeront de la refonte, en silence.
 * · LES IMPORTS DE DÉMO qui allaient avec : `runTrace`, les types de
 *   `history/demo`, et surtout `BOUCLE_REPUBLIQUE` / `BOUCLE_BASTILLE`. Leur
 *   présence mettait la réactivation de la boucle République de démo à un tap
 *   de distance, sur un écran atteignable par lien externe.
 * · LA PROPRIÉTÉ `id` DE L'EVENT `screen('course_detail')`. Elle transmettait à
 *   l'analytique la chaîne BRUTE reçue en deep link — donc un identifiant
 *   interne de course quand il y en aura un, et n'importe quoi d'autre en
 *   attendant, puisque l'URL est fabriquée par l'extérieur. Le suivi
 *   automatique d'écran normalise déjà `/course/<uuid>` en `/course/[id]`
 *   (`lib/screenName.ts`) : la propriété n'ajoutait aucune mesure, seulement
 *   une fuite possible.
 * · LE TEXTE « Cette course n'est pas dans ton historique. Tes courses
 *   apparaîtront ici après ta première sortie enregistrée. » Servi tel quel, il
 *   NIE l'historique d'un joueur qui a peut-être des dizaines de courses. La
 *   seule chose vraie est que le détail n'existe pas encore : c'est ce que
 *   l'écran dit maintenant.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ────────────────────────────────────────────
 * · TOUT le corps de la planche est absent (effort, parcours, impact, calcul,
 *   segments, partage). Raison technique : aucune lecture d'une course par id
 *   (O1). On ne stylise pas un écran mort : le peindre le rendrait crédible.
 *   Il reviendra AVEC sa donnée, pas avant.
 * · IL N'Y A PAS DE QUATRIÈME ÉTAT (patron `qr.tsx`) : rien n'est lu au réseau
 *   ici, donc ni « chargement », ni « échec de lecture ». Il n'y a qu'une
 *   situation, et elle est vraie hors ligne comme en ligne.
 */
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors, fontSizes, spacing, typography } from '@klaim/shared';
import { screen } from '../../src/lib/analytics';
import { Button } from '../../src/ui/Button';
import { Card } from '../../src/ui/Card';
import { StackScreen } from '../../src/ui/StackScreen';
import { useT } from '../../src/i18n/store';
import { C } from '../../src/i18n/catalog/historique';

export default function CourseDetailScreen() {
  const t = useT();

  useEffect(() => {
    // Sans propriété : l'identifiant vient d'une URL externe, et le suivi
    // automatique normalise déjà le chemin en `/course/[id]`.
    screen('course_detail');
  }, []);

  return (
    <StackScreen title={t(C.runFallbackTitle)} icon="historique" backHref="/historique">
      <Card style={styles.state}>
        <Text style={styles.stateTitle}>{t(C.runDetailPendingTitle)}</Text>
        <Text style={styles.stateBody}>{t(C.runDetailPendingBody)}</Text>
        <View style={styles.stateCta}>
          <Button
            label={t(C.runDetailPendingCta)}
            size="md"
            analyticsId="course_detail_to_history"
            onPress={() => router.replace('/historique')}
          />
        </View>
      </Card>
    </StackScreen>
  );
}

const styles = StyleSheet.create({
  // `Card` fournit la surface N1, le rayon et le padding — SANS contour.
  state: { gap: spacing.xs, marginTop: spacing.md },
  stateTitle: { ...typography.cardTitle, color: colors.blanc },
  stateBody: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: fontSizes.sm * 1.5 },
  stateCta: { marginTop: spacing.sm },
});
