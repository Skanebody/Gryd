/**
 * GRYD — P0.2 (AMENDEMENT-39) : la carte lit les VRAIES captures — CÂBLAGE React.
 *
 * Jusqu'ici la carte ne lisait JAMAIS `hex_claims` (les 9 occurrences dans le mobile
 * étaient des TODO) : elle affichait un Paris conquis fabriqué. C'était le P0 « la carte
 * ment » de l'audit de mise en prod. Ce module est la porte d'entrée du réel.
 *
 * La LOGIQUE vit dans `territoryBuild.ts` (pur, testé en Deno) : ce fichier ne porte que
 * l'accès réseau et l'état React. Les types y sont ré-exportés pour ne rien casser chez
 * les consommateurs.
 *
 * Pattern de câblage : session → serveur, sinon RIEN. Depuis la fin du mode
 * vitrine (21/07/2026) il n'y a plus de repli « démo étiquetée » : les appelants
 * peignent `territories ?? []`, c'est-à-dire une carte réellement vide.
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { buildTerritories, type HexClaimRow, type RealTerritory } from './territoryBuild';

export { buildTerritories, dbToH3, stateFor } from './territoryBuild';
export type {
  HexClaimRow,
  RealTerritory,
  TerritoryProperties,
} from './territoryBuild';

export interface UseRealTerritoriesResult {
  /** null = pas encore chargé ; [] = chargé et VRAIMENT VIDE (état honnête). */
  territories: RealTerritory[] | null;
  /** true quand la source est le serveur (sinon l'appelant doit étiqueter « démo »). */
  isReal: boolean;
  /**
   * true = on a une session mais la LECTURE A ÉCHOUÉ (réseau/serveur). À distinguer
   * absolument de « pas de session » : sans ça, un joueur connecté hors réseau lisait
   * « pas encore tes vraies captures » — sous-entendu « tu n'as rien capturé », alors
   * que son territoire existe et qu'on n'a simplement pas su le charger. Un mensonge
   * par omission, exactement le genre que la charte interdit.
   */
  failed: boolean;
  /**
   * true = AUCUNE session (ou backend non configuré). Distinct de `!isReal` :
   * `isReal` est faux AUSSI pendant le chargement, y compris à la toute première
   * frame (l'effet n'a pas encore tourné, `loading` est encore false). Les écrans
   * qui déduisaient « pas connecté » de `!isReal` affichaient donc « Pas encore
   * connecté » à un joueur connecté, le temps de la requête — un mensonge bref
   * mais un mensonge. Le hook sait, lui : il le dit au lieu de le faire deviner.
   *
   * ⚠️ CORRECTIF 21/07/2026 — la RESTAURATION de session comptait pour un
   * « déconnecté ». `useSession()` expose `loading`, vrai tant que
   * `supabase.auth.getSession()` n'a pas répondu (lecture AsyncStorage /
   * localStorage) ; pendant cette fenêtre `session` est null. `signedOut` valait
   * donc true et les trois consommateurs (les deux MapScreen + /territoire)
   * affichaient « Pas encore connecté » — CTA « Se connecter » compris — à un
   * joueur parfaitement connecté qui vient de relancer l'app à froid. C'est
   * exactement le mensonge que le paragraphe ci-dessus déclare corriger, déplacé
   * d'une couche : retiré de `!isReal`, réintroduit par `!session`.
   * Un état de CHARGEMENT n'est pas un état DÉCONNECTÉ : tant que
   * `sessionLoading` est vrai, on n'affirme RIEN — `loading` porte la vérité.
   */
  signedOut: boolean;
  /**
   * true tant qu'on ne sait pas quoi afficher : restauration de session EN COURS
   * ou lecture `hex_claims` en vol. Les écrans doivent se TAIRE dans cet état
   * (ni « pas connecté », ni « aucune zone ») — c'est le contrat « un état de
   * chargement n'est pas un état vide ».
   */
  loading: boolean;
  reload: () => void;
}

/**
 * Lecture réelle des captures.
 *
 * ⚠️ PAS DE FILTRE `city_id` — et c'est un choix, pas un oubli. Deux raisons, la
 * seconde étant un BUG que le filtre aurait rendu invisible :
 *
 * 1. Erreur de catégorie. `city_id` est la « ville de rattachement DÉCLARÉE
 *    (classements) » (types.ts:65) et « la capture n'y est PAS bornée » —
 *    AMENDEMENT-02/35 : on capture dans toute l'Europe. Filtrer la CARTE par ville
 *    masquerait le territoire réellement possédé hors Paris/Lille. La carte mentirait.
 *
 * 2. Le filtre ne matcherait RIEN. `claim_hexes` insère `city_id = p_city_id`
 *    (0031:123-127), alimenté par `ctx.cityId ?? null` (ingest_run:1526) ; or le SEUL
 *    constructeur de payload (`tracker.ts:295 buildPayload`) ne déclare JAMAIS `cityId`
 *    — le champ est optionnel côté serveur (index.ts:196). Toute capture réelle a donc
 *    `city_id = NULL`. Un `.eq('city_id', …)` renverrait 0 ligne À VIE, ce qui se lit
 *    exactement comme « aucune capture » : la panne serait indétectable à l'œil.
 *    (Conséquence hors P0.2, à traiter séparément : les classements PAR VILLE n'ont
 *    aucune donnée à agréger.)
 *
 * Volume : la table est lue en entier. Assumé au MVP (0 ligne aujourd'hui), cohérent
 * avec le « aucun filtrage par viewport, volumes MVP négligeables » d'allTerritories.
 * Pas de `.limit()` : une troncature silencieuse ferait à nouveau mentir la carte.
 * Le filtrage par VIEWPORT + LOD est la vraie réponse à l'échelle (audit 200 joueurs)
 * et exige une colonne de zone indexée — un chantier à part, pas une rustine ici.
 *
 * Sans session (ou sans backend) → `isReal:false` + `signedOut:true` : l'appelant
 * peint une carte VIDE et écrit « pas connecté ». Jamais une démo.
 *
 * `crewIds` (crew réel 2/3) : ids des membres actifs de MON crew — leurs zones
 * prennent le rôle chartreuse (§C « moi/mon crew ») au lieu de rival. L'appelant
 * DOIT mémoïser le Set (sinon l'effet recharge à chaque rendu). null/undefined =
 * sans crew (ou roster pas encore chargé) : classification inchangée.
 */
export function useRealTerritories(
  crewIds?: ReadonlySet<string> | null,
): UseRealTerritoriesResult {
  const { session, loading: sessionLoading } = useSession();
  const [territories, setTerritories] = useState<RealTerritory[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Session en cours de RESTAURATION : on ne lit rien et surtout on n'affirme
    // rien. `sessionLoading` retombera, l'effet rejouera avec la vraie réponse.
    if (sessionLoading) return;
    if (!supabase || !session) {
      setTerritories(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setFailed(false);
    void (async () => {
      const { data, error } = await supabase
        .from('hex_claims')
        .select('h3index, owner_user_id, claim_type, decay_at, claimed_at');
      if (cancelled) return;
      if (error) {
        // Échec réseau → on NE bascule PAS sur la démo en la faisant passer pour du réel,
        // et on ne prétend PAS non plus que le joueur n'a rien capturé : `failed` permet
        // à l'écran de dire la vérité (« on n'a pas pu charger »), pas une approximation.
        console.error('[hexClaims] lecture hex_claims échouée :', error.message);
        setTerritories(null);
        setFailed(true);
        return;
      }
      setTerritories(
        buildTerritories(
          (data ?? []) as HexClaimRow[],
          session.user.id,
          undefined,
          crewIds,
        ),
      );
    })().catch((e: unknown) => {
      // Symétrie avec features/performance/real.ts. supabase-js convertit
      // normalement les erreurs de fetch en `{ error }` plutôt qu'en rejet ; si
      // un throw synchrone du client passait quand même, SANS ce catch le hook
      // resterait à jamais sur `loading:true, failed:false` — donc une carte
      // muette, ni « échec » ni « vide », exactement le cul-de-sac interdit.
      if (cancelled) return;
      console.error('[hexClaims] lecture hex_claims rejetée :', e);
      setTerritories(null);
      setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading, tick, crewIds]);

  // Pendant `sessionLoading`, on ne SAIT pas encore s'il y a une session :
  // répondre `true` reviendrait à traiter « je vérifie » comme « pas de compte ».
  const signedOutNow = !sessionLoading && (!supabase || !session);

  return {
    territories,
    isReal: territories !== null,
    failed,
    signedOut: signedOutNow,
    // « On ne sait pas ENCORE quoi afficher ». Trois fenêtres, une seule
    // sémantique : restauration de session, frame entre la fin de celle-ci et le
    // départ de l'effet (`loading` est encore false), requête en vol. Un écran
    // qui lit `loading` ne peut donc jamais affirmer « pas connecté » ni
    // « aucune zone » avant que la réponse existe.
    loading: !(signedOutNow || failed || territories !== null),
    reload,
  };
}
