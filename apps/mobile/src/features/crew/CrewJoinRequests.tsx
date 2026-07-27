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
 */
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, fontSizes, sizes, spacing } from '@klaim/shared';
import { C } from '../../i18n/catalog/crew';
import { useT } from '../../i18n/store';
import { useCrewJoinRequests } from './discoveryData';

export function CrewJoinRequests() {
  const t = useT();
  const { canDecide, requests, busyId, decide } = useCrewJoinRequests();

  if (!canDecide || requests.length === 0) return null;

  return (
    <View style={styles.root}>
      <Text style={styles.kicker}>{t(C.dRequestsKicker)}</Text>
      {requests.map((r) => (
        <View key={r.id} style={styles.row}>
          {/* Le pseudo n'est PAS tronqué : décider sur un nom coupé, c'est
              décider sur autre chose que la personne (§A.9). */}
          <Text style={styles.pseudo}>{r.pseudo}</Text>
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
      ))}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grisLigne,
  },
  pseudo: { color: colors.blanc, fontSize: fontSizes.md, flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 0 },
  action: { minHeight: sizes.touchTarget, justifyContent: 'center' },
  accept: { color: colors.blanc, fontFamily: fonts.textSemi, fontSize: fontSizes.sm, fontWeight: '600' },
  reject: { color: colors.gris, fontSize: fontSizes.sm },
});
