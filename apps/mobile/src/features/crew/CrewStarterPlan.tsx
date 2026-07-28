/**
 * GRYD — E13 · PLAN DE DÉMARRAGE d'un crew SANS TERRITOIRE (planche « Crew Home »,
 * état vide). L'état vide est un PLAN D'ACTION, jamais un tableau de bord à zéro.
 *
 * ⚠ CET ÉTAT N'EST PAS « je n'ai pas de crew » (celui-là vit déjà dans
 * RealCrewScreen). C'est un crew RÉEL, lu, dont `crew_overview.hexesHeld` vaut
 * 0. La bascule n'a donc lieu QUE quand l'overview a répondu : `overview ===
 * null` signifie « pas lu », et afficher « votre premier territoire » à un crew
 * qui en a un serait exactement le mensonge que la doctrine interdit.
 *
 * ─── ÉCARTS ASSUMÉS À LA PLANCHE ────────────────────────────────────────────
 * · EMBLÈME EN CERCLE POINTILLÉ : omis. Le crew existe, son blason RÉEL est
 *   déjà dans le hero juste au-dessus — le répéter ici serait un doublon (§A).
 * · ÉTAPE 2 « Choisissez votre emblème et couleur » → « Éditer › » : OMISE.
 *   ⚠ LE MOTIF A CHANGÉ LE 28/07/2026 — le relire, ne pas le recopier.
 *   ANCIEN motif (PÉRIMÉ) : « `/crew-edit` est un `<Redirect href="/crew"/>` et
 *   aucune RPC d'édition rôle-gatée n'existe ». Les deux sont FAUX depuis la
 *   migration 0084 : `crew_edit` / `crew_edit_context` existent, rôle-gatées par
 *   CREW_PERMISSIONS, et `app/crew-edit.tsx` est un vrai écran.
 *   MOTIF ACTUEL, et il tient toujours : ce que la planche demande à cette étape
 *   — l'EMBLÈME et la COULEUR — reste précisément ce que `crew_edit` ne touche
 *   PAS, et pour des raisons inscrites dans l'en-tête de 0084 : aucune colonne
 *   d'emblème n'existe (il n'y a qu'un inventaire d'objets, 0014), et
 *   `crews.color` n'est RENDUE par aucune surface du dépôt (le rendu carte va
 *   par RÔLE, §C ; le blason de `CrewHero` est en tokens). Renvoyer ici vers
 *   « Éditer » sous ce libellé promettrait deux réglages introuvables une fois
 *   l'écran ouvert : l'étape serait vivante, sa promesse morte.
 *   Ce que le fondateur PEUT régler — qui a le droit d'entrer — ne s'échoue plus
 *   ici non plus : il le choisit désormais À LA CRÉATION (E41, migration 0097).
 * · COMPTEUR « 0 / 3 » de l'étape « fermez 3 boucles » : SUPPRIMÉ. `3` n'est
 *   dans aucune constante de `game-rules.ts` (nombre magique) et aucun compteur
 *   de boucles fermées par crew n'est lu. La règle reste, en texte.
 * Résultat : 2 étapes, dont une seule porte une action — et cette action
 * marche. Mieux vaut 2 étapes vraies que 3 dont une morte.
 *
 * Le seul compteur affiché (`{count}/{min}`) est RÉEL des deux côtés : effectif
 * lu du roster, minimum lu de `CREW_MIN_MEMBERS`.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CREW_MIN_MEMBERS,
  colors,
  fonts,
  fontSizes,
  iconSizes,
  radii,
  sizes,
  spacing,
} from '@klaim/shared';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { useT } from '../../i18n/store';
import { C } from '../../i18n/catalog/crew';

export interface CrewStarterPlanProps {
  /** Effectif RÉEL du crew (roster serveur). */
  memberCount: number;
  /**
   * `false` quand le crew est COMPLET : l'action d'invitation est alors retirée
   * plutôt que laissée à échouer côté serveur (`full`, 0050). Le cas est
   * improbable (un crew plein sans aucun territoire) mais il n'est pas
   * impossible, et un bouton mort reste un bouton mort.
   */
  canInvite: boolean;
  /** Ouvre l'écran d'invitation (QR + vrai code via `my_crew_code`). */
  onInvite: () => void;
  /** Mène à la carte — l'écran mission (AMENDEMENT-21). */
  onOpenMap: () => void;
}

export function CrewStarterPlan({
  memberCount,
  canInvite,
  onInvite,
  onOpenMap,
}: CrewStarterPlanProps) {
  const t = useT();
  // Le compteur ne s'affiche que tant qu'il APPREND quelque chose : à effectif
  // atteint, « 4/2 » n'est plus une information, c'est du bruit (§A).
  const showCount = memberCount < CREW_MIN_MEMBERS;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>{t(C.firstTerritoryTitle)}</Text>
      <Text style={styles.body}>{t(C.firstTerritoryBody)}</Text>

      {/* L'UNIQUE CTA chartreuse de cet état : il REMPLACE « Inviter », qui
          redevient l'action de l'étape 1 (§A4 — un seul focus chartreuse). */}
      <View style={styles.cta}>
        <Button label={t(C.firstMissionCta)} onPress={onOpenMap} analyticsId="crew_first_zone" />
      </View>

      <Text style={styles.kicker}>{t(C.startWellKicker)}</Text>

      <View style={styles.steps}>
        <View style={[styles.step, styles.stepDivider]}>
          <View style={styles.rank}>
            <Text style={styles.rankText}>1</Text>
          </View>
          <View style={styles.stepBody}>
            <Text style={styles.stepText}>{t(C.stepInvite)}</Text>
            {showCount ? (
              <Text style={styles.stepCount}>
                {t(C.stepInviteCount, { count: memberCount, min: CREW_MIN_MEMBERS })}
              </Text>
            ) : null}
          </View>
          {canInvite ? (
            <Pressable
              onPress={onInvite}
              accessibilityRole="button"
              accessibilityLabel={t(C.stepInviteAction)}
              hitSlop={8}
              style={styles.stepAction}
            >
              {/* Libellé COURT et JAMAIS tronqué (§A.9) : pas de numberOfLines. */}
              <Text style={styles.stepActionText}>{t(C.stepInviteAction)}</Text>
              <Icon name="chevron" size={iconSizes.sm} color={colors.chartreuse} />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.step}>
          <View style={styles.rank}>
            <Text style={styles.rankText}>2</Text>
          </View>
          {/* Pas d'action à droite : la course se lance depuis le GO permanent
              de la barre de navigation, et aucun compteur de boucles crew n'est
              lisible — inventer l'un ou l'autre serait le mensonge du jour. */}
          <View style={styles.stepBody}>
            <Text style={styles.stepText}>{t(C.stepLoops)}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { marginTop: spacing.xl, gap: spacing.sm },
  title: {
    color: colors.blanc,
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.lg,
    fontWeight: '700',
  },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  cta: { marginTop: spacing.xs },
  kicker: {
    color: colors.gris,
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
    marginTop: spacing.lg,
  },
  // Liste à PLAT (pas de card : la section se lit par l'espace, règle 80/20).
  steps: { marginTop: spacing.xxs },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
  },
  stepDivider: { borderBottomWidth: 1, borderBottomColor: colors.grisLigne },
  rank: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.carbone2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: colors.blanc, fontFamily: fonts.mono, fontSize: fontSizes.xs },
  stepBody: { flex: 1, gap: 2 },
  stepText: { color: colors.blanc, fontSize: fontSizes.md, lineHeight: 22 },
  stepCount: { color: colors.gris, fontFamily: fonts.mono, fontSize: fontSizes.xs },
  stepAction: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, flexShrink: 0 },
  // Chartreuse sur fond SOMBRE uniquement (contraste OK).
  stepActionText: {
    color: colors.chartreuse,
    fontFamily: fonts.textSemi,
    fontSize: fontSizes.sm,
    fontWeight: '600',
  },
});
