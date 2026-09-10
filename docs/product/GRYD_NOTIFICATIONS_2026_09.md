# GRYD — Notifications : le producteur, la boîte, et la push qu'on prépare sans l'allumer

**11/09/2026.** Demande du fondateur, mot pour mot : « mets en place un producteur de
notification, les notifications doivent être courtes avec un emoji ».

Référence de rang 0 : `GRYD_REFONTE_INTEGRALE_2026_09.md` §14. Décision d'appui : ADR-013 §5
(« canal principal = centre d'activité in-app »), dont la **tension n° 1 — APNs : oui ou non ? —
reste ouverte** et n'est pas tranchée ici.

---

## 1. L'état d'avant, mesuré

Le moteur existait et **décidait dans le vide** :

| Fait | Vérifié le 11/09/2026 |
|---|---|
| `notification_preferences_2026` (0140) | Table + 2 RPC, lues par l'écran de réglages. |
| `can_notify_2026` / `claim_notification_2026` (0141) | Budget, plage calme, déduplication. **Trois appelants**, tous dans 0186 (parrainage). |
| `NOTIFICATION_RULES_2026` | Constantes du cahier, dérivées par `_shared/push.ts`. |
| `public.notifications` (0006 + `event_id` de 0188) | Boîte de réception réelle. Lue par **un seul** écran (`useSeasonRecap`, type `season`). |
| `app/activite.tsx` | Centre d'activité **orphelin** : aucun `router.push('/activite')` dans le dépôt. |
| `useActivityBell` | **Importé nulle part.** |
| Push distant | **Impossible** : `plugins/withoutPushEntitlement.js` retire `aps-environment`, aucun `google-services.json`. |

Autrement dit : les faits du jeu n'arrivaient à personne, et la seule sollicitation décidée
(le parrainage) n'était emportée par aucun canal.

---

## 2. Ce qui est livré

### 2.1 La boîte de réception (`0192_notification_inbox_2026.sql`)

**Aucune table neuve.** `public.notifications` **est** la boîte : RLS propriétaire en lecture,
`grant update (read_at)` au seul concerné, index des non-lus, publication temps réel (0020),
et depuis 0188 l'index unique partiel `(user_id, event_id)` — la déduplication de §14.3 en
**contrainte**, pas en politique. 0188 avait déjà écrit le refus d'une seconde inbox : « En créer
une seconde aurait donné deux inbox à réconcilier ». Le nom de fichier réservé est conservé ; la
table, non.

Ce que 0192 ajoute :

- trois familles à la contrainte `type` : `capture`, `result`, `event` (`crew` et `reward`
  existaient) ;
- **le catalogue gelé de 21 faits** (`notification_kinds_2026`) : catégorie §14.1,
  transactionnalité, priorité P0-P6, **emoji**, préfixe d'identifiant, modèle de lien. Miroir
  exact de `NOTIFICATION_EVENTS_2026` (`packages/shared`), comparé champ par champ par le test
  PGlite, **emoji compris** ;
- trois RPC de lecture : `my_notifications_2026(limit, before)`,
  `mark_notifications_read_2026(ids)`, `unread_notifications_count_2026()` ;
- `claim_notification_2026` **garde sa signature et sa décision** (0141 est appelée, pas
  réécrite) et écrit désormais aussi la ligne de réception.

### 2.2 La règle écrite : quand un refus entre quand même dans la boîte

§14.2 met « centre d'activité » et « push si demandé » dans **deux colonnes** : ce sont deux
canaux. §14.1 borne « 3 sollicitations non transactionnelles par semaine, push et email
confondus » — une sollicitation **va chercher** quelqu'un ; une ligne de boîte **attend** qu'on
ouvre l'application. Le budget gouverne donc l'un et pas l'autre.

| Verdict de `can_notify_2026` | Ligne de réception | Budget consommé |
|---|---|---|
| `allowed` | oui | **oui** |
| `quiet_hours`, `activity_in_progress` | oui | non |
| `daily_budget`, `weekly_budget`, `monthly_offer_budget` | oui | non |
| `category_off`, `game_paused` | oui | non |
| `event_invalid`, `blocked` | **non** | non |
| `duplicate` | rien de neuf (index unique) | non |

Les cinq premiers refus disent « pas maintenant, pas comme ça », jamais « ce fait est faux ».
Les taire ferait qu'un joueur ne saurait **jamais** qu'il a été averti parce qu'un autre message
était passé le matin même. `category_off` et `game_paused` suivent la même logique : le réglage
coupe les **sollicitations**, il n'efface pas l'histoire du compte — un avertissement de crew
invisible, et le retrait qui suit devient incompréhensible (L8). Les deux derniers, eux, ne sont
pas des reports : §14.3 demande d'« annuler un message devenu faux », et « jamais si auteur
bloqué ».

### 2.3 Les producteurs (`0193_notification_producers_2026.sql`)

Huit déclencheurs, posés sur le **fait** et pas sur ses portes. « Un nouveau membre » a six
portes d'entrée vivantes ; poser l'appel dans chacune, c'est en oublier une le jour où une
septième naîtra.

| Fait en base | Déclencheur | Destinataire | Notification (FR) |
|---|---|---|---|
| `capture_events_2026` inséré en `pending` | trigger | l'auteur | ⏳ **Vérification en cours** · Ta sortie est enregistrée. |
| `pending → scheduled` (réadmise, 0187) | trigger | l'auteur | ✅ **Résultat prêt** · Ta sortie est analysée. |
| `→ published` (0156) | trigger | l'auteur | 🏁 **Boucle validée** · Ton terrain est sur la carte. |
| `→ rejected` (0187 verdict, ou expiration 24 h de 0156) | trigger | l'auteur | ⛔ **Sortie non retenue** · Elle ne prend pas de terrain. |
| ligne de `crew_members` | trigger | le nouvel arrivant | 👋 **Tu as rejoint {crew}** |
| ligne de `crew_members` | trigger | les membres déjà là | 👥 **{handle} a rejoint {crew}** |
| `crew_events` inséré (0085) | trigger | les membres, sauf l'hôte | 📅 **Sortie proposée dans {crew}** |
| `revision_2026` change (0124) | trigger | **les inscrits seuls** | 🔁 **Le rendez-vous a changé** · Les détails sont à jour dans {crew}. |
| `cancelled_at_2026` posé (0124) | trigger | **les inscrits seuls** | 🚫 **Le rendez-vous est annulé** |
| `crew_announcements` inséré (0096) | trigger | les membres, sauf l'auteur | 📣 **Annonce du capitaine** · Elle t'attend dans {crew}. |
| `crew_challenges_2026 → active` (0122) | trigger | le roster réservé | ⚔️ **Le défi commence** · Ton crew est engagé. |
| `crew_challenges_2026 → final` (0122) | trigger | le roster réservé | 🏆 **Le résultat de votre défi est prêt** |
| `weekly_quest_assignments_2026 → completed` (0167) | trigger | le joueur | 🎯 **Défi de la semaine accompli** · Ta récompense t'attend. |
| `level_reward_ownership_2026` inséré (0144) | trigger | le joueur | 🏅 **Nouvelle récompense** · Elle est dans ta collection. |
| Parrainage abouti (0186, **existait**) | appel direct | filleul et parrain | 🎁 **Parrainage réussi** · Vos récompenses sont là. |
| Les six faits de crew de 0188/0189/0190 (**existaient**) | `crew_notify_2026` | selon le fait | 📥 ✉️ 📜 ⚠️ 🚪 📕 |

**Décisions de forme, et pourquoi :**

- **Une ligne par SORTIE, pas par face.** `capture_events_2026` porte une ligne par face de la
  carte : une boucle qui en touche quatre en écrit quatre. La clé d'événement porte le `run_id`,
  et l'index unique fait le reste. Le regroupement de §14.3 est tenu par une contrainte.
- **Aucune surface dans le message.** Au moment où la première face bascule, les autres ne sont
  pas publiées : tout total écrit là serait partiel. Le chiffre vit sur l'écran de la sortie.
- **Le refus ne dit pas le soupçon.** `result_refused` couvre le verdict d'opérateur et
  l'expiration de 24 h, et dit le même fait. Les raisons restent dans `anticheat_reviews`
  (ADR-015 : une suspicion est une donnée sensible).
- **Créer un crew n'est pas une arrivée.** Quand la ligne est la première du crew, personne
  n'est prévenu.
- **Le lieu n'entre jamais dans un payload de rendez-vous.** `place_label` est une information
  de membre (0152), protégée par sa propre modération d'adresse (0085).
- **Aucun nom de tiers dans un retrait** (§2.5) : le journal interne garde qui a décidé.
- **Aucun producteur ne consomme le budget §14.1.** Aucun canal distant n'existe ; consommer un
  quota pour un message que rien n'emporte ferait taire de vraies sollicitations plus tard
  (raison déjà écrite par 0188). Le jour du push, c'est le **dispatcheur** qui appellera
  `claim_notification_2026` avant d'envoyer.

### 2.4 Le texte, et où il vit

**Aucune phrase n'est écrite en base.** Le serveur écrit un **fait** et ses paramètres ; la copie
vit dans `apps/mobile/src/i18n/catalog/notifications.ts`, où le type `Entry` impose les **cinq
langues** (une traduction oubliée est une erreur TypeScript). Même décision qu'en 0188, pour la
même raison : du français en base fige un message dans une seule langue (L18).

**L'emoji, lui, est en base** : il ne se traduit pas, et le figer empêche deux producteurs d'en
choisir deux pour le même fait. Un test refuse en plus tout emoji **dans** une phrase : il y en
aurait deux à l'écran.

« Courtes » est **mesuré**, pas espéré : 60 caractères de titre, 140 de corps
(`NOTIFICATION_INBOX_2026`), vérifiés sur les cinq langues. Un paramètre manquant ne fait jamais
de phrase à trou : « Tu as rejoint **ton crew** » plutôt que « Tu as rejoint  ».

### 2.5 Le circuit, de bout en bout

```
un fait du jeu (une capture publiée, un membre qui entre, un défi qui se clôt)
        │
        ▼  trigger SQL (0193)  ·  ou appel direct de claim_notification_2026 (0186)
notification_inbox_write_2026 ── catalogue gelé (famille, priorité, emoji, préfixe)
        │
        ▼  insert … on conflict (user_id, event_id) do nothing   ← la déduplication §14.3
public.notifications   [ user_id · type · priority · payload{event, params} · event_id · read_at ]
        │
        ▼  my_notifications_2026 / unread_notifications_count_2026  (RLS propriétaire, auth.uid())
l'application  ── i18n/catalog/notifications (5 langues) ──▶  emoji + titre + corps
        │
        ├── la CLOCHE, en-tête de la carte (44 pt) : compteur si unread > 0, sinon RIEN
        └── /notifications : groupé par jour, tap → lien profond + marquage lu

           ✗ le push distant s'arrête ici : aucun entitlement, aucune clé, aucun dispatcheur.
```

### 2.6 Le mobile

- **La cloche** vit dans l'en-tête de la carte (`MapHome.tsx`), **pas** dans la barre de
  navigation : celle-ci a trois destinations et jamais une quatrième (spec §2.1). Le compteur
  n'existe que si `unread > 0` et **disparaît** une fois lu. Un échec de lecture ne peint rien :
  « je ne sais pas » n'est pas « il n'y a rien ». Interdit tenu : la pastille rouge permanente
  (G24) et le « 0 » nu (L14).
- **`/notifications`** : groupé par jour (aujourd'hui, hier, puis la date, sans `Intl` que Hermes
  n'embarque pas toujours), emoji + titre + corps, point de non-lu, tap qui ouvre le lien profond
  **et** marque lu, « Tout marquer comme lu », quatre états honnêtes, lien vers les réglages.
  **Rien ne disparaît en étant lu** : c'est un journal, pas une file à vider. Une ligne sans lien
  (crew dissous, retrait) n'est pas pressable et ne porte pas de chevron.
- **`/activite`** redirige vers `/notifications` : pas de route morte.
- Relecture à l'ouverture et au retour au premier plan, **bornée à une fois par minute**. Aucun
  `setInterval`.
- Les lignes d'**avant** ce lot (`digest`, `season`, écrites par les jobs Edge) gardent leur texte
  figé plutôt que d'être cachées. Une ligne sans fait **ni** texte n'est ni servie ni comptée :
  le compteur ne promet jamais un non-lu introuvable dans la liste.

---

## 3. Les dix lignes de §14.2, cochées

| # | Déclencheur du cahier | État | Ce qui le porte, ou ce qui manque |
|---|---|---|---|
| 1 | Résultat terminé après attente | ✅ **livré** | `result_pending` ⏳ puis `result_ready` ✅ (in-app). Une notification **locale** existe déjà en parallèle (`resultReadyNotice.ts`) : voir §4.4. |
| 2 | Sortie suivie demain (rappel choisi) | ❌ **non livré** | **Aucun support serveur** : ni table de rappel, ni échéance, ni job. `RendezvousOptIn.tsx` programme une notification **locale** sur l'appareil, et c'est tout. Il manque le job et le calcul de l'échéance (`crew_events.starts_at` + `crew_event_rsvps` existent). |
| 3 | Modification ou annulation | ✅ **livré** | `crew_outing_changed` 🔁 et `crew_outing_cancelled` 🚫, **aux inscrits seuls**, transactionnels. La clé porte la révision : une seconde correction est un second fait. |
| 4 | Demande d'adhésion acceptée | ✅ **livré** | `crew_joined` 👋 (« Tu as rejoint {crew} »), quelle que soit la porte d'entrée. |
| 5 | Mention utile | ❌ **non livré** | Aucune mention n'existe en base : `crew_messages_2026` (0127) n'a ni mention, ni fil de réponse. Le fait n'est pas produit, donc rien n'est déclaré. |
| 6 | Défi terminé | ✅ **livré** | `crew_challenge_ended` 🏆, sur `→ final` **seulement** : une publication intermédiaire n'est pas un résultat. |
| 7 | Récap hebdomadaire choisi | ⚠️ **partiel** | `digest_job` (Edge) écrit déjà une ligne `digest` que le centre **affiche** ; mais 0039 le laisse explicitement **non planifié** (« cadence/soir + quiet hours à trancher »). Rien ne le déclenche aujourd'hui. |
| 8 | Retour après 14 jours | ❌ **non livré** | Aucun producteur. §14.4 exige d'espacer puis d'arrêter, et les exclusions (pause, blessure déclarée, opt-out) n'ont pas toutes de support. **À ne pas bricoler.** |
| 9 | Nouvelle collection | ❌ **non livré** | Catégorie `offers`, opt-in désactivé par défaut (0140), et aucun catalogue n'est publié (ADR-014 : rien n'est en vente). Une offre sans produit serait une promesse. |
| 10 | Incident compte/paiement | ❌ **non livré** | Aucune vente n'est ouverte (ADR-014) : il n'existe aucun incident à porter. |

**Livré en plus des dix lignes** (des faits que le cahier n'énumère pas mais que le jeu produit) :
terrain publié 🏁, sortie non retenue ⛔, quête hebdo accomplie 🎯, récompense de niveau 🏅,
parrainage réussi 🎁, nouveau membre vu par les membres 👥, annonce du capitaine 📣, défi
commencé ⚔️, sortie proposée 📅, plus les six faits de crew de 0188 (candidature 📥,
invitation ✉️, charte 📜, avertissement ⚠️, retrait 🚪, dissolution 📕).

**Volontairement muet**, et il faut le dire : l'expiration d'une quête hebdo (0167 : « aucune
relance sur un échec », §4.2), l'annulation d'un défi faute de roster (un reproche déguisé), une
annonce retirée, et la reprise de terrain par un rival — « alimente le journal du jeu et le
résumé choisi, pas une alarme immédiate » (§14.2, dernière ligne).

---

## 4. La push : ce qu'elle exigera

**Elle n'est pas activée, et rien dans l'application ne la promet** : aucun jeton n'est collecté
par ce lot, aucun écran n'annonce un envoi. La décision d'ouvrir APNs appartient au fondateur
(ADR-013, tension n° 1).

### 4.1 Ce qui existe déjà (à ne pas reconstruire)

| Brique | Où | État |
|---|---|---|
| Table de jetons | `push_devices` (0048) | Existe, avec sa RLS. |
| Envoi Expo | `supabase/functions/_shared/expo-push.ts` | Existe, testé. |
| Garde-fous d'envoi | `_shared/push.ts#canPush` | Existe, **mais dérive de constantes héritées** : le moteur qui fait foi est `claim_notification_2026` (0141). |
| Enregistrement de l'appareil | `features/notifications/push.ts` + `remotePushCapability.ts` | Existe, et **refuse de demander la permission** tant que le build ne peut pas recevoir. |
| Boîte de réception | `public.notifications` (0192) | Livrée par ce lot : c'est la **source** du dispatcheur. |

### 4.2 Ce qui manque, avec l'effort

| # | À faire | Qui | Effort |
|---|---|---|---|
| 1 | Clé APNs `.p8` via `eas credentials`, sur le compte Apple du fondateur | fondateur | ~30 min, une fois |
| 2 | `google-services.json` (FCM) pour Android | fondateur | ~30 min, une fois |
| 3 | Retirer `plugins/withoutPushEntitlement.js` d'`app.json`, remettre le bloc `expo-notifications`, rebuild EAS | dev | ~1 h + build |
| 4 | Déclarations « App Privacy » : un jeton de push est une donnée liée au compte | dev | ~1 h |
| 5 | Edge `push_dispatch` : lire les lignes **non lues** de `public.notifications`, appeler `claim_notification_2026` **avant** chaque envoi, rendre le texte depuis le catalogue dans la langue du compte, envoyer via `expo-push.ts`, journaliser | dev | **1,5 à 2 j** |
| 6 | Langue du compte côté serveur : le dispatcheur doit rendre le texte, or aucune colonne de langue n'existe (`progress_accounts_2026` ne porte qu'un fuseau). Il faut la stocker, ou porter le catalogue serveur en cinq langues | dev | ~0,5 j |
| 7 | Planifier `digest_job` (§14.2 ligne 7), avec la cadence et la plage calme que 0039 a laissées ouvertes | dev | ~0,5 j |
| 8 | Le job de rappel de rendez-vous (§14.2 ligne 2) : échéance, exclusions (annulé, désinscrit), un seul rappel | dev | ~1 j |

### 4.3 Le contrat que le dispatcheur devra tenir

1. **Une seule porte de décision** : `claim_notification_2026`, jamais `_shared/push.ts#canPush`,
   qui dérive de constantes héritées. La ligne de réception existe déjà ; le dispatcheur décide
   seulement s'il faut **aller chercher** le lecteur.
2. **Le budget devient réel** : aujourd'hui `notification_log_2026` ne compte qu'une chose (le
   parrainage). Le jour de l'envoi, il compte tout — donc 3 par semaine, 1 par jour.
3. **Ne jamais pousser une ligne déjà lue** : `read_at is not null` = le joueur a vu, l'envoi est
   annulé (§14.3, « message déjà vu »).
4. **Un appui sur une notification expirée ouvre une explication**, pas une page cassée : le
   `deep_link` est déjà résolu côté serveur et vaut `null` quand un paramètre manque.
5. **Rien de sensible dans l'aperçu verrouillé** (§14.3) : le lieu d'un rendez-vous n'est déjà
   pas dans le payload ; le corps d'une annonce non plus.

### 4.4 Deux points à trancher **avant** d'allumer

- **Le double canal du résultat.** `resultReadyNotice.ts` envoie déjà une notification **locale**
  « ton résultat est prêt », avec son propre journal et son propre budget côté appareil. Le
  producteur serveur `result_ready` écrit la ligne de réception. Aujourd'hui les deux ne se
  marchent pas dessus (rien n'est poussé). Le jour du push, **un seul des deux canaux** doit
  porter ce message, sans quoi le joueur le recevra deux fois.
- **Le budget déjà consommé par le parrainage.** 0186 appelle `claim_notification_2026` et
  consomme donc un quota pour un message que rien n'emporte. C'est le comportement en production
  depuis 0186 ; il n'est pas modifié ici, mais il faudra le revoir le jour où le quota gouvernera
  de vrais envois.

---

## 5. Preuve

| Vérification | Résultat |
|---|---|
| `supabase/tests/notification_inbox_2026.pglite.test.mjs` | 24 vertes, dont l'**étape 0** (avant 0192 : aucune RPC de lecture, `claim` accepte sans rien écrire, trois familles refusées par la contrainte). |
| `supabase/tests/notification_producers_2026.pglite.test.mjs` | 25 vertes, dont l'**étape 0** (avant 0193 : une capture publiée, un nouveau membre, une sortie annulée, une annonce, un défi clos, une quête accomplie et une récompense ne produisent **aucune** ligne). |
| `npm run test:sql` | 80 fichiers verts. |
| `notificationInbox2026.test.ts` | 15 vertes (catalogue complet, longueurs sur 5 langues, aucun emoji dans une phrase, aucune phrase à trou, groupement par jour, badge nul à zéro). |
| `notificationCouture.test.ts` | 10 vertes (les portes, la pastille conditionnée, trois onglets et pas quatre, les RPC autorisées, les quatre états, aucun nombre magique, aucun sondage). |
| `npm run test:mobile` · `npm run test:functions` · `npm run typecheck` · `node scripts/audit-routes.mjs` | verts. |

**Ce qui n'est pas prouvé ici**, et qu'aucun vert ne doit laisser croire : PGlite tourne en
superutilisateur et n'a pas PostGIS. Les privilèges sont vérifiés au catalogue, jamais un refus
vécu par un rôle restreint — la preuve réelle est `npm run verify:rls` **après** le push des
migrations. Et aucune notification n'a encore été vue sur un appareil : la recette visuelle du
centre et de la cloche reste à faire.

---

## 6. Migrations à pousser

`0192_notification_inbox_2026.sql` · `0193_notification_producers_2026.sql`
(prod à `0191` au 11/09/2026 ; `supabase migration list` avant tout push, Codex écrit sur le même
projet).
