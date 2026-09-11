/**
 * GRYD — IDENTITÉ ET PLAN DU SITE PUBLIC (lot W2).
 *
 * Une seule copie du plan de `docs/product/GRYD_SITE_CONTENU_2026_09.md` §2.
 * L'en-tête, le pied de page, les fils d'Ariane et les données structurées
 * lisent TOUS ce fichier : deux listes de navigation divergent toujours, et un
 * lien mort dans un pied de page est exactement le « bouton mort » que la
 * constitution interdit.
 *
 * ⚠️ TOUTES LES URL PORTENT UN SLASH FINAL. `trailingSlash: true`
 * (`next.config.ts`) est la seule forme que GitHub Pages sache servir depuis un
 * dossier ; un `/crews` sans slash provoque une redirection, ou un 404.
 *
 * ⚠️ LE NOM DE L'OFFRE VIENT DU CODE. `COMMERCIAL_PROPOSAL_2026.subscriptionName`
 * écrit `GRYD+`, et les CGV corrigées le 11/09 en dépendent (décision n° 2 du
 * cahier de contenu : « GRYD+ partout, parce que c'est ce que le code dit »).
 * C'est la seule forme en capitales autorisée dans la prose du site.
 */
import { COMMERCIAL_PROPOSAL_2026, MIN_AGE_YEARS } from '@klaim/shared';
import { CONTACT_EMAIL, LEGAL_ENTITY } from './legal';

/** Le nom de la marque tel qu'il s'écrit DANS UNE PHRASE (cahier §4.2). */
export const BRAND_WORD = 'Gryd' as const;

/** Le nom de l'offre payante, lu à la source. Jamais retapé. */
export const OFFER_NAME = COMMERCIAL_PROPOSAL_2026.subscriptionName;

/** Le domaine public. Sert de base aux URL canoniques et aux images sociales. */
export const SITE_ORIGIN = 'https://gryd.run' as const;

export interface SiteLink {
  readonly href: string;
  readonly label: string;
}

/**
 * LA NAVIGATION PRINCIPALE — cinq liens, pas un de plus (cahier §2.3 : « au delà,
 * la barre se plie mal »). L'action « Télécharger » n'en fait pas partie : elle
 * est traitée à part, et reste visible même quand le panneau mobile est fermé.
 */
export const PRIMARY_NAV: readonly SiteLink[] = [
  { href: '/comment-ca-marche/', label: 'Comment ça marche' },
  { href: '/crews/', label: 'Les crews' },
  { href: '/saison/', label: 'Saison' },
  { href: '/gryd-plus/', label: OFFER_NAME },
  { href: '/securite-et-vie-privee/', label: 'Sécurité' },
] as const;

/** L'action de l'en-tête. Une seule, et elle mène à l'état réel de la sortie. */
export const HEADER_ACTION: SiteLink = { href: '/telecharger/', label: 'Télécharger' };

/** Colonne « produit » du pied de page (cahier §2.3). */
export const FOOTER_PRODUCT: readonly SiteLink[] = [
  { href: '/comment-ca-marche/', label: 'Comment ça marche' },
  { href: '/crews/', label: 'Les crews' },
  { href: '/saison/', label: 'Saison et classements' },
  { href: '/gryd-plus/', label: OFFER_NAME },
  { href: '/securite-et-vie-privee/', label: 'Sécurité et vie privée' },
  { href: '/faq/', label: 'Questions fréquentes' },
  { href: '/telecharger/', label: 'Télécharger' },
] as const;

/** Colonne « légal » du pied de page. Les quatre pages du 11/09, sans un mot de plus. */
export const FOOTER_LEGAL: readonly SiteLink[] = [
  { href: '/confidentialite/', label: 'Confidentialité' },
  { href: '/conditions/', label: 'Conditions' },
  { href: '/cgv/', label: 'CGV' },
  { href: '/mentions-legales/', label: 'Mentions légales' },
] as const;

/**
 * La ligne de bas du pied. L'âge vient de `MIN_AGE_YEARS` : il est écrit dans
 * les CGU, dans l'app et ici, et il ne peut pas y avoir trois âges.
 *
 * ⚠️ AUCUNE ICÔNE SOCIALE, et `Organization.sameAs` reste vide : aucun compte
 * Instagram, TikTok ou autre au nom de Gryd n'est connu en ligne (décision n° 5
 * du cahier de contenu). Une icône vers un compte inexistant est un bouton mort.
 */
export const FOOTER_AGE_NOTICE = `${BRAND_WORD} est réservé aux ${MIN_AGE_YEARS} ans et plus.` as const;
export const FOOTER_COPYRIGHT = '© Nexus 1993' as const;

/** La signature de marque, reprise de l'accroche du héros (cahier §1.1). */
export const BRAND_TAGLINE = 'Cours ou roule. Ferme ta boucle. Le terrain est à toi.' as const;

/** Le contact publié : l'e-mail vérifié et le siège. Aucune adresse inventée. */
export const CONTACT = {
  email: CONTACT_EMAIL,
  postal: `${LEGAL_ENTITY.name}, ${LEGAL_ENTITY.address}`,
} as const;

/** Titre et description par défaut du site (cahier §3.1, comptés au caractère). */
export const SITE_TITLE = 'Gryd, cours ou roule et prends du terrain' as const;
export const SITE_DESCRIPTION =
  'Ferme une boucle en courant ou à vélo : la surface à l’intérieur devient ton terrain sur la carte. Gratuit, sans achat qui fait gagner.' as const;

/** L'image sociale par défaut, 1200 × 630 (`public/og/gryd-og.jpg`). */
export const SITE_OG_IMAGE = '/og/gryd-og.jpg' as const;
