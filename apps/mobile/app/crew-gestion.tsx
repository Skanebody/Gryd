/**
 * GRYD — A · « GÉRER MON CREW » (route `/crew-gestion`), spec §4.1 A.
 *
 * ══ CE QUE CET ÉCRAN AJOUTE, ET CE QU'IL REMPLACE ═════════════════════════
 * Rien. Il n'existait AUCUNE mesure par membre avant 0189 : `crew_overview`
 * rendait un roster avec des rôles, et c'est tout. Un capitaine ne pouvait donc
 * ni voir qui décroche, ni le lui dire, ni décider sur autre chose qu'une
 * impression. C'est le trou ④ de la spec.
 *
 * ══ LA RÈGLE QUI GOUVERNE CHAQUE CELLULE ══════════════════════════════════
 * Une mesure vaut soit une valeur, soit « non partagé ». JAMAIS un zéro, jamais
 * un tiret. Un `0` affirmerait que la personne n'a pas couru, alors que le
 * serveur a seulement dit « je ne te le montre pas » : c'est exactement le
 * mensonge que L8 interdit, et c'est le plus facile à commettre ici. Tout
 * passe donc par `measureText` (pur, testé), et aucun `?? 0` n'existe dans ce
 * fichier.
 *
 * DEUX FAITS DE VIE PRIVÉE, dits À L'ÉCRAN et pas seulement en commentaire :
 *   · une mesure masquée l'est parce qu'AUCUNE règle active du crew ne la lit
 *     (§2.4, décision 2 du fondateur) ;
 *   · rien de tout ceci ne quitte l'application : l'export est REFUSÉ (§2.4),
 *     parce qu'un fichier de mesures nominatives échappe à `profile_visibility`
 *     et qu'il n'existe aucun moyen honnête de le reprendre.
 *
 * ══ QUATRE ÉTATS, ET UN CINQUIÈME QUI N'EN EST PAS UN ═════════════════════
 * pas connecté · en cours · échec · vide. Le cinquième, `forbidden`, n'est PAS
 * un échec : le serveur a répondu, et sa réponse est « ton rôle ne le permet
 * pas ». Lui donner un bouton « Réessayer » ferait tourner quelqu'un en rond.
 *
 * ══ UN SEUL CTA CHARTREUSE (§A4) ══════════════════════════════════════════
 * « Envoyer l'invitation ». C'est la seule action de cet écran qui AJOUTE
 * quelqu'un ; avertir et exclure sont des gestes graves, ils vivent dans la
 * feuille d'actions et n'ont aucune raison d'attirer l'œil depuis la liste.
 */
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import {
  CREW_BOARD_FILTERS,
  CREW_BOARD_SORT_DEFAULT,
  CREW_BOARD_SORTS,
  CREW_MAX_MEMBERS,
  colors,
  elevation,
  fontSizes,
  gameColors,
  radii,
  sizes,
  spacing,
  type CrewBoardFilter,
  type CrewBoardSort,
} from '@klaim/shared';
import {
  CREW_BOARD_FILTER_E,
  CREW_BOARD_SORT_E,
  CREW_STANDING_E,
  CREW_WARNING_KIND_E,
  G,
} from '../src/i18n/catalog/crewGestion';
import { C, CREW_ROLE_E } from '../src/i18n/catalog/crew';
import { useLocale, useT } from '../src/i18n/store';
import { useSession } from '../src/lib/session';
import { haptics } from '../src/lib/haptics';
import { StackScreen } from '../src/ui/StackScreen';
import { Button } from '../src/ui/Button';
import { Segmented } from '../src/ui/game/Segmented';
import { CrewJoinRequests } from '../src/features/crew/CrewJoinRequests';
import { PlayerModerationSheet } from '../src/features/crew/PlayerModerationSheet';
import { isCrewRole } from '../src/features/crew/memberRoles';
import { useRealCrew } from '../src/features/crew/real';
import { boardAlerts, type BoardRow2026 } from '../src/features/crew/management/crewBoard2026';
import {
  dayText,
  lastRunText,
  measureText,
  num,
} from '../src/features/crew/management/crewManagementCopy';
import {
  inviteByHandle,
  resolveWarning,
  useCrewBoard,
} from '../src/features/crew/management/crewManagementData';

/** Le filtre « tous » n'est pas un filtre du serveur : c'est son absence. */
type FilterChoice = CrewBoardFilter | 'all';

export default function CrewGestionRoute() {
  const t = useT();
  const locale = useLocale();
  const { session } = useSession();
  const [sort, setSort] = useState<CrewBoardSort>(CREW_BOARD_SORT_DEFAULT);
  const [filter, setFilter] = useState<FilterChoice>('all');
  const { loading, failed, refusal, data, reload } = useCrewBoard(
    sort,
    filter === 'all' ? null : filter,
  );
  /**
   * Le NOM du crew, pour l'aperçu du message reçu par une personne exclue. Le
   * tableau ne le rend pas (il ne parle que de membres) : sans cette lecture,
   * l'aperçu montrerait une phrase à trou, et on ne le montrerait donc pas.
   */
  const myCrew = useRealCrew();
  const [target, setTarget] = useState<BoardRow2026 | null>(null);
  const [handle, setHandle] = useState('');
  const [inviting, setInviting] = useState(false);
  /*
   * DEUX RETOURS, DEUX ENDROITS. Un seul état les afficherait aux DEUX places
   * (sous la liste et sous le champ d'invitation) : la même phrase deux fois,
   * dont une loin du geste qui l'a produite. On sépare ce qui répond à une
   * LIGNE de ce qui répond à l'INVITATION.
   */
  const [rowNotice, setRowNotice] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = data?.rows ?? [];
  const alerts = useMemo(
    () => (data ? boardAlerts(data) : { atRisk: 0, warned: 0 }),
    [data],
  );
  /**
   * MON rôle vient de MA ligne du tableau, pas d'un second appel : la vue
   * `crew_member_activity_2026` couvre tous les membres actifs, moi compris.
   * Un rôle deviné ici ouvrirait des actions que le serveur refuserait.
   */
  const myRole = useMemo(() => {
    const uid = session?.user.id;
    return uid ? (rows.find((r) => r.userId === uid)?.role ?? '') : '';
  }, [rows, session]);

  /**
   * LEVER UN AVERTISSEMENT. Il existe parce que le job ne peut PAS lever un
   * avertissement `manual` : aucun fait mesurable ne le déclenche, donc aucun
   * fait ne le lève. Sans cette action, un avertissement posé par erreur
   * resterait ouvert à vie dans le dossier de quelqu'un.
   *
   * La trace RESTE (levé n'est pas effacé) : c'est le journal qui garde
   * l'histoire, et cette action n'y touche pas.
   */
  const onResolve = useCallback(
    async (warningId: string) => {
      setRowNotice(null);
      const out = await resolveWarning(warningId);
      if (out.kind === 'ok') {
        haptics.success();
        setRowNotice(t(G.warnResolved));
        reload();
        return;
      }
      haptics.error();
      setRowNotice(
        out.kind === 'unsupported'
          ? t(G.refusedUnsupported)
          : out.kind === 'failed'
            ? t(G.actionFailed)
            : out.reason === 'forbidden'
              ? t(G.refusedForbidden)
              : t(G.refusedGeneric),
      );
    },
    [reload, t],
  );

  const onInvite = useCallback(async () => {
    if (inviting || handle.trim().length === 0) return;
    setInviting(true);
    setNotice(null);
    setError(null);
    const out = await inviteByHandle(handle);
    setInviting(false);
    if (out.kind === 'ok') {
      haptics.success();
      setNotice(t(out.effect === 'already_member' ? G.boardInviteAlready : G.boardInviteSent));
      setHandle('');
      // On RELIT : un « already_member » veut dire que le tableau est en retard.
      reload();
      return;
    }
    haptics.error();
    setError(
      out.kind === 'unsupported'
        ? t(G.refusedUnsupported)
        : out.kind === 'failed'
          ? t(G.actionFailed)
          : out.reason === 'not_found'
            ? t(G.refusedNotFound)
            : out.reason === 'full'
              ? t(G.refusedFull)
              : out.reason === 'already_in_crew'
                ? t(G.refusedAlreadyInCrew)
                : out.reason === 'self'
                  ? t(G.refusedSelf)
                  : out.reason === 'forbidden'
                    ? t(G.refusedForbidden)
                    : t(G.refusedGeneric),
    );
  }, [handle, inviting, reload, t]);

  // ── Pas connecté ──────────────────────────────────────────────────────────
  if (!session) {
    return (
      <StackScreen title={t(G.boardTitle)}>
        <View style={styles.block}>
          <Text style={styles.body}>{t(G.boardSignedOut)}</Text>
        </View>
      </StackScreen>
    );
  }

  // ── Le serveur a RÉPONDU non : ce n'est pas une panne, pas de « Réessayer » ─
  if (refusal === 'forbidden' || refusal === 'no_crew') {
    return (
      <StackScreen title={t(G.boardTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>
            {t(refusal === 'forbidden' ? G.boardForbiddenTitle : G.boardNoCrewTitle)}
          </Text>
          <Text style={styles.body}>
            {t(refusal === 'forbidden' ? G.boardForbiddenBody : G.boardNoCrewBody)}
          </Text>
        </View>
      </StackScreen>
    );
  }

  // ── Échec de lecture — n'affirme RIEN sur les membres ─────────────────────
  if (failed) {
    return (
      <StackScreen title={t(G.boardTitle)}>
        <View style={styles.block}>
          <Text style={styles.title}>{t(G.boardFailedTitle)}</Text>
          <Text style={styles.body}>{t(G.boardFailedBody)}</Text>
          <View style={styles.cta}>
            <Button label={t(C.rlRetry)} onPress={reload} loading={loading} />
          </View>
        </View>
      </StackScreen>
    );
  }

  // ── Lecture EN COURS : un squelette de trois lignes, jamais un rond seul ───
  if (loading && !data) {
    return (
      <StackScreen title={t(G.boardTitle)} kicker={t(G.boardKicker)}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.chartreuse} />
          <Text style={styles.body}>{t(G.boardLoading)}</Text>
        </View>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.skeleton} />
        ))}
      </StackScreen>
    );
  }

  if (!data) return null;

  const rulesCount = Object.keys(data.rulesActive).length;
  const generated = dayText(data.generatedAtMs, locale);

  return (
    <>
      <StackScreen title={t(G.boardTitle)} kicker={t(G.boardKicker)}>
        {/* ── EN-TÊTE : l'effectif et les règles armées ─────────────────── */}
        <View style={styles.head}>
          <Text style={styles.headLine}>
            {t(G.boardHeadcount, { n: rows.length, max: CREW_MAX_MEMBERS })}
          </Text>
          <Text style={styles.headNote}>
            {rulesCount > 0 ? t(G.boardRulesActive, { n: rulesCount }) : t(G.boardRulesNone)}
          </Text>
        </View>

        {/* ── ALERTES : masquées quand il n'y a rien à dire (§A) ──────────── */}
        {alerts.atRisk > 0 || alerts.warned > 0 ? (
          <View style={styles.alerts}>
            {alerts.atRisk > 0 ? (
              <Text style={styles.alertStrong}>{t(G.boardAlertAtRisk, { n: alerts.atRisk })}</Text>
            ) : null}
            {alerts.warned > 0 ? (
              <Text style={styles.alert}>{t(G.boardAlertWarned, { n: alerts.warned })}</Text>
            ) : null}
          </View>
        ) : null}

        {/* ── LES DEMANDES REÇUES, là où on peut y répondre ───────────────── */}
        <CrewJoinRequests />

        {/* ── TRI ET FILTRES : catalogues FERMÉS, refusés serveur si inventés ─ */}
        <View style={styles.controls}>
          <Text style={styles.label}>{t(G.boardSortLabel)}</Text>
          <Segmented
            scrollable
            tone="surface"
            accessibilityLabel={t(G.boardSortLabel)}
            value={sort}
            onChange={(id: CrewBoardSort) => setSort(id)}
            options={CREW_BOARD_SORTS.map((id) => ({ id, label: t(CREW_BOARD_SORT_E[id]) }))}
          />
        </View>
        <View style={styles.controls}>
          <Text style={styles.label}>{t(G.boardFilterLabel)}</Text>
          <Segmented
            scrollable
            tone="surface"
            accessibilityLabel={t(G.boardFilterLabel)}
            value={filter}
            onChange={(id: FilterChoice) => setFilter(id)}
            options={[
              { id: 'all' as FilterChoice, label: t(G.boardFilterAll) },
              ...CREW_BOARD_FILTERS.map((id) => ({
                id: id as FilterChoice,
                label: t(CREW_BOARD_FILTER_E[id]),
              })),
            ]}
          />
        </View>

        {/* ── LA LISTE, ou son absence DITE ───────────────────────────────── */}
        {rows.length === 0 ? (
          <View style={styles.block}>
            <Text style={styles.title}>
              {filter === 'all' ? t(G.boardEmptyTitle) : t(G.boardEmptyFiltered)}
            </Text>
            {filter === 'all' ? <Text style={styles.body}>{t(G.boardEmptyBody)}</Text> : null}
          </View>
        ) : (
          rows.map((row) => (
            <MemberRow
              key={row.userId}
              row={row}
              isMe={row.userId === session.user.id}
              onOpen={() => {
                haptics.light();
                setTarget(row);
              }}
              onResolve={(id) => void onResolve(id)}
            />
          ))
        )}
        {/* Le retour des gestes de LIGNE (levée d'avertissement) vit ici, sous
            la liste : au-dessus, il serait poussé hors de l'écran par le tri. */}
        {rowNotice ? <Text style={styles.notice}>{rowNotice}</Text> : null}

        {/* ── INVITER : le seul CTA chartreuse de l'écran ─────────────────── */}
        <View style={styles.invite}>
          <Text style={styles.label}>{t(G.boardInviteTitle)}</Text>
          <TextInput
            style={styles.input}
            value={handle}
            onChangeText={setHandle}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t(G.boardInviteTitle)}
            placeholderTextColor={colors.gris}
          />
          <Text style={styles.note}>{t(G.boardInviteHint)}</Text>
          <Button
            label={t(G.boardInviteCta)}
            onPress={() => void onInvite()}
            loading={inviting}
            disabled={handle.trim().length === 0}
            analyticsId="crew_invite_by_handle"
          />
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {/* ── PIED : les deux écrans voisins ──────────────────────────────── */}
        <FooterLink label={t(G.boardToRules)} onPress={() => router.push('/crew-regles')} />
        <FooterLink label={t(G.boardToJournal)} onPress={() => router.push('/crew-journal')} />

        {/* ── CE QUE CES CHIFFRES SONT, ET CE QU'ILS NE FONT PAS ──────────── */}
        <Text style={styles.privacy}>{t(G.boardPrivacyNote)}</Text>
        <Text style={styles.privacy}>{t(G.boardNoExport)}</Text>
        {generated ? <Text style={styles.privacy}>{generated}</Text> : null}
      </StackScreen>

      {/*
        LA FEUILLE D'ACTIONS, celle qui existe déjà. On ne la duplique pas : elle
        porte le rôle, la modération et, depuis ce lot, l'avertissement et
        l'exclusion À MOTIF. `crewName` sert à l'aperçu du message reçu par la
        personne exclue : sans lui, on lui montrerait une phrase à trou.
      */}
      <PlayerModerationSheet
        pseudo={target?.pseudo ?? null}
        onClose={() => setTarget(null)}
        crew={
          target
            ? {
                userId: target.userId,
                actorRole: myRole,
                targetRole: target.role,
                crewName: myCrew.crew?.name ?? null,
                onChanged: reload,
              }
            : null
        }
      />
    </>
  );
}

/**
 * UNE LIGNE. Elle dit, dans cet ordre : qui, quel rôle, quand pour la dernière
 * fois, combien sur 28 jours, et son état au regard des règles. Rien de plus :
 * un tableau à onze colonnes sur un téléphone se lit de travers, et le détail
 * complet vit dans la feuille d'actions.
 */
function MemberRow({
  row,
  isMe,
  onOpen,
  onResolve,
}: {
  row: BoardRow2026;
  isMe: boolean;
  onOpen: () => void;
  onResolve: (warningId: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const now = Date.now();
  const removal = dayText(row.removalAtMs, locale);
  const tone =
    row.standing === 'at_risk'
      ? styles.standingRisk
      : row.standing === 'warned'
        ? styles.standingWarned
        : styles.standingCalm;

  return (
    <View style={styles.row}>
      <View style={styles.rowMain}>
        {/* Le pseudo n'est PAS tronqué : décider sur un nom coupé, c'est
            décider sur autre chose que la personne (§A.9). */}
        <Text style={styles.pseudo}>{row.pseudo}</Text>
        <Text style={styles.meta}>
          {isCrewRole(row.role) ? t(CREW_ROLE_E[row.role]) : row.role}
          {' · '}
          {lastRunText(t, row.lastRunAt, now)}
        </Text>
        <Text style={styles.meta}>
          {t(G.boardKm, { n: measureText(t, row.distance28dKm) })}
          {' · '}
          {t(G.boardSeniority, { n: num(row.seniorityDays) })}
        </Text>
        <Text style={[styles.standing, tone]}>{t(CREW_STANDING_E[row.standing])}</Text>
        {/*
          ── 11/09/2026 (lot Q4) · ON LÈVE UN AVERTISSEMENT PRÉCIS ────────────
          ÉTAPE 0, le défaut mot pour mot :

            <Text>{t(G.boardWarningsCount, { n: row.warnings.length })}</Text>
            <Pressable … onPress={() => onResolve(row.warnings[0]!.id)}>
              <Text>{t(G.warnResolveCta)}</Text>

          Un SEUL bouton, qui levait le plus RÉCENT, sous un compteur disant
          « 3 avertissements en cours ». Le libellé promettait « Lever cet
          avertissement » sans jamais dire lequel, et deux des trois restaient
          inatteignables : un capitaine qui voulait annuler l'avertissement
          d'avant-hier levait celui d'hier, sans s'en apercevoir. Le
          justificatif d'alors (« un bouton par avertissement ferait une pile
          de gestes identiques ») décrivait le vrai risque, et la sortie n'est
          pas de choisir à la place de quelqu'un : c'est que chaque ligne dise
          CE QU'ELLE lève. Elles ne sont plus identiques.

          La trace RESTE dans le journal : levé n'est pas effacé (§6.3).
        */}
        {row.warnings.length > 0 ? (
          <View style={styles.warnings}>
            <Text style={styles.meta}>{t(G.boardWarningsCount, { n: row.warnings.length })}</Text>
            {row.warnings.map((w) => {
              const issued = dayText(w.issuedAtMs, locale);
              const kind = t(CREW_WARNING_KIND_E[w.kind]);
              return (
                <View key={w.id} style={styles.warnRow}>
                  <View style={styles.warnBody}>
                    <Text style={styles.meta}>
                      {kind}
                      {issued ? ` · ${issued}` : ''}
                      {' · '}
                      {t(w.issuedBy === 'officer' ? G.warnByOfficer : G.warnByServer)}
                    </Text>
                    {/* La note n'est PAS tronquée : elle dit pourquoi
                        l'avertissement existe, et on décide dessus. */}
                    {w.note ? <Text style={styles.meta}>{w.note}</Text> : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    /* Le nom accessible porte le QUOI et le QUI : « Lever »
                       seul, lu par VoiceOver dans une liste de trois, ne
                       distinguerait rien. */
                    accessibilityLabel={`${t(G.warnResolveCta)} · ${kind} · ${row.pseudo}`}
                    onPress={() => {
                      haptics.light();
                      onResolve(w.id);
                    }}
                    hitSlop={8}
                    style={({ pressed }) => [styles.inlineAction, pressed && styles.dim]}
                  >
                    <Text style={styles.inlineActionText}>{t(G.warnResolveShort)}</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        ) : null}
        {/* La date de retrait n'apparaît QUE si le serveur l'a rendue : sans
            retrait armé, il n'y a pas de risque, donc rien à annoncer. */}
        {removal && row.standing === 'at_risk' ? (
          <Text style={styles.risk}>{t(G.boardRemovalOn, { date: removal })}</Text>
        ) : null}
      </View>
      {/* MA ligne ne porte pas d'actions : `roleActionsFor` les refuse déjà, et
          peindre un bouton qui n'ouvrirait rien serait un bouton mort. */}
      {isMe ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(G.boardOpenMember, { name: row.pseudo })}
          onPress={onOpen}
          hitSlop={8}
          style={({ pressed }) => [styles.rowAction, pressed && styles.dim]}
        >
          <Text style={styles.rowActionGlyph}>···</Text>
        </Pressable>
      )}
    </View>
  );
}

/** Lien de pied : jamais un second bouton chartreuse (§A4). */
function FooterLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        haptics.light();
        onPress();
      }}
      style={({ pressed }) => [styles.footer, pressed && styles.dim]}
    >
      <Text style={styles.footerText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { marginTop: spacing.lg, gap: spacing.md },
  title: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  body: { color: colors.gris, fontSize: fontSizes.md, lineHeight: 22 },
  note: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
  cta: { marginTop: spacing.sm },
  center: { marginTop: spacing.xl, alignItems: 'center', gap: spacing.sm },
  dim: { opacity: 0.6 },

  skeleton: {
    marginTop: spacing.md,
    height: 64,
    borderRadius: radii.control,
    backgroundColor: elevation.raised,
  },

  head: { marginTop: spacing.md, gap: spacing.xxs },
  headLine: { color: colors.blanc, fontSize: fontSizes.lg, fontWeight: '600' },
  headNote: { color: colors.gris, fontSize: fontSizes.sm },

  alerts: { marginTop: spacing.lg, gap: spacing.xxs },
  // L15 : la couleur n'est jamais seule. Le mot « à risque de retrait » porte
  // l'information ; la teinte ne fait que la hiérarchiser.
  alertStrong: { color: gameColors.danger, fontSize: fontSizes.md, fontWeight: '600' },
  alert: { color: colors.blanc, fontSize: fontSizes.md },

  controls: { marginTop: spacing.lg, gap: spacing.xs },
  label: { color: colors.blanc, fontSize: fontSizes.sm, fontWeight: '600' },

  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.grisLigne,
    minHeight: sizes.touchTarget,
  },
  rowMain: { flex: 1, gap: 2 },
  pseudo: { color: colors.blanc, fontSize: fontSizes.md, fontWeight: '600' },
  meta: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20 },
  standing: { fontSize: fontSizes.sm, fontWeight: '600' },
  standingCalm: { color: colors.gris },
  standingWarned: { color: colors.blanc },
  standingRisk: { color: gameColors.danger },
  risk: { color: gameColors.danger, fontSize: fontSizes.sm, lineHeight: 20 },
  rowAction: {
    width: sizes.touchTarget,
    height: sizes.touchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActionGlyph: { color: colors.gris, fontSize: fontSizes.lg },
  // La liste des avertissements : une ligne par avertissement, à plat. Aucune
  // card ici — la ligne de membre en est déjà une (§A, jamais de card-in-card).
  warnings: { gap: spacing.xxs, marginTop: spacing.xxs },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
  },
  warnBody: { flex: 1, gap: spacing.xxs },
  inlineAction: { minHeight: sizes.touchTarget, justifyContent: 'center' },
  inlineActionText: { color: colors.blanc, fontSize: fontSizes.sm, textDecorationLine: 'underline' },

  invite: { marginTop: spacing.xl, gap: spacing.xs },
  input: {
    backgroundColor: elevation.raised,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.grisLigne,
    color: colors.blanc,
    fontSize: fontSizes.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: sizes.touchTarget,
  },
  notice: { color: colors.blanc, fontSize: fontSizes.sm, lineHeight: 20 },
  error: { color: gameColors.danger, fontSize: fontSizes.sm, lineHeight: 20 },

  footer: { marginTop: spacing.lg, minHeight: sizes.touchTarget, justifyContent: 'center' },
  footerText: { color: colors.blanc, fontSize: fontSizes.md, textDecorationLine: 'underline' },

  privacy: { color: colors.gris, fontSize: fontSizes.sm, lineHeight: 20, marginTop: spacing.md },
});
