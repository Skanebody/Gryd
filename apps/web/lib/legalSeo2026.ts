/**
 * GRYD — LE RÉFÉRENCEMENT DES QUATRE PAGES LÉGALES (lot W3).
 *
 * ─── CE QUE CE FICHIER NE TOUCHE PAS ────────────────────────────────────────
 * LE TEXTE DES DOCUMENTS. Il est contractuel, corrigé au fond le 11/09
 * (ADR-014), et il ne change pas d'un mot. Ce qui vit ici, c'est ce qu'un
 * moteur de recherche AFFICHE À LEUR PLACE : le titre d'onglet et la ligne de
 * résumé. Deux textes qui n'apparaissent nulle part dans le document.
 *
 * ─── POURQUOI ILS SONT SORTIS DES PAGES ─────────────────────────────────────
 * Ils enfreignaient trois règles du cahier de contenu que le reste du site
 * tient maintenant mécaniquement :
 *   · le TIRET LONG (§4.1) : les quatre titres étaient « … — GRYD » ;
 *   · « GRYD » EN CAPITALES dans de la prose (§4.2) : la marque s'écrit
 *     « Gryd » dans une phrase, et les capitales sont réservées au lettrage et
 *     aux identifiants. `GRYD+`, le nom exact de l'offre, reste en capitales ;
 *   · les PLAFONDS D'AFFICHAGE : deux descriptions faisaient 185 et 206
 *     caractères, donc étaient tronquées en plein milieu dans un résultat de
 *     recherche. Les mots gardés sont ceux des originales, dans l'ordre ; seules
 *     les redites sont tombées.
 * Posés ici, ils tombent sous `siteCopy2026.test.ts` comme les huit autres
 * pages : plus aucun titre du site n'échappe à la relecture.
 *
 * Ce module ne dépend que de `legal.ts` : les quatre pages légales l'importent
 * seules, et ne tirent donc pas la copie de tout le site dans leur bundle.
 *
 * La raison sociale vient de `LEGAL_ENTITY`, jamais retapée : elle porte une
 * année (« Nexus 1993 ») et une adresse, et deux documents du même produit ne
 * peuvent pas désigner deux entités.
 */
import { LEGAL_ENTITY } from './legal';

export interface LegalSeo {
  readonly path: string;
  readonly title: string;
  readonly description: string;
}

export const LEGAL_SEO = {
  confidentialite: {
    path: '/confidentialite/',
    title: 'Politique de confidentialité de Gryd',
    description:
      'Comment Gryd collecte, utilise et protège tes données : localisation pendant tes sorties, mouvement, compte. Ta position n’est jamais publique.',
  },
  conditions: {
    path: '/conditions/',
    title: 'Conditions d’utilisation de Gryd',
    description:
      'Les règles d’usage de Gryd : compte, règles du jeu à pied et à vélo, anti-triche, contenu et modération, responsabilité, résiliation.',
  },
  cgv: {
    path: '/cgv/',
    title: 'Conditions Générales de Vente de Gryd',
    description:
      'CGV de Gryd : abonnement GRYD+ et collections permanentes, prix, paiement, droit de rétractation, reconduction, résiliation, médiation.',
  },
  mentionsLegales: {
    path: '/mentions-legales/',
    title: 'Mentions légales de Gryd',
    description: `Mentions légales de Gryd : éditeur (${LEGAL_ENTITY.name}), directeur de la publication, hébergement, propriété intellectuelle, contact.`,
  },
} as const satisfies Record<string, LegalSeo>;

/** Les quatre adresses, dans l'ordre du pied de page. */
export const LEGAL_SEO_LIST: readonly LegalSeo[] = Object.values(LEGAL_SEO);
