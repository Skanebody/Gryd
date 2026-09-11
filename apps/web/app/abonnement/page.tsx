/**
 * GRYD — `/abonnement/`, UNE REDIRECTION ET RIEN D'AUTRE (lot W3).
 *
 * ─── CE QUI VIVAIT ICI, ET POURQUOI IL EST MORT ─────────────────────────────
 * Cette adresse vendait « GRYD Club » (un abonnement) et le « Founder Pack à
 * vie » (un achat unique), avec une monnaie de style et une grille de prix. Le
 * cahier de contenu du 12/09/2026 déclare les trois MORTS : l'offre s'appelle
 * `GRYD+`, il n'y a ni monnaie virtuelle (`COMMERCIAL_PROPOSAL_2026`
 * `.virtualCurrency = false`) ni offre à vie, et les CGV corrigées le 11/09 en
 * dépendent. La page n'était donc plus seulement démodée : elle était opposable.
 *
 * ─── POURQUOI UNE PAGE, ET PAS UNE VRAIE 301 ────────────────────────────────
 * L'export statique de GitHub Pages ne sert aucun en-tête personnalisé : il n'y
 * a ni 301, ni règle de réécriture. La seule redirection possible est donc
 * CÔTÉ CLIENT, et elle tient en deux choses qui fonctionnent même l'une sans
 * l'autre :
 *   1. `<meta http-equiv="refresh" content="0; url=/gryd-plus/">`, honoré par
 *      tous les navigateurs, y compris sans JavaScript ;
 *   2. un LIEN visible, pour le cas où le `refresh` est bloqué (certains
 *      lecteurs, certaines extensions) : sans lui, la page serait un cul-de-sac.
 * `redirect()` de Next n'est pas une option : il exige un serveur, et le site
 * n'en a pas.
 *
 * ─── ET POURQUOI GARDER L'ADRESSE DU TOUT ───────────────────────────────────
 * Elle a circulé. La supprimer enverrait ces liens sur le 404 ; la rediriger
 * mène à la page qui dit la vérité sur l'offre. Elle reste `noindex` : un moteur
 * n'a aucune raison de proposer une redirection, et `robots.txt` la refuse en
 * plus.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { OFFER } from '../../lib/facts2026';
import { SITE_ORIGIN } from '../../lib/site2026';
import styles from '../sitePages.module.css';

const DESTINATION = '/gryd-plus/';

export const metadata: Metadata = {
  title: `${OFFER}`,
  description: `Cette page a déménagé : ${OFFER} se lit désormais sur ${SITE_ORIGIN}${DESTINATION}`,
  robots: { index: false, follow: false },
  alternates: { canonical: `${SITE_ORIGIN}${DESTINATION}` },
};

export default function AbonnementRedirectPage() {
  return (
    <>
      {/* React hisse cette balise dans le `<head>` du document exporté. */}
      <meta httpEquiv="refresh" content={`0; url=${DESTINATION}`} />

      <main id="contenu" className="grydContainer">
        <div className={styles.landing}>
          <h1 className={styles.landingTitle}>Cette page a déménagé</h1>
          <p className={styles.prose}>
            L’offre {OFFER} se lit maintenant sur sa propre page. Tu y es emmené tout de suite.
          </p>
          <p className={styles.landingActions}>
            <Link href={DESTINATION}>Voir {OFFER}</Link>
          </p>
        </div>
      </main>
    </>
  );
}
