/**
 * GRYD — « Ta commune, cette semaine ». ADR-013 §2.1, lot L.
 *
 * ═══ CE QUE CET ÉCRAN NE FAIT JAMAIS ═══════════════════════════════════════
 *  · Il n'affiche AUCUNE allure, AUCUN chrono, AUCUN record — et il le DIT
 *    (`noteMetrique`), pour qu'on ne prenne pas leur absence pour un oubli
 *    (§6.2, §6.5 du cahier ; §16.1 « les outils de comparaison restent privés »).
 *  · Il ne peint aucune portée fermée. Pas d'onglet gris « Europe » : une
 *    portée s'ouvre à la présence réelle de gens, sinon elle n'existe pas dans
 *    l'interface (« aucun bouton mort », CLAUDE.md).
 *  · Il n'affiche jamais un « 0 » nu. « Tu n'as pas encore pris de terrain ici
 *    cette semaine » est une phrase ; « 0 km² » serait un chiffre faux.
 *  · Il n'affiche jamais un classement sans son heure de mesure — le modèle
 *    refuse même de le lire (`CommuneLeaderboard2026Model.ts`).
 *
 * ═══ LES SIX ÉTATS, TOUS DISTINCTS (CLAUDE.md) ═════════════════════════════
 *   pas connecté · en cours · échec de lecture · pas assez de monde ici ·
 *   aucune mesure cette semaine · classé.
 * « Pas assez de monde » n'est pas « vide », et « aucune mesure » n'est pas
 * « échec » : le serveur les nomme séparément (0164), l'écran les rend
 * séparément.
 *
 * ⚠️ PAS CONNECTÉ : la lecture est REFUSÉE, et c'est un choix. Un classement
 * nomme des personnes dans un lieu ; l'ouvrir au rôle `anon` publierait, pour
 * quiconque détient la clé publique, la liste des gens qui courent dans une
 * commune cette semaine. Tout le socle 2026 lit de la même façon
 * (`get_ownership_2026`). L'écran le dit sans détour et propose la connexion —
 * il ne fabrique pas un aperçu.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { fonts, refonteColors as c, LEADERBOARD_ROWS_LIMIT, type Activity } from '@klaim/shared';
import { GrydIcon } from '../../ui/gryd';
import { C } from '../../i18n/catalog/classement';
import { useLocale, useT } from '../../i18n/store';
import { screen } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { useMapActivity } from '../map/mapPref';
import { ProfileButton, ProfilePage, ProfileSegments } from './ProfilePrimitives';
import { AccountDoor2026 } from '../account/AccountDoor2026';
import {
  formatMeasuredAt2026,
  formatSquareKm2026,
  paintedScopes2026,
  parseLeaderboard2026,
  parseLeaderboardScopes2026,
  type LeaderboardBoard2026,
  type LeaderboardScope2026,
  type LeaderboardScopeKind2026,
  type LeaderboardScopes2026,
} from './CommuneLeaderboard2026Model';

type Reading<T> = { status: 'loading' | 'failed' | 'ready'; value: T | null };
const LOADING = { status: 'loading', value: null } as const;

/** Lit les portées ouvertes, puis le classement de la portée choisie. */
function useCommuneLeaderboard2026(activity: Activity, scope: LeaderboardScopeKind2026 | null) {
  const { session, loading: authLoading } = useSession();
  const [scopes, setScopes] = useState<Reading<LeaderboardScopes2026>>(LOADING);
  const [board, setBoard] = useState<Reading<LeaderboardBoard2026>>(LOADING);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((n) => n + 1), []);

  useEffect(() => {
    let alive = true;
    if (authLoading) return;
    if (!supabase || !session) { setScopes({ status: 'ready', value: null }); return; }
    setScopes(LOADING);
    void Promise.resolve(supabase.rpc('my_leaderboard_scopes_2026', { p_activity: activity }))
      .then(({ data, error }) => {
        if (!alive) return;
        const parsed = error ? null : parseLeaderboardScopes2026(data, activity);
        setScopes(parsed ? { status: 'ready', value: parsed } : { status: 'failed', value: null });
      })
      .catch(() => { if (alive) setScopes({ status: 'failed', value: null }); });
    return () => { alive = false; };
  }, [activity, session?.user.id, authLoading, revision]);

  const target = useMemo(() => {
    const list = scopes.value?.scopes ?? [];
    return list.find((s) => s.scope === scope) ?? paintedScopes2026(list, null)[0] ?? null;
  }, [scopes.value, scope]);

  useEffect(() => {
    let alive = true;
    if (authLoading || !supabase || !session) return;
    if (scopes.status !== 'ready' || !target) { setBoard(LOADING); return; }
    setBoard(LOADING);
    void Promise.resolve(supabase.rpc('read_leaderboard_2026', {
      p_activity: activity, p_scope: target.scope, p_scope_ref: target.ref,
    }))
      .then(({ data, error }) => {
        if (!alive) return;
        const parsed = error ? null : parseLeaderboard2026(data, activity);
        setBoard(parsed ? { status: 'ready', value: parsed } : { status: 'failed', value: null });
      })
      .catch(() => { if (alive) setBoard({ status: 'failed', value: null }); });
    return () => { alive = false; };
  }, [activity, target?.scope, target?.ref, scopes.status, session?.user.id, authLoading, revision]);

  return {
    signedOut: !authLoading && !session,
    authLoading,
    scopes,
    board: target ? board : { status: scopes.status === 'failed' ? 'failed' : 'loading', value: null } as Reading<LeaderboardBoard2026>,
    target,
    reload,
  };
}

export default function CommuneLeaderboard2026() {
  const t = useT();
  const locale = useLocale();
  // La discipline est celle de la carte : on arrive d'elle, le classement ne
  // change pas de sport sous les pieds du lecteur.
  const { activity, setActivity } = useMapActivity();
  const [scope, setScope] = useState<LeaderboardScopeKind2026 | null>(null);
  const { signedOut, authLoading, scopes, board, target, reload } = useCommuneLeaderboard2026(activity, scope);
  useEffect(() => { screen('classement-commune'); }, []);

  const painted = paintedScopes2026(scopes.value?.scopes ?? [], target?.scope ?? null);
  const activeScope = target?.scope ?? painted[0]?.scope ?? null;
  const scopeName = (item: LeaderboardScope2026) =>
    item.scope === 'commune'
      ? item.label ?? item.ref
      : item.scope === 'department'
        ? t(C.porteeDepartement, { code: item.ref })
        : t(C.porteeFrance);
  const area = (m2: number) => formatSquareKm2026(m2, locale);
  const day = (ms: number) => new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  return <ProfilePage tone="light" back backHref="/(tabs)" title={t(C.titre)}>
    <Text style={s.lede}>{t(C.sousTitre)}</Text>

    <View style={s.selector}>
      <ProfileSegments tone="light" value={activity} onChange={setActivity}
        options={[{ key: 'run' as Activity, label: t(C.course) }, { key: 'bike' as Activity, label: t(C.velo) }]} />
    </View>
    {painted.length > 1 && activeScope ? <View style={s.selector}>
      <ProfileSegments tone="light" value={activeScope} onChange={setScope}
        options={painted.map((item) => ({ key: item.scope, label: scopeName(item) }))} />
    </View> : null}

    {authLoading || (!signedOut && (scopes.status === 'loading' || board.status === 'loading'))
      ? <View style={s.state}><ActivityIndicator size="small" color={c.ink} /><Text style={s.meta}>{t(C.chargement)}</Text></View>
      : signedOut
        /* ÉTAPE 0 (10/09/2026) : ce panneau disait « Se connecter »
           (`C.connexionAction`), un mot qui n'ouvre rien à qui n'a PAS de
           compte, alors que la porte qu'il ouvrait en CRÉE un. Le titre local
           (« Le classement demande un compte ») cède la place à celui de la
           porte ; la raison, elle, reste d'ici : c'est la seule phrase qui dit
           POURQUOI la lecture est refusée. `tone="light"` n'est pas cosmétique
           sur cette page claire : sans lui, la porte peindrait son texte de
           l'échelle sombre, illisible. */
        ? <AccountDoor2026 tone="light" reason={t(C.connexionCorps)} />
        : scopes.status === 'failed' || board.status === 'failed'
          ? <Panel title={t(C.echecTitre)} body={t(C.echecCorps)} alert
              action={{ label: t(C.reessayer), onPress: reload, secondary: true }} />
          : scopes.value && scopes.value.commune === null
            ? <Panel title={t(C.sansCommuneTitre)} body={t(C.sansCommuneCorps)}
                action={{ label: t(C.premierIciAction), onPress: () => router.push('/(tabs)') }} />
            : board.value
              ? <Board board={board.value} area={area} day={day} reload={reload} />
              : null}

    <Text style={s.footnote}>{t(C.noteMetrique)}</Text>
  </ProfilePage>;
}

function Board({ board, area, day, reload }: {
  board: LeaderboardBoard2026;
  area: (m2: number) => string;
  day: (ms: number) => string;
  reload: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const measured = formatMeasuredAt2026(board.measuredAtMs, locale);
  const min = board.minRankedSubjects;

  if (board.status === 'unavailable') {
    const unknown = board.reason === 'unknown_scope';
    return <Panel
      title={t(unknown ? C.communeFermeeTitre : C.sansMesureTitre)}
      body={t(unknown ? C.communeFermeeCorps : C.sansMesureCorps)}
      action={unknown
        ? { label: t(C.premierIciAction), onPress: () => router.push('/(tabs)') }
        : { label: t(C.reessayer), onPress: reload, secondary: true }} />;
  }

  if (board.status === 'not_enough_people') {
    return <>
      <Panel title={t(C.premierIciTitre)}
        body={t(C.premierIciCorps, { n: board.subjectsCount ?? 0, min })}
        note={t(C.premierIciPourquoi, { min })}
        action={{ label: t(C.premierIciAction), onPress: () => router.push('/(tabs)') }} />
      {measured ? <Text style={s.meta}>{t(board.stale ? C.mesureAncienne : C.mesureA, { heure: measured })}</Text> : null}
      <MyLine board={board} area={area} />
    </>;
  }

  return <>
    <View style={s.freshness}>
      <Text style={s.meta}>{t(board.stale ? C.mesureAncienne : C.mesureA, { heure: measured ?? '' })}</Text>
      <Text style={s.meta}>{t(C.fenetre, { debut: day(board.windowStartMs), fin: day(board.windowEndMs - 1) })}</Text>
    </View>
    <MyLine board={board} area={area} />
    <View style={s.list}>
      {board.entries.slice(0, LEADERBOARD_ROWS_LIMIT).map((row) => <View key={row.key}
        style={[s.row, row.isMe && s.mine]}
        accessibilityLabel={`${row.rank}. ${row.isMe ? t(C.toi) : row.label ?? t(C.ligneAnonyme, { code: row.key.slice(0, 6).toUpperCase() })}, ${t(C.terrainPris, { km: area(row.newTerrainM2) })}`}>
        <Text style={[s.rank, row.isMe && s.mineText]}>{row.rank}</Text>
        <View style={s.who}>
          <Text style={[s.name, row.isMe && s.mineText]} numberOfLines={1}>
            {row.isMe ? t(C.toi) : row.label ?? t(C.ligneAnonyme, { code: row.key.slice(0, 6).toUpperCase() })}
          </Text>
          <Text style={s.meta} numberOfLines={1}>
            {row.tiedCount > 1 ? `${t(C.exAequo, { n: row.tiedCount })} · ` : ''}
            {t(C.terrainTenu, { km: area(row.heldM2) })}
            {row.crewName ? ` · ${row.crewName}` : ''}
          </Text>
        </View>
        <Text style={[s.value, row.isMe && s.mineText]}>{t(C.terrainPris, { km: area(row.newTerrainM2) })}</Text>
      </View>)}
    </View>
  </>;
}

/** Ma ligne, mise en avant. Elle existe même quand je ne suis pas classé. */
function MyLine({ board, area }: { board: LeaderboardBoard2026; area: (m2: number) => string }) {
  const t = useT();
  if (!board.me) return null;
  if (!board.me.ranked || board.me.newTerrainM2 === null) {
    return <View style={s.me}><Text style={s.meText}>{t(C.moiSansTerrain)}</Text></View>;
  }
  return <View style={s.me}>
    <GrydIcon name="check" size={18} color={c.ink} />
    <View style={s.who}>
      {board.me.rank !== null ? <Text style={s.meTitle}>{t(C.monRang, { rang: board.me.rank })}</Text> : null}
      <Text style={s.meText}>{t(C.terrainPris, { km: area(board.me.newTerrainM2) })}
        {board.me.heldM2 !== null ? ` · ${t(C.terrainTenu, { km: area(board.me.heldM2) })}` : ''}</Text>
    </View>
  </View>;
}

function Panel({ title, body, note, alert, action }: {
  title: string; body: string; note?: string; alert?: boolean;
  action?: { label: string; onPress: () => void; secondary?: boolean };
}) {
  return <View style={s.panel} accessibilityRole={alert ? 'alert' : undefined}>
    <Text style={s.panelTitle}>{title}</Text>
    <Text style={s.meta}>{body}</Text>
    {note ? <Text style={s.meta}>{note}</Text> : null}
    {action ? <View style={s.action}>
      <ProfileButton tone="light" label={action.label} secondary={action.secondary} onPress={action.onPress} />
    </View> : null}
  </View>;
}

const s = StyleSheet.create({
  lede: { fontFamily: fonts.text, fontSize: 14, lineHeight: 21, color: c.muted, paddingBottom: 16 },
  selector: { paddingBottom: 12 },
  state: { paddingVertical: 32, alignItems: 'center', gap: 12 },
  meta: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted },
  footnote: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted, paddingTop: 20 },
  freshness: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingBottom: 12 },
  panel: { gap: 8, paddingVertical: 20, borderTopWidth: 1, borderTopColor: c.border },
  panelTitle: { fontFamily: fonts.displayMedium, fontSize: 20, lineHeight: 26, color: c.ink },
  action: { paddingTop: 12, alignItems: 'flex-start' },
  list: { paddingTop: 4 },
  row: { minHeight: 56, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: c.border },
  mine: { backgroundColor: c.surfaceMuted, borderRadius: 12, paddingHorizontal: 12, borderBottomColor: 'transparent' },
  mineText: { color: c.ink },
  rank: { minWidth: 26, fontFamily: fonts.displayMedium, fontSize: 18, color: c.muted, textAlign: 'right' },
  who: { flex: 1, gap: 2 },
  name: { fontFamily: fonts.textMedium, fontSize: 14, lineHeight: 20, color: c.ink },
  value: { fontFamily: fonts.textMedium, fontSize: 13, lineHeight: 19, color: c.ink },
  me: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: c.surfaceMuted, marginBottom: 8 },
  meTitle: { fontFamily: fonts.textMedium, fontSize: 15, lineHeight: 21, color: c.ink },
  meText: { fontFamily: fonts.text, fontSize: 12, lineHeight: 18, color: c.muted },
});
