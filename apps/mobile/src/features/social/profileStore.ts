/**
 * GRYD — profil éditable PERSISTÉ (AMENDEMENT-07 §8, retour fondateur : « pas
 * trouvé les boutons pour modifier le profil »). `MY_SOCIAL_PROFILE` (demo.ts)
 * reste la DATA de base immuable ; ici on superpose les CHAMPS ÉDITÉS par le
 * joueur (nom affiché, @handle, titre, ville, bio, avatar, 3 badges affichés).
 *
 * Persistance locale (AsyncStorage, même pattern que src/features/crew/chatStore.ts)
 * tant que `user_profiles` n'est pas branché (TODO O1 : PATCH rôle-gated). La
 * Player Card lit le profil FUSIONNÉ via `useMyProfile()` → toute édition se
 * reflète immédiatement au retour sur l'onglet Profil. Zéro nombre magique de
 * jeu : le niveau/tier/rang restent DÉRIVÉS côté écran (features/crew/rules).
 *
 * STORE EXTERNE PARTAGÉ (useSyncExternalStore, natif React — pas de dépendance
 * hors stack) : les overrides vivent au niveau MODULE, un seul état pour tous les
 * abonnés. Ainsi /profil-edit qui appelle `save()` notifie l'onglet /profil resté
 * monté sous la stack → l'édition se reflète SANS remount (retour fondateur).
 */
import { useCallback, useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HANDLE_REGEX } from '@klaim/shared';
import { MY_SOCIAL_PROFILE } from './demo';
import { fetchUserProfile, upsertUserProfile } from './profileApi';
import { supabase } from '../../lib/supabase';

/** Champs du profil que le joueur peut éditer (le reste est dérivé/serveur). */
export interface EditableProfile {
  /** Nom affiché (identité visible partout). */
  displayName: string;
  /** @handle unique — regex ^[a-z0-9_]{3,20}$ (AMENDEMENT-07, base 0011). */
  handle: string;
  /** Titre éditorial affiché sous le nom (badge rare mis en avant, pas gameplay). */
  title: string;
  /** Ville d'ancrage (affichage social). */
  city: string;
  /** Bio courte (une ligne ou deux, anti-shame — jamais imposée). */
  bio: string;
  /** Couleur de l'avatar hexagonal (token charte, cf. AVATAR_COLORS). */
  avatarColor: string;
  /**
   * Initiales forcées (1-2 lettres). Vide = dérivées du displayName (défaut).
   * Utile quand le nom affiché ne donne pas l'initiale voulue.
   */
  avatarInitials: string;
  /** IDs des 3 badges mis en avant sur la Player Card (choix manuel). */
  featuredBadgeIds: readonly string[];
}

/**
 * Palette d'avatar : tokens charte uniquement (noir/blanc/chartreuse + carbones).
 * JAMAIS une couleur hors design-tokens (règle non négociable). Le blanc et la
 * chartreuse servent d'accents ; les carbones de fonds sobres.
 */
export const AVATAR_COLORS: readonly { key: string; value: string; label: string }[] = [
  { key: 'chartreuse', value: '#B4FF0D', label: 'Chartreuse' },
  { key: 'blanc', value: '#FAFAF7', label: 'Ivoire' },
  { key: 'carbone2', value: '#1D201B', label: 'Carbone' },
  { key: 'gris', value: '#8A8F84', label: 'Gris' },
  { key: 'noir', value: '#0A0B09', label: 'Nuit' },
];

/** Couleur d'avatar par défaut (1re de la palette — accent chartreuse charte). */
const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0]?.value ?? '#B4FF0D';

/** Nombre exact de badges mis en avant sur la card (AMENDEMENT-17 : 3, pas plus). */
export const FEATURED_BADGE_COUNT = 3;

/** Longueurs douces (anti-friction) — le serveur (O1) fera foi côté base. */
export const DISPLAY_NAME_MAX = 24;
export const TITLE_MAX = 32;
export const CITY_MAX = 28;
export const BIO_MAX = 90;

/**
 * Overrides = sous-ensemble éditable + éventuellement partiel (on ne stocke que
 * ce qui a été touché ; le reste retombe sur `MY_SOCIAL_PROFILE`).
 */
export type ProfileOverrides = Partial<EditableProfile>;

const STORAGE_KEY = 'gryd.social.profile.v1';

/** Profil FUSIONNÉ : base demo + champs dérivés + overrides du joueur. */
export interface MergedProfile extends EditableProfile {
  /** Tag du crew (non éditable ici — géré côté crew). */
  crewName: string;
  crewTag: string;
  seasonRank: number;
  seasonScope: string;
  formeScore: number;
  crewChestContribPct: number;
  friendsCount: number;
  xp: number;
}

/** Valeurs éditables par défaut, dérivées de la DATA de base immuable. */
export function defaultEditable(): EditableProfile {
  return {
    displayName: MY_SOCIAL_PROFILE.displayName,
    handle: MY_SOCIAL_PROFILE.handle,
    title: MY_SOCIAL_PROFILE.title,
    city: MY_SOCIAL_PROFILE.city,
    bio: '',
    avatarColor: DEFAULT_AVATAR_COLOR,
    avatarInitials: '',
    featuredBadgeIds: [],
  };
}

/** Fusionne overrides stockés + base immuable → profil complet affiché. PURE. */
export function mergeProfile(overrides: ProfileOverrides): MergedProfile {
  const base = defaultEditable();
  return {
    ...base,
    ...overrides,
    crewName: MY_SOCIAL_PROFILE.crewName,
    crewTag: MY_SOCIAL_PROFILE.crewTag,
    seasonRank: MY_SOCIAL_PROFILE.seasonRank,
    seasonScope: MY_SOCIAL_PROFILE.seasonScope,
    formeScore: MY_SOCIAL_PROFILE.formeScore,
    crewChestContribPct: MY_SOCIAL_PROFILE.crewChestContribPct,
    friendsCount: MY_SOCIAL_PROFILE.friendsCount,
    xp: MY_SOCIAL_PROFILE.xp,
  };
}

/** Initiale(s) effectives affichées : override manuel, sinon 1re lettre du nom. */
export function effectiveInitials(p: Pick<EditableProfile, 'avatarInitials' | 'displayName'>): string {
  const forced = p.avatarInitials.trim();
  if (forced.length > 0) return forced.slice(0, 2).toUpperCase();
  return (p.displayName.trim().charAt(0) || '?').toUpperCase();
}

/** Valide un @handle (regex figée base). Renvoie null si OK, sinon un message. */
export function validateHandle(handle: string): string | null {
  if (handle.length === 0) return 'Le @handle est requis.';
  if (!HANDLE_REGEX.test(handle)) {
    return '3 à 20 caractères : minuscules, chiffres et « _ ».';
  }
  return null;
}

function hydrate(raw: string | null): ProfileOverrides {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as ProfileOverrides;
  } catch {
    return {};
  }
}

async function readOverrides(): Promise<ProfileOverrides> {
  try {
    return hydrate(await AsyncStorage.getItem(STORAGE_KEY));
  } catch {
    return {};
  }
}

async function writeOverrides(o: ProfileOverrides): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(o));
  } catch {
    // Best effort : un stockage indisponible (web privé) ne casse rien.
  }
}

export interface ProfileStore {
  /** Profil fusionné (base + overrides) — prêt à afficher. */
  profile: MergedProfile;
  /** Valeurs éditables courantes (pour préremplir un formulaire d'édition). */
  editable: EditableProfile;
  /** True tant que la lecture initiale n'a pas résolu (défauts affichés). */
  loading: boolean;
  /** Applique un patch d'édition + persiste + notifie tous les abonnés. */
  save: (patch: ProfileOverrides) => Promise<void>;
}

// ─── Store externe partagé (notifier + snapshot mémoïsé) ──────────────────────
//
// Overrides au niveau MODULE : un seul état pour /profil-edit et l'onglet /profil.
// `save()` mute `overrides` puis emit() → tous les abonnés re-render (retour
// fondateur : l'édition se reflète immédiatement, sans remount).

let overrides: ProfileOverrides = {};
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

/** Snapshot stable : nouvelle ref UNIQUEMENT quand `overrides` change (getSnapshot pur). */
let snapshot: ProfileOverrides = overrides;

function emit(): void {
  snapshot = { ...overrides };
  for (const l of listeners) l();
}

/** Lecture lazy et unique des overrides persistés (déclenchée au 1ᵉʳ montage). */
function ensureLoaded(): Promise<void> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const local = await readOverrides();
      let server: Partial<EditableProfile> = {};
      if (supabase !== null) {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;
        if (userId) {
          server = (await fetchUserProfile(userId)) ?? {};
        }
      }
      overrides = { ...server, ...local };
      loaded = true;
      emit();
    })().catch(() => {
      loaded = true;
    });
  }
  return loadPromise;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  void ensureLoaded();
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ProfileOverrides {
  return snapshot;
}

/** Applique un patch d'édition, persiste et notifie tous les abonnés. */
export async function saveProfile(patch: ProfileOverrides): Promise<void> {
  overrides = { ...overrides, ...patch };
  emit();
  await writeOverrides(overrides);
  const merged = { ...defaultEditable(), ...overrides };
  await upsertUserProfile(merged);
}

/** RAZ des overrides persistés (utilitaire démo / tests). */
export async function resetProfile(): Promise<void> {
  overrides = {};
  emit();
  await writeOverrides(overrides);
}

/** Recharge user_profiles serveur après connexion (merge champs locaux). */
export async function reloadProfileFromServer(): Promise<void> {
  if (supabase === null) return;
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user.id;
  if (!userId) return;
  const server = await fetchUserProfile(userId);
  if (!server) return;
  const local = await readOverrides();
  overrides = {
    ...server,
    title: local.title,
    avatarColor: local.avatarColor,
    avatarInitials: local.avatarInitials,
    featuredBadgeIds: local.featuredBadgeIds,
  };
  emit();
  await writeOverrides(overrides);
}

/**
 * Hook d'accès au profil éditable persisté (store externe partagé). Charge en
 * asynchrone (défauts affichés immédiatement → jamais de flash), persiste chaque
 * sauvegarde. Tous les écrans partagent le MÊME état : un `save()` depuis
 * /profil-edit re-render l'onglet /profil monté (useSyncExternalStore natif).
 */
export function useMyProfile(): ProfileStore {
  const current = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const save = useCallback(saveProfile, []);
  return {
    profile: mergeProfile(current),
    editable: { ...defaultEditable(), ...current },
    loading: !loaded,
    save,
  };
}
