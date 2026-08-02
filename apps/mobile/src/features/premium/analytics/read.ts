/**
 * GRYD — E66 : LA LECTURE. Supabase d'un côté, `derive.ts` de l'autre.
 *
 * Même partage que `performance/real.ts`, `map/hexClaims.ts` et
 * `social/economy.ts` : ce fichier ne porte QUE l'accès réseau et l'état React ;
 * pas une règle, pas un seuil, pas une horloge de calcul. `deriveTerritoryAnalytics`
 * reçoit `nowMs` explicitement, à un seul endroit, et reste testable sans réseau.
 *
 * ══ CINQ ÉTATS DISTINCTS, JAMAIS CONFONDUS ════════════════════════════════
 * Doctrine « l'app ne ment jamais » (CLAUDE.md) :
 *   · 'loading'  → on ne SAIT pas encore (session en restauration, requêtes en
 *                  vol). Un chargement n'affirme RIEN sur le joueur.
 *   · 'signedOut'→ pas de compte (ou pas de backend). Aucun territoire ne peut
 *                  être le sien : ce n'est ni un vide ni une panne.
 *   · 'locked'   → LU côté serveur, et ce compte n'est PAS Club. C'est un fait
 *                  d'abonnement, pas une panne. L'écran montre alors ce que la
 *                  fonction apporte et renvoie vers /premium.
 *   · 'failed'   → la lecture a échoué. Son territoire existe, on ne sait pas le
 *                  lire. Afficher « 0 zone » ici lui dirait qu'il n'a rien pris.
 *   · 'ready'    → LU. `data.isEmpty` distingue alors « Club, et rien encore »
 *                  (le cas RÉEL aujourd'hui : la base est vide) de « Club, et
 *                  voici tes zones ». Les deux sont vrais, aucun ne se déguise.
 *
 * ══ LE DROIT CLUB EST LU AU SERVEUR, PAS AU STORE ═════════════════════════
 * La porte est `users.is_club` — la même colonne que lisent déjà
 * `arsenal/inventory.ts` et `social/economy.ts`, écrite par `rc_webhook`.
 * Volontairement PAS `usePremium().pro` : ce dernier dérive d'un `CustomerInfo`
 * RevenueCat, indisponible sur le web et dans Expo Go (`purchasesCapability`
 * y rend `available: false`). Gater sur lui aurait rendu E66 **définitivement**
 * inatteignable hors dev build — y compris pour un abonné payant ouvrant l'app
 * dans un navigateur. Le serveur, lui, sait, partout.
 *
 * ══ §12 / E66 : ON NE LIT QUE SON PROPRE TERRITOIRE ═══════════════════════
 * Les deux `select` ci-dessous sont l'application concrète de « le Premium aide
 * à comprendre SON PROPRE territoire, pas à espionner » :
 *   · `territories` est borné par `owner_type='user' AND owner_id=<moi>`. Ce
 *     n'est PAS un sous-ensemble : `ingest_run/territory.ts:207` écrit
 *     `owner_type: 'user'` EN DUR (« un crew ne peut pas posséder aujourd'hui »,
 *     contest_wiring.ts:36), donc ce filtre est exhaustif — il ne cache rien au
 *     joueur, il exclut autrui. La vue publique `public_territories` n'est
 *     délibérément PAS lue ici : elle sert à peindre la carte de tout le monde,
 *     pas à nourrir une analyse.
 *   · `territory_contests` ne demande QUE `territory_id, status, resolved_at,
 *     expires_at`. Ni `attacker_id` ni `attacker_type` : la RLS de 0078 me les
 *     rendrait (je suis partie), mais une contestation dit « quelqu'un a couru
 *     ici à cette heure-là, et voici qui » — le camp qui défend a le droit de
 *     savoir qu'il est attaqué, pas d'en tirer une fiche de renseignement. Ce
 *     qu'on ne demande pas ne peut pas fuir dans un rendu.
 *   Le tri final (« cette contestation vise-t-elle bien MON territoire ? ») est
 *   refait en pur dans `derive.ts` : la policy m'ouvre aussi celles où
 *   J'ATTAQUE, et elles visent le territoire d'un autre.
 *
 * ══ ANTI PAY-TO-WIN (§1.6) ════════════════════════════════════════════════
 * Rien ici n'est lu par le moteur. `is_club` ouvre un ÉCRAN DE LECTURE ; il ne
 * donne ni territoire, ni points, ni protection, ni priorité de classement.
 *
 * ⚠️ DÉPENDANCE DE DÉPLOIEMENT : ces lectures exigent que les migrations 0074 et
 * 0078 soient APPLIQUÉES. Sinon PostgREST rend une erreur et le hook passe en
 * 'failed' — pas en « aucune zone ». C'est voulu : une lecture impossible n'est
 * pas un vide.
 */
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import { supabase } from '../../../lib/supabase';
import { useSession } from '../../../lib/session';
import {
  deriveTerritoryAnalytics,
  type OwnContestRow,
  type OwnedTerritoryRow,
  type TerritoryAnalytics,
} from './derive';
// Copie GÉNÉRÉE du moteur (sync-game-rules.mjs) : la durée d'un règne se
// calcule à UN SEUL endroit, sinon un chiffre serveur contredirait l'écran.
import {
  buildTerritoryHistory,
  type RawReign,
  type TerritoryHistory,
} from './engine/territoryHistory';

/** Colonnes de `territories` réellement lues — SOURCE UNIQUE de ce select. */
const TERRITORY_COLUMNS = 'id, area_m2, state, defense_level, controlled_since, geometry';

/**
 * Colonnes de `territory_contests` réellement lues. L'ABSENCE d'`attacker_*` est
 * la mesure de confidentialité elle-même (cf. en-tête) : ne pas la « compléter ».
 */
const CONTEST_COLUMNS = 'territory_id, status, resolved_at, expires_at';

export type AnalyticsStatus = 'loading' | 'signedOut' | 'locked' | 'failed' | 'ready';

export interface UseTerritoryAnalyticsResult {
  readonly status: AnalyticsStatus;
  /** Renseigné UNIQUEMENT en 'ready'. `isEmpty` y distingue le vide RÉEL. */
  readonly data: TerritoryAnalytics | null;
  /** L'instant du calcul — l'écran l'affiche plutôt que de laisser croire au live. */
  readonly computedAtMs: number | null;
  /**
   * MÉMOIRE DU TERRITOIRE (0109/0110) : « ce quartier était à toi de mars à
   * septembre ». `null` tant qu'on n'est pas en 'ready', ou si le serveur n'a
   * pas rendu d'histoire — jamais un objet vide de complaisance.
   *
   * ⚠️ L'histoire NE REMONTE PAS avant la migration 0109 : `firstKnownAtMs` est
   * le plus ancien règne CONNU, pas le début du joueur.
   */
  readonly history: TerritoryHistory | null;
  /**
   * Un écran de connexion qui MARCHE existe-t-il ? Sans backend configuré,
   * `/sign-in` n'a personne au bout : on ne peint alors AUCUN bouton (même garde
   * que `app/amis.tsx`, `app/qr.tsx` et `usePremium`).
   */
  readonly canSignIn: boolean;
  readonly reload: () => void;
}

interface Loaded {
  readonly activity: Activity;
  readonly data: TerritoryAnalytics;
  readonly computedAtMs: number;
  /**
   * `null` = le SERVEUR n'a pas rendu d'histoire (backend antérieur à 0110, ou
   * refus). DISTINCT d'une histoire VIDE (`reigns: []`), qui veut dire « lu, et
   * ce joueur n'a encore rien tenu ». L'écran ne doit jamais confondre les deux :
   * l'un se tait, l'autre invite à courir.
   */
  readonly history: TerritoryHistory | null;
}

export function useTerritoryAnalytics(
  activity: Activity = DEFAULT_ACTIVITY,
): UseTerritoryAnalyticsResult {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [locked, setLocked] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((n) => n + 1), []);

  /**
   * Le résultat porte LA DISCIPLINE DANS LAQUELLE IL A ÉTÉ LU (même correctif
   * que `useRealTerritories`) : sans ce couplage, basculer la lentille laissait
   * une fenêtre où les zones du monde précédent s'affichaient sous l'étiquette
   * du nouveau. Une trame de mensonge reste un mensonge — on repasse en
   * 'loading' pendant la bascule au lieu d'affirmer.
   */
  const fresh = loaded !== null && loaded.activity === activity ? loaded : null;

  useEffect(() => {
    // Session en RESTAURATION : on ne lit rien, et surtout on n'affirme rien.
    if (sessionLoading) return;
    if (!supabase || !userId) {
      setLoaded(null);
      setLocked(false);
      setFailed(false);
      return;
    }

    let cancelled = false;
    setFailed(false);
    setLocked(false);

    void (async () => {
      // ─── 1. LA PORTE : ce compte est-il Club ? ────────────────────────────
      const club = await supabase!
        .from('users')
        .select('is_club')
        .eq('id', userId)
        .maybeSingle();
      if (cancelled) return;
      if (club.error) {
        console.error('[premium/analytics] lecture du droit Club échouée :', club.error.message);
        setLoaded(null);
        setFailed(true);
        return;
      }
      // `is_club !== true` couvre `false`, `null` ET la ligne absente. Aucune de
      // ces trois situations n'est une panne : c'est « pas (encore) Club ».
      if (club.data?.is_club !== true) {
        setLoaded(null);
        setLocked(true);
        return;
      }

      // ─── 2. LES DONNÉES : les miennes, dans CETTE discipline ─────────────
      // En parallèle : les enchaîner doublerait la latence pour rien.
      const [territories, contests, history] = await Promise.all([
        supabase!
          .from('territories')
          .select(TERRITORY_COLUMNS)
          .eq('activity', activity)
          .eq('owner_type', 'user')
          .eq('owner_id', userId),
        supabase!.from('territory_contests').select(CONTEST_COLUMNS),
        // MÉMOIRE (0110). Bornée à la MÊME discipline que le reste de l'écran :
        // sans ça, la lentille vélo montrerait une histoire de course.
        supabase!.rpc('my_territory_history', { p_activity: activity }),
      ]);
      if (cancelled) return;

      // ⚠️ « ÉCHEC PARTIEL » N'EXISTE PAS. Si l'une des deux rate, on ne rend
      // PAS l'autre : une analyse amputée de ses contestations annoncerait
      // « aucune frontière à surveiller » à quelqu'un dont la zone tombe dans
      // trois heures. Une sous-déclaration silencieuse est un mensonge.
      const error = territories.error ?? contests.error;
      if (error) {
        console.error('[premium/analytics] lecture territoriale échouée :', error.message);
        setLoaded(null);
        setFailed(true);
        return;
      }

      const computedAtMs = Date.now();

      /*
        L'HISTOIRE NE FAIT PAS ÉCHOUER LA PAGE, et c'est une asymétrie ASSUMÉE.
        Une contestation manquante ferait annoncer « aucune frontière à
        surveiller » à quelqu'un dont la zone tombe dans trois heures : c'est
        pourquoi son échec est fatal (voir plus haut). L'histoire, elle, ne
        protège rien — la perdre coûte une section, pas une décision. On la rend
        donc `null` (« on ne sait pas »), jamais vide (« tu n'as rien tenu »).
      */
      let builtHistory: TerritoryHistory | null = null;
      const payload = history.error ? null : (history.data as { ok?: boolean; reigns?: unknown });
      if (history.error) {
        console.error('[premium/analytics] histoire non lue :', history.error.message);
      } else if (payload?.ok === true && Array.isArray(payload.reigns)) {
        builtHistory = buildTerritoryHistory(payload.reigns as RawReign[], computedAtMs);
      }

      setLoaded({
        activity,
        computedAtMs,
        history: builtHistory,
        data: deriveTerritoryAnalytics({
          territories: (territories.data ?? []) as unknown as OwnedTerritoryRow[],
          contests: (contests.data ?? []) as unknown as OwnContestRow[],
          // L'UNIQUE horloge de cette fonctionnalité, lue ici et injectée.
          nowMs: computedAtMs,
        }),
      });
    })().catch((e: unknown) => {
      // supabase-js convertit normalement les erreurs réseau en `{ error }`
      // plutôt qu'en rejet ; si un throw synchrone passait quand même, SANS ce
      // catch le hook resterait à jamais en 'loading' — un spinner infini,
      // exactement le cul-de-sac que CLAUDE.md interdit.
      if (cancelled) return;
      console.error('[premium/analytics] lecture rejetée :', e);
      setLoaded(null);
      setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [userId, sessionLoading, activity, tick]);

  const signedOut = !sessionLoading && (!supabase || !userId);

  const status: AnalyticsStatus = sessionLoading
    ? 'loading'
    : signedOut
      ? 'signedOut'
      : failed
        ? 'failed'
        : locked
          ? 'locked'
          : fresh !== null
            ? 'ready'
            : 'loading';

  return {
    status,
    data: status === 'ready' ? (fresh?.data ?? null) : null,
    history: status === 'ready' ? (fresh?.history ?? null) : null,
    computedAtMs: status === 'ready' ? (fresh?.computedAtMs ?? null) : null,
    canSignIn: configured && signedOut,
    reload,
  };
}
