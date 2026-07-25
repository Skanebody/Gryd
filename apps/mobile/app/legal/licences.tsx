/**
 * GRYD — LICENCES OPEN SOURCE, embarquées dans l'app.
 *
 * REMPLACE l'Alert « Licences » des Réglages par un vrai document. Le contenu
 * n'est PAS inventé : les bibliothèques et leurs licences sont celles réellement
 * embarquées (dépendances d'apps/mobile), regroupées par licence, et vérifiées
 * dans le champ `license` de chaque paquet INSTALLÉ.
 *
 * ─── ORDRE DE COMPOSITION (châssis `LegalDoc`) ─────────────────────────────
 *  1. kicker « OPEN SOURCE · LICENCES » ; 2. date ; 3. note grise « seul le
 *  français fait foi » ; 4. les sections par famille de licence, NUMÉROTÉES :
 *  intro → MIT → BSD-3 → Apache 2.0 → SIL OFL 1.1 → licence non déclarée →
 *  textes complets → périmètre.
 *
 * ─── CE QUI A ÉTÉ AJOUTÉ, ET POURQUOI C'ÉTAIT GRAVE ────────────────────────
 * · LA SECTION SIL OPEN FONT LICENSE 1.1. Les trois familles de caractères de
 *   Night Print (`@expo-google-fonts/inter`, `inter-tight`, `jetbrains-mono`)
 *   sont chargées au démarrage (`src/lib/fonts.ts`) et publiées sous
 *   `MIT AND OFL-1.1`. L'OFL EXIGE que la mention de copyright et de licence
 *   accompagne la distribution : l'écran ne connaissait que MIT / BSD / Apache,
 *   donc la condition d'usage des fontes N'ÉTAIT PAS TENUE. Les lignes de
 *   copyright sont recopiées des `LICENSE_FONT` des paquets, pas de mémoire.
 * · LA SECTION « LICENCE NON DÉCLARÉE » : `posthog-react-native` était crédité
 *   sous MIT alors que son `package.json` publié ne déclare aucune licence. Lui
 *   en attribuer une de mémoire est une faute symétrique de l'oubli.
 * · LE PÉRIMÈTRE, dit en dernier (comme le scanner absent de `qr.tsx`) : cette
 *   page couvre les dépendances DIRECTES, pas la chaîne transitive.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ ───────────────────────────────────────────────────
 * · « depuis la page Support » (×2) : `/support` n'a ni adresse, ni formulaire,
 *   ni `mailto:`. La demande de textes intégraux se fait par écrit au siège.
 * · Les 14 bibliothèques MIT empilées dans UN paragraphe séparé par des « ; » :
 *   c'est une liste, elle se rend comme une liste.
 *
 * ─── ÉCARTS ASSUMÉS ────────────────────────────────────────────────────────
 * · LA LISTE RESTE TENUE À LA MAIN. Une page générée depuis `node_modules` au
 *   runtime ferait dépendre un document légal d'un système de fichiers absent en
 *   production. Le filet est ailleurs : `features/legal/licenses.ts` + son test
 *   de dérive passent au rouge dès qu'une dépendance apparaît, disparaît, ou
 *   embarque une licence sans section ici. C'est ce filet qui manquait quand les
 *   trois fontes sont passées à travers.
 * · PAS DE 4 ÉTATS : aucune lecture réseau (texte embarqué). Cf. `LegalDoc`.
 * · Les noms de projets (React, Expo, MapLibre, H3…) sont des noms propres, non
 *   traduits ; le texte d'accompagnement FAIT FOI en français.
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
    {
      heading: t(C.licencesMitHeading),
      body: [
        t(C.licencesMitReact),
        t(C.licencesMitExpo),
        t(C.licencesMitSupabase),
        t(C.licencesMitMap),
        t(C.licencesMitRn),
      ],
    },
    { heading: t(C.licencesBsdHeading), body: t(C.licencesBsdBody) },
    { heading: t(C.licencesApacheHeading), body: t(C.licencesApacheBody) },
    {
      heading: t(C.licencesOflHeading),
      body: [t(C.licencesOflBody1), t(C.licencesOflBody2), t(C.licencesOflBody3)],
    },
    { heading: t(C.licencesUndeclaredHeading), body: t(C.licencesUndeclaredBody) },
    { heading: t(C.licencesFullHeading), body: t(C.licencesFullBody) },
    { heading: t(C.licencesScopeHeading), body: t(C.licencesScopeBody) },
  ];

  return (
    <LegalDoc
      title={t(C.licencesTitle)}
      icon="crest"
      kicker={t(C.licencesKicker)}
      updatedLabel={t(C.legalUpdated, { date: LEGAL_LAST_UPDATED })}
      notice={t(C.legalReference)}
      numbered
      sections={sections}
    />
  );
}
