/**
 * GRYD — POLITIQUE DE CONFIDENTIALITÉ (RGPD), embarquée dans l'app.
 *
 * DISTINCTE de l'écran de RÉGLAGES de vie privée (app/confidentialite.tsx, route
 * /confidentialite, où l'on EXERCE ses droits : export, suppression). Ici, c'est
 * le DOCUMENT. Les deux portent le même titre : le kicker « POLITIQUE · RGPD »
 * lève l'ambiguïté dès la première ligne, et la ligne-lien de pied conduit de
 * l'un à l'autre.
 *
 * ─── ORDRE DE COMPOSITION (châssis `LegalDoc`) ─────────────────────────────
 *  1. kicker « POLITIQUE · RGPD » ; 2. date ; 3. note grise « seul le français
 *  fait foi » ; 4. les 13 sections, NUMÉROTÉES ; 5. ligne-lien « Exercer mes
 *  droits » → /confidentialite (jamais un CTA chartreuse : ce document décrit
 *  des droits, il ne les exécute pas).
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ──────────────────────────────────────
 * Cinq déclarations de ce document étaient FAUSSES. Une politique qui déclare
 * une collecte qui n'a pas lieu est un faux au même titre qu'une donnée
 * fabriquée à l'écran — en pire, puisqu'elle engage l'éditeur.
 * · « messages de CHAT de crew » : GRYD n'a pas de messagerie, elle est REFUSÉE
 *   (A-43 §9). Le crew échange par SIGNAUX à vocabulaire fermé
 *   (`features/crew/pings.ts`, migration 0051) ; `chatStore.ts` a été supprimé.
 * · « Santé importée depuis Apple Santé / HealthKit », classée donnée sensible
 *   art. 9 : HealthKit n'est PAS branché (`sources/adapters/appleHealth.ts` est
 *   un stub `needs_dev_build`, aucun module natif santé en dépendance). La
 *   section sensible ne parle donc plus que de géolocalisation, et l'absence de
 *   collecte santé est ÉNONCÉE — l'iPhone affiche une demande d'autorisation
 *   Santé (clé Info.plist déclarée), un lecteur pouvait croire l'inverse.
 * · « réactions » collectées : elles vivent en AsyncStorage et ne quittent
 *   jamais l'appareil.
 * · « Paiement : Apple / Google » comme traitement EN COURS, alors que la CGV du
 *   même build dit qu'aucune offre n'est commercialisée : deux textes
 *   contractuels embarqués qui se contredisaient.
 * · « Écris-nous depuis la page Support » (×4) : `/support` n'a ni adresse, ni
 *   formulaire, ni `mailto:`. Une politique RGPD sans moyen effectif d'exercer
 *   ses droits (art. 12) est un défaut juridique. Canal réel : le courrier au
 *   siège, plus l'export/suppression in-app qui, eux, fonctionnent.
 * A ÉTÉ AJOUTÉ ce qui existait sans être déclaré : l'IMPORT DE COURSES (fichier
 * GPX, service de suivi connecté) envoie un tracé à nos serveurs.
 * A ÉTÉ RETIRÉ DU DOCBLOC : l'affirmation « la ligne Politique de confidentialité
 * des Réglages route par erreur vers l'écran de réglages ». C'est corrigé
 * (`parametres/[section].tsx:600` route bien ici) — laisser la phrase enverrait
 * le prochain lecteur corriger un bug mort.
 *
 * ─── ÉCARTS ASSUMÉS ────────────────────────────────────────────────────────
 * · HÉBERGEUR INCOMPLET AU SENS DE LA LCEN art. 6-III : la dénomination, l'ADRESSE
 *   et le TÉLÉPHONE de l'hébergeur doivent être publiés. Le dépôt ne contient que
 *   le fournisseur et sa région (`LEGAL_HOSTING`, sourcé sur le projet lié) ; les
 *   coordonnées complètes sont dans le contrat Supabase du fondateur. On ne les
 *   invente pas — le manque est inscrit en suspens.
 * · `NSHealthShareUsageDescription` reste déclaré dans `app.json` SANS entitlement
 *   HealthKit. Le texte de cette politique ne ment plus, mais la clé Info.plist,
 *   elle, reste un risque de revue App Store — et `app.json` est hors du
 *   périmètre de ce lot.
 * · PAS DE 4 ÉTATS : aucune lecture réseau (texte embarqué). Cf. `LegalDoc`.
 * · Corps en FRANÇAIS dans les cinq langues (`fr5()`), cf. legal.ts.
 */
import { useEffect } from 'react';
import { router } from 'expo-router';
import { MIN_AGE_YEARS } from '@klaim/shared';
import {
  C,
  LEGAL_ENTITY,
  LEGAL_HOSTING,
  LEGAL_LAST_UPDATED,
} from '../../src/i18n/catalog/legal';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';
import { ListRow } from '../../src/ui/ListRow';
import { LegalDoc, type LegalSection } from '../../src/ui/LegalDoc';

export default function PrivacyPolicyScreen() {
  const t = useT();
  useEffect(() => {
    screen('legal_confidentialite');
  }, []);

  const hosting = { provider: LEGAL_HOSTING.provider, region: LEGAL_HOSTING.region };

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
      body: [
        t(C.privacyPartageBody1),
        t(C.privacyPartageBody2, hosting),
        t(C.privacyPartageBody3),
      ],
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
    {
      heading: t(C.privacyContactHeading),
      body: t(C.privacyContactBody, { name: LEGAL_ENTITY.name, address: LEGAL_ENTITY.address }),
    },
  ];

  return (
    <LegalDoc
      title={t(C.privacyTitle)}
      icon="verrou"
      kicker={t(C.privacyKicker)}
      updatedLabel={t(C.legalUpdated, { date: LEGAL_LAST_UPDATED })}
      notice={t(C.legalReference)}
      numbered
      sections={sections}
      /* Le document DIT « Réglages, puis Confidentialité » depuis toujours ; il y
         conduit enfin. Ligne de navigation (ListRow), pas un CTA chartreuse. */
      footer={
        <ListRow
          label={t(C.privacyExerciseRow)}
          sublabel={t(C.privacyExerciseHint)}
          icon="verrou"
          chevron
          onPress={() => router.push('/confidentialite')}
        />
      }
    />
  );
}
