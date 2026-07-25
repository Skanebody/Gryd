/**
 * GRYD — CONDITIONS GÉNÉRALES DE VENTE (CGV), embarquées dans l'app.
 *
 * OBLIGATOIRES dès qu'un service payant est vendu à des consommateurs (abonnement
 * GRYD Club, Founder Pack, achats in-app) — art. L111-1 et s. du Code de la
 * consommation. Distinctes des CGU (usage du jeu) : les CGV régissent la VENTE
 * (prix, paiement, rétractation, reconduction, garanties, médiation).
 *
 * ─── ORDRE DE COMPOSITION (châssis `LegalDoc`) ─────────────────────────────
 *  1. kicker « CONDITIONS · VENTE » ; 2. date d'entrée en vigueur ; 3. note
 *  grise « seul le français fait foi » ; 4. CHAPEAU : rien n'est en vente ;
 *  5. les 10 articles, NUMÉROTÉS, dont l'identité du VENDEUR sur surface.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ──────────────────────────────────────
 * · LE FAIT QUI PRIME ÉTAIT EN 3ᵉ POSITION. « Aucune de ces offres n'est
 *   commercialisée » arrivait après deux paragraphes de catalogue d'offres : un
 *   lecteur pressé y lisait une boutique. Il devient le chapeau du document.
 * · « Toute réclamation peut nous être adressée depuis la page Support » : la
 *   réclamation PRÉALABLE conditionne l'accès à la médiation (art. L612-1), et
 *   `/support` n'a ni adresse, ni formulaire, ni `mailto:`. Une voie de recours
 *   inexistante fait perdre un délai — remplacée par le courrier au siège.
 * · LE RENVOI VERS LA PLATEFORME EUROPÉENNE RLL (ec.europa.eu/consumers/odr),
 *   supprimé et non « rendu cliquable » : cette plateforme a cessé son activité.
 *   Peindre un recours fermé, en texte mort de surcroît, cumulait deux fautes.
 * · LES TROIS PUCES D'OFFRES EMPILÉES DANS UN SEUL PARAGRAPHE : rendues comme
 *   trois paragraphes, dont celui qui énonce ce qui n'est JAMAIS vendu.
 * · LA BOÎTE SUR LES 10 SECTIONS : la seule qui gagne à être encadrée est
 *   l'identité du vendeur (RCS/SIREN/TVA), le seul bloc qu'on vient chercher
 *   isolément. Les neuf autres se séparent par l'espace.
 *
 * ─── ÉCARTS ASSUMÉS ────────────────────────────────────────────────────────
 * · MÉDIATEUR NON DÉSIGNÉ : l'adhésion à un médiateur de la consommation est
 *   obligatoire en B2C ; NEXUS 1993 n'en a pas encore. La clause décrit le droit
 *   et dit l'absence, plutôt que d'inventer un nom de médiateur.
 * · PAS DE 4 ÉTATS : aucune lecture réseau (texte embarqué). Cf. `LegalDoc`.
 * · Corps en FRANÇAIS dans les cinq langues (`fr5()`), cf. legal.ts.
 */
import { useEffect } from 'react';
import { C, LEGAL_ENTITY, LEGAL_LAST_UPDATED } from '../../src/i18n/catalog/legal';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';
import { LegalDoc, type LegalSection } from '../../src/ui/LegalDoc';

export default function CgvScreen() {
  const t = useT();
  useEffect(() => {
    screen('legal_cgv');
  }, []);

  const vendeur = t(C.cgvVendeurBody, {
    name: LEGAL_ENTITY.name,
    form: LEGAL_ENTITY.form,
    capital: LEGAL_ENTITY.capital,
    address: LEGAL_ENTITY.address,
    rcs: LEGAL_ENTITY.rcsCity,
    siren: LEGAL_ENTITY.siren,
    vat: LEGAL_ENTITY.vat,
  });

  const sections: readonly LegalSection[] = [
    { heading: t(C.cgvObjetHeading), body: t(C.cgvObjetBody) },
    // La SEULE section sur surface : c'est le bloc qu'un acheteur, un juriste ou
    // une plateforme vient chercher isolément dans un document de dix articles.
    { heading: t(C.cgvVendeurHeading), body: vendeur, surface: true },
    {
      heading: t(C.cgvOffresHeading),
      body: [
        t(C.cgvOffresBody1),
        t(C.cgvOffresAbonnement),
        t(C.cgvOffresPonctuels),
        t(C.cgvOffresJamaisVendus),
        t(C.cgvOffresBody3),
      ],
    },
    { heading: t(C.cgvCommandeHeading), body: [t(C.cgvCommandeBody1), t(C.cgvCommandeBody2)] },
    {
      heading: t(C.cgvRetractationHeading),
      body: [t(C.cgvRetractationBody1), t(C.cgvRetractationBody2), t(C.cgvRetractationBody3)],
    },
    { heading: t(C.cgvDureeHeading), body: [t(C.cgvDureeBody1), t(C.cgvDureeBody2)] },
    { heading: t(C.cgvGarantiesHeading), body: t(C.cgvGarantiesBody) },
    { heading: t(C.cgvMediationHeading), body: [t(C.cgvMediationBody1), t(C.cgvMediationBody2)] },
    { heading: t(C.cgvDonneesHeading), body: t(C.cgvDonneesBody) },
    { heading: t(C.cgvDroitHeading), body: t(C.cgvDroitBody) },
  ];

  return (
    <LegalDoc
      title={t(C.cgvTitle)}
      icon="boutique"
      kicker={t(C.cgvKicker)}
      updatedLabel={t(C.legalUpdated, { date: LEGAL_LAST_UPDATED })}
      notice={t(C.legalReference)}
      intro={t(C.cgvStatusIntro)}
      numbered
      sections={sections}
    />
  );
}
