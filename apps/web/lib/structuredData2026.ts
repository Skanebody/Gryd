/**
 * GRYD — DONNÉES STRUCTURÉES (lot W2).
 *
 * Le cahier de contenu §3.10 en autorise TROIS blocs sur tout le site, pas un
 * de plus : `Organization` sur `/`, `FAQPage` sur `/faq/`, `SoftwareApplication`
 * sur `/telecharger/`. Ce lot pose le premier et l'outillage ; le lot pages pose
 * les deux autres avec les mêmes fonctions.
 *
 * ─── POURQUOI `Organization` N'EST PAS DANS LE GABARIT ──────────────────────
 * Le posant dans `app/layout.tsx`, il serait émis sur CHAQUE page : le site
 * porterait dix blocs `Organization` au lieu d'un, et la règle « trois blocs,
 * pas un de plus » tomberait au premier `next build`. Il est donc rendu par
 * `app/page.tsx`, la seule page qui le déclare.
 *
 * ─── CE QUI EST ABSENT, ET C'EST VOULU ──────────────────────────────────────
 *  · `sameAs` : aucun compte social au nom de Gryd n'est connu en ligne
 *    (décision n° 5 du cahier). Un `sameAs` pointant sur une page absente est
 *    une donnée structurée FAUSSE, déclarée à Google en plus d'être affichée.
 *  · `aggregateRating`, `Review` : aucune note n'existe.
 *  · `Event`, `Place` : aucun événement, aucun lieu de jeu réel.
 * §4.5 règle 8 : « Aucune donnée structurée inventée. »
 */
import { LEGAL_ENTITY } from './legal';
import { BRAND_WORD, CONTACT, SITE_ORIGIN } from './site2026';

/** Le logo publié : le G chartreuse, en PNG, servi depuis le domaine. */
export const ORGANIZATION_LOGO_PATH = '/og/gryd-logo.png' as const;

/** Une valeur JSON-LD : le sous-ensemble de JSON que ces blocs emploient. */
export type JsonLdValue = string | number | boolean | JsonLdValue[] | { [key: string]: JsonLdValue };

/** Préfixe une adresse relative du domaine public. Les données structurées exigent des URL absolues. */
export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path}`;
}

/**
 * Le bloc `Organization`, réservé à `/`. L'adresse et la raison sociale
 * viennent de `lib/legal.ts` : elles figurent aux mentions légales, et deux
 * documents du même produit ne peuvent pas désigner deux entités.
 */
export function organizationJsonLd(): JsonLdValue {
  const [street, cityLine] = LEGAL_ENTITY.address.split(', ');
  const [postalCode, city] = (cityLine ?? '').split(' ');
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: BRAND_WORD,
    legalName: LEGAL_ENTITY.name,
    url: `${SITE_ORIGIN}/`,
    logo: absoluteUrl(ORGANIZATION_LOGO_PATH),
    email: CONTACT.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: street ?? LEGAL_ENTITY.address,
      postalCode: postalCode ?? '',
      addressLocality: city ?? '',
      addressCountry: 'FR',
    },
  };
}

/**
 * Le bloc `FAQPage`, réservé à `/faq/` (lot W3).
 *
 * ⚠️ LES RÉPONSES SONT CELLES DE LA PAGE, AU CARACTÈRE PRÈS. Elles ne sont pas
 * recopiées ici : la fonction reçoit les MÊMES entrées que l'accordéon, lues
 * dans `faqCopy2026.ts`. Un `FAQPage` dont les réponses diffèrent de la page est
 * une pénalité, pas un bonus (cahier §3.10), et le seul moyen sûr de ne pas
 * diverger est de n'avoir qu'une source.
 *
 * `acceptedAnswer` est en `text` brut : aucune de nos réponses ne contient de
 * balise, et en déclarer une exigerait de l'échapper deux fois.
 */
export function faqPageJsonLd(
  entries: readonly { readonly question: string; readonly answer: string }[],
): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}

/**
 * Le bloc `SoftwareApplication`, réservé à `/telecharger/` (lot W3).
 *
 * ─── CE QUI EST ABSENT, ET C'EST VOULU (cahier §3.10) ───────────────────────
 *  · `aggregateRating` et `Review` : aucune note n'existe. En déclarer une
 *    serait une donnée factice, et une donnée factice DÉCLARÉE À GOOGLE.
 *  · `downloadUrl` / `installUrl` : aucune fiche App Store n'existe. Une adresse
 *    inventée serait un lien mort annoncé à un moteur.
 *  · `softwareVersion` : aucune version n'est publiée.
 *
 * `offers` à 0 € dit la seule chose qui soit vraie et vérifiable aujourd'hui :
 * le jeu est gratuit. `name` est en capitales parce que c'est un IDENTIFIANT de
 * données structurées, pas de la prose (cahier §4.2).
 */
export function softwareApplicationJsonLd(): JsonLdValue {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'GRYD',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'iOS',
    url: `${SITE_ORIGIN}/telecharger/`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  };
}

/**
 * Sérialise un bloc pour un `<script type="application/ld+json">`.
 *
 * `<` est échappé : une chaîne contenant `</script>` fermerait la balise et
 * injecterait du HTML. Aucune de nos valeurs n'en contient aujourd'hui, mais
 * une adresse légale qui change un jour ne doit pas pouvoir casser la page.
 */
export function serializeJsonLd(value: JsonLdValue): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
