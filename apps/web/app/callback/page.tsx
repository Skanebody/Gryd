'use client';

/**
 * GRYD — https://gryd.run/callback : l'arrivée du lien de connexion.
 *
 * ── LE DÉFAUT CORRIGÉ (retour fondateur du 12/09/2026) ──────────────────────
 * « Le bouton pour s'inscrire mène vers rien du tout ; il faudrait simplement
 * qu'appuyer sur le lien dise félicitations, vous êtes inscrit. » La cause
 * était exacte et technique : le lien de l'e-mail visait `gryd://callback`, un
 * schéma PRIVÉ. Un client mail, un webmail ou un Mac ne savent pas l'ouvrir —
 * le clic ne produisait littéralement rien, pas même une erreur. Le lien vise
 * maintenant CETTE page : elle félicite, puis rend la session à l'app.
 *
 * ── LES TROIS CHEMINS, DU MEILLEUR AU PIRE ──────────────────────────────────
 *  ① iPhone où GRYD est installé : le LIEN UNIVERSEL ouvre l'app directement,
 *    sans que cette page soit peinte (iOS lit `/.well-known/apple-app-site-
 *    association`, servi par ce même site). Aucun clic.
 *    ⚠ Tant que `apps/mobile/app.json` ne déclare pas `associatedDomains`
 *    (gabarit `_universal_links_o10`) et qu'un build ne l'embarque pas, ce
 *    chemin N'EST PAS actif : c'est le chemin ② qui joue, et c'est pour ça que
 *    le bouton existe.
 *  ② navigateur du téléphone, app installée : la page s'affiche, le bouton
 *    chartreuse ouvre `gryd://callback#…` et l'app reçoit la session.
 *  ③ ordinateur, ou téléphone sans l'app : la page félicite quand même (le
 *    compte EXISTE, il vient d'être créé côté serveur) et dit où continuer.
 *
 * ── CE QUE CETTE PAGE NE FAIT PAS ───────────────────────────────────────────
 *  · ELLE N'OUVRE PAS `gryd://` TOUTE SEULE. Une redirection automatique vers
 *    un schéma privé produit une alerte système (« Safari ne peut pas ouvrir la
 *    page ») partout où l'app n'est pas là : sur un Mac, dans un webmail, dans
 *    un navigateur intégré. On propose, on n'impose pas.
 *  · ELLE NE PROPOSE PAS L'APP STORE. GRYD n'y est pas publié (aucune adresse
 *    `apps.apple.com/…/gryd` n'existe dans le dépôt) : un bouton « Télécharger »
 *    serait un bouton mort, et MASTER §12 l'interdit.
 *  · ELLE NE JOURNALISE RIEN. Le fragment porte des jetons de session : aucun
 *    `console.log`, aucun analytics, aucun envoi. Le `noindex` est posé par
 *    `layout.tsx` pour la même raison.
 *  · ELLE NE DÉCIDE RIEN ELLE-MÊME. Le verdict vient de
 *    `readAuthCallbackLink2026` (PUR, 14 tests joués par `npm run test:web`).
 *
 * ── LES CINQ ÉTATS, ET LE SIXIÈME ───────────────────────────────────────────
 * inscription · retour · expiré · refusé · incomplet, plus l'état EN COURS du
 * tout premier rendu : le HTML statique est produit au build, où `window`
 * n'existe pas, donc le lien n'est lu qu'au montage. Cet état-là dure un
 * battement de cil, mais il est nommé plutôt que déguisé en réussite (L8/L14).
 * Sans JavaScript il ne se résoudrait jamais : le `<noscript>` le remplace
 * alors par une phrase vraie, au lieu d'une attente éternelle.
 */
import { useEffect, useState } from 'react';
import {
  readAuthCallbackLink2026,
  type AuthCallbackLinkView,
} from '../../lib/authCallbackLink2026';
import styles from './callback.module.css';

/** Ce que l'écran a le droit d'afficher, par verdict. Aucun texte ailleurs. */
const C = {
  kicker: 'Connexion GRYD',
  pending: 'Lecture de ton lien.',
  noscript:
    "Cette page a besoin de JavaScript pour lire ton lien. Ouvre GRYD et redemande un lien de connexion.",
  open: 'Ouvrir GRYD',
  subtitle: "Ouvre l'app pour continuer.",
  notInstalled:
    "GRYD n'est pas encore installé sur cet appareil ? Ouvre ce lien sur ton téléphone où GRYD est installé.",
  signup: 'Félicitations, ton compte GRYD est créé.',
  back: 'Bon retour sur GRYD.',
  expired: 'Ce lien a expiré.',
  expiredBody: 'Ouvre GRYD et demande un nouveau lien.',
  failed: "Ce lien n'a pas pu être validé.",
  failedBody: 'Ouvre GRYD et redemande un lien de connexion.',
  incomplete: 'Ce lien est incomplet.',
  incompleteBody: 'Ouvre GRYD et redemande un lien.',
} as const;

function titleOf(kind: AuthCallbackLinkView['kind']): string {
  switch (kind) {
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

export default function CallbackPage() {
  // `null` = pas encore lu. Pas « vide », pas « échoué » : les deux seraient des
  // verdicts prononcés avant d'avoir regardé (même défaut que celui corrigé le
  // 10/09 dans l'écran de retour natif).
  const [view, setView] = useState<AuthCallbackLinkView | null>(null);

  useEffect(() => {
    setView(
      readAuthCallbackLink2026({
        hash: window.location.hash,
        search: window.location.search,
      }),
    );
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

        {view === null ? (
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
            <h1 className={styles.title}>{titleOf(view.kind)}</h1>
            <p className={styles.body}>{bodyOf(view.kind)}</p>

            {view.appUrl !== null && (
              <>
                <a className={styles.cta} href={view.appUrl}>
                  {C.open}
                </a>
                <p className={styles.note}>{C.notInstalled}</p>
              </>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
