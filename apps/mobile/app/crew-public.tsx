/**
 * GRYD — E40 · FICHE PUBLIQUE D'UN CREW (route `/crew-public?crewId=…`).
 *
 * ══ POURQUOI UN PARAMÈTRE DE REQUÊTE ET PAS `crew-public/[crewId].tsx` ═════
 * Le docblock d'avant affirmait que cette route « est structurellement
 * incapable de recevoir l'identité d'un crew » et qu'une vraie fiche devrait
 * être une route NEUVE. C'était FAUX : expo-router passe des paramètres de
 * requête à n'importe quelle route (`useLocalSearchParams`), un segment
 * dynamique n'est qu'une des deux façons de porter un identifiant. Le
 * constat est donc corrigé ici plutôt que recopié.
 *
 * Et le paramètre de requête est le bon choix : déclarer un segment dynamique
 * exigerait de toucher `app/_layout.tsx` — hors du périmètre de ce lot, où
 * d'autres chantiers écrivent en parallèle. La route existante est déjà
 * enregistrée ; elle reçoit maintenant une identité, sans rien déplacer.
 *
 * ══ CE QUE LA FICHE MONTRE, ET CE QU'ELLE REFUSE DE MONTRER (§E40 / §12) ══
 * `crew_public_profile` (0083) ne renvoie que des AGRÉGATS : effectif, emprise
 * vivante, dernière capture, rang de ville calculé FRAIS, et deux faits qui me
 * concernent (mes amis déjà dedans, ma candidature en cours). AUCUN membre,
 * AUCUN message, AUCUN tracé, AUCUN code — « aucun chat ni information privée
 * avant adhésion » est tenu par la FORME du retour, pas par la discipline de
 * l'écran. L'absence est DITE en bas de page, pour qu'on ne la prenne pas pour
 * un chargement raté.
 *
 * ══ LE CTA EST LE SEUL DE L'ÉCRAN, ET IL N'EST JAMAIS MORT (§A4) ══════════
 * Son libellé vient de `joinAffordance` (pur, testé) : REJOINDRE si le crew
 * recrute librement, DEMANDER À REJOINDRE s'il est sur demande, et AUCUN bouton
 * si le crew est fermé, sur invitation, plein, ou si je suis déjà dans un crew.
 * ⚠ Le libellé est un affichage ; l'EFFET est décidé par le serveur
 * (`crew_join_intent`). Un statut changé entre la lecture et le tap est donc
 * arbitré correctement, pas subi.
 *
 * ══ CE QUE L'ÉCRAN NE PROMET PAS ══════════════════════════════════════════
 * Après une candidature, il DIT qu'aucune notification n'existe (elle n'existe
 * pas : 0083 § suspens). Écrire « vous serez prévenu » serait une garantie que
 * le code ne tient pas — la même faute qu'une donnée fabriquée.
 */
import { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, fontSizes, spacing } from '@klaim/shared';
import { C } from '../src/i18n/catalog/crew';
import { useT } from '../src/i18n/store';
import type { Entry } from '../src/i18n/types';
import { useSession } from '../src/lib/session';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { joinAffordance, refusalView, seatsLeft } from '../src/features/crew/discovery';
import {
  requestCrewJoin,
  useCrewPublicProfile,
  type PublicCrew,
} from '../src/features/crew/discoveryData';

const DAY_MS = 86_400_000;

export default function CrewPublicRoute() {
  const t = useT();
  const { session } = useSession();
  const params = useLocalSearchParams<{ crewId?: string }>();
  const crewId = typeof params.crewId === 'string' && params.crewId.length > 0
    ? params.crewId
    : null;

  const { loading, failed, refusal, crew, reload } = useCrewPublicProfile(crewId);
  /**
   * ─── 27/07/2026 — LE SPINNER ÉTERNEL ─────────────────────────────────────
   * L'écran ne traitait QUE `refusal === 'not_found'`. `crew_public_profile`
   * (0083:385) refuse aussi avec `signed_out` — jeton expiré côté serveur alors
   * que la session locale existe encore — et `refusalOf` rabat tout motif
   * inconnu. Dans ces cas `loading=false`, `failed=false`, `crew=null` : le
   * garde `if (!crew)` rendait un ActivityIndicator chartreuse qui tournait
   * POUR TOUJOURS, sans texte et sans issue, alors que la lecture avait abouti
   * et REFUSÉ. `refusalView` ferme le vocabulaire : plus aucun motif ne peut
   * traverser l'écran sans être peint.
   */
  const refused = refusalView(refusal);
  const [busy, setBusy] = useState(false);
  /** Résultat de MA dernière action — un fait, jamais une promesse. */
  const [outcome, setOutcome] = useState<Entry | null>(null);
  const [error, setError] = useState<Entry | null>(null);

  const onJoin = useCallback(async () => {
    if (!crewId || busy) return;
    setBusy(true);
    setError(null);
    const res = await requestCrewJoin(crewId);
    setBusy(false);
    if (res.ok) {
      setOutcome(res.effect === 'joined' ? C.dJoined : C.dRequestPending);
      // On RELIT : l'écran doit refléter l'état serveur, pas l'état espéré.
      reload();
      return;
    }
    // Refus SERVEUR — on le dit avec ses mots, on n'en invente pas un autre.
    setError(
      res.reason === 'closed'
        ? C.dClosedNote
        : res.reason === 'already_in_crew'
          ? C.dInOtherCrew
          : res.reason === 'full'
            ? C.crewFullNotice
            : C.dFailedBody,
    );
  }, [crewId, busy, reload]);

  if (!session) {
    return (
      <StackScreen title={t(C.dPublicTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(C.dSignedOut)}</Text>
        </View>
      </StackScreen>
    );
  }

  // Deep link sans identité, ou crew introuvable : les deux se disent, aucun
  // ne rend un écran blanc ni une fiche vide qui ressemblerait à un crew réel.
  if (!crewId || refused === 'not_found') {
    return (
      <StackScreen title={t(C.dPublicTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(C.dNotFound)}</Text>
        </View>
      </StackScreen>
    );
  }

  // La session est tombée CÔTÉ SERVEUR : on le dit, avec le seul geste utile.
  if (refused === 'session_expired') {
    return (
      <StackScreen title={t(C.dPublicTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(C.dSessionExpired)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlSignIn)} onPress={() => router.push('/sign-in')} />
          </View>
        </View>
      </StackScreen>
    );
  }

  // Refus SERVEUR incohérent en lecture, ou motif inconnu : traité comme un
  // échec de lecture (c'en est un), donc avec « Réessayer » — jamais comme un
  // vide, et surtout jamais comme un chargement.
  // `no_city` n'a pas de sens sur une FICHE (la RPC ne l'émet pas) : il tombe
  // ici plutôt que dans un trou.
  if (refused !== null) {
    return (
      <StackScreen title={t(C.dPublicTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.dFailedTitle)}</Text>
          <Text style={styles.body}>{t(C.dRefusedUnreadable)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlRetry)} onPress={reload} loading={loading} />
          </View>
        </View>
      </StackScreen>
    );
  }

  if (failed) {
    return (
      <StackScreen title={t(C.dPublicTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(C.dFailedTitle)}</Text>
          <Text style={styles.body}>{t(C.dFailedBody)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlRetry)} onPress={reload} loading={loading} />
          </View>
        </View>
      </StackScreen>
    );
  }

  if (!crew) {
    // Lecture EN COURS : n'affirme rien sur ce crew. Ce spinner ne peut PLUS
    // être atteint sans que `loading` soit vrai — tous les refus sont peints
    // au-dessus, et l'échec aussi. Le texte accompagne le rond : un spinner nu
    // n'apprend rien à qui attend.
    return (
      <StackScreen title={t(C.dPublicTitle)}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
          <Text style={styles.body}>{t(C.dPublicLoading)}</Text>
        </View>
      </StackScreen>
    );
  }

  return (
    <StackScreen
      title={t(C.dPublicTitle)}
      subtitle={crew.cityName ?? undefined}
    >
      <CrewIdentity crew={crew} />
      <CrewFacts crew={crew} />

      {/* L'ACTION — unique, et seulement si elle peut réussir. */}
      <JoinBlock crew={crew} busy={busy} onJoin={() => void onJoin()} />

      {outcome ? <Text style={styles.outcome}>{t(outcome)}</Text> : null}
      {outcome === C.dRequestPending || crew.myRequestPending ? (
        <Text style={styles.note}>{t(C.dRequestNoNotice)}</Text>
      ) : null}
      {error ? <Text style={styles.error}>{t(error)}</Text> : null}

      {/* L'ABSENCE, DITE : sans cette phrase, une fiche sans membres ressemble
          à une fiche à moitié chargée. */}
      <Text style={styles.privacy}>{t(C.dPrivacyNote)}</Text>
    </StackScreen>
  );
}

function CrewIdentity({ crew }: { crew: PublicCrew }) {
  return (
    <View style={styles.hero}>
      {/* Pas de bannière ni d'emblème : aucune colonne ni bucket ne les stocke
          (même constat que CrewHero). Peindre un blason générique inventerait
          une identité que le crew n'a pas choisie. */}
      <Text style={styles.heroName}>{crew.name}</Text>
      {crew.tag ? <Text style={styles.heroTag}>{crew.tag}</Text> : null}
    </View>
  );
}

/** Les FAITS, en lignes courtes. Aucun chiffre qui n'existe pas en base. */
function CrewFacts({ crew }: { crew: PublicCrew }) {
  const t = useT();
  const activity =
    crew.lastCaptureAtMs === null
      ? t(C.dNeverActive)
      : (() => {
          const days = Math.floor((Date.now() - crew.lastCaptureAtMs) / DAY_MS);
          return days <= 0 ? t(C.dActiveToday) : t(C.dLastActive, { d: days });
        })();

  return (
    <View style={styles.facts}>
      <Text style={styles.fact}>{t(C.dMembers, { n: crew.memberCount })}</Text>
      <Text style={styles.fact}>
        {crew.hexesHeld > 0 ? t(C.dZonesHeld, { n: crew.hexesHeld }) : t(C.dNoZones)}
      </Text>
      <Text style={styles.fact}>{activity}</Text>

      {/* RANG — jamais « dernier » sur du vide : un crew sans emprise n'est pas
          classé, et l'écran le dit au lieu d'afficher un numéro flatteur ou
          humiliant calculé sur rien. */}
      {crew.cityRank !== null && crew.crewsRanked !== null && crew.cityName ? (
        <Text style={styles.fact}>
          {t(C.dCityRank, {
            rank: crew.cityRank,
            total: crew.crewsRanked,
            city: crew.cityName,
          })}
        </Text>
      ) : (
        <Text style={styles.fact}>{t(C.dNoRank)}</Text>
      )}

      {crew.friendsInside > 0 ? (
        <Text style={styles.fact}>{t(C.dFriendsInside, { n: crew.friendsInside })}</Text>
      ) : null}
    </View>
  );
}

/**
 * Le bloc d'adhésion. Chaque branche correspond à un état RÉEL, et l'absence de
 * bouton est une réponse à part entière — pas un oubli.
 */
function JoinBlock({
  crew,
  busy,
  onJoin,
}: {
  crew: PublicCrew;
  busy: boolean;
  onJoin: () => void;
}) {
  const t = useT();

  if (crew.iAmMember) {
    return <Text style={styles.note}>{t(C.dAlreadyMember)}</Text>;
  }

  // `viewerInCrew` : la fiche sait si je suis membre de CE crew, pas d'un
  // autre. On passe donc `false` et on laisse le SERVEUR refuser
  // (`already_in_crew`) — c'est lui qui connaît mes adhésions, pas cet écran.
  const affordance = joinAffordance(crew, { viewerInCrew: false });

  if (affordance === 'pending') {
    return <Text style={styles.note}>{t(C.dRequestPending)}</Text>;
  }
  if (affordance === 'none') {
    // Motif DIT : plein d'un côté, fermé de l'autre — deux situations
    // différentes qui n'appellent pas la même suite.
    return (
      <Text style={styles.note}>
        {seatsLeft(crew) <= 0 ? t(C.crewFullNotice) : t(C.dClosedNote)}
      </Text>
    );
  }

  return (
    <View style={styles.cta}>
      <Button
        label={t(affordance === 'join' ? C.dJoinCta : C.dRequestCta)}
        onPress={onJoin}
        loading={busy}
        analyticsId="crew_join_intent"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  cta: { marginTop: spacing.sm },
  center: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },

  hero: { marginTop: spacing.lg, gap: spacing.xxs },
  heroName: {
    color: colors.blanc,
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.xl,
    fontWeight: '700',
  },
  heroTag: { color: colors.gris, fontFamily: fonts.mono, fontSize: fontSizes.xs, letterSpacing: 1.5 },

  // Bloc à PLAT (pas de card : la hiérarchie vient de l'espace, §A).
  facts: { marginTop: spacing.lg, gap: spacing.xs },
  fact: { color: colors.blanc, fontSize: fontSizes.md, lineHeight: 22 },

  outcome: { color: colors.chartreuse, fontSize: fontSizes.sm, marginTop: spacing.lg, lineHeight: 20 },
  error: { color: colors.blanc, fontSize: fontSizes.sm, marginTop: spacing.md, lineHeight: 20 },
  note: { color: colors.gris, fontSize: fontSizes.md, marginTop: spacing.lg, lineHeight: 22 },
  privacy: { color: colors.gris, fontSize: fontSizes.sm, marginTop: spacing.xl, lineHeight: 20 },
});
