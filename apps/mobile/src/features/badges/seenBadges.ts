/**
 * GRYD — E19 : LA MÉMOIRE DE CE QUI A DÉJÀ ÉTÉ VU.
 *
 * Un moment dédié qui rejoue est pire qu'un moment absent : la deuxième fois, le
 * joueur apprend que la fête est un décor. Ce module tient la seule chose que
 * `user_badges` ne peut pas dire — « ce client a DÉJÀ montré ce badge ».
 *
 * Trois décisions, et leurs raisons :
 *
 *  1. LOCAL, PAS SERVEUR. Rien dans le schéma ne stocke « badge annoncé » (aucune
 *     colonne `seen_at`, aucune table), et ce chantier n'a pas le droit de
 *     toucher `supabase/**`. La mémoire vit donc dans AsyncStorage, comme
 *     `profileStore` et `chatStore`. Conséquence ASSUMÉE et dite en clair : un
 *     nouveau téléphone repart d'une mémoire vide — c'est exactement pourquoi la
 *     première lecture d'un compte pose une BASE au lieu de célébrer (cf.
 *     `selectUnlockMoments`, `baselineDone`).
 *
 *  2. PAR COMPTE. La clé de stockage porte l'id utilisateur : deux comptes sur le
 *     même téléphone ne partagent pas leur mémoire, et se déconnecter n'efface
 *     pas ce qu'on a déjà vu.
 *
 *  3. « CONNU », PAS « CÉLÉBRÉ ». On y inscrit tous les badges que le client a
 *     déjà rencontrés — y compris les COURANTS, qui n'ont jamais droit à l'écran
 *     dédié. Ça ne prive personne de rien : la carte de badge du résultat de
 *     course est armée par `IngestRunResponse.newBadges` (signal de COURSE), pas
 *     par cette mémoire. En revanche, ça garantit qu'un badge courant ne pourra
 *     jamais « devenir rare » plus tard et déclencher un arrêt pour un fait
 *     ancien.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'gryd.badges.seen.v1';

/** Clé de stockage d'un compte (jamais de mémoire partagée entre comptes). */
function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}:${userId}`;
}

interface StoredMemory {
  /** Clés de badges déjà rencontrées par ce client, pour ce compte. */
  known: string[];
}

function parse(raw: string | null): StoredMemory | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const known = (parsed as { known?: unknown }).known;
    if (!Array.isArray(known)) return null;
    return { known: known.filter((k): k is string => typeof k === 'string') };
  } catch {
    return null;
  }
}

export interface BadgeMemory {
  /** Clés déjà rencontrées — jamais recélébrées. */
  known: ReadonlySet<string>;
  /**
   * Une base a-t-elle déjà été posée pour ce compte ? `false` = tout premier
   * chargement : on inscrit la collection existante SANS rien célébrer.
   */
  baselineDone: boolean;
  /**
   * La lecture locale a abouti. Tant que c'est `false`, l'écran ne déclenche
   * RIEN — sinon un simple délai de disque ferait rejouer un moment déjà vu.
   */
  ready: boolean;
  /** Inscrit des clés comme connues (idempotent, persisté best-effort). */
  remember: (keys: readonly string[]) => void;
}

/** Mémoire VIDE et inerte — pas de compte, donc personne à décrire. */
const NO_MEMORY: BadgeMemory = {
  known: new Set<string>(),
  baselineDone: false,
  ready: false,
  remember: () => {},
};

/**
 * Mémoire locale des badges déjà rencontrés pour `userId`. Sans compte, elle
 * reste inerte (`ready: false`) : aucun moment ne peut se déclencher.
 */
export function useBadgeMemory(userId: string | null): BadgeMemory {
  const [known, setKnown] = useState<ReadonlySet<string>>(() => new Set<string>());
  const [baselineDone, setBaselineDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    setKnown(new Set<string>());
    setBaselineDone(false);
    setReady(false);
    if (!userId) return;
    AsyncStorage.getItem(storageKey(userId))
      .then((raw) => {
        if (!alive) return;
        const stored = parse(raw);
        setKnown(new Set(stored?.known ?? []));
        // L'ABSENCE d'enregistrement — et elle seule — signifie « pas de base ».
        setBaselineDone(stored !== null);
        setReady(true);
      })
      .catch(() => {
        // Stockage indisponible (navigation privée web) : on reste NON prêt.
        // Ne rien célébrer vaut mieux que rejouer l'historique à chaque visite.
        if (alive) setReady(false);
      });
    return () => {
      alive = false;
    };
  }, [userId]);

  const remember = useCallback(
    (keys: readonly string[]) => {
      if (!userId) return;
      setKnown((prev) => {
        const next = new Set(prev);
        for (const k of keys) next.add(k);
        // Écriture best-effort : une persistance ratée ne casse pas la session
        // en cours (la mémoire mémoire-vive tient jusqu'au prochain lancement).
        void AsyncStorage.setItem(
          storageKey(userId),
          JSON.stringify({ known: [...next] } satisfies StoredMemory),
        ).catch(() => {});
        return next;
      });
      setBaselineDone(true);
    },
    [userId],
  );

  return useMemo<BadgeMemory>(
    () => (userId ? { known, baselineDone, ready, remember } : NO_MEMORY),
    [userId, known, baselineDone, ready, remember],
  );
}
