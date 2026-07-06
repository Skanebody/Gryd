/**
 * GRYD — CLASSEMENT PAR ZONE (AMENDEMENT-31 §3, [P1]). L'emprunt Strava tenu :
 * le segment + KOM/QOM, rendu GRYD. Chaque zone/secteur a son palmarès —
 * TOP CONQUÉRANTS + TOP DÉFENSEURS — ce qui donne un hook compétitif et une
 * « raison de revenir » sur un lieu précis (dernière ligne « comeback »).
 *
 * §A (checklist) : classement COMPACT (lignes légères, séparées par l'espace),
 * PAS de card-dans-card — le composant est UNE section de /territoire, aucun
 * container encadré autour des lignes ; contour réservé à la ligne « moi »
 * (état actif, §A3). UN seul basculement (Conquérants ⇄ Défenseurs) = un seul
 * palmarès visible à la fois (§A1/A2 : 1 décision, ne jamais tout montrer). Top 3
 * visible + « Voir tout » (§A6). Textes courts jamais tronqués (§A9).
 *
 * Charte : couleur PAR RÔLE via roleColor (mine=chartreuse, ally, rival, neutral)
 * portée par une pastille + la forme (jamais la couleur seule — daltonisme) ;
 * couronne sur le #1 ; jamais de chartreuse sur fond clair. ANTI-SHAME : que du
 * positif (conquêtes/défenses réussies), le hook invite, il n'humilie pas.
 * ANTI PAY-TO-WIN : un rang ne s'obtient qu'en courant — rien à acheter ici.
 * Reduce motion : aucune animation (rendu statique). Haptique légère au switch.
 */
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, roleColor } from '@klaim/shared';
import { haptics } from '../../lib/haptics';
import { Icon } from '../../ui/Icon';
import type { LeaderboardEntry, ZoneLeaderboard as ZoneLeaderboardData } from './leaderboardDemo';

type Board = 'conquerors' | 'defenders';

/** Une ligne de palmarès : rang · pastille de rôle · nom (+crew) · valeur. */
function Row({ entry, top }: { entry: LeaderboardEntry; top: boolean }) {
  const tint = roleColor(entry.role);
  return (
    <View
      style={[styles.row, entry.me && styles.rowMe]}
      accessibilityRole="text"
      accessibilityLabel={`Rang ${entry.rank} — ${entry.runner}, ${entry.crew}, ${entry.value}${
        entry.me ? ' — toi' : ''
      }`}
    >
      {/* Rang — couronne au #1, chiffre ensuite (repère, jamais couleur seule). */}
      <View style={styles.rankBox}>
        {top ? (
          <Icon name="couronne" size={16} color={colors.chartreuse} />
        ) : (
          <Text style={styles.rankNum}>{entry.rank}</Text>
        )}
      </View>

      {/* Pastille de rôle = FORME + couleur (daltonisme : jamais la teinte seule). */}
      <View style={[styles.dot, { backgroundColor: tint }]} accessible={false} />

      {/* Nom + crew (court, non tronqué). */}
      <View style={styles.who}>
        <Text style={styles.name} numberOfLines={1}>
          {entry.runner}
          {entry.me ? ' · toi' : ''}
        </Text>
        <Text style={styles.crew} numberOfLines={1}>
          {entry.crew}
        </Text>
      </View>

      {/* Valeur (conquêtes / défenses — que du positif). */}
      <Text style={styles.value}>{entry.value}</Text>
    </View>
  );
}

export function ZoneLeaderboard({ data }: { data: ZoneLeaderboardData }) {
  const [board, setBoard] = useState<Board>('conquerors');

  const switchTo = (next: Board) => {
    if (next === board) return;
    haptics.light(); // « réaction » (doc §25) — no-op sur web / si opt-out.
    setBoard(next);
  };

  const entries = board === 'conquerors' ? data.conquerors : data.defenders;
  const visible = entries.slice(0, 3);
  const hasMore = entries.length > 3;

  return (
    <View style={styles.wrap}>
      {/* En-tête : titre + zone (contexte, non tronqué). */}
      <View style={styles.head}>
        <Text style={styles.title}>CLASSEMENT DE LA ZONE</Text>
        <Text style={styles.zone}>{data.zone}</Text>
      </View>

      {/* Bascule Conquérants ⇄ Défenseurs — un seul palmarès à la fois (§A1). */}
      <View style={styles.tabs}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: board === 'conquerors' }}
          accessibilityLabel="Top conquérants"
          onPress={() => switchTo('conquerors')}
          hitSlop={6}
          style={styles.tab}
        >
          <Icon
            name="cible"
            size={15}
            color={board === 'conquerors' ? colors.chartreuse : colors.gris}
          />
          <Text style={[styles.tabLabel, board === 'conquerors' && styles.tabLabelOn]}>
            Conquérants
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: board === 'defenders' }}
          accessibilityLabel="Top défenseurs"
          onPress={() => switchTo('defenders')}
          hitSlop={6}
          style={styles.tab}
        >
          <Icon
            name="bouclier"
            size={15}
            color={board === 'defenders' ? colors.chartreuse : colors.gris}
          />
          <Text style={[styles.tabLabel, board === 'defenders' && styles.tabLabelOn]}>
            Défenseurs
          </Text>
        </Pressable>
      </View>

      {/* Palmarès — lignes légères séparées par l'espace (pas de card-dans-card). */}
      <View style={styles.list}>
        {visible.map((e) => (
          <Row key={`${board}-${e.runner}`} entry={e} top={e.rank === 1} />
        ))}
      </View>

      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Voir tout le classement — ${data.zone}`}
          hitSlop={8}
          style={({ pressed }) => [styles.seeAllRow, pressed && styles.pressed]}
        >
          <Text style={styles.seeAll}>Voir tout</Text>
        </Pressable>
      ) : null}

      {/* Hook « raison de revenir » (emprunt Strava) — invitation, jamais honte. */}
      <View style={styles.comeback}>
        <Icon name="serie" size={15} color={colors.chartreuse} />
        <Text style={styles.comebackText}>{data.comeback}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 22 },
  pressed: { opacity: 0.7 },

  // En-tête
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
  zone: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '700' },

  // Bascule (Conquérants / Défenseurs)
  tabs: { flexDirection: 'row', gap: 20, marginBottom: 6 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  tabLabel: { color: colors.gris, fontSize: fontSizes.sm, fontWeight: '600' },
  tabLabelOn: { color: colors.blanc, fontWeight: '700' },

  // Liste (aucun container encadré — l'espace sépare, §A3)
  list: { marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
  },
  // Seule exception au « pas de contour » : MA ligne (état actif, §A3).
  rowMe: {
    backgroundColor: colors.carbone,
    borderWidth: 1,
    borderColor: colors.grisLigne,
  },
  rankBox: { width: 22, alignItems: 'center', justifyContent: 'center' },
  rankNum: {
    color: colors.gris,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 10, marginRight: 12 },
  who: { flex: 1 },
  name: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
  crew: { color: colors.gris, fontSize: fontSizes.xs, marginTop: 1 },
  value: {
    color: colors.blanc,
    fontSize: fontSizes.sm,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },

  // Voir tout
  seeAllRow: { paddingVertical: 8, paddingHorizontal: 6 },
  seeAll: { color: colors.chartreuse, fontSize: fontSizes.xs, fontWeight: '700' },

  // Hook « raison de revenir »
  comeback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingHorizontal: 6,
  },
  comebackText: { flex: 1, color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },
});
