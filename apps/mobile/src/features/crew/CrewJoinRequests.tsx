/**
 * GRYD — LES CANDIDATURES REÇUES (contrepartie obligatoire de E39/E40).
 *
 * ══ POURQUOI CE COMPOSANT EXISTE ══════════════════════════════════════════
 * La découverte permet enfin de DEMANDER à rejoindre un crew (`crew_join_intent`,
 * 0083). Une demande que personne ne peut lire ni trancher serait un bouton qui
 * fait semblant — la faute exacte que le dépôt s'interdit. Ce bloc est donc
 * livré DANS LE MÊME LOT que la demande, jamais après.
 *
 * ══ IL N'APPARAÎT QUE QUAND IL A QUELQUE CHOSE À DIRE ═════════════════════
 * Trois conditions, et les trois viennent du SERVEUR :
 *   · `crew_join_requests` m'a reconnu le droit de décider
 *     (`CREW_PERMISSIONS.acceptApplications` — arbitré en base, pas ici) ;
 *   · il existe au moins une candidature en cours.
 * Sinon : RIEN. Pas de bloc vide, pas de « 0 demande » — un simple membre n'a
 * pas à savoir qu'une file existe, et un chef sans demande n'a pas besoin d'un
 * compteur à zéro (§A : ce qui n'apprend rien ne s'affiche pas).
 *
 * ══ ANTI-P2W (§E46) ══════════════════════════════════════════════════════
 * Accepter quelqu'un n'octroie AUCUN territoire, AUCUN point, AUCUN avantage de
 * capture : l'entrant reçoit le rôle d'ESSAI, et aucun rôle ne capture. C'est
 * garanti côté serveur et prouvé en PGlite — ce composant ne fait que déclencher
 * la décision.
 *
 * ══ CE QU'IL NE PROMET PAS ═══════════════════════════════════════════════
 * Aucune notification n'existe (0083 § suspens) : le candidat ne sera pas
 * prévenu, et l'écran de la fiche publique le lui dit. Ici, on ne prétend pas
 * non plus « le candidat a été averti ».
 *
 * ══ 11/09/2026 · LE MOT DU CANDIDAT EST ENFIN LU (LOT Q3) ═════════════════
 * Ce composant peignait `r.pseudo` et deux liens. `r.message` était parsé par
 * `discoveryData.ts` puis JETÉ — non par négligence, mais parce qu'il valait
 * toujours `null` : `crew_join_intent` (0093:550) insérait `(crew_id, user_id)`
 * et rien d'autre. Le trou ① de la spec était donc double : personne
 * n'écrivait, et personne ne lisait. `crew_apply_2026` (0188) écrit ; ce
 * composant lit.
 *
 * « Sans mot. » est écrit EN TOUTES LETTRES quand il n'y en a pas, plutôt qu'un
 * blanc : tout l'historique d'avant 0188 vaut `null`, et un vide se prendrait
 * pour un défaut d'affichage. Le message n'est PAS tronqué, pour la même raison
 * que le pseudo : on décide sur ce que la personne a écrit, pas sur son début.
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, sizes, spacing } from '@klaim/shared';
import { C } from '../../i18n/catalog/crew';
import { G } from '../../i18n/catalog/crewGestion';
import { useT } from '../../i18n/store';
import { requestAgeText } from './management/crewManagementCopy';
import { useCrewJoinRequests } from './discoveryData';

export function CrewJoinRequests() {
  const t = useT();
  const { canDecide, requests, busyId, decide } = useCrewJoinRequests();

  if (!canDecide || requests.length === 0) return null;

  const now = Date.now();

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>{t(C.dRequestsKicker)}</Text>
      {requests.map((r) => {
        const age = requestAgeText(t, r.createdAtMs, now);
        return (
        <View key={r.id} style={styles.row}>
          <View style={styles.who}>
            {/* Le pseudo n'est PAS tronqué : décider sur un nom coupé, c'est
                décider sur autre chose que la personne (§A.9). */}
            <Text style={styles.pseudo}>{r.pseudo}</Text>
            {/* LE MOT DU CANDIDAT. Il existe le candidat comme personne avant de
                l'exister comme statistique (§1.1). */}
            <Text style={r.message ? styles.message : styles.noMessage}>
              {r.message ?? t(G.requestNoMessage)}
            </Text>
            {age ? <Text style={styles.age}>{age}</Text> : null}
          </View>
          <View style={styles.actions}>
            {/*
              Deux liens texte, PAS deux boutons : le CTA chartreuse de l'écran
              Crew reste « Inviter » (§A4). Accepter est en blanc — c'est une
              décision, pas l'action principale de l'écran.
            */}
            <Pressable
              onPress={() => void decide(r.id, true)}
              disabled={busyId !== null}
              accessibilityRole="button"
              accessibilityLabel={`${t(C.dAcceptCta)} ${r.pseudo}`}
              hitSlop={8}
              style={styles.action}
            >
              <Text style={styles.accept}>{t(C.dAcceptCta)}</Text>
            </Pressable>
            <Pressable
              onPress={() => void decide(r.id, false)}
              disabled={busyId !== null}
              accessibilityRole="button"
              accessibilityLabel={`${t(C.dRejectCta)} ${r.pseudo}`}
              hitSlop={8}
              style={styles.action}
            >
              <Text style={styles.reject}>{t(C.dRejectCta)}</Text>
            </Pressable>
          </View>
        </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  // Bloc à PLAT — surtout pas une card : le roster et « Notre priorité »
  // l'entourent, et deux cards voisines casseraient §A.
  root: { marginTop: spacing.xl, gap: spacing.xxs },
  kicker: {
    color: colors.gris,
    fontFamily: fonts.mono,
    fontSize: fontSizes.xs,
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: 'row',
    // Le mot du candidat peut faire plusieurs lignes : les actions se calent en
    // haut plutôt que de flotter au milieu d'un pavé de texte.
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grisLigne,
  },
  who: { flex: 1, gap: 2 },
  pseudo: { color: colors.blanc, fontSize: fontSizes.md, flexShrink: 1 },
  // Le message n'est PAS tronqué (aucun `numberOfLines`) : décider sur le début
  // d'une phrase, c'est décider sur autre chose que ce qui a été écrit (§A.9).
  message: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
  noMessage: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
  age: { color: colors.gris, fontSize: fontSizes.xs },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 0 },
  action: { minHeight: sizes.touchTarget, justifyContent: 'center' },
  accept: { color: colors.blanc, fontFamily: fonts.textSemi, fontSize: fontSizes.sm, fontWeight: '600' },
  reject: { color: colors.gris, fontSize: fontSizes.sm },
});
