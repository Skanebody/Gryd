/**
 * GRYD — CLASSEMENT PAR ZONE (AMENDEMENT-31 §3, [P1]). L'emprunt Strava —
 * segment + KOM/QOM, rendu GRYD : chaque zone a son palmarès (TOP CONQUÉRANTS +
 * TOP DÉFENSEURS), un hook compétitif et une « raison de revenir ».
 *
 * ─── CE QU'IL RESTE, ET POURQUOI (21/07/2026) ───────────────────────────────
 * AUCUN classement de zone RÉEL n'existe : il n'y a ni table, ni RPC, ni vue qui
 * l'agrège. Le composant rendait `DEFAULT_ZONE_LEADERBOARD` — MARIE_K, NIGHT
 * PACERS, « 12 défenses » : des coureurs qui n'existent pas, en tête d'un
 * palmarès présenté comme celui de MA zone. C'était le « classement de joueurs
 * inventés » que la charte qualifie de bug bloquant. Ce matin il avait été mis
 * derrière `isShowcasePlatform` ; la vitrine étant abandonnée, la branche a
 * disparu — avec elle le basculement Conquérants/Défenseurs, les lignes de
 * palmarès et leurs libellés français codés en dur.
 *
 * Le composant NE REND PAS `null` pour autant : la section dirait alors le vide
 * par un TROU, et un trou se lit comme un écran cassé. Elle garde son TITRE et
 * explique en une phrase pourquoi il n'y a rien encore — sans CTA (courir est
 * l'action, la nav la porte déjà ; §A.4 : un seul CTA chartreuse par écran).
 *
 * Le jour où une agrégation serveur existe, le palmarès revient ICI, avec ses
 * props de données — et pas depuis `leaderboardDemo.ts`.
 *
 * ─── LA SECTION DIT LE MONDE QU'ELLE REGARDE (26/07/2026, vélo réel) ────────
 * Elle rendait la ligne d'absence SANS CONDITION : « Aucun classement tant que
 * personne n'a COURU ici. » Or son seul hôte, `/territoire`, porte le
 * commutateur de discipline et affiche « À vélo » quatre blocs plus haut — la
 * page se contredisait donc elle-même. `activity` est OBLIGATOIRE : un défaut
 * ferait retomber en silence sur la course, ce qui est le bug lui-même. Le
 * TITRE, lui, ne se décline pas : « CLASSEMENT DE ZONE » ne nomme aucun effort,
 * et le dupliquer à l'identique créerait deux vérités à maintenir.
 *
 * §A : section COMPACTE, pas de card-dans-card, texte court jamais tronqué.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, type Activity } from '@klaim/shared';
import { C } from '../../i18n/catalog/map';
import { zoneBoardEmptyEntry } from './zoneBoardCopy';
import { useT } from '../../i18n/store';

export function ZoneLeaderboard({ activity }: { activity: Activity }) {
  const t = useT();
  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={styles.title}>{t(C.zoneBoardTitle)}</Text>
      </View>
      <Text style={styles.emptyLine}>{t(zoneBoardEmptyEntry(activity))}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 },
  head: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    color: colors.gris,
    fontSize: fontSizes.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  // État vide : la phrase remplace le palmarès (pas un trou, pas un « 0 » nu).
  emptyLine: { color: colors.gris, fontSize: fontSizes.xs, fontWeight: '600', lineHeight: 18 },
});
