/**
 * GRYD — E13 · APERÇU CARTO HORIZONTAL du territoire crew (planche « Crew Home »,
 * section TERRITOIRE).
 *
 * La planche montre une bande de zones : celles du crew en chartreuse, une zone
 * marquée « 1 zone vulnérable » en pointillé orange, plus un delta
 * « ▲ +0,8 km² cette semaine ».
 *
 * ─── CE QUI EST RÉEL ICI ────────────────────────────────────────────────────
 * Les secteurs viennent de `crew_mission_inputs` (0049), DÉJÀ chargés pour la
 * mission — aucune lecture supplémentaire, aucune donnée fabriquée. Un secteur
 * n'est rendu que s'il porte un nom RÉEL (reverse-geocode serveur) ET que le
 * crew y tient quelque chose : on ne nomme jamais un quartier soi-même.
 * « Vulnérable » = `expiringSoon`, compté EN BASE dans la fenêtre de defend
 * passée depuis `game-rules` (`CREW_MISSION_WINDOWS`) — aucun seuil ici.
 *
 * ─── CE QUI EST OMIS, ET POURQUOI ───────────────────────────────────────────
 * · GÉOMÉTRIE : `missionSectors` ne porte qu'un nom et des compteurs (0015 garde
 *   `segments`/`opener_ring` côté serveur). Une vignette carto ne pourrait
 *   montrer qu'un fond générique — un décor qui ferait croire à une
 *   localisation. Les zones sont donc des PASTILLES NOMMÉES, pas des polygones.
 * · « ▲ +0,8 km² cette semaine » : aucune source de NET. Aucune table ne garde
 *   les pertes agrégées par semaine, et `crew_overview` n'émet aucune aire. Une
 *   flèche affirme un solde : on ne l'affiche pas.
 *
 * §C — la couleur lit un RÔLE : chartreuse = MON crew. Le liseré ambre pointillé
 * lit un ÉTAT (échéance proche), pas une identité adverse : l'orange rival est
 * réservé à un crew rival, et une de NOS zones qui expire n'en est pas un.
 */
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, gameColors, radii, spacing } from '@klaim/shared';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/crew';
import type { CrewSectorState } from './engine/crewMission';

export interface CrewTerritoryStripProps {
  /** Faits par secteur, tels que `crew_mission_inputs` les a rendus. */
  sectors: readonly CrewSectorState[];
}

export function CrewTerritoryStrip({ sectors }: CrewTerritoryStripProps) {
  const t = useT();
  // Un secteur sans nom n'est pas montrable (on n'invente pas de quartier), et
  // un secteur où le crew ne tient rien n'appartient pas à cette bande.
  const held = sectors.filter((s) => s.sectorName !== null && s.heldTotal > 0);
  if (held.length === 0) return null;

  // Total de zones RÉELLEMENT menacées (compté serveur), pas de secteurs.
  const vulnerable = held.reduce((n, s) => n + Math.max(0, s.expiringSoon), 0);

  return (
    <View style={styles.root}>
      {/* Bande plein-bleed : on FAIT DÉFILER, on ne tronque jamais un nom de
          quartier (§A.9 — patron des filtres de `app/badges.tsx`). */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
      >
        {held.map((s, i) => {
          const atRisk = s.expiringSoon > 0;
          return (
            <View
              key={s.sectorId ?? `${s.sectorName}-${i}`}
              style={[styles.zone, atRisk ? styles.zoneAtRisk : styles.zoneHeld]}
            >
              <Text style={styles.zoneName}>{s.sectorName}</Text>
            </View>
          );
        })}
      </ScrollView>

      {vulnerable > 0 ? (
        <Text style={styles.vulnerable}>
          {vulnerable === 1 ? t(C.vulnerableOne) : t(C.vulnerableN, { n: vulnerable })}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  strip: { marginHorizontal: -spacing.cardPadding },
  stripContent: { paddingHorizontal: spacing.cardPadding, gap: spacing.xs },
  zone: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 1,
    backgroundColor: colors.carbone,
  },
  /** Tenu par MON crew → chartreuse (rôle « moi »), sur fond sombre. */
  zoneHeld: { borderColor: colors.chartreuse40 },
  /**
   * Échéance proche → liseré AMBRE POINTILLÉ (`gameColors.warn` = avertissement
   * non bloquant). Sur Android, un pointillé combiné à un rayon retombe en
   * trait plein : l'information reste portée par la couleur ET par la ligne
   * « N zones vulnérables » en dessous, jamais par le seul motif.
   */
  zoneAtRisk: { borderColor: gameColors.warn, borderStyle: 'dashed' },
  zoneName: { color: colors.blanc, fontSize: fontSizes.sm },
  vulnerable: {
    color: gameColors.warn,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
  },
});
