# ADR-017 (BROUILLON) — 2026-09-11 — Le parrainage récompense les DEUX, avec des objets que personne d'autre ne peut avoir

> **Statut : BROUILLON.** Ce document n'est PAS `docs/DECISIONS.md` et ne s'y substitue pas.
> Il est écrit pour que le fondateur l'intègre lui-même, mot pour mot ou corrigé. Tant qu'il
> n'y est pas, la lettre opposable sur ce point reste le **cahier de septembre §15.2**, et ce
> fichier documente un écart **assumé et daté** entre le code livré et cette lettre.

## Le fait, avant toute décision

Quatre faits de dépôt, vérifiés le 11/09/2026 :

1. **Le parrainage n'existait pas.** `public.referrals` est dans `0002_schema.sql` depuis le
   premier jour, avec sa policy d'insertion dans `0003_rls.sql`. Elle n'a **jamais été
   écrite** : `grep -rn "from('referrals')" supabase/` ne rend rien, `activated_at` et
   `boost_expires_at` ne sont posés nulle part, et la seule policy d'insertion exige que le
   CLIENT connaisse l'`user_id` du filleul — valeur que l'app n'expose jamais, par règle
   explicite (`features/social/profileLink.ts`). Le chemin était mort à l'écriture.
2. **Le code de 0002 était inutilisable.** `users.referral_code text not null unique default
   encode(gen_random_bytes(4),'hex')` : huit caractères hexadécimaux, alphabet `0-9a-f`. On ne
   le dicte pas, on ne le recopie pas d'une capture d'écran sans se tromper, et il vit sur une
   table que le client lit.
3. **L'écran le disait déjà**, mot pour mot, dans `ProfileHomeScreen.tsx` au 10/09/2026 :
   « PAS DE "ENTRER UN CODE DE PARRAINAGE" […] Peindre le champ serait un bouton mort. »
4. **La récompense prévue était interdite.** `game-rules.ts` §3.7 portait
   `REFERRAL_BOOST_MULTIPLIER = 2` et `REFERRAL_BOOST_DAYS = 7`. Le cahier §15.2 dit l'inverse,
   en toutes lettres. Les deux constantes ont été retirées le 11/09 au matin, et l'audit
   (`GRYD_REGLAGES_PROFIL_AUDIT_2026_09.md` §5.1) a nommé la tension :
   « **Tension à trancher par le fondateur**, hors périmètre d'un lot d'UI. »

## La lettre du rang 0

Cahier de septembre, **§15.2 « Boucles de croissance »**, mot pour mot :

> « Le parrainage ne donne ni XP ni points ni chance supplémentaire de gagner un prix.
> Proposition : une variante "Premier rendez-vous" après une première sortie partagée
> réellement validée, disponible à tous les membres concernés. »

## La décision du fondateur, mot pour mot

À la question de la récompense de parrainage, le **11/09/2026** :

> « ok oui mais offre un boost ou autre au moins pour les deux, il faut faire comme Tesla, il
> faut qu'un mec qui parraine ait quelque chose à gagner que les autres n'ont pas »

Trois exigences y sont lisibles, et aucune n'est facultative :

- **« au moins pour les deux »** — la récompense va au parrain ET au filleul. Une récompense
  qui n'irait qu'au parrain fabriquerait un recruteur, pas un partenaire de sortie.
- **« comme Tesla »** — le programme de parrainage Tesla ne paie pas en avantage produit : il
  donne des objets et des services qu'on n'obtient pas autrement. C'est un statut, pas une
  monnaie.
- **« quelque chose à gagner que les autres n'ont pas »** — l'exclusivité est la substance de
  la décision. Une récompense achetable ailleurs ne la satisferait pas.

## Ce qui est décidé

Le parrainage donne **trois choses**, aux DEUX joueurs, après une sortie validée de chacun :

| Récompense | Ce que c'est | Pourquoi elle est exclusive |
|---|---|---|
| **Collection « Parrainage »** | Cadre d'avatar, style de tracé, titre « Parrain » ou « Filleul » | Aucun palier de niveau (0144), aucune collection de saison (0121), aucun SKU (0014, 0125) ne les délivre. Le seul chemin est `referral_grants_2026`. |
| **Boost d'XP ×1,5 pendant 7 jours** | Multiplie l'XP de **progression** (le niveau) et rien d'autre | Ne s'achète pas, ne s'empile pas, ne classe personne. |
| **30 jours de GRYD+** | Crédit **banqué**, démarré le jour de l'ouverture de la boutique | Ne s'achète pas ; ne peut pas être obtenu par un compte sans parrainage. |

## Les garde-fous qui SURVIVENT à la dérogation

Ce sont eux qui rendent l'écart tenable. Aucun n'est négociable, et chacun est vérifié par
`supabase/tests/referral_2026.pglite.test.mjs`.

1. **Jamais un point de territoire, de performance ni de défi.** Les classements de
   0160-0164 lisent `runs.points_awarded`, les surfaces capturées et les métriques de
   performance. Aucune de ces colonnes n'est écrite par le parrainage. Deux joueurs à effort
   égal finissent au même rang, qu'ils aient parrainé ou non. **C'est la contrepartie exacte
   du §15.2** : il interdisait « ni XP ni points » ; la dérogation ne prend que l'XP, et
   laisse les points intacts.
2. **Jamais une chance supplémentaire de gagner un lot réel.** Le §15.2 visait un tirage. Il
   n'y en a aucun ici, et il ne doit jamais y en avoir.
3. **Jamais achetable** (règle 10, anti-pay-to-win, constitutionnelle). Ni la collection, ni
   le boost, ni le crédit ne portent de prix, et aucun SKU ne les délivre.
   `COMMERCIAL_PROPOSAL_2026` garde ses trois multiplicateurs à 1.
4. **Attribution 100 % serveur, après une action RÉELLE des deux joueurs.** Un déclencheur SQL
   sur l'évidence sportive (`progress_activity_2026`, 0119) ; le client n'a que deux RPC, dont
   une qui noue un lien et n'octroie rien.
5. **Le boost ne touche pas les paliers de collection de saison.** `ledger.collections` reste
   le total pur : un calendrier de saison n'est pas une récompense de recrutement.
6. **Le boost ne s'empile pas.** Deux parrainages dans la même semaine rendent deux lignes
   d'octroi et **une seule** fenêtre à ×1,5.
7. **Le plafond de saison ne prive jamais le filleul.** Au-delà de
   `REFERRAL_MAX_ACTIVE_PER_SEASON`, c'est la part du PARRAIN qui est coupée : le filleul a
   couru, il garde la sienne.

## Ce que ça change dans le code

- `packages/shared/src/game-rules.ts` **§3.7** : le commentaire d'interdiction est remplacé par
  cette dérogation, datée, avec ses bornes. Nouvelles constantes : `REFERRAL_CODE_LENGTH`,
  `REFERRAL_CODE_ALPHABET`, `REFERRAL_REDEEM_MAX_ACCOUNT_AGE_DAYS`,
  `REFERRAL_COMPLETION_WINDOW_DAYS`, `REFERRAL_MIN_VALIDATED_DISTANCE_M`,
  `REFERRAL_XP_BOOST_2026`, `REFERRAL_REWARDS_2026`, `REFERRAL_GRYD_PLUS_CREDIT_DAYS`.
  `REFERRAL_MAX_ACTIVE_PER_SEASON = 5` est CONSERVÉ tel quel.
- Migrations **0184 / 0185 / 0186** : le code, le lien + le crédit, les récompenses. RLS
  partout, `revoke … from public, anon`, et **aucune policy** — les deux seules portes du
  client sont `my_referral_2026()` et `redeem_referral_code_2026(code)`.
- `public.referrals` (0002) et `users.referral_code` (0002) ne sont **ni supprimés ni
  touchés** : rien n'est réécrit, une migration ne se réécrit jamais.
- `has_gryd_plus_access_2026` (0120) est étendue au crédit de parrainage.
  `get_gryd_plus_access_2026` ne l'est **pas** : un crédit n'est pas un abonnement, et l'app ne
  doit jamais dire « Abonnement actif » à quelqu'un qui n'a jamais payé.

## Ce qui reste à trancher

1. **Le nom.** Le cahier proposait « Premier rendez-vous » ; le code dit « Parrainage ». Si le
   fondateur préfère le mot du cahier, seuls le catalogue i18n et les quatre libellés
   d'objets changent — les `reward_id` serveur, eux, sont des clés et ne se renomment pas.
2. **L'art des quatre cosmétiques.** Les `reward_id` `referral_frame`, `referral_trace`,
   `referral_title_parrain`, `referral_title_filleul` doivent être ajoutés au catalogue
   cosmétique (`src/features/arsenal/cosmetics2026.ts`, lot en cours le même jour). Tant
   qu'ils n'y sont pas, `/parrainage` les NOMME sans en peindre d'aperçu.
3. **Le badge `crew/recruiter`** (« Active 5 recrues via ton parrainage »), relevé par l'audit
   §5.1 : il n'est branché sur rien et pose la même question dans l'autre sens. Hors périmètre
   de ce lot.
4. **Le jour d'ouverture de GRYD+.** `start_referral_gryd_plus_credits_2026()` est
   l'interrupteur qui fait démarrer les crédits banqués. Il n'a **aucun appelant aujourd'hui**,
   et c'est écrit plutôt que caché : c'est une action d'opérateur du jour J.

## Si le fondateur refuse cette dérogation

La marche arrière est propre, et elle tient en une migration : `0187+` qui vide
`referral_reward_templates_2026` et rend `referral_try_complete_2026` sans octroi. Le lien, le
code et les états resteraient — c'est-à-dire un parrainage qui MESURE la boucle de croissance
du §15.2 sans rien payer, exactement ce que le cahier décrit.
