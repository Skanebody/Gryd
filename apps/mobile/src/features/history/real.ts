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
import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
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
   * Zones prises par cette course AU TOTAL (claimed + stolen + pioneer,
   * convention course-result). `null` = impact INCONNU (pas de payload) — surtout
   * pas 0. Le TYPE d'une ligne (Capture / Reprise / Défense / libre) en est
   * dérivé par `runStory` (historyView, pur + testé).
   */
  captured: number | null;
  /**
   * Zones ARRACHÉES à un adversaire (hexes.stolen). C'est ce qui distingue une
   * REPRISE (orange, planche E24) d'une capture neuve : sans ce compteur séparé,
   * on ne pourrait pas les différencier (les deux gonflent `captured`). `null` =
   * inconnu. Le NOM de l'adversaire repris, lui, n'est PAS porté : il exige une
   * identité cross-joueur (O1) ; la ligne reste donc neutre (« reprise », pas
   * « repris à K.Runner »).
   */
  retaken: number | null;
  /** Zones défendues. `null` = inconnu, jamais 0 par défaut. */
  defended: number | null;
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
function impactOf(celebration: unknown): {
  captured: number | null;
  retaken: number | null;
  defended: number | null;
} {
  if (typeof celebration !== 'object' || celebration === null) {
    return { captured: null, retaken: null, defended: null };
  }
  const hexes = (celebration as Partial<IngestRunResponse>).hexes;
  if (typeof hexes !== 'object' || hexes === null)
    return { captured: null, retaken: null, defended: null };
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
  // `stolen` isolé alimente la REPRISE (orange). Il vaut par lui-même, même si le
  // total `captured` est inconnu (une composante manquante ailleurs).
  return { captured, retaken: stolen, defended };
}

/** PURE : ligne serveur → entrée d'historique. Testable sans réseau. */
export function toRealRunEntry(row: RunRow): RealRunEntry {
  const { captured, retaken, defended } = impactOf(row.celebration);
  return {
    id: row.id,
    startedAtMs: Date.parse(row.started_at),
    km: row.distance_m / 1000,
    durationS: row.duration_s,
    paceSPerKm: row.avg_pace_s_km,
    status: asRunStatus(row.status),
    rejectReason: row.reject_reason,
    captured,
    retaken,
    defended,
  };
}

export type HistoryStatus = 'signed-out' | 'loading' | 'failed' | 'ready';

export interface MyRunHistory {
  status: HistoryStatus;
  /** Rempli uniquement quand `status === 'ready'` (sinon tableau vide, non affiché). */
  runs: RealRunEntry[];
  reload: () => void;
}

/**
 * `activity` — LA LENTILLE (E14, 26/07/2026).
 *
 * `ACTIVITY_SCOPE.history` vaut `per_activity` (game-rules) et `runs.activity`
 * existe en base depuis la migration 0070, appliquée le 25/07. Sans ce filtre,
 * l'Historique d'un joueur hybride mêlait ses sorties vélo et ses courses dans
 * une seule liste, chacune étiquetée par des libellés (« conquête »,
 * « défense », allure) qui ne disent pas de quelle discipline il s'agit : le
 * joueur ne pouvait pas retrouver « toutes ses sorties vélo », ce que l'écran
 * promet pourtant explicitement.
 *
 * DÉFAUT = `DEFAULT_ACTIVITY` : un appelant sans commutateur lit exactement ce
 * qu'il lisait avant le vélo.
 */
export function useMyRunHistory(activity: Activity = DEFAULT_ACTIVITY): MyRunHistory {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  /**
   * La liste porte SA discipline : à la bascule de lentille, l'écran repasse en
   * `loading` au lieu d'afficher une frame de courses à pied sous l'étiquette
   * vélo (l'effet ne rejoue qu'APRÈS la peinture).
   */
  const [read, setRead] = useState<{ activity: Activity; entries: RealRunEntry[] } | null>(null);
  const runs = read !== null && read.activity === activity ? read.entries : null;
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!configured || !supabase || !userId) {
      setRead(null);
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
        // E14 — UNE discipline (cf. la doc du paramètre `activity`).
        .eq('activity', activity)
        .order('started_at', { ascending: false })
        .limit(HISTORY_LIMIT);
      if (cancelled) return;
      if (error || !data) {
        // On NE met PAS la liste à [] ici : une liste vide se lirait « tu n'as
        // rien couru ». On dit qu'on n'a pas su lire.
        setRead(null);
        setFailed(true);
        return;
      }
      setRead({ activity, entries: (data as RunRow[]).map(toRealRunEntry) });
    })().catch(() => {
      if (cancelled) return;
      setRead(null);
      setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, userId, tick, activity]);

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
