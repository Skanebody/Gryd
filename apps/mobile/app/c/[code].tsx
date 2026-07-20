/**
 * GRYD — ATTERRISSAGE D'UNE INVITATION CREW (`gryd://c/CODE`,
 * `https://gryd.run|gryd.app/c/CODE`). Demande fondateur 21/07/2026 : le QR
 * recrute, ET il inscrit celui qui n'a pas encore l'app.
 *
 * §A — 1 écran = 1 décision = 1 SEUL CTA chartreuse. Selon l'état, ce CTA est
 * « Rejoindre », « Se connecter » ou « Voir mon crew ». Jamais deux.
 *
 * TROIS CAS, TOUS HONNÊTES :
 *  a. déjà membre de CE crew (comparaison avec `my_crew_code()`, jamais une
 *     lecture de la colonne secrète) → on le dit, on renvoie vers l'onglet Crew ;
 *  b. connecté, pas dans ce crew → « Rejoindre », arbitré par la RPC
 *     `join_crew_by_code` ; chaque refus typé affiche SON message (cooldown avec
 *     le vrai nombre de jours, crew complet, code inconnu, déjà dans un crew) —
 *     jamais un « réessaie » opaque ;
 *  c. pas connecté → on mémorise l'intention (24 h) et on envoie s'inscrire ;
 *     la reprise se fait dans `startPendingInviteWatcher` (features/crew/
 *     pendingInvite.ts), à l'endroit où la session devient valide.
 *
 * « L'APP NE MENT JAMAIS » — on n'affiche PAS le nom du crew avant l'adhésion :
 * aucune RPC publique ne résout un code en nom (la colonne `code` est secrète
 * depuis 0036, et exposer nom+effectif à quiconque devine un code serait une
 * fuite). L'écran montre donc le CODE réel, puis le VRAI nom du crew une fois
 * l'adhésion accordée par le serveur. Mieux vaut un écran sobre qu'un nom inventé.
 */
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, fonts, fontSizes, radii, spacing } from '@klaim/shared';
import { C } from '../../src/i18n/catalog/crew';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { EVENTS, screen, track } from '../../src/lib/analytics';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
import { StackScreen } from '../../src/ui/StackScreen';
import { useRealCrew, type CrewRefusal } from '../../src/features/crew/real';
import { normalizeInviteCode, rememberPendingInvite } from '../../src/features/crew/pendingInvite';

/** Un message affiché = une Entry + ses variables (jamais une chaîne en dur). */
interface Msg {
  entry: Entry;
  vars?: Record<string, string | number>;
}

/**
 * Refus serveur → message EXACT (mêmes entrées que l'écran Crew : une seule
 * vérité par situation, dans les 5 langues).
 */
function refusalMsg(reason: CrewRefusal, daysLeft?: number): Msg {
  switch (reason) {
    case 'cooldown':
      return { entry: C.rlErrCooldown, vars: { days: daysLeft ?? 0 } };
    case 'full':
      return { entry: C.rlErrFull };
    case 'bad_code':
      return { entry: C.rlErrBadCode };
    case 'already_in_crew':
      return { entry: C.rlErrAlreadyInCrew };
    default:
      return { entry: C.rlErrGeneric };
  }
}

export default function InviteLandingScreen() {
  const t = useT();
  const params = useLocalSearchParams<{ code?: string; welcome?: string }>();
  const { session, loading: sessionLoading, configured } = useSession();
  const { ready, joinByCode, fetchMyCode, reload } = useRealCrew();

  const code = normalizeInviteCode(params.code);
  /** Nom réel du crew rejoint (param posé par la reprise post-inscription, ou
   *  renvoyé par la RPC ici même). Sa présence = l'adhésion est ACQUISE. */
  const [joinedName, setJoinedName] = useState<string | null>(params.welcome ?? null);
  const [alreadyMine, setAlreadyMine] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Msg | null>(null);

  useEffect(() => {
    screen('crew_invite');
  }, []);

  // ── (c) Pas connecté : on MÉMORISE avant tout, même si la personne ferme
  //    l'app tout de suite. On attend la fin de la restauration de session pour
  //    ne pas mémoriser une invitation qu'on pourrait honorer sur-le-champ.
  useEffect(() => {
    if (!code || sessionLoading || session || !configured) return;
    void rememberPendingInvite(code);
    // Pas d'event `inviteAccepted` ici : atterrir n'est pas accepter. Il n'est
    // émis qu'après une adhésion RÉELLEMENT accordée par le serveur — sinon le
    // funnel se mentirait à lui-même. `screen('crew_invite')` suffit à mesurer
    // l'entrée.
  }, [code, sessionLoading, session, configured]);

  // ── (a) Déjà membre de CE crew ? Le seul moyen honnête : comparer avec MON
  //    code (RPC my_crew_code). Sans crew, la RPC refuse `no_crew` → on reste
  //    sur l'écran « Rejoindre ».
  useEffect(() => {
    if (!code || !ready || joinedName) return;
    let alive = true;
    void (async () => {
      const res = await fetchMyCode();
      if (alive && res.ok && res.code === code) setAlreadyMine(true);
    })();
    return () => {
      alive = false;
    };
  }, [code, ready, joinedName, fetchMyCode]);

  // ── (b) Rejoindre — décidé SERVEUR, une seule action à l'écran.
  const onJoin = useCallback(async () => {
    if (busy || !code) return;
    setBusy(true);
    setError(null);
    const res = await joinByCode(code);
    setBusy(false);
    if (res.ok) {
      track(EVENTS.inviteAccepted, { via: 'link' });
      track(EVENTS.crewJoined, { via: 'invite' });
      setJoinedName(res.crew.name);
      reload();
      return;
    }
    setError(refusalMsg(res.reason, res.daysLeft));
  }, [busy, code, joinByCode, reload]);

  const goToCrew = useCallback(() => router.replace('/crew'), []);

  // ── Rendu : un état = un titre + un corps + un CTA ──────────────────────────

  // Lien illisible (code absent, tronqué, bricolé) : on ne devine rien.
  if (!code) {
    return (
      <Shell t={t} title={t(C.cInviteTitle)}>
        <Text style={styles.title}>{t(C.cInviteBadLink)}</Text>
        <Text style={styles.body}>{t(C.cInviteBadLinkBody)}</Text>
        <View style={styles.cta}>
          <Button label={t(C.cInviteSeeCrew)} onPress={goToCrew} />
        </View>
      </Shell>
    );
  }

  // Adhésion acquise (ici ou reprise après inscription) : on le DIT.
  if (joinedName) {
    return (
      <Shell t={t} title={t(C.cInviteTitle)}>
        <Text style={styles.title}>{t(C.rlWelcome, { name: joinedName })}</Text>
        <View style={styles.cta}>
          <Button label={t(C.cInviteSeeCrew)} onPress={goToCrew} />
        </View>
      </Shell>
    );
  }

  if (alreadyMine) {
    return (
      <Shell t={t} title={t(C.cInviteTitle)}>
        <Text style={styles.title}>{t(C.cInviteAlreadyMine)}</Text>
        <View style={styles.cta}>
          <Button label={t(C.cInviteSeeCrew)} onPress={goToCrew} />
        </View>
      </Shell>
    );
  }

  // Restauration de session en cours : on ne montre pas un CTA qui changerait
  // sous le doigt une demi-seconde plus tard.
  if (sessionLoading) return <Shell t={t} title={t(C.cInviteTitle)} />;

  // (c) Pas connecté — l'invitation est déjà mémorisée, on l'annonce.
  if (!ready) {
    return (
      <Shell t={t} title={t(C.cInviteTitle)}>
        <Text style={styles.title}>{t(C.cInviteSignedOutTitle)}</Text>
        <CodePlate code={code} />
        <Text style={styles.body}>
          {configured ? t(C.cInviteSignedOutBody) : t(C.rlSignedOutBody)}
        </Text>
        {configured ? (
          <View style={styles.cta}>
            <Button label={t(C.rlSignIn)} onPress={() => router.push('/sign-in')} />
          </View>
        ) : null}
      </Shell>
    );
  }

  // (b) Connecté, pas dans ce crew.
  return (
    <Shell t={t} title={t(C.cInviteTitle)}>
      <Text style={styles.title}>{t(C.cInviteJoinTitle)}</Text>
      <CodePlate code={code} />
      <Text style={styles.body}>{t(C.cInviteJoinBody)}</Text>
      {error ? <Text style={styles.error}>{t(error.entry, error.vars)}</Text> : null}
      <View style={styles.cta}>
        <Button label={t(C.rlJoinCta)} onPress={() => void onJoin()} loading={busy} />
      </View>
    </Shell>
  );
}

/** Gabarit commun : même barre, même bloc, aucune card-in-card (§A). */
function Shell({
  t,
  title,
  children,
}: {
  t: ReturnType<typeof useT>;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <StackScreen title={title} icon="crew" kicker={t(C.kickerSeason)} backHref="/crew">
      <View style={styles.block}>{children}</View>
    </StackScreen>
  );
}

/** Le code réel, en mono, lisible et vérifiable à l'œil contre le QR scanné. */
function CodePlate({ code }: { code: string }) {
  return (
    <View style={styles.plate}>
      <Text style={styles.code}>{code}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Bloc à plat — StackScreen fournit déjà le contenant : y poser une Card
  // ferait card-in-card (§A).
  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  // Le code, en mono (exception fonctionnelle de la charte : timers et CODES
  // CREW) : il doit se relire caractère par caractère contre le QR scanné.
  plate: {
    alignSelf: 'flex-start',
    backgroundColor: colors.carbone2,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  code: {
    color: colors.blanc,
    fontFamily: fonts.mono,
    fontSize: fontSizes.lg,
    letterSpacing: 4,
  },
  // Un refus n'est pas une alarme : blanc, comme l'écran Crew (aucune couleur
  // hors tokens, et surtout pas de chartreuse — elle est réservée au CTA).
  error: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
  cta: { marginTop: spacing.sm },
});
