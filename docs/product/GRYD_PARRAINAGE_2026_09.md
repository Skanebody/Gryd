# GRYD — Parrainage (11/09/2026)

> **Décision fondatrice** : ADR-017 (brouillon), `docs/product/ADR-017-BROUILLON-PARRAINAGE.md`.
> Ce document décrit **ce qui est livré**, pas ce qui est souhaité. Chaque affirmation cite le
> fichier qui la porte ; ce qui n'existe pas est dit comme tel.

---

## 1. Benchmark, en huit lignes

| Programme | Ce qu'il donne | Ce qu'on en garde |
|---|---|---|
| **Tesla** | Des mois de Supercharge, des tirages, et surtout des objets/statuts **non achetables** (Founders Series, accès prioritaires). Le parrain gagne quelque chose que l'argent ne donne pas. | **L'exclusivité, pas la valeur.** C'est le mot du fondateur : « quelque chose à gagner que les autres n'ont pas ». |
| **Revolut** | Prime en argent aux deux, conditionnée à une **action réelle** du filleul (carte reçue, dépense effectuée), pas à l'installation. Fenêtre courte, plafond par période. | **Le déclencheur et les bornes** : une action réelle des DEUX, une fenêtre, un plafond. |
| **Strava** | Pas de parrainage payé. La croissance passe par le partage d'activité et les clubs. | **Ce qu'on ne copie pas** : GRYD garde le partage d'activité comme boucle principale (§15.2), le parrainage est un second canal, pas le premier. |
| **INTVL** | « Refer a friend » en TÊTE des réglages, et la récompense est de l'**XP**. | **Le placement, oui. La monnaie, non** : de l'XP de classement ferait payer le mérite d'autrui. Notre boost ne touche que le niveau, qui ne classe personne. |

**Ce que le benchmark tranche** : récompenser les deux (Revolut, Tesla), sur une action réelle
(Revolut), avec des objets qu'on n'achète pas (Tesla), sans toucher aux classements (contre
INTVL), et sans détrôner le partage d'activité (Strava).

---

## 2. Le circuit, de bout en bout

```
①  Un code, un compte, à vie
    ensure_referral_code_2026(user)          → referral_codes_2026   (0184)
    6 caractères, alphabet sans I/O/0/1, jamais régénérable

②  Le partage
    /parrainage · bloc social du Profil      → « Inviter un ami »
    message = code + gryd://r/<code>         (le lien est construit par l'APP)

③  La saisie, par le FILLEUL et lui seul
    redeem_referral_code_2026(code)          → referral_links_2026   (0185)
    refus nommés : bad_code · unknown_code · self_referral ·
                   already_referred · reciprocity · account_too_old
    rattrapage : une sortie DÉJÀ validée de chaque côté compte

④  La sortie validée (des DEUX)
    record_progress_evidence_2026(run, evidence)   (0119, écrit par ingest_run)
        └─ déclencheur referral_activity_2026      (0186)
             · evidence.eligibility = 'eligible'
             · runs.status = 'valid'
             · runs.distance_m ≥ REFERRAL_MIN_VALIDATED_DISTANCE_M
           → *_qualified_at posé, une seule fois (la PREMIÈRE sortie compte)

⑤  L'octroi
    referral_try_complete_2026(link)         → referral_grants_2026  (0186)
                                             + referral_gryd_plus_credits_2026
                                             + claim_notification_2026 (0141)

⑥  Le boost, à chaque crédit d'XP
    commit_progress_2026(...)                → referral_xp_bonus_2026 (0186)
    bonus = ⌊delta_base × 0,5⌋, journalisé par sortie, additif au registre

⑦  La révocation
    runs.status → 'rejected' / 'flagged'     → déclencheur referral_run_status_2026
    evidence.eligibility → 'review' (0187)   → déclencheur referral_activity_2026
        └─ referral_unqualify_run_2026(run, motif)
```

**Pourquoi le déclencheur est sur l'évidence sportive et pas dans l'Edge Function** :
`record_progress_evidence_2026` est écrite par `ingest_run` à chaque ingestion **et**
réécrite par `resolve_anticheat_review_2026` (0187) quand un modérateur blanchit une sortie.
Un seul déclencheur couvre donc les deux chemins, et **zéro ligne de TypeScript** n'a été
touchée dans `ingest_run` (un autre lot y travaillait le même jour).

---

## 3. Le tableau des récompenses

| Récompense | Parrain | Filleul | Table | Exclusivité |
|---|---|---|---|---|
| Cadre « Relais » (`referral_frame`) | ✔ | ✔ | `referral_grants_2026` | Absent de `level_reward_templates_2026`, de `season_reward_templates_2026` et du catalogue `items` |
| Trace « Relais » (`referral_trace`) | ✔ | ✔ | idem | idem |
| Titre « Parrain » (`referral_title_parrain`) | ✔ | — | idem | idem |
| Titre « Filleul » (`referral_title_filleul`) | — | ✔ | idem | idem |
| Boost d'XP ×1,5 · 7 jours | ✔ | ✔ | `referral_grants_2026` (`kind='xp_boost'`) | Aucun SKU, ne s'empile pas |
| Crédit GRYD+ 30 jours | ✔ | ✔ | `referral_gryd_plus_credits_2026` | Banqué jusqu'à l'ouverture |

Le parrain **plafonné** (au-delà de `REFERRAL_MAX_ACTIVE_PER_SEASON` parrainages récompensés
dans la saison) ne reçoit rien de tout cela ; **le filleul, lui, reçoit sa part entière**, et
n'est pas notifié à la place du parrain qui n'a rien eu.

### Les objets sont RÉELS depuis le 11/09/2026 (migration 0191)

Le cadre et la trace ne sont plus des noms : ils sont **au catalogue cosmétique**
(`apps/mobile/src/features/arsenal/cosmetics2026.ts`, origine `referral`), **dessinés**
(`CosmeticArt2026`, 100 % SVG, zéro asset) et **équipables** par `equip_cosmetic_2026`, qui
re-vérifie l'octroi côté serveur.

| Objet | Ce qu'on voit | Où | Comment on l'obtient |
|---|---|---|---|
| Cadre « Relais » | double liseré chartreuse + **point de jonction** | autour de l'avatar, sur mon profil **et sur celui que les autres voient** (0181) | un parrainage abouti, et rien d'autre |
| Trace « Relais » | trait fin chartreuse dans un **halo large** | ma trace et mon terrain, sur la carte (privé, comme toutes les traces) | idem |

`/parrainage` en peint l'**aperçu réel** et porte « Voir dans ma collection » vers
`/arsenal?segment=cosmetics`, où l'objet s'équipe. La liste des cosmétiques dit **« Réservé au
parrainage »** — jamais « Pas encore en vente » : ces objets ne sont vendus nulle part, et ne le
seront pas.

**Un octroi révoqué cesse d'être porté.** Quand une sortie devient `rejected` / `flagged` ou que
l'anti-triche regèle l'évidence, 0186 révoque le lien, les octrois et le crédit ; 0191 ajoute le
dernier maillon qui manquait, un déclencheur qui **retire l'objet du profil** — mais seulement si
plus **aucun** octroi vivant ne le justifie (deux parrainages donnent deux lignes). Sans lui, le
cadre serait resté peint après une révocation, et l'app aurait dit « cette personne a parrainé »
d'un parrainage annulé.

### Ce que le boost touche, et rien d'autre

| Compteur | Boosté ? | Pourquoi |
|---|---|---|
| `progress_accounts_2026.ledger.totalXp` (le **niveau**) | **Oui** | C'est la seule échelle de progression qui ne classe personne (`GRYD_MARQUES_2026_09.md` : « XP non classant »). |
| `ledger.collections` (paliers de saison) | Non | Un calendrier de saison n'est pas une récompense de recrutement. |
| `runs.points_awarded` (territoire) | Non | Classant (0160-0164). |
| Métriques de performance | Non | Classantes. |
| Défis de crew et défis de la semaine | Non | Leur règle interdit déjà tout XP (`WEEKLY_QUEST_RULES_2026`). |

`runs.xp_awarded` reflète le crédit réel de la sortie, bonus compris : c'est un **reçu**, pas
un classement.

---

## 4. Anti-abus, en chiffres

| Règle | Valeur | Où elle vit |
|---|---|---|
| Codes par compte | **1**, jamais régénérable | `referral_codes_2026` (clé primaire `user_id`), 0184 |
| Alphabet du code | 32 lettres, ni `I`/`1` ni `O`/`0` | `REFERRAL_CODE_ALPHABET`, contrainte `check` gelée en 0184 |
| Auto-parrainage | interdit | contrainte `referral_links_2026_no_self` (0185) + refus `self_referral` |
| Un filleul, un parrain | **1** | index unique `referral_links_2026_referee_unique` (0185) |
| Réciprocité (A↔B) | interdite | refus `reciprocity` dans `redeem_referral_code_2026` (0186) |
| Âge du compte filleul à la saisie | **≤ 7 j** | `REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS`, refus `account_too_old` |
| Sortie qui compte | statut serveur `valid` **et** évidence `eligible` **et** ≥ 1 000 m | `referral_qualifying_run_2026` + déclencheur (0186) |
| Délai saisie → clôture | **≤ 30 j** | `REFERRAL_COMPLETION_WINDOW_DAYS` ; au-delà le lien est CLOS (`window_expired`), jamais laissé en attente |
| Filleuls récompensés par saison | **5** | `REFERRAL_MAX_ACTIVE_PER_SEASON` ; coupe la part du parrain, jamais celle du filleul |
| Sortie rejetée par l'anti-triche | révocation | déclencheurs `referral_run_status_2026` et `referral_activity_2026` (0186) |
| Même appareil / même IP | **non traité** | GRYD ne collecte pas d'empreinte d'appareil, et deux colocataires existent. Un blocage dur punirait de vrais joueurs. |

### Ce que la révocation reprend, et ce qu'elle ne reprend pas

- **Reprises** : la collection exclusive (les octrois portent `revoked_at`, la lecture les
  filtre), le crédit GRYD+, et la **fenêtre** de boost — qui se ferme immédiatement.
- **Jamais reprises** : les XP de bonus **déjà créditées** (`referral_xp_bonus_2026`). Le dépôt
  ne retire jamais un objet gagné (0144, « Permanence »), et faire **baisser** un niveau
  affiché serait la seule chose pire qu'un niveau trop haut. Le tricheur ne gagne rien de plus,
  il ne perd pas ce qui est déjà écrit.

---

## 5. Ce que le client peut, et ce qu'il ne peut pas

**Deux RPC, et deux seulement.**

| RPC | Rôle | Rôle SQL autorisé |
|---|---|---|
| `my_referral_2026()` | Lit : code, filleuls + état, parrain, récompenses, crédit, prochaine étape, place restante | `authenticated` |
| `redeem_referral_code_2026(code)` | **Noue un lien.** N'octroie rien. | `authenticated` |

Tout le reste — `ensure_referral_code_2026`, `referral_try_complete_2026`,
`referral_unqualify_run_2026`, `start_referral_gryd_plus_credits_2026` — est `service_role`
uniquement. Les cinq tables sont en RLS **sans aucune policy**, et `revoke all … from public,
anon, authenticated` : un client ne peut ni lire ni écrire une seule ligne.

**`my_referral_2026()` ne rend jamais** : un `user_id` (seul le pseudo sort), ni une adresse
(`gryd://` est construit par l'app, à partir de son propre `expo.scheme`). Un serveur qui
écrirait le lien deviendrait une seconde source de vérité pour une valeur qu'il ne peut pas
vérifier.

---

## 6. Les six états d'un lien

| État serveur | Ce que l'écran dit |
|---|---|
| `awaiting_referee_run` | « Code saisi. Sa première sortie reste à venir. » |
| `awaiting_referrer_run` | « Il a couru. C'est ta sortie qui manque. » |
| `rewarded` | « Récompenses reçues, des deux côtés. » |
| `capped` | « Récompense reçue de son côté. Tu avais atteint le plafond de la saison. » |
| `expired` | « Les 30 jours sont passés avant que chacun ait fait une sortie. » |
| `revoked` | « Annulé : la sortie qui l'avait validé a été rejetée. » |

Aucun compte à rebours, aucune relance, aucun reproche (§4.2, G24) : un filleul qui n'a pas
encore couru est un **état**, pas un retard.

---

## 7. Surfaces livrées

| Surface | Fichier |
|---|---|
| `/parrainage` | `apps/mobile/app/parrainage.tsx` → `src/features/referral/ReferralScreen2026.tsx` |
| `gryd://r/<code>` | `apps/mobile/app/r/[code].tsx` → `src/features/referral/ReferralLanding2026.tsx` |
| Reprise après inscription | `src/features/referral/pendingReferral.ts`, branchée dans `app/_layout.tsx` |
| Bloc social du Profil | `src/features/refonte/ProfileHomeScreen.tsx` (ligne « Mon parrainage », invitation qui porte le code) |
| Textes (5 langues) | `src/i18n/catalog/referral.ts` |
| Modèle pur | `src/features/referral/referral2026.ts` |

**Notification** : une seule, « ton filleul a validé sa première sortie, vos récompenses sont
là ». Catégorie `results`, **non transactionnelle** (elle respecte donc la plage calme et le
budget de §14.3). `NOTIFICATION_RULES_2026.referralCompleted` porte la règle ;
`notification_log_2026.unique(user_id, event_id)` **est** la garantie qu'elle ne part qu'une
fois, même si l'attribution est rejouée.

---

## 8. Écarts assumés, et pourquoi

| Écart | Raison |
|---|---|
| **Aucun lien web** (`https://gryd.run/r/…`) | `apps/web` n'a pas de route `/r/`, et l'arbitrage de domaine (O10) n'est pas rendu. Un message qui SORT de l'app ne peut pas porter une adresse morte. `buildReferralWebLink` est écrit et testé pour le jour où le domaine répondra ; le parsing accepte déjà les deux hôtes en ENTRÉE. |
| **Le crédit GRYD+ ne démarre pas à l'octroi** | ADR-016 : la boutique ne vend rien et les outils sont ouverts à tous. Trente jours contre une porte déjà ouverte valent zéro jour. Ils sont banqués et démarrent par `start_referral_gryd_plus_credits_2026()`, **qui n'a aucun appelant aujourd'hui** — c'est une action d'opérateur du jour J, écrite plutôt que cachée. |
| **Le message de partage ne mentionne pas GRYD+** | Promettre une boutique fermée à quelqu'un qui n'a même pas l'app serait une promesse au-delà du code. |
| **Les DEUX TITRES ne s'équipent pas** | `referral_title_parrain` et `referral_title_filleul` sont des **titres**. Les deux maisons de titres les refusent : celle de saison (0121) est clé sur une saison PUBLIÉE, et aucune ne l'est en production ; celle de niveau (0144) est clé sur un palier `level`/`min_xp` UNIQUE d'un instantané gelé. `titleBadge` (0180) n'est pas un titre mais sa TYPOGRAPHIE : y ranger « Parrain » n'afficherait aucun mot sans titre équipé, et écraserait le titre gagné dans le cas contraire. Les deux titres restent donc des octrois **lus sur `/parrainage`**, qui le dit (`objetTitresIci`). |
| **`sync_gryd_plus_access_2026` n'existe pas** | Le nom circule dans un commentaire de `features/premium/access2026.ts:26` ; aucune fonction SQL ni Edge ne le porte. La fonction qui décide réellement est `has_gryd_plus_access_2026` (0120), et c'est elle qui a été étendue. |
| **`get_gryd_plus_access_2026` n'est PAS touchée** | Elle alimente le mot « Abonnement actif ». Un crédit de parrainage n'est pas un abonnement : y répondre `active: true` ferait mentir l'app à quelqu'un qui n'a jamais payé. |
| **Pas de détection d'appareil partagé** | Aucune empreinte d'appareil n'est collectée, et deux colocataires existent. |
| **Le badge `crew/recruiter`** reste débranché | Hors périmètre ; il pose la même question dans l'autre sens (ADR-017, « à trancher »). |

---

## 9. Preuve

- `supabase/tests/referral_2026.pglite.test.mjs` — **28 assertions**, dont l'**étape 0**
  (« avant 0184, aucune table ni RPC de parrainage n'écrit quoi que ce soit », et
  `public.referrals` de 0002 mesurée vide).
- `apps/mobile/src/features/referral/referral2026.test.ts` — 15 tests purs, dont l'étape 0
  (le code hexadécimal de 0002 ne passe aucune vérification).
- `apps/mobile/src/features/referral/referralCouture.test.ts` — 14 tests de couture : les deux
  RPC autorisées et rien d'autre, aucune écriture directe, aucun nombre magique, aucun texte
  qui promette un classement, le message de partage sans adresse morte.
- `supabase/tests/referral_cosmetics_2026.pglite.test.mjs` — **11 tests** sur la lignée complète
  0119 → 0186 → 0191, dont l'**étape 0** (« deux parrainages aboutis, et AUCUN objet portable » :
  les octrois existent, `equip_cosmetic_2026` répond `unknown_cosmetic`). Le parrainage n'y est pas
  simulé : code, saisie, deux sorties réelles, attribution, puis révocation par le vrai déclencheur
  `runs.status`.
- `apps/mobile/src/features/arsenal/cosmetics2026.test.ts` — 13 tests, dont la **non-dérive**
  catalogue ↔ 0180 + 0191 et « les objets de parrainage ne portent ni niveau, ni collection, ni
  GRYD+ ».
- `node scripts/audit-routes.mjs` — vert, `/r/[code]` en `ENTRY_ROUTES` avec sa raison écrite.
