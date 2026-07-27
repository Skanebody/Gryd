/**
 * GRYD — LA LECTURE du profil minimal (E08), et rien d'autre.
 *
 * La DÉCISION est ailleurs et elle est pure (`firstRun.ts`, testée sous Deno).
 * Ce module ne fait que ce que ce module-là ne peut pas faire : parler au
 * serveur, et partager le verdict entre les composants qui en dépendent.
 *
 * ─── UN SEUL ÉTAT, PARTAGÉ (et pas un `useState` par écran) ─────────────────
 * Deux surfaces lisent ce verdict : la garde de `app/(tabs)/_layout.tsx` (qui
 * route) et, après E08, l'écran lui-même (qui le POSE sans re-interroger le
 * serveur). Un état local par composant aurait produit une requête par montage
 * et, pire, deux verdicts divergents pendant quelques centaines de
 * millisecondes — le temps qu'il faut pour rediriger un joueur au mauvais
 * endroit. Le store est donc un module, les composants s'y abonnent.
 *
 * ─── CE QU'IL NE FAIT PAS ───────────────────────────────────────────────────
 * · Il n'ÉCRIT rien. `app/setup/profile.tsx` reste seul à écrire dans
 *   `user_profiles` ; il se contente d'appeler `markMinimalProfileDone()` une
 *   fois l'écriture SERVEUR acquittée. C'est un fait constaté, pas une
 *   supposition optimiste : sans acquittement, la fonction n'est pas appelée.
 * · Il ne PERSISTE rien sur le disque. Un cache local du verdict serait
 *   exactement le drapeau devinable que ce chantier refuse : le seul juge est la
 *   table (voir l'entête de `firstRun.ts`).
 * · Il ne lit que `user_id` — jamais le @handle, jamais le nom. La garde de
 *   route n'a besoin que de l'EXISTENCE de la ligne, et une requête ne doit
 *   ramener que ce dont elle a besoin.
 */
import { useEffect, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import {
  PROFILE_READ_TIMEOUT_MS,
  classifyProfileRead,
  type MinimalProfileProbe,
  shouldStartRead,
} from './firstRun';

/** Compte auquel se rapporte `probe`. `null` = aucune session connue. */
let ownerId: string | null = null;
let probe: MinimalProfileProbe = 'idle';
let inFlight = false;

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function setProbe(next: MinimalProfileProbe): void {
  if (probe === next) return;
  probe = next;
  emit();
}

/**
 * Change de compte : tout ce qu'on savait du précédent est caduc. Appelé aussi
 * à la déconnexion (`userId === null`), sans quoi le verdict du compte sortant
 * ferait passer le compte suivant pour configuré.
 */
function setOwner(userId: string | null): void {
  if (userId === ownerId) return;
  ownerId = userId;
  inFlight = false;
  probe = 'idle';
  emit();
}

/**
 * Le profil minimal vient d'être ÉCRIT et le serveur l'a acquitté. Évite un
 * aller-retour immédiat après E08 — et surtout la fenêtre pendant laquelle la
 * garde de route relirait « absent » à cause d'un cache PostgREST ou d'une
 * latence de réplication, et renverrait le joueur dans le formulaire qu'il vient
 * de valider.
 */
export function markMinimalProfileDone(userId: string): void {
  ownerId = userId;
  inFlight = false;
  setProbe('present');
}

/**
 * LA REQUÊTE. Une seule ligne, une seule colonne, bornée dans le temps.
 *
 * `maybeSingle()` distingue proprement « aucune ligne » (data null, error null)
 * de « erreur » — c'est exactement la frontière que `classifyProfileRead` juge.
 * Le plafond de patience est armé ICI parce que `supabase-js` n'en a aucun :
 * une socket ouverte qui ne répond jamais tiendrait la garde sur `'reading'`,
 * donc le joueur sur l'écran E00, indéfiniment.
 */
async function readOnce(userId: string): Promise<MinimalProfileProbe> {
  const client = supabase;
  if (!client) return 'unknown';

  const query = (async () => {
    const { data, error } = await client
      .from('user_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .maybeSingle();
    // Un refus RLS ou une panne réseau ne dit RIEN de l'existence de la ligne.
    if (error) return classifyProfileRead({ failed: true, rowFound: false });
    return classifyProfileRead({ failed: false, rowFound: data !== null });
  })();

  let timer: ReturnType<typeof setTimeout> | undefined;
  const bail = new Promise<MinimalProfileProbe>((resolve) => {
    timer = setTimeout(() => resolve('unknown'), PROFILE_READ_TIMEOUT_MS);
  });

  try {
    return await Promise.race([query, bail]);
  } catch {
    // `supabase-js` peut rejeter (transport, JSON illisible) : c'est un échec de
    // lecture, jamais une absence de ligne.
    return 'unknown';
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Lance une lecture SI la règle pure l'autorise. Ne relit jamais une réponse
 * déjà obtenue (`present` / `absent`) ; retente en revanche `unknown`, qui est
 * une panne et pas un verdict.
 */
function startRead(userId: string | null): void {
  if (userId === null) return;
  const go = shouldStartRead({
    configured: isSupabaseConfigured,
    hasSession: true,
    inFlight,
    profile: probe,
  });
  if (!go) return;
  inFlight = true;
  setProbe('reading');
  void readOnce(userId).then((next) => {
    // Le joueur a pu se déconnecter / changer de compte pendant la requête : le
    // verdict d'un compte ne doit jamais atterrir sur un autre.
    if (ownerId !== userId) return;
    inFlight = false;
    setProbe(next);
  });
}

/**
 * CE QUE LE STORE SAIT DÈS LE PREMIER RENDU, avant tout effet.
 *
 * ⚠️ Ce n'est pas un détail de perf, c'est LE point qui évite un mensonge. Si ce
 * premier rendu répondait `'idle'`, `decideFirstRun` rendrait `'app'` : la carte
 * se peindrait pendant une frame, puis la lecture démarrerait (effet), puis la
 * garde renverrait vers E08. Le joueur aurait vu le produit une fraction de
 * seconde avant d'être renvoyé dans l'inscription — le pendant exact du « flash
 * de l'écran de connexion » que E00 interdit.
 *
 * On annonce donc `'reading'` dès que la lecture est CERTAINE de partir. C'est
 * vrai au sens strict : l'effet qui suit ce rendu la lance, et rien ne peut
 * l'annuler entre les deux.
 */
function snapshotFor(userId: string | null): MinimalProfileProbe {
  // Compte que le store ne connaît pas encore : rien n'a été lu pour lui.
  if (ownerId !== userId) {
    return userId !== null && isSupabaseConfigured ? 'reading' : 'idle';
  }
  const willRead = shouldStartRead({
    configured: isSupabaseConfigured,
    hasSession: userId !== null,
    inFlight,
    profile: probe,
  });
  return willRead ? 'reading' : probe;
}

/**
 * Abonnement du store à l'état du profil minimal du compte `userId`.
 *
 * Retourne la sonde telle quelle : c'est `decideFirstRun` (pur) qui en tire une
 * destination — ce hook ne décide de rien.
 *
 * REPRISE AU RETOUR AU PREMIER PLAN : une lecture qui a échoué (`'unknown'`)
 * reste une question ouverte. Le retour d'avant-plan est le seul signal de
 * reconnexion disponible sans nouvelle dépendance (`netinfo` n'est pas dans le
 * projet, et on n'en ajoute pas une pour ça) — c'est le même arbitrage que
 * `app/_layout.tsx` pour le renvoi des courses restées hors ligne. Sur une
 * réponse déjà obtenue, `shouldStartRead` rend `false` : ce déclencheur ne coûte
 * alors rien.
 */
export function useMinimalProfile(userId: string | null): MinimalProfileProbe {
  // On ne COPIE pas le verdict dans un état local : on le RELIT à chaque rendu
  // (`snapshotFor`). Une copie serait périmée d'un rendu à chaque fois que
  // `userId` change, et c'est précisément le rendu où la garde décide.
  const [, bump] = useState(0);

  useEffect(() => {
    const sync = () => bump((n) => n + 1);
    listeners.add(sync);
    setOwner(userId);
    startRead(userId);
    return () => {
      listeners.delete(sync);
    };
  }, [userId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') startRead(userId);
    });
    return () => sub.remove();
  }, [userId]);

  return snapshotFor(userId);
}

/**
 * Remise à zéro — réservée aux tests manuels et à un éventuel « changer de
 * compte » futur. Exportée plutôt que laissée en variable de module pour que
 * personne ne soit tenté de manipuler `probe` de l'extérieur.
 */
export function resetMinimalProfileProbe(): void {
  setOwner(null);
}
