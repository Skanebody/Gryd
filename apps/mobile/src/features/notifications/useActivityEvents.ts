/**
 * GRYD — événements RÉELS du flux d'ACTIVITÉ (planche E23), câblage React.
 *
 * ─── CE QU'ON LIT, ET POURQUOI ──────────────────────────────────────────────
 * E23 range ses lignes en quatre groupes : À DÉFENDRE, RIVALITÉ, CREW,
 * PROGRESSION.
 *
 * · À DÉFENDRE a désormais une SOURCE RÉELLE (27/07/2026). `territory_contests`
 *   (0078) existe et `ingest_run` OUVRE des contestations : une zone contestée
 *   est un événement tactique réel, daté, qui concerne son propriétaire. On lit
 *   donc les contestations ACTIVES qui visent MES territoires, et on en fait des
 *   lignes actionnables (`contestEvents.ts`, pur + testé). C'est CE groupe, et
 *   lui seul, qui allume la cloche du Home.
 * · RIVALITÉ et CREW restent VIDES : ils naissent d'actes cross-joueur qui n'ont
 *   pas encore de table (un rival qui reprend une ancienne zone, un coéquipier
 *   qui propose une sortie). Pas peints « à venir », simplement absents — les
 *   fabriquer serait le mensonge que la constitution interdit.
 * · PROGRESSION est un fait PERSONNEL et RÉEL : les badges débloqués sont
 *   décernés SERVEUR (`user_badges`, service_role via ingest_run/season_close)
 *   et lisibles par leur propriétaire (RLS). Ils se CONSULTENT — donc
 *   `actionable: false`, donc ils ne comptent JAMAIS dans le badge de la cloche.
 *
 * ─── « ÉCHEC PARTIEL » N'EXISTE PAS ─────────────────────────────────────────
 * Trois lectures, un seul verdict : si l'une échoue, le hook passe `failed` et
 * ne rend RIEN. Rendre les badges sans les contestations dirait « rien à
 * défendre » à quelqu'un dont la zone tombe dans trois heures — une
 * sous-déclaration silencieuse est un mensonge (même règle qu'en
 * `premium/analytics/read.ts`).
 *
 * ─── FENÊTRE DE RÉCENCE ─────────────────────────────────────────────────────
 * Un flux d'activité montre le RÉCENT : un badge gagné il y a huit mois n'est pas
 * une « activité ». On borne donc l'affichage à `WINDOW_DAYS`. Ce n'est PAS une
 * règle de jeu (aucune mécanique n'en dépend) — c'est une fenêtre d'AFFICHAGE,
 * déclarée ici avec sa raison, pas dans game-rules.
 *
 * ─── LES QUATRE ÉTATS, JAMAIS CONFONDUS (patron `useMyRunHistory`) ──────────
 *  · 'signed-out' — pas de compte (ou pas de backend) : aucun événement n'est le
 *    sien ;
 *  · 'loading'    — lecture en vol / session en hydratation : on n'affirme rien ;
 *  · 'failed'     — la lecture a échoué : on le dit, on propose de réessayer ;
 *  · 'ready'      — lu. La liste peut être vide : c'est l'état CALME, un fait.
 */
import { useCallback, useEffect, useState } from 'react';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import type { ActivityEvent } from './activityFeed';
import {
  CONTEST_FEED_COLUMNS,
  defendEventsFromContests,
  type FeedContestRow,
} from './contestEvents';

/** Fenêtre d'affichage du flux (jours). Affichage, PAS règle de jeu (cf. en-tête). */
const WINDOW_DAYS = 30;
/** Plafond de lecture : un flux montre le récent, pas tout l'historique de badges. */
const BADGE_READ_LIMIT = 50;

export type ActivityEventsStatus = 'signed-out' | 'loading' | 'failed' | 'ready';

interface BadgeRow {
  badge_key: string;
  earned_at: string;
}

export interface MyActivityEvents {
  status: ActivityEventsStatus;
  /** Rempli uniquement quand `status === 'ready'`. */
  events: ActivityEvent[];
  reload: () => void;
}

/**
 * Ligne serveur (badge décerné) → événement de PROGRESSION. Pure : testable, et
 * surtout HONNÊTE — `actionable: false` (un badge se consulte, il n'appelle pas
 * d'action inline, donc il ne compte JAMAIS dans le badge de la cloche). Pas
 * d'`expiresAtMs` : un badge débloqué reste vrai, il ne périme pas.
 */
function toProgressionEvent(row: BadgeRow): ActivityEvent {
  return {
    id: `badge:${row.badge_key}`,
    group: 'progression',
    createdAtMs: Date.parse(row.earned_at),
    actionable: false,
  };
}

export function useActivityEvents(): MyActivityEvents {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const [events, setEvents] = useState<ActivityEvent[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!configured || !supabase || !userId) {
      setEvents(null);
      setFailed(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setFailed(false);

    void (async () => {
      // ─── 1. Les deux lectures indépendantes, EN PARALLÈLE ────────────────
      // Les contestations ACTIVES sont déjà bornées par la policy 0078 : elle
      // ne rend que celles dont je suis PARTIE (assaillant ou défenseur). Le
      // tri « suis-je le camp qui DÉFEND ? » se fait plus bas, en pur.
      // AUCUN `.limit()` ici, délibérément : tronquer la liste des
      // contestations ferait dire « 2 zones à défendre » à quelqu'un qui en a
      // 5 — une sous-déclaration silencieuse, c'est-à-dire un mensonge.
      const [badges, contests] = await Promise.all([
        client
          .from('user_badges')
          .select('badge_key, earned_at')
          .eq('user_id', userId)
          .order('earned_at', { ascending: false })
          .limit(BADGE_READ_LIMIT),
        client.from('territory_contests').select(CONTEST_FEED_COLUMNS).eq('status', 'active'),
      ]);
      if (cancelled) return;
      if (badges.error || !badges.data || contests.error || !contests.data) {
        // On NE met PAS la liste à [] : une liste vide se lirait « rien ne
        // bouge » (état calme). On dit qu'on n'a pas su lire.
        setEvents(null);
        setFailed(true);
        return;
      }

      // ─── 2. QUELLES contestations visent MES territoires ? ───────────────
      // On ne lit PAS tout mon patrimoine pour répondre : on demande, parmi les
      // territoires EFFECTIVEMENT contestés, lesquels m'appartiennent. La
      // requête est donc bornée par le nombre de contestations en cours (petit),
      // et jamais par le nombre de zones que je possède (potentiellement grand,
      // donc tronquable, donc faux).
      const contestRows = contests.data as unknown as FeedContestRow[];
      const targetIds = [...new Set(contestRows.map((r) => r.territory_id))];
      let mine = new Set<string>();
      if (targetIds.length > 0) {
        const owned = await client
          .from('territories')
          .select('id')
          .in('id', targetIds)
          .eq('owner_type', 'user')
          .eq('owner_id', userId);
        if (cancelled) return;
        if (owned.error || !owned.data) {
          setEvents(null);
          setFailed(true);
          return;
        }
        mine = new Set((owned.data as { id: string }[]).map((r) => r.id));
      }

      // ─── 3. Les deux sources réunies en un seul flux ─────────────────────
      const cutoff = Date.now() - WINDOW_DAYS * 24 * 3600 * 1000;
      const progression = (badges.data as BadgeRow[])
        .map(toProgressionEvent)
        // Récence + date lisible : un `earned_at` non parsable ne crée pas de ligne.
        .filter((e) => Number.isFinite(e.createdAtMs) && e.createdAtMs >= cutoff);
      // La fenêtre de récence NE s'applique PAS aux contestations : leur
      // péremption est leur `expires_at`, portée par l'événement lui-même et
      // évaluée à l'affichage. Les borner à 30 jours ferait disparaître une
      // défense en cours pour une raison qui n'a rien à voir avec elle.
      const defend = defendEventsFromContests(contestRows, mine);
      setEvents([...defend, ...progression]);
    })().catch(() => {
      if (cancelled) return;
      setEvents(null);
      setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, userId, tick]);

  let status: ActivityEventsStatus = 'signed-out';
  if (configured && userId) {
    if (failed) status = 'failed';
    else if (events) status = 'ready';
    else status = 'loading';
  } else if (sessionLoading) {
    status = 'loading';
  }

  return { status, events: status === 'ready' && events ? events : [], reload };
}
