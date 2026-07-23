/**
 * GRYD — profil éditable PERSISTÉ (AMENDEMENT-07 §8, retour fondateur : « pas
 * trouvé les boutons pour modifier le profil »). La base est NEUTRE (aucune
 * identité pré-remplie) ; on superpose les CHAMPS ÉDITÉS par le joueur (nom
 * affiché, @handle, titre, ville, bio, avatar, 3 badges affichés).
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
import type { Session } from '@supabase/supabase-js';
import { HANDLE_REGEX } from '@klaim/shared';
import type { Entry } from '../../i18n/types';
import { t } from '../../i18n/store';
import { C } from '../../i18n/catalog/profil';
import { useSession } from '../../lib/session';

/**
 * Identité lisible dérivée de la SESSION (vrai user O1) : nom du compte, sinon
 * préfixe e-mail, sinon un neutre « Coureur » (traduit via le catalogue i18n).
 * Sert à NE PAS présenter le persona démo « KORO »/@koro à un vrai utilisateur
 * qui n'a pas encore édité son profil (le back `user_profiles` n'est pas
 * branché — TODO O1). Dépend de la locale courante (résolue à l'appel).
 */
function sessionIdentity(session: Session | null): { displayName: string; handle: string } {
  const fallbackName = t(C.defaultRunnerName);
  const meta = (session?.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  const emailPrefix = session?.user?.email?.split('@')[0];
  const displayName =
    (meta.full_name || meta.name || emailPrefix || fallbackName).toString().trim() || fallbackName;
  // Le @handle est un INVARIANT technique (a-z0-9_) — le repli reste « coureur ».
  const handle =
    (emailPrefix || displayName).toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20) || 'coureur';
  return { displayName, handle };
}

/** Champs du profil que le joueur peut éditer (le reste est dérivé/serveur). */
export interface EditableProfile {
  /** Nom affiché (identité visible partout). */
  displayName: string;
  /** @handle unique — regex ^[a-z0-9_]{3,20}$ (AMENDEMENT-07, base 0011). */
  handle: string;
  /** Titre éditorial affiché sous le nom (badge rare mis en avant, pas gameplay). */
  title: string;
  /**
   * Ville d'ancrage — LIBELLÉ AFFICHÉ, pays inclus (« Brest (FR) »).
   *
   * Depuis le 23/07/2026 ce champ n'est plus une saisie libre : il est produit
   * par le sélecteur partagé (`features/city/CityPicker`) à partir du
   * référentiel des villes réelles d'Europe. Avant, on pouvait y taper
   * « Pariss » — le fondateur demandait précisément « que la ville existe ».
   */
  city: string;
  /**
   * Identifiant de la ville choisie (`paris`/`lille` ou geonameid), ou vide.
   *
   * Il existe pour que RÉOUVRIR le sélecteur repositionne le choix, et pour que
   * la carte puisse cadrer sur cette ville. Il n'écrit RIEN côté serveur, et ce
   * champ-ci est LOCAL : il ne décide d'aucune capture, d'aucun classement et
   * d'aucune saison, et l'écran le dit.
   *
   * ⚠️ NE PAS LE CONFONDRE AVEC `users.city_id` (23/07/2026). Ce commentaire
   * affirmait que `users.city_id` « n'est alimenté par aucun chemin de code » :
   * c'est FAUX depuis que `ingest_run/ensureHomeCity` l'écrit, en service-role,
   * à partir de la zone RÉELLEMENT courue (point-in-polygon serveur), et
   * seulement quand la colonne est encore NULL. Autrement dit : la ville
   * d'attache serveur se DÉDUIT d'un fait GPS, elle ne se DÉCLARE pas ici. Ce
   * champ local n'y touche toujours pas — c'est délibéré, une préférence
   * d'affichage n'a pas à décider d'un classement.
   */
  cityId: string;
  /** Bio courte (une ligne ou deux, anti-shame — jamais imposée). */
  bio: string;
  /** Couleur de l'avatar hexagonal (token charte, cf. AVATAR_COLORS). */
  avatarColor: string;
  /**
   * PHOTO DE PROFIL — URI de l'image choisie par le joueur. Vide = avatar généré
   * (initiales + couleur). Les DEUX sont des choix de première classe : un
   * visage pour ceux qui veulent l'être, le pseudo pour ceux qui veulent rester
   * anonymes. Rien ne pousse vers l'un ou l'autre.
   *
   * PORTÉE ACTUELLE — LOCALE. L'URI pointe vers une copie de l'image dans le
   * sandbox de l'app (documentDirectory) : elle n'est envoyée NULLE PART, donc
   * elle n'est visible que par le propriétaire du téléphone. L'UI doit le dire
   * (« l'app ne ment jamais ») et ne jamais laisser croire que les autres
   * joueurs la voient. Ce qui reste à câbler pour la rendre publique est
   * documenté dans `avatarPhoto.ts`.
   */
  avatarUri: string;
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
 * chartreuse servent d'accents ; les carbones de fonds sobres. Les labels sont
 * des Entries i18n — résolus à l'affichage (a11y du sélecteur de couleur).
 */
export const AVATAR_COLORS: readonly { key: string; value: string; label: Entry }[] = [
  { key: 'chartreuse', value: '#B4FF0D', label: C.avatarChartreuse },
  { key: 'blanc', value: '#FAFAF7', label: C.avatarIvory },
  { key: 'carbone2', value: '#1D201B', label: C.avatarCarbon },
  { key: 'gris', value: '#8A8F84', label: C.avatarGrey },
  { key: 'noir', value: '#0A0B09', label: C.avatarNight },
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
 * ce qui a été touché ; le reste retombe sur la base NEUTRE).
 */
export type ProfileOverrides = Partial<EditableProfile>;

const STORAGE_KEY = 'gryd.social.profile.v1';

/** Profil FUSIONNÉ : base + champs dérivés + overrides du joueur. */
export interface MergedProfile extends EditableProfile {
  /** Nom du crew — chaîne VIDE quand le joueur n'en a pas (jamais un crew inventé). */
  crewName: string;
  crewTag: string;
  /** Rang de saison, ou `null` tant que le serveur n'en a pas renvoyé un. */
  seasonRank: number | null;
  seasonScope: string;
  formeScore: number;
  crewChestContribPct: number;
  friendsCount: number;
  xp: number;
}

/**
 * ─── POURQUOI LA BASE EST NEUTRE (21/07/2026) ───────────────────────────────
 * `MY_SOCIAL_PROFILE` (social/demo.ts) est le persona de démonstration KORO :
 * titre « Tenace du 19ᵉ », ville « Paris », crew « LES FOULÉES 9³ », rang #8,
 * 14 amis.
 *
 * AVANT, il servait de base à TOUT LE MONDE. Un vrai joueur qui n'avait pas
 * encore édité son profil se voyait donc attribuer le titre, la ville et le crew
 * de quelqu'un d'autre — et l'écran Profil affichait « Niveau 3 · Paris » à un
 * coureur de Ouville-la-Rivière, exactement le bug remonté du terrain.
 * (Le nom et le @handle avaient déjà été corrigés ; le reste du persona non.)
 *
 * MAINTENANT (mode vitrine ABANDONNÉ, 21/07/2026) : il n'y a plus qu'UNE base, et
 * elle est NEUTRE — champs vides, aucun crew, aucun rang. L'écran affiche ce qui
 * est vrai, ou invite à le renseigner.
 */
const NEUTRAL_BASE = {
  title: '',
  city: '',
  crewName: '',
  crewTag: '',
  seasonRank: null,
  seasonScope: '',
  formeScore: 0,
  crewChestContribPct: 0,
  friendsCount: 0,
  xp: 0,
} as const;

/**
 * Valeurs éditables par défaut : les champs d'identité sont VIDES. Le formulaire
 * /profil-edit préremplit donc avec du blanc à compléter, jamais avec l'identité
 * d'un persona (le joueur croirait avoir déjà un profil).
 */
export function defaultEditable(): EditableProfile {
  return {
    displayName: '',
    handle: '',
    title: NEUTRAL_BASE.title,
    city: NEUTRAL_BASE.city,
    cityId: '',
    bio: '',
    avatarColor: DEFAULT_AVATAR_COLOR,
    avatarInitials: '',
    avatarUri: '',
    featuredBadgeIds: [],
  };
}

/**
 * Fusionne overrides stockés + base neutre → profil complet affiché. PURE.
 *
 * Les champs NON éditables (crew, rang, score forme, XP) ne viennent PAS d'ici :
 * ce store ne connaît que ce que le joueur a tapé. Ils restent donc à leur valeur
 * neutre, et les écrans lisent les vrais (useMyEconomy, useRealCrew) — un profil
 * n'invente jamais un crew ni un rang.
 */
export function mergeProfile(overrides: ProfileOverrides): MergedProfile {
  return {
    ...defaultEditable(),
    ...overrides,
    crewName: NEUTRAL_BASE.crewName,
    crewTag: NEUTRAL_BASE.crewTag,
    seasonRank: NEUTRAL_BASE.seasonRank,
    seasonScope: NEUTRAL_BASE.seasonScope,
    formeScore: NEUTRAL_BASE.formeScore,
    crewChestContribPct: NEUTRAL_BASE.crewChestContribPct,
    friendsCount: NEUTRAL_BASE.friendsCount,
    xp: NEUTRAL_BASE.xp,
  };
}

/** Initiale(s) effectives affichées : override manuel, sinon 1re lettre du nom. */
export function effectiveInitials(p: Pick<EditableProfile, 'avatarInitials' | 'displayName'>): string {
  const forced = p.avatarInitials.trim();
  if (forced.length > 0) return forced.slice(0, 2).toUpperCase();
  return (p.displayName.trim().charAt(0) || '?').toUpperCase();
}

/** Valide un @handle (regex figée base). Renvoie null si OK, sinon un message
 *  déjà traduit (locale courante — résolu à l'appel, donc au render). */
export function validateHandle(handle: string): string | null {
  if (handle.length === 0) return t(C.handleRequired);
  if (!HANDLE_REGEX.test(handle)) {
    return t(C.handleInvalid);
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
    loadPromise = readOverrides()
      .then((o) => {
        overrides = o;
        loaded = true;
        emit();
      })
      .catch(() => {
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
}

/** RAZ des overrides persistés (utilitaire démo / tests). */
export async function resetProfile(): Promise<void> {
  overrides = {};
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
  const { session } = useSession();
  const save = useCallback(saveProfile, []);
  const merged = mergeProfile(current);
  // La base d'identité est VIDE : on ne laisse jamais un nom ou un @handle blanc
  // à l'écran. On dérive de la session quand elle existe (nom du compte / préfixe
  // e-mail), sinon un neutre traduit (« Coureur »/@coureur) — jamais un persona.
  const id = sessionIdentity(session);
  const profile = {
    ...merged,
    ...(current.displayName ? {} : { displayName: id.displayName }),
    ...(current.handle ? {} : { handle: id.handle }),
  };
  return {
    profile,
    editable: { ...defaultEditable(), ...current },
    loading: !loaded,
    save,
  };
}
