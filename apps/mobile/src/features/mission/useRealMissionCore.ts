/**
 * GRYD — MISSION-FIRST, cœur PARTAGÉ du câblage React de la mission réelle.
 *
 * POURQUOI CE FICHIER EXISTE (21/07/2026). `useRealMission.web.ts` renvoyait une
 * valeur FIGÉE — `{ mission: null, loading: false }` — là où le natif interroge
 * `hex_claims` et dérive la mission. La « Mission dynamique réelle » n'existait
 * donc pas sur localhost, et le fondateur — dont c'est le SEUL instrument de
 * contrôle tant que les builds EAS sont bloqués — en aurait conclu que la
 * fonctionnalité ne marche pas. Une divergence localhost ⇄ iPhone est un
 * mensonge sur le produit, même quand chaque surface prise isolément est vraie.
 *
 * La justification historique du stub était valable : ne pas tirer
 * `../run/gps/provider` (expo-location / expo-task-manager) dans le bundle web.
 * Elle ne l'est plus depuis `features/map/webGeolocation.ts`, qui expose
 * `getCurrentPositionOnce()` avec la MÊME signature et sans position de repli.
 *
 * La solution n'est donc pas un second stub, c'est UNE seule logique paramétrée
 * par sa source de position : le fix GPS entre par l'argument `getFix`, et les
 * deux variantes (`useRealMission.ts` natif, `useRealMission.web.ts`) ne sont
 * plus que deux lignes de câblage. Le comportement, lui, ne peut plus diverger.
 *
 * La décision vit dans `deriveRealMission` (pure, testée Deno) ; ici, uniquement
 * l'accès réseau, le GPS et l'état React (même patron que hexClaims.ts).
 *
 * Règle zéro-crash (« jamais un crash pour une mission ») : tout échec — pas de
 * session, lecture ratée, GPS absent, rejet réseau — retombe SILENCIEUSEMENT
 * sur `mission: null`. La carte porte déjà la vérité de l'état des données
 * (hexClaims → dataNote) ; la mission se contente de disparaître quand elle n'a
 * rien d'honnête à proposer.
 *
 * ─── UNE MISSION APPARTIENT À UN SEUL MONDE (E14, 25/07/2026) ────────────────
 * `hex_claims` a désormais pour clé primaire (h3index, ACTIVITY) : le même
 * hexagone peut être tenu SIMULTANÉMENT par le coureur et par le cycliste que
 * je suis. Une lecture non filtrée rendait donc DEUX lignes pour une seule
 * cellule — territoire compté en DOUBLE (aire et nombre de zones), et une
 * mission capable d'envoyer défendre une zone vélo en affichant l'échéance de
 * la zone course. Deux chiffres faux et un ordre de mission faux, pour un
 * `.eq()` manquant.
 *
 * La lecture est donc bornée à UNE discipline. Défaut `run` : sous la lentille
 * Bike, la Carte n'affiche AUCUNE mission (cf. `lib/flags.ts`), donc `run` est
 * aujourd'hui la seule lentille où une mission est rendue — et le jour où ça
 * change, le paramètre est déjà là plutôt qu'un `'run'` en dur à retrouver.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { cellArea } from 'h3-js';
import { useFocusEffect } from 'expo-router';
import { type Activity, DEFAULT_ACTIVITY } from '@klaim/shared';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { dbToH3 } from '../map/territoryBuild';
import {
  deriveRealMission,
  type MissionPoint,
  type MissionTerritoryInput,
  type RealMission,
} from './deriveMission';
import type { MissionReadStatus } from './recommendedMission';

/** Ce que la ligne mission de la Carte lit (le kind `first_capture` est rendu
 *  « rien » par l'appelant : le widget « Prends ta première zone » le porte déjà). */
export interface UseRealMissionResult {
  /**
   * null = rien à proposer (pas de session, chargement, ou échec silencieux).
   * Sinon LA mission (une seule — §A « 1 écran = 1 décision »).
   */
  mission: RealMission | null;
  /** true tant que la 1re résolution réelle n'a pas abouti (rien à afficher). */
  loading: boolean;
  /**
   * ─── AJOUTÉ LE 27/07/2026 POUR E16, ET STRICTEMENT ADDITIF ────────────────
   * `mission` et `loading` gardent EXACTEMENT leur sémantique : la ligne de la
   * Carte et la ligne du Profil ne changent pas d'un pixel.
   *
   * Pourquoi il a fallu élargir. Ce cœur REPLIE quatre situations très
   * différentes sur `mission: null` — pas de backend, pas de session, échec de
   * lecture, lecture aboutie mais vide. C'est le bon choix pour une LIGNE qui
   * n'a que le droit de se taire ; c'en est un mauvais pour un ÉCRAN entier,
   * que la constitution oblige à distinguer les quatre états. `nextMissionRow`
   * (Profil) avait déjà dû reconstruire ce manque à coups de témoins externes
   * (`readStarted`) : deux reconstructions du même fait auraient fini par
   * diverger, donc le fait est publié à la source.
   */
  status: MissionReadStatus;
  /**
   * MES zones telles qu'elles viennent d'être LUES (jamais reconstruites) : E16
   * en dérive l'extinction d'une mission (`missionDropReason`) et sa raison
   * (« la plus proche » suppose plusieurs zones). Vide tant que rien n'a été lu.
   */
  mine: readonly MissionTerritoryInput[];
  /** Le fix RÉEL utilisé par la dernière dérivation (`null` = aucun). */
  ego: MissionPoint | null;
  /** Relance une lecture (bouton « Réessayer » d'un écran, jamais automatique). */
  reload: () => void;
}

/**
 * Où en est la lecture. `unconfigured` (pas de backend, point ouvert O1) est
 * DISTINCT de `signed-out` : dans un cas se connecter est impossible, dans
 * l'autre c'est exactement le geste qui débloque. Les confondre peindrait une
 * invitation à se connecter qui n'aboutirait jamais (constitution §2).
 */
export type { MissionReadStatus };

/** Un fix ponctuel, ou `null`. Jamais une position par défaut : les deux
 *  implémentations (natif / navigateur) refusent d'en inventer une. */
export type MissionFixReader = () => Promise<{ lat: number; lng: number } | null>;

/** Les seules colonnes lues : la cellule (BIGINT) + son échéance de decay. */
interface MineClaimRow {
  h3index: string | number;
  decay_at: string | null;
}

export function useRealMissionCore(
  getFix: MissionFixReader,
  activity: Activity = DEFAULT_ACTIVITY,
): UseRealMissionResult {
  const { session } = useSession();
  const [mission, setMission] = useState<RealMission | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  /**
   * Ce que la DERNIÈRE lecture a établi. Un seul état pour les trois faits
   * (statut, zones, position) : ils sont produits ensemble et lus ensemble, et
   * trois `useState` séparés autoriseraient un rendu intermédiaire où le statut
   * dirait « abouti » sur les zones du tour précédent.
   */
  const [read, setRead] = useState<{
    status: MissionReadStatus;
    mine: readonly MissionTerritoryInput[];
    ego: MissionPoint | null;
  }>({ status: 'idle', mine: [], ego: null });

  const reload = useCallback(() => setTick((t) => t + 1), []);

  // `getFix` est une dépendance de fait, mais les appelants passent une
  // référence de module STABLE (jamais une lambda recréée par rendu). On la
  // garde dans un ref pour que l'effet ne dépende que de la session et du tick.
  const getFixRef = useRef(getFix);
  getFixRef.current = getFix;

  useEffect(() => {
    // Pas de backend ou pas de session → aucune mission réelle, et rien
    // d'inventé pour combler : c'est la carte qui porte l'état des données.
    if (!supabase || !session) {
      setMission(null);
      setLoading(false);
      // Les deux causes ne se soignent PAS par le même geste : sans backend il
      // n'y a rien à tenter, sans session il y a une connexion à faire.
      setRead({ status: supabase ? 'signed-out' : 'unconfigured', mine: [], ego: null });
      return;
    }
    const client = supabase;
    let cancelled = false;
    setLoading(true);
    setRead((r) => ({ ...r, status: 'loading' }));
    void (async () => {
      try {
        // MES captures + ma position, en parallèle. Le fix GPS est OPTIONNEL
        // (null accepté → mission sans distance) : jamais bloquant, jamais un throw.
        const [claims, fix] = await Promise.all([
          client
            .from('hex_claims')
            .select('h3index, decay_at')
            .eq('owner_user_id', session.user.id)
            // E14 : UNE discipline. Sans ce filtre, un joueur hybride reçoit
            // deux lignes pour la MÊME cellule → territoire doublé.
            .eq('activity', activity),
          getFixRef.current(),
        ]);
        if (cancelled) return;
        if (claims.error) {
          // Échec de lecture : on n'affiche PAS une mission fausse et on ne
          // prétend rien — la mission disparaît, la carte dit déjà la vérité.
          setMission(null);
          setLoading(false);
          // Un échec ne se déguise JAMAIS en « aucune mission » : `mine` reste
          // vide, mais le statut dit qu'aucune lecture n'a abouti.
          setRead({ status: 'failed', mine: [], ego: null });
          return;
        }
        const rows = (claims.data ?? []) as MineClaimRow[];
        // UNE entrée PAR CELLULE : deriveRealMission fusionne/priorise lui-même
        // (le centroïde, l'urgence et la proximité sont sa responsabilité pure).
        const mine: MissionTerritoryInput[] = rows.map((row) => {
          const h3 = dbToH3(row.h3index);
          return {
            cells: [h3],
            decayAt: row.decay_at ? new Date(row.decay_at) : null,
            areaM2: cellArea(h3, 'm2'),
          };
        });
        const ego: MissionPoint | null = fix ? { lat: fix.lat, lng: fix.lng } : null;
        setMission(deriveRealMission({ now: new Date(), ego, mine }));
        setLoading(false);
        setRead({ status: 'ready', mine, ego });
      } catch {
        // Rejet réseau / natif inattendu : même filet silencieux.
        if (cancelled) return;
        setMission(null);
        setLoading(false);
        setRead({ status: 'failed', mine: [], ego: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, tick, activity]);

  // Refetch au retour sur l'onglet Carte (patron MapScreen) : on saute le 1er
  // focus (le fetch au montage suffit) ; les suivants rafraîchissent la mission
  // après une course qui capture / laisse expirer une zone.
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

  return { mission, loading, status: read.status, mine: read.mine, ego: read.ego, reload };
}
