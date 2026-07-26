/**
 * GRYD — DERNIÈRE ACTIVITÉ du joueur (planche E15, ligne « activité récente »).
 *
 * ─── POURQUOI UN HOOK À PART, ET PAS `useMyRunHistory` ──────────────────────
 * La planche demande UNE ligne scannable (« Hier · reprise de … »). L'historique
 * réel (`features/history/real.ts`) sait déjà répondre, mais il rapatrie 200
 * lignes de `runs` AVEC leur payload `celebration` complet — un coût réseau
 * légitime sur /historique, absurde sur l'onglet Profil qui n'affiche qu'une
 * seule ligne, et qui déclenche DÉJÀ cinq lectures (économie, badges,
 * hex_claims, crew, saison). On lit donc UNE ligne, deux colonnes.
 *
 * ─── CE QU'ON DIT, ET CE QU'ON REFUSE DE DIRE ───────────────────────────────
 * L'impact territorial vient de `runs.celebration` — le payload `IngestRunResponse`
 * que le SERVEUR a persisté au moment de l'ingestion. C'est la seule source
 * honnête de « ce que cette course a pris » : figée, et décidée serveur (même
 * raisonnement que features/history/real.ts, qui explique pourquoi compter
 * `hex_claims` par run_id dériverait dans le temps).
 *
 * Conséquence assumée : `captured`/`defended` valent `null` quand le payload est
 * absent ou d'une forme inattendue — surtout PAS 0. Une course dont on ignore
 * l'impact s'affiche « Hier · dernière course », jamais « Hier · +0 zone ».
 *
 * On ne dérive AUCUNE aire (km²) de cette réponse : `celebration.hexes` porte
 * des COMPTES d'hexagones, pas une surface. Convertir côté client (« +0,42 km² »
 * de la planche) fabriquerait un chiffre que le serveur n'a jamais calculé.
 *
 * ─── QUATRE ÉTATS, JAMAIS CONFONDUS ─────────────────────────────────────────
 *  · 'signed-out' — pas de compte / pas de backend : aucune course ne peut être
 *    la sienne ;
 *  · 'loading'    — lecture en vol (ou session en cours d'hydratation) : on
 *    n'affirme RIEN ;
 *  · 'failed'     — ses courses existent, on n'a pas su les lire ;
 *  · 'ready'      — lu. `activity === null` = il n'a réellement aucune course.
 *
 * ─── DE QUELLE DISCIPLINE PARLE CETTE LIGNE (E14, 26/07/2026) ───────────────
 * La lecture reste TOUTES DISCIPLINES, et c'est le bon choix : dater n'est pas
 * sommer. Mais la ligne ne DISAIT pas de quel monde elle parlait, alors que la
 * métrique de territoire juste au-dessus est, elle, disciplinée — un cycliste
 * lisait « dernière course » sous un bloc titré « Territoire à vélo ».
 * `runs.activity` (migration 0070) est donc rendue avec la ligne, et c'est la
 * COPIE qui lève l'ambiguïté. Elle vaut `null` quand la colonne est illisible :
 * on ne nomme jamais un monde qu'on ignore.
 */
import { useEffect, useState } from 'react';
import { ACTIVITIES, type Activity, type IngestRunResponse } from '@klaim/shared';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';

export type LastActivityStatus = 'signed-out' | 'loading' | 'failed' | 'ready';

export interface LastActivity {
  /** Instant de départ (ms epoch) — la mise en forme « Hier » est locale à l'écran. */
  startedAtMs: number;
  /**
   * Zones prises (claimed + stolen + pioneer, convention course-result).
   * `null` = impact INCONNU (payload absent/tronqué), jamais 0.
   */
  captured: number | null;
  /** Zones défendues. `null` = inconnu, jamais 0 par défaut. */
  defended: number | null;
  /**
   * DISCIPLINE DE CETTE SORTIE (`runs.activity`, migration 0070). `null` quand
   * la colonne est illisible ou porte une valeur inconnue — et surtout PAS
   * `DEFAULT_ACTIVITY` : nommer « course à pied » une sortie dont on ignore la
   * nature serait exactement l'affirmation gratuite que ce hook refuse partout
   * ailleurs. L'écran retombe alors sur une copie sans discipline.
   */
  activity: Activity | null;
}

export interface MyLastActivity {
  status: LastActivityStatus;
  /** Rempli seulement quand `status === 'ready'` ET qu'une course existe. */
  activity: LastActivity | null;
}

/** Ligne brute (colonnes explicites — jamais `*` : c'est le payload qui coûte). */
interface LastRunRow {
  started_at: string;
  celebration: unknown;
  /** `runs.activity` (0070) — typée large : la réponse réseau est une promesse. */
  activity: unknown;
}

/**
 * Discipline DÉCLARÉE de la sortie, ou `null`. Pure : on ne devine pas, on ne
 * replie pas sur la course à pied, on rend `null` et l'écran se tait.
 */
export function parseRunActivity(raw: unknown): Activity | null {
  return typeof raw === 'string' && (ACTIVITIES as readonly string[]).includes(raw)
    ? (raw as Activity)
    : null;
}

/**
 * Extrait l'impact du payload serveur. `null` pour chaque compteur dont on n'est
 * pas certain : un payload absent ou d'une forme inattendue ne doit JAMAIS se
 * lire comme « cette course n'a rien pris ».
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
  // Les trois composantes de la prise doivent TOUTES être lisibles : additionner
  // en traitant une manquante comme 0 sous-déclarerait la conquête.
  const captured =
    claimed !== null && stolen !== null && pioneer !== null ? claimed + stolen + pioneer : null;
  return { captured, defended: num(hexes.defended) };
}

export function useMyLastActivity(): MyLastActivity {
  const { session, configured, loading: sessionLoading } = useSession();
  const userId = session?.user?.id ?? null;
  const [activity, setActivity] = useState<LastActivity | null>(null);
  /** null = pas encore lu ; true = lu (même si `activity` est null : aucune course). */
  const [read, setRead] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!configured || !supabase || !userId) {
      setActivity(null);
      setRead(false);
      setFailed(false);
      return;
    }
    const client = supabase;
    let cancelled = false;
    setFailed(false);

    void (async () => {
      // ─── TOUTES DISCIPLINES, ET C'EST UN CHOIX ASSUMÉ (E14, 26/07/2026) ──
      // Cette ligne répond à « ta dernière sortie, c'était quand » sur le
      // PROFIL — un écran qui n'a PAS de commutateur E14 (la planche le pose
      // sur Carte, Classement, Historique, Statistiques ; le Profil montre une
      // carte de visite, pas un monde). Filtrer sur la course à pied ferait
      // dire « tu n'as rien fait » à quelqu'un qui a roulé hier : ce serait un
      // mensonge par omission, pas une séparation.
      //
      // Ce n'est PAS une somme (E14 interdit de sommer, pas de dater) : on rend
      // UNE ligne, la plus récente, sans additionner quoi que ce soit.
      //
      // ─── L'AMBIGUÏTÉ EST LEVÉE (26/07/2026) ─────────────────────────────
      // Ce bloc portait, jusqu'à ce correctif, une « LIMITE HONNÊTE, NON
      // RÉSOLUE » : la ligne ne disait pas de quelle discipline elle parlait.
      // Sur un écran où la métrique de territoire est, elle, DISCIPLINÉE (le
      // bloc de métriques est titré « Territoire à vélo »), un cycliste lisait
      // juste au-dessus « Hier · dernière course » — deux mondes dans le même
      // regard, sans que rien ne les distingue.
      //
      // La colonne `runs.activity` est DEMANDÉE ici, et c'est bien un datage :
      // on lit la discipline de LA ligne rendue, on n'en filtre aucune et on
      // n'additionne rien. C'est la COPIE qui lève l'ambiguïté (catalogue du
      // Profil), pas un filtre — filtrer ferait retomber la ligne dans le
      // mensonge par omission qu'elle évitait déjà.
      const { data, error } = await client
        .from('runs')
        .select('started_at, celebration, activity')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(1);
      if (cancelled) return;
      if (error || !data) {
        // On NE met PAS `read` à true : une absence de course se lirait « tu n'as
        // rien couru » alors qu'on n'a simplement pas su lire.
        setActivity(null);
        setRead(false);
        setFailed(true);
        return;
      }
      const row = (data as LastRunRow[])[0];
      if (!row) {
        setActivity(null);
        setRead(true);
        return;
      }
      const startedAtMs = Date.parse(row.started_at);
      if (!Number.isFinite(startedAtMs)) {
        // Date illisible : on ne peut pas dire « Hier ». Pas de ligne, pas de faux.
        setActivity(null);
        setRead(true);
        return;
      }
      setActivity({
        startedAtMs,
        ...impactOf(row.celebration),
        activity: parseRunActivity(row.activity),
      });
      setRead(true);
    })().catch(() => {
      // Sans ce catch, un throw synchrone du client laisserait le hook à jamais
      // sur 'loading' — le cul-de-sac muet que la charte interdit.
      if (cancelled) return;
      setActivity(null);
      setRead(false);
      setFailed(true);
    });

    return () => {
      cancelled = true;
    };
  }, [configured, userId]);

  let status: LastActivityStatus = 'signed-out';
  if (configured && userId) {
    if (failed) status = 'failed';
    else if (read) status = 'ready';
    else status = 'loading';
  } else if (sessionLoading) {
    // La session s'hydrate : ne pas conclure « pas de compte » pour quelqu'un
    // qui EN A un (le message clignoterait au démarrage à froid).
    status = 'loading';
  }

  return { status, activity: status === 'ready' ? activity : null };
}
