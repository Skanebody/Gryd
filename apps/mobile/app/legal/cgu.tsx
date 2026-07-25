/**
 * GRYD — CONDITIONS GÉNÉRALES D'UTILISATION (CGU), embarquées dans l'app.
 *
 * POURQUOI DANS L'APP : « Conditions » ouvrait une URL publique (gryd.run) — un
 * domaine qui N'EXISTE PAS (arbitrage O10 non tranché) — avec un simple texte de
 * repli en Alert. L'App Store exige des CGU accessibles ; embarquées ici, elles
 * ne dépendent d'aucun domaine, d'aucun réseau : elles s'affichent toujours.
 *
 * ─── ORDRE DE COMPOSITION (châssis `LegalDoc`) ─────────────────────────────
 *  1. kicker « CONDITIONS · UTILISATION » ; 2. date d'entrée en vigueur ;
 *  3. note grise « seul le français fait foi » ; 4. les 11 articles, NUMÉROTÉS.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ──────────────────────────────────────
 * · « Écris-nous depuis la page Support » (article Contact). `/support` n'a ni
 *   adresse e-mail, ni formulaire, ni `mailto:` : ses cartes ouvrent une alerte
 *   qui dit elle-même que la remontée n'est pas transmise. Une clause de contact
 *   qui ne mène nulle part est une clause fausse. Le canal nommé est le COURRIER
 *   au siège — réel, et qui restera vrai si un e-mail s'ouvre plus tard.
 * · « messages de crew » dans l'article Contenu : GRYD n'a pas de messagerie.
 *   Le contenu réellement publié est le pseudo, le nom de crew et les SIGNAUX à
 *   vocabulaire fermé (`features/crew/pings.ts`).
 * · Le « 24 heures » écrit en dur : il vient de `REPORT_REVIEW_HOURS`, la même
 *   constante que l'écran Confidentialité affiche au joueur qui signale. Deux
 *   promesses de délai qui pouvaient diverger n'en font plus qu'une.
 * · La suppression de compte affirmée SANS CONDITION : elle n'est armée que si
 *   une session existe (`confidentialite.tsx:238`). La phrase porte sa réserve.
 *
 * ─── ÉCARTS ASSUMÉS ────────────────────────────────────────────────────────
 * · AUCUN POINT D'ENTRÉE À L'INSCRIPTION. Le seul chemin vers les CGU est
 *   Réglages › À propos › Légal, soit 4 taps — un lien « Conditions » sous le
 *   CTA de `(auth)/sign-in.tsx` serait la bonne place, mais ce fichier appartient
 *   au lot Onboarding/Auth : la demande est remontée, pas exécutée ici.
 * · PAS DE 4 ÉTATS : cet écran ne lit rien (texte embarqué dans le bundle). Il
 *   s'affiche en avion, sans compte et sans backend — déclaration portée par le
 *   châssis `LegalDoc`.
 * · Le corps reste en FRANÇAIS dans les cinq langues (`fr5()`, legal.ts) : une
 *   traduction juridique non revue par un juriste serait un faux.
 */
import { useEffect } from 'react';
import { MIN_AGE_YEARS } from '@klaim/shared';
import { C, LEGAL_ENTITY, LEGAL_LAST_UPDATED } from '../../src/i18n/catalog/legal';
import { useT } from '../../src/i18n/store';
import { screen } from '../../src/lib/analytics';
import { REPORT_REVIEW_HOURS } from '../../src/features/crew/moderation';
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
      body: [
        t(C.cguContenuBody1),
        t(C.cguContenuBody2),
        t(C.cguContenuBody3, { h: REPORT_REVIEW_HOURS }),
      ],
    },
    {
      heading: t(C.cguAboHeading),
      body: [t(C.cguAboBody1), t(C.cguAboBody2), t(C.cguAboBody3)],
    },
    { heading: t(C.cguRespHeading), body: [t(C.cguRespBody1), t(C.cguRespBody2)] },
    { heading: t(C.cguResiliationHeading), body: t(C.cguResiliationBody) },
    { heading: t(C.cguPropHeading), body: t(C.cguPropBody) },
    { heading: t(C.cguDroitHeading), body: t(C.cguDroitBody) },
    {
      heading: t(C.cguContactHeading),
      body: t(C.cguContactBody, { name: LEGAL_ENTITY.name, address: LEGAL_ENTITY.address }),
    },
  ];

  return (
    <LegalDoc
      title={t(C.cguTitle)}
      icon="pass"
      kicker={t(C.cguKicker)}
      updatedLabel={t(C.legalUpdated, { date: LEGAL_LAST_UPDATED })}
      notice={t(C.legalReference)}
      numbered
      sections={sections}
    />
  );
}
