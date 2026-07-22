/**
 * GRYD — CONDITIONS GÉNÉRALES D'UTILISATION (CGU), embarquées dans l'app.
 *
 * POURQUOI DANS L'APP : « Conditions » ouvrait une URL publique (gryd.run) — un
 * domaine qui N'EXISTE PAS (arbitrage O10 non tranché) — avec un simple texte de
 * repli en Alert. L'App Store exige des CGU accessibles ; embarquées ici, elles
 * ne dépendent d'aucun domaine, d'aucun réseau : elles s'affichent toujours.
 *
 * Le texte vit dans i18n/catalog/legal.ts (source unique) — cet écran ne fait que
 * le mettre en page via `LegalDoc`. Le corps FAIT FOI en français ; le bandeau
 * `legalReference` (intro) le signale aux locales non francophones. Rien n'est
 * fabriqué, aucune date inventée (LEGAL_LAST_UPDATED, tenue à la main).
 */
import { useEffect } from 'react';
import { MIN_AGE_YEARS } from '@klaim/shared';
import { C, LEGAL_LAST_UPDATED } from '../../src/i18n/catalog/legal';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';
import { LegalDoc, type LegalSection } from '../../src/ui/LegalDoc';

export default function CguScreen() {
  const t = useT();
  useEffect(() => {
    screen('legal_cgu');
  }, []);

  const sections: readonly LegalSection[] = [
    { heading: t(C.cguObjetHeading), body: t(C.cguObjetBody) },
    { heading: t(C.cguCompteHeading), body: t(C.cguCompteBody, { age: MIN_AGE_YEARS }) },
    { heading: t(C.cguJeuHeading), body: t(C.cguJeuBody) },
    {
      heading: t(C.cguTricheHeading),
      body: [t(C.cguTricheBody1), t(C.cguTricheBody2), t(C.cguTricheBody3)],
    },
    {
      heading: t(C.cguContenuHeading),
      body: [t(C.cguContenuBody1), t(C.cguContenuBody2), t(C.cguContenuBody3)],
    },
    {
      heading: t(C.cguAboHeading),
      body: [t(C.cguAboBody1), t(C.cguAboBody2), t(C.cguAboBody3)],
    },
    { heading: t(C.cguRespHeading), body: [t(C.cguRespBody1), t(C.cguRespBody2)] },
    { heading: t(C.cguResiliationHeading), body: t(C.cguResiliationBody) },
    { heading: t(C.cguPropHeading), body: t(C.cguPropBody) },
    { heading: t(C.cguDroitHeading), body: t(C.cguDroitBody) },
    { heading: t(C.cguContactHeading), body: t(C.cguContactBody) },
  ];

  return (
    <LegalDoc
      title={t(C.cguTitle)}
      icon="pass"
      updatedLabel={t(C.legalUpdated, { date: LEGAL_LAST_UPDATED })}
      intro={t(C.legalReference)}
      sections={sections}
    />
  );
}
