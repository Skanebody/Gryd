'use client';

/**
 * GRYD — https://gryd.run/callback : l'arrivée du lien de connexion.
 *
 * ── LA DEMANDE DU FONDATEUR, MOT POUR MOT (12/09/2026) ──────────────────────
 * « vas juste vers une page qui dit que ça a été bien validé mais derrière il
 * faut que le compte fonctionne dans l'application ».
 *
 * ── CE QUI MANQUAIT À E4, ET QUI N'ÉTAIT PAS UN DÉFAUT DE CETTE PAGE ────────
 * E4 a fait viser au lien de l'e-mail cette adresse-ci, en misant sur le LIEN
 * UNIVERSEL : iOS lit `apple-app-site-association`, reconnaît le domaine, et
 * remet l'adresse à l'app sans que cette page ne se peigne. Le raisonnement
 * tenait, et il tient toujours — à une condition qu'aucune ligne de code ne
 * peut remplir : que le build installé déclare `associatedDomains`, ce qui
 * suppose la capacité Apple « Associated Domains » sur le profil de signature.
 * Elle n'y est pas (build `fe030292` ERRORED). Donc, sur un vrai iPhone,
 * aujourd'hui : Safari s'ouvre, cette page se peint, et le bouton « Ouvrir
 * GRYD » est le seul chemin — inexistant sur un ordinateur, incertain dans le
 * navigateur intégré d'un webmail.
 *
 * ── CE QUE LA PAGE FAIT MAINTENANT (E5) ─────────────────────────────────────
 * Quand l'adresse porte un NONCE (`?n=…`, écrit par l'app dans sa propre
 * demande de lien) :
 *   ① `verifyOtp({ token_hash, type })` — la page vérifie, et obtient une
 *      VRAIE session. Elle consomme donc le haché, ce que E4 s'interdisait ;
 *   ② `auth_handoff_deposit_2026` — elle dépose son jeton de rafraîchissement
 *      contre `sha256(nonce)` (migration 0198). Cinq minutes, un seul usage ;
 *   ③ `signOut({ scope: 'local' })` — le navigateur ne garde RIEN. Aucune
 *      session ne survit à cet onglet, aucun jeton n'est écrit sur le disque
 *      (`persistSession: false`) ;
 *   ④ elle dit « C'est validé. », et l'app, restée sur « Lien envoyé »,
 *      réclame le jeton et se connecte toute seule.
 *
 * ── ET SANS NONCE, RIEN NE CHANGE ───────────────────────────────────────────
 * Un lien parti AVANT ce lot n'en porte pas : la page ne vérifie alors RIEN et
 * se comporte mot pour mot comme en E4 (le verdict vient de
 * `readAuthCallbackLink2026`, et le bouton `gryd://callback?token_hash=…` est
 * rendu intact). Casser ces liens-là pour installer le nouveau chemin, ce
 * serait casser des courriers déjà dans des boîtes mail.
 *
 * ── CE QUE CETTE PAGE NE FAIT TOUJOURS PAS ──────────────────────────────────
 *  · ELLE N'OUVRE PAS `gryd://` TOUTE SEULE. Une redirection automatique vers
 *    un schéma privé produit une alerte système partout où l'app n'est pas là.
 *  · ELLE NE PROPOSE PAS L'APP STORE. GRYD n'y est pas publié : un bouton
 *    « Télécharger » serait un bouton mort, et MASTER §12 l'interdit.
 *  · ELLE NE JOURNALISE RIEN. L'adresse porte un haché ET un nonce : aucun
 *    `console.log`, aucun analytics, aucun envoi. `layout.tsx` pose le
 *    `noindex` pour la même raison, et l'adresse est NETTOYÉE de l'historique
 *    (`history.replaceState`) dès qu'elle a été lue.
 *  · ELLE NE DÉCIDE RIEN ELLE-MÊME. Le plan vient de `handoffPlan2026`, le
 *    verdict de repli de `readAuthCallbackLink2026` — tous deux PURS et testés
 *    par `npm run test:web`.
 *
 * ── LES ÉTATS, ET AUCUN NE SE DÉGUISE EN UN AUTRE (L8 / L14) ────────────────
 * lecture · validation en cours · validé · validé mais la remise a échoué ·
 * expiré · refusé · les six verdicts E4. Le tout premier rendu est un état
 * NOMMÉ : le HTML statique est produit au build, où `window` n'existe pas.
 * Sans JavaScript il ne se résoudrait jamais : le `<noscript>` le remplace
 * alors par une phrase vraie, au lieu d'une attente éternelle.
 */
import { useEffect, useRef, useState } from 'react';
import {
  readAuthCallbackLink2026,
  type AuthCallbackLinkView,
} from '../../lib/authCallbackLink2026';
import {
  handoffCleanUrl2026,
  handoffFailureKind2026,
  handoffIsNewAccount2026,
  handoffPlan2026,
} from '../../lib/authHandoff2026';
import styles from './callback.module.css';

/** Ce que l'écran a le droit d'afficher, par état. Aucun texte ailleurs. */
const C = {
  kicker: 'Connexion Gryd',
  pending: 'Lecture de ton lien.',
  noscript:
    "Cette page a besoin de JavaScript pour lire ton lien. Ouvre Gryd et redemande un lien de connexion.",
  open: 'Ouvrir Gryd',
  subtitle: "Ouvre l'app pour continuer.",
  notInstalled:
    "Gryd n'est pas encore installé sur cet appareil ? Ouvre ce lien sur ton téléphone où Gryd est installé.",
  tokenHash: 'Ton lien de connexion est prêt.',
  tokenHashBody: "C'est Gryd qui le valide. Ouvre l'app pour te connecter.",
  signup: 'Félicitations, ton compte Gryd est créé.',
  back: 'Bon retour sur Gryd.',
  expired: 'Ce lien a expiré.',
  expiredBody: 'Ouvre Gryd et demande un nouveau lien.',
  failed: "Ce lien n'a pas pu être validé.",
  failedBody: 'Ouvre Gryd et redemande un lien de connexion.',
  incomplete: 'Ce lien est incomplet.',
  incompleteBody: 'Ouvre Gryd et redemande un lien.',

  // ── E5 ────────────────────────────────────────────────────────────────────
  /** Pendant l'aller-retour serveur. Nommé, jamais déguisé en réussite. */
  working: 'On valide ton lien.',
  workingBody: 'Un instant, le serveur répond.',
  /** LA phrase que le fondateur a demandée, mot pour mot. */
  validated: "C'est validé.",
  /** Compte NEUF, et seulement lui : c'est le serveur qui l'a dit (`type=signup`). */
  validatedFresh: 'Félicitations, ton compte est créé.',
  /** Avec l'adresse réellement confirmée par le serveur. */
  validatedBody: (email: string) =>
    `Ton compte Gryd est confirmé pour ${email}. Retourne dans l'app : tu es connecté.`,
  /** Sans adresse lisible : on ne fabrique pas celle qu'on n'a pas. */
  validatedBodyNoEmail:
    "Ton compte Gryd est confirmé. Retourne dans l'app : tu es connecté.",
  /**
   * LE DEMI-SUCCÈS, DIT COMME TEL. Le lien a bien confirmé le compte, mais la
   * remise vers l'app n'a pas abouti (réseau, base indisponible). Annoncer
   * « tu es connecté » serait faux, et renvoyer vers un bouton serait pire : le
   * haché est consommé, il ne servira plus.
   */
  validatedNoHandoff: 'Ton compte Gryd est confirmé.',
  validatedNoHandoffBody:
    "La connexion automatique n'a pas abouti. Ouvre Gryd et demande un nouveau lien : il te connectera.",
} as const;

function titleOf(kind: AuthCallbackLinkView['kind']): string {
  switch (kind) {
    case 'token_hash':
      return C.tokenHash;
    case 'signup':
      return C.signup;
    case 'return':
      return C.back;
    case 'expired':
      return C.expired;
    case 'failed':
      return C.failed;
    case 'incomplete':
      return C.incomplete;
  }
}

function bodyOf(kind: AuthCallbackLinkView['kind']): string {
  switch (kind) {
    case 'token_hash':
      return C.tokenHashBody;
    case 'signup':
    case 'return':
      return C.subtitle;
    case 'expired':
      return C.expiredBody;
    case 'failed':
      return C.failedBody;
    case 'incomplete':
      return C.incompleteBody;
  }
}

/**
 * L'ÉTAT DE LA PAGE. `null` = pas encore lu — pas « vide », pas « échoué » :
 * les deux seraient des verdicts prononcés avant d'avoir regardé.
 */
type Screen =
  /** Aucun nonce : comportement E4, inchangé. */
  | { readonly phase: 'link'; readonly view: AuthCallbackLinkView }
  /** L'aller-retour serveur est en cours. */
  | { readonly phase: 'working' }
  /** Vérifié ET remis à l'app. `fresh` vient du `type` écrit par le serveur. */
  | { readonly phase: 'validated'; readonly fresh: boolean; readonly email: string | null }
  /** Vérifié, mais la remise n'a pas abouti. Ni réussite, ni échec du lien. */
  | { readonly phase: 'validated_no_handoff' }
  /** Le serveur a refusé le haché. Deux motifs, deux phrases. */
  | { readonly phase: 'expired' }
  | { readonly phase: 'failed' };

export default function CallbackPage() {
  const [screen, setScreen] = useState<Screen | null>(null);
  /**
   * UN SEUL PASSAGE, ET C'EST VITAL. Un haché ne sert qu'UNE fois : deux
   * `verifyOtp` sur la même adresse feraient échouer le second, et cette page
   * annoncerait un lien mort alors qu'elle venait elle-même de le consommer.
   * React peut monter/démonter/remonter un effet (mode strict en
   * développement) — cette garde ne se discute pas.
   */
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const location = { hash: window.location.hash, search: window.location.search };
    const plan = handoffPlan2026(location);

    /**
     * L'ADRESSE EST NETTOYÉE DÈS QU'ELLE EST LUE — avant même l'appel réseau.
     * Elle porte un haché à usage unique et un nonce de remise : les laisser
     * dans la barre d'adresse, c'est les laisser dans l'historique, dans une
     * capture d'écran, dans un « partager cette page ». `replaceState` ne
     * recharge rien et n'ajoute aucune entrée.
     */
    try {
      window.history.replaceState(null, '', handoffCleanUrl2026(window.location.pathname));
    } catch {
      // Contexte qui refuse l'API (vieux navigateur, `about:` exotique) : on
      // continue. Le nettoyage est une précaution, pas une condition.
    }

    if (plan.mode === 'link') {
      setScreen({ phase: 'link', view: plan.view });
      return;
    }

    // Clés PUBLIQUES par design (anon + RLS), inlinées au build par Next —
    // exactement celles de la waitlist (`lib/waitlistJoin.ts`), pas une
    // seconde configuration à tenir.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      // Sans client, on ne peut RIEN vérifier — et c'est une chance : le haché
      // est encore intact, donc le parcours E4 reste entièrement valable.
      setScreen({ phase: 'link', view: readAuthCallbackLink2026(location) });
      return;
    }

    setScreen({ phase: 'working' });

    void (async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        /**
         * ─── TROIS OPTIONS, ET CHACUNE RETIRE QUELQUE CHOSE ────────────────
         * `persistSession: false`  — rien n'est écrit dans le stockage du
         *   navigateur. La session vit dans cette page, et meurt avec elle ;
         * `autoRefreshToken: false` — sans lui, le SDK pourrait rafraîchir le
         *   jeton en arrière-plan et INVALIDER celui qu'on vient de déposer
         *   (la rotation des jetons est active sur le projet) ;
         * `detectSessionInUrl: false` — c'est CE code qui lit l'adresse, une
         *   fois, au moment choisi. Laisser le SDK la consommer à sa guise
         *   reviendrait à brûler le haché avant d'avoir lu le nonce.
         */
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        });

        const verified = await supabase.auth.verifyOtp({
          token_hash: plan.tokenHash,
          type: plan.type,
        });
        if (verified.error || !verified.data.session) {
          setScreen({
            phase: handoffFailureKind2026(verified.error?.message) === 'expired'
              ? 'expired'
              : 'failed',
          });
          return;
        }

        const session = verified.data.session;
        const email = typeof session.user.email === 'string' && session.user.email.length > 0
          ? session.user.email
          : null;

        // LE DÉPÔT. `p_callback_type` permet à l'app de dire « Félicitations »
        // sur la foi du SERVEUR, et jamais d'une supposition d'écran.
        const deposited = await supabase.rpc('auth_handoff_deposit_2026', {
          p_nonce: plan.nonce,
          p_refresh_token: session.refresh_token,
          p_callback_type: plan.type,
        });

        // LE NAVIGATEUR NE GARDE RIEN. `scope: 'local'` ne révoque PAS le jeton
        // côté serveur — ce serait précisément détruire ce qu'on vient de
        // déposer pour l'app. Il efface la session de CE client, et c'est tout
        // ce qu'on veut.
        try {
          await supabase.auth.signOut({ scope: 'local' });
        } catch {
          // `persistSession: false` : il n'y avait rien à effacer sur le disque.
        }

        if (deposited.error || deposited.data !== true) {
          setScreen({ phase: 'validated_no_handoff' });
          return;
        }
        setScreen({ phase: 'validated', fresh: handoffIsNewAccount2026(plan.type), email });
      } catch {
        // Réseau coupé, import du SDK refusé : on ne sait pas si le haché a été
        // consommé. On ne promet donc rien, et on ne dit pas « expiré » non plus.
        setScreen({ phase: 'failed' });
      }
    })();
  }, []);

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.brand}>
          {/* Marque du site : le même SVG inline que SiteHeader et Footer. */}
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
            <polygon points="12,1.5 21,6.75 21,17.25 12,22.5 3,17.25 3,6.75" fill="var(--ch)" />
          </svg>
          GRYD
        </p>

        {screen === null ? (
          <>
            <p className={styles.pending}>{C.pending}</p>
            {/*
              Sans JavaScript, l'état « en cours » ci-dessus ne se résoudrait
              jamais : la règle de style le retire et la phrase le remplace.
              `dangerouslySetInnerHTML` est ici le seul moyen d'obtenir une
              balise `<style>` réellement à l'intérieur du `<noscript>`.
            */}
            <noscript
              dangerouslySetInnerHTML={{
                __html:
                  `<style>.${styles.pending}{display:none}</style>` +
                  `<p class="${styles.body}">${C.noscript}</p>`,
              }}
            />
          </>
        ) : (
          <div className={styles.result} aria-live="polite">
            <p className={styles.kicker}>{C.kicker}</p>

            {screen.phase === 'working' ? (
              <>
                <h1 className={styles.title}>{C.working}</h1>
                <p className={styles.working}>
                  <span className={styles.pulse} aria-hidden="true" />
                  {C.workingBody}
                </p>
              </>
            ) : screen.phase === 'validated' ? (
              <>
                <h1 className={styles.title}>{C.validated}</h1>
                {screen.fresh ? <p className={styles.lead}>{C.validatedFresh}</p> : null}
                <p className={styles.body}>
                  {screen.email === null ? C.validatedBodyNoEmail : C.validatedBody(screen.email)}
                </p>
              </>
            ) : screen.phase === 'validated_no_handoff' ? (
              <>
                <h1 className={styles.title}>{C.validatedNoHandoff}</h1>
                <p className={styles.body}>{C.validatedNoHandoffBody}</p>
              </>
            ) : screen.phase === 'expired' ? (
              <>
                <h1 className={styles.title}>{C.expired}</h1>
                <p className={styles.body}>{C.expiredBody}</p>
              </>
            ) : screen.phase === 'failed' ? (
              <>
                <h1 className={styles.title}>{C.failed}</h1>
                <p className={styles.body}>{C.failedBody}</p>
              </>
            ) : (
              <>
                <h1 className={styles.title}>{titleOf(screen.view.kind)}</h1>
                <p className={styles.body}>{bodyOf(screen.view.kind)}</p>
                {screen.view.appUrl !== null && (
                  <>
                    <a className={styles.cta} href={screen.view.appUrl}>
                      {C.open}
                    </a>
                    <p className={styles.note}>{C.notInstalled}</p>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
