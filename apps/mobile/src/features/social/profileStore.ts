/**
 * GRYD 2026 — authenticated identity read and saved through owner-scoped RPCs.
 * Local v1 data stays on disk and is never silently adopted or uploaded.
 * Private avatar URLs are short-lived; all asynchronous results are bound to
 * the current account epoch. Guest data uses its own separate storage key.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { socialRpc2026, uploadSocialImage2026 } from './social2026Data';
import { supabase } from '../../lib/supabase';
import { resultOwnerEpoch2026, isResultOwnerCurrent2026, subscribeResultOwner2026 } from '../run/resultOwner2026';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import { colors, HANDLE_REGEX } from '@klaim/shared';
import type { Entry } from '../../i18n/types';
import { t } from '../../i18n/store';
import { C } from '../../i18n/catalog/profil';
import { useSession } from '../../lib/session';
import { fallbackIdentity } from './playerHandle';

/**
 * Identité lisible dérivée de la SESSION (vrai user O1) : nom du compte, sinon
 * préfixe e-mail, sinon un neutre « Joueur » (traduit via le catalogue i18n).
 * Sert à NE PAS présenter le persona démo « KORO »/@koro à un vrai utilisateur
 * qui n'a pas encore édité son profil (le back `user_profiles` n'est pas
 * branché — TODO O1). Dépend de la locale courante (résolue à l'appel).
 *
 * ─── 26/07/2026 : « COUREUR » N'EST PAS UN MOT POUR UN JOUEUR ───────────────
 * Le repli s'appelait « Coureur »/« Läufer » alors que le vélo est une
 * discipline réelle — et le @handle de repli, littéral français « coureur »,
 * était codé EN DUR ici. Nom et pseudo se corrigent d'un seul tenant : la
 * dérivation vit désormais dans `playerHandle.ts` (fonction PURE + tests Deno),
 * qui documente ce que ce repli est vraiment (un affichage, jamais persisté,
 * jamais envoyé au serveur) et pourquoi « Läufer » y produisait « lufer ».
 */
function sessionIdentity(session: Session | null): { displayName: string; handle: string } {
  const meta = (session?.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
  return fallbackIdentity({
    accountName: meta.full_name || meta.name,
    emailPrefix: session?.user?.email?.split('@')[0],
    fallbackName: t(C.defaultPlayerName),
  });
}

/** Champs du profil que le joueur peut éditer (le reste est dérivé/serveur). */
export interface EditableProfile {
  avatarPath?: string | null;
  visibility?: 'private' | 'friends' | 'crew' | 'public';
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
  { key: 'chartreuse', value: colors.chartreuse, label: C.avatarChartreuse },
  { key: 'blanc', value: '#FAFAF7', label: C.avatarIvory },
  { key: 'carbone2', value: '#1D201B', label: C.avatarCarbon },
  { key: 'gris', value: '#8A8F84', label: C.avatarGrey },
  { key: 'noir', value: '#0A0B09', label: C.avatarNight },
];

/** Couleur d'avatar par défaut (1re de la palette — accent chartreuse charte). */
const DEFAULT_AVATAR_COLOR = AVATAR_COLORS[0]?.value ?? colors.chartreuse;

/**
 * Nombre exact de badges mis en avant sur la card (AMENDEMENT-17 : 3, pas plus).
 *
 * ⚠ LA VALEUR N'EST PLUS ICI (28/07/2026). Ce plafond décide d'une ISSUE
 * D'ÉCRAN — la troisième branche de `AJOUTER AU PROFIL` sur E63/E64, « vitrine
 * pleine » — donc c'est une règle de jeu, et « aucun nombre magique hors
 * game-rules » s'applique. Elle vit désormais dans
 * `packages/shared/src/game-rules.ts` (`FEATURED_BADGE_COUNT`), d'où le web et
 * les Edge Functions peuvent la lire aussi.
 *
 * La ré-exportation est délibérée : les dix appelants existants
 * (`app/profil-edit.tsx`, `features/badges/BadgeUnlockMoment.tsx`) importent ce
 * module et n'ont pas à être touchés. Il n'existe qu'UNE valeur, pas deux.
 */
export { FEATURED_BADGE_COUNT } from '@klaim/shared';

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

// The unscoped v1 store is deliberately retained on disk, never adopted.
const STORAGE_PREFIX = 'gryd.social.profile.v2026.';

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

type ProfileRead = { owner: string; epoch:number; profile: ProfileOverrides; status: 'ready'|'failed' };
export interface ProfileStore {
  profile: MergedProfile;
  editable: EditableProfile;
  loading: boolean;
  failed: boolean;
  save: (patch: ProfileOverrides) => Promise<void>;
  reload: () => void;
}
const listeners = new Set<() => void>();
function notifyProfile(){ for(const callback of listeners)callback(); }
// Compatibility entry point: callers must name the owner. There is no global
// profile mutation capable of writing another account's displayed identity.
export async function saveProfile(patch: ProfileOverrides, owner?: string): Promise<void> {
  if(!owner)throw new Error('authentication_required');
  const epoch=resultOwnerEpoch2026();if(!isResultOwnerCurrent2026(owner,epoch))throw new Error('session_changed');
  let avatarPath=patch.avatarPath??null;
  if(patch.avatarUri && !patch.avatarUri.startsWith('https://')) avatarPath=await uploadSocialImage2026(owner,patch.avatarUri,'avatar',epoch);
  const result=await socialRpc2026<{ownerId:string;profile:ProfileOverrides|null}>(owner,'save_my_social_profile_2026',{p_profile:{...patch,avatarPath}},epoch);
  if(result.ownerId!==owner)throw new Error('session_changed');
  await AsyncStorage.setItem(STORAGE_PREFIX+owner,JSON.stringify(result.profile??{}));
  if(!isResultOwnerCurrent2026(owner,epoch))throw new Error('session_changed');notifyProfile();
}
export async function resetProfile():Promise<void>{
  // Only the device guest profile can be reset without a named account.
  await AsyncStorage.removeItem(STORAGE_PREFIX+'guest');notifyProfile();
}
export function useMyProfile(): ProfileStore {
  const {session,loading:restoring}=useSession();const owner=session?.user.id??'guest';const epoch=useSyncExternalStore(subscribeResultOwner2026,resultOwnerEpoch2026,resultOwnerEpoch2026);
  const current=useRef(owner);current.current=owner;
  const [read,setRead]=useState<ProfileRead|null>(null);const [tick,setTick]=useState(0);
  const reload=useCallback(()=>setTick(n=>n+1),[]);
  useEffect(()=>{listeners.add(reload);return()=>{listeners.delete(reload)}},[reload]);
  useEffect(()=>{
    if(restoring)return;let cancelled=false;
    const load=async()=>{
      let profile:ProfileOverrides={};
      if(owner==='guest')profile=hydrate(await AsyncStorage.getItem(STORAGE_PREFIX+'guest'));
      else {
        const result=await socialRpc2026<{ownerId:string;profile:ProfileOverrides|null}>(owner,'my_social_profile_2026');
        if(result.ownerId!==owner)throw new Error('session_changed');profile=result.profile??{};
        // Private media is signed only for the authenticated reader, never a public URL.
        if(profile.avatarPath && supabase){const image=await supabase.storage.from('social-2026').createSignedUrl(profile.avatarPath,120);profile={...profile,avatarUri:image.error?'':image.data.signedUrl};}
      }
      if(!cancelled&&current.current===owner&&isResultOwnerCurrent2026(owner==='guest'?null:owner,epoch))setRead({owner,epoch,profile,status:'ready'});
    };
    void load().catch(()=>{if(!cancelled&&current.current===owner&&isResultOwnerCurrent2026(owner==='guest'?null:owner,epoch))setRead({owner,epoch,profile:{},status:'failed'});});
    const timer=setInterval(reload,90000);return()=>{cancelled=true;clearInterval(timer)};
  },[owner,epoch,restoring,tick,reload]);
  const own=!restoring&&read?.owner===owner&&read?.epoch===epoch?read:null;
  const edited=own?.profile??{};const identity=sessionIdentity(session);
  const save=useCallback(async(patch:ProfileOverrides)=>{
    if(current.current!==owner||owner==='guest')throw new Error('authentication_required');
    await saveProfile(patch,owner);
  },[owner]);
  return {profile:mergeProfile({...edited,displayName:edited.displayName||identity.displayName,handle:edited.handle||identity.handle}),editable:{...defaultEditable(),...edited},loading:!own,failed:own?.status==='failed',save,reload};
}
