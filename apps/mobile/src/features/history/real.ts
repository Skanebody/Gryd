/**
 * GRYD — HISTORIQUE RÉEL : lecture de la table `runs` (câblage React).
 *
 * ─── POURQUOI CE FICHIER EXISTE ─────────────────────────────────────────────
 * L'écran /historique était câblé en dur sur `[]` hors vitrine (`const list =
 * showcase ? runsByFilter(filter) : []`). Il n'existait AUCUNE lecture de
 * `runs`. Le texte servi était alors « Tes courses apparaîtront ici après ta
 * première capture. Lance-toi ! » — une AFFIRMATION SUR LE JOUEUR : tu n'as rien
 * couru. Or ses courses existent : `features/performance/real.ts` les lit déjà
 * (`/performance` affiche « 3 courses · 18,4 km »), et la RLS `runs_select_own`
 * les rend lisibles. Deux écrans atteignables l'un sous l'autre depuis Profil se
 * contredisaient frontalement, et deux CTA de la carte poussaient vers ce
 * cul-de-sac depuis une zone que le joueur venait de capturer.
 *
 * Ce n'était pas un état vide : c'était un état NON CÂBLÉ déguisé en état vide.
 *
 * ─── CE QU'ON LIT, ET POURQUOI CELA (ET PAS AUTRE CHOSE) ────────────────────
 * L'effort vient des colonnes de `runs` (distance, durée, allure, statut).
 * L'IMPACT TERRITORIAL vient de `runs.celebration` — le payload `IngestRunResponse`
 * que le serveur a persisté au moment de l'ingestion (ingest_run:3121). C'est la
 * SEULE source honnête pour « ce que cette course a pris » :
 *
 *  · elle est FIGÉE : elle décrit la course au moment où le serveur l'a décidée ;
 *  · elle est SERVEUR : le client ne recalcule rien (règle absolue du projet).
 *
 * On NE compte PAS les lignes de `hex_claims` par `run_id`, alors que ce serait
 * techniquement possible (la RLS y autorise la lecture). Ce compte dérive dans le
 * temps : quand un rival reprend un hex, la ligne est réattribuée et perd ce
 * `run_id`. La course d'il y a un mois afficherait donc « +3 zones » là où elle en
 * avait pris 18 — un chiffre qui rétrécit tout seul, et l'impression que la
 * capture n'a jamais eu lieu. `hex_claims` répond à « qui tient quoi MAINTENANT »
 * (c'est le rôle de la carte), pas à « qu'a fait cette course ».
 *
 * Conséquence assumée : une course dont la `celebration` est absente (course
 * ingérée avant que le payload ne soit persisté, ou écriture partielle) a un
 * impact INCONNU — `captured`/`defended` valent `null`, et l'écran n'affiche
 * alors AUCUN chiffre d'impact plutôt qu'un « 0 » qui affirmerait qu'elle n'a
 * rien pris.
 *
 * ─── LES QUATRE ÉTATS, JAMAIS CONFONDUS ─────────────────────────────────────
 *  · 'signed-out' — pas de compte (ou pas de backend) : aucune course ne peut
 *    être la sienne. L'écran invite à se connecter.
 *  · 'loading'    — la lecture est en vol (ou la session s'hydrate). On
 *    n'affirme RIEN sur le joueur tant qu'on ne sait pas.
 *  · 'failed'     — la lecture a échoué. Ses courses existent, on ne sait pas
 *    les lire. Afficher « aucune course » ici lui dirait qu'il n'a rien couru.
 *  · 'ready'      — lu. `runs` peut être vide : c'est un fait, pas un trou.
 * Aucun repli sur `demo.ts` : ce module ne l'importe pas.
 */
import { useCallback, useEffect, useState } from 'react';
import type { IngestRunResponse, RunStatus } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';

/**
 * Fenêtre de lecture. L'écran promet « TOUS tes parcours » : une troncature
 * silencieuse le ferait mentir. 200 couvre plusieurs mois de course quotidienne
 * au MVP ; au-delà il faudra paginer POUR DE VRAI (bouton « plus ancien »), pas
 * couper en silence.
 */
const HISTORY_LIMIT = 200;

/** Ligne brute telle que sélectionnée (colonnes explicites, jamais `*`). */
interface RunRow {
  id: string;
  started_at: string;
  distance_m: number;
  duration_s: number;
  avg_pace_s_km: number | null;
  status: string;
  reject_reason: string | null;
  celebration: unknown;
}

/**
 * Nature d'une course, DÉRIVÉE de l'impact serveur — pas d'une intention
 * déclarée avant de partir (le joueur peut annoncer « défense » et finir par
 * conquérir : c'est le terrain qui tranche).
 *
 * Il n'y a volontairement pas de catégorie « route ouverte » : rien dans
 * `runs`/`celebration` ne dit qu'une boucle est restée ouverte mais fermable.
 * Inventer ce classement serait fabriquer une information.
 */
export type RealRunKind = 'conquest' | 'defense' | 'stats';

export interface RealRunEntry {
  id: string;
  /** Instant de départ (ms epoch) — l'affichage date/heure est local à l'écran. */
  startedAtMs: number;
  km: number;
  durationS: number;
  /** null = le serveur n'a pas d'allure pour cette course (on n'en calcule pas une). */
  paceSPerKm: number | null;
  status: RunStatus;
  /** Motif de refus serveur, brut (jamais réécrit ni deviné côté client). */
  rejectReason: string | null;
  /**
   * Zones prises par cette course (claimed + stolen + pioneer, convention
   * course-result). `null` = impact INCONNU (pas de payload) — surtout pas 0.
   */
  captured: number | null;
  /** Zones défendues. `null` = inconnu, jamais 0 par défaut. */
  defended: number | null;
  kind: RealRunKind;
}

/** `runs.status` est contraint en base ; on reste défensif sur la valeur lue. */
function asRunStatus(raw: string): RunStatus {
  return raw === 'valid' || raw === 'partial' || raw === 'flagged' || raw === 'rejected'
    ? raw
    : 'flagged';
}

/**
 * Extrait l'impact du payload `celebration`. Renvoie `null` pour chaque compteur
 * dont on n'est pas certain : un payload absent, tronqué ou d'une forme
 * inattendue ne doit JAMAIS se lire comme « cette course n'a rien pris ».
 */
function impactOf(celebration: unknown): { captured: number | null; defended: number | null } {
  if (typeof celebration !== 'object' || celebration === null) {
    return { captured: null, defended: null };
  }
  const hexes = (celebration as Partial<IngestRunResponse>).hexes;
  if (typeof hexes !== 'object' || hexes === null) return { captured: null, defended: null };
  const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
  const claimed = num(hexes.claimed);
  const stolen = num(hexes.stolen);
  const pioneer = num(hexes.pioneer);
  const defended = num(hexes.defended);
  // Les trois composantes de la prise doivent TOUTES être lisibles : additionner
  // en traitant une manquante comme 0 sous-déclarerait la conquête.
  const captured =
    claimed !== null && stolen !== null && pioneer !== null ? claimed + stolen + pioneer : null;
  return { captured, defended };
}

/** PURE : ligne serveur → entrée d'historique. Testable sans réseau. */
export function toRealRunEntry(row: RunRow): RealRunEntry {
  const { captured, defended } = impactOf(row.celebration);
  const kind: RealRunKind =
    captured !== null && captured > 0
      ? 'conquest'
      : defended !== null && defended > 0
        ? 'defense'
        : 'stats';
  return {
    id: row.id,
    startedAtMs: Date.parse(row.started_at),
    km: row.distance_m / 1000,
    durationS: row.duration_s,
    paceSPerKm: row.avg_pace_s_km,
    status: asRunStatus(row.status),
    rejectReason: row.reject_reason,
    captured,
    defended,
    kind,
  };
}

export type HistoryStatus = 'signed-out' | 'loading' | 'failed' | 'ready';

/**
 * Filtres de l'historique RÉEL. Ils ne portent que sur des natures que la
 * donnée serveur sait distinguer — pas une de plus (la démo en avait cinq, dont
 * « Routes », qu'aucune colonne ne permet de reconnaître).
 */
export type RealHistoryFilter = 'all' | RealRunKind;

export function filterRuns(
  runs: readonly RealRunEntry[],
  filter: RealHistoryFilter,
): RealRunEntry[] {
  return filter === 'all' ? [...runs] : runs.filter((r) => r.kind === filter);
}

export interface MyRunHistory {
  status: HistoryStatus;
  /** Rempli uniquement quand `status === 'ready'` (sinon tableau vide, non affiché). */
  runs: RealRunEntry[];
  reload: () => void;
}

export function useMyRunHistory(): MyRunHistory {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const [runs, setRuns] = useState<RealRunEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!configured || !supabase || !userId) {
      setRuns(null);
      setFailed(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setFailed(false);

    void (async () => {
      const { data, error } = await client
        .from('runs')
        .select(
          'id, started_at, distance_m, duration_s, avg_pace_s_km, status, reject_reason, celebration',
        )
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(HISTORY_LIMIT);
      if (cancelled) return;
      if (error || !data) {
        // On NE met PAS `runs` à [] ici : une liste vide se lirait « tu n'as
        // rien couru ». On dit qu'on n'a pas su lire.
        setRuns(null);
        setFailed(true);
        return;
      }
      setRuns((data as RunRow[]).map(toRealRunEntry));
    })().catch(() => {
      if (cancelled) return;
      setRuns(null);
      setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, userId, tick]);

  let status: HistoryStatus = 'signed-out';
  if (configured && userId) {
    if (failed) status = 'failed';
    else if (runs) status = 'ready';
    else status = 'loading';
  } else if (sessionLoading) {
    // La session n'a pas fini de s'hydrater : ne pas annoncer « connecte-toi »
    // à quelqu'un qui EST connecté (le message clignoterait au démarrage).
    status = 'loading';
  }

  return { status, runs: status === 'ready' && runs ? runs : [], reload };
}
