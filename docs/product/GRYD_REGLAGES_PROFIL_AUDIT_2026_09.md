# GRYD, Réglages et Profil : audit, ménage, ajouts, benchmark INTVL et Strava

**Date** : 10/09/2026 · **Périmètre** : `apps/mobile/app/parametres.tsx`, `apps/mobile/app/parametres/**`,
`apps/mobile/src/features/refonte/ProfileHomeScreen.tsx`, et tout ce que ces deux écrans ouvrent.
**Autorité** : cahier de septembre (rang 0), G19 · G22 · G26 · G27 · G28 · §15.2.
**Méthode** : chaque ligne a été suivie jusqu'à sa page, et chaque page ouverte. Les verdicts
« doublon », « mort » et « manquant » ne sont pas des impressions : ils citent le fichier.

---

## 1. Ce qu'il y avait : Réglages, entrée par entrée

L'écran portait **quatorze lignes sous trois titres** (« Compte », « Tes sorties »,
« Aide et informations »). La politique de confidentialité, les licences logicielles, la langue et
le guide interactif partageaient le même bloc de dix lignes.

| Entrée (avant) | Cible | État réel de la page | Verdict | Décision |
|---|---|---|---|---|
| Compte & connexion | `/parametres/compte` | Réelle : identité de session, export, suppression, révocation des autres sessions (E78) | Utile | Gardée, groupe **Compte** |
| Modifier mon profil | `/profil-edit` | Réelle | Utile | Gardée, groupe **Compte** |
| Confidentialité & données | `/confidentialite` | Réelle : audiences, zones protégées, sécurité, RGPD, suppression | Utile | Gardée, groupe **Confidentialité et données** |
| Notifications | `/parametres/notifications` | Réelle : matrice §14.1 servie par le serveur (0140/0141) | Utile | Gardée, groupe **Compte** |
| Abonnement & achats | `/abonnement` | Réelle : statut serveur, tarif prévu, achats, gestion | Utile (tension ADR-011 ouverte, non tranchée ici) | Gardée, groupe **Compte** |
| Sources & appareils | `/sources` | Réelle (G26) | Utile | Gardée, **groupe à elle seule** |
| Mon journal | `/(tabs)/profil` | L'onglet Profil, déjà en bas de l'écran | **Doublon d'onglet** | **Retirée** |
| Mes parcours | `/mes-parcours` | Réelle : transparence sur ce que GRYD déduit des habitudes (A-46) | Utile, et Réglages est sa seule porte | Gardée, groupe **Préférences** |
| Ma collection | `/arsenal` | Le Profil porte déjà une carte Collection pleine largeur avec l'objet équipé | **Doublon** | **Retirée** |
| Mon crew | `/(tabs)/crew` | L'onglet Crew, déjà en bas de l'écran | **Doublon d'onglet** | **Retirée** |
| Langue | `/langue` | Réelle, 5 langues, applique au tap | Utile | Gardée, groupe **Préférences** |
| Comment ça marche | `/comment-ca-marche` | Réelle (lot 6, guide interactif) | Utile | Gardée, groupe **Aide** |
| Questions fréquentes | `/comment-ca-marche?chapitre=faq` | Réelle (chapitre 08 du guide) | Utile | Gardée, groupe **Aide** |
| Aide & signalement | `/support` | Réelle | Utile | Gardée, groupe **Aide** |
| À propos & mentions légales | `/a-propos` | Réelle | Utile | Gardée, groupe **Légal** |
| Conditions d'utilisation | `/legal/cgu` | Réelle | Utile | Gardée, groupe **Légal** |
| Politique de confidentialité | `/legal/confidentialite` | Réelle | Utile | Gardée, groupe **Légal** |
| Crédits des données | `/credits-donnees` | Réelle, obligation CC BY GeoNames + Licence Ouverte | Utile, seule porte | Gardée, groupe **Légal** |
| Licences logicielles | `/legal/licences` | Réelle, obligation de licence | Utile, seule porte | Gardée, groupe **Légal** |
| Me déconnecter | action | Réelle, avec état d'échec | Utile | Gardé, en bas |
| **(absente)** | `/legal/cgv` | **La page existe** et elle est obligatoire (art. L111-1 du Code de la consommation) | **Manquante** | **Ajoutée**, groupe **Légal** |
| **(absente)** | autorisations système | Aucun écran ne disait leur état | **Manquante** | **Ajoutée** : `/parametres/permissions` |
| **(absente)** | `/parametres/course` | Page réelle, un vrai réglage (haptiques), **poussée par aucun fichier du dépôt** | **Manquante** | **Ajoutée**, groupe **Préférences** |

### 1.1 Le trou des CGV, et comment il s'est creusé

Les conditions de vente **existaient** (`apps/mobile/app/legal/cgv.tsx`) et leur seule ligne de
l'univers Réglages vivait dans la branche `apropos` de `app/parametres/[section].tsx`. Or ce
composant **intercepte le slug avant tout rendu** :

```
if (raw === 'apropos') return <Redirect href="/a-propos" />;
```

Depuis le 09/09, plus **aucun** chemin partant de Réglages ne menait aux CGV. Rien ne rougissait :
le typecheck était vert, et l'audit de routes aussi, puisque la page gardait une porte depuis
`/abonnement`. Un document contractuel obligatoire était perdu là où on le cherche.
**C'est le défaut le plus grave de cet audit**, et il n'a rien coûté à réparer : une ligne.

### 1.2 Les cinq sous-pages qu'aucun joueur ne pouvait ouvrir

`app/parametres/[section].tsx` rendait **huit** slugs. Cinq étaient interceptés par un `<Redirect>` :

| Slug | Redirection posée le 09/09 | Ce que sa branche contenait encore |
|---|---|---|
| `profil` | `/profil-edit` | Nom, titre, deux liens (déjà ailleurs) |
| `crew` | `/(tabs)/crew` | Quatre états de crew, un lien `flags.warRoom` vers `/warroom` |
| `carte` | `/(tabs)` | Une note et un lien vers `/confidentialite` |
| `apropos` | `/a-propos` | **Version, statut de saison, et les six lignes légales dont les CGV** |
| `avance` | `/calcul-zones` | Trois constantes de moteur en lecture, un lien vers `/sources` |

Soit **environ 450 lignes de JSX** compilées, traduites en cinq langues, maintenues, relues, pour
des écrans que personne ne peut ouvrir. Ce n'était pas seulement du code mort : c'était une
**deuxième vérité**, et elle a coûté les CGV.

**Décision, slug par slug** (demandée par le mandat) :

| Slug | Porte-t-il un VRAI réglage ? | Décision |
|---|---|---|
| `compte` | Oui | **Relié** (déjà) |
| `notifications` | Oui | **Relié** (déjà) |
| `course` | **Oui** : les haptiques, persistées (`lib/haptics.ts`), lues par toute la chaîne de course | **Relié** sous « Pendant la sortie » |
| `profil` | Non, tout est dans `/profil-edit` | **Branche supprimée**, redirection conservée |
| `crew` | Non | **Branche supprimée**, redirection conservée |
| `carte` | Non : aucune préférence de couche n'est persistée, la carte dérive la sienne du contexte | **Branche supprimée**, redirection conservée |
| `apropos` | Non, mais elle portait les CGV | **Branche supprimée**, CGV remontées dans Réglages |
| `avance` | Non : trois constantes en lecture, déjà dans `/calcul-zones` | **Branche supprimée**, redirection conservée |

Les redirections restent : ce sont des liens profonds de compatibilité, pas des pages.

### 1.3 Deux réglages factices retirés

- **« Unités · Kilomètres »** (sous-page `course`). Une valeur en LECTURE au milieu d'une liste de
  réglages se lit comme un réglage. Or **rien dans l'app ne sait afficher des miles** : aucune
  conversion, aucune préférence persistée, `formatKm2` / `formatRate` partout. C'est le défaut
  exact déjà corrigé deux sous-pages plus loin sur « Couche par défaut · Auto ». Retirée. Le jour
  où les miles existeront, la ligne reviendra en interrupteur, pas en constat.
- **Trois clés de `SETTINGS_GLYPHS`** (`collection`, `crew`, `replayDiscovery`) décrivaient des
  lignes déjà retirées de l'écran. Le catalogue survivait à ses rangées ; `glyphs.test.ts` comptait
  19 entrées sans jamais vérifier qu'elles servaient. Retirées, et un test croise désormais le
  catalogue avec la source de l'écran.

### 1.4 Conséquence assumée : `/warroom` devient une orpheline visible

Le **seul** chemin nommé vers Missions était le `flags.warRoom` de la branche `crew`, elle-même
inatteignable. La route était donc **déjà** injoignable ; elle était masquée par du code mort.
Elle est inscrite dans `KNOWN_ORPHANS` avec sa raison, et le test `nav/tabs.test.ts` qui certifiait
sa « reachability » en cherchant une chaîne dans un fichier a été réécrit : il mesurait un faux vert.

---

## 2. Ce qu'il y avait : Profil, entrée par entrée

| Bloc | Contenu réel | Verdict | Décision |
|---|---|---|---|
| Porte de compte (invité) | Créer un compte / se connecter, ou dire que le serveur n'est pas configuré | Utile (lot 1) | **Intacte** |
| Identité | Photo, nom, ville, titre équipé, cadre et emblème de saison | Utile (G22) | Gardée |
| Niveau + crew | Deux liens compacts vers `/season` et l'onglet Crew | Utile | Gardé |
| Héros « Ton mouvement » | Jours actifs, quatre états de lecture | Utile | Gardé |
| Journal | Filtres course/vélo, calendrier 7 jours, période, 3 compteurs, **liste recopiée à la main** | Liste pauvre | **`JournalSection2026` monté à sa place** |
| Collection | Carte pleine largeur avec l'objet équipé | Utile | Gardée |
| Sorties de cet appareil | Rattachement des sorties enregistrées sans compte | Utile | Gardé |
| Amis (lien du bas) | `/amis` | Utile mais **mal placé** : après le journal, la collection et les sorties locales | **Remonté** dans le bloc social |
| Progression | `/season` | Utile | Gardé |
| Défis de la semaine | `/defis-semaine` | Utile | Gardé |
| Sources et appareils | `/sources` | **Doublon avec Réglages**, qui lui donne un groupe entier | **Retiré du Profil** |
| GRYD+ | `/premium` | Utile, distinct de `/abonnement` (l'offre vs le statut et les achats) | Gardé |
| **(absent)** | Inviter, montrer son code | **Manquant** : `/qr` existait et n'avait plus **aucune** porte depuis la réécriture de `(tabs)/profil.tsx` et `amis.tsx` | **Ajouté** : bloc social |

### 2.1 Le journal était plus pauvre que les données déjà lues

La ligne affichait : une date, des kilomètres, des minutes. Deux sorties de 5 km s'y ressemblaient
trait pour trait, et une sortie qui avait **pris du terrain** se lisait comme une sortie sans
capture. Or `history/real.ts` sélectionnait déjà l'allure, le statut et le reçu de capture :
personne ne les remontait jusqu'à la ligne. `features/journal/JournalSection2026` (préparé par le
lot journal) est monté à sa place : vignette du tracé, allure ou vitesse, terrain gagné, verdict
serveur. **Les quatre états restent à l'écran hôte** : lui seul sait distinguer « pas connecté »,
« lecture en cours », « échec » et « lu, et rien » (L8/L19).

---

## 3. Benchmark : GRYD · INTVL · Strava

Les colonnes INTVL reprennent la liste fournie par le fondateur et l'analyse déjà versée au dépôt
(`docs/product/GRYD_INTVL_ANALYSE_2026_09_10.md`, §1.1). Les colonnes Strava décrivent l'app iOS
publique.

| Fonction | GRYD (après ce lot) | INTVL | Strava | Écart et décision |
|---|---|---|---|---|
| **Voir / modifier son profil** | Réglages › Compte › Modifier mon profil, et une action directe sur l'identité du Profil | « Edit profile » | « Modifier le profil » | Aucun écart. |
| **Réglages de l'app** | Six groupes nommés | « App settings » | Un long écran unique | GRYD est plus rangé que les deux. Rien à reprendre. |
| **Confidentialité** | `/confidentialite` : audiences, zones protégées, export, suppression | « Privacy » | Visibilité des activités, **zones privées**, permissions des données | Aucun écart de fond : les zones protégées existent (G27, `privacy_zones`). |
| **Permissions de l'appareil** | **Nouvelle page** : position, photos, appareil photo, mouvement, lues réellement | Non exposé | « Permissions des données » | **Écart comblé.** Strava avait raison sur ce point. |
| **Notifications** | Matrice §14.1 servie par le serveur, plus l'état réel du push | Dans « App settings » | Push **et e-mail**, très granulaire | **E-mail hors périmètre** : GRYD n'envoie aucun e-mail transactionnel de jeu, un réglage serait un interrupteur sans destinataire. |
| **Abonnement / achats** | `/abonnement` : statut, tarif prévu, achats, gestion Store, CGV | « Plans & Purchases » | « Abonnement » | Aucun écart. Tension ADR-011 signalée, non tranchée ici. |
| **Intégrations / appareils** | `/sources` (G26), groupe dédié dans Réglages | « Integrations » | « Applications connectées » (Garmin, Apple Santé) | Aucun écart de place. **C'est pourquoi la ligne quitte le Profil** : les trois produits la mettent dans les réglages. |
| **Unités** | Aucune ligne | Non vu | Métrique / impérial | **Hors périmètre, capacité absente** : rien dans l'app ne convertit en miles. Une ligne serait un choix à une option. |
| **Aide / FAQ** | Guide interactif + chapitre FAQ + `/support` | « FAQs », « Support » | « Aide » | Aucun écart. |
| **Mentions légales** | CGU, **CGV**, confidentialité, à propos, crédits des données, licences | Non détaillé | « Mentions légales » | GRYD est plus complet (crédits de données, licences OSS). |
| **Se déconnecter** | En bas, avec état d'échec | Oui | Oui | Aucun écart. |
| **Inviter un ami** | **Nouveau** : bloc social du Profil, sans récompense | « Refer a friend, **Earn 10xp** » + remise sur INTVL Pro | « Partager le profil » (pas de parrainage rémunéré) | **Reprendre la place, rejeter le paiement** (§15.2). |
| **Ajouter des amis** | **Remonté** dans le bloc social, recherche serveur « Nom ou pseudo » | « Add friends » | « Contacts et suggestions d'amis » | **Carnet d'adresses hors périmètre** : lire les contacts pour suggérer des amis est un traitement de données de tiers ; ni consentement ni base légale ne sont posés (G27). |
| **Code de parrainage** | **Non peint** | « Enter referral code » | Non | **À faire, côté serveur d'abord.** Voir §5. |
| **QR / partage du profil** | `/qr`, reconnecté par « Mon code » | QR d'invitation | QR du profil, « partager le profil » | Écart comblé. Le scanner reste absent (aucune dépendance caméra ; le dire vaut mieux qu'un onglet mort). |
| **Statistiques sur le profil** | 3 compteurs + `/performance` + `/season` | Oui | Statistiques, trophées, activités | Aucun écart de structure. |

**Lecture d'ensemble.** L'écran de réglages d'INTVL est une bonne table des matières, et la nôtre
lui était déjà isomorphe : le gain n'était pas dans le contenu mais dans **le rangement** et dans
**deux pages manquantes** (CGV, permissions). Le seul enseignement de fond est la **place** du
social : INTVL le met en premier, parce que sa croissance vient du recrutement payé. Chez nous, la
même place revient à l'invitation, sans paiement, parce que le cahier le dit et parce que la boucle
mesurable est « rendez-vous vers membres », pas « installation ».

---

## 4. Ce qui a été fait

### Ajouté
1. **`/legal/cgv`** dans le groupe Légal de Réglages, à côté des CGU.
2. **`app/parametres/permissions.tsx`**, page neuve : position (expo-location), photos et appareil
   photo (expo-image-picker), mouvement (podomètre, réexporté de `features/setup`, jamais recodé).
   Cinq états jamais confondus, relecture au retour au premier plan (`AppState`), et
   « Ouvrir les Réglages iOS » **uniquement** quand l'OS a une entrée à montrer.
   **La page ne demande aucune permission** : chacune se demande au moment de son bénéfice.
3. **« Pendant la sortie »** → `/parametres/course`, page réelle que rien ne poussait.
4. **Bloc social du Profil** : Inviter un ami · Ajouter des amis · Mon code, sous l'identité.
5. Deux glyphes (`devicePermissions`, `duringActivity`), trois retirés.

### Retiré
« Mon journal », « Mon crew », « Ma collection » (doublons) · « Sources et appareils » du Profil
(doublon avec Réglages) · « Amis » du bas du Profil (remonté) · « Unités · Kilomètres »
(réglage factice) · cinq branches mortes de `[section].tsx` (~450 lignes) · trois glyphes orphelins.

### Verrouillé par des tests qui lisent la SOURCE
`src/features/settings/sections.test.ts` (portes de dernier recours, les deux documents
contractuels, pas de doublon d'onglet, aucune sous-page inatteignable, aucun glyphe orphelin) ·
`src/features/settings/profilSocial.test.ts` (les trois gestes, aucune récompense de parrainage,
aucune adresse morte dans le message, aucun champ de code) ·
`src/features/settings/devicePermissionRows.test.ts` (le bouton « Ouvrir les Réglages » et les cinq
familles d'états).

---

## 5. Parrainage : proposition

### 5.1 Pourquoi rien n'a été peint

`grep` dans `supabase/migrations` rend un résultat trompeur : la table **existe**.

- `0002_schema.sql` : `public.referrals (referrer_id, referee_id, activated_at, boost_expires_at)`,
  plus `users.referral_code text not null unique default encode(extensions.gen_random_bytes(4), 'hex')`.
- `0003_rls.sql` : lecture par les deux parties, insertion **par le parrain seulement**.

Et pourtant **rien ne fonctionne** :

1. **Aucune RPC ne transforme un code en lien.** Il n'existe aucune fonction qui prenne un
   `referral_code` et crée la ligne : le seul chemin d'insertion exige que le CLIENT connaisse
   l'`user_id` du filleul, que l'app n'expose jamais (c'est même une règle explicite de
   `features/social/profileLink.ts`).
2. **Aucune Edge Function n'écrit dans `referrals`.** `grep -rn "from('referrals')" supabase/` ne
   rend rien. `activated_at` et `boost_expires_at` ne sont jamais posés.
3. **La récompense prévue est interdite par le rang 0.** `packages/shared/src/game-rules.ts` porte
   `REFERRAL_BOOST_MULTIPLIER = 2` et `REFERRAL_BOOST_DAYS = 7` sous le titre « §3.7 Parrainage » :
   un multiplicateur de gain pendant sept jours. §15.2 du cahier dit l'inverse, en toutes lettres :
   « le parrainage ne donne ni XP ni points ni chance supplémentaire de gagner un prix ».
   Le badge `crew/recruiter` (« Active 5 recrues via ton parrainage ») pose la même question.
   **Tension à trancher par le fondateur**, hors périmètre d'un lot d'UI.

Peindre « Entrer un code de parrainage » aujourd'hui produirait donc un bouton mort **et** une
promesse de récompense interdite. Rien n'a été peint.

### 5.2 Ce que je propose, chiffré

**Nom** : « Premier rendez-vous » (le mot du cahier, §15.2).

**Récompense** : un **objet souvenir** de partage, non équipable comme avantage, sans effet de jeu.
Ni XP, ni points, ni chance supplémentaire, ni remise d'abonnement, ni jour de GRYD+.
**Il est donné aux DEUX**, et à tous les membres concernés d'une sortie de groupe : le cahier dit
« disponible à tous les membres concernés », et une récompense qui ne va qu'au parrain fabrique un
recruteur, pas un partenaire de sortie.

**Déclencheur** : une **sortie partagée réellement validée**, jamais une installation ni un clic.
Concrètement : les deux comptes ont une course de statut `valid` dont les fenêtres temporelles se
recouvrent, sur un même rendez-vous ou sur une même boucle. C'est la seule définition qui résiste à
un lien envoyé à cent personnes.

**Anti-abus, en chiffres** :

| Règle | Valeur proposée | Raison |
|---|---|---|
| Codes par compte | **1**, celui de `users.referral_code`, jamais régénérable | Un code qui tourne est un code qu'on revend. |
| Filleuls activés par parrain et par saison | **5** | Au-delà, ce n'est plus un cercle d'amis. |
| Un filleul a un parrain | **1** (index unique déjà posé en 0002) | Déjà vrai dans le schéma. |
| Délai maximal entre l'usage du code et la sortie validée | **30 jours** | Au-delà, la sortie n'a plus de rapport avec l'invitation. |
| Âge maximal du compte filleul à l'usage du code | **7 jours** | Empêche de « parrainer » des joueurs déjà installés. |
| Attribution | **100 % serveur**, dans la fonction d'ingestion, jamais le client | Règle constitutionnelle : tout claim est décidé serveur. |
| Réciprocité interdite | A parraine B **et** B parraine A : refusé | La paire fabrique deux souvenirs pour zéro nouvel utilisateur. |
| Même appareil / même IP | Signalé, pas bloqué | Deux colocataires existent ; un blocage dur punirait des vrais joueurs. |

**Ce qu'il faut côté serveur, dans l'ordre** :
1. une RPC `redeem_referral_code_2026(code text)` qui écrit `referrals` **au nom du filleul**
   (le seul qui possède le code saisi), avec les deux garde-fous d'âge et d'unicité ;
2. la pose de `activated_at` dans `ingest_run` quand la condition de sortie partagée est vérifiée ;
3. l'attribution de l'objet souvenir aux deux comptes, par le même chemin que les autres objets ;
4. la **suppression** de `REFERRAL_BOOST_MULTIPLIER` / `REFERRAL_BOOST_DAYS`, ou une décision
   écrite qui explique pourquoi ils survivent au §15.2.

**Ce que l'UI ajoutera alors, et seulement alors** : un champ « J'ai un code » dans la porte de
compte (pas dans Réglages : il ne sert qu'une fois, à l'arrivée), et une ligne « Mon code » dans le
bloc social existant. Aucun compteur de filleuls sur le Profil : ce n'est pas un score.

---

## 6. Écarts assumés, et pourquoi

| Écart | Raison |
|---|---|
| Pas de réglage d'**unités** (miles) | Capacité réelle absente : aucune conversion n'existe dans le code. |
| Pas de notifications **e-mail** | GRYD n'envoie aucun e-mail de jeu : l'interrupteur n'aurait aucun destinataire. |
| Pas de **contacts / suggestions d'amis** | Traitement de données de tiers sans base légale ni consentement posés (G27). |
| Pas de **code de parrainage** | Aucune RPC, aucune écriture serveur ; et la récompense prévue par l'ancien schéma est interdite par §15.2. |
| Pas de **scanner de QR** | Aucune dépendance caméra de scan dans `apps/mobile/package.json` ; `/qr` le dit déjà. |
| Le **lien de profil** ne part pas dans le message d'invitation | Aucune page ne répond sur le domaine (O10, `apps/web` n'a pas de route `/u/`). Une note d'écran protège celui qui partage, pas celui qui reçoit. Le message porte le pseudo, qui est cherchable dans `/amis` aujourd'hui. |
| Pas de réglage de **carte** | Aucune préférence de couche n'est persistée : la carte dérive la sienne du contexte. |
