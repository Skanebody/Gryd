/**
 * GRYD — LES MOTS DE L'OFFRE, ÉCRITS UNE FOIS.
 *
 * ─── POURQUOI CE FICHIER EXISTE ────────────────────────────────────────────
 * Trois surfaces parlent de GRYD+ : `/abonnement` (informer et gérer),
 * `/premium` (la seule surface de VENTE) et `/premium-analytics` (un outil de
 * l'offre). Le 10/09/2026 elles disaient trois choses différentes du MÊME fait :
 *
 *   · `/abonnement`        → « Droits indisponibles »
 *   · `/premium`           → « Les offres du Store sont indisponibles. »
 *   · `/premium-analytics` → « Découvrir GRYD+ » (un bouton vers une page qui
 *                             ne vend rien — le bouton mort exact qu'interdit
 *                             MASTER §12)
 *
 * Trois phrases pour un seul état de la boutique, c'est trois occasions de se
 * contredire. Elles vivent donc ici, et les écrans les LISENT.
 *
 * ─── FR + EN, PAS DE TIRET LONG EN FRANÇAIS ───────────────────────────────
 * Les couples sont typés : ajouter un motif sans sa traduction ne compile pas.
 *
 * PUR : aucun import React Native. Testable sous Deno.
 */
import type { StoreClosedReason2026 } from './plan2026';
import type { GrydPlusBenefitId2026, GrydPlusPeriod2026, PermanentCollectionId2026 } from './plan2026';

export interface Copy2026 { readonly fr: string; readonly en: string }

/** Rend la langue demandée. Tout ce qui n'est pas `en` est du français. */
export function pick2026(entry: Copy2026, locale: string): string {
  return locale === 'en' ? entry.en : entry.fr;
}

/**
 * UNE phrase par raison, et jamais de date d'ouverture.
 *
 * Le cahier ne fixe aucune échéance de mise en vente (§16.1 : « Si ces trois
 * bénéfices P1 ne sont pas réellement utilisables, le lancement de l'abonnement
 * est différé ») et ADR-011 interdit explicitement le « bientôt disponible »
 * sur ce qui n'est pas ouvert. On dit donc le FAIT (ce n'est pas en vente) et
 * la CONSÉQUENCE pour le joueur (tout reste gratuit), sans promettre un mois.
 */
export const STORE_CLOSED_COPY_2026: Readonly<Record<StoreClosedReason2026, Copy2026>> = {
  checking: {
    fr: 'Lecture de la boutique en cours.',
    en: 'Reading the store.',
  },
  signedOut: {
    fr: 'Connecte-toi pour voir les offres et retrouver tes droits.',
    en: 'Sign in to see the plans and find your access.',
  },
  platform: {
    fr: 'Les achats se font depuis l’application iOS ou Android. Tes droits restent liés à ton compte.',
    en: 'Purchases happen in the iOS or Android app. Your access stays linked to your account.',
  },
  notConfigured: {
    fr: 'GRYD+ n’est pas encore ouvert à la vente. Tout ce que tu utilises aujourd’hui dans GRYD reste gratuit.',
    en: 'GRYD+ is not open for sale yet. Everything you use in GRYD today stays free.',
  },
  nothingOnSale: {
    fr: 'GRYD+ n’est pas encore ouvert à la vente. Tout ce que tu utilises aujourd’hui dans GRYD reste gratuit.',
    en: 'GRYD+ is not open for sale yet. Everything you use in GRYD today stays free.',
  },
  noConfirmedPrice: {
    fr: 'L’App Store n’a pas confirmé de prix : rien n’est proposé à la vente sans son prix.',
    en: 'The App Store confirmed no price: nothing is offered for sale without its price.',
  },
  readFailed: {
    fr: 'La boutique n’a pas pu être lue. Ce n’est pas une réponse : on ne sait pas encore.',
    en: 'The store could not be read. That is not an answer: we do not know yet.',
  },
};

/** Le titre du bloc quand rien n'est achetable. Jamais « bientôt ». */
export const STORE_CLOSED_TITLE_2026: Copy2026 = {
  fr: 'Pas encore en vente',
  en: 'Not on sale yet',
};

/**
 * Les trois bénéfices P1 (§16.1). `{count}` n'est remplacé que là où un compte
 * VÉRIFIABLE existe dans `game-rules.ts` — les deux autres n'en portent aucun.
 */
export const GRYD_PLUS_BENEFIT_COPY_2026: Readonly<Record<GrydPlusBenefitId2026, Copy2026>> = {
  comparisons: {
    fr: 'Comparer deux sorties ou deux périodes, avec les mêmes mesures et les mêmes unités.',
    en: 'Compare two activities or two periods, with the same measurements and units.',
  },
  studio: {
    fr: 'Les compositions Studio : placement et typographie guidés sur tes cartes de sortie.',
    en: 'Studio compositions: guided placement and typography on your activity cards.',
  },
  seasonVariants: {
    fr: '{count} variantes artistiques de saison, aux mêmes paliers que les objets gratuits.',
    en: '{count} artistic season variants, at the same tiers as the free objects.',
  },
};

/** Remplace le seul jeton autorisé. Un jeton non fourni reste visible : on le verrait. */
export function benefitLabel2026(id: GrydPlusBenefitId2026, count: number | null, locale: string): string {
  const text = pick2026(GRYD_PLUS_BENEFIT_COPY_2026[id], locale);
  return count === null ? text : text.replace('{count}', String(count));
}

export const PERIOD_COPY_2026: Readonly<Record<GrydPlusPeriod2026, Copy2026>> = {
  monthly: { fr: 'par mois', en: 'per month' },
  yearly: { fr: 'par an', en: 'per year' },
};

/** Noms COMMERCIAUX des trois collections permanentes (§7.5, §16.1). */
export const PERMANENT_COLLECTION_COPY_2026: Readonly<Record<PermanentCollectionId2026, Copy2026>> = {
  contour: { fr: 'Affiche Contour', en: 'Contour poster' },
  relief: { fr: 'Collection Relief', en: 'Relief collection' },
  clubhouse: { fr: 'Collection Clubhouse', en: 'Clubhouse collection' },
};

/**
 * La garantie §16.2, affichable seulement si `noPaidGameAdvantage2026()` est
 * vraie. Elle nomme les trois choses qui ne s'achètent pas, parce qu'une
 * promesse abstraite d'équité ne se vérifie pas.
 */
export const NO_PAID_ADVANTAGE_COPY_2026: Copy2026 = {
  fr: 'Aucun avantage de jeu, jamais : même capture, même XP, mêmes chances dans les défis, abonné ou non.',
  en: 'No gameplay advantage, ever: same capture, same XP, same odds in challenges, subscriber or not.',
};

/** Le tarif affiché boutique fermée n'est pas un prix de vente, et le dit. */
export const PLANNED_PRICE_NOTICE_2026: Copy2026 = {
  fr: 'Tarif prévu en France, toutes taxes comprises. Le prix qui fera foi est celui affiché par l’App Store dans ta devise, au moment de l’achat.',
  en: 'Planned price for France, all taxes included. The price that counts is the one shown by the App Store in your currency, at the time of purchase.',
};

/** §16.1 : « Commencer sans essai reconductible obligatoire. » */
export const NO_TRIAL_NOTICE_2026: Copy2026 = {
  fr: 'Aucun essai gratuit n’est prévu au lancement : GRYD se juge en jouant, gratuitement.',
  en: 'No free trial is planned at launch: judge GRYD by playing it, for free.',
};

/** Ce qu'un abonnement RÉEL engage. Affiché seulement quand le Store parle. */
export const RENEWAL_NOTICE_2026: Copy2026 = {
  fr: 'Renouvellement automatique. Résiliation dans les réglages de l’App Store ; l’accès dure jusqu’à la fin de la période payée.',
  en: 'Renews automatically. Cancel in App Store settings; access lasts until the end of the paid period.',
};
