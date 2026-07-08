/**
 * GRYD — store d'ÉDITION du crew (retour fondateur : « pas trouvé les boutons
 * pour modifier le crew »). Le founder édite NOM / TAG / DESCRIPTION / statut de
 * recrutement (§9) / tags de style (§10) — persistés AsyncStorage (démo, façon
 * lib/haptics.ts), reflétés dans le Crew HQ au retour.
 *
 * Anti pay-to-win (AMENDEMENT-16) : le blason premium reste un item Arsenal
 * (lien) — ici on n'édite QUE de l'identité éditoriale, jamais de la puissance.
 * Permissions : `changeNameEmblem` + `manageRecruitment` sont founder-only dans
 * CREW_PERMISSIONS (source de vérité) — le gating UI consomme la même matrice.
 *
 * TODO(O1) : brancher crews (0010) / recruitment_status + tags (0013) via Edge
 * Function rôle-gated (écriture client interdite côté DB).
 */
import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CREW_RECRUITMENT_DEFAULT, type CrewRecruitmentStatus, type CrewTag } from '@klaim/shared';
import { MY_CREW } from './demo';

/** Clé de persistance de l'édition crew (démo locale). */
const CREW_EDIT_STORAGE_KEY = 'gryd.crew.edit';

/**
 * Profil éditable du crew. `description` n'existe pas dans la démo MY_CREW :
 * on part d'un défaut éditorial neutre, le founder le remplace.
 */
export interface CrewEditState {
  name: string;
  tag: string;
  description: string;
  recruitment: CrewRecruitmentStatus;
  tags: readonly CrewTag[];
}

/** Description par défaut (démo) — courte, ton GRYD, remplaçable. */
export const CREW_DESCRIPTION_DEFAULT =
  'Run club de l’Est parisien. On court, on capture, on tient la zone. Défense sérieuse, ambiance saine.';

/** Longueurs max raisonnables (UX + garde-fou saisie ; pas des règles de jeu). */
export const CREW_NAME_MAX = 24;
export const CREW_TAG_MAX = 6;
export const CREW_DESCRIPTION_MAX = 160;

/** État de départ = valeurs de la démo MY_CREW (source d'affichage actuelle). */
export function crewEditSeed(): CrewEditState {
  return {
    name: MY_CREW.name,
    tag: MY_CREW.tag,
    description: CREW_DESCRIPTION_DEFAULT,
    recruitment: MY_CREW.recruitment ?? CREW_RECRUITMENT_DEFAULT,
    tags: MY_CREW.tags,
  };
}

// ─── Store minimal (mirroir de chatStore : notifier + snapshot mémoïsé) ───────

let current: CrewEditState = crewEditSeed();
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();
let snapshot: CrewEditState = current;

function emit() {
  snapshot = { ...current };
  for (const l of listeners) l();
}

function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = AsyncStorage.getItem(CREW_EDIT_STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Partial<CrewEditState>;
            current = { ...crewEditSeed(), ...parsed };
          } catch {
            // corpus corrompu → seed propre.
          }
        }
        emit();
      })
      .catch(() => {});
  }
  return loadPromise;
}

function persist() {
  void AsyncStorage.setItem(CREW_EDIT_STORAGE_KEY, JSON.stringify(current)).catch(() => {});
}

/** Persiste uniquement la description locale (pas de colonne serveur). */
export function saveCrewDescriptionLocal(description: string): void {
  current = { ...current, description: description.trim() };
  persist();
  emit();
}

/** Écrit le profil édité démo (validé côté écran), persiste et notifie le HQ. */
export function saveCrewEdit(next: CrewEditState): void {
  current = {
    name: next.name.trim() || MY_CREW.name,
    tag: next.tag.trim() || MY_CREW.tag,
    description: next.description.trim(),
    recruitment: next.recruitment,
    tags: [...next.tags],
  };
  persist();
  emit();
}

/** RAZ de l'édition (utilitaire démo / tests). */
export function resetCrewEdit(): void {
  current = crewEditSeed();
  persist();
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void ensureLoaded();
  return () => listeners.delete(listener);
}

function getSnapshot(): CrewEditState {
  return snapshot;
}

/**
 * Hook lecture seule du profil crew effectif (HQ) : nom/tag reflètent l'édition
 * persistée dès le retour de l'écran d'édition.
 */
export function useCrewProfile(): CrewEditState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
