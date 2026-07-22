/**
 * GRYD — LICENCES OPEN SOURCE, embarquées dans l'app.
 *
 * REMPLACE l'Alert « Licences » des Réglages par un vrai document. Le contenu
 * n'est PAS inventé : les bibliothèques et leurs licences sont celles réellement
 * embarquées (dépendances d'apps/mobile), regroupées par type de licence (MIT,
 * BSD 3-Clauses, Apache 2.0), vérifiées via le champ `license` de chaque paquet
 * installé. Les MIT/BSD/Apache exigent de conserver les mentions de droits
 * d'auteur et de licence : la dernière section le dit et indique où obtenir les
 * textes intégraux (page Support), sans prétendre les afficher ici in extenso.
 *
 * Les noms de projets (React, Expo, MapLibre, H3…) sont des noms propres, non
 * traduits ; le texte d'accompagnement FAIT FOI en français (bandeau `legalReference`).
 */
import { useEffect } from 'react';
import { C, LEGAL_LAST_UPDATED } from '../../src/i18n/catalog/legal';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';
import { LegalDoc, type LegalSection } from '../../src/ui/LegalDoc';

export default function LicencesScreen() {
  const t = useT();
  useEffect(() => {
    screen('legal_licences');
  }, []);

  const sections: readonly LegalSection[] = [
    { heading: t(C.licencesIntroHeading), body: t(C.licencesIntroBody) },
    { heading: t(C.licencesMitHeading), body: t(C.licencesMitBody) },
    { heading: t(C.licencesBsdHeading), body: t(C.licencesBsdBody) },
    { heading: t(C.licencesApacheHeading), body: t(C.licencesApacheBody) },
    { heading: t(C.licencesFullHeading), body: t(C.licencesFullBody) },
  ];

  return (
    <LegalDoc
      title={t(C.licencesTitle)}
      icon="crest"
      updatedLabel={t(C.legalUpdated, { date: LEGAL_LAST_UPDATED })}
      intro={t(C.legalReference)}
      sections={sections}
    />
  );
}
