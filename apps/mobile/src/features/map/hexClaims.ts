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
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ACTIVITIES, DEFAULT_ACTIVITY, type Activity } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { buildTerritories, type HexClaimRow, type RealTerritory } from './territoryBuild';
import {
  splitClaimsByActivity,
  type HexClaimRowWithActivity,
} from '../territory/claimsByActivity';

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
 *
 * ─── `activity` : LA LENTILLE, ET POURQUOI ELLE EST OBLIGATOIRE (26/07/2026) ─
 * `hex_claims` a une clé primaire COMPOSITE `(h3index, activity)` depuis la
 * migration 0070, APPLIQUÉE EN PRODUCTION le 25/07. Un joueur qui court ET qui
 * roule y occupe donc DEUX lignes pour un même hexagone — l'une possédée dans
 * le monde course, l'autre dans le monde vélo, éventuellement par deux
 * propriétaires différents.
 *
 * Sans `.eq('activity', …)`, cette fonction rendait les deux mondes fondus en
 * un : les zones vélo étaient peintes comme des zones de course sur les sept
 * surfaces qui lisent ce hook, l'aire et le compte de zones étaient doublés sur
 * une cellule tenue des deux côtés, et une échéance de decay vélo pouvait
 * déclencher une mission « défends ta zone » dans la lentille course. La
 * déduplication de `buildTerritories` (correctif du 25/07) empêchait le crash,
 * pas le mensonge : elle est la CEINTURE, ce filtre est la correction.
 *
 * DÉFAUT = `DEFAULT_ACTIVITY`, ET CE DÉFAUT N'EST PLUS UNE RÉPONSE POUR UN
 * ÉCRAN SANS LENTILLE (correctif du 26/07/2026). Il l'a été tant que le vélo
 * n'enregistrait rien ; depuis qu'il enregistre, un écran qui prend ce défaut en
 * silence dit à un cycliste qu'il n'a jamais rien pris. Le Profil, /territoire
 * et le widget lisent désormais `useRealTerritoriesByActivity` (plus bas) : les
 * DEUX mondes, en une requête, jamais sommés.
 *
 * PLUS AUCUN APPELANT NE PREND CE DÉFAUT EN SILENCE. `RoutePlannerMap` était la
 * dernière exception, et elle est fermée depuis `RoutePlannerMap.tsx` (il passe
 * `route.activity`, la discipline dans laquelle la boucle a RÉELLEMENT été
 * routée). Le défaut ne sert donc plus qu'aux appelants qui déclarent
 * explicitement leur discipline — c'est-à-dire à personne d'autre que la
 * signature elle-même, gardée pour que tout appel existant conserve son sens
 * exact.
 *
 * Ce commentaire a porté jusqu'au 26/07/2026 la mention « hors périmètre » et
 * l'argument « MA ROUTE est de toute façon retiré en lentille vélo » : les deux
 * sont FAUX aujourd'hui — le CTA est rendu dans les deux mondes et pousse
 * `plannerHref(activity)`. Un défaut déclaré ouvert alors qu'il est réparé coûte
 * la même chose qu'un défaut caché : la prochaine revue cesse de croire les
 * avertissements.
 */
export function useRealTerritories(
  crewIds?: ReadonlySet<string> | null,
  activity: Activity = DEFAULT_ACTIVITY,
): UseRealTerritoriesResult {
  const { session, loading: sessionLoading } = useSession();
  /**
   * Le résultat porte LA DISCIPLINE DANS LAQUELLE IL A ÉTÉ LU. Sans ce couplage,
   * la bascule de lentille laissait une fenêtre où `territories` contenait
   * encore les zones du monde précédent alors que l'écran affichait déjà
   * l'étiquette du nouveau : quelques centaines de millisecondes de territoire
   * de course peint « vélo ». Une trame de mensonge reste un mensonge — le
   * getter ci-dessous ne rend les lignes que si elles viennent du bon monde, ce
   * qui replace l'écran en `loading` (« je ne sais pas encore ») pendant la
   * bascule au lieu de le laisser affirmer.
   */
  const [read, setRead] = useState<{ activity: Activity; rows: RealTerritory[] } | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const territories = read !== null && read.activity === activity ? read.rows : null;

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Session en cours de RESTAURATION : on ne lit rien et surtout on n'affirme
    // rien. `sessionLoading` retombera, l'effet rejouera avec la vraie réponse.
    if (sessionLoading) return;
    if (!supabase || !session) {
      setRead(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setFailed(false);
    void (async () => {
      const { data, error } = await supabase
        .from('hex_claims')
        .select('h3index, owner_user_id, claim_type, decay_at, claimed_at')
        // E14 — UNE seule discipline par lecture. Voir l'en-tête : la clé
        // primaire est composite depuis 0070, donc sans ce filtre les deux
        // mondes se peignent l'un sur l'autre.
        .eq('activity', activity);
      if (cancelled) return;
      if (error) {
        // Échec réseau → on NE bascule PAS sur la démo en la faisant passer pour du réel,
        // et on ne prétend PAS non plus que le joueur n'a rien capturé : `failed` permet
        // à l'écran de dire la vérité (« on n'a pas pu charger »), pas une approximation.
        console.error('[hexClaims] lecture hex_claims échouée :', error.message);
        setRead(null);
        setFailed(true);
        return;
      }
      setRead({
        activity,
        rows: buildTerritories(
          (data ?? []) as HexClaimRow[],
          session.user.id,
          undefined,
          crewIds,
        ),
      });
    })().catch((e: unknown) => {
      // Symétrie avec features/performance/real.ts. supabase-js convertit
      // normalement les erreurs de fetch en `{ error }` plutôt qu'en rejet ; si
      // un throw synchrone du client passait quand même, SANS ce catch le hook
      // resterait à jamais sur `loading:true, failed:false` — donc une carte
      // muette, ni « échec » ni « vide », exactement le cul-de-sac interdit.
      if (cancelled) return;
      console.error('[hexClaims] lecture hex_claims rejetée :', e);
      setRead(null);
      setFailed(true);
    });
    return () => {
      cancelled = true;
    };
    // `activity` EST une dépendance : basculer la lentille doit relancer la
    // lecture, sinon l'écran garderait les zones de l'autre monde jusqu'au
    // prochain focus — c'est-à-dire mentirait le temps d'un écran entier.
  }, [session, sessionLoading, tick, crewIds, activity]);

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

// ─────────────────────────────────────────────────────────────────────────────
// LES SURFACES SANS COMMUTATEUR (26/07/2026)
// ─────────────────────────────────────────────────────────────────────────────

/** Les DEUX mondes, lus en une seule requête et jamais fondus. */
export interface UseRealTerritoriesByActivityResult {
  /**
   * `null` = on ne sait pas encore. Sinon les deux disciplines sont TOUJOURS
   * présentes, éventuellement vides : « tu n'as pas encore de territoire à
   * vélo » est un fait honnête, une clé absente serait un trou.
   */
  worlds: Readonly<Record<Activity, RealTerritory[]>> | null;
  failed: boolean;
  signedOut: boolean;
  loading: boolean;
  reload: () => void;
}

/**
 * LECTURE DES DEUX MONDES pour les écrans QUI N'ONT PAS DE LENTILLE — Profil,
 * /territoire, widget « Mon territoire ».
 *
 * ─── LE DÉFAUT SILENCIEUX QUE CE HOOK REMPLACE ──────────────────────────────
 * Ces surfaces appelaient `useRealTerritories()` sans discipline, donc avec
 * `DEFAULT_ACTIVITY`. La conséquence était PROUVÉE et sévère : un joueur qui ne
 * roule QU'À VÉLO lisait zéro zone partout — le Profil le déclarait « nouveau
 * joueur », masquait ses quatre métriques et lui affichait « PREMIÈRE
 * MISSION ». L'app lui disait qu'il n'avait jamais rien pris alors qu'il tenait
 * du territoire. Le commentaire d'origine assumait ce défaut (« elles restent
 * exactement dans le monde qu'elles montraient hier ») ; il était vrai le jour
 * où le vélo n'enregistrait rien, il est devenu faux le 26/07.
 *
 * ─── POURQUOI UNE SEULE REQUÊTE, ET PAS DEUX HOOKS FILTRÉS ──────────────────
 * Deux `useRealTerritories(…, 'run' | 'bike')` auraient doublé le trafic sur une
 * table déjà lue en entier, sur un écran qui déclenche déjà cinq lectures. Ici
 * on retire le `.eq('activity', …)` et on demande la COLONNE : le serveur
 * renvoie les deux mondes en un aller-retour, et la séparation se fait dans une
 * fonction pure (`splitClaimsByActivity`), testée sous Deno.
 *
 * ─── CE QUI N'EST JAMAIS FAIT ICI ───────────────────────────────────────────
 * Aucun total. Chaque monde est bâti par SON PROPRE `buildTerritories`, sur ses
 * propres lignes. Fusionner reviendrait à peindre deux propriétaires
 * contradictoires sur le même hexagone (clé primaire composite `(h3index,
 * activity)`, 0070) et à compter deux fois une même parcelle de ville — la
 * somme que la planche E14 interdit mot pour mot.
 *
 * L'écran qui consomme ce hook doit ENSUITE choisir, et il n'a que deux
 * réponses honnêtes : montrer les deux mondes côte à côte, ou DIRE lequel il
 * montre. Ne rien dire redeviendrait le défaut ci-dessus.
 */
export function useRealTerritoriesByActivity(
  crewIds?: ReadonlySet<string> | null,
): UseRealTerritoriesByActivityResult {
  const { session, loading: sessionLoading } = useSession();
  const [worlds, setWorlds] = useState<Record<Activity, RealTerritory[]> | null>(null);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    // Session en cours de RESTAURATION : on ne lit rien et on n'affirme rien.
    if (sessionLoading) return;
    if (!supabase || !session) {
      setWorlds(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setFailed(false);
    void (async () => {
      const { data, error } = await supabase
        .from('hex_claims')
        // `activity` EST demandée, et il n'y a PAS de `.eq` : c'est la colonne
        // qui sépare, pas le serveur. Voir l'en-tête — une seule requête pour
        // deux mondes, séparés ensuite en pur.
        .select('h3index, owner_user_id, claim_type, decay_at, claimed_at, activity');
      if (cancelled) return;
      if (error) {
        console.error('[hexClaims] lecture des deux mondes échouée :', error.message);
        setWorlds(null);
        setFailed(true);
        return;
      }
      const split = splitClaimsByActivity((data ?? []) as HexClaimRowWithActivity[]);
      if (split.unknownCount > 0) {
        // Impossible par contrainte SQL (0070:103-104). Si ça arrivait, on ne
        // range PAS ces lignes dans la course à pied — on le dit dans les logs
        // plutôt que de fabriquer du territoire dans un monde qui n'est pas le
        // leur. L'écran, lui, sous-déclare : c'est le seul biais acceptable.
        console.error(
          `[hexClaims] ${split.unknownCount} capture(s) de discipline inconnue — ignorées`,
        );
      }
      const built = {} as Record<Activity, RealTerritory[]>;
      for (const a of ACTIVITIES) {
        built[a] = buildTerritories(split.rows[a], session.user.id, undefined, crewIds);
      }
      setWorlds(built);
    })().catch((e: unknown) => {
      // Même filet que `useRealTerritories` : sans lui, un throw synchrone du
      // client laisserait l'écran à jamais sur `loading` — ni « échec », ni
      // « vide », le cul-de-sac muet que la charte interdit.
      if (cancelled) return;
      console.error('[hexClaims] lecture des deux mondes rejetée :', e);
      setWorlds(null);
      setFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [session, sessionLoading, tick, crewIds]);

  const signedOutNow = !sessionLoading && (!supabase || !session);

  return {
    worlds,
    failed,
    signedOut: signedOutNow,
    loading: !(signedOutNow || failed || worlds !== null),
    reload,
  };
}

/**
 * MES possessions dans un monde donné (`status === 'crew'`), avec leurs deux
 * mesures. Fonction d'écran plutôt que de moteur : elle ne fait que filtrer et
 * réduire des lignes déjà bâties — mais elle vit ici pour que les trois surfaces
 * sans lentille ne puissent pas en écrire trois variantes divergentes.
 */
export interface MyWorld {
  mine: RealTerritory[];
  /** Somme des aires de MES zones, en m². Jamais mêlée à l'autre discipline. */
  areaM2: number;
  /** Somme des hexagones tenus. */
  zones: number;
}

export function myWorldOf(territories: readonly RealTerritory[]): MyWorld {
  const mine = territories.filter((x) => x.props.status === 'crew');
  return {
    mine,
    areaM2: mine.reduce((sum, x) => sum + x.props.areaM2, 0),
    zones: mine.reduce((sum, x) => sum + x.zoneCount, 0),
  };
}

/** `myWorldOf` appliqué aux deux mondes — mémoïsé, jamais sommé. */
export function useMyWorlds(
  worlds: Readonly<Record<Activity, RealTerritory[]>> | null,
): Readonly<Record<Activity, MyWorld>> | null {
  return useMemo(() => {
    if (worlds === null) return null;
    const out = {} as Record<Activity, MyWorld>;
    for (const a of ACTIVITIES) out[a] = myWorldOf(worlds[a]);
    return out;
  }, [worlds]);
}
