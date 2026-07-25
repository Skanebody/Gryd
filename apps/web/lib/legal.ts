/**
 * GRYD (web) — identité légale et CANAL DE CONTACT, source unique du site.
 *
 * ─── POURQUOI CE FICHIER EXISTE ────────────────────────────────────────────
 * Les quatre pages légales du site (confidentialité, CGU, CGV, mentions)
 * nommaient `privacy@gryd.run` et `support@gryd.run` comme canaux de contact —
 * sept liens `mailto:` vers un domaine que l'entité N'A PAS ACQUIS (point ouvert
 * O10, arbitrage `gryd.app` vs `gryd.run` non tranché).
 *
 * Un `mailto:` vers un domaine non enregistré n'est pas un contact : c'est un
 * lien mort. Une politique RGPD dont la boîte de réception n'existe pas est un
 * défaut juridique, et la Guideline App Store 1.2 exige une « published contact
 * information so users can easily reach you ». Le canal publié est donc le
 * COURRIER au siège — réel, vérifiable, et identique à celui que la politique
 * EMBARQUÉE dans l'app nomme déjà (`apps/mobile/src/i18n/catalog/legal.ts`,
 * `LEGAL_ENTITY` + `contactBody`). Deux documents du même produit ne peuvent pas
 * désigner deux canaux différents.
 *
 * ─── LE JOUR OÙ LE DOMAINE EXISTE (O10) ────────────────────────────────────
 * Ajouter ici `SUPPORT_EMAIL` / `PRIVACY_EMAIL`, et ne les afficher QUE lorsque
 * la boîte reçoit réellement. Ne jamais réintroduire une adresse « qui existera
 * bientôt » : une doc ne promet jamais au-delà de ce qui fonctionne. La marche à
 * suivre complète est dans `GRYD_APPSTORE_CHECKLIST.md` §7.
 *
 * ⚠️ DUPLICATION ASSUMÉE, ET BORNÉE : `LEGAL_ENTITY` vit dans `apps/mobile`, que
 * le web ne peut pas importer (deux React, deux bundlers). Le jour où elle monte
 * dans `@klaim/shared`, ce fichier devient un ré-export. En attendant, une seule
 * copie côté web — pas quatre pages qui recopient une adresse à la main.
 */

/** Raison sociale + siège — tels qu'ils figurent aux mentions légales. */
export const LEGAL_ENTITY = {
  name: 'SASU Nexus 1993',
  address: '66 avenue des Champs-Élysées, 75008 Paris',
} as const;

/**
 * Le canal de contact PUBLIÉ, en une chaîne prête à afficher.
 * Utilisé partout où une page nommait une adresse e-mail inexistante.
 */
export const POSTAL_CONTACT = `${LEGAL_ENTITY.name}, ${LEGAL_ENTITY.address}`;
