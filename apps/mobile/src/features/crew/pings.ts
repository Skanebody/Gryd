/**
 * GRYD — PINGS DE ZONE (AMENDEMENT-44 A5). Câblage React des RPC `crew_ping_zone`
 * / `crew_pings_feed` (migration 0051).
 *
 * ═══ CE QUI DISTINGUE CE STORE DES AUTRES DU DOSSIER ════════════════════════
 * `chatStore.ts`, `reactions.ts`, `requests.ts` sont des stores de DÉMO : ils
 * persistent en AsyncStorage et ne quittent jamais le téléphone. Un ping, lui,
 * est une COORDINATION : l'afficher sans qu'il soit parti au crew serait le
 * mensonge exact que la doctrine interdit (« KORO a pingé République » alors que
 * personne d'autre ne le voit).
 *
 * D'où la règle dure de ce fichier : AUCUN repli local. Pas de session, pas de
 * backend, plateforme vitrine, lecture ratée ⇒ `pings === null` ⇒ l'écran
 * n'affiche RIEN du tout (et surtout pas « aucun signal », qui affirmerait
 * quelque chose qu'on ignore). `[]` est réservé au cas où le serveur a
 * réellement répondu « rien à afficher ».
 *
 * L'écriture est décidée SERVEUR (même doctrine que « tout claim est décidé
 * serveur »). `crewPingDecision` (moteur pur) sert à ANTICIPER le verdict pour
 * ne pas proposer une action qui sera refusée — il ne le remplace jamais.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  CREW_MISSION_RECLAIM_WINDOW_H,
  CREW_PING_COOLDOWN_MIN,
  CREW_PING_FEED_MAX,
  CREW_PING_MAX_ACTIVE_PER_MEMBER,
  CREW_PING_TTL_H,
} from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import {
  visibleCrewPings,
  CREW_SIGNAL_BY_KEY,
  type CrewPing,
  type CrewSignalKey,
} from './engine/crewSignals';

/** Ce que je dois savoir de MOI pour anticiper honnêtement le prochain ping. */
export interface MyPingState {
  /** Mes pings encore vivants (comptés serveur). */
  activeCount: number;
  /** Mon dernier envoi (ms epoch), `null` si je n'ai jamais pingé. */
  lastPingAt: number | null;
}

/** Refus renvoyés par la RPC, plus les cas de transport. Aucun n'est muet. */
export type PingSendRefusal =
  | 'signed_out'
  | 'no_crew'
  | 'bad_bounds'
  | 'bad_signal'
  | 'sector_not_allowed'
  | 'sector_unnamed'
  | 'cooldown'
  | 'network';

export type PingSendResult =
  | { ok: true; replaced: boolean }
  | { ok: false; reason: PingSendRefusal; retryInS?: number };

// ─── Parsing (le contrat serveur peut évoluer : on ne fait jamais confiance) ──

function asText(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function asMs(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * jsonb `crew_pings_feed` → pings + mon état, ou `null` si la forme n'est pas
 * celle attendue (refus, réseau, contrat futur).
 *
 * Une ligne incomplète est ÉCARTÉE, jamais complétée : un ping sans auteur, sans
 * signal ou sans expiration ne peut pas produire une phrase vraie — et une
 * phrase à trous (« a pingé  — ») est pire qu'un ping manquant. Un signal
 * inconnu du catalogue local (app plus ancienne que le serveur) tombe de la même
 * façon, ici ET dans `visibleCrewPings` : on n'affiche jamais une clé technique.
 */
export function parseCrewPingsFeed(
  raw: unknown,
): { pings: CrewPing[]; mine: MyPingState } | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as Record<string, unknown>;
  if (root.ok !== true) return null;

  const pings: CrewPing[] = [];
  if (Array.isArray(root.pings)) {
    for (const entry of root.pings) {
      if (!entry || typeof entry !== 'object') continue;
      const p = entry as Record<string, unknown>;
      const id = asText(p.id);
      const authorUserId = asText(p.authorUserId);
      const authorPseudo = asText(p.authorPseudo);
      const signal = asText(p.signal);
      const createdAt = asMs(p.createdAt);
      const expiresAt = asMs(p.expiresAt);
      if (!id || !authorUserId || !authorPseudo || !signal) continue;
      if (createdAt === null || expiresAt === null) continue;
      if (CREW_SIGNAL_BY_KEY[signal as CrewSignalKey] === undefined) continue;
      const sectorId = asText(p.sectorId);
      const sectorName = asText(p.sectorName);
      // Un signal SITUÉ dont le nom de secteur manque est écarté : le rendre
      // sans lieu changerait son sens (« Gardez un œil ici » — ici où ?).
      if (CREW_SIGNAL_BY_KEY[signal as CrewSignalKey].scope === 'sector' && !sectorName) {
        continue;
      }
      pings.push({
        id,
        authorUserId,
        authorPseudo,
        signal: signal as CrewSignalKey,
        sectorId,
        sectorName,
        createdAt,
        expiresAt,
      });
    }
  }

  const mineRaw = (root.mine ?? {}) as Record<string, unknown>;
  const activeCount = typeof mineRaw.activeCount === 'number' && mineRaw.activeCount >= 0
    ? Math.floor(mineRaw.activeCount)
    : 0;

  return { pings, mine: { activeCount, lastPingAt: asMs(mineRaw.lastPingAt) } };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseCrewPingsResult {
  /** false = déconnecté / vitrine / sans backend : aucune surface de ping. */
  ready: boolean;
  /**
   * Pings VIVANTS du crew, ou `null` quand on n'a pas pu lire. `null` ⇒ l'écran
   * n'affiche aucun bloc ; `[]` ⇒ il dit « aucun signal » (le serveur l'a dit).
   */
  pings: CrewPing[] | null;
  /** Mon état (pings actifs, dernier envoi) — `null` tant qu'on n'a rien lu. */
  mine: MyPingState | null;
  /** Recharge (après un envoi, ou au retour sur l'onglet). */
  reload: () => void;
  /** Envoie un ping. Le serveur reste seul juge ; ceci n'est qu'un appel. */
  send: (signal: CrewSignalKey, sectorId: string | null) => Promise<PingSendResult>;
}

export function useCrewPings(): UseCrewPingsResult {
  const { session } = useSession();
  const [pings, setPings] = useState<CrewPing[] | null>(null);
  const [mine, setMine] = useState<MyPingState | null>(null);
  const [tick, setTick] = useState(0);

  const ready = !!supabase && !!session;
  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!ready || !supabase) {
      setPings(null);
      setMine(null);
      return;
    }
    const client = supabase;
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await client.rpc('crew_pings_feed', {
          // Le plafond d'affichage est une RÈGLE DE JEU : il part d'ici, il n'est
          // pas écrit en dur côté SQL (même patron que les fenêtres de 0049).
          p_limit: CREW_PING_FEED_MAX,
        });
        if (cancelled) return;
        const parsed = error ? null : parseCrewPingsFeed(data);
        if (parsed === null) {
          setPings(null);
          setMine(null);
          return;
        }
        // Re-filtré à l'affichage : entre la réponse serveur et le rendu, un
        // ping a pu expirer (écran laissé ouvert, retour d'arrière-plan).
        setPings([...visibleCrewPings(parsed.pings, Date.now())]);
        setMine(parsed.mine);
      } catch {
        if (cancelled) return;
        setPings(null);
        setMine(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, session, tick]);

  // Refetch au retour sur l'onglet (patron useRealCrew) : un ping posé par un
  // coéquipier pendant qu'on était ailleurs doit apparaître.
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      reload();
    }, [reload]),
  );

  const send = useCallback(
    async (signal: CrewSignalKey, sectorId: string | null): Promise<PingSendResult> => {
      if (!ready || !supabase) return { ok: false, reason: 'signed_out' };
      try {
        const { data, error } = await supabase.rpc('crew_ping_zone', {
          p_signal: signal,
          p_sector_id: sectorId,
          // Les 4 bornes viennent de game-rules — le SQL n'en écrit aucune en dur
          // et refuse une valeur absente plutôt que d'inventer un défaut.
          p_ttl_h: CREW_PING_TTL_H,
          p_cooldown_min: CREW_PING_COOLDOWN_MIN,
          p_max_active: CREW_PING_MAX_ACTIVE_PER_MEMBER,
          p_reclaim_window_h: CREW_MISSION_RECLAIM_WINDOW_H,
        });
        if (error) return { ok: false, reason: 'network' };
        const res = (data ?? {}) as Record<string, unknown>;
        if (res.ok === true) return { ok: true, replaced: res.replaced === true };
        const reason = asText(res.reason) as PingSendRefusal | null;
        return {
          ok: false,
          reason: reason ?? 'network',
          retryInS: typeof res.retryInS === 'number' ? res.retryInS : undefined,
        };
      } catch {
        return { ok: false, reason: 'network' };
      }
    },
    [ready],
  );

  return { ready, pings, mine, reload, send };
}
