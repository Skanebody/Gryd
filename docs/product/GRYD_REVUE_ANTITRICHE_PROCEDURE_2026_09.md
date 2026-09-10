# GRYD — Procédure de revue anti-triche

**Date : 14/09/2026 · Lot V · Ferme le chantier n° 1 d'ADR-015.**
Sources : `docs/product/GRYD_ANTITRICHE_2026_09.md` §6 et §8 · ADR-015 ·
migrations `0081_anticheat_review.sql`, `0155_capture_admission_2026.sql`,
`0156_capture_pending_resolution_2026.sql`, `0174_anticheat_mocked_location_2026.sql`,
`0187_anticheat_operator_2026.sql`.

---

## 0. La réponse courte

Avant ce lot, une sortie envoyée en vérification était **définitivement non
créditée** : la file existait, personne ne la dépilait. Désormais un modérateur
ouvre `Réglages → Modération → File de vérification`, lit le dossier, et tranche.

Une seule chose n'a pas de solution : **le terrain d'une sortie gelée expire
24 h après la fermeture de la boucle.** Passé ce délai, la validation reste
vraie — la sortie est reconnue honnête, les XP reviennent, le dossier se ferme —
mais le territoire ne revient pas. Cette échéance appartient à l'horloge, pas au
modérateur : elle est écrite sur l'écran de celui qui décide, et **elle n'est
promise à personne**.

---

## 1. Se nommer modérateur

Aucune habilitation n'existe en base : la table `moderators_2026` est vide, et le
dépôt n'en fabrique aucune (0 donnée inventée, CLAUDE.md). L'attribution est une
commande SQL nominative, à exécuter dans le **SQL Editor** du projet Supabase
`gryd` (`sydwxwwirinjoheeodcg`) ou via `psql` avec la chaîne de service.

**La seule variable est l'adresse e-mail.**

```sql
-- 1. NOMMER. Idempotent : rejouer la commande ne crée pas de doublon.
insert into public.moderators_2026 (user_id, note)
select u.id, 'fondateur'
from auth.users u
where u.email = 'benjaminbel@outlook.fr'
on conflict (user_id) do nothing;
```

```sql
-- 2. VÉRIFIER. Trois lignes attendues : le compte d'authentification existe,
--    le profil de jeu existe (obligatoire : `anticheat_reviews.operator_id`
--    référence `public.users`), et l'habilitation est posée.
select
  (select count(*) from auth.users     where email = 'benjaminbel@outlook.fr') as compte_auth,
  (select count(*) from public.users   where id in
     (select id from auth.users where email = 'benjaminbel@outlook.fr'))       as profil_jeu,
  (select count(*) from public.moderators_2026 where user_id in
     (select id from auth.users where email = 'benjaminbel@outlook.fr'))       as habilitation;
```

Les trois colonnes doivent valoir `1`. Si `profil_jeu` vaut `0`, la clôture
échouera avec `moderator_profile_missing` : le compte n'a jamais ouvert
l'application (le profil est provisionné à l'inscription, migration 0154).

```sql
-- 3. RETIRER, le jour venu. Le journal des décisions déjà rendues n'est pas
--    touché : `anticheat_review_journal_2026.moderator_id` passe simplement à
--    NULL si le COMPTE disparaît, jamais si l'habilitation est retirée.
delete from public.moderators_2026
where user_id in (select id from auth.users where email = 'benjaminbel@outlook.fr');
```

**Dans l'application**, la ligne « Modération » apparaît dans les Réglages à la
prochaine ouverture de l'écran. Elle n'est pas grisée ni « bientôt » quand
l'habilitation manque : **elle n'est pas peinte**. Un joueur ordinaire n'apprend
donc pas qu'une file de modération existe.

---

## 2. Le délai annoncé au joueur : AUCUN, et c'est délibéré

L'écran d'appel du joueur (`apps/mobile/app/appel.tsx`, E28) dit aujourd'hui :

> « Aucun délai ne t'est annoncé, parce qu'aucun ne serait vrai aujourd'hui.
> Quand une décision sera prise, elle s'affichera ici. »

**Cette phrase reste inchangée.** 72 h avaient été envisagées : c'est refusé, et
pour une raison mesurable, pas par prudence de principe.

* La seule échéance que du CODE tient est celle de
  `resolve_pending_captures_2026` (0156) : **24 h après la fermeture de la
  boucle**, pas après l'ouverture du dossier. Un joueur qui envoie sa sortie à
  23 h 50 laisse dix minutes utiles.
* Annoncer 72 h reviendrait donc à promettre un examen *après* que le terrain
  est perdu — une promesse tenue sur la forme et fausse sur le fond. C'est
  exactement la faute que 0081 et le catalogue de E28 avaient refusé de commettre
  (« ne pas y remettre un délai tant qu'une personne ne traite pas réellement la
  file »).
* Un modérateur unique, non astreint, ne tient aucune échéance : une astreinte
  se décide, elle ne se code pas.

**Ce qui pourrait rendre un délai honnête**, et qui n'est pas fait ici : allonger
la fenêtre d'expiration pour les seules faces `verification_required`. C'est un
arbitrage produit (jusqu'où accepte-t-on de réécrire la carte après coup ?
§5.5 dit « limiter les réécritures tardives »), à trancher avec des dossiers
réels — pas dans un lot d'outillage.

---

## 3. Ce que le modérateur voit, et ce qu'il décide

`Réglages → Modération → File de vérification` (`/moderation`).

La file est servie par `anticheat_reviews_pending_2026(25)` : les dossiers non
clos, **du plus ancien au plus récent**. Chaque dossier porte :

| Champ | D'où il vient |
|---|---|
| Pseudo public, ou 8 caractères d'identifiant | `user_profiles.handle` (jamais l'e-mail) |
| Score de vérification, 0-100 | `anticheat_reviews.suspicion` (moteur pur) |
| Mesures qui ont pesé, avec leurs **preuves chiffrées** | `anticheat_reviews.signals` (0081) |
| Distance, durée, allure, date de la sortie | `runs` |
| État du territoire | `runs.game_status_2026` |
| Le mot du joueur | `anticheat_appeals.message`, s'il a fait appel |

Un seul dossier s'ouvre à la fois (§A : un seul CTA chartreuse par écran). Ce
n'est pas qu'une règle de charte : dix boutons « Valider » alignés poussent au
traitement à la chaîne, or une revue humaine n'est utile que si elle ne l'est
pas.

**Deux verdicts, une note, une confirmation.** La note est conservée dans le
journal ; elle n'est jamais montrée au joueur.

---

## 4. Critères de décision, mesure par mesure

Rappel de cadrage (ADR-015) : **un faisceau qui converge suspend, il ne condamne
pas**, et un faux positif coûte cher — refuser une course honnête, c'est laisser
un rival garder un quartier. En cas de doute réel : **valider**. Le système est
réglé pour n'escalader que sur des signaux qui ne se trompent quasiment jamais ;
si un dossier ne se comprend pas, c'est le réglage qui est en cause, pas le
joueur.

Les onze mesures que `packages/engine/src/anticheat.ts` émet, et ce qu'un humain
en fait :

| Mesure | Ce qu'elle constate | Rejeter si… | Valider si… |
|---|---|---|---|
| **Vitesse soutenue** (`sustained_speed`) | part de la sortie au-delà de l'allure plancher, sur fenêtre glissante de 5 min | la vitesse tient sur toute la sortie, sans variation, à un rythme de véhicule | la pointe est courte, isolée, ou la discipline déclarée est le vélo |
| **Discipline** (`discipline_mismatch`) | vitesse de vélo déclarée « course » **et** zéro pas mesuré | vitesse de vélo soutenue, podomètre à zéro **mesuré**, sur une longue sortie | le podomètre est absent (téléphone en sac, appareil sans capteur) : c'est une donnée manquante, pas une preuve |
| **Podomètre et distance** (`step_coherence`) | pas par mètre hors des bornes pédestres | ratio proche de zéro sur une sortie longue déclarée course | poussette, sac à dos, téléphone à la main, trottinette déclarée : le ratio se casse sans qu'il y ait tricherie |
| **Position simulée** (`mocked_location`) | Android déclare un fournisseur simulé | vrai, et la trace est par ailleurs anormale | vrai seul : un développeur, un émulateur, un appareil rooté pour d'autres raisons. **Ne jamais rejeter sur ce seul signal** |
| **Précision du GPS** (`gps_accuracy`) | uniformité anormale de la précision annoncée | uniformité parfaite **et** trace trop régulière : signature de simulateur | uniformité seule : certains appareils annoncent une précision constante |
| **Sauts** (`gps_jumps`) | téléportations entre deux points | sauts nombreux, réguliers, sans retour | quelques sauts : tunnels, canyon urbain, reprise après perte de signal |
| **Accélération** (`acceleration`) | dépassement de l'accélération humaine maximale | dépassements répétés et propres | un seul pic : c'est presque toujours un artefact GPS |
| **Régularité du tracé** (`trace_regularity`) | dispersion de vitesse trop faible pour un humain | dispersion quasi nulle sur toute la sortie | tapis, piste, home trainer : un humain peut être très régulier |
| **Distance et durée** (`distance_time_ratio`) | rapport hors bornes de la discipline | incohérent **et** confirmé par une autre mesure | seul : souvent une conséquence du filtrage des points |
| **Trace déjà vue** (`duplicate_trace`) | empreinte proche d'une trace antérieure | — | **toujours indisponible aujourd'hui** : aucune empreinte antérieure n'est conservée. Ne jamais s'appuyer dessus |
| **Horodatages** (`future_timestamps`) | points datés dans le futur | part importante des points | quelques points : dérive d'horloge de l'appareil |

**Ce que ces mesures ne voient pas**, et qu'aucune décision ne doit prétendre
voir (ADR-015, angles morts verrouillés par des tests) : un scooter à 45 km/h est
indiscernable d'un cycliste rapide ; l'altitude n'est pas collectée ; la
régularité d'échantillonnage est détruite par la décimation côté client. Ne pas
rejeter « parce que ça sent le vélo » : la donnée qui le dirait n'existe pas.

**Ce qui n'est jamais un critère** : le pseudo, la date d'inscription, le
classement, l'ancienneté, la fréquence des sorties, le fait qu'un joueur ait déjà
été vérifié. Le dossier se juge sur ses mesures.

---

## 5. Ce que fait réellement chaque verdict

`resolve_anticheat_review_2026(review_id, verdict, note)` — modérateurs
uniquement, **jamais sur sa propre sortie** (le serveur refuse), idempotente
(rejouer un verdict ne rejuge rien), journalisée.

### « Valider »

1. La revue passe `closed` / `overturned`, avec l'opérateur, la date et la note.
2. L'appel du joueur, s'il existe, se ferme avec la **même** décision.
3. `runs.anticheat_cleared_2026` est écrit : un renvoi de la sortie ne pourra plus
   redemander la vérification (`ingest_run/refonte2026.ts` lit ce fait).
4. Les faces de territoire encore gelées par cette vérification repassent en
   `scheduled` : elles publient au prochain tick (`publish_capture_events_2026`,
   toutes les minutes).
5. L'évidence sportive redevient `eligible` : **les XP sont recalculées à la
   prochaine sortie du joueur**, pas à l'instant de la décision (le grand livre
   est du TypeScript pur, sans équivalent SQL).

L'écran rend les nombres exacts : combien de portions repartent, combien avaient
déjà expiré, combien restent en attente faute d'origine confirmable.

### « Rejeter »

1. La revue passe `closed` / `upheld`, l'appel aussi.
2. Les faces gelées deviennent un **refus daté**, motif conservé — même choix
   qu'à l'expiration (0156) : le statut porte la finalité, la raison continue de
   porter la cause.
3. `runs.anticheat_cleared_2026` reste NULL : rien ne prétend que la sortie a été
   validée.
4. La sortie reste enregistrée comme **sport** (`runs.status = 'valid'`) : §5.2
   interdit de présenter une sortie sans terrain comme un échec.

### Deux cas qui ne se réparent pas

* **Terrain déjà expiré** (plus de 24 h). La validation est enregistrée, mais
  aucune face ne repart. L'écran le dit (`captureExpired`), et la procédure le
  dit ici : ce n'est pas un bug, c'est §5.5.
* **Origine non confirmable** (la sortie n'a aucune session d'enregistrement
  rattachée). La face reste en attente avec son vrai motif,
  `no_recording_session`, et suivra le sort des autres attentes. La validation
  reste vraie ; c'est le terrain qui manque d'ancrage serveur, pas l'honnêteté du
  joueur.

---

## 6. Ce que le joueur voit

Sur `Réglages → … → Vérification` (E28, route `/appel`) :

* le motif système et **les mesures concernées** (jamais les seuils, jamais le
  score — §11.2) ;
* le statut du dossier, et la **décision finale** dès qu'elle existe
  (« maintenue », « annulée », « partiellement annulée ») ;
* son appel et son état ;
* toujours : « rien ne permet d'accélérer une vérification, et surtout pas un
  paiement ».

**Aucune notification n'est envoyée.** Le moteur de décision d'envoi existe
(`can_notify_2026`, 0141) mais **aucun émetteur du dépôt ne l'appelle** : ajouter
une règle « vérification terminée » dans `NOTIFICATION_RULES_2026` produirait une
promesse sans canal. Le joueur lit donc la décision là où il est déjà allé la
chercher. Le jour où un émetteur existe, la règle s'ajoutera — et E28 pourra
enfin dire qu'il prévient.

---

## 7. Le journal

`anticheat_review_journal_2026` — une ligne par décision, en ajout seul :
`review_id`, `run_id`, `moderator_id`, `verdict`, `note`, `decided_at`.
Aucun rôle client ne le lit ni ne l'écrit : `service_role` uniquement.

```sql
-- Les cent dernières décisions, avec leur auteur.
select j.decided_at, u.email, j.verdict, j.run_id, j.note
from public.anticheat_review_journal_2026 j
left join auth.users u on u.id = j.moderator_id
order by j.decided_at desc
limit 100;
```

```sql
-- La file, telle que le serveur la voit (hors application).
select r.opened_at, r.suspicion, r.system_decision, p.handle, r.run_id
from public.anticheat_reviews r
left join public.user_profiles p on p.user_id = r.user_id
where r.status <> 'closed'
order by r.opened_at;
```

Le journal suit la revue, qui suit le compte : une suppression RGPD emporte les
deux. **La conservation d'un audit ne prime pas sur l'effacement d'un compte.**

---

## 8. Ce que ce lot ne ferme pas

1. **Aucune notification** (voir §6). Inscrit, pas contourné.
2. **Aucun délai annoncé** (voir §2). Le rendre honnête suppose de rallonger la
   fenêtre d'expiration : arbitrage produit, à faire avec des dossiers réels.
3. **Une face expirée ne ressuscite pas.** Voir §5.
4. **Le réglage de l'anti-triche reste prudent.** ADR-015 point 3 : « Le jour où
   un opérateur existe, ce réglage devient trop prudent et devra être revu avec
   des traces réelles. » Cet opérateur existe désormais ; la calibration reste à
   faire, et elle exige des sorties honnêtes mesurées (course, vélo,
   marche/course alternée, poussette, sac à dos).
5. **Le pipeline historique** (`validate.ts`, `anticheat_wiring.ts`) écrit encore
   des revues sur `runs.status = 'flagged'`. Une validation les ferme et les
   journalise, mais **ne recrédite rien** : le code qui aurait crédité points,
   XP et hexagones ne tourne plus (ADR-015). Ce cas n'existe pas en production
   (0 donnée de jeu), et la fonction ne prétend pas le contraire.
