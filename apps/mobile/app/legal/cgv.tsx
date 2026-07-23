/**
 * GRYD — CONDITIONS GÉNÉRALES DE VENTE (CGV), embarquées dans l'app.
 *
 * OBLIGATOIRES dès qu'un service payant est vendu à des consommateurs (abonnement
 * GRYD Club, Founder Pack, achats in-app) — art. L111-1 et s. du Code de la
 * consommation. Distinctes des CGU (usage du jeu) : les CGV régissent la VENTE
 * (prix, paiement, rétractation, reconduction, garanties, médiation).
 *
 * « Protection maximale MAIS légale » : on ne fait renoncer le consommateur à
 * aucun droit impératif. Le droit de rétractation de 14 j est RAPPELÉ, sa
 * renonciation (contenu numérique fourni immédiatement, art. L221-28 13°) n'est
 * qu'une faculté explicite ; les garanties légales sont maintenues. Le corps FAIT
 * FOI en français ; l'identité du vendeur vient de LEGAL_ENTITY (RCS réel).
 *
 * ⚠ SUSPENS (voir rapport) : le médiateur de la consommation (adhésion B2C
 * obligatoire) n'est pas encore désigné — la clause décrit le droit et renvoie à
 * la plateforme européenne RLL, sans inventer un nom de médiateur.
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
    { heading: t(C.cgvVendeurHeading), body: vendeur },
    {
      heading: t(C.cgvOffresHeading),
      body: [t(C.cgvOffresBody1), t(C.cgvOffresBody2), t(C.cgvOffresBody2b), t(C.cgvOffresBody3)],
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
      updatedLabel={t(C.legalUpdated, { date: LEGAL_LAST_UPDATED })}
      intro={t(C.legalReference)}
      sections={sections}
    />
  );
}
