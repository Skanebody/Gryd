/**
 * GRYD — préférences motivationnelles locales (AMENDEMENT-07 §1, motivation §2-§4/§21).
 * Le profil motivationnel (play_style + visibilité + notifs + mode discret) est
 * un miroir CLIENT des colonnes `user_profiles` (0011). Tant que l'écriture
 * profil rôle-gated n'est pas branchée (TODO O1, comme le reste du social), on
 * persiste le choix localement (AsyncStorage) pour piloter le filtrage UI/notifs
 * — c'est bien du filtrage d'affichage, JAMAIS du gameplay (§1). Les valeurs et
 * défauts viennent de @klaim/shared/types (source unique des enums) ; aucun
 * nombre magique.
 *
 * Web/preview : AsyncStorage est présent mais on ne bloque jamais le rendu sur
 * lui (chargement asynchrone, défauts affichés immédiatement) — l'onboarding
 * doit rester non bloquant sur web (§8).
 */
import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  ActivitySharing,
  MapSharing,
  PlayStyle,
  ProfileVisibility,
} from '@klaim/shared';

/** Canaux de notification (motivation §21) — filtrage d'envoi, pas de gameplay. */
export type NotifChannel = 'solo' | 'crew' | 'competition' | 'off';

/**
 * Préférences motivationnelles persistées. Défauts = ceux de l'AMENDEMENT-07 §1
 * (profil visible en jeu, activités crew, PAS de position live, traces
 * simplifiées, santé masquée ; mode discret désactivé).
 */
export interface MotivationPrefs {
  playStyle: PlayStyle;
  profileVisibility: ProfileVisibility;
  activitySharing: ActivitySharing;
  mapSharing: MapSharing;
  /** Canaux de notif actifs (§21). `off` exclusif : coupe tout. */
  notifChannels: NotifChannel[];
  /** Mode discret (§10.3) : jamais en leaderboard global, partage manuel. */
  discreetMode: boolean;
  /** L'onboarding motivationnel a été vu (ne pas re-pousser). */
  onboardingSeen: boolean;
}

/** Défauts §1 — jamais de position live, tolérants, non compétitifs par défaut. */
/**
 * Défauts — DÉCISION FONDATEUR 20/07/2026 : « tout le monde par défaut ».
 * ALIGNÉS sur `privacy/store.ts` DEFAULT_PRIVACY, qui est la page de référence :
 * les deux écrans de réglages liraient sinon des valeurs différentes pour le
 * MÊME concept (le header de privacy/store.ts documente ce miroir).
 *
 * `activitySharing` n'a pas de valeur `public` dans l'enum partagé
 * (private | friends | crew | stats_only) : `friends` est le cran le plus
 * ouvert disponible, et c'est `runVisibility: 'public'` (privacy/store.ts) qui
 * porte la visibilité réelle des courses.
 *
 * `mapSharing` reste `simplified` — DÉLIBÉRÉ, ce n'est pas un oubli : `precise`
 * publierait la trace au mètre près, ce qui reconstitue les habitudes de
 * déplacement (et contourne de fait le floutage des extrémités en révélant le
 * point de convergence quotidien). La trace simplifiée raconte la conquête sans
 * livrer l'itinéraire exact.
 */
export const DEFAULT_PREFS: MotivationPrefs = {
  playStyle: 'mixte',
  profileVisibility: 'public',
  activitySharing: 'friends',
  mapSharing: 'simplified',
  /* `competition` INCLUS par défaut (21/07/2026). Sans lui, la notification
     « quelqu'un a pris ton territoire » ne partait JAMAIS : `planStealPushes`
     exige ce canal, absent des trois défauts du repo (ici, la colonne
     `push_devices.notif_channels` et le paramètre de `register_push_device`).
     Trois migrations et 835 tests pour un mécanisme inatteignable dans la
     configuration livrée. Se perdre son territoire sans le savoir n'est pas un
     réglage par défaut défendable — et le joueur peut couper le canal. */
  notifChannels: ['solo', 'crew', 'competition'],
  discreetMode: false,
  onboardingSeen: false,
};

const STORAGE_KEY = 'gryd.motivation.prefs.v1';

/** Fusionne le JSON stocké avec les défauts (tolérant aux clés manquantes/futures). */
function hydrate(raw: string | null): MotivationPrefs {
  if (!raw) return DEFAULT_PREFS;
  try {
    const parsed = JSON.parse(raw) as Partial<MotivationPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

async function readPrefs(): Promise<MotivationPrefs> {
  try {
    return hydrate(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_PREFS;
  }
}

async function writePrefs(prefs: MotivationPrefs): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Best effort : un stockage indisponible (web privé) ne doit rien casser.
  }
}

export interface MotivationStore {
  prefs: MotivationPrefs;
  /** True tant que la lecture initiale n'a pas résolu (défauts affichés pendant). */
  loading: boolean;
  /** Patch partiel + persistance. Retourne la promesse d'écriture. */
  update: (patch: Partial<MotivationPrefs>) => Promise<void>;
}

/**
 * Hook d'accès aux préférences motivationnelles. Charge en asynchrone (défauts
 * affichés immédiatement → jamais de flash de blocage), persiste chaque patch.
 * PURE côté rendu : aucune requête réseau.
 */
export function useMotivationPrefs(): MotivationStore {
  const [prefs, setPrefs] = useState<MotivationPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void readPrefs().then((p) => {
      if (alive) {
        setPrefs(p);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback(async (patch: Partial<MotivationPrefs>) => {
    // Fonctionnel : on lit l'état courant pour ne jamais écraser un patch concurrent.
    let next: MotivationPrefs = DEFAULT_PREFS;
    setPrefs((cur) => {
      next = { ...cur, ...patch };
      return next;
    });
    await writePrefs(next);
  }, []);

  return { prefs, loading, update };
}

/**
 * Bascule un canal de notif (§21). `off` est EXCLUSIF : l'activer coupe tout ;
 * activer un autre canal retire `off`. Ne renvoie jamais une liste vide → au
 * moins `off` (silence explicite plutôt qu'état indéfini). PURE.
 */
export function toggleNotifChannel(
  channels: NotifChannel[],
  channel: NotifChannel,
): NotifChannel[] {
  if (channel === 'off') return ['off'];
  const withoutOff = channels.filter((c) => c !== 'off');
  const has = withoutOff.includes(channel);
  const next = has ? withoutOff.filter((c) => c !== channel) : [...withoutOff, channel];
  return next.length === 0 ? ['off'] : next;
}
