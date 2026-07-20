# GRYD — À compléter pour être en règle (droit français)

> ⚠️ **Ceci n'est pas un avis juridique.** Les pages ont été rédigées comme des
> gabarits conformes aux exigences françaises usuelles. Avant toute mise en ligne
> publique / mise en vente, **faire relire par un avocat ou un juriste** (droit de
> la consommation + RGPD), d'autant qu'il y a paiements, géolocalisation et
> potentiellement des mineurs.

## Ce qui est en place (structure)

| Page | Route | Statut |
|------|-------|--------|
| Politique de confidentialité (RGPD) | `/confidentialite` | ✅ rédigée |
| Conditions d'utilisation (CGU) | `/conditions` | ✅ rédigée |
| **Mentions légales** (LCEN) | `/mentions-legales` | 🟡 gabarit — champs `[à compléter]` |
| **CGV** (vente d'abonnements) | `/cgv` | 🟡 gabarit — champs `[à compléter]` |

Toutes reliées entre elles (pieds de page) + dans le footer de la landing.

## Identité société — RENSEIGNÉE (source : Pappers / RCS Paris, 06/07/2026)

Ces valeurs ont été reprises des données publiques du RCS et intégrées dans
`/mentions-legales` et `/cgv` :

| Champ | Valeur |
|-------|--------|
| Dénomination / forme | SASU Nexus 1993 |
| SIREN | 982 786 154 |
| SIRET (siège) | 982 786 154 00012 |
| TVA intracommunautaire | FR18982786154 |
| Capital social | 500 € |
| Siège social | 66 avenue des Champs-Élysées, 75008 Paris |
| RCS | Paris (immatriculée le 27/12/2023) |
| Directeur de la publication / Président | Benjamin Bel |
| Prix (repris de l'app) | Premium 8 €/mois · 69 €/an · Founder 149 € |
| Prestataire de paiement web | Stripe (Stripe Payments Europe) |

> À vérifier par toi : que ces valeurs sont toujours à jour, et que le nom du
> directeur de la publication est bien celui que tu veux afficher publiquement.

## ✅ CONFIRMÉ PAR LE FONDATEUR le 21/07/2026

Identité vérifiée sur l'export du portail data Nexus 1993 — **elle correspond
exactement** aux valeurs ci-dessus (SASU, 500 €, 66 av. des Champs-Élysées 75008
Paris, RCS Paris 982 786 154, président Benjamin Bel).

**Protection des données personnelles du fondateur : déjà optimale.** Le siège
est une adresse de **domiciliation**, pas le domicile. L'adresse du siège est
publique par nature au RCS : la seule parade est justement la domiciliation, et
elle est en place. Ne JAMAIS remplacer par une adresse personnelle.

### Correctif du 21/07 : les mentions légales étaient un CUL-DE-SAC

L'app renvoyait vers « gryd.run/mentions-legales » — **un domaine qui n'existe
pas** (arbitrage `gryd.app` vs `gryd.run` toujours ouvert, O10) et des pages web
non déployées publiquement. Or la LCEN impose que les mentions légales soient
accessibles.

→ Elles sont désormais **embarquées dans l'app** : `apps/mobile/app/a-propos.tsx`
+ `src/i18n/catalog/legal.ts` (source unique `LEGAL_ENTITY`, 5 langues). Elles ne
dépendent plus d'aucun domaine, d'aucun hébergement, d'aucun réseau.

### Reste à faire quand le domaine sera tranché

- Déployer publiquement les pages web `/mentions-legales`, `/cgv`, `/conditions`,
  `/confidentialite` (elles existent dans `apps/web`, non déployées).
- Remplacer les mentions « gryd.run/… » restantes des textes de Réglages
  (`catalog/reglages.ts` : `mentionsFallbackBody`, `licencesBody`) — elles
  pointent vers un domaine inexistant.

### À jour vs la réalité produit — à revoir avant mise en vente

- **Prix affichés dans le doc (8 €/mois, 69 €/an, 149 €)** : le modèle de
  monétisation n'est PAS tranché (abonnement + Éclats existant vs 4 packs
  permanents de la doctrine A-43). Ne pas publier de CGV tant que ce choix n'est
  pas fait — des CGV qui décrivent une offre inexistante sont pires qu'absentes.
- **Confidentialité par défaut ouverte** (décision fondateur 20/07 : profil et
  courses publics) : la politique de confidentialité doit le refléter, avec les
  trois planchers non ouverts (domicile flouté, position live jamais partagée,
  données de santé privées — RGPD art. 9).
- **Retargeting** : tout usage marketing des e-mails/téléphones exige un opt-in
  explicite ET le prompt Apple (ATT). Ne rien collecter à cette fin avant que le
  consentement soit câblé.

## Ce qui reste à fournir (les 2 derniers `[à compléter]`)

1. **Hébergeur du site web gryd.run** (Mentions légales — obligatoire LCEN) : nom /
   raison sociale, adresse, téléphone. Dépend de l'hébergement retenu.
   (Ex. si déployé sur Vercel : « Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789,
   USA ».) *L'hébergement des données applicatives par Supabase (UE) est déjà mentionné.*
2. **Médiateur de la consommation** (CGV — **obligatoire B2C**, art. L612-1) : il faut
   **adhérer à un médiateur agréé** (ex. CMAP, Medicys, l'AME…) puis indiquer son nom +
   coordonnées + site. C'est une **démarche à effectuer**, pas seulement un texte.

## Points à faire valider par un juriste (au-delà des trous à remplir)

- **Renonciation au droit de rétractation** (contenu numérique, art. L221-28 13°) :
  le gabarit prévoit la clause, mais le **parcours d'achat doit recueillir le
  consentement explicite** (case à cocher « je demande l'accès immédiat et renonce
  à mon droit de rétractation ») — à implémenter côté checkout (Stripe) le jour où
  le paiement web est branché (O-item).
- **Reconduction tacite (loi Chatel, L215-1)** : obligation d'**envoyer l'avis de
  reconduction** 1 à 3 mois avant l'échéance pour les abonnements souscrits sur le
  site → à câbler (e-mail transactionnel) quand Stripe sera actif.
- **Achats in-app Apple/Google** : les CGV précisent que ces achats sont régis par
  la plateforme (paiement, remboursement, résiliation). Cohérent avec la règle
  App Store (pas de paiement web externe pour un bien numérique dans l'app).
- **Cookies / mesure d'audience** : si un traceur non essentiel est utilisé
  (PostHog, analytics tiers), un **bandeau de consentement CNIL** est requis sur le
  site. Aujourd'hui la confidentialité mentionne une « mesure d'audience interne » ;
  vérifier si elle dépose un cookie soumis à consentement, et sinon documenter
  qu'elle est exemptée (cookieless / première partie / finalité strictement
  nécessaire).
- **Mineurs (RGPD art. 8, seuil France = 15 ans)** : l'âge minimum est déjà géré,
  mais si des < 15 ans peuvent s'inscrire, il faut le **consentement parental** ;
  à confirmer selon la cible réelle.
- **Marque « GRYD »** : recherche d'antériorité + dépôt **INPI** avant usage public
  (déjà noté dans le repo comme prérequis).
- **RGPD** : tenue d'un **registre des traitements**, éventuel **DPO** si le
  traitement de géolocalisation à grande échelle le justifie, et **analyse
  d'impact (AIPD)** probable vu la géolocalisation + données de santé importées.

## Une fois les données obtenues

1. Remplacer chaque `[à compléter : …]` dans `apps/web/app/mentions-legales/page.tsx`
   et `apps/web/app/cgv/page.tsx` par la valeur réelle.
2. `npm run build -w @klaim/web` pour vérifier.
3. Relecture juriste → publication.
