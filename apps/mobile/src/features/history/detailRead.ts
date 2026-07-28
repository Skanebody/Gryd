/**
 * GRYD — E68 : LA LECTURE d'UNE sortie par identifiant. Supabase d'un côté,
 * `runDetail.ts` (pur) de l'autre.
 *
 * ─── CE QUI DÉBLOQUE CET ÉCRAN, ET CE QUI N'A PAS EU À L'ÊTRE ───────────────
 * Le dépôt affirmait partout — docblock de `app/course/[id].tsx`, en-tête de
 * `RealRunCard`, catalogue i18n, `scripts/audit-routes.mjs` — qu'« aucune
 * lecture d'une course PAR IDENTIFIANT n'existe (O1) : ni requête ni RPC ».
 * L'affirmation décrivait le CODE (vrai : personne ne l'avait écrite), pas le
 * DROIT : la policy `runs_select_own` (0003_rls.sql:107) ouvre déjà `select`
 * sur SES propres lignes, et `features/history/real.ts` s'en sert pour la
 * liste. Ce fichier ne demande donc AUCUN droit neuf, AUCUNE migration, AUCUN
 * RPC — il pose la requête qui manquait.
 *
 * ─── LA MÊME SOURCE QUE LA LISTE, ET C'EST OBLIGATOIRE ──────────────────────
 * Colonnes lues = celles de `real.ts`, plus `activity`, `points_awarded` et
 * `xp_awarded`. Deux lectures des mêmes `runs` qui divergeraient produiraient
 * une ligne d'historique et un détail qui se contredisent sur la même sortie :
 * le total pris est donc dérivé par la MÊME convention (`capturedTotal`, testée
 * contre `runStory`), et l'impact vient du MÊME payload serveur `celebration`.
 * On ne compte JAMAIS `hex_claims` par `run_id` : ce compte rétrécit quand un
 * rival reprend une zone, et la sortie d'il y a un mois afficherait « +3 » là
 * où elle en avait pris 18 (la raison est écrite au long dans `real.ts`).
 *
 * ─── CINQ ÉTATS, JAMAIS CONFONDUS ───────────────────────────────────────────
 *  · 'signed-out' — pas de compte (ou pas de backend) : aucune sortie ne peut
 *    être la sienne. Ce n'est ni un vide ni une panne.
 *  · 'loading'    — la lecture est en vol (ou la session s'hydrate). On
 *    n'affirme RIEN tant qu'on ne sait pas.
 *  · 'failed'     — la lecture a échoué. Sa sortie existe peut-être ; on ne
 *    sait pas la lire. Afficher « introuvable » ici lui nierait sa sortie.
 *  · 'not-found'  — LU, et aucune ligne. C'est un FAIT sur SON historique.
 *  · 'ready'      — LU, et voici la sortie.
 *
 * ⚠ « PAS À MOI » ET « N'EXISTE PAS » SONT LE MÊME ÉTAT, ET C'EST VOULU. La RLS
 * rend zéro ligne dans les deux cas, et c'est exactement la bonne réponse :
 * distinguer les deux dirait à qui forge un identifiant « cette sortie existe,
 * mais elle est à quelqu'un d'autre » — un oracle d'existence sur la donnée
 * d'autrui (§12). L'écran dit donc « pas dans TON historique », qui est vrai
 * dans les deux cas.
 */
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import type { RunStatus } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import type { RunDetailInput } from './runDetail';

/**
 * Colonnes réellement lues — SOURCE UNIQUE de ce select, et surensemble EXACT
 * de celles de la liste. `polyline_masked` n'y est PAS : `ingest_run` ne l'écrit
 * jamais (cf. `runDetail.ts` → `runTraceState`), et demander une colonne qu'on
 * ne saurait pas rendre laisserait croire qu'une carte est à un cheveu.
 */
const DETAIL_COLUMNS =
  'id, started_at, activity, distance_m, duration_s, avg_pace_s_km, status, reject_reason, points_awarded, xp_awarded, celebration';

interface DetailRow {
  id: string;
  started_at: string;
  activity: string | null;
  distance_m: number;
  duration_s: number;
  avg_pace_s_km: number | null;
  status: string;
  reject_reason: string | null;
  points_awarded: number | null;
  xp_awarded: number | null;
  celebration: unknown;
}

/** `runs.status` est contraint en base ; on reste défensif sur la valeur lue. */
function asRunStatus(raw: string): RunStatus {
  return raw === 'valid' || raw === 'partial' || raw === 'flagged' || raw === 'rejected'
    ? raw
    : 'flagged';
}

/**
 * `runs.activity` est contrainte à `('run','bike')` (0070) et NOT NULL depuis la
 * même migration, mais la valeur traverse PostgREST en chaîne libre : une valeur
 * inattendue retombe sur la discipline par DÉFAUT plutôt que d'être propagée.
 * Conséquence assumée et bornée : la copie parlerait « course » pour une
 * discipline illisible — jamais une troisième discipline inventée dans l'UI.
 */
function asActivity(raw: string | null): Activity {
  return raw === 'run' || raw === 'bike' ? raw : DEFAULT_ACTIVITY;
}

/** PURE : ligne serveur → entrée de détail. Testable sans réseau. */
export function toRunDetailInput(row: DetailRow): RunDetailInput {
  return {
    id: row.id,
    startedAtMs: Date.parse(row.started_at),
    activity: asActivity(row.activity),
    km: row.distance_m / 1000,
    durationS: row.duration_s,
    paceSPerKm: row.avg_pace_s_km,
    status: asRunStatus(row.status),
    rejectReason: row.reject_reason,
    pointsAwarded: row.points_awarded,
    xpAwarded: row.xp_awarded,
    celebration: row.celebration,
  };
}

/**
 * L'identifiant arrive d'une URL FABRIQUÉE PAR L'EXTÉRIEUR (deep link, widget,
 * collage). Une chaîne qui n'est pas un UUID ferait rendre à Postgres une erreur
 * de syntaxe (22P02), donc un état 'failed' — « on n'a pas su lire » — pour
 * quelque chose qui n'est pas un identifiant de sortie du tout. On tranche
 * AVANT le réseau : ce n'est pas une panne, c'est un identifiant qui ne désigne
 * aucune de ses sorties.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function looksLikeRunId(raw: string | undefined): boolean {
  return typeof raw === 'string' && UUID_RE.test(raw);
}

export type RunDetailStatus = 'signed-out' | 'loading' | 'failed' | 'not-found' | 'ready';

export interface RunDetailRead {
  status: RunDetailStatus;
  /** Rempli uniquement quand `status === 'ready'`. */
  run: RunDetailInput | null;
  reload: () => void;
}

export function useRunDetail(runId: string | undefined): RunDetailRead {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  /**
   * La lecture porte SON identifiant : à la navigation d'une sortie à l'autre,
   * l'écran repasse en 'loading' plutôt que de peindre une frame de la
   * PRÉCÉDENTE sous le nouveau titre (l'effet ne rejoue qu'APRÈS la peinture).
   */
  const [read, setRead] = useState<{ id: string; run: RunDetailInput | null } | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!configured || !supabase || !userId || !looksLikeRunId(runId)) {
      setRead(null);
      setFailed(false);
      return;
    }
    const client = supabase;
    const id = runId as string;
    let cancelled = false;
    setFailed(false);

    void (async () => {
      const { data, error } = await client
        .from('runs')
        .select(DETAIL_COLUMNS)
        // `user_id` EN PLUS de la RLS : la policy borne déjà la lecture, mais un
        // filtre explicite garde la requête juste si la policy évolue — et il
        // rend l'intention lisible à la relecture (défense en profondeur).
        .eq('user_id', userId)
        .eq('id', id)
        // `maybeSingle` : zéro ligne est un CAS, pas une erreur. `single()`
        // renverrait PGRST116 et l'écran basculerait en « échec de lecture »
        // pour une sortie simplement absente — deux états confondus.
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // On ne met PAS `run: null` ici : une absence se lirait « pas dans ton
        // historique ». On dit qu'on n'a pas su lire.
        setRead(null);
        setFailed(true);
        return;
      }
      setRead({ id, run: data ? toRunDetailInput(data as DetailRow) : null });
    })().catch(() => {
      if (cancelled) return;
      setRead(null);
      setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, userId, runId, tick]);

  let status: RunDetailStatus = 'signed-out';
  if (configured && userId) {
    if (!looksLikeRunId(runId)) status = 'not-found';
    else if (failed) status = 'failed';
    else if (read !== null && read.id === runId) status = read.run ? 'ready' : 'not-found';
    else status = 'loading';
  } else if (sessionLoading) {
    // La session n'a pas fini de s'hydrater : ne pas annoncer « connecte-toi » à
    // quelqu'un qui EST connecté (le message clignoterait au démarrage).
    status = 'loading';
  }

  return { status, run: status === 'ready' && read ? read.run : null, reload };
}
