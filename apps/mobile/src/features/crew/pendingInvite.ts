/**
 * GRYD — RÉCEPTION D'UNE INVITATION CREW + INTENTION DIFFÉRÉE (demande fondateur
 * 21/07/2026 : « le QR code doit aussi permettre à l'utilisateur de s'inscrire
 * s'il n'est pas encore inscrit »).
 *
 * Le QR/lien d'invite (features/crew/invite.ts) portait jusqu'ici une URL que
 * PERSONNE ne recevait : aucun `Linking.getInitialURL`, aucun listener `url`,
 * aucune route `/c/<code>`. Ce module est la moitié « réception » :
 *
 *   1. PARSING PUR — `parseInviteUrl` reconnaît `gryd://c/CODE` (scheme app.json,
 *      à nous, actif AUJOURD'HUI) et `https://gryd.run|gryd.app/c/CODE` (les deux
 *      hôtes, la décision de domaine étant en attente côté fondateur). Tout ce qui
 *      ne colle pas EXACTEMENT retourne `null` : on ne route jamais sur une entrée
 *      non validée (un deep link est une entrée hostile comme une autre).
 *   2. INTENTION EN ATTENTE — quand le scanneur n'est pas encore inscrit, on ne
 *      peut pas rejoindre : on MÉMORISE le code, on l'envoie s'inscrire, et on
 *      REPREND l'intention dès que la session existe. Expiration 24 h : une
 *      invitation vieille d'une semaine n'en est plus une (on ne fera jamais
 *      entrer quelqu'un dans un crew sur la foi d'un lien oublié).
 *   3. REPRISE APRÈS AUTH — `startPendingInviteWatcher` s'abonne LÀ OÙ la session
 *      devient réellement valide (`supabase.auth.onAuthStateChange`), pas dans un
 *      composant qui pourrait ne jamais monter (l'écran de sign-in se démonte au
 *      moment même où la session arrive).
 *
 * DOCTRINE : aucune décision d'adhésion ici. La seule autorité reste la RPC
 * `join_crew_by_code` (arbitrée serveur, refus typés). Ce module transporte un
 * code, il ne l'honore pas.
 *
 * ZÉRO-CRASH : stockage illisible/absent ⇒ « pas d'invitation », jamais une
 * exception. L'app doit démarrer même si AsyncStorage est mort.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { CREW_CODE_LENGTH } from '@klaim/shared';
import { EVENTS, track } from '../../lib/analytics';
import { supabase } from '../../lib/supabase';
import type { JoinResult } from './real';

const STORAGE_KEY = 'gryd.pendingInvite.v1';

/**
 * Durée de vie d'une intention. Au-delà, le lien n'a plus de sens : la personne
 * a fait autre chose entre-temps, et l'adhésion serait une surprise.
 */
export const PENDING_INVITE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Hôtes acceptés pour un lien web d'invite. Les DEUX sont reconnus tant que
 * l'arbitrage `gryd.app` vs `gryd.run` n'est pas rendu (point ouvert O10,
 * DISCOVERY.md) : le jour où le domaine existe, aucun code applicatif à toucher.
 */
export const INVITE_HOSTS = ['gryd.run', 'gryd.app'] as const;

// ─── Parsing PUR (testable, zéro import RN) ──────────────────────────────────

/**
 * `gryd://c/CODE` — le scheme natif déclaré dans app.json. Les slashes après le
 * scheme sont tolérants (`gryd://c/X` et `gryd:///c/X` circulent tous deux selon
 * l'OS et l'émetteur du lien).
 */
const DEEP_LINK_RE = /^gryd:\/*c\/([A-Za-z0-9]+)\/*(?:[?#].*)?$/i;

/**
 * `https://gryd.run/c/CODE` ou `https://gryd.app/c/CODE` (www toléré).
 *
 * CONSTRUITE DEPUIS `INVITE_HOSTS`, pas écrite en dur : la doc d'app.json promet
 * au futur mainteneur qu'il n'y aura QUE cette constante à toucher le jour de
 * l'arbitrage de domaine. Avec deux hôtes codés en dur dans la regex, éditer
 * `INVITE_HOSTS` n'aurait eu AUCUN effet sur le parsing réel — un piège
 * documenté à l'envers (relevé par la vérification adversariale). Les points
 * sont échappés : sans ça, `grydxrun` matcherait aussi.
 */
const WEB_LINK_RE = new RegExp(
  `^https?://(?:www\\.)?(?:${INVITE_HOSTS.map((h) => h.replace(/\./g, '\\.')).join('|')})/c/([A-Za-z0-9]+)/*(?:[?#].*)?$`,
  'i',
);

/**
 * Normalise un code d'invite : majuscules, A-Z0-9 uniquement, longueur EXACTE
 * `CREW_CODE_LENGTH` (aucun nombre magique — la constante vient de shared).
 * Retourne `null` dès que ça ne ressemble pas à un code : mieux vaut ne rien
 * faire que router sur une chaîne arbitraire venue de l'extérieur.
 */
export function normalizeInviteCode(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const clean = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.length === CREW_CODE_LENGTH ? clean : null;
}

/**
 * URL entrante → code crew valide, ou `null`. Seules les formes ci-dessus sont
 * acceptées : un `gryd://run/42`, un `https://gryd.run/blog`, un lien d'un autre
 * domaine ou un code de mauvaise longueur ne produisent AUCUNE navigation.
 */
export function parseInviteUrl(url: string | null | undefined): string | null {
  if (typeof url !== 'string' || url.length === 0) return null;
  const match = DEEP_LINK_RE.exec(url.trim()) ?? WEB_LINK_RE.exec(url.trim());
  if (!match) return null;
  return normalizeInviteCode(match[1]);
}

/** Une intention expire-t-elle ? (pur, testable sans horloge réelle). */
export function isInviteExpired(storedAt: number, now: number): boolean {
  if (!Number.isFinite(storedAt)) return true;
  const age = now - storedAt;
  // Une horloge qui recule (fuseau, réglage manuel) ⇒ on ne fait pas confiance.
  return age < 0 || age > PENDING_INVITE_TTL_MS;
}

// ─── Intention persistée (défensive de bout en bout) ─────────────────────────

interface StoredInvite {
  code: string;
  /** Epoch ms de la mise en attente (base de l'expiration 24 h). */
  at: number;
}

/** Lecture tolérante du JSON stocké : toute forme inattendue ⇒ `null`. */
function parseStored(raw: string | null): StoredInvite | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return null;
    const rec = value as Record<string, unknown>;
    const code = normalizeInviteCode(typeof rec.code === 'string' ? rec.code : null);
    const at = typeof rec.at === 'number' ? rec.at : NaN;
    if (!code || !Number.isFinite(at)) return null;
    return { code, at };
  } catch {
    return null;
  }
}

/**
 * Mémorise l'invitation du visiteur non connecté. Retourne `false` si le
 * stockage est indisponible — l'appelant continue quand même vers le sign-in
 * (la personne pourra toujours saisir le code à la main : jamais un cul-de-sac).
 */
export async function rememberPendingInvite(
  code: string,
  now: number = Date.now(),
): Promise<boolean> {
  const clean = normalizeInviteCode(code);
  if (!clean) return false;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ code: clean, at: now }));
    return true;
  } catch {
    return false;
  }
}

/** Efface l'intention (purge explicite — abandon, expiration, consommation). */
export async function clearPendingInvite(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // Stockage mort : rien à purger de toute façon.
  }
}

/**
 * Lecture + purge ATOMIQUE. Le code est retiré du stockage AVANT d'être rendu à
 * l'appelant, y compris quand il est expiré ou illisible : une invitation ne
 * doit jamais pouvoir être rejouée (deux reprises concurrentes ⇒ deux tentatives
 * d'adhésion, dont une refusée `already_in_crew` — un faux échec à l'écran).
 * Le verrou module couvre le cas « deux appels dans le même tick ».
 */
let consuming: Promise<string | null> | null = null;

export function consumePendingInvite(now: number = Date.now()): Promise<string | null> {
  if (consuming) return consuming;
  consuming = (async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      // Purge d'abord : même expiré/corrompu, ce slot ne doit plus exister.
      await clearPendingInvite();
      const stored = parseStored(raw);
      if (!stored) return null;
      if (isInviteExpired(stored.at, now)) return null;
      return stored.code;
    } catch {
      return null;
    } finally {
      consuming = null;
    }
  })();
  return consuming;
}

// ─── Reprise après authentification ──────────────────────────────────────────

/**
 * UNE seule tentative par lancement d'app. Un échec (réseau, crew complet,
 * cooldown) ne se rejoue pas en boucle : l'intention est déjà consommée, la
 * personne reste dans l'app et peut toujours saisir le code à la main sur
 * l'écran Crew. Silencieux par construction — on n'interrompt pas quelqu'un qui
 * vient d'entrer dans le jeu avec une erreur qu'il n'a pas provoquée.
 */
let resumeAttempted = false;

/** Remet le compteur à zéro (déconnexion, tests). */
export function resetInviteResumeGuard(): void {
  resumeAttempted = false;
}

/**
 * Reprend l'intention en attente : consomme le code, appelle la RPC arbitrée
 * serveur, et — en cas de succès — emmène la personne sur l'écran d'invitation
 * en état « Bienvenue dans {crew} ». C'est la demande exacte du fondateur :
 * l'app rejoint le crew ET LE DIT.
 *
 * L'`await` de la RPC laisse au passage le temps à la redirection post-sign-in
 * (`<Redirect href="/" />`) de se poser : on navigue APRÈS elle, jamais contre.
 */
export async function resumePendingInvite(): Promise<void> {
  if (resumeAttempted) return;
  resumeAttempted = true;
  const code = await consumePendingInvite();
  if (!code || !supabase) return;
  // ON RAMÈNE TOUJOURS LA PERSONNE À L'INVITATION — succès OU échec (correctif
  // adversarial). L'écran de sign-out promet mot à mot « dès que ton compte
  // existe, tu entres dans le crew » ; sortir en silence sur un refus (crew
  // complet, cooldown) ou un réseau mort laissait quelqu'un qui vient de créer
  // un compte POUR ce crew sans crew et sans explication. L'intention est déjà
  // consommée (purge atomique, jamais rejouée) : la seule issue honnête est de
  // rouvrir /c/[code], qui sait afficher l'état réel — y compris le refus exact.
  const backToInvite = (welcome?: string): void => {
    router.push({
      pathname: '/c/[code]',
      params: welcome === undefined ? { code } : { code, welcome },
    });
  };
  try {
    const { data, error } = await supabase.rpc('join_crew_by_code', { p_code: code });
    if (error) {
      backToInvite();
      return;
    }
    const result = data as JoinResult | null;
    if (!result || result.ok !== true) {
      // Refus typé : l'écran d'invitation le rejouera et affichera SON message
      // (cooldown avec les jours, crew complet…), jamais un « réessaie » opaque.
      backToInvite();
      return;
    }
    track(EVENTS.inviteAccepted, { via: 'deferred_signup' });
    track(EVENTS.crewJoined, { via: 'invite' });
    backToInvite(result.crew.name);
  } catch {
    // Réseau mort au pire moment : on montre quand même l'invitation, d'où le
    // code reste saisissable et l'adhésion réessayable d'un tap.
    backToInvite();
  }
}

/**
 * Branche la reprise LÀ OÙ la session devient réellement valide. Appelé une fois
 * depuis le layout racine (toujours monté) — surtout pas depuis un écran :
 * l'écran de sign-in est démonté par sa propre redirection à l'instant précis où
 * la session arrive, et un effet posé là ne s'exécuterait jamais.
 *
 * Retourne un désabonnement. Sans backend (O1), no-op.
 */
export function startPendingInviteWatcher(): () => void {
  if (!supabase) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
      resetInviteResumeGuard();
      return;
    }
    // SIGNED_IN (inscription/connexion qui vient d'aboutir) ET INITIAL_SESSION
    // (app relancée par le lien alors que la session était déjà restaurée) :
    // dans les deux cas la session est utilisable, donc l'intention est due.
    if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
      void resumePendingInvite();
    }
  });
  return () => data.subscription.unsubscribe();
}
