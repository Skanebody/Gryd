# GRYD, le @pseudo et les profils vérifiés

*10/09/2026. Lot H. Répond à deux demandes du fondateur : « inspire-toi
d'Instagram pour les pseudos, reprends les mêmes conditions » et « faut-il des
profils vérifiés (badge) pour les personnes et pour les marques ? »*

---

## 1. Le pseudo : ce qui est repris d'Instagram, et ce qui reste plus strict

| Règle Instagram | GRYD | Où elle vit |
|---|---|---|
| Un @ unique | repris | `user_profiles.handle unique` (0011), unicité déjà insensible à la casse |
| 2 changements par 14 jours glissants | repris | `HANDLE_CHANGES_PER_WINDOW` / `HANDLE_CHANGE_WINDOW_DAYS`, appliqués par `change_my_handle_2026` (0175) |
| Ancien pseudo réservé 14 jours | repris | `HANDLE_HOLD_DAYS`, table `handle_holds_2026` (0175) |
| 30 caractères, minuscules, chiffres, points, tirets bas | **plus strict** : 3 à 20, pas de point | `HANDLE_REGEX` (0011, inchangé) |

**Pourquoi pas le point.** La migration 0047 l'argumentait déjà et rien n'a
changé : à petite taille, `nike.store` et `nikestore` se confondent sur un chip
de classement, donc le point MULTIPLIE les sosies d'un pseudo réservé au lieu de
les réduire. Un @ GRYD est aussi cité en fin de phrase dans le fil du crew et
dans un lien profond, où un point final rend la fin du token ambiguë. Instagram
a ouvert le point pour une raison qui n'est pas la nôtre : deux milliards de
comptes. Élargir un alphabet est irréversible en pratique ; le restreindre plus
tard casserait des comptes.

**Trois choses qu'Instagram ne dit pas et que GRYD devait trancher.**

1. *Le pseudo attribué à l'inscription n'est pas un pseudo choisi.* Depuis 0154,
   un compte neuf reçoit `runner_5f3a91c0d4e2`. Sans précaution, le tout premier
   « Enregistrer » aurait consommé un des deux crédits et réservé quatorze jours
   une étiquette que personne n'a jamais lue. La colonne `handle_chosen_2026`
   sépare le NOMMAGE (gratuit, une fois) du CHANGEMENT (compté, réservé).
2. *Une reprise coûte un changement.* Reprendre son ancien @ pendant la
   réservation consomme un crédit comme le reste. Sinon un aller-retour tiendrait
   un pseudo indéfiniment sans jamais payer la cadence.
3. *La création d'un profil vérifie les réservations d'autrui.* Sinon il aurait
   suffi d'ouvrir un compte neuf pour rafler le pseudo qu'un joueur vient de
   libérer, c'est-à-dire exactement le trou que la réservation ferme.

---

## 2. Faut-il des profils vérifiés ?

### Ce que font les autres, et ce qu'ils y ont gagné ou perdu

**Instagram et X vendent le badge.** X l'a rendu achetable en 2022 : en quelques
jours, des comptes payants se sont fait passer pour des entreprises cotées, et un
faux compte « Eli Lilly » annonçant l'insuline gratuite a coûté une chute
boursière réelle à l'entreprise. La leçon n'est pas « la vérification est
mauvaise » : c'est qu'un badge qui certifie un PAIEMENT et qu'on lit comme
certifiant une IDENTITÉ est pire que pas de badge du tout. Il transfère la
confiance sans transférer la vérification.

**Strava a un « verified athlete »** attribué, non demandé, réservé à des
athlètes dont la notoriété est vérifiable en dehors de la plateforme. Il ne donne
aucun avantage de jeu : il dit « c'est bien lui », rien de plus. C'est le modèle
le plus proche de GRYD, et pour une raison structurelle : sur Strava comme ici,
l'usurpation la plus dommageable n'est pas la célébrité mondiale, c'est le
coureur connu de son quartier dont on reprend le nom pour parler en son nom.

### Le risque réel chez GRYD, aujourd'hui

Il est faible en volume et élevé en dégât unitaire. La base compte trois comptes.
Mais le jeu est LOCAL : un crew rouennais reconnaît ses membres par leur pseudo,
un capitaine annonce une sortie, et une usurpation dans ce cadre ne se dilue pas
dans un flux mondial, elle atteint directement les vingt personnes concernées.
Les deux surfaces exposées sont le fil de crew (parler au nom de quelqu'un) et
les marques (0047 en réserve déjà une liste, ce qui est un aveu que le problème
existe).

### Recommandation

**Oui à la colonne, non au badge visible tant qu'aucune revue humaine n'existe,
et jamais de badge achetable.**

1. **Ne jamais vendre le badge.** Pas seulement par principe : l'anti-pay-to-win
   (règle 10) interdit déjà de vendre un avantage, et vendre de la crédibilité
   est le pire des avantages parce qu'il se retourne contre les joueurs qui ne
   l'ont pas achetée. Le schéma le rend impossible, il ne se contente pas de le
   déconseiller : aucun grant d'écriture au client, aucune RPC, aucune
   référence commerciale.
2. **Deux genres, pas un booléen.** `verified_kind` : `none | athlete | brand`.
   La preuve exigée n'est pas la même (pièce d'identité contre preuve de mandat),
   la personne qui tranche n'est pas la même, et ce que le badge autorisera plus
   tard n'a pas de raison d'être le même. Écrire la distinction maintenant coûte
   une colonne ; la rattraper plus tard coûterait une migration sur des comptes
   déjà badgés.
3. **Rien à l'écran tant que le circuit n'existe pas.** Pas de bouton « demander
   la vérification », pas d'emplacement grisé, pas de « bientôt vérifié ». Une
   colonne prête n'est pas une promesse. `VerifiedBadge.tsx` lit la colonne et ne
   rend rien pour `none`, c'est-à-dire pour 100 % des comptes : le jour où le
   serveur passera une ligne, il s'allumera tout seul.
4. **La vraie défense reste le signalement.** Il existe déjà (`social_report_2026`
   accepte une PERSONNE depuis 0137, et `/member` porte le parcours en trois
   temps). Un badge protège les quelques comptes qui l'ont ; le signalement
   protège tous les autres. C'est le premier qui est facultatif.

### Ce qu'il faudra décider avant d'allumer quoi que ce soit

Ces quatre points sont le VRAI coût, et aucun n'est technique :

- **Le critère.** « Notoriété vérifiable hors GRYD » se prouve comment pour un
  coureur de Rouen ? Une licence de club, un palmarès régional, une page de
  presse ? Un critère flou produit des refus arbitraires et des recours.
- **La preuve exigée**, et sa conservation. Demander une pièce d'identité crée
  une obligation RGPD (base légale, durée, minimisation, suppression) qui n'existe
  pas aujourd'hui. C'est la partie la plus chère, et elle est juridique.
- **Qui tranche, et en combien de temps.** Une file de revue sans personne
  derrière est une file qui grossit et un badge qui n'arrive jamais.
- **Ce que le badge autorise.** Aujourd'hui : rien du tout. C'est le bon
  point de départ, et il faut le tenir explicitement, sinon le badge dérivera
  vers un privilège de jeu.

**Tant que ces quatre réponses n'existent pas, la bonne position est celle du
code actuel : la colonne est posée, personne ne l'a, et l'app n'en parle pas.**

---

## 3. Ce que ce lot a livré

- `packages/shared/src/game-rules.ts`, section « PSEUDO 2026 » :
  `HANDLE_CHANGES_PER_WINDOW`, `HANDLE_CHANGE_WINDOW_DAYS`, `HANDLE_HOLD_DAYS`.
- `0175` : `handle_changes_2026`, `handle_holds_2026`, `handle_chosen_2026`,
  `change_my_handle_2026`, `my_handle_status_2026`,
  `check_handle_available_2026`, et `save_my_social_profile_2026` remplacée pour
  passer par la même porte.
- `0176` : `verified_kind` (`none | athlete | brand`), non écrivable par le
  client, avec une contrainte qui interdit un genre sans `verified`.
- Mobile : `handleStatus2026.ts` (pur) + `handleStatus2026Data.ts` (lecture),
  le champ pseudo de `/profil-edit` (règle affichée, décompte, quatre états,
  « Reprendre @ancien », refus nommés), et le @pseudo sous le nom du Profil.
- Preuves : `supabase/tests/handle_change_window_2026.pglite.test.mjs`
  (étape 0 comprise), `handleStatus2026.test.ts`, `handleCouture2026.test.ts`.

**Non fait, et assumé :** le badge n'est peint sur aucun écran (personne ne l'a),
et `social_member_2026` ne transporte pas encore `verified_kind` : le jour où un
circuit existera, c'est la première ligne à écrire.
