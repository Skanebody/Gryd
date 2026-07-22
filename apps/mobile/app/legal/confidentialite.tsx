/**
 * GRYD — POLITIQUE DE CONFIDENTIALITÉ (RGPD), embarquée dans l'app.
 *
 * DISTINCTE de l'écran de RÉGLAGES de vie privée (app/confidentialite.tsx, route
 * /confidentialite, où l'on EXERCE ses droits : export, suppression). Ici, c'est
 * le DOCUMENT : responsable de traitement, données collectées, bases légales
 * RGPD, données sensibles (art. 9 : santé + géolocalisation), sous-traitants,
 * conservation, droits, CNIL. La ligne « Politique de confidentialité » des
 * Réglages route par erreur vers l'écran de réglages ; ce lot fournit le vrai
 * document, l'autre lot corrigera le renvoi vers /legal/confidentialite.
 *
 * Texte : i18n/catalog/legal.ts (source unique). L'âge minimum vient de
 * game-rules (MIN_AGE_YEARS) — jamais un « 16 » écrit en dur qui mentirait si la
 * règle bougeait. L'adresse du responsable vient de LEGAL_ENTITY (identité RÉELLE).
 */
import { useEffect } from 'react';
import { MIN_AGE_YEARS } from '@klaim/shared';
import { C, LEGAL_ENTITY, LEGAL_LAST_UPDATED } from '../../src/i18n/catalog/legal';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';
import { LegalDoc, type LegalSection } from '../../src/ui/LegalDoc';

export default function PrivacyPolicyScreen() {
  const t = useT();
  useEffect(() => {
    screen('legal_confidentialite');
  }, []);

  const sections: readonly LegalSection[] = [
    {
      heading: t(C.privacyResponsableHeading),
      body: [
        t(C.privacyResponsableBody1, { address: LEGAL_ENTITY.address }),
        t(C.privacyResponsableBody2),
      ],
    },
    {
      heading: t(C.privacyDonneesHeading),
      body: [t(C.privacyDonneesBody1), t(C.privacyDonneesBody2), t(C.privacyDonneesBody3)],
    },
    {
      heading: t(C.privacyPositionHeading),
      body: [t(C.privacyPositionBody1), t(C.privacyPositionBody2)],
    },
    {
      heading: t(C.privacyFinalitesHeading),
      body: [t(C.privacyFinalitesBody1), t(C.privacyFinalitesBody2), t(C.privacyFinalitesBody3)],
    },
    {
      heading: t(C.privacySanteHeading),
      body: [t(C.privacySanteBody1), t(C.privacySanteBody2)],
    },
    {
      heading: t(C.privacyPartageHeading),
      body: [t(C.privacyPartageBody1), t(C.privacyPartageBody2), t(C.privacyPartageBody3)],
    },
    { heading: t(C.privacyTransfertHeading), body: t(C.privacyTransfertBody) },
    { heading: t(C.privacyConservationHeading), body: t(C.privacyConservationBody) },
    {
      heading: t(C.privacyDroitsHeading),
      body: [t(C.privacyDroitsBody1), t(C.privacyDroitsBody2), t(C.privacyDroitsBody3)],
    },
    { heading: t(C.privacySecuriteHeading), body: t(C.privacySecuriteBody) },
    { heading: t(C.privacyMineursHeading), body: t(C.privacyMineursBody, { age: MIN_AGE_YEARS }) },
    { heading: t(C.privacyModifsHeading), body: t(C.privacyModifsBody) },
    { heading: t(C.privacyContactHeading), body: t(C.privacyContactBody) },
  ];

  return (
    <LegalDoc
      title={t(C.privacyTitle)}
      icon="verrou"
      updatedLabel={t(C.legalUpdated, { date: LEGAL_LAST_UPDATED })}
      intro={t(C.legalReference)}
      sections={sections}
    />
  );
}
