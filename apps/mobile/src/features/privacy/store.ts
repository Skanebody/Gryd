/**
 * GRYD — préférences de confidentialité locales (AMENDEMENT-17 CHANTIER 3).
 * La page Confidentialité est LA plus critique (géoloc). Ces réglages sont un
 * miroir CLIENT des futures colonnes serveur (comme motivation/store.ts) : tant
 * que l'écriture rôle-gated n'est pas branchée (TODO O1), on persiste localement
 * (AsyncStorage, même pattern que src/lib/haptics.ts) pour piloter le FILTRAGE
 * d'affichage — JAMAIS le gameplay. L'impact crew reste compté même masqué
 * (règle produit : « impact crew compte même si masqué »).
 *
 * Les défauts s'ALIGNENT sur AMENDEMENT-07 (motivation/store.ts DEFAULT_PREFS) :
 * profil `crew`, activité `crew`, trace `simplified`, position live JAMAIS,
 * données de santé PRIVÉES. Ici on ré-emploie les mêmes enums @klaim/shared pour
 * profil / courses afin de ne jamais diverger de settings-motivation.
 *
 * Web/preview : AsyncStorage présent mais on ne bloque jamais le rendu dessus
 * (lecture asynchrone, défauts affichés immédiatement).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ProfileVisibility } from '@klaim/shared';

/**
 * Visibilité d'une course : public / crew / masqué. `hidden` = trace et stats
 * cachées aux autres, mais impact crew TOUJOURS compté (règle produit). Enum
 * dédié (les courses ne sont pas l'`ActivitySharing` de motivation, qui n'a pas
 * de valeur `public`).
 */
export type RunVisibility = 'public' | 'crew' | 'hidden';

/** Position live (AMENDEMENT-07 : jamais publique). Défaut `never`. */
export type LivePosition = 'never' | 'crew_run' | 'crew';

/** Rayon de masquage départ/arrivée autour des lieux sensibles. */
export type MaskRadius = '200' | '500' | '1000';

/** Qui peut m'ajouter / m'inviter / me contacter / voir mon statut (crew & social). */
export type SocialAudience = 'everyone' | 'crew' | 'friends' | 'nobody';

/**
 * Préférences de confidentialité persistées. `profileVisibility` réutilise
 * volontairement l'enum ProfileVisibility de motivation pour rester synchrone
 * avec settings-motivation (source unique @klaim/shared) ; `runVisibility` a son
 * propre enum (public/crew/masqué).
 */
export interface PrivacyPrefs {
  /** Toggle MAÎTRE. Actif → force le mode le plus fermé sur tout (dérivé UI). */
  privateMode: boolean;

  /** Visibilité du profil. Défaut `crew` (AMENDEMENT-07). */
  profileVisibility: ProfileVisibility;
  /** Visibilité des courses. Défaut `crew`. `hidden` = trace masquée. */
  runVisibility: RunVisibility;

  /** Masquer départ & arrivée autour des lieux sensibles. */
  maskEndpoints: boolean;
  /** Rayon de flou appliqué (défaut 500 m). */
  maskRadius: MaskRadius;
  /** Appliquer le masquage autour du domicile. */
  maskHome: boolean;
  /** Appliquer le masquage autour du travail. */
  maskWork: boolean;

  /** Position live. Défaut `never` (jamais publique, AMENDEMENT-07). */
  livePosition: LivePosition;

  /** Fréquence cardiaque privée (défaut true — santé masquée AMENDEMENT-07). */
  heartRatePrivate: boolean;
  /** Autres données sportives (allure/cadence) privées. */
  sportDataPrivate: boolean;

  /** Détail territoire visible (zones tenues sur le profil public). */
  territoryVisible: boolean;

  /** Qui peut m'ajouter en ami. */
  whoCanAdd: SocialAudience;
  /** Qui peut m'inviter dans un crew. */
  whoCanInvite: SocialAudience;
  /** Qui peut m'envoyer un message. */
  whoCanMessage: SocialAudience;
  /** Qui voit mon statut (actif / en course). */
  whoSeesStatus: SocialAudience;
}

/**
 * Défauts — DÉCISION FONDATEUR 20/07/2026 : « tout le monde par défaut ».
 *
 * ARBITRAGE : une conquête que personne d'extérieur ne voit ne recrute
 * personne. Le défaut « crew » protégeait l'utilisateur mais étouffait la
 * boucle virale, qui est la raison d'être du partage (A-43). On ouvre donc la
 * VISIBILITÉ SOCIALE : profil et courses publics, et n'importe qui peut
 * ajouter / inviter / écrire / voir le statut.
 *
 * ─── LES TROIS PLANCHERS QUI NE S'OUVRENT PAS ────────────────────────────────
 * Ils ne sont PAS un oubli et ne doivent pas être « alignés » sur le reste :
 *
 * 1. `maskEndpoints` (500 m autour du domicile) — le départ et l'arrivée d'une
 *    course révèlent l'ADRESSE du coureur. C'est le risque documenté n°1 des
 *    apps de running (incidents Strava). Une trace publique est acceptable ;
 *    une trace publique qui commence sur le paillasson ne l'est pas.
 * 2. `livePosition: 'never'` — la position EN TEMPS RÉEL d'une personne seule
 *    dehors. Aucune viralité ne justifie de la diffuser par défaut.
 * 3. `heartRatePrivate: true` — la fréquence cardiaque est une donnée de SANTÉ,
 *    catégorie particulière au sens du RGPD (art. 9) : son traitement exige un
 *    consentement EXPLICITE, qu'un défaut ne peut par construction pas
 *    constituer. La rendre publique par défaut serait illicite, pas seulement
 *    imprudent.
 *
 * L'utilisateur peut ouvrir ces trois-là lui-même (c'est son choix, éclairé) ;
 * l'app ne le fait pas à sa place. `privateMode` (toggle maître) referme tout
 * d'un coup, y compris ce que ce défaut vient d'ouvrir.
 */
export const DEFAULT_PRIVACY: PrivacyPrefs = {
  privateMode: false,
  profileVisibility: 'public',
  runVisibility: 'public',
  // ── Planchers de sécurité : volontairement fermés (voir en-tête). ──
  maskEndpoints: true,
  maskRadius: '500',
  maskHome: true,
  maskWork: false,
  livePosition: 'never',
  heartRatePrivate: true,
  // ── Ouverts avec le reste (allure/cadence : perf, pas santé au sens art. 9). ──
  sportDataPrivate: false,
  territoryVisible: true,
  whoCanAdd: 'everyone',
  whoCanInvite: 'everyone',
  whoCanMessage: 'everyone',
  whoSeesStatus: 'everyone',
};

const STORAGE_KEY = 'gryd.privacy.prefs.v1';

/** Fusionne le JSON stocké avec les défauts (tolérant aux clés manquantes). */
function hydrate(raw: string | null): PrivacyPrefs {
  if (!raw) return DEFAULT_PRIVACY;
  try {
    const parsed = JSON.parse(raw) as Partial<PrivacyPrefs>;
    return { ...DEFAULT_PRIVACY, ...parsed };
  } catch {
    return DEFAULT_PRIVACY;
  }
}

async function readPrefs(): Promise<PrivacyPrefs> {
  try {
    return hydrate(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_PRIVACY;
  }
}

async function writePrefs(prefs: PrivacyPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Best effort : un stockage indisponible (web privé) ne casse rien.
  }
}

/**
 * Applique un patch partiel à des prefs. PURE (aucun effet de bord, testable) :
 * c'est LA fonction qui dérive l'objet à persister, garantissant que la valeur
 * écrite dans AsyncStorage est bien l'état patché (et jamais les défauts stale).
 */
export function applyPatch(
  current: PrivacyPrefs,
  patch: Partial<PrivacyPrefs>,
): PrivacyPrefs {
  return { ...current, ...patch };
}

export interface PrivacyStore {
  prefs: PrivacyPrefs;
  /** True tant que la lecture initiale n'a pas résolu (défauts affichés). */
  loading: boolean;
  /** Patch partiel + persistance. Retourne la promesse d'écriture. */
  update: (patch: Partial<PrivacyPrefs>) => Promise<void>;
  /** Active le mode privé + verrouille tous les réglages sensibles (un tap). */
  enablePrivateMode: () => Promise<void>;
}

/**
 * Patch appliqué quand on ACTIVE le mode privé (toggle maître) : tout ce qui
 * touche à l'exposition passe au plus fermé. Retiré l'activation → on ne
 * ré-ouvre PAS automatiquement (l'utilisateur reprend la main réglage par
 * réglage, jamais de sur-exposition surprise). PURE, testable.
 */
export const PRIVATE_MODE_PATCH: Partial<PrivacyPrefs> = {
  privateMode: true,
  profileVisibility: 'private',
  runVisibility: 'hidden',
  maskEndpoints: true,
  maskHome: true,
  maskWork: true,
  livePosition: 'never',
  heartRatePrivate: true,
  sportDataPrivate: true,
};

/**
 * Hook d'accès aux préférences de confidentialité. Charge en asynchrone (défauts
 * affichés immédiatement → jamais de flash), persiste chaque patch. PURE côté
 * rendu : aucune requête réseau.
 */
export function usePrivacyPrefs(): PrivacyStore {
  const [prefs, setPrefs] = useState<PrivacyPrefs>(DEFAULT_PRIVACY);
  const [loading, setLoading] = useState(true);
  /**
   * Miroir SYNCHRONE de l'état canonique. La valeur à persister est dérivée
   * d'ICI, jamais du callback fonctionnel de setPrefs (qui, sous React 18 batché
   * ou en mode concurrent, peut ne pas s'exécuter avant `await writePrefs` →
   * bug de persistance : on écrivait DEFAULT_PRIVACY à la place du patch).
   */
  const prefsRef = useRef<PrivacyPrefs>(DEFAULT_PRIVACY);

  useEffect(() => {
    let alive = true;
    void readPrefs().then((p) => {
      if (alive) {
        prefsRef.current = p;
        setPrefs(p);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<PrivacyPrefs>) => {
    // On dérive `next` du ref canonique AVANT setState → la valeur persistée
    // est toujours l'état patché, jamais une valeur stale.
    const next = applyPatch(prefsRef.current, patch);
    prefsRef.current = next;
    setPrefs(next);
    await writePrefs(next);
  }, []);

  const enablePrivateMode = useCallback(() => update(PRIVATE_MODE_PATCH), [update]);

  return { prefs, loading, update, enablePrivateMode };
}
