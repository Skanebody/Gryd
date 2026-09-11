/**
 * GRYD — `404.html`, ET LE ROUTEUR DES LIENS PARTAGÉS (lot W3).
 *
 * Cahier de contenu §2.2 et §3.9.
 *
 * ─── POURQUOI UNE 404 FAIT LE ROUTAGE ───────────────────────────────────────
 * `/c/<code>/`, `/r/<code>/` et `/u/<pseudo>/` sont déclarées dans
 * `apple-app-site-association` : sur un iPhone où Gryd est installé, iOS remet
 * ces adresses à l'app, et cette page n'est JAMAIS chargée. Elle n'existe que
 * pour qui n'a pas l'app. Or un export statique ne peut pas pré-générer une page
 * par code inconnu, et GitHub Pages n'offre ni réécriture ni redirection 301.
 * La seule voie est donc celle-ci : `out/404.html`, que Pages sert pour toute
 * adresse inconnue, lit `location.pathname` et peint le bon écran.
 *
 * Deux conséquences, assumées et écrites : ces trois adresses répondent en
 * HTTP 404 (donc `noindex`, zéro référencement, et c'est sans importance
 * puisqu'elles ne valent que pour une personne précise), et sans JavaScript
 * elles ne se résolvent pas (le `<noscript>` le DIT et renvoie vers
 * `/telecharger/` plutôt que de laisser une page muette).
 *
 * ─── COMMENT LE BASCULEMENT ÉVITE L'HYDRATATION, ET POURQUOI IL LE DOIT ─────
 * Les quatre écrans sont dans le HTML. Le script ne touche QUE deux choses que
 * React ne gère pas :
 *   1. un attribut `data-gryd-link` sur `<html>` — React ne reprend jamais un
 *      attribut qu'il n'a pas écrit (même technique que les scripts de thème) ;
 *   2. le contenu de deux conteneurs rendus avec `dangerouslySetInnerHTML`,
 *      que React traite comme OPAQUES et n'hydrate pas.
 * Un `hidden` basculé sur un nœud rendu par React, ou un texte injecté dans un
 * nœud qu'il hydrate, seraient l'un et l'autre repris à l'hydratation : le
 * bouton « Ouvrir Gryd » disparaîtrait une fraction de seconde après être
 * apparu. C'est la seule raison de cette gymnastique.
 *
 * ─── CE QUE CES ÉCRANS N'AFFICHENT PAS ──────────────────────────────────────
 * Aucun nom de crew, aucun blason, aucun nombre de membres, aucune ville : la
 * page ne lit RIEN du serveur, et rien de tout cela n'est dans l'URL. Le profil
 * ne certifie pas non plus qu'un compte existe : il dit où MÈNE le lien. Un code
 * qui ne ressemble pas à un code (caractères inattendus, longueur absurde) rend
 * la vraie 404, plutôt que d'afficher une invitation pour une adresse tapée au
 * hasard.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { CtaButton, PhotoFigure, SiteFooter, SiteHeader } from '../components/ui';
import cta from '../components/ui/CtaButton.module.css';
import {
  APP_SCHEME,
  DEEP_LINK_ORDER,
  DEEP_LINK_PAGES,
  NOT_FOUND_COPY,
  NO_APP_LINK,
  OPEN_APP_LABEL,
} from '../lib/deepLinkCopy2026';
import { SITE_PHOTOS } from '../lib/photos2026';
import styles from './sitePages.module.css';

/** Les classes de l'écran, par clef. Le CSS ne peut pas les composer tout seul. */
const SCREEN_CLASS: Record<string, string> = {
  crew: styles.crewScreen ?? '',
  referral: styles.referralScreen ?? '',
  profile: styles.profileScreen ?? '',
};

/**
 * LE ROUTEUR. Vanilla, sans dépendance, sans appel réseau, exécuté à l'analyse
 * de la page pour qu'aucun écran ne clignote avant le bon.
 *
 * Le code est VALIDÉ avant d'être affiché ou recollé dans une adresse
 * `gryd://` : il vient d'une URL, donc d'un inconnu. Il n'est jamais écrit en
 * HTML (`createTextNode`), jamais concaténé sans `encodeURIComponent`, et un
 * code qui ne passe pas le filtre laisse la vraie 404 en place.
 */
const ROUTER_SCRIPT = `(function () {
  var routes = ${JSON.stringify(
    DEEP_LINK_ORDER.map((key) => ({ key, prefix: DEEP_LINK_PAGES[key].prefix, host: DEEP_LINK_PAGES[key].host })),
  )};
  var scheme = ${JSON.stringify(APP_SCHEME)};
  var openClass = ${JSON.stringify(`${cta.base ?? ''} ${cta.primary ?? ''}`)};
  var openLabel = ${JSON.stringify(OPEN_APP_LABEL)};
  var valid = /^[A-Za-z0-9_-]{1,64}$/;
  var path = window.location.pathname;
  var found = null;
  for (var i = 0; i < routes.length; i++) {
    var route = routes[i];
    if (path.indexOf(route.prefix) !== 0) continue;
    var segment = path.slice(route.prefix.length).replace(/\\/+$/, '');
    var code = '';
    try { code = decodeURIComponent(segment); } catch (error) { code = ''; }
    if (valid.test(code)) found = { route: route, code: code };
    break;
  }
  if (!found) return;
  document.documentElement.setAttribute('data-gryd-link', found.route.key);
  var fill = function () {
    var holder = document.querySelector('[data-gryd-open="' + found.route.host + '"]');
    if (holder && !holder.firstChild) {
      var link = document.createElement('a');
      link.className = openClass;
      link.href = scheme + '://' + found.route.host + '/' + encodeURIComponent(found.code);
      link.appendChild(document.createTextNode(openLabel));
      holder.appendChild(link);
    }
    var slots = document.querySelectorAll('[data-gryd-code], [data-gryd-handle]');
    for (var s = 0; s < slots.length; s++) {
      var slot = slots[s];
      if (slot.firstChild) continue;
      var tag = document.createElement('code');
      var prefix = slot.hasAttribute('data-gryd-handle') ? '@' : '';
      tag.appendChild(document.createTextNode(prefix + found.code));
      slot.appendChild(tag);
    }
  };
  fill();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fill);
})();`;

/**
 * Le titre est NEUTRE parce qu'un seul document sert quatre écrans : « Page
 * introuvable » serait faux devant une invitation valide, et le nom d'un crew
 * serait une information que cette page ne possède pas.
 *
 * `robots` est posé ICI et non dans le JSX : le gabarit racine déclare
 * `index: true`, et une balise écrite à la main s'y AJOUTERAIT au lieu de la
 * remplacer. Un document avec « noindex » et « index » dans le même `<head>` est
 * une consigne contradictoire donnée à un moteur.
 */
export const metadata: Metadata = {
  title: 'Gryd',
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />

      <main id="contenu" className="grydContainer">
        {/* ── La vraie 404. Visible tant qu'aucun préfixe n'est reconnu. ── */}
        <section className={`${styles.landing} ${styles.notFoundScreen}`}>
          <h1 className={styles.landingTitle}>{NOT_FOUND_COPY.title}</h1>
          <p className={styles.prose}>{NOT_FOUND_COPY.body}</p>
          <div className={styles.landingActions}>
            {/* L'accueil est l'action PRINCIPALE d'une 404 : c'est la seule
                chose qu'on veuille vraiment faire depuis une adresse qui
                n'existe pas. En contour, elle avait le poids exact de l'action
                collante de l'en-tête, et deux actions de même poids n'en font
                aucune (L2, verdict `ux-gate` du 12/09). */}
            <CtaButton href={NOT_FOUND_COPY.home.href} variant="primary">
              {NOT_FOUND_COPY.home.label}
            </CtaButton>
            <CtaButton href={NOT_FOUND_COPY.download.href} variant="link">
              {NOT_FOUND_COPY.download.label}
            </CtaButton>
          </div>
          <noscript>
            <p className={styles.prose}>
              {NOT_FOUND_COPY.noscript} <Link href={NO_APP_LINK.href}>{NO_APP_LINK.label}</Link>
            </p>
          </noscript>
        </section>

        {/* ── Les trois arrivées de lien partagé. ── */}
        {DEEP_LINK_ORDER.map((key) => {
          const page = DEEP_LINK_PAGES[key];
          return (
            <section
              key={key}
              className={`${styles.landing} ${styles.linkScreen} ${SCREEN_CLASS[key] ?? ''}`}
            >
              {/* Un `<h1>` par écran : quatre dans le document, un seul visible.
                  Les trois autres sont en `display: none`, donc hors de l'arbre
                  d'accessibilité. Un `<h2>` ferait de l'écran affiché une
                  sous-partie d'un titre que personne ne voit. */}
              <h1 className={styles.landingTitle}>{page.title}</h1>

              {/* Le profil affiche le pseudo tel qu'il est dans l'adresse, et
                  rien de plus : le web ne sait pas si ce compte existe. */}
              {key === 'profile' ? <p className={styles.landingHandle} data-gryd-handle dangerouslySetInnerHTML={{ __html: '' }} /> : null}

              <p className={styles.prose}>{page.body}</p>
              {'extra' in page && page.extra ? <p className={styles.prose}>{page.extra}</p> : null}

              <div className={styles.landingActions}>
                {/* Conteneur OPAQUE : le bouton `gryd://…` est fabriqué par le
                    routeur, parce que son adresse dépend du code. Sans script,
                    il n'existe pas du tout, donc il n'y a jamais de bouton mort. */}
                <div data-gryd-open={page.host} dangerouslySetInnerHTML={{ __html: '' }} />
                <CtaButton href={NO_APP_LINK.href} variant="outline">
                  {NO_APP_LINK.label}
                </CtaButton>
              </div>

              {'codeNote' in page && page.codeNote ? (
                <p className={styles.landingCode}>
                  {page.codeNote.before} <span data-gryd-code dangerouslySetInnerHTML={{ __html: '' }} />{' '}
                  {page.codeNote.after}
                </p>
              ) : null}

              {'photo' in page && page.photo ? (
                <div className={styles.landingPhoto}>
                  <PhotoFigure photo={SITE_PHOTOS[page.photo]} ratio="wide" sizes="(min-width: 640px) 544px, 100vw" />
                </div>
              ) : null}
            </section>
          );
        })}
      </main>

      <SiteFooter />

      {/* Le routeur est posé APRÈS les écrans : il les trouve déjà dans le DOM,
          et il garde malgré tout un repli sur `DOMContentLoaded`. */}
      <script dangerouslySetInnerHTML={{ __html: ROUTER_SCRIPT }} />
    </>
  );
}
