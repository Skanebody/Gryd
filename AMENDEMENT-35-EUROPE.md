# AMENDEMENT-35 — Cadre géographique : Europe

**Décision fondateur (12/07/2026).** Le périmètre géographique de GRYD passe de
« France entière capturable » à **« Europe entière capturable »**. GRYD est un jeu
de conquête de territoire à l'échelle du **continent**, pas d'un seul pays.

Cet amendement **remplace** la formulation « France entière » de
`AMENDEMENT-02-GRYD.md` et de `CLAUDE.md` : partout où la vision produit plafonnait
à la France, lire désormais **Europe**.

## 1. Vision vs Saison 0 (focus de lancement)

- **Vision / plafond** : toute l'Europe est capturable (n'importe quelle rue,
  n'importe quelle ville européenne).
- **Saison 0 (lancement)** : le **focus reste Paris + Lille** — les premières
  villes réellement animées. Les autres villes françaises puis européennes
  s'ouvrent **progressivement**, à mesure que de vrais coureurs/crews les
  peuplent. Le moteur (H3 res 10, claims serveur) est déjà agnostique au pays :
  aucune limite technique à l'Europe.

## 2. Règle d'honnêteté (NON négociable — cf. constitution §A « l'app ne ment jamais »)

L'élargissement à l'Europe est une **vision**, pas une autorisation de **fabriquer
des données européennes**. Tant qu'il n'y a pas de vrais utilisateurs hors de
France :

- **Interdit** : afficher un classement « Europe », des villes rivales
  européennes, ou un badge « EUROPE » **sur des lignes de démonstration**
  Paris/Lille — ce serait exactement le mensonge que le sweep zéro-mensonge
  (commit `ef431dc`) vient de corriger.
- **Autorisé / attendu** : surfacer la vision Europe dans la **copie** (notes de
  démo, onboarding, site) et dans les **docs**, et faire apparaître les villes/
  crews européens dans la DONNÉE **au fur et à mesure qu'ils existent vraiment**.

## 3. Changement concret livré avec cet amendement

**Classement / Saison (`app/(tabs)/classement.tsx`)** — le **filtre de portée
« Paris / France » est RETIRÉ** :

- c'était un artefact de démo : « Paris » supposait que tout le monde est à Paris
  (l'ego démo), et la portée « France » ne pointait que vers des lignes factices
  (un filtre qui ne fait que basculer sur de la démo — contraire à §A) ;
- un binaire *Paris/France* n'a aucun sens pour un jeu à l'échelle **Europe** ;
- la dimension géographique est **déjà** portée par l'onglet **« Ville »** (les
  villes qui s'affrontent). L'onglet **Joueurs** = **un seul** classement (ta ville
  de saison, dérivé du serveur quand une session existe).
- Kicker : plus de suffixe `PARIS/FRANCE` figé. La note de démo situe la vision :
  « Classement de démonstration — Saison 0 ouvre Paris et Lille, l'Europe suit. »

Un vrai scope **local ↔ large** (ta ville / ta région / l'Europe) reviendra quand
il y aura des **données multi-villes réelles** — jamais avant.

## 4. Suites (quand la donnée réelle existe — hors de cet amendement)

- Onglet **Ville** : classe des villes **européennes** dès qu'elles sont peuplées.
- **Villes / crews rivaux** européens sur la carte (aujourd'hui : Lyon démo — pas
  d'invention de Berlin/Barcelone tant que ce n'est pas réel).
- **Waitlist web** (`apps/web`, aujourd'hui par code postal français) : accepter
  les localités européennes.
- Kicker / portée : afficher la région réelle **honnêtement** (jamais « EUROPE »
  au-dessus de données locales).
- **Clearance INPI / juridique** : l'ambition Europe élargit le périmètre de
  vérification de marque et de conformité (RGPD déjà couvert) — à noter avant
  usage public hors France.

## 5. Ce qui NE change PAS

Moteur, règles de jeu §3, charte tri-couleur, épuration §A, anti pay-to-win,
architecture Supabase/RLS. Seul le **cadre géographique déclaré** (France → Europe)
et le retrait du filtre de portée du classement changent.
