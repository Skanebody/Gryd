/**
 * GRYD — ATTERRISSAGE D'UNE INVITATION CREW (`gryd://c/CODE`,
 * `https://gryd.run|gryd.app/c/CODE`). Demande fondateur 21/07/2026 : le QR
 * recrute, ET il inscrit celui qui n'a pas encore l'app. C'est l'écran que
 * traverse TOUT nouveau recruté — donc celui qui a le moins le droit de mentir.
 *
 * ── ORDRE DE COMPOSITION (Vague 1, grammaire des écrans poussés) ────────────
 *  1. barre `StackScreen` : retour + titre « Invitation » + action COPIER à droite ;
 *  2. kicker mono gris — le CONTEXTE de l'écran, jamais un chiffre de saison ;
 *  3. titre de l'état courant (un état = un titre) ;
 *  4. la plaque du CODE réel, en mono, sélectionnable ;
 *  5. le corps qui dit ce que le geste DEMANDE ;
 *  6. l'avertissement de changement de crew, quand il est vrai ;
 *  7. le refus serveur, s'il y en a un (annoncé comme alerte) ;
 *  8. UN SEUL CTA chartreuse — « Rejoindre », « Se connecter », « Réessayer » ou
 *     « Voir mon crew » selon l'état. Jamais deux (§A.4).
 *
 * ── LES QUATRE ÉTATS, NOMMÉS SÉPARÉMENT ─────────────────────────────────────
 *  ① pas connecté  → on MÉMORISE l'intention (24 h) et on envoie s'inscrire ; la
 *    reprise se fait dans `startPendingInviteWatcher`. Sans backend (`configured`
 *    faux), aucun bouton : une phrase. Un CTA qui n'a personne au bout est mort.
 *  ② lu et vide    → pas de crew : rejoindre est une simple entrée.
 *  ③ échec         → `inviteMembership` le SÉPARE du vide et propose « Réessayer ».
 *  ④ lecture       → une LIGNE grise non tapable. Aucun CTA : il changerait sous
 *    le doigt une demi-seconde plus tard.
 * Un 5ᵉ état existe parce que la réalité en a un de plus : DÉJÀ MEMBRE DE CE
 * CREW — l'invitation est alors sans objet, et un 6ᵉ, MEMBRE D'UN AUTRE CREW,
 * où l'adhésion est un REMPLACEMENT (cf. ci-dessous).
 *
 * ── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ────────────────────────────────────────
 *  · « SAISON 0 » en kicker (`C.kickerSeason`) — constante EN DUR, jamais une
 *    lecture de `useActiveSeason`. `arsenal.tsx:233` lit le vrai numéro et
 *    `performance.tsx` REFUSE le segment « Saison » faute de saison ouverte :
 *    trois écrans, trois vérités. Remplacé par le contexte de l'écran.
 *  · L'ÉCRAN NOIR DU CHARGEMENT DE SESSION — la branche `sessionLoading` rendait
 *    le gabarit SANS AUCUN ENFANT : barre, titre, puis du noir. Remplacé par la
 *    ligne d'état ④.
 *  · LA LECTURE NAÏVE DE `fetchMyCode` — `if (res.ok && res.code === code)`
 *    traitait une RPC injoignable EXACTEMENT comme « tu n'es pas dans ce crew ».
 *    La décision vit maintenant dans `features/invite/inviteMembership.ts`
 *    (PURE, 11 tests Deno), qui croise la lecture du code et la lecture
 *    d'adhésion pour rendre la panne détectable.
 *  · LA PROMESSE « Ce code t'ouvre le crew » — donnée avant tout appel serveur,
 *    alors qu'aucune RPC publique ne peut résoudre le code (cf. écart 1).
 *  · LE CONTOUR PERMANENT de la plaque de code : un contour signale un ÉTAT
 *    (règle 80/20), pas une frontière ; la surface N2 suffit à détacher le code.
 *
 * ── ÉCARTS ASSUMÉS À LA PLANCHE (E16, variante crew) ────────────────────────
 *  1. LE NOM DU CREW N'EST PAS AFFICHÉ AVANT L'ADHÉSION. Raison technique : la
 *     colonne `crews.code` est SECRÈTE depuis la migration 0036 et aucune RPC
 *     publique ne résout un code en `{ nom, effectif }`. En écrire une exposerait
 *     nom + effectif à quiconque devine un code (6 caractères) — une fuite, et
 *     une énumération. On montre donc le CODE réel, puis le VRAI nom une fois
 *     l'adhésion accordée par le serveur (`rlWelcome`). Mieux vaut un écran sobre
 *     qu'un nom inventé.
 *  2. NI « Expire dans 7 jours », NI « 3 places restantes », NI « validée par un
 *     officier ». Raison technique : les codes de 0042 n'ont AUCUNE expiration en
 *     base, `crew_members` n'est pas lisible pour un crew dont on n'est pas
 *     membre (RLS), et il n'existe aucune file de validation — `join_crew_by_code`
 *     tranche seule, sans humain.
 *  3. PAS DE QR NI DE « Nouveau code » ICI : c'est le côté ÉMETTEUR de la planche,
 *     et il existe déjà (`features/crew/CrewInviteQRScreen`). Deux générateurs
 *     divergeraient au premier changement de format de lien.
 *  4. L'URL COPIABLE de la planche devient un CODE copiable : le lien complet
 *     n'est pas affiché sur cet écran (le destinataire arrive PAR lui), et le
 *     code est justement ce qui se ressaisit à la main dans l'onglet Crew.
 *
 * ── ÉTAT AU 28/07/2026 : LES ÉCARTS 1 ET 2 ONT UNE SORTIE, PAS ENCORE PRISE ─
 * `supabase/migrations/0090_crew_invite_tokens.sql` ajoute un SECOND objet
 * d'invitation à côté du code : un JETON de 26 caractères tiré de 128 bits, qui
 * EXPIRE (`expires_at` NOT NULL) et se RÉVOQUE. Parce qu'il n'est pas devinable,
 * `peek_crew_invite` peut rendre nom + effectif AVANT l'adhésion sans ouvrir
 * l'énumération que l'écart 1 redoutait, et `redeem_crew_invite` porte une date
 * que l'écart 2 disait inexistante.
 * ⚠ CET ÉCRAN N'EN CONSOMME RIEN AUJOURD'HUI. Il ne lit que `params.code`, ne
 * reconnaît que le format `[A-Z0-9]{6}` (`normalizeInviteCode`) et n'appelle
 * que `join_crew_by_code`. Les deux écarts ci-dessus restent donc VRAIS pour ce
 * qu'il affiche — ils cesseront de l'être le jour où un `/i/[token]` sera
 * branché, pas avant. Les décisions clientes de ce jour-là existent déjà,
 * pures et testées : `features/crew/inviteToken.ts`.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  colors,
  elevation,
  fonts,
  fontSizes,
  iconSizes,
  radii,
  sizes,
  spacing,
  typography,
} from '@klaim/shared';
import { C } from '../../src/i18n/catalog/crew';
import { useT } from '../../src/i18n/store';
import type { Entry } from '../../src/i18n/types';
import { EVENTS, screen, track } from '../../src/lib/analytics';
import { useSession } from '../../src/lib/session';
import { Button } from '../../src/ui/Button';
import { Icon } from '../../src/ui/Icon';
import { StackScreen } from '../../src/ui/StackScreen';
import { useRealCrew, type CrewRefusal } from '../../src/features/crew/real';
import { normalizeInviteCode, rememberPendingInvite } from '../../src/features/crew/pendingInvite';
import {
  inviteMembership,
  type MyCodeRead,
} from '../../src/features/invite/inviteMembership';
import { ToastHost, useToast } from '../../src/features/social/Toast';
import { copyText } from '../../src/features/share/shareActions';

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
  const toast = useToast();
  const params = useLocalSearchParams<{ code?: string; welcome?: string }>();
  const { session, loading: sessionLoading, configured } = useSession();
  const {
    ready,
    loading: membershipLoading,
    loadFailed,
    crew,
    joinByCode,
    fetchMyCode,
    reload,
  } = useRealCrew();

  const code = normalizeInviteCode(params.code);
  /** Nom réel du crew rejoint (param posé par la reprise post-inscription, ou
   *  renvoyé par la RPC ici même). Sa présence = l'adhésion est ACQUISE. */
  const [joinedName, setJoinedName] = useState<string | null>(params.welcome ?? null);
  /** Réponse de `my_crew_code`. `null` = elle n'est pas revenue — ce n'est PAS
   *  « pas de crew », et c'est toute la différence (cf. inviteMembership). */
  const [codeRead, setCodeRead] = useState<MyCodeRead | null>(null);
  /** Compteur de tentatives : le seul moyen de RELANCER la lecture du code. */
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Msg | null>(null);

  useEffect(() => {
    screen('crew_invite');
  }, []);

  // ── ① Pas connecté : on MÉMORISE avant tout, même si la personne ferme
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

  // ── Suis-je déjà dans CE crew ? Le seul moyen honnête : comparer avec MON
  //    code (RPC my_crew_code) — jamais une lecture de la colonne secrète.
  //    Le résultat est stocké TEL QUEL, y compris son échec : c'est
  //    `inviteMembership` qui décide ce qu'il signifie.
  useEffect(() => {
    if (!code || !ready || joinedName) return;
    let alive = true;
    setCodeRead(null);
    void (async () => {
      const res = await fetchMyCode();
      if (alive) setCodeRead(res.ok ? { ok: true, code: res.code } : { ok: false });
    })();
    return () => {
      alive = false;
    };
  }, [code, ready, joinedName, fetchMyCode, attempt]);

  // ── Rejoindre — décidé SERVEUR, une seule action à l'écran.
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

  /** ③ « Réessayer » relance les DEUX lectures : l'adhésion et le code. */
  const onRetry = useCallback(() => {
    reload();
    setAttempt((a) => a + 1);
  }, [reload]);

  /**
   * Copier le code (E16 : l'identité d'invitation doit être COPIABLE). On
   * n'annonce « copié » que si le presse-papier a VRAIMENT servi : `copyText`
   * retombe silencieusement sur la feuille de partage quand expo-clipboard est
   * absent, en renvoyant quand même `ok:true` — annoncer « copié » dans ce cas
   * serait un mensonge d'écran (même correctif que CrewInviteQRScreen).
   */
  const onCopy = useCallback(() => {
    if (!code) return;
    void copyText(code).then((r) => {
      if (r.ok) {
        toast.show(t(r.via === 'clipboard' ? C.qrCopied : C.qrShared));
        return;
      }
      if (r.reason === 'unavailable') toast.show(t(C.qrShareUnavailable));
    });
  }, [code, t, toast]);

  const goToCrew = useCallback(() => router.replace('/crew'), []);

  /** Action d'en-tête — présente dès qu'il y a un code à copier. */
  const copyAction = code ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(C.qrCopyCode)}
      onPress={onCopy}
      hitSlop={8}
      style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
    >
      <Icon name="copier" size={iconSizes.md} color={colors.blanc} />
    </Pressable>
  ) : undefined;

  const shell = {
    t,
    title: t(C.cInviteTitle),
    headerRight: copyAction,
    floating: <ToastHost state={toast} />,
  };

  // ── Rendu : un état = un titre + un corps + AU PLUS un CTA ──────────────────

  // Lien illisible (code absent, tronqué, bricolé) : on ne devine rien.
  if (!code) {
    return (
      <Shell {...shell}>
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
      <Shell {...shell}>
        <Text style={styles.title}>{t(C.rlWelcome, { name: joinedName })}</Text>
        <View style={styles.cta}>
          <Button label={t(C.cInviteSeeCrew)} onPress={goToCrew} />
        </View>
      </Shell>
    );
  }

  // ④ Restauration de session : une LIGNE, pas un écran noir. On montre déjà ce
  //   qu'on sait — le code — et rien d'autre n'est affirmé.
  if (sessionLoading) {
    return (
      <Shell {...shell}>
        <CodePlate code={code} />
        <Text style={styles.stateInline}>{t(C.cInviteSessionReading)}</Text>
      </Shell>
    );
  }

  // ① Pas connecté — l'invitation est déjà mémorisée, on l'annonce.
  if (!ready) {
    return (
      <Shell {...shell}>
        <Text style={styles.title}>{t(C.cInviteSignedOutTitle)}</Text>
        <CodePlate code={code} />
        <Text style={styles.body}>
          {configured ? t(C.cInviteSignedOutBody) : t(C.rlSignedOutBody)}
        </Text>
        {configured ? (
          <View style={styles.cta}>
            <Button
              label={t(C.rlSignIn)}
              analyticsId="crew_invite_sign_in"
              onPress={() => router.push('/sign-in')}
            />
          </View>
        ) : null}
      </Shell>
    );
  }

  const membership = inviteMembership({
    codeRead,
    membershipLoading,
    membershipFailed: loadFailed,
    hasCrew: crew !== null,
    invitedCode: code,
  });

  // ④ On lit encore : aucun CTA. Il changerait sous le doigt.
  if (membership === 'reading') {
    return (
      <Shell {...shell}>
        <CodePlate code={code} />
        <Text style={styles.stateInline}>{t(C.cInviteMemberReading)}</Text>
      </Shell>
    );
  }

  // ③ Échec de lecture — DISTINCT du vide. On ne propose surtout pas
  //   « Rejoindre » à quelqu'un qui est peut-être déjà membre.
  if (membership === 'unreadable') {
    return (
      <Shell {...shell}>
        <Text style={styles.title}>{t(C.cInviteUnknownTitle)}</Text>
        <CodePlate code={code} />
        <Text style={styles.body}>{t(C.cInviteUnknownBody)}</Text>
        <View style={styles.cta}>
          {/* Pas de `loading` ici : « Réessayer » remet `codeRead` à null, donc
              l'écran repasse à l'état ④ (la ligne grise) le temps de la relecture.
              C'est la même information, dite au bon endroit. */}
          <Button label={t(C.rlRetry)} analyticsId="crew_invite_retry" onPress={onRetry} />
        </View>
      </Shell>
    );
  }

  // Déjà membre de CE crew : l'invitation est sans objet.
  if (membership === 'this-crew') {
    return (
      <Shell {...shell}>
        <Text style={styles.title}>{t(C.cInviteAlreadyMine)}</Text>
        <View style={styles.cta}>
          <Button label={t(C.cInviteSeeCrew)} onPress={goToCrew} />
        </View>
      </Shell>
    );
  }

  // ② Rejoindre. Depuis un AUTRE crew, le serveur fait un SWITCH (0042 §2 :
  //   `left_at = now()` sur l'adhésion active avant l'insert) — donc on le dit
  //   AVANT le tap, et le titre nomme le vrai geste.
  const isSwitch = membership === 'other-crew';
  return (
    <Shell {...shell}>
      <Text style={styles.title}>
        {t(isSwitch ? C.cInviteSwitchTitle : C.cInviteJoinTitle)}
      </Text>
      <CodePlate code={code} />
      <Text style={styles.body}>{t(C.cInviteJoinBody)}</Text>
      {isSwitch ? <Text style={styles.notice}>{t(C.cInviteSwitchNote)}</Text> : null}
      {error ? (
        <Text style={styles.notice} accessibilityRole="alert">
          {t(error.entry, error.vars)}
        </Text>
      ) : null}
      <View style={styles.cta}>
        <Button
          label={t(C.rlJoinCta)}
          loading={busy}
          analyticsId="crew_invite_join"
          onPress={() => void onJoin()}
        />
      </View>
    </Shell>
  );
}

/** Gabarit commun : même barre, même bloc, aucune card-in-card (§A). */
function Shell({
  t,
  title,
  headerRight,
  floating,
  children,
}: {
  t: ReturnType<typeof useT>;
  title: string;
  headerRight?: React.ReactNode;
  floating?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <StackScreen
      title={title}
      icon="crew"
      kicker={t(C.cInviteKicker)}
      backHref="/crew"
      headerRight={headerRight}
      floating={floating}
    >
      <View style={styles.block}>{children}</View>
    </StackScreen>
  );
}

/** Le code réel, en mono, lisible et vérifiable à l'œil contre le QR scanné. */
function CodePlate({ code }: { code: string }) {
  return (
    <View style={styles.plate}>
      {/* Sélectionnable : le code se ressaisit à la main dans l'onglet Crew, et
          l'action COPIER de l'en-tête ne couvre pas la sélection partielle. */}
      <Text style={styles.code} selectable>
        {code}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerAction: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },

  // Bloc à plat — StackScreen fournit déjà le contenant : y poser une Card
  // ferait card-in-card (§A).
  block: { marginTop: spacing.lg, gap: spacing.md },
  // Rôles typo consommés, jamais recodés : les deux styles posaient une taille
  // et une graisse à la main SANS `fontFamily` — donc en fonte SYSTÈME, la
  // seule fonte que la charte n'a pas choisie.
  title: { ...typography.title, color: colors.blanc },
  body: { ...typography.body, color: colors.gris },
  // Ligne d'état ④ : grise, non tapable, jamais un spinner plein écran.
  stateInline: { ...typography.body, color: colors.gris },
  /**
   * Le code, en mono (exception fonctionnelle de la charte : timers et CODES
   * CREW) : il doit se relire caractère par caractère contre le QR scanné.
   * Surface N2 SANS contour — un contour signale un ÉTAT (règle 80/20), et le
   * contraste carbone2 sur noir suffit à détacher la plaque.
   */
  plate: {
    alignSelf: 'flex-start',
    backgroundColor: elevation.raised,
    borderRadius: radii.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  code: {
    color: colors.blanc,
    fontFamily: fonts.mono,
    fontSize: fontSizes.lg,
    letterSpacing: 4,
  },
  // Un refus, ou un avertissement de changement de crew, n'est pas une alarme :
  // BLANC (le gris est réservé au corps), doublé du texte qui porte le sens —
  // aucune couleur ne le porte seule (règle 13), et surtout pas la chartreuse,
  // réservée au CTA.
  notice: { ...typography.body, color: colors.blanc },
  cta: { marginTop: spacing.sm },
});
