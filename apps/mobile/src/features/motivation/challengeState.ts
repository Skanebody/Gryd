/**
 * GRYD — progression RÉELLE des challenges (activation O1).
 *
 * Le CATALOGUE de challenges (nom, blurb, unité, récompense) est du CONTENU
 * légitime, identique pour tous. Mais « où en est le joueur » est une
 * AFFIRMATION SUR LUI : elle ne peut venir que du serveur.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ (21/07/2026) ──────────────────────────────────────
 * 1. LA VITRINE. `if (isShowcasePlatform) return { challenges: CHALLENGES }`
 *    servait le jeu de démo complet — « Night Pacers vs Canal Runners 128-121 »
 *    et un commerçant sponsor imaginaire. Le mode vitrine est abandonné : cette
 *    branche n'existe plus.
 * 3. LES `current` DE DÉMO (21/07/2026). Ils étaient devenus inertes — ce hook
 *    les écrasait — mais ils vivaient toujours dans le catalogue, prêts à être
 *    réaffichés par le premier écran qui rendrait `CHALLENGES` sans passer par
 *    ici. `catalog.ts` a été scindé en deux types : une DÉFINITION ne peut plus
 *    porter de progression, une CARTE en porte une et n'est fabricable qu'ici.
 * 2. LE « 0 » EN DUR. La version précédente renvoyait `map(zeroProgress)` pour
 *    tout joueur connecté, en commentant « la progression sera lue plus tard ».
 *    Un 0 affiché en face d'un objectif n'est pas neutre : c'est la phrase
 *    « tu n'as rien fait », dite à quelqu'un qui a peut-être couru 50 km. Ce
 *    n'était pas un état vide honnête, c'était une mesure inventée.
 *
 * ─── CE QUI EST LU MAINTENANT ──────────────────────────────────────────────
 * Deux tables, deux lectures, aucune dérivation client :
 *   · `challenges` — les challenges ACTIFS (starts_at ≤ now ≤ ends_at). Un
 *     challenge que le serveur n'a pas n'est pas affiché ; sa CIBLE et sa
 *     MÉTRIQUE viennent de `primary_goal`, c'est-à-dire exactement ce que
 *     `ingest_run` mesure (aucun écart possible entre la jauge et le calcul).
 *   · `challenge_progress` — MA progression (`kind='user'`, `subject_id = moi`),
 *     écrite par `ingest_run` à chaque course ingérée.
 * Absence de ligne de progression = le serveur affirme qu'il n'y a rien encore :
 * ce 0-là est MESURÉ, pas supposé. C'est toute la différence.
 *
 * ─── CE QUI N'EST DÉLIBÉRÉMENT PAS AFFICHÉ ─────────────────────────────────
 * Les challenges de CREW et de RIVALITÉ. Leur progression est stockée sous
 * `kind='crew'` (sujet = le crew), et la contribution personnelle — « tu as
 * contribué à 23 » — n'est stockée NULLE PART par course. On ne peut donc pas
 * l'afficher sans l'inventer : on ne les montre pas. Ils reviendront quand la
 * ventilation par membre existera. Idem pour les cartes qui nomment un tiers
 * que GRYD ne peut pas prouver (crew rival, sponsor local).
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useSession } from '../../lib/session';
import { CHALLENGES, type ChallengeCard, type ChallengeDefinition } from './catalog';

/**
 * Pourquoi la liste est vide — pilote la copie de l'état vide. Les cas n'ont PAS
 * la même réponse, donc ils ne partagent pas la même phrase :
 *   `none`        il y a des cartes, rien à expliquer ;
 *   `signedOut`   pas de compte → inviter à se connecter ;
 *   `backendOff`  backend absent OU lecture ratée → le dire, ne rien inventer ;
 *   `noneActive`  le serveur a répondu, et il n'a aucun défi en cours. Ce n'est
 *                 ni une panne ni un manque du joueur : c'est un fait sur le jeu.
 */
export type ChallengesEmptyReason = 'none' | 'signedOut' | 'backendOff' | 'noneActive';

export interface ChallengesView {
  /** Cartes affichables — définitions du catalogue + progression SERVEUR. */
  challenges: ChallengeCard[];
  /** Raison de l'absence de cartes (`none` quand il y en a). */
  empty: ChallengesEmptyReason;
  /**
   * Lecture en cours. Un CHARGEMENT n'est pas un état VIDE : tant que c'est
   * vrai, l'écran n'affirme rien sur le joueur (ni cartes, ni phrase d'absence).
   */
  loading: boolean;
}

/**
 * Une définition est-elle affichable ? Uniquement si sa progression est LISIBLE
 * pour CE joueur, c'est-à-dire `solo` : il existe alors une ligne
 * `challenge_progress` kind='user' à son nom.
 *
 * Les définitions `crew` et `rivalry` restent au catalogue mais ne sont pas
 * servies : leur progression est stockée par CREW, et la contribution
 * personnelle n'est ventilée par membre nulle part (voir l'en-tête). Les
 * afficher exigerait de l'inventer.
 *
 * Le garde sur `partnerName`/`sponsor` a disparu avec le lot du 21/07/2026 : ces
 * champs n'existent plus sur `ChallengeDefinition`, donc le catalogue ne peut
 * plus nommer un tiers inventé. La règle est passée du garde d'exécution au
 * TYPE — ce qui la rend non contournable.
 */
function readable(c: ChallengeDefinition): boolean {
  return c.type === 'solo';
}

/** Ligne serveur d'un challenge actif. `primary_goal` = {metric, target}. */
interface ActiveChallengeRow {
  id: string;
  slug: string | null;
  primary_goal: { metric?: string; target?: number } | null;
}

/** Ligne serveur de MA progression sur un challenge. */
interface ProgressRow {
  challenge_id: string;
  progress: number | string;
}

/** Le catalogue indexé par slug — le slug SQL et l'id de carte sont la même clé. */
const BY_SLUG = new Map(CHALLENGES.filter(readable).map((c) => [String(c.id), c]));

/**
 * Les challenges actifs du serveur, avec MA progression réelle.
 * Aucune valeur n'est dérivée côté client : cible et métrique viennent de
 * `primary_goal`, la progression de `challenge_progress`.
 */
export function useChallenges(): ChallengesView {
  const { session, configured, loading: sessionLoading } = useSession();
  const [challenges, setChallenges] = useState<ChallengeCard[]>([]);
  const [empty, setEmpty] = useState<ChallengesEmptyReason>('none');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Backend absent : on ne peut RIEN lire, donc on n'affiche rien et on le dit.
    if (!configured || !supabase) {
      setChallenges([]);
      setEmpty('backendOff');
      setLoading(false);
      return;
    }
    // SESSION EN COURS DE RESTAURATION. `session` est null pendant cette
    // fenêtre, et la traduire en « pas de compte » afficherait « connecte-toi »
    // à quelqu'un de déjà connecté — bref, mais faux. On attend : un chargement
    // n'affirme rien.
    if (sessionLoading) {
      setChallenges([]);
      setEmpty('none');
      setLoading(true);
      return;
    }
    // Pas de compte : le catalogue existe, mais aucune progression ne peut lui
    // être rattachée — on invite à se connecter plutôt que de montrer des 0
    // orphelins qui ressembleraient à une mesure.
    if (!session) {
      setChallenges([]);
      setEmpty('signedOut');
      setLoading(false);
      return;
    }

    const client = supabase;
    const userId = session.user.id;
    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const nowIso = new Date().toISOString();
        const [activeRes, progRes] = await Promise.all([
          client
            .from('challenges')
            .select('id, slug, primary_goal')
            .lte('starts_at', nowIso)
            .gte('ends_at', nowIso),
          client
            .from('challenge_progress')
            .select('challenge_id, progress')
            .eq('kind', 'user')
            .eq('subject_id', userId),
        ]);
        if (cancelled) return;

        // Échec de lecture : on n'affiche pas une progression à 0 « en
        // attendant » — un 0 non mesuré est exactement le mensonge qu'on retire.
        if (activeRes.error || progRes.error) {
          setChallenges([]);
          setEmpty('backendOff');
          setLoading(false);
          return;
        }

        const progressById = new Map<string, number>();
        for (const row of (progRes.data ?? []) as ProgressRow[]) {
          progressById.set(row.challenge_id, Number(row.progress));
        }

        const cards: ChallengeCard[] = [];
        for (const row of (activeRes.data ?? []) as ActiveChallengeRow[]) {
          const card = row.slug ? BY_SLUG.get(row.slug) : undefined;
          if (!card) continue;
          const goal = row.primary_goal ?? {};
          // Garde-fou : si le serveur mesure une AUTRE métrique que celle que la
          // carte annonce, la jauge raconterait autre chose que son libellé. On
          // préfère ne pas montrer la carte plutôt que d'afficher un chiffre
          // qui ne compte pas ce que la phrase dit.
          if (goal.metric !== undefined && goal.metric !== card.metric) continue;
          const target = typeof goal.target === 'number' ? goal.target : card.target;
          cards.push({
            ...card,
            target,
            // Pas de ligne = le serveur dit « rien d'enregistré » : ce 0 est mesuré.
            current: progressById.get(row.id) ?? 0,
          });
        }

        setChallenges(cards);
        setEmpty(cards.length > 0 ? 'none' : 'noneActive');
        setLoading(false);
      } catch {
        // Rejet réseau / client : même filet honnête que l'échec de lecture.
        if (cancelled) return;
        setChallenges([]);
        setEmpty('backendOff');
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, configured, sessionLoading]);

  return { challenges, empty, loading };
}

/** Un challenge par id — introuvable tant que la progression n'est pas lue. */
export function useChallenge(id: string | undefined): {
  challenge: ChallengeCard | undefined;
  loading: boolean;
} {
  const { challenges, loading } = useChallenges();
  return { challenge: id ? challenges.find((c) => c.id === id) : undefined, loading };
}
