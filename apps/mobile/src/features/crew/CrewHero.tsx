/**
 * GRYD — E13 · HERO D'APPARTENANCE du crew (planche « Crew Home »).
 *
 * La planche demande une bande de 240 pt : PHOTO du crew + overlay progressif,
 * emblème 72 pt par-dessus, nom en display, @tag, puis une ligne meta
 * « ville · #rang · surface km² · N membres ».
 *
 * ─── CE QUI EST RENDU, ET CE QUI NE L'EST PAS ───────────────────────────────
 * · PHOTO : AUCUNE source. `crews` (0002 + 0010/0011/0013) n'a ni `photo_url`
 *   ni `cover_url`, il n'existe aucun upload et aucun bucket. Un « cadre photo
 *   avec placeholder » resterait vide À VIE et promettrait une fonction
 *   inexistante — donc pas de cadre photo : la bande est un bloc graphique
 *   GRYD (surface profonde + filet), et l'identité passe par le blason RÉEL
 *   (déterministe sur l'id du crew) + le nom. Sans photo, il n'y a rien à
 *   assombrir : l'« overlay progressif » disparaît avec elle.
 * · @TAG : la colonne `crews.tag` existe (0011) mais n'est JAMAIS écrite —
 *   `create_crew` ne la renseigne pas, aucune RPC ne l'édite, et `useRealCrew`
 *   ne la lit même pas. Elle vaut `null` pour 100 % des crews réels. L'afficher
 *   voudrait dire la FABRIQUER depuis le nom : omise.
 * · SURFACE km² : aucune aire de crew n'existe. `crew_overview` (0152) n'en
 *   émet pas, et `real.ts` interdit d'en dériver une côté client — le titre
 *   territorial est INDIVIDUEL (migration 0126).
 * · #RANG : RETIRÉ le 10/09/2026. Il se calculait sur `hex_claims`, table
 *   gelée pour toute activité 2026 par 0118 : le rang était un classement de
 *   zéros. Et il ne revient pas sous une autre mesure — un crew ne possède pas
 *   de terrain, il n'y a donc rien à classer. Ce que la section TERRITOIRE dit
 *   à la place est vrai : combien de membres en tiennent.
 *
 * ─── LA LIGNE META NE MONTRE QUE CE QUI A ÉTÉ LU ────────────────────────────
 * Chaque segment n'existe que s'il est connu, et le séparateur « · » est posé
 * ENTRE les segments présents : jamais de « — · — ».
 *
 * La VILLE vient de l'index de villes (référentiel EMBARQUÉ + villes ouvertes
 * lues du serveur). Un identifiant introuvable ⇒ aucun segment ville, jamais un
 * nom deviné.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, fonts, spacing } from '@klaim/shared';
import { CrewCrest } from '../../ui/game/CrewCrest';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/crew';
import { cityEntryLabel, findCityEntry } from '../city/catalog';
import { useCityCatalog } from '../city/useCityCatalog';

export interface CrewHeroProps {
  /** Seed déterministe du blason — l'identifiant serveur du crew. */
  crewId: string;
  crewName: string;
  /** Ville du crew telle que le serveur l'a enregistrée. */
  cityId: string;
  memberCount: number;
  maxMembers: number;
  /**
   * Encoche / barre d'état. La bande MONTE jusqu'en haut de l'écran (c'est ce
   * qui en fait un hero et non une card) : le dégagement du système est donc
   * porté ICI, pas par le padding du ScrollView.
   */
  topInset: number;
}

export function CrewHero({
  crewId,
  crewName,
  cityId,
  memberCount,
  maxMembers,
  topInset,
}: CrewHeroProps) {
  const t = useT();
  // Lecture bornée des villes ouvertes + référentiel embarqué. Le hook n'est
  // monté QUE dans cet écran-là, donc la lecture ne se paie que sur l'onglet
  // Crew d'un joueur qui a réellement un crew.
  const { index } = useCityCatalog();

  const cityName = useMemo(() => {
    const entry = findCityEntry(index, cityId);
    return entry ? cityEntryLabel(entry) : null;
  }, [index, cityId]);

  // Les segments sont assemblés APRÈS filtrage : un segment inconnu ne laisse
  // pas de trou, il n'existe pas.
  const meta: string[] = [];
  if (cityName) meta.push(cityName);
  meta.push(t(C.rlMembersOf, { count: memberCount, max: maxMembers }));

  return (
    <View style={[styles.hero, { paddingTop: topInset + spacing.xxl }]}>
      {/* Emblème 72 pt (CrewCrest `l`) — teinte chartreuse = MON crew (§C :
          couleur par RÔLE, jamais une couleur par crew). */}
      <CrewCrest seed={crewId} name={crewName} size="l" />
      {/* Nom en display. `clip` et non « … » : §A.9 interdit l'ellipse. Deux
          lignes suffisent aux 40 caractères que la DB autorise. */}
      <Text style={styles.name} numberOfLines={2} ellipsizeMode="clip">
        {crewName}
      </Text>
      <Text style={styles.meta}>{meta.join(' · ')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /**
   * PLEIN-BLEED : la bande sort des marges d'écran par marge négative (même
   * patron que `app/badges.tsx` pour ses filtres). Aucune modification de
   * `TabScreen` n'est nécessaire — et n'en a été faite.
   */
  hero: {
    marginHorizontal: -spacing.cardPadding,
    paddingHorizontal: spacing.cardPadding,
    // `paddingTop` est posé à l'usage (encoche incluse).
    paddingBottom: spacing.xl,
    // Surface PROFONDE (N0.5) : la bande se lit comme un en-tête, pas comme une
    // card N1 — les cards de contenu restent le niveau au-dessous.
    backgroundColor: colors.carbonDeep,
    borderBottomWidth: 1,
    borderBottomColor: colors.grisLigne,
    gap: spacing.md,
  },
  name: {
    color: colors.blanc,
    fontFamily: fonts.display,
    fontSize: fontSizes.xl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  meta: {
    color: colors.gris,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    lineHeight: 20,
  },
});
