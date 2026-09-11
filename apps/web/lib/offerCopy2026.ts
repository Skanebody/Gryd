/**
 * GRYD — LA COPIE DE L'OFFRE, `/gryd-plus/` (lot W3).
 *
 * MOT POUR MOT `docs/product/GRYD_SITE_CONTENU_2026_09.md` §3.5.
 *
 * ─── LA PAGE N'A AUCUN BOUTON D'ACHAT, ET C'EST LE POINT ────────────────────
 * Ni « S'abonner », ni « Choisir ce plan », ni formulaire. Aucun produit
 * n'existe côté App Store, rien ne peut être facturé : un bouton qui ne peut
 * rien faire est un bouton mort, et la constitution l'interdit. Le seul renvoi
 * de la page mène aux règles du jeu.
 *
 * ─── « PRÉVU », PAS « PRATIQUÉ » ────────────────────────────────────────────
 * Les prix viennent de `COMMERCIAL_PROPOSAL_2026` (jamais de `lib/pricing.ts`,
 * qui pointe encore sur les SKU d'une offre morte). Ils sont annoncés comme
 * PRÉVUS, et l'encart le dit AVANT de les montrer : le prix définitif viendra du
 * Store et de sa localisation.
 */
import { OFFER, SITE_FACTS, type SiteStat, stat } from './facts2026';

export interface OfferPrice {
  readonly offer: string;
  readonly price: string;
  /** La constante d'où sort le prix. Citée dans le DOM, pas à l'écran. */
  readonly rule: string;
}

export const OFFER_COPY = {
  seo: {
    title: 'Gryd+ : des outils, jamais un avantage de jeu',
    description:
      'Gryd+ vendra des analyses privées, le Studio et des variantes de collection. Prix prévu : 5,99 € par mois. Rien n’est en vente aujourd’hui.',
  },

  hero: {
    title: OFFER,
    lead: `${OFFER} vendra un jour des outils d’analyse et de création. Jamais un avantage.`,
  },

  /** L'encart d'état, en haut, impossible à manquer (cahier §3.5). */
  notice: {
    title: `${OFFER} n’est pas en vente.`,
    body: `Aucun produit n’existe côté App Store, et rien ne peut être facturé aujourd’hui. Le prix ci-dessous est un prix prévu, pas un prix pratiqué. En attendant, les outils sont ouverts à tout compte connecté.`,
  },

  contains: {
    kicker: 'L’offre',
    title: `Ce que ${OFFER} contiendra`,
    body: 'Les comparaisons privées : deux sorties ou deux périodes côte à côte, mêmes mesures, mêmes unités, au delà du résumé gratuit. Le Studio : quatre compositions originales, avec placement et typographie réglables. Six variantes artistiques de saison, aux mêmes paliers que les douze objets gratuits.',
  },

  never: {
    kicker: 'Jamais',
    title: `Ce que ${OFFER} ne contiendra jamais`,
    body: 'Aucun terrain en plus. Aucun XP en plus. Aucun point de défi en plus. Aucune protection achetable. Aucune information tactique que les autres n’ont pas. Aucune monnaie interne.',
    /** Les trois multiplicateurs commerciaux valent 1 : une mesure, pas un slogan. */
    facts: [
      stat(SITE_FACTS.captureMultiplier, 'sur le terrain pris'),
      stat(SITE_FACTS.xpMultiplier, 'sur les XP gagnés'),
      stat(SITE_FACTS.challengeMultiplier, 'sur les points de défi'),
    ] as readonly SiteStat[],
  },

  price: {
    kicker: 'Prix prévu',
    title: 'Le prix prévu',
    columns: { offer: 'Offre', price: 'Prix prévu' },
    rows: [
      { offer: 'Gryd', price: 'Gratuit', rule: 'aucune' },
      { offer: `${OFFER} mensuel`, price: `${SITE_FACTS.offerMonthly.value} par mois`, rule: SITE_FACTS.offerMonthly.rule },
      { offer: `${OFFER} annuel`, price: `${SITE_FACTS.offerAnnual.value} par an`, rule: SITE_FACTS.offerAnnual.rule },
      {
        offer: 'Collections permanentes',
        price: `${SITE_FACTS.collectionContour.value} · ${SITE_FACTS.collectionRelief.value} · ${SITE_FACTS.collectionClubhouse.value}`,
        rule: 'COMMERCIAL_PROPOSAL_2026.permanentCollectionEurCents',
      },
    ] as readonly OfferPrice[],
    note: 'Le prix définitif viendra du Store et de sa localisation. Tant qu’aucun prix Store n’existe, la page affiche le prix prévu et le dit.',
  },

  stop: {
    kicker: 'Si tu arrêtes',
    title: 'Ce qui se passe si tu arrêtes',
    body: 'Tes objets gagnés gratuitement restent acquis. Tes sorties, tes terrains et tes XP ne bougent pas. Les outils avancés s’arrêtent ; les fichiers déjà créés restent à toi. Résilier un abonnement et supprimer un compte sont deux opérations distinctes : supprimer ton compte ne résilie pas la facturation Apple.',
  },

  /** Le SEUL renvoi de la page, et il ne vend rien. */
  cta: { label: 'Les règles du jeu', href: '/comment-ca-marche/#points' },
} as const;
