/**
 * GRYD — E46 « MEMBRES ET RÔLES » : le roster rangé en TROIS GROUPES.
 *
 * ─── CE QUI EXISTAIT, ET CE QUI MANQUAIT (audit du 28/07/2026) ───────────────
 * L'onglet « Membres » de `RealCrewScreen` rendait une LISTE PLATE, triée par
 * ancienneté, chaque ligne portant pseudo + rôle + part de territoire + un
 * « ··· » de modération. C'était juste, mais ce n'était pas E46 : la spéc
 * (l.1652-1657) range le roster en CHEF / OFFICIERS / MEMBRES, et cette
 * hiérarchie n'apparaissait nulle part — un fondateur et un rookie se
 * distinguaient par une petite ligne grise de six caractères.
 *
 * Ce composant reprend EXACTEMENT le rendu de ligne existant (pseudo qui
 * s'ellipse en `clip`, membre bloqué en gris italique, « toi », part masquée
 * quand elle vaut zéro) et n'ajoute que ce que la spéc demande : les trois
 * en-têtes, l'état « aucun officier » dit plutôt que masqué, et la phrase
 * anti-pay-to-win. Rien du rendu antérieur n'a été jeté.
 *
 * ─── LES GROUPES NE SONT PAS UN CLASSEMENT DE PUISSANCE ──────────────────────
 * `CREW_ROLE_GROUPS` (game-rules) LIT la matrice `CREW_PERMISSIONS` : un
 * officier est un rôle qui décide POUR LES AUTRES, un membre est un rôle qui
 * propose. Aucun des deux ne capture mieux — et la phrase `grpNoAdvantage` le
 * dit À L'ÉCRAN, pas seulement dans un commentaire (spéc l.1677).
 *
 * ─── VIE PRIVÉE (constitution §7) ────────────────────────────────────────────
 * Une ligne porte : un pseudo, un rôle, une PART de territoire du crew. Jamais
 * une position, jamais un horaire, jamais un tracé, jamais une date de dernière
 * course. « Dernière contribution formulée de manière neutre » (spéc l.1663)
 * n'est pas rendue ici : `crew_overview` (0044) n'expose aucune date par
 * membre, et l'inventer en la dérivant d'autre chose reviendrait à publier
 * quand quelqu'un court.
 *
 * ─── AUCUN BOUTON MORT (constitution §2) ─────────────────────────────────────
 * Le « ··· » n'est peint que si un geste est réellement possible : modération
 * (`canModeratePlayer`, session réelle) OU au moins une action de rôle
 * (`roleActionsFor`, miroir des bornes de 0093). Sur MA ligne, jamais rien.
 */
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSizes, spacing, typography } from '@klaim/shared';
import { useT } from '../../i18n/store';
import { C, CREW_ROLE_E } from '../../i18n/catalog/crew';
import type { Entry } from '../../i18n/types';
import { canModeratePlayer } from './blocklist';
import { PlayerActionsButton } from './PlayerModerationSheet';
import { groupRoster, roleActionsFor } from './memberRoles';
import type { CrewRoleGroup } from '@klaim/shared';

/** Ce que l'écran a déjà calculé pour chaque ligne — repris tel quel. */
export interface RosterRow {
  userId: string;
  /** Pseudo RÉEL — sert au signalement et au blocage, jamais à l'affichage. */
  pseudo: string;
  /** Ce qui s'affiche : le pseudo, ou « Joueur bloqué ». */
  displayName: string;
  isMe: boolean;
  blocked: boolean;
}

/** Détail serveur d'une ligne (crew_overview, 0044). */
export interface RosterDetail {
  role: string;
  contributionPct: number;
  hexesHeld: number;
}

export interface CrewRosterGroupsProps {
  rows: readonly RosterRow[];
  detailByUser: ReadonlyMap<string, RosterDetail>;
  /** Le crew tient-il au moins une zone ? Sinon aucune part n'est affichée. */
  showContributions: boolean;
  /** MON rôle serveur, ou `''` s'il n'a pas (encore) été lu. */
  myRole: string;
  /** Session + client réels : condition sous laquelle `reportContent` écrit. */
  canReport: boolean;
  /** Pseudos bloqués, forme de comparaison. */
  blockedPseudos: ReadonlySet<string>;
  /** Ouvre la feuille E47 sur cette personne. */
  onOpenActions: (row: RosterRow, targetRole: string) => void;
}

const GROUP_TITLE: Readonly<Record<CrewRoleGroup, Entry>> = {
  lead: C.grpLead,
  officers: C.grpOfficers,
  members: C.grpMembers,
};

export function CrewRosterGroups({
  rows,
  detailByUser,
  showContributions,
  myRole,
  canReport,
  blockedPseudos,
  onOpenActions,
}: CrewRosterGroupsProps) {
  const t = useT();

  /**
   * Le rôle SERVEUR de chaque ligne. `crew_overview` peut ne pas avoir répondu
   * (chargement, échec) : le rôle est alors `''`, la ligne tombe dans
   * « membres » sans droit associé, et aucune action de rôle ne se peint. Un
   * chargement n'affirme rien — surtout pas que quelqu'un est un simple membre.
   */
  const grouped = useMemo(
    () =>
      groupRoster(
        rows.map((r) => ({ ...r, role: detailByUser.get(r.userId)?.role ?? '' })),
      ),
    [rows, detailByUser],
  );

  /** Le crew d'UNE personne : un fait, ni un vide de lecture ni un échec. */
  const alone = rows.length === 1;

  return (
    <View style={styles.roster}>
      {grouped.map(({ group, members }) => {
        // Le groupe « officiers » se rend même VIDE : le masquer ferait paraître
        // la hiérarchie cassée dans tout crew neuf. Les deux autres, eux, ne
        // peuvent pas être vides tant qu'il y a quelqu'un — et s'ils le sont
        // (roster non lu), ils disparaissent sans rien affirmer.
        if (members.length === 0 && group !== 'officers') return null;
        return (
          <View key={group} style={styles.group}>
            <Text style={styles.groupTitle}>{t(GROUP_TITLE[group])}</Text>
            {members.length === 0 ? (
              <Text style={styles.groupEmpty}>{t(C.grpOfficersNone)}</Text>
            ) : null}
            {members.map((m, i) => {
              const detail = detailByUser.get(m.userId);
              const roleEntry =
                detail && detail.role in CREW_ROLE_E
                  ? CREW_ROLE_E[detail.role as keyof typeof CREW_ROLE_E]
                  : null;

              // Le « ··· » n'apparaît que si QUELQUE CHOSE est possible.
              const canModerate = canModeratePlayer({
                pseudo: m.pseudo,
                isMe: m.isMe,
                canReport,
                blocked: blockedPseudos,
              });
              const hasRoleAction =
                roleActionsFor({
                  actorRole: myRole,
                  targetRole: m.role,
                  isMe: m.isMe,
                }).length > 0;

              return (
                <View
                  key={m.userId}
                  style={[styles.memberRow, i < members.length - 1 && styles.memberDivider]}
                >
                  <View style={styles.memberIdentity}>
                    <View style={styles.memberNameRow}>
                      {/* `clip` et non « … » (§A.9) — et un membre bloqué est
                          rendu en GRIS : c'est un état, pas un pseudo. */}
                      <Text
                        style={[styles.memberName, m.blocked && styles.memberNameBlocked]}
                        numberOfLines={1}
                        ellipsizeMode="clip"
                      >
                        {m.displayName}
                      </Text>
                      {m.isMe ? <Text style={styles.youTag}>{t(C.rlYouTag)}</Text> : null}
                    </View>
                    {roleEntry ? <Text style={styles.memberRole}>{t(roleEntry)}</Text> : null}
                  </View>
                  {/* MEMBRE INACTIF JAMAIS HUMILIÉ (planche) : un « 0 % » collé
                      en face d'un pseudo est un classement de la paresse. Tant
                      qu'un membre ne tient aucune zone, sa ligne ne porte
                      simplement pas de chiffre. */}
                  {showContributions && detail && detail.hexesHeld > 0 ? (
                    <Text style={styles.memberPct}>
                      {t(C.rlContributionPct, { pct: detail.contributionPct })}
                    </Text>
                  ) : null}
                  {canModerate || hasRoleAction ? (
                    <PlayerActionsButton
                      name={m.displayName}
                      onPress={() => onOpenActions(m, m.role)}
                    />
                  ) : null}
                </View>
              );
            })}
          </View>
        );
      })}

      {/* LE CREW D'UNE SEULE PERSONNE — l'état de très loin le plus probable
          aujourd'hui, et il n'est ni un vide de lecture ni un échec. */}
      {alone ? <Text style={styles.footNote}>{t(C.grpAloneBody)}</Text> : null}
      {/* ANTI PAY-TO-WIN, à l'écran (spéc l.1677). Sous la liste : c'est une
          clé de lecture des trois groupes, pas un avertissement. */}
      <Text style={styles.footNote}>{t(C.grpNoAdvantage)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  roster: { marginTop: spacing.lg, marginBottom: spacing.lg, gap: spacing.lg },
  group: { gap: spacing.xxs },
  // Kicker (majuscules, gris) : un en-tête de groupe ORDONNE la liste, il ne
  // crée pas une carte — jamais de card dans une card (§A).
  groupTitle: { ...typography.kicker, color: colors.gris },
  groupEmpty: { ...typography.meta, color: colors.gris, paddingVertical: spacing.xs },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  memberDivider: { borderBottomWidth: 1, borderBottomColor: colors.grisLigne },
  // flexShrink sur la colonne d'identité : le % (court, jamais tronqué) garde
  // sa place, seul un pseudo très long s'ellipse.
  memberIdentity: { flexShrink: 1, gap: 2 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  memberName: { color: colors.blanc, fontSize: fontSizes.md, flexShrink: 1 },
  // « Joueur bloqué » n'est pas un pseudo : il est rendu comme un ÉTAT (gris,
  // italique), pour qu'on ne le confonde jamais avec le nom de quelqu'un.
  memberNameBlocked: { color: colors.gris, fontStyle: 'italic' },
  memberRole: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1 },
  memberPct: { color: colors.blanc, fontSize: fontSizes.sm, flexShrink: 0 },
  youTag: { color: colors.gris, fontSize: fontSizes.xs, letterSpacing: 1 },
  footNote: { ...typography.meta, color: colors.gris },
});
