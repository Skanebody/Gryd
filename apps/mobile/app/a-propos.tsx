/**
 * GRYD — À PROPOS / MENTIONS LÉGALES, embarquées dans l'app.
 *
 * POURQUOI CET ÉCRAN EXISTE (demande fondateur 21/07 : « dans à propos il faut
 * tout mettre à jour, se couvrir au maximum d'un point de vue légal ») :
 * l'écran Réglages renvoyait vers « gryd.run/mentions-legales », un domaine qui
 * N'EXISTE PAS — l'arbitrage gryd.app vs gryd.run est toujours ouvert (O10).
 * Les mentions légales étaient donc un CUL-DE-SAC, alors que la LCEN impose
 * qu'elles soient accessibles. Ici elles ne dépendent d'aucun domaine, d'aucun
 * hébergement, d'aucune connexion réseau : elles s'affichent toujours.
 *
 * ─── ORDRE DE COMPOSITION (châssis `LegalDoc`) ─────────────────────────────
 *  1. kicker « ÉDITEUR · MENTIONS LÉGALES » ; 2. date de mise à jour ;
 *  3. ÉDITEUR sur surface (le bloc d'identité, celui qu'on vient chercher) ;
 *  4. HÉBERGEMENT ; 5. TES DONNÉES ; 6. CONTACT.
 *
 * ─── CE QUI A ÉTÉ RETIRÉ, ET POURQUOI ──────────────────────────────────────
 * · LE SECOND CHÂSSIS. Cet écran recodait son propre `Section` + sa `card` alors
 *   que `LegalDoc` fait exactement cela, pour les quatre autres documents de la
 *   même famille. Deux grammaires pour cinq documents, c'était une de trop — et
 *   avec elle partent un `backgroundColor: colors.carbone` posé à la main au
 *   lieu de `elevation.surface`, et deux styles de texte hors rôles typo.
 * · « écris-nous depuis la page Support » : `/support` n'a ni adresse e-mail, ni
 *   formulaire, ni `mailto:` — ses cartes ouvrent une alerte qui dit elle-même
 *   que la remontée n'est pas transmise. Des mentions légales qui désignent un
 *   canal inexistant sont des mentions fausses. Canal réel : le courrier au siège.
 * · LA DATE ABSENTE. C'était le SEUL des cinq documents à ne pas afficher
 *   `LEGAL_LAST_UPDATED` — une mention légale non datée ne dit pas de quand elle
 *   parle. Elle porte désormais la même date que les quatre autres.
 * · LA RÉGION D'HÉBERGEMENT RETAPÉE. Elle était écrite en dur ici ET dans deux
 *   clauses de la politique de confidentialité, sans source. Elle vient
 *   maintenant de `LEGAL_HOSTING`, dont la provenance est vérifiée sur le projet
 *   Supabase lié (cf. son commentaire) — c'est elle qui fonde la clause de
 *   non-transfert hors UE, elle ne peut pas être une supposition en trois copies.
 *
 * ─── ÉCARTS ASSUMÉS ────────────────────────────────────────────────────────
 * · MENTION D'HÉBERGEUR INCOMPLÈTE au sens de la LCEN art. 6-III, qui impose la
 *   dénomination, l'ADRESSE et le TÉLÉPHONE de l'hébergeur. Le dépôt ne contient
 *   que le fournisseur et sa région : ces coordonnées vivent dans le contrat
 *   Supabase du fondateur. On ne les FABRIQUE PAS — le manque est remonté en
 *   suspens, et l'écran dit ce qu'il sait plutôt qu'un « à compléter ».
 * · PAS DE 4 ÉTATS : aucune lecture réseau (texte embarqué). Cf. `LegalDoc`.
 * · Contrairement aux quatre documents contractuels, ces mentions sont RÉELLEMENT
 *   traduites (ce sont des faits d'identité, pas du fond juridique rédigé) : pas
 *   de note « seul le français fait foi » ici, et pas de numérotation — quatre
 *   sections se parcourent d'un coup d'œil.
 */
import { useEffect } from 'react';
import { C, LEGAL_ENTITY, LEGAL_HOSTING, LEGAL_LAST_UPDATED } from '../src/i18n/catalog/legal';
import { useT } from '../src/i18n/store';
import { screen } from '../src/lib/analytics';
import { LegalDoc, type LegalSection } from '../src/ui/LegalDoc';

export default function AProposScreen() {
  const t = useT();
  useEffect(() => {
    screen('a_propos');
  }, []);

  // Les variables d'identité viennent de LEGAL_ENTITY : une seule vérité, et
  // aucune mention obligatoire ne peut diverger d'un écran à l'autre.
  const vars = {
    name: LEGAL_ENTITY.name,
    form: LEGAL_ENTITY.form,
    capital: LEGAL_ENTITY.capital,
    address: LEGAL_ENTITY.address,
    rcs: LEGAL_ENTITY.rcsCity,
    siren: LEGAL_ENTITY.siren,
    vat: LEGAL_ENTITY.vat,
    president: LEGAL_ENTITY.president,
  };

  const sections: readonly LegalSection[] = [
    {
      heading: t(C.publisherHeading),
      body: [t(C.publisherBody, vars), t(C.publisherDirector, vars), t(C.publisherVat, vars)],
      // LA section d'identité : c'est le seul bloc de cet écran qu'un tiers
      // (plateforme, juriste, joueur) vient chercher isolément.
      surface: true,
    },
    {
      heading: t(C.hostingHeading),
      body: t(C.hostingBody, {
        provider: LEGAL_HOSTING.provider,
        region: LEGAL_HOSTING.region,
      }),
    },
    { heading: t(C.dataHeading), body: t(C.dataBody) },
    { heading: t(C.contactHeading), body: t(C.contactBody, vars) },
  ];

  return (
    <LegalDoc
      title={t(C.aboutTitle)}
      icon="info"
      kicker={t(C.aboutKicker)}
      updatedLabel={t(C.legalUpdated, { date: LEGAL_LAST_UPDATED })}
      sections={sections}
    />
  );
}
