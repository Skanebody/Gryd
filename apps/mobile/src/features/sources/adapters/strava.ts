/**
 * GRYD — adaptateur Strava (AMENDEMENT-15 §3, référence complète prêt-à-clés).
 * OAuth via expo-auth-session (stack imposée, déjà en deps) : le client id
 * vient de EXPO_PUBLIC_STRAVA_CLIENT_ID (O7, jamais en dur). Le code
 * d'autorisation part vers l'edge function `strava_import` qui échange le
 * token (secret côté Supabase), importe les activités récentes dans
 * `imported_activities` (service-role, dédup Activity Hub) et renvoie le
 * refresh token — stocké UNIQUEMENT sur l'appareil (AsyncStorage), jamais en
 * base. Sans clés : statut `needs_keys` honnête, CTA inactif, zéro friction.
 * Zéro position live : seules des activités TERMINÉES transitent, côté serveur.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthRequest, makeRedirectUri, ResponseType } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '../../../lib/supabase';
import type { SourceAdapter, SourceAdapterSnapshot } from './types';

// Ferme proprement la popup OAuth au retour dans l'app (scheme "gryd", app.json).
WebBrowser.maybeCompleteAuthSession();

/**
 * Clé AsyncStorage de la liaison Strava locale (token appareil uniquement).
 * TODO O7 (au branchement des clés Strava) : migrer ce stockage vers
 * expo-secure-store (chiffré OS — Keychain/Keystore), fallback AsyncStorage
 * sur web. Pas de dépendance ajoutée tant que les clés n'existent pas
 * (DISCOVERY O7 — pas de lib sans besoin actif).
 */
const STORAGE_KEY = 'gryd.sources.strava';

/** Liaison persistée sur l'appareil après une connexion réussie. */
interface StravaLink {
  refreshToken: string;
  athleteId?: number;
  lastSync: string; // ISO de la dernière synchro strava_import réussie
}

/** Réponse (succès) de l'edge function strava_import. */
interface StravaImportResponse {
  connected: boolean;
  refreshToken?: string;
  athleteId?: number;
  lastSync?: string;
}

/**
 * Endpoint d'autorisation : Strava recommande /oauth/mobile/authorize sur
 * appareil (ouvre l'app Strava si installée) et /oauth/authorize sur web.
 */
const AUTHORIZE_ENDPOINT = Platform.OS === 'web'
  ? 'https://www.strava.com/oauth/authorize'
  : 'https://www.strava.com/oauth/mobile/authorize';

async function readLink(): Promise<StravaLink | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StravaLink;
    return typeof parsed.refreshToken === 'string' ? parsed : null;
  } catch {
    return null; // stockage illisible = non connecté (jamais bloquant, GO-first)
  }
}

/** Snapshot standard quand la connexion est faisable mais pas encore faite. */
const DISCONNECTED: SourceAdapterSnapshot = {
  status: 'disconnected',
  lastSync: null,
};

/** O7 absent : clés Strava à créer par le fondateur (strava.com/settings/api). */
const NEEDS_KEYS: SourceAdapterSnapshot = {
  status: 'needs_keys',
  lastSync: null,
  detail: 'Clés Strava à configurer (O7)',
};

/**
 * Appelle strava_import (échange code→token OU refresh) et persiste la liaison.
 * Toute erreur → snapshot honnête, jamais d'exception vers l'UI.
 */
async function importVia(
  body: { code: string; redirectUri: string } | { refreshToken: string },
): Promise<SourceAdapterSnapshot> {
  if (!supabase) {
    return { ...NEEDS_KEYS, detail: 'Backend non configuré (O1)' };
  }
  const { data, error } = await supabase.functions.invoke('strava_import', { body });
  if (error) {
    // 503 = configuration_required (STRAVA_CLIENT_SECRET absent côté Supabase, O7).
    const status = (error as { context?: { status?: number } }).context?.status;
    if (status === 503) return NEEDS_KEYS;
    return { ...DISCONNECTED, detail: 'Connexion impossible — réessaie plus tard' };
  }
  const res = data as StravaImportResponse | null;
  if (!res?.connected || !res.refreshToken) {
    return { ...DISCONNECTED, detail: 'Connexion impossible — réessaie plus tard' };
  }
  const link: StravaLink = {
    refreshToken: res.refreshToken,
    athleteId: res.athleteId,
    lastSync: res.lastSync ?? new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(link));
  } catch {
    // Stockage plein/illisible : l'import a RÉUSSI (activités en base), seule
    // la liaison locale ne survivra pas au redémarrage — jamais d'exception
    // vers l'UI (garantie AMENDEMENT-15 §3), le statut reste honnête.
  }
  return { status: 'connected', lastSync: link.lastSync };
}

export const stravaAdapter: SourceAdapter = {
  id: 'strava',
  trustLevel: 'medium', // import → vérification requise (catalog AMENDEMENT-10 §6)

  async status(): Promise<SourceAdapterSnapshot> {
    if (!process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID) return NEEDS_KEYS;
    const link = await readLink();
    if (!link) return DISCONNECTED;
    return { status: 'connected', lastSync: link.lastSync };
  },

  async connect(): Promise<SourceAdapterSnapshot> {
    const clientId = process.env.EXPO_PUBLIC_STRAVA_CLIENT_ID;
    if (!clientId) return NEEDS_KEYS;

    const redirectUri = makeRedirectUri({ scheme: 'gryd' });
    const request = new AuthRequest({
      clientId,
      // activity:read suffit (courses publiques + followers) ; pas de write.
      scopes: ['activity:read'],
      redirectUri,
      responseType: ResponseType.Code,
      usePKCE: false, // Strava ne supporte pas PKCE : le secret reste serveur
      extraParams: { approval_prompt: 'auto' },
    });

    // promptAsync peut REJETER (navigateur indisponible, scheme mal câblé…) :
    // jamais d'exception vers l'UI (garantie AMENDEMENT-15 §3) → snapshot honnête.
    const result = await request
      .promptAsync({ authorizationEndpoint: AUTHORIZE_ENDPOINT })
      .catch(() => null);
    if (result === null) {
      return { ...DISCONNECTED, detail: 'Connexion impossible — réessaie plus tard' };
    }
    if (result.type === 'cancel' || result.type === 'dismiss') {
      // Refus = jamais bloquant (GO-first) : on reste proprement déconnecté.
      return DISCONNECTED;
    }
    if (result.type !== 'success' || !result.params['code']) {
      return { ...DISCONNECTED, detail: 'Connexion impossible — réessaie plus tard' };
    }
    return importVia({ code: result.params['code'], redirectUri });
  },

  async disconnect(): Promise<SourceAdapterSnapshot> {
    // Oubli local du token appareil. (Révocation complète côté Strava :
    // strava.com/settings/apps — lien affiché dans le Hub si besoin, V1.)
    await AsyncStorage.removeItem(STORAGE_KEY);
    return DISCONNECTED;
  },

  async sync(): Promise<SourceAdapterSnapshot> {
    const link = await readLink();
    if (!link) return this.status();
    return importVia({ refreshToken: link.refreshToken });
  },
};
