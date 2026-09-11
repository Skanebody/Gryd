/**
 * GRYD — LE REGISTRE DE LA COPIE DU SITE (lot W3).
 *
 * Une seule liste : toutes les pages publiques, leur adresse, leur titre et leur
 * description de référencement, et l'objet de copie complet de chacune.
 *
 * ─── POURQUOI UN REGISTRE, ET PAS HUIT FICHIERS ISOLÉS ──────────────────────
 * Trois choses ne se vérifient que sur l'ENSEMBLE :
 *   · qu'aucune page n'a oublié son titre ou sa description, ni ne dépasse les
 *     plafonds d'affichage des moteurs ;
 *   · qu'aucune page n'est absente du plan (`sitemap.xml`, `lib/site2026.ts`) ;
 *   · que la charte d'écriture (§4 du cahier de contenu) tient sur TOUTES les
 *     phrases du site, pas seulement sur celles de l'accueil.
 * `siteCopy2026.test.ts` les relit à chaque `npm run gate`.
 *
 * Ce fichier ne contient AUCUNE phrase : il agrège. La copie vit dans les
 * modules `…Copy2026.ts`, un par page, qui citent leur section du cahier.
 */
import { CREWS_COPY } from './crewsCopy2026';
import { DEEP_LINK_PAGES, NOT_FOUND_COPY } from './deepLinkCopy2026';
import { DOWNLOAD_COPY } from './downloadCopy2026';
import { FAQ_COPY } from './faqCopy2026';
import { GUIDE_COPY } from './guideCopy2026';
import { HOME_COPY } from './homeCopy2026';
import { LEGAL_SEO_LIST } from './legalSeo2026';
import { OFFER_COPY } from './offerCopy2026';
import { PRIVACY_COPY } from './privacyCopy2026';
import { SAISON_COPY } from './saisonCopy2026';

export interface SeoCopy {
  readonly title: string;
  readonly description: string;
}

export interface SitePage {
  /** L'adresse publique, SLASH FINAL compris (`trailingSlash: true`). */
  readonly path: string;
  readonly seo: SeoCopy;
  /** L'objet de copie de la page. Le test le parcourt phrase par phrase. */
  readonly copy: unknown;
  /**
   * Priorité dans `sitemap.xml`. L'accueil mène, le guide et la sortie suivent :
   * ce sont les trois pages qu'un moteur doit proposer en premier.
   */
  readonly priority: string;
}

/**
 * LES NEUF PAGES INDEXÉES. Les quatre pages légales n'y figurent pas avec une
 * copie (leur texte est contractuel et vit dans leur page, inchangé depuis le
 * 11/09) mais elles SONT au plan : `LEGAL_PATHS` les porte.
 */
export const SITE_PAGES: readonly SitePage[] = [
  { path: '/', seo: HOME_COPY.seo, copy: HOME_COPY, priority: '1.0' },
  { path: '/comment-ca-marche/', seo: GUIDE_COPY.seo, copy: GUIDE_COPY, priority: '0.9' },
  { path: '/crews/', seo: CREWS_COPY.seo, copy: CREWS_COPY, priority: '0.8' },
  { path: '/saison/', seo: SAISON_COPY.seo, copy: SAISON_COPY, priority: '0.8' },
  { path: '/gryd-plus/', seo: OFFER_COPY.seo, copy: OFFER_COPY, priority: '0.7' },
  { path: '/securite-et-vie-privee/', seo: PRIVACY_COPY.seo, copy: PRIVACY_COPY, priority: '0.8' },
  { path: '/faq/', seo: FAQ_COPY.seo, copy: FAQ_COPY, priority: '0.7' },
  { path: '/telecharger/', seo: DOWNLOAD_COPY.seo, copy: DOWNLOAD_COPY, priority: '0.9' },
] as const;

/**
 * LES QUATRE PAGES LÉGALES. Indexées, sans copie éditoriale de ce lot : leur
 * TEXTE est contractuel et n'a pas bougé. Seules leurs métadonnées de
 * référencement sont ici, parce qu'elles ne sont pas des clauses mais ce qu'un
 * moteur affiche à leur place, et qu'elles doivent donc tenir les mêmes règles
 * que les huit autres pages.
 */
export const LEGAL_PAGES: readonly SitePage[] = LEGAL_SEO_LIST.map((page) => ({
  path: page.path,
  seo: { title: page.title, description: page.description },
  copy: { title: page.title, description: page.description },
  priority: '0.5',
}));

export const LEGAL_PATHS: readonly string[] = LEGAL_SEO_LIST.map((page) => page.path);

/**
 * LES PAGES QUI NE SONT DANS AUCUN PLAN, ET C'EST VOULU.
 *  · `/callback/` porte des jetons dans son fragment (`noindex, nofollow`) ;
 *  · `/404.html` est une erreur, pas une page ;
 *  · `/abonnement/` est une REDIRECTION vers `/gryd-plus/` : l'ancienne page
 *    vendait « GRYD Club » et le « Founder Pack », déclarés morts par le cahier
 *    de contenu. Elle reste servie parce que son adresse a circulé, mais elle ne
 *    doit surtout pas être proposée par un moteur.
 */
export const EXCLUDED_FROM_SITEMAP: readonly string[] = ['/callback/', '/404.html', '/abonnement/'] as const;

/**
 * Plafonds d'affichage des moteurs. Ce ne sont pas des règles de jeu : ce sont
 * les largeurs au delà desquelles un résultat est TRONQUÉ, donc le point où une
 * description cesse de se lire. Le cahier de contenu compte déjà chaque titre et
 * chaque description ; ces bornes vérifient qu'aucune ne dérive ensuite.
 */
export const SEO_TITLE_MAX = 60;
export const SEO_DESCRIPTION_MAX = 160;

/** La copie des trois pages d'arrivée et de la vraie 404, pour la relecture. */
export const OFF_PLAN_COPY = { deepLinks: DEEP_LINK_PAGES, notFound: NOT_FOUND_COPY } as const;

/**
 * Les clefs qui ne portent PAS de prose, et que la relecture saute.
 *
 * `rule` est le chemin de la constante source (« TERRITORY_RULES_2026.run…. ») :
 * il vit dans un attribut `data-rule`, jamais à l'écran. Le relire comme une
 * phrase ferait tomber la règle des chiffres sur son propre millésime.
 */
const NON_PROSE_KEYS = new Set(['rule', 'href', 'prefix', 'host', 'photo']);

/**
 * Toutes les chaînes d'un objet de copie, à plat. Le test les relit une par
 * une ; les pages, elles, lisent leurs clefs.
 */
export function copyStrings(node: unknown): string[] {
  const found: string[] = [];
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      found.push(value);
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (typeof value === 'object' && value !== null) {
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (NON_PROSE_KEYS.has(key)) continue;
        walk(item);
      }
    }
  };
  walk(node);
  return found;
}
