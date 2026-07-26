/**
 * GRYD — événements RÉELS du flux d'ACTIVITÉ (planche E23), câblage React.
 *
 * ─── CE QU'ON LIT, ET POURQUOI SI PEU (POUR L'INSTANT) ──────────────────────
 * E23 range ses lignes en quatre groupes : À DÉFENDRE, RIVALITÉ, CREW,
 * PROGRESSION. Les TROIS premiers naissent d'un acte CROSS-JOUEUR — un rival qui
 * conteste, qui prend une ancienne zone, un coéquipier qui capture ou propose une
 * sortie. Rien de tout cela n'existe tant que d'autres joueurs ne jouent pas
 * autour de soi (O1, backend cross-joueur non levé) : fabriquer ces lignes serait
 * exactement le mensonge que la constitution interdit. Ces groupes restent donc
 * VIDES — pas peints « à venir », simplement absents (« pas d'événement → groupe
 * absent »).
 *
 * PROGRESSION, elle, est un fait PERSONNEL et RÉEL dès aujourd'hui : les badges
 * débloqués sont décernés SERVEUR (`user_badges`, service_role via
 * ingest_run/season_close) et lisibles par leur propriétaire (RLS). On lit donc
 * `user_badges (badge_key, earned_at)` et on en fait des événements de
 * progression — la seule source honnêtement disponible avant O1. Le flux n'est
 * donc pas une coquille vide : il porte la vraie progression du joueur, et
 * s'étoffera des trois groupes tactiques le jour où le cross-joueur existe.
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
      const { data, error } = await client
        .from('user_badges')
        .select('badge_key, earned_at')
        .eq('user_id', userId)
        .order('earned_at', { ascending: false })
        .limit(BADGE_READ_LIMIT);
      if (cancelled) return;
      if (error || !data) {
        // On NE met PAS la liste à [] : une liste vide se lirait « rien ne
        // bouge » (état calme). On dit qu'on n'a pas su lire.
        setEvents(null);
        setFailed(true);
        return;
      }
      const cutoff = Date.now() - WINDOW_DAYS * 24 * 3600 * 1000;
      const mapped = (data as BadgeRow[])
        .map(toProgressionEvent)
        // Récence + date lisible : un `earned_at` non parsable ne crée pas de ligne.
        .filter((e) => Number.isFinite(e.createdAtMs) && e.createdAtMs >= cutoff);
      setEvents(mapped);
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
