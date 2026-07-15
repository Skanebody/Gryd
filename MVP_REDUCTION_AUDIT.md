# MVP_REDUCTION_AUDIT.md — GRYD

> **Statut : AUDIT — aucune ligne de code modifiée.** Livrable Sprint 1 du PROMPT MAÎTRE FONDATEUR (candidat AMENDEMENT-39). Ce document constate, chiffre et séquence. Il **ne tranche aucun conflit d'autorité** (§7).
> Date : 2026-07-15 · Périmètre vérifié : 31 routes mobile, 36 migrations, 8 Edge Functions, packages/shared + packages/engine.

---

## 1. Verdict (5 lignes)

1. **On garde le cœur, et il est déjà bon** : Carte (279 l., conforme §7), Live Run (progression de boucle « 320 m pour fermer »), Résultat (héros territorial + CTA Partager), `runStore.ts` (« Never lose a run » §9.4 **déjà satisfait intégralement**), `sharePrivacy.ts` (masquage domicile, pur et correct). Ne rien reconstruire ici.
2. **On coupe ~14 000 lignes de surface** : arsenal (4093), warroom (1778), badges (1407), performance (798), challenges, amis, crew-discovery, aujourdhui, territoire, faq, sources, settings-motivation — **par feature flag (HIDE), pas par suppression**, sauf 6 REMOVE francs à dépendance nulle.
3. **On ne touche PAS au moteur** : `packages/engine` + `packages/shared/src/{badges,skills,bonuses}.ts` sont consommés par `ingest_run` et `digest_job`. Retirer un export = casser la baseline 519 tests + le drift `_shared`. **§19 vise la SURFACE, jamais le calcul.**
4. **Le prérequis technique n°1 n'existe pas** : aucun système de feature flags de build dans le repo (`feature_entitlements` = IAP, pas des flags). Sans lui, « HIDE » dégénère en suppression irréversible. **C'est le premier commit.**
5. **Le vrai bloqueur n'est pas l'épuration — c'est O2.** Prod = 1 user, 0 run, 0 hex_claim, 0 crew. Auth Apple/Google non configurée → **aucun humain ne peut se connecter** → aucune capture → aucun partage. Les 4 preuves du MVP sont **inmesurables aujourd'hui**. Épurer une surface que personne ne peut atteindre est un pari, pas une observation.

---

## 2. Tableau exhaustif

Filtre §4 : *aide-t-il DIRECTEMENT à comprendre la carte / lancer une course / fermer une boucle / capturer / partager / inviter / revenir défendre-reprendre ?*
Effort : S ≤ 2 h · M ≈ ½–1 j · L ≥ 2 j.

### 2.1 Écrans mobile

| Élément | Chemin | Statut | Pourquoi (§4) | Effort |
|---|---|---|---|---|
| Carte (écran d'entrée) | `apps/mobile/app/(tabs)/index.tsx` | **KEEP** | OUI — comprendre + lancer. 1 mission, 2 FABs, 1 sheet, 3 labels = plafond §7.9 exactement atteint. Ne rien ajouter en haut de carte. | S |
| Live Run | `apps/mobile/app/course-live.tsx` | **KEEP** | OUI — fermer. « BOUCLE · 72 % · 320 m » (`src/features/run/intention.ts:189-202`), 1 toast max. | S |
| Résultat | `apps/mobile/app/course-result.tsx` | **KEEP** | OUI — capturer + partager. §10 déjà satisfait (héros territorial, CTA Partager, détails au tap). | S |
| Résultat — sections `bonus`/`badge`/`perf` niveau 1 | `apps/mobile/app/course-result.tsx:143` | **HIDE** | NON — §19 + §7.9 (scores post-run multiples). Le bandeau badge OUVRE les détails : recâbler avant de masquer. | M |
| Partage | `apps/mobile/app/partage.tsx` | **SIMPLIFY** | OUI mais 2 décisions avant le CTA. §11 = « 1 tap = story prête ». Ouvrir sur Story + template dérivé de l'intention. | M |
| Pré-run / Route Planner | `apps/mobile/app/route-planner.tsx` | **SIMPLIFY** | OUI — support du §8. 928 l. pour 5 décisions (3 plans + objectif + distance + variantes + partage crew) → 1 zone + 1 distance + 1 CTA. | L |
| Onboarding | `apps/mobile/app/onboarding/index.tsx` | **KEEP** | OUI — écran §5.1. ⚠️ type `finish('/crew-discovery')` l.132+187 → à corriger AVANT tout retrait de crew-discovery. | S |
| Sign-in | `apps/mobile/app/(auth)/sign-in.tsx` | **KEEP** | OUI — la porte. Déjà minimal (2 taps, 0 formulaire). Ne pas toucher. | S |
| Profil | `apps/mobile/app/(tabs)/profil.tsx` | **SIMPLIFY** | Partiel — §17 « profil minimal ». 10 raccourcis = un menu. Cible : 5 (Historique, Confidentialité, Classement, Support, Paramètres). | M |
| Profil — SPÉCIALISATIONS (Skills) | `apps/mobile/app/(tabs)/profil.tsx:652-710` | **HIDE** | NON — flag `skills`. Progression pour la progression. ⚠️ `deriveSkill` lit `useMyBadges().stat` → couplé aux badges. | M |
| Profil — BADGES ÉQUIPÉS | `apps/mobile/app/(tabs)/profil.tsx:605-650` | **HIDE** | NON — §19 « badges multiples ». Garder Recruiter (§14). | M |
| Profil — Score Forme + % coffre crew | `apps/mobile/app/(tabs)/profil.tsx:585-600` | **REMOVE** | NON — flag `fitness_score` + meurt avec le coffre. Source = `MY_SOCIAL_PROFILE` (démo figée), retrait sûr. ⚠️ garder la 3ᵉ colonne (Série, réel) sinon la ligne casse visuellement. | S |
| Classement | `apps/mobile/app/(tabs)/classement.tsx` | **SIMPLIFY** | OUI (§5.1 « Classement local ») mais 3 boards → 1. Crews/Ville = 100 % démo (l.86-89). Garder le bloc TOI. | M |
| Crew | `apps/mobile/app/(tabs)/crew.tsx` | **KEEP** | OUI — inviter. ⚠️ créer/rejoindre = `todoCrewFlow` Alert stub (l.212-229) : **les 2 actions cœur de §16 ne marchent pas**. | L |
| Crew — coffre | `apps/mobile/app/(tabs)/crew.tsx` (ChestCard) | **HIDE** | NON — §16 « RETIRER : coffre ». Flag `crew_chest`. Garder les constantes dans game-rules.ts. | M |
| Crew — dons/cadeaux | `apps/mobile/src/features/crew/requests.ts` (449 l.) | **HIDE** | NON — §16 « donations ». ⚠️ le fil de chat rend les GiftCard : filtrer avant de couper. | M |
| Crew — boosts quotidiens | `apps/mobile/src/features/crew/dailyGlue.ts` | **HIDE** | NON — §16 + flag `bonuses`. | M |
| Crew — rôles (7) | `apps/mobile/src/features/crew/rules.ts` | **SIMPLIFY** | Partiel — §16 « rôles complexes ». UI → 2 rôles (fondateur/membre). **Matrice serveur intacte** (sécurité ≠ UI). | M |
| Crew — chat libre | `apps/mobile/src/features/crew/chatStore.ts` | **SIMPLIFY** | Partiel — §16. Retirer le composeur + ChatBubble ; garder ActionCard (défense) + ConquestEventCard (victoire). **Réduit le risque App Store 1.2.** | L |
| Crew — raid/revanche | `apps/mobile/src/features/crew/raid.ts` (303 l.), `revanche.ts` (282 l.) | **LATER** | Raid : NON (flag `advanced_defense`). ⚠️ **Revanche = « se faire reprendre → revenir »** : ne PAS l'emporter sous l'étiquette « raid avancé ». `conquestSeedFor` (crew.tsx:635) lit raid.ts → démêler d'abord. | M |
| Crew — édition | `apps/mobile/app/crew-edit.tsx` | **SIMPLIFY** | Partiel — nommer un crew sert le partage. Retirer recrutement + tags de style (n'existent que pour crew-discovery). | S |
| Crew publique | `apps/mobile/app/crew-public.tsx` | **KEEP** | **OUI — contre-intuitif.** C'est la landing du deep link `/c/…` = preuve MVP n°4. ⚠️ son seul appelant est crew-discovery (REMOVE) → brancher le deep link AVANT, sinon supprimé par erreur au prochain sweep de code mort. | M |
| Crew Discovery | `apps/mobile/app/crew-discovery.tsx` | **REMOVE** | NON — §16 garde « rejoindre par LIEN », pas un annuaire. ⚠️ **casse la fin de l'onboarding** si retiré sans corriger `onboarding/index.tsx:132+187`. | M |
| Historique | `apps/mobile/app/historique.tsx` | **SIMPLIFY** | OUI (§5.1 « simple »). Retirer la FilterBar (l.28-67) — §A « filtres cachés ». 161 l., déjà sain. | S |
| Confidentialité | `apps/mobile/app/confidentialite.tsx` | **KEEP** | **NON au §4 — et §4 a tort ici.** Guideline 5.1.1(v) : suppression de compte depuis l'app (l.181-205, appelle réellement `delete_account`). Guideline 1.2 : signalement/blocage (l.420-495). **Ne rien retirer.** | S |
| Code de conduite | `apps/mobile/app/code-conduite.tsx` | **KEEP** | **NON au §4 — exigence App Store 1.2 (UGC).** Reste requis même sans chat : pseudos, noms de crew, sorties = UGC. ⚠️ poussé depuis le Chat → re-router avant de simplifier le Chat, sinon Apple ne le trouve plus. | S |
| Support | `apps/mobile/app/support.tsx` | **KEEP** | Partiel — exigence store + « Pourquoi ma course n'a pas compté ? » (l.40-48) sert §8.4. ⚠️ l.8 : « Rien de câblé : stubs TODO(O2) » = promesse morte visible du reviewer. | M |
| Paramètres (liste) | `apps/mobile/src/features/settings/sections.ts` | **SIMPLIFY** | Partiel — 12 lignes. Retirer Arsenal (l.78), Avancé, Carte, Crew, Profil. ⚠️ retirer une `section` sans sa branche dans `[section].tsx` = page morte joignable par deep link. | M |
| Paramètres (sous-pages) | `apps/mobile/app/parametres/[section].tsx` | **SIMPLIFY** | Partiel — 3+ `soonAlert` (l.152-170) = promesses mortes. ⚠️ garder les ActionRow Export/Supprimer (l.175-185) = chemin 5.1.1(v). | S |
| Profil édition | `apps/mobile/app/profil-edit.tsx` | **SIMPLIFY** | Partiel — le partage a besoin d'un nom. 580 l. → NOM + @HANDLE + AVATAR + bio. Retirer titre + 3 badges + frame. | M |
| Calcul zones | `apps/mobile/app/calcul-zones.tsx` | **SIMPLIFY** | **OUI — le prompt le demande lui-même** (§10 : « voir détails » contient GRYD Verify, segments exclus, précision, calcul). 6 scènes → 3. ⚠️ priorité absolue : garder l'entrée `course/[id].tsx:160`. | S |
| FAQ | `apps/mobile/app/faq.tsx` | **HIDE** | NON — 367 l. de doc dans un produit dont la preuve n°1 est « compris immédiatement ». Si la FAQ est nécessaire, l'écran a échoué. ⚠️ garder `src/features/explain/` (partagé avec calcul-zones). | S |
| Sources (Verify Hub) | `apps/mobile/app/sources.tsx` | **HIDE** | NON — 6 portes, une seule ouvre (GRYD Live). ⚠️ **garder le registry `src/features/sources/adapters/`** : le tracking natif en dépend. | S |
| War Room | `apps/mobile/app/(tabs)/warroom.tsx` (1778 l.) | **HIDE** | NON — §19 + anti-thèse de §7.9 (1 mission max). Remonter la mission n°1 dans la sheet de zone. ⚠️ 6 entrées dont `BattleMapOverlays.tsx:303+461` (la Carte y pousse) et `GrydNavBar.tsx:55+78`. | L |
| Arsenal (boutique) | `apps/mobile/app/arsenal.tsx` (4093 l.) | **HIDE** | NON — §19 nomme Boutique + Arsenal. ⚠️ **le module cosmétique est requis par §14** (frame/skin/titre Recruiter) : garder `src/features/arsenal/` comme bibliothèque, retirer la vitrine. 4 imports actifs. | M |
| Badges (collection ~200) | `apps/mobile/app/badges.tsx` (1407 l.) | **HIDE** | NON — §19 « badges multiples ». ⚠️ **NE PAS toucher** `packages/engine/src/badges.ts`, `_shared/badges.ts`, `ingest_run/badges_test.ts`. | M |
| Performance | `apps/mobile/app/performance.tsx` (798 l.) | **REMOVE** | NON — flag `fitness_score`. L'écran affiche lui-même « Données de démonstration ». **1 seul lien entrant** (profil.tsx:228) → le candidat le plus propre du lot. | S |
| Challenges | `apps/mobile/app/challenges/{index,[id]}.tsx` | **REMOVE** | NON — le seul défi MVP est « Prends-la-moi » = un deep link. 2 entrées, toutes deux depuis des écrans REMOVE/HIDE → orphelin. ⚠️ garder `engine/challenge.ts` + son test. | S |
| Aujourd'hui | `apps/mobile/app/aujourdhui.tsx` | **REMOVE** | NON — **doublon de la Carte** (même question, 2 écrans). 1 seul lien entrant (warroom:1099, qui disparaît) → littéralement inatteignable. Valeur déjà portée par GO. | S |
| Territoire | `apps/mobile/app/territoire.tsx` | **REMOVE** | NON — 2ᵉ carte. ⚠️ **`src/features/territory/territoryStatus.ts` route vers '/territoire' l.182/204/230/250** et alimente `contextualAction.ts` → **repointer EN PREMIER** sinon GO dérive sur une route morte. | M |
| Amis | `apps/mobile/app/amis.tsx` | **REMOVE** | NON — le graphe social MVP = Crew + deep link. 1 seule entrée. ⚠️ ne pas purger `src/features/social/` en bloc (Toast + PlayerCardAvatar partagés). | M |
| Settings Motivation | `apps/mobile/app/settings-motivation.tsx` | **REMOVE** | NON — 3ᵉ écran de réglages. ⚠️ **migrer profileVisibility/activitySharing/mapSharing/mode discret vers `confidentialite.tsx` AVANT** : perte de contrôle du partage = risque conformité, pas UX. Garder `motivation/rules.ts` (miroir engine/social.ts). | M |

### 2.2 Navigation

| Élément | Chemin | Statut | Pourquoi (§4) | Effort |
|---|---|---|---|---|
| Barre 4 onglets → 3 | `apps/mobile/src/features/nav/GrydNavBar.tsx:39-44` | **SIMPLIFY** | §5.2. « Saison » = consultation. ⚠️ rendu par **slices positionnelles** `TABS.slice(0,2)/slice(2)` pour centrer GO : 3 items casse la symétrie — repenser le split, pas juste retirer une ligne. | S |
| Route `classement` | `apps/mobile/app/(tabs)/_layout.tsx` | **KEEP** | La route reste, l'onglet part (pattern `warroom` déjà en place). Supprimer le `Tabs.Screen` casserait les `router.push('/classement')`. | S |
| Bouton central « GO » | `apps/mobile/src/features/nav/GrydNavBar.tsx:136` | **KEEP** | OUI — point d'entrée de « lancer une course ». **AMENDEMENT-38 = override fondateur du 2026-07-13.** Le prompt écrit « RUN ». → §7 C10. ⚠️ `accessibilityLabel` = `GO — ${action.a11yLabel}` (WCAG 2.5.3). | S |

### 2.3 Systèmes transverses

| Élément | Chemin | Statut | Pourquoi (§4) | Effort |
|---|---|---|---|---|
| **Feature flags (module)** | `packages/shared/src/feature-flags.ts` *(à créer)* | **KEEP / prérequis** | **N'existe pas.** Sans lui, HIDE = REMOVE ou code commenté. ⚠️ **PAS dans game-rules.ts** (partirait dans `_shared` via sync → le serveur pourrait s'y gater = run non rejouable : INTERDIT). | M |
| Moteur | `packages/engine/src/index.ts` | **KEEP — intouchable** | Le §19 vise la surface. `ingest_run/index.ts` importe `engine/badges.ts` (l.101), `bonus.ts` (l.126) ; `digest_job` importe `chestTierFor`. Retirer un export = baseline 519 à terre. | S |
| Constantes §8 (1re course assistée) | `packages/shared/src/game-rules.ts` | **LATER** | OUI (preuve n°2) mais → §7 C12 : `first_run_verify_threshold` = seuil anti-triche assoupli sur comptes neufs, **sans App Attest** (bloqué O2). Un seuil client-only = triche gratuite. | L |
| §8.4 « BOUCLE PRESQUE FERMÉE » | `apps/mobile/app/course-result.tsx` | **LATER** | OUI — transforme l'échec en relance. Réutiliser le libellé **exact** déjà présent `warroom.tsx:867` (pas un 2ᵉ vocabulaire) et le pattern anti-shame de `territoryStatus.ts:214-220`. | M |
| Never lose a run | `apps/mobile/src/lib/runStore.ts` + `pendingUpload.ts` | **KEEP** | §9.4 **déjà satisfait**. 3 clés AsyncStorage, event `run_autosave`, renvoi idempotent par `clientRunId`. **Ne rien reconstruire.** Dette connue : file mono-course (V1, acceptable). | S |
| runContext (plan auto) | `apps/mobile/src/features/nav/runContext.ts` | **SIMPLIFY** | OUI. ⚠️ **`battleContext()` est mémoïsé dans un `cached` module-level (l.127-138)** : ne se recalcule jamais → bug silencieux dès que la carte lira du réel. TODO à poser maintenant. | M |
| Export image de la story | `apps/mobile/app/partage.tsx:402` | **KEEP / à câbler** | **OUI — cœur.** `openShareSheet(shareMessage)` n'envoie **que du texte** : la card n'est jamais exportée. ⚠️ tant que l'image n'est pas rendue, le libellé doit dire « Partager le lien », pas « Partager en story » (§A honnêteté). | L |
| Sticker PNG transparent | `apps/mobile/src/features/share/shareActions.ts:115` | **KEEP / à câbler** | §12. `stickerText()` renvoie du texte. ⚠️ **`expo-clipboard` n'est pas installé** → `sticker_copied` est structurellement à 0 en natif : ce chiffre est faux aujourd'hui. | M |
| Masquage privacy trace | `apps/mobile/src/features/share/sharePrivacy.ts` | **KEEP** | Condition de survie. Pur, correct, prudent (< 3 pts → `[]`). ⚠️ **l'export PNG doit rendre `view.trace`, jamais `runCard.trace`** — sinon publication du domicile à grande échelle : le pire bug possible du repo. | S |
| Routage deep links entrants | `apps/mobile/app/_layout.tsx` | **KEEP / à créer** | §13. **Zéro `linking`/`getInitialURL` dans le repo. Aucune route `zone/`, `mission/`, `run/share/`. Pas de `+not-found.tsx`.** Chaque lien partagé est un cul-de-sac, **même chez qui a l'app**. | M |
| Schéma d'URL | `src/features/share/shareDeepLink.ts:20` vs `crew/invite.ts:30` | **SIMPLIFY** | **Deux systèmes divergents** : `gryd.run/zone|crew|...` vs `gryd.run/c/<token>`. Prompt dit `gryd.app/z|c|r|d`. **0 lien en circulation → fenêtre pour unifier = maintenant.** Host = 1 constante à basculer (→ §7). | S |
| Templates de partage | `src/features/share/templates.tsx:185-306` | **HIDE** | 8 templates vs 3 autorisés (§11). ⚠️ `SHARE_TEMPLATES_BY_ID` = Record **exhaustif typé** : retirer une clé casse le typecheck → **filtrer `STYLE_EXTRA`**, ne pas supprimer les entrées. Garder `simple` (fallback honnête `social_run`). | S |
| Template Carte 3D | `src/features/share/ShareMap3D.tsx` | **HIDE** | Canvas GL → captureRef rend un trou noir : **c'est le template qui bloquerait l'export PNG**. De plus le badge privacy y est désactivé (boucle 3D fermée). Masquer template + format « Carte seule » ensemble. | S |
| Universal links | `apps/mobile/app.json` | **LATER** | `scheme: gryd` (l.26) mais **aucun `associatedDomains`/`intentFilters`** → un https:// n'ouvre jamais l'app. Bloqué : Team ID (O2) + propriété du domaine + INPI. | M |
| Landing web /z /c /r /d | `apps/web/app/` | **LATER** | Absente. ⚠️ **0 run en prod → la landing ne peut être que générique** : afficher un faux propriétaire violerait CLAUDE.md (zéro donnée factice). | L |
| `share_links`/`share_clicks`/`share_exports` | `supabase/migrations/` (→ 0037) | **LATER** | §21. **ABSENTES** (vérifié sur 36 migrations). ⚠️ `share_clicks` = insert **anonyme public** = même classe de risque que la waitlist (0034 lockdown + 0035 throttle). Jamais d'IP brute. | M |
| `referrals` | `supabase/migrations/0002_schema.sql:192` | **KEEP** | **Existe déjà et est correcte** (RLS 0003:167-179, `activated_at` posé serveur, unicité parrain). **Rien ne l'écrit.** ⚠️ `referralsActivated: 0` codé en dur (`engine/badges.ts:127`) → **badge Recruiter inatteignable**. | L |
| `REFERRAL_BOOST_MULTIPLIER` (×2 points) | `packages/shared/src/game-rules.ts:247` | **REMOVE** | **Viole §14** (« JAMAIS zones/points/rank ») **et** l'anti-P2W de CLAUDE.md : recruter achèterait un avantage. ✅ **Consommé nulle part** → retrait gratuit. Mais vient de SPEC §3.7 (gelée) → §7 C20. | S |
| Share Engine pur | `packages/engine/src/share.ts` *(à créer)* | **KEEP / à créer** | §22. La logique de partage est éclatée dans l'UI (partage.tsx:134-138, 509) → non testée, non réutilisable par la landing web. Doit rester **pur** (0 import react-native). | M |
| Events preuve MVP | `packages/shared/src/events.ts` | **SIMPLIFY** | **Sans eux, les 4 preuves ne sont pas mesurables.** AJOUTER (jamais renommer) : `onboarding_completed`, `first_run_started`, `first_loop_closed`, `first_zone_captured`, `time_to_first_capture`. | M |
| Events referral | `packages/shared/src/events.ts` | **SIMPLIFY** | `referral_activated` émis **client** mentirait (le client ne décide pas l'activation). L'émettre à la **lecture** d'un `activated_at` serveur non nul. | M |
| Notifications push | `supabase/functions/digest_job/index.ts` | **LATER** | ⚠️ **`expo-notifications` absent du package.json ; aucun push token ; envoi Expo = TODO**. Et l'enum `notifications.type` (0006:12) n'a **ni `crew_invite` ni `crew_loop`** → un insert §15 échouerait sur le CHECK. Migration **additive** uniquement. | L |

---

## 3. Ce qui reste

### 3.1 Les 12 écrans MVP (§5.1) → mapping réel

| # | Écran §5.1 | Route réelle | État |
|---|---|---|---|
| 1 | Onboarding | `app/onboarding/index.tsx` (+ `(auth)/sign-in.tsx`) | KEEP — corriger le type de `finish()` |
| 2 | Carte | `app/(tabs)/index.tsx` | KEEP tel quel |
| 3 | Pré-run | `app/route-planner.tsx` + `src/features/nav/runContext.ts` | SIMPLIFY — **ne pas créer d'écran dédié** : l'éclatement actuel est meilleur que §5.1 (zéro écran entre l'envie et le départ) |
| 4 | Live Run | `app/course-live.tsx` | KEEP |
| 5 | Résultat | `app/course-result.tsx` | KEEP + HIDE 3 sections |
| 6 | Partage | `app/partage.tsx` | SIMPLIFY + câbler l'export image |
| 7 | Profil simple | `app/(tabs)/profil.tsx` (+ `profil-edit.tsx`) | SIMPLIFY → 5 raccourcis |
| 8 | Classement local | `app/(tabs)/classement.tsx` | SIMPLIFY → 1 board, **hors barre** |
| 9 | Crew simple | `app/(tabs)/crew.tsx` (+ `crew-edit`, `crew-public`) | KEEP — câbler créer/rejoindre |
| 10 | Historique simple | `app/historique.tsx` | SIMPLIFY — retirer les filtres |
| 11 | Confidentialité | `app/confidentialite.tsx` | **KEEP intégral** (App Store) |
| 12 | Paramètres essentiels | `app/parametres.tsx` + `[section].tsx` | SIMPLIFY → 6 lignes |

**+ 3 écrans hors quota — plomberie légale, pas surface produit :**
`code-conduite.tsx` (Guideline 1.2), `support.tsx` (support + signalement triche), `calcul-zones.tsx` (**exigé par le §10 du prompt lui-même** : « voir détails » = GRYD Verify + segments exclus + précision + calcul ; et sans lui, « il manquait 110 m » n'est pas vérifiable).

**Compte final : 12 + 3 = 15 routes** (contre 31 aujourd'hui). Les 16 autres : REMOVE (6) ou HIDE derrière flag (10).

### 3.2 Nav 3 onglets

```
┌──────────────────────────────────────────┐
│   CARTE        [ GO ]        CREW  PROFIL │
└──────────────────────────────────────────┘
```
- **Carte** = écran d'entrée, unique.
- **GO** = bouton flottant contextuel, **pas un onglet** (conforme §5.2 ET AMENDEMENT-38). Présent partout (« le joueur ne doit jamais chercher comment courir »).
- **Crew** / **Profil**.
- **Classement** : route conservée hors barre, atteint depuis Profil + sheet de zone Carte (§5.2).
- **War Room** : déjà hors barre → passe derrière `war_room = false`.

⚠️ Le split `TABS.slice(0,2)/slice(2)` doit devenir un rendu explicite gauche=[Carte] / droite=[Crew, Profil], ou 2+2 en déplaçant Crew — sinon GO n'est plus centré.

---

## 4. Plan de migration séquencé (§24)

### Sprint 0 — DÉBLOQUER (avant toute épuration)
- **Fait** : O2 — auth Apple/Google configurée ; carte lit `hex_claims` (au lieu de `fakeHexes`) ; **1 vraie course end-to-end**.
- **Vérifiable** : un humain se connecte, court, capture, voit sa zone. `runs ≥ 1`, `hex_claims ≥ 1`.
- **Bloqué par O2** : *c'est O2*. Rien d'autre du plan n'est mesurable avant.
> Sans ce sprint, tout ce qui suit est une opinion sur une surface que personne n'a jamais vue.

### Sprint 1 — SOCLE (ce document + les flags) — **exécutable dès maintenant**
- **Fait** : (a) rédiger `AMENDEMENT-39-EPURATION-VIRALITE.md` avec sa clause « Ce que ça révise » (nommer §A.16/§A.18/§A.19, -02 §5, -29 §1/§3, -37 §5, SPEC §3.7) ; (b) créer `packages/shared/src/feature-flags.ts` + `apps/mobile/src/features/flags/FlagGate.tsx` ; (c) répondre aux 3 arbitrages §7 bloquants.
- **Vérifiable** : `npm run typecheck` 4/4 ; `deno test` ≥ 519 ; **`node scripts/sync-game-rules.mjs` → drift nul, `_shared` inchangé** (preuve que les flags ne fuient pas côté serveur).
- **Bloqué par O2** : rien.

### Sprint 2 — REMOVE à dépendance nulle — **exécutable dès maintenant**
- **Fait, dans cet ordre non négociable** :
  1. Repointer `territoryStatus.ts` l.182/204/230/250 → Carte (**avant tout le reste** : `contextualAction` en dépend).
  2. Corriger `onboarding/index.tsx:132+187` (union `'/' | '/crew-discovery' | '/crew'` → `'/' | '/crew'`).
  3. Supprimer : `performance.tsx` (+ `src/features/performance/`), `challenges/`, `aujourdhui.tsx`, `territoire.tsx`, `amis.tsx`, `crew-discovery.tsx` (après 1+2).
  4. Migrer les toggles de visibilité de `settings-motivation.tsx` → `confidentialite.tsx`, **puis** supprimer.
  5. Retirer les entrées correspondantes de `profil.tsx` LINKS.
- **Vérifiable** : typecheck 4/4 ; `grep -r "aujourdhui\|/territoire\|/amis\|/performance\|/challenges\|crew-discovery" apps/mobile` = 0 hit hors historique git ; deno ≥ 519 (inchangé, aucun moteur touché).
- **Bloqué par O2** : rien. **C'est le sprint à plus fort rendement immédiat.**

### Sprint 3 — HIDE derrière flags — **exécutable dès maintenant**
- **Fait** : `FlagGate` sur `arsenal` (garder `src/features/arsenal/` en bibliothèque), `badges`, `warroom`, `faq`, `sources` ; masquer coffre + dons + boosts (crew), Skills + badges + Score Forme (profil), sections `bonus`/`badge`/`perf` (résultat), boards Crews/Ville (classement) ; retirer « Saison » de `TABS` + rebrancher le classement depuis Profil et la sheet de zone ; démêler `conquestSeedFor` de `raid.ts`.
- **Vérifiable** : typecheck 4/4 ; deno ≥ 519 (**le moteur calcule toujours badges/bonus/coffre — seule la surface disparaît**) ; preview : 3 onglets, aucun cul-de-sac (chaque entrée vers une route flaguée est masquée, pas laissée morte).
- **Bloqué par O2** : rien. ⚠️ « Retirer les badges » touche aussi `ingest_run` (appel météo Open-Meteo fail-open) : **on ne touche pas au serveur**, on masque.

### Sprint 4 — VIRALITÉ exécutable hors ligne
- **Fait** : unifier le schéma d'URL (`SHARE_HOST` + table de chemins `z|c|r|d` partagée par `shareDeepLink.ts` **et** `crew/invite.ts`) ; `packages/engine/src/share.ts` (pur + tests Deno) ; `linkRouting.ts` + `+not-found.tsx` + rejeu d'intention après sign-in ; export PNG (`react-native-view-shot` + `expo-sharing` en **require dynamique** + fallback texte) ; `expo-clipboard` ; ajouter les events de preuve dans `events.ts` ; retirer `REFERRAL_BOOST_MULTIPLIER` (si arbitré) + `sync-game-rules.mjs`.
- **Vérifiable** : tests Deno du share engine ; **dev build** (l'export PNG est **invérifiable en preview web**) ; test verrouillant que l'image exportée dérive du **même `safeTrace`** que la preview.
- **Bloqué par O2** : les universal links (Team ID Apple) ; la landing web (0 donnée réelle à afficher) ; l'attribution réelle.

### Sprint 5 — Post-O2
- **Fait** : câbler créer/rejoindre un crew (Edge Function + RLS + events `crew_created`/`crew_joined`) ; migration 0037 (`share_links`/`share_clicks`/`share_exports`, RLS + throttle 0035 réutilisé) ; pipeline referral 5 jalons → `activated_at` dans `ingest_run` → badge Recruiter ; §8 première course assistée (constantes dans `game-rules.ts` + moteur + tests run #1/#2/#3/#4) ; §8.4 « BOUCLE PRESQUE FERMÉE ».
- **Vérifiable** : un lien partagé amène un vrai compte sur une vraie zone. **La preuve MVP n°4 devient un fait.**
- **Bloqué par O2** : **tout ce sprint**.

---

## 5. Risques de régression

| Risque | Mécanisme exact | Prévention |
|---|---|---|
| **Baseline 519 tests** | `ingest_run/index.ts` importe `engine/badges.ts` (l.101), `engine/bonus.ts:{chestProgressDelta:107, bonusEffectLabel:124}` ; `digest_job` importe `chestTierFor`, `CREW_CHEST_WEEKLY_TARGET`, `BONUS_*`. Retirer un export de `engine/index.ts` casse l'import Deno **et** le sync `_shared/engine/*`. | **Aucune modification de `packages/engine`, de `packages/shared/src/{badges,skills,bonuses}.ts`, ni des Edge Functions dans ce chantier.** Le serveur CALCULE, le client cesse d'AFFICHER. Ne pas « nettoyer » les exports inutilisés côté client : ils servent la copie Deno. |
| **Drift `_shared`** | Les flags dans `game-rules.ts` partiraient dans `_shared` via `sync-game-rules.mjs:5` → un serveur gaté par flag rendrait un run **non rejouable**. | `feature-flags.ts` = **module séparé**, exporté depuis `shared/src/index.ts`, **exclu de la liste de sync**. En-tête du fichier : « un flag ne gate JAMAIS le serveur ». Vérifier `_shared` inchangé après sync. |
| **`contextualAction` dérive sur une route morte** | `territoryStatus.ts` route vers `/territoire` (l.182/204/230/250) et alimente `contextualAction.ts` + `profil.tsx` → le bouton GO pointerait sur une route supprimée. | **Repointer AVANT de supprimer.** Premier item du Sprint 2. |
| **Onboarding cassé** | `onboarding/index.tsx:132+187` type et appelle `finish('/crew-discovery')`. | Corriger le type **avant** de retirer crew-discovery. |
| **`crew-public` supprimé par erreur** | Son seul appelant est `crew-discovery.tsx:131` → devient orphelin → sweep de code mort. Or c'est la **landing du deep link crew = preuve MVP n°4**. | Brancher `gryd.app/c/TAG → crew-public` **dans le même commit** que le retrait de crew-discovery. |
| **Code de conduite introuvable par Apple** | Poussé depuis le Chat crew ; si le Chat est simplifié, l'écran devient orphelin. | Re-router depuis Confidentialité (Blocage & signalement) + Paramètres > Aide **avant** de toucher au Chat. |
| **GO n'est plus centré** | `GrydNavBar` rend par slices positionnelles `TABS.slice(0,2)/slice(2)`. | Rendu explicite gauche/droite, pas un `.filter()` sur TABS. Vérifier en preview. |
| **Page morte joignable par deep link** | Retirer une `section` de `sections.ts` sans sa branche dans `parametres/[section].tsx` laisse `/parametres/avance` accessible. | Les deux dans le **même commit**. |
| **BadgeCard orphelin** | Le mini-bandeau badge du Résultat (l.619) **ouvre** les détails ; le BadgeCard vit **dans** les détails. | Recâbler l'ouverture avant de masquer le bandeau. |
| **Chat crew : GiftCard/raid** | `requests.ts` est importé par `chatStore`/feed ; `conquestSeedFor` (crew.tsx:635) lit les réactions de `raid.ts`. | Filtrer les entrées de type don **dans le fil** avant de toucher aux composants ; remplacer le seed raid par une valeur neutre. |
| **Typecheck partage** | `SHARE_TEMPLATES_BY_ID` (templates.tsx:309) est un Record **exhaustif typé**. | **Filtrer `STYLE_EXTRA`**, ne jamais retirer une clé du Record. |
| **🔴 Fuite domicile à l'export** | L'export PNG doit rendre `view.trace` (masqué par `applySharePrivacy`), **jamais** `runCard.trace` (brut). | Test verrouillant : l'image partagée dérive du **même `safeTrace`** que la preview. **Le pire bug possible de ce repo.** |
| **Crash preview web** | `react-native-view-shot` / `expo-sharing` = modules natifs (même piège que HealthKit / `_healthkit_o8`). | **Require dynamique + fallback texte** (pattern éprouvé de `shareActions.ts` / `invite.ts`). |
| **Plan de course figé** | `battleContext()` est mémoïsé dans un `cached` module-level (`runContext.ts:127-138`) : inoffensif en démo, **bug silencieux dès que la carte lira du réel**. | Poser le TODO d'invalidation **maintenant**, l'appliquer au câblage O1. |
| **Insert notif rejeté** | L'enum `notifications.type` (0006:12) n'a ni `crew_invite` ni `crew_loop`. Restreindre l'enum casserait `decay_job`/`digest_job`. | Migration **additive** uniquement (ÉTENDRE le CHECK, jamais DROP). §15 = filtre d'**affichage** client. |
| **DoS `share_clicks`** | Insert **anonyme public** (le cliqueur n'a pas de compte) — même classe que la waitlist (0034 lockdown, 0035 throttle). | Insert via Edge Function service-role + throttle 0035, RLS stricte, **jamais d'IP brute ni de PII en URL**. |
| **Chiffres faux** | `sticker_copied` n'est émis que si `via === 'clipboard'` (partage.tsx:280) or `expo-clipboard` **n'est pas installé** → structurellement 0 en natif. | Installer `expo-clipboard` **avant** de lire cet event. |

---

## 6. Architecture des feature flags — proposition concrète

**Emplacement : `packages/shared/src/feature-flags.ts`** — surtout **PAS** `game-rules.ts`.

```ts
// packages/shared/src/feature-flags.ts
//
// Flags de BUILD, côté CLIENT uniquement.
// ─────────────────────────────────────────────────────────────
// RÈGLE ABSOLUE : un flag ne gate JAMAIS le serveur.
// Ce fichier n'est PAS synchronisé vers supabase/functions/_shared
// (cf. scripts/sync-game-rules.mjs). Le moteur continue de calculer
// badges/bonus/coffres/skills ; le client cesse de les AFFICHER.
// Conséquence assumée : runs.celebration contiendra des badges que
// l'UI n'affiche pas — données conservées, réactivation = 1 booléen.
//
// Ce ne sont PAS des constantes de jeu : aucun nombre, aucun barème.

export const FLAGS = {
  season_pass: false,
  shop: false,               // arsenal.tsx (vitrine) — la bibliothèque cosmétique reste
  advanced_missions: false,  // challenges/, RunModeSheet
  war_room: false,           // (tabs)/warroom.tsx
  live_crew: false,
  advanced_defense: false,   // raid.ts — ⚠️ PAS revanche.ts (sert « revenir »)
  skills: false,             // profil §SPÉCIALISATIONS
  bonuses: false,            // dailyGlue, section 'bonus' du résultat
  crew_chest: false,         // coffre + dons + cadeaux
  advanced_rankings: false,  // boards Crews/Ville, collection de badges
  fitness_score: false,      // performance.tsx, Score Forme
  advanced_stats: false,     // sources.tsx, détails étendus

  // Ajouts nécessaires, non listés au §19 mais requis par l'audit :
  advanced_share_templates: false, // boucle/classement/avantApres
  share_3d_map: false,             // carte3d + format « Carte seule » (couplés)
} as const;

export type FeatureFlag = keyof typeof FLAGS;
export const isEnabled = (f: FeatureFlag): boolean => FLAGS[f];
```

**Export** : ajouter la ligne dans `packages/shared/src/index.ts`.
**Exclusion** : ne **jamais** ajouter ce fichier à la liste de `scripts/sync-game-rules.mjs`. Le test de drift `_shared` est le garde-fou.

**Gate de route unique — `apps/mobile/src/features/flags/FlagGate.tsx` :**

```tsx
import { Redirect } from 'expo-router';
import { FLAGS, type FeatureFlag } from '@klaim/shared';

export function FlagGate({ flag, children }: { flag: FeatureFlag; children: React.ReactNode }) {
  if (!FLAGS[flag]) return <Redirect href="/(tabs)" />;
  return <>{children}</>;
}
```

**Trois règles d'usage :**
1. **Gater la route ET son entrée.** Un `FlagGate` sans masquer le lien = un cul-de-sac (redirection silencieuse). Toujours les deux, même commit.
2. **Build-time, jamais runtime.** Pas de flag lu depuis Supabase/PostHog : l'app dépendrait du réseau pour savoir quoi afficher → écran vide hors-ligne, et O2 le rend inatteignable aujourd'hui.
3. **Limite connue** : un flag lu en top-level de module n'est pas tree-shaké par Metro — le code reste dans le bundle. **Ce n'est pas l'objectif** : l'objectif est la surface perçue, et la réversibilité.

---

## 7. Conflits à arbitrer par le fondateur

> **Méta (M1) — à trancher en premier.** Le prompt **n'a aucun rang** dans l'ordre d'autorité de CLAUDE.md tant qu'il n'est pas versé en `AMENDEMENT-39-EPURATION-VIRALITE.md` avec une clause « Ce que ça révise » nommant chaque doc touché. Sans ça, un agent futur relira §A/§C/-37/-38 et **reconstruira ce qu'on aura retiré** — c'est le mécanisme exact qui a produit la dérive 9 écrans (SPEC §4) → 31 routes. **Premier livrable = -39 rédigé. Le code vient après.** (Modèle : AMENDEMENT-38, qui révise §A.4 et -29 nommément et borne sa portée.)

| # | Conflit | Existant | Prompt | Recommandation |
|---|---|---|---|---|
| **C10** | **Bouton GO vs RUN** | AMENDEMENT-38, **override fondateur explicite du 2026-07-13** (J-2) | §5.2 « bouton RUN » | **Question binaire, 10 secondes, débloque le reste. Défaut : GARDER GO.** Un override daté pèse plus qu'un mot dans un prompt de cadrage ; le coût d'erreur dans ce sens est nul (1 string). **Ne pas traiter le silence comme un accord.** |
| **C12** | **1re course assistée (§8)** | `LOOP_CLOSE_TOLERANCE_M = 80` (durci de 100 par -16 §2, décision anti-abus) ; « tout claim est décidé serveur » ; **pas d'App Attest** (bloqué O2) | Tolérance + `first_run_verify_threshold` assouplis, « capture quasi garantie » | **Accepter l'INTENTION, refuser le MÉCANISME.** Un seuil anti-triche assoupli sur comptes neufs = exactement le vecteur d'attaque (créer des comptes). Contre-proposition, ressenti identique, intégrité intacte : agir **en amont** — `first_run_min_area`/`first_run_min_distance` comme critères de **recommandation de zone** + guidance live ; **zéro dérogation** sur la validation. Si maintenu : constante dans `game-rules.ts`, cap dur, **mention visible post-run** (« Première course : fermeture assistée ») — sinon c'est un mensonge silencieux (§A). |
| **C20** | **Referral ×2 points** | SPEC §3.7 (règle gelée) + `game-rules.ts:247` | §14 : cosmétique uniquement | **ACCEPTER — la meilleure décision du prompt.** Un ×2 sur les points est un avantage de classement obtenu socialement = refer-to-win, contraire à toute la doctrine anti-P2W (-16 §4, -19 §5, -34 §0). ✅ **Jamais implémenté** (`grep` = game-rules.ts + copie `_shared` seulement) → **retrait gratuit**. Garder `REFERRAL_MAX_ACTIVE_PER_SEASON` (cap anti-fraude). Réviser SPEC §3.7 nommément. |
| **C2** | 5 niveaux de contestation | §C (`pressure_score` 0-100, moteur + pré-calcul secteur) | §7.3 : 4 états, pas de halo | **Le prompt se contredit** : il affirme « se faire reprendre → revenir » et retire la grammaire qui dit **quoi défendre et à quel point c'est urgent**. Reco : **moteur KEEP**, surface = 4 états **+ 1 accent d'urgence** (le seul pulse permanent, conforme §7.9). |
| **C3** | Bleu protégé | AMENDEMENT-37 §5, source **rang 1** (`GRYD_ETUDE_MARCHE_CARTE_2026.md`), **livré ce matin** | §7.3 : pas de bleu | **Découpler.** Trancher d'abord : « protection = KEEP ou LATER ? ». Si LATER, la couleur est sans objet et -37 §5 tombe proprement. Si KEEP : **bouclier monochrome** (forme, §C) → satisfait le prompt **et** la charte tri-couleur (le bleu était déjà une entorse à l'ADDENDUM §C.3). |
| **C1** | Violet contesté | §C + -37 §10 + **token shippé** (`design-tokens.ts:130`) | §7.3 : pas de violet, double contour | **Accepter** — la forme (double contour) est déjà le différenciateur non-couleur documenté (design-tokens l.177-179), donc l'accessibilité daltonisme est préservée. Mais **réviser §C et -37 §10 dans le texte de -39**, sinon deux docs actifs se contredisent. |
| **C4** | États de boucle | -37 §5 : `openBoundary`, **`loopIncomplete`**, `excluded` (livrés) | §7.3 : 4 états seulement | **Clarifier, sinon §7.3 et §8.4 sont inapplicables ensemble** : le prompt supprime en §7.3 l'état (`loopIncomplete`) dont il a besoin en §8.4. Reco : **§7.3 régit les états de POSSESSION** ; `openBoundary`/`loopIncomplete`/`excluded` = grammaire de **trace** (§B), hors quota. |
| **C6** | Signal de decay | Decay = règle gelée §3 (-23 A : binaire 21 j, **mécanique active**) | §7.3 : pas de rouge decay ; §15 : 4 catégories de notif | **Refuser le retrait du SIGNAL tant que la MÉCANIQUE tourne** — des zones qui tombent sans prévenir violent §A (« l'app ne ment jamais ») et cassent le « Revenir ». Alternative charte-compatible : **pointillé + sablier** (forme), zéro rouge. Ou trancher « decay : LATER » explicitement. |
| **C13** | Bonus | AMENDEMENT-19, **décision fondateur du 05/07/2026**, engine + tests livrés | §19 : retirer | Flag OFF **mais garder le moteur ET le cap `BONUS_MAX_TOTAL_PCT = 0.35`** (c'est le garde-fou anti-P2W qui neutralise le Crew Boost payant). **Exception à discuter : le Bonus Finisher EST le mécanisme de §8.4/§16** — le prompt retire l'objet dont sa propre §8.4 a besoin. Le ré-exposer sous un autre nom (« mission sauvegardée »). |
| **C16** | Badges | AMENDEMENT-04, **planche fournie par le fondateur**, complétée deux fois ; météo Open-Meteo câblée dans `ingest_run` | §19 « badges multiples » **mais** §14 fonde le referral sur le **badge Recruiter** | Lire §19 comme « pas de mur de 200 badges », **pas** « supprimer le système ». Reco : catalogue + attribution serveur **KEEP** (invisible), écran collection **HIDE**, **Recruiter visible** (§14 l'exige ; `badges.ts:477` le définit déjà). **Confirmer** — c'est une planche du fondateur. |
| **C17** | Coffre / boutique / pass | -16 §4, -19 §5, -34 §0 | §16/§19 : retirer | **Accepter — la coupe la moins contestable** : `MASTER_SPEC §16 P0` **ne contient pas la boutique** (elle est P2), et -02 A2 avait déjà repoussé le pass. Le prompt retirant aussi boutique+pass, il n'y a plus d'argent → le coffre est sans objet. **MAIS acter la clause de réactivation** : « si la monétisation revient, elle revient **par le coffre**, capée à +35 %, jamais sur les points » — sinon le garde-fou anti-P2W disparaît avec le coffre qu'il protégeait. Laisser les tables 0013 (`items`, `purchases`, `crew_boosts`). |
| **C7** | 3 onglets | ADDENDUM §F dit 3 ; -02 §5 dit 5 ; -29 §1 dit 5 ; **le code en a 4** | §5.2 : 3 | **Accepter** (retour à l'ADDENDUM §F en nombre). Delta réel = **retirer « Saison »**. Trancher séparément : Saison devient (a) une card dans Profil, (b) une route depuis la Carte, (c) LATER. **Reco : (a)** — §5.1 garde « Classement local » et §A.18 en décrit déjà le contenu utile. |
| **C8** | 12 écrans | SPEC §4 disait **« 9 écrans, pas un de plus »** ; réel = 31 | §5.1 : 12 + §26 « radicalement » | **Accepter le principe, refuser la liste telle quelle** : §5.1 tue `calcul-zones`+`faq`+`sources` (explicabilité -23) et `code-conduite`+`support` (App Store -33). **Protéger 3 catégories hors quota** : conformité store, RGPD, explicabilité du refus (sans quoi §8.4 ment). |
| **C19** | Crew : 50 membres, 7 rôles | -34 §1 (`CREW_MAX_MEMBERS` 10→50) **contredit déjà MASTER_SPEC §9 (2-10 au MVP)** | §16 : rôles complexes, raid | (a) rôles → 2 en surface, **matrice serveur intacte** ; (b) raid → flag OFF ; (c) **revanche → KEEP explicitement** (fenêtre 24 h = *exactement* « se faire reprendre → revenir » ; la retirer sous l'étiquette « raid avancé » serait une erreur de lecture) ; (d) **`CREW_MAX_MEMBERS` : 50 ou 10 ?** — constante gelée, arbitrage requis. |
| **C18** | Chat libre | -18 A1 + §A.19 (bouton [Chat]) + -33 (modération bâtie **pour la review App Store**) | §16 : retirer | **Accepter** — un des rares retraits qui **rapporte** (moins d'UGC = moins d'exigences 1.2). Périmètre : retirer la **saisie libre**, garder les **actions structurées** (défense/boucle/victoire) = l'intention d'-18 A1 préservée. Réviser §A.19. |
| **C22** | Notifs | -02 §7 : P0-P6, 2/jour, quiet hours, **« jamais de push par micro-vol »** | §15 : 4 catégories | Conflit surtout de vocabulaire (catégories ≠ priorités, les deux coexistent). Deux vrais deltas : le prompt retire **decay** (couplé à C6 : plus de couleur ni de push = le joueur perd sans avertissement) et « zone reprise » doit rester **agrégée à la zone**, jamais un hex (sinon c'est l'interdit micro-vol). |
| **C21** | Host de partage | Tout le code dit `gryd.run` ; deux schémas divergents | §13 : `gryd.app/z\|c\|r\|d` | **Rien ne prouve quel domaine est possédé** (INPI non fait) : changer le host maintenant grave un domaine peut-être indisponible. Reco : **adopter `z\|c\|r\|d` tout de suite** (sans risque, `invite.ts` l'utilise déjà à moitié), **HOST = une constante unique** à basculer d'une ligne. **0 lien en circulation → la fenêtre pour unifier est maintenant.** |
| **C23** | « ROUEN » | Saison 0 = **Paris + Lille** ; -35 §2 : zéro donnée factice (non négociable) ; sweep zéro-mensonge fait (`ef431dc`) | Exemples « Rouen » | **Gabarit de copie, jamais une donnée.** Acter dans -39 : « les exemples du prompt ne créent aucune donnée ; les scénarios démo restent Paris/Lille ». Aucun arbitrage requis, sauf ouverture réelle de Rouen (→ vrais utilisateurs d'abord). |

**Les 3 à trancher avant toute ligne de code : M1 (verser -39), C10 (GO ou RUN), C12 (l'assouplissement anti-triche — la seule contradiction qui peut abîmer l'intégrité du jeu de façon irréversible).**

**Le prompt se contredit lui-même 3 fois** (C4 : §7.3 vs §8.4 · C13 : §19 vs §8.4/§16 · C16 : §19 vs §14). Ces trois-là demandent une **intention**, pas une déduction — aucun agent ne peut les trancher.

---

## 8. Ce que l'épuration NE règle PAS

**À dire franchement : ce document réorganise une surface que personne ne peut atteindre.**

| Problème | État vérifié | Ce que l'épuration y change |
|---|---|---|
| **O2 — auth Apple/Google** | Non configurée. `sign-in.tsx:113-118` : « Connexion Google pas encore configurée (O2) ». **Aucun humain ne peut se connecter.** | **Rien.** Sans compte : pas de course, pas de capture, pas de partage, pas de referral. **La boucle du prompt est inexécutable aujourd'hui.** |
| **Prod vide** | 1 user, **0 run, 0 hex_claim, 0 crew, 0 secteur**. Rien n'a jamais tourné end-to-end. | **Rien.** Le §4 (« aide-t-il DIRECTEMENT à… ») est un filtre qu'on applique **infiniment mieux avec 20 vrais utilisateurs qu'avec 1**. Épurer sur zéro donnée d'usage = un pari. |
| **La carte ne lit pas la réalité** | `MapScreen` lit `fakeHexes`/`demo.ts`, **jamais `hex_claims`**. | **Rien.** La carte est belle et ne montre aucune réalité. C'est O1, pas de l'épuration. |
| **Crews non persistés** | `todoCrewFlow` (crew.tsx:212-229) = Alert « arrive très bientôt ». **0 insert.** Les 2 actions cœur de §16 ne marchent pas. | **Rien.** Aucune quantité de simplification ne câble une Edge Function. |
| **Attestation d'appareil** | Aucune. **Une capture peut être forgée.** App Attest dépend d'O2. | **Rien — et §8 l'aggraverait** : `first_run_verify_threshold` assouplirait la validation sur comptes neufs **sans attestation** (→ C12). |
| **INPI** | Non fait. **Aucun usage public légal du nom GRYD.** | **Rien.** Bloque aussi les universal links (domaine `gryd.app`/`gryd.run` non prouvé possédé). |
| **Push** | `expo-notifications` **absent** du package.json ; 0 push token ; envoi Expo = TODO (`digest_job/index.ts:10`). §15 est un plan sur une infra inexistante. | **Rien.** |
| **Badge Recruiter inatteignable** | `referralsActivated: 0` **codé en dur** (`engine/badges.ts:127`). La table `referrals` existe et **rien ne l'écrit**. | **Rien.** §14 est livrable « presque sans code » — mais ce « presque » est un pipeline complet, post-O2. |
| **Promesses mortes** | `support.tsx:8` (« Rien de câblé : stubs TODO(O2) ») ; `parametres/[section].tsx:152-170` ; « Bientôt depuis l'app » (`confidentialite.tsx:526-532`). **Visibles du reviewer Apple.** | **Partiellement** — les retirer est du ressort de l'épuration (§A zéro-mensonge). Les **câbler** ne l'est pas. |

**Séquence recommandée, honnêtement :**
**O2 (auth) → la carte lit `hex_claims` → 1 vraie course end-to-end → PUIS épuration au vu du réel.**

**Ce qui reste néanmoins exécutable dès maintenant, sans O2, et qui vaut le coup :** Sprint 1 (-39 + flags), Sprint 2 (6 REMOVE à dépendance nulle), Sprint 3 (les HIDE), Sprint 4 (unification des URL + share engine + deep links entrants + export PNG). Soit **~14 000 lignes de surface en moins et la viralité rendue techniquement possible** — sans jamais toucher au moteur.

**Ce qui ne l'est pas, et qu'il ne faut pas se raconter :** mesurer les 4 preuves. Elles ne se prouveront pas avec un audit. Elles se prouveront avec **un humain qui se connecte, qui court, qui ferme une boucle, et qui envoie la story à un ami**. Aujourd'hui, aucune de ces cinq actions n'est possible.

---

# 9. CONFLITS D'AUTORITE A ARBITRER (fondateur)

# GRYD — Contradictions PROMPT MAÎTRE (AMENDEMENT-39 candidat) ↔ AUTORITÉ DOCUMENTAIRE

**Méthode.** Lecture de `GRYD_REGLES_NON_NEGOCIABLES.md` (§A/§B/§C), `ADDENDUM-DESIGN-v0.1.md`, `AMENDEMENT-02/04/16/19/23/29/34/35/37/38`, `docs/product/GRYD_MASTER_SPEC.md`, `SPEC-MVP-territoire-running-v0.md`, `CLAUDE.md`, `packages/shared/src/game-rules.ts`, `packages/shared/src/design-tokens.ts`, `apps/mobile/app/(tabs)/_layout.tsx`.

**Ordre d'autorité en vigueur** (CLAUDE.md) : `docs/product/*` > `AMENDEMENT-*` (le plus récent gagne) > `SPEC v0` > `ADDENDUM-DESIGN` > `GRYD_REGLES_NON_NEGOCIABLES`. **Le prompt maître n'a pas encore de rang** — tant qu'il n'est pas versé en AMENDEMENT-39, il ne prime sur rien. C'est le premier arbitrage à rendre (voir M1).

**23 contradictions** réparties en 9 familles. Aucune n'est tranchée ici.

---

## A — CARTE : couleurs et états

### C1. Violet = contesté (SHIPPÉ) vs « pas de violet, double contour seul »
1. **Existant** : `GRYD_REGLES_NON_NEGOCIABLES.md` §C — « **contesté = violet + double contour** » ; §C répète « 2 Contesté (61-80, double contour + **violet** + "Zone contestée") ». Confirmé par `AMENDEMENT-37` §10 (garde-fous : « chartreuse=moi, orange=rival, **violet=contesté**, bleu électrique=protégé »). **Le token est en production** : `packages/shared/src/design-tokens.ts:130` → `contested: '#8B5CF6'`, consommé par `roleColor()` (ligne 221-222) et par `apps/mobile/src/features/map/` (`demo.ts:388`, `fakeHexes.ts`, `allTerritories.ts`).
2. **Prompt** : §7.3 — « 4 états SEULEMENT … contesté = **DOUBLE CONTOUR** chartreuse/orange. NE PAS ajouter : … **VIOLET** ».
3. **Enjeu** : le prompt ne supprime pas la *notion* de contesté, seulement sa teinte. Or **§C interdit explicitement de dépendre de la couleur seule (daltonisme)** — la double-forme existe DÉJÀ à côté du violet. Retirer le violet ne casse pas l'accessibilité (la forme reste porteuse), mais retire un signal de balayage à distance. Coût technique : faible (1 token + expressions paint). Coût de cohérence : `roleColor` perd un cas, les 5 niveaux de pression (C2) perdent leur palier visuel n°2.
4. **Recommandation** : **accepter le retrait du violet** — c'est le seul des 4 « à ne pas ajouter » qui ne coûte rien, et §C est le rang le plus bas de l'autorité. Mais le remplacer par un **contour double + hachures** conservé (déjà spécifié §C), pas par « rien ». Si accepté → réviser explicitement §C et -37 §10 dans le texte de l'AMENDEMENT-39 (sinon deux docs actifs se contredisent).

### C2. 5 niveaux de contestation (`pressure_score`) vs « 4 états seulement »
1. **Existant** : §C — « **5 niveaux de contestation pilotés par `pressure_score` (0-100)** : 0 Stable · 1 Pression (halo orange léger) · 2 Contesté · 3 Attaque active (pulse) · 4 Urgence (rouge limité + [DÉFENDRE]) ». `pressure_score` est aussi une **colonne du pré-calcul secteur** prévue §C (backend scalable V1) et dans `AMENDEMENT-37` §3 (bloc PRESSION de la sheet).
2. **Prompt** : §7.3 — 4 états, dont aucun « pression », « attaque active » ou « urgence » ; §7.3 interdit « rouge decay » et « halos ».
3. **Enjeu** : **c'est la contradiction la plus lourde de la famille carte.** Le prompt affirme la boucle « **Se faire reprendre → Revenir défendre** » (§1, promesse produit) — mais retire précisément la grammaire visuelle qui dit *quoi défendre et à quel point c'est urgent*. Sans niveau 3/4, la carte ne peut plus déclencher le retour. Le prompt se contredit lui-même entre sa boucle et son §7.3.
4. **Recommandation** : **arbitrage nécessaire, ne pas appliquer §7.3 à la lettre.** Proposition : garder `pressure_score` comme **moteur** (données, pré-calcul, priorité d'affichage), mais **n'exposer que 2 rendus** : `contesté` (double contour statique) et `urgence` (le SEUL pulse permanent — déjà la règle -37 §5). Soit 4 états visibles (moi / rival / neutre / contesté) **+ 1 accent d'urgence**, ce qui respecte l'esprit du §7.9 (« 1 animation permanente max ») sans tuer le retour-défense.

### C3. Bleu électrique = protégé (AMENDEMENT-37, livré ce matin) vs « pas de bleu protégé »
1. **Existant** : `AMENDEMENT-37` §5 — « **Protégé = BLEU ÉLECTRIQUE** (§7.2/§8), token dédié `electricBlue ~#2E6BFF`, contour alpha 0.7-0.85 (dissocié de `verify #6FB7FF`) » — **Batch 1, livré** (tâche #75 completed). L'autorité invoquée est `docs/product/GRYD_ETUDE_MARCHE_CARTE_2026.md`, **rang 1**.
2. **Prompt** : §7.3 — « NE PAS ajouter : **bleu protégé** ».
3. **Enjeu** : le prompt révoque un delta **de rang 1 (docs/product)** implémenté il y a quelques heures, sur la base d'un prompt sans rang. C'est le cas le plus net où **l'autorité formelle contredit le prompt**. Question de fond derrière la couleur : **l'état « protégé » existe-t-il encore au MVP ?** Si oui il lui faut un signal ; si non, c'est une règle de jeu qu'on retire (pas un choix de palette) — et §C prévoit le **bouclier** (forme) comme signal alternatif.
4. **Recommandation** : **découpler.** (a) Trancher d'abord « protection : KEEP ou LATER ? » — si LATER, la couleur devient sans objet et -37 §5 tombe proprement. (b) Si KEEP, préférer **bouclier monochrome** (forme, §C) au bleu → satisfait le prompt (pas de bleu) ET la charte tri-couleur de l'ADDENDUM §C.2/C.3 sans casser l'étude 2026. Note : le bleu était de toute façon une **entorse à la charte** « noir/blanc/chartreuse » (ADDENDUM §C.3 : « tout le reste vit en noir/blanc/gris »).

### C4. Les 3 états manquants d'AMENDEMENT-37 §5 vs le plafond de 4 états
1. **Existant** : `AMENDEMENT-37` §5 (Batch 2, livré — tâche #76) — 3 états à ajouter : `openBoundary` (pointillé + point de fermeture), **`loopIncomplete`** (anneau ouvert + segment manquant chartreuse + distance), `excluded` (hachures grises + raison au tap).
2. **Prompt** : §7.3 (4 états) + §7.9 (« 3 labels max », « aucune hachure multiple »).
3. **Enjeu** : **`loopIncomplete` est exactement ce que le prompt §8.4 exige** (« BOUCLE PRESQUE FERMÉE / Il manquait 110 m / [TERMINER LA BOUCLE] » + mission sauvegardée). Le prompt supprime en §7.3 l'état dont il a besoin en §8.4. Idem `excluded` : le prompt §10 veut « segments exclus » dans *voir détails* — il faut donc les rendre quelque part.
4. **Recommandation** : **clarifier que §7.3 parle des états de POSSESSION** (qui possède quoi), pas des états de **trace/boucle** (§B). Les 4 états = propriété ; `openBoundary`/`loopIncomplete`/`excluded` = grammaire de trace, régie par §B (trace héros), hors quota. Sans cette distinction, §7.3 et §8.4 sont inapplicables ensemble.

### C5. Fills de possession 16 % (AMENDEMENT-37 §1) vs « neutre = gris transparent » (silence sur le reste)
1. **Existant** : `AMENDEMENT-37` §1 rétablit un **aplat de possession** (fill 16 % crew/rival, 18 % contesté, LOD z10-15, s'efface à z16+), **révisant explicitement AMENDEMENT-36** (« zéro aplat »). Livré (Batch 1).
2. **Prompt** : §7.3 ne décrit un fill que pour le neutre (« gris **transparent** ») et reste muet sur moi/rival — lu strictement avec §7.9 (anti-pollution), on peut le lire comme un retour à -36.
3. **Enjeu** : ambiguïté, pas contradiction franche. Mais -36 → -37 est un **aller-retour déjà fait une fois** ; un 3ᵉ revirement coûterait un batch complet.
4. **Recommandation** : **demander une confirmation explicite** — « les fills 16 % LOD de -37 §1 : KEEP ? ». Défaut recommandé : **KEEP** (ils viennent de rang 1 et l'étude les motive par la lecture « qui possède quoi », qui est le §7.3 du prompt lui-même).

### C6. « Rival principal orange/rouge » (§C) vs « adversaire = orange » + « pas de rouge decay »
1. **Existant** : §C — palette rôle : « rival principal = **orange/rouge** » ; « decay = **rouge sombre**/pointillé » ; « bonus = **gold**/éclair » ; « route/info = blanc ». Le niveau 4 Urgence utilise « **rouge limité** ».
2. **Prompt** : §7.3 — « adversaire = orange » (sans rouge) ; interdits : « **or bonus** », « **rouge decay** ».
3. **Enjeu** : cohérent avec le retrait des bonus (C13) et du decay visuel. Mais **le decay est une règle de jeu gelée** (SPEC §3 ; `AMENDEMENT-23` A : « decay binaire à 21 j » dans le code). Retirer son *signal* sans retirer sa *mécanique* = zones qui tombent sans prévenir → **viole §A « l'app ne ment jamais »** et casse le « Revenir » de la boucle.
4. **Recommandation** : accepter orange-seul pour le rival (simplification réelle, gratuite). **Refuser le retrait du signal de decay** tant que la mécanique de decay tourne — ou trancher « decay : LATER » explicitement. Alternative charte-compatible : decay = **pointillé + sablier** (forme, §C), zéro rouge.

---

## B — NAVIGATION ET ÉCRANS

### C7. 3 onglets (prompt) vs 5 (AMENDEMENT-02 §5 / -29 §1) vs 4 (réel) vs 3-autres (ADDENDUM §F)
1. **Existant — quatre positions successives** :
   - `ADDENDUM-DESIGN` §F : « Barres de nav : **3 onglets max (Carte · Classements · Profil)** ».
   - `AMENDEMENT-02` §5 : « **Navigation : 5 onglets (remplace les 3 de l'addendum §F)** — Carte · Crew · Classement · **Boutique** · Profil ».
   - `AMENDEMENT-29` §1 : relabel 5 onglets → « **Carte · Missions · Crew · Saison · Profil** » (Boutique sort de la nav).
   - **Code réel** (`apps/mobile/app/(tabs)/_layout.tsx`) : **4 destinations visibles** — « Carte · Crew · Saison · Moi » ; `warroom` (Missions) est déjà **hors barre**, atteinte depuis « Moi ». *(Le brief de mission annonçait 5 : la réalité est 4.)*
2. **Prompt** : §5.2 — « **Carte · Crew · Profil** (3 onglets) ».
3. **Enjeu** : le prompt **revient à l'ADDENDUM §F en nombre mais pas en composition** (Crew au lieu de Classements). Le delta réel est donc **petit : retirer l'onglet « Saison »** (et confirmer Missions hors barre). Le vrai coût n'est pas la barre — c'est ce que devient `/(tabs)/classement` (Saison = classement + récompenses + objectifs de saison, -29 §1) : le prompt §5.1 autorise « Classement local » mais §5.2 dit « accessible depuis Carte/Profil/Crew », et §19 retire « Saison ».
4. **Recommandation** : **accepter les 3 onglets** (aligné ADDENDUM §F + esprit §A). Trancher séparément : « Saison » devient-il (a) une **card dans Profil**, (b) une route atteinte depuis la Carte, ou (c) LATER ? Recommandation : (a) — le classement local est explicitement KEEP en §5.1, et §A.18 décrit déjà son contenu utile (« ton rang · l'écart · quoi faire pour monter »). Acter dans -39 que **-02 §5 et -29 §1 sont révisés**.

### C8. 12 écrans (prompt) vs 31 routes (réel) vs « 9 écrans, pas un de plus » (SPEC §4.2)
1. **Existant** : `SPEC-MVP-territoire-running-v0.md` §4 — « **Parcours et écrans (9 écrans, pas un de plus)** ». Réalité : **31 routes** mobile. Les 22 routes hors des 12 du prompt (`arsenal` ~4093 l., `warroom` ~1778, `badges` ~1407, `performance` ~798, `route-planner` ~2330, `challenges`, `settings-motivation`, `calcul-zones`, `sources`, `faq`, `territoire`, `amis`, `crew-discovery`, `crew-public`, `crew-edit`, `aujourdhui`, `code-conduite`, `support`…) sont **toutes issues d'amendements fondateur** (-07, -10, -14, -16, -18, -23, -25, -33).
2. **Prompt** : §5.1 (12 écrans autorisés) + §26 (« Ne cherche pas à conserver tout ce qui existe. Le produit doit être simplifié RADICALEMENT »).
3. **Enjeu** : **le prompt est ici plus proche de la SPEC d'origine que le repo ne l'est.** La dérive 9 → 31 est réelle et documentée. MAIS : le prompt §26 autorise la suppression, et **§5.1 n'est pas neutre** — il tue au passage `calcul-zones` + `faq` + `sources`, qui sont la **couche d'explicabilité d'AMENDEMENT-23** (« chaque zone gagnée doit pouvoir être expliquée ; chaque zone refusée aussi »), et `code-conduite` + `support`, qui sont des **exigences App Store** (`AMENDEMENT-33`, modération UGC).
4. **Recommandation** : **accepter le principe, refuser la liste telle quelle.** Passer les 31 routes au filtre §4 une par une, mais **protéger 3 catégories non négociables hors du quota de 12** : (i) **conformité store** (code-conduite, support, suppression de compte — -33), (ii) **RGPD** (confidentialité, sources — déjà en §5.1 partiellement), (iii) **explicabilité du refus** (« pourquoi ma course n'a pas compté » — sans quoi §8.4 ment). Recommander de compter ces écrans comme *plomberie légale*, pas comme *surface produit*.

### C9. §A.16/§A.18/§A.19 régissent des écrans que le prompt supprime
1. **Existant** : la constitution §A consacre **3 de ses 20 règles** à des écrans que le prompt retire ou vide : §A.16 « **War Room** répond à "que doit faire mon crew maintenant ?" … sections Urgent/À terminer/Actif/**Coffre** » ; §A.18 « **League** dit : ton rang … » ; §A.19 « **Crew HQ** : … [**War Room**] · [**Chat**] · [Inviter] ».
2. **Prompt** : §16 « RETIRER : **War Room complète**, **coffre**, … **chat libre complet** … » ; §19 « À RETIRER : **Saison** … **War Room** ».
3. **Enjeu** : si -39 passe, **§A.16 et §A.19 deviennent partiellement caducs** et §A.18 perd son écran. Ne pas le dire = laisser une constitution qui décrit des écrans morts, et un futur agent qui les reconstruira en citant §A. C'est exactement le mécanisme qui a produit la dérive 9 → 31.
4. **Recommandation** : **quel que soit l'arbitrage, -39 doit contenir une clause "Ce que ça révise"** nommant §A.16, §A.18, §A.19 (modèle : `AMENDEMENT-38` le fait très proprement pour §A.4). Sinon la contradiction reste dans le corpus.

---

## C — LE BOUTON

### C10. « GO » (AMENDEMENT-38, override fondateur explicite) vs « bouton RUN » (prompt §5.2)
1. **Existant** : `AMENDEMENT-38-BOUTON-GO.md` — « **Statut : ACTIF. Décision FONDATEUR directe (2026-07-13)** : le bouton d'action central … devient un **unique bouton "GO"**, au lieu des verbes contextuels RUN/DÉFENDRE/CONQUÉRIR/TERMINER/REJOINDRE ». -38 révise nommément **§A.4** (« Jamais "GO" partout ») et **AMENDEMENT-29** (« "GO" est retiré définitivement — toujours un VERBE qui dit POURQUOI tu cours »). Le mémoire projet le confirme comme override à ne pas défaire.
2. **Prompt** : §5.2 — « **Bouton RUN** flottant contextuel, PAS un onglet ».
3. **Enjeu** : **le prompt réaligne le libellé sur §A.4 + -29 — c'est-à-dire qu'il annule l'override fondateur de -38, vieux de 2 jours.** Trois lectures possibles, et **je ne peux pas les départager** : (a) le fondateur a changé d'avis ; (b) « RUN » est employé génériquement pour « le bouton de course », sans intention de renommer ; (c) le fondateur a oublié -38 en écrivant. La structure, elle, ne change pas : -38 §« Portée exacte » a **conservé le routing contextuel** (`deriveContextualAction`), donc « flottant + contextuel » est déjà vrai.
4. **Recommandation** : **question directe au fondateur, réponse binaire, avant toute ligne de code** : « Le bouton central affiche-t-il **GO** (-38, il y a 2 jours) ou **RUN** (prompt) ? ». Défaut si pas de réponse : **garder GO** — un override fondateur daté et explicite pèse plus qu'un mot dans un prompt de cadrage, et le coût de se tromper dans ce sens est nul (1 string). Ne PAS traiter le silence comme un accord.

### C11. Bouton présent partout (code) vs gating strict (-29 §3) vs « 2 boutons flottants max » (§7.9)
1. **Existant** : `AMENDEMENT-29` §3 — gating strict : « **JAMAIS visible sur : Profil · Saison · Crew · Paramètres · Confidentialité · Historique · Partage · Arsenal/Boutique · FAQ** » ; §A.5 : « Le gros bouton central **n'est PAS permanent** ». **Mais le code dit l'inverse** : `_layout.tsx` — « le bouton d'action contextuel chartreuse (AMENDEMENT-29), **présent sur TOUS les onglets** — "le joueur ne doit jamais chercher comment courir" ».
2. **Prompt** : §5.2 « Bouton RUN flottant contextuel » (sans gating) + §7.9 « **2 boutons flottants max** ».
3. **Enjeu** : **contradiction §A.5/-29 ↔ code, préexistante au prompt** — le prompt ne la crée pas, il ne la résout pas non plus. À noter : sur la Carte, le bouton central + les 2 FABs de -37 §8 (Couches + Recentrer) = **3 éléments flottants** → §7.9 est **déjà violé aujourd'hui** si on compte le bouton central comme flottant.
4. **Recommandation** : profiter de -39 pour trancher **la définition** : le bouton central compte-t-il dans le quota « 2 flottants » ? Recommandation : **non** (c'est la nav, pas un FAB) → -37 §8 (2 FABs) et §7.9 restent compatibles. Et trancher le gating : recommandation **garder « présent partout »** (la note de code est un choix délibéré et le prompt va dans son sens : « le joueur ne doit jamais chercher comment courir »), en **révisant §A.5 et -29 §3 explicitement**.

---

## D — RÈGLES DE JEU ET MOTEUR (la famille la plus risquée)

### C12. Première course assistée (§8) vs constantes gelées + anti-triche + « aucun nombre magique »
1. **Existant** :
   - `CLAUDE.md` : « **règles de jeu gelées §3** » ; « **Aucun nombre magique** : toute constante de jeu vient de `packages/shared/src/game-rules.ts` ».
   - `game-rules.ts` : `RUN_MIN_DISTANCE_M = 1_000` (l.13), `RUN_MIN_DURATION_S = 6*60` (l.14), **`LOOP_CLOSE_TOLERANCE_M = 80`** (l.985).
   - `AMENDEMENT-16` §2 a **durci** cette tolérance : « **Fermeture : tolérance 80 m (remplace 100)** », plus compacité min (0,12) et largeur min (~60 m) — décision anti-abus explicite.
   - « **Tout claim est décidé serveur** » (CLAUDE.md, -37 §10).
2. **Prompt** : §8 — « tolérance de fermeture **plus généreuse** … **capture quasi garantie** » ; constantes à créer : `first_run_closure_tolerance_m`, `first_three_runs_assisted`, `first_run_min_area`, `first_run_min_distance`, `first_run_verify_threshold`.
3. **Enjeu** : **le plus sérieux du lot.** (a) `first_run_verify_threshold` = un **seuil anti-triche assoupli pour les nouveaux comptes** → c'est exactement le vecteur d'attaque qu'un tricheur exploite (créer des comptes neufs), et le repo **n'a pas d'attestation d'appareil** (App Attest bloqué par O2). (b) `first_run_closure_tolerance_m` > 80 m **annule partiellement -16 §2**. (c) « capture **quasi garantie** » : si la capture est garantie par le statut du joueur et non par son tracé, **l'app ment** (§A) et le territoire n'est plus « gagné avec les jambes » (`AMENDEMENT-16` §4, formule fondatrice).
4. **Recommandation** : **accepter l'INTENTION (la 1re capture doit réussir), refuser le MÉCANISME (assouplir la validation).** Contre-proposition à soumettre : ne pas toucher aux seuils de validation — **agir en amont** : (i) `first_run_min_area` / `first_run_min_distance` **comme critères de RECOMMANDATION de zone** (proposer une boucle de 1,5-3 km facile à fermer — le prompt le demande déjà), (ii) guidance live renforcée (« il reste 280 m » existe déjà, -16 §1), (iii) **zéro** dérogation sur `LOOP_CLOSE_TOLERANCE_M` et **zéro** `first_run_verify_threshold`. Résultat identique côté ressenti, intégrité intacte. **Si le fondateur maintient l'assouplissement**, exiger : constante dans `game-rules.ts` (jamais en dur), cap dur sur `first_three_runs_assisted`, et une **mention visible** dans le post-run (« Première course : fermeture assistée ») — sinon c'est un mensonge silencieux.

### C13. Retrait des bonus (§19, flag `bonuses`) vs AMENDEMENT-19 (décision fondateur, moteur livré)
1. **Existant** : `AMENDEMENT-19-BONUS-CIBLES.md` — « **Décision fondateur (05/07/2026)** … *"GRYD ne te donne pas des bonus au hasard. Il révèle les bons moments pour agir."* » ; livré : `packages/shared/src/bonuses.ts` (DATA), `packages/engine/src/bonus.ts` (sélecteur PUR + tests Deno), `BONUS_MAX_TOTAL_PCT = 0.35`, **6 bonus MVP**, tâche #48 completed. Le **Bonus Finisher** y est désigné « **à livrer EN PREMIER** — il relie boucle incomplète + crew + entraide + War Room + retour à l'app ».
2. **Prompt** : §19 « À RETIRER : … **bonus** … » ; §7.3 « pas d'**or bonus** » ; §7.9 « aucun **bonus**/coffre » ; flag `bonuses`.
3. **Enjeu** : le **Bonus Finisher sert exactement la boucle du prompt** (« BOUCLE PRESQUE FERMÉE » §8.4 + entraide crew §16). Le prompt retire l'objet dont sa propre §8.4 a besoin. Par ailleurs -19 §5 est le **garde-fou anti-pay-to-win** (`BONUS_MAX_TOTAL_PCT`, « un seul multiplicateur actif ») : retirer les bonus retire aussi le cap qui neutralise le Crew Boost payant.
4. **Recommandation** : **feature-flag `bonuses = OFF` (comme demandé) MAIS conserver le moteur et le cap en place** (code mort testé ≠ pollution UI ; le §4 du prompt juge la SURFACE, pas le backend). **Exception à discuter** : ré-exposer le seul **Bonus Finisher** sous un autre nom (ce n'est pas un « bonus », c'est la mission sauvegardée du §8.4). Coût de le rebâtir plus tard : élevé (data + engine + tests).

### C14. Retrait du `fitness_score` vs « 4 scores séparés » (AMENDEMENT-02 §3)
1. **Existant** : `AMENDEMENT-02` §3 — « **4 scores séparés** : territoire (saison), performance (sportif), crew (collectif), réputation (permanent). MVP : territoire complet + **performance minimal** » ; `PERFORMANCE_BONUS_CAP (1.15) / FLOOR (0.90)` dans `game-rules.ts` (§10 de -02), **multiplicateur appliqué aux points de territoire** (`AMENDEMENT-23` A : « × performance (0,9-1,15) »).
2. **Prompt** : §19 retire « **Performance** » ; flags `fitness_score`, `advanced_stats`.
3. **Enjeu** : « Performance » désigne **deux choses** : (a) **l'écran** `/performance` (798 lignes) — retrait sans douleur ; (b) **le multiplicateur ×0,90-×1,15 dans le calcul de points** — retrait = **changement de barème gelé §3**, qui touche `game-rules.ts`, l'engine et les tests. Le prompt ne distingue pas.
4. **Recommandation** : **acter le retrait de l'ÉCRAN, pas du multiplicateur** (KEEP moteur, HIDE surface). Si le fondateur veut aussi retirer le multiplicateur, c'est un **amendement de barème** à part, avec réécriture des tests engine — ne pas l'emballer dans une passe d'épuration UI.

### C15. Retrait des « skills » (§19) vs AMENDEMENT-23 §C (construit sur demande fondateur)
1. **Existant** : `AMENDEMENT-23` §C — « Système de Skills » (catalogue + dérivation + Profil + War Room), source `GRYD_calcul_zones_skills_FAQ_regles.md` (**rang 1, docs/product**). Tâche #55 completed.
2. **Prompt** : §19 « À RETIRER : … **Skills** » ; flag `skills`.
3. **Enjeu** : source de **rang 1** vs prompt sans rang. Mais les Skills ne servent aucun des 4 objectifs du MVP (§4) — le filtre d'épuration les élimine proprement.
4. **Recommandation** : **flag OFF** (le prompt le demande explicitement via `skills`), en notant que ça met en sommeil un doc de rang 1. Faible risque : les skills sont dérivées (pas de données à perdre).

### C16. Retrait des badges (§19 « badges multiples ») vs AMENDEMENT-04/06 + §A.17
1. **Existant** : `AMENDEMENT-04-BADGES.md` — « **Source : planche "GRYD — TOUS LES BADGES" fournie par le fondateur** » (50 badges, 5 familles, 9 secrets) ; `AMENDEMENT-04` §4 « **Décision fondateur (03/07/2026)** : le concept "dormant" disparaît — **chaque badge est réellement décernable** » (→ intégration météo Open-Meteo dans `ingest_run`, détection avant-postes V0) ; `AMENDEMENT-07` pousse à « ~200+ badges ». `§A.17` : Profil contient une card **Badges**. Écran `/badges` = 1407 lignes ; `packages/shared/src/badges.ts` ; migrations 0008/0009/0012.
2. **Prompt** : §19 « À RETIRER : … **badges multiples** » ; §14 : les récompenses de referral sont **cosmétiques** — et cite « **badge Recruiter** » comme récompense valide.
3. **Enjeu** : **le prompt retire les badges en §19 et s'en sert en §14.** Or `badges.ts:477` définit déjà **exactement** `def('crew', 'recruiter', 'Recruiter', 'Active 5 recrues via ton parrainage.', …, 'referralsActivated', 5)`. Par ailleurs les badges sont la **seule surface polychrome autorisée** (-04 §1) — les retirer simplifie la charte. Enfin, les badges météo ont mis du **code dans `ingest_run`** (appel Open-Meteo fail-open) : « retirer les badges » ne se limite pas à un écran.
4. **Recommandation** : lire §19 comme « **badges multiples** » = *pas de mur de 200 badges au MVP*, **pas** « supprimer le système ». Proposition : **KEEP le catalogue + l'attribution serveur** (invisible), **HIDE l'écran collection**, **KEEP un badge en surface : Recruiter** (le prompt l'exige en §14). Demander confirmation — c'est une planche que le fondateur a lui-même fournie et fait compléter deux fois.

---

## E — CREW ET MONÉTISATION

### C17. Retrait du `crew_chest` (§16/§19) vs le seul canal de monétisation non pay-to-win
1. **Existant** : `AMENDEMENT-16` §4 — « **Crew Boost** (contribution volontaire) : 24 h 1,99 € / … / Saison 14,99 € — effets : **+25 % progression coffre (jamais points)** » ; `AMENDEMENT-19` §5 — « bonus système + Crew Boost acheté ne se cumulent PAS … **cap total +35 %** » ; `AMENDEMENT-34` — « Le seul multiplicateur ajouté (coffre quotidien) agit … sur la **progression du coffre crew UNIQUEMENT**, jamais sur les points/XP/leaderboard ». Formule fondatrice (-16) : « **La victoire ne s'achète jamais** » → *le coffre EST le sas qui rend l'argent inoffensif*.
2. **Prompt** : §16 « RETIRER : … **coffre** … » ; §19 « … **coffres** » ; flags `crew_chest`, `shop`, `season_pass`.
3. **Enjeu** : **conséquence non anticipée par le prompt.** Le coffre n'est pas un ornement : c'est **la cible unique et capée de tout l'argent du jeu**. Le supprimer sans supprimer la monétisation laisserait l'argent sans destination inoffensive → pression future pour le faire atterrir sur les points. Ici, cohérent : le prompt retire AUSSI la boutique et le pass, donc **au MVP il n'y a plus d'argent du tout** → le coffre devient effectivement sans objet. Alignement notable : **`MASTER_SPEC` §16 P0 ne contient PAS la boutique** (elle est P1/P2 : « Boutique quotidienne complète » = **P2**), et `AMENDEMENT-02` A2 avait déjà repoussé le pass en v1.1.
4. **Recommandation** : **accepter — le prompt est ici en accord avec le MASTER_SPEC P0**, ce qui en fait la coupe la moins contestable du lot. Mais **acter dans -39 la clause de réactivation** : « si la monétisation revient, elle revient **par le coffre**, capée à +35 %, jamais sur les points » — sinon le garde-fou anti-P2W disparaît avec le coffre qu'il protégeait. Vérifier aussi l'impact sur `AMENDEMENT-33` (IAP = exigence de review App Store si des achats sont annoncés) et sur les migrations 0013 (`items`, `purchases`, `crew_boosts` — laisser les tables, couper la surface).

### C18. « RETIRER le chat libre complet » (§16) vs AMENDEMENT-18 A1 + AMENDEMENT-33 (modération UGC)
1. **Existant** : `AMENDEMENT-18` A1 « Crew Chat actionnable » (tâche #44) ; `§A.19` : Crew HQ porte un bouton **[Chat]** ; `AMENDEMENT-33` a bâti la **modération UGC** (signalement/blocage) **précisément pour faire passer la review App Store**.
2. **Prompt** : §16 « RETIRER : … **chat libre complet** » (KEEP : « demander défense », « partager victoire »).
3. **Enjeu** : **retirer le chat REDUIT le risque App Store** (moins d'UGC = moins d'exigences 1.2). C'est un des rares retraits qui **rapporte** au-delà de l'épuration. Mais §A.19 nomme [Chat] comme un des 3 boutons du Crew HQ → à réviser. Attention : « chat libre » ≠ « messages » — le prompt garde « demander défense » et « boucle crew », qui sont des **messages actionnables** (= exactement ce qu'est le Crew Chat d'-18 A1, qui n'est pas un chat libre).
4. **Recommandation** : **accepter**, en précisant le périmètre : retirer la **saisie de texte libre**, garder les **actions structurées** (demander défense / rejoindre boucle / partager victoire). Ça vide le risque UGC tout en préservant -18 A1 dans son intention. Réviser §A.19.

### C19. Crews : 50 membres + rôles hiérarchiques (AMENDEMENT-34/16) vs « rôles complexes : RETIRER »
1. **Existant** : `AMENDEMENT-16` §3 — 7 rôles (`founder / co_captain / captain / strategist / scout / runner / rookie`) + matrice `CREW_PERMISSIONS` complète + `ROOKIE_TRIAL_DAYS` (7 j) ; `AMENDEMENT-34` §1 — `CREW_MAX_MEMBERS` **10 → 50**, score sur les 30 plus actifs (`CREW_SCORE_TOP_ACTIVE`), **raid 48 h**, **revanche 24 h**. `MASTER_SPEC` §9 dit pourtant : « Crews : **2 à 10 membres au MVP** ».
2. **Prompt** : §16 « RETIRER : … **rôles complexes**, … **raid avancé**, donations » ; §19 retire « Events avancés ».
3. **Enjeu** : **-34 (10→50 membres) contredisait DÉJÀ le MASTER_SPEC §9 (2-10 au MVP)** — contradiction préexistante, rang 1 contre amendement récent. Le prompt tranche implicitement en faveur du MASTER_SPEC. Note : la **revanche** (-34, fenêtre 24 h) est *exactement* le « **Se faire reprendre → Revenir** » de la boucle du prompt — la retirer sous l'étiquette « raid avancé » serait une erreur de lecture.
4. **Recommandation** : (a) **rôles** → réduire à 2 (`founder` / `member`) en surface, **garder la matrice serveur** (sécurité, pas UI) ; (b) **raid** → flag OFF ; (c) **revanche → KEEP explicitement** (elle sert la boucle) ; (d) **`CREW_MAX_MEMBERS`** → demander l'arbitrage 50 (-34) vs 10 (MASTER_SPEC) — c'est une constante gelée, pas un choix d'écran.

---

## F — VIRALITÉ ET REFERRAL

### C20. Referral cosmétique seul (§14) vs SPEC §3.7 « ×2 points pendant 7 jours » (constante gelée)
1. **Existant** : `SPEC-MVP-territoire-running-v0.md` §3.7 (l.82) — « Lien unique. Après la **1re course validée du filleul** : parrain ET filleul reçoivent **×2 points pendant 7 jours**. Cap : 5 filleuls actifs/saison. » ; `game-rules.ts` l.246-249 :
   ```ts
   // ─── §3.7 Parrainage ───
   export const REFERRAL_BOOST_MULTIPLIER = 2;
   export const REFERRAL_BOOST_DAYS = 7;
   export const REFERRAL_MAX_ACTIVE_PER_SEASON = 5;
   ```
   `SPEC` §9.4 le répète : « **Parrainage (§3.7) : boost ×2 partagé, récompense en gameplay** ».
2. **Prompt** : §14 — « récompenses **COSMÉTIQUES uniquement** (badge Recruiter, frame, template, skin de trace, titre) — **JAMAIS zones/points/rank** ».
3. **Enjeu** : **contradiction frontale sur une constante gelée §3.** Un ×2 sur les points **est** un avantage de classement obtenu socialement — c'est du pay-to-win par le recrutement, ce que toute la doctrine anti-P2W (-16 §4, -19 §5, -34 §0) interdit ailleurs. **Le prompt corrige ici une incohérence réelle de la SPEC.** Bonne nouvelle : **`REFERRAL_BOOST_MULTIPLIER` n'est consommé NULLE PART** — `grep` ne le trouve que dans `game-rules.ts` et sa copie `_shared`. **Le ×2 n'a jamais été implémenté** → le retrait est gratuit.
4. **Recommandation** : **accepter le prompt — c'est la meilleure décision du document.** Retirer/neutraliser `REFERRAL_BOOST_MULTIPLIER` + `REFERRAL_BOOST_DAYS`, garder `REFERRAL_MAX_ACTIVE_PER_SEASON` (cap anti-fraude). **Réviser SPEC §3.7 nommément** dans -39 (c'est un amendement de règle §3, à écrire comme tel). Le badge `recruiter` existe déjà (`badges.ts:477`, metric `referralsActivated`) → §14 est livrable presque sans code, à condition de garder les badges (cf. C16).

### C21. Tables virales (§21) — absence, pas contradiction
1. **Existant** : `share_links`, `share_clicks`, `referrals`, `share_exports` = **tables absentes** (36 migrations, aucune). Il existe une fondation : `apps/mobile/src/features/share` (ShareMap animée, `shareRun.ts`, deep links, privacy) + écran `/partage` (tâches #69-#73).
2. **Prompt** : §21 les demande ; §11-13 demandent templates conquête/défense/crew + sticker PNG transparent + deep links `gryd.app/z|c|r|d/…`.
3. **Enjeu** : **pas un conflit — un vrai trou.** Seule vigilance : `share_clicks` = données comportementales → RGPD (`GRYD_safety_privacy_rgpd.md`, -33) ; RLS obligatoire (CLAUDE.md) ; et les deep links `gryd.app` supposent un **domaine + INPI**, tous deux non faits.
4. **Recommandation** : **chantier propre à ouvrir** (RLS partout, écriture service-role, rétention documentée). Sans lien avec l'arbitrage des contradictions.

---

## G — NOTIFICATIONS

### C22. « 4 catégories max » (§15) vs P0-P6 + interdits absolus (AMENDEMENT-02 §7)
1. **Existant** : `AMENDEMENT-02` §7 — « Max **2 push/jour**, quiet hours 21h-8h, digest groupé, **priorités P0-P6** » ; `game-rules.ts` l.252-254 : `PUSH_QUIET_HOURS_START = 21`, `PUSH_QUIET_HOURS_END = 8`, `PUSH_MAX_PER_DAY = 2` ; interdits absolus : « position d'autrui, anxiogène nocturne, **push par micro-vol** ». `docs/product/GRYD_notifications_logic.md` (rang 1) : « Rares, utiles, actionnables », canaux vol majeur / offensive / **decay** / streak.
2. **Prompt** : §15 — « **4 catégories max** (zone reprise, invitation crew, boucle crew, classement) ».
3. **Enjeu** : conflit **léger et surtout de vocabulaire** (catégories ≠ priorités : les 2 systèmes peuvent coexister — 4 catégories rangées en P0-P6). Deux vrais deltas : (a) le prompt **retire les push decay et streak** (or -02 les prévoit et le decay sert le « Revenir » de la boucle) ; (b) « **zone reprise** » comme catégorie doit rester compatible avec « **jamais de push par micro-vol** » (-02 §7) — sinon c'est un push par hex volé, exactement l'interdit.
4. **Recommandation** : **accepter les 4 catégories**, en conservant explicitement : `PUSH_MAX_PER_DAY = 2`, les quiet hours, le digest, et **l'interdit micro-vol** (une « zone reprise » = une zone, agrégée, pas un hex). Trancher le sort du **push decay** (couplé à C6 : si le decay n'a plus ni couleur ni push, le joueur perd sans avertissement → §A « l'app ne ment jamais »).

---

## H — COPIE ET DONNÉES

### C23. « ROUEN » dans les exemples vs Saison 0 = Paris + Lille + interdit de données factices
1. **Existant** : `CLAUDE.md` — « Saison 0 focalisée **Paris + Lille** » ; « **ne jamais fabriquer de données européennes factices** (villes/classements/rivaux) tant qu'aucun vrai utilisateur ne les peuple » ; `AMENDEMENT-35` §2 (règle d'honnêteté, NON négociable) — « **Interdit** : afficher un classement "Europe", des villes rivales européennes … sur des lignes de démonstration » ; `AMENDEMENT-02` §2 : « Paris + Lille sont seedées `active` d'office pour la Saison 0 » ; `AMENDEMENT-37` §10 (garde-fou) ; mémoire projet `no-fake-europe-data.md` : « ma rationalisation inverse était fausse ». Le sweep zéro-mensonge (commit `ef431dc`) a corrigé exactement ce défaut.
2. **Prompt** : utilise **« ROUEN »** dans ses exemples de copie (et « République » ailleurs — Paris, conforme).
3. **Enjeu** : **faible si lu comme gabarit, grave si pris au mot.** Rouen n'est ni Paris ni Lille : y créer une zone/un classement/un rival de démo serait précisément le mensonge que -35 §2 interdit et que le sweep vient de retirer.
4. **Recommandation** : **traiter « Rouen » comme un gabarit de copie, jamais comme une donnée** — c'est déjà l'instruction du brief et je m'y tiens. Acter dans -39 : « les exemples de copie du prompt (Rouen) ne créent aucune donnée ; les scénarios démo restent **Paris/Lille** ». Aucun arbitrage fondateur requis, sauf s'il veut réellement ouvrir Rouen (→ alors : vrais utilisateurs d'abord).

---

## I — MÉTA (à trancher AVANT le reste)

### M1. Le prompt n'a pas de rang dans l'autorité
`CLAUDE.md` fixe un ordre strict. Le prompt révoque des éléments de **rang 1** (`GRYD_ETUDE_MARCHE_CARTE_2026.md` via -37 : C3, C5), un **override fondateur de rang 2 vieux de 2 jours** (-38 : C10), et des **constantes gelées §3** (C12, C20, C14). **Tant qu'il n'est pas versé en `AMENDEMENT-39-EPURATION-VIRALITE.md` avec une clause « Ce que ça révise » nommant chaque doc touché, il ne prime sur rien** — et un agent futur relira §A/§C/-37/-38 et reconstruira ce qu'on aura retiré. C'est le mécanisme exact de la dérive 9 écrans → 31 routes.
**Recommandation** : premier livrable = **-39 rédigé** (modèle : `AMENDEMENT-38`, qui révise §A.4 et -29 nommément et borne sa portée — « ne pas sur-interpréter »). Le code vient après.

### M2. O2 rend la boucle du prompt inexécutable — la priorité est peut-être ailleurs
Le prompt veut prouver 4 choses : (1) compris immédiatement, (2) 1re zone capturable sans aide, (3) envie de partager, (4) le partage amène un nouvel utilisateur. **Aucune n'est mesurable aujourd'hui** : prod = 1 user, 0 run, 0 hex_claim, 0 crew ; **auth Apple/Google non configurée → aucun humain ne peut se connecter** ; la carte ne lit jamais `hex_claims` (fakeHexes) ; crews non persistés. §21 (`share_clicks`, `referrals`) mesure une viralité qui ne peut pas exister sans (2), qui ne peut pas exister sans O2.
**Recommandation** : signaler au fondateur que **-39 réorganise une surface que personne ne peut atteindre**. Séquence recommandée : **O2 (auth) → carte lit `hex_claims` → 1 vraie course end-to-end → PUIS épuration au vu du réel**. Une épuration décidée sur zéro donnée d'usage est un pari, pas une observation — et le §4 du prompt (« aide-t-il DIRECTEMENT à… ») est un filtre qu'on applique bien mieux avec 20 vrais utilisateurs qu'avec 1.

### M3. Le prompt se contredit lui-même (3 fois) — à faire arbitrer, pas à interpréter
- **§7.3 vs §8.4** : retire les états de boucle dont §8.4 a besoin (`loopIncomplete`) → C4.
- **§19 vs §8.4/§16** : retire les « bonus », dont le **Finisher** qui EST le mécanisme d'entraide de §8.4/§16 → C13.
- **§19 vs §14** : retire les « badges multiples », puis fonde §14 sur le **badge Recruiter** → C16.
Ces trois-là ne peuvent pas être tranchés par déduction : ils demandent une **intention**.

---

## Synthèse pour arbitrage

| # | Sujet | Existant | Prompt | Reco |
|---|---|---|---|---|
| **C10** | **Bouton GO vs RUN** | -38 (override fondateur, J-2) | RUN | **Question binaire directe. Défaut : GO** |
| **C12** | **1re course assistée** | Seuils gelés, -16 §2 durci, pas d'App Attest | Tolérance + verify assouplis | **Intention oui, mécanisme non** (agir sur la reco de zone) |
| **C20** | **Referral ×2 points** | SPEC §3.7 gelée (jamais implémentée) | Cosmétique seul | **Accepter — meilleure décision du prompt, coût nul** |
| **C13** | Bonus | -19 décision fondateur, engine livré | Retirer | Flag OFF, **garder moteur + cap +35 %**, sauver le Finisher |
| **C2** | 5 niveaux pression | §C | 4 états | **Moteur KEEP, surface 4 + 1 urgence** |
| **C3** | Bleu protégé | -37 §5 (rang 1, livré ce matin) | Pas de bleu | Trancher « protection KEEP/LATER » d'abord ; sinon **bouclier** |
| **C17** | Coffre / boutique / pass | -16/-19/-34 | Retirer | **Accepter (MASTER_SPEC P0 le confirme)** + clause de réactivation |
| **C7** | 3 onglets | 4 réels ; -02 §5 / -29 §1 disent 5 | 3 | **Accepter** ; trancher le sort de « Saison » |
| **C16** | Badges | -04 planche fondateur | « badges multiples » retirer | Attribution KEEP, écran HIDE, **Recruiter visible** |
| **C1** | Violet contesté | §C + -37 §10 + token shippé | Pas de violet | **Accepter** (forme suffit), réviser §C + -37 §10 |
| **C23** | Rouen | Paris + Lille, zéro donnée factice | Exemples Rouen | **Gabarit de copie. Zéro donnée.** |

**Les 3 décisions à prendre en premier** : **M1** (verser -39 avec ses révisions nommées), **C10** (GO ou RUN — 10 secondes, débloque le reste), **C12** (l'assouplissement anti-triche — la seule contradiction qui peut abîmer l'intégrité du jeu de façon irréversible).
---

# 10. CONTRE-AUDIT ADVERSARIAL — À LIRE EN PREMIER

> Un agent adversarial a challengé cet audit et **l'a pris en défaut**. Ses affirmations vérifiables ont été
> RE-VÉRIFIÉES à la main (grep sur le repo) et sont **toutes confirmées** :
>
> - **`territoryStatus.ts:274` et `:284` routent vers `/crew-discovery`** et alimentent `contextualAction`,
>   donc le **bouton GO**. Appliquer le Sprint 2 à la lettre (« supprimer crew-discovery ») **casse GO** —
>   exactement la régression que l'audit prétendait prévenir. L'audit avait manqué ses propres appelants.
> - crew-discovery a **9 références dans 4 fichiers** (territoryStatus, _layout, crew.tsx, onboarding),
>   et non « 1 appelant (crew-public) ». `crew.tsx:252` est le CTA de l'état vide du Crew.
> - **Aucune dépendance d'export image n'existe** : `react-native-view-shot`, `expo-sharing`,
>   `expo-clipboard`, `expo-notifications`, `expo-file-system` sont TOUTES absentes de package.json.
>   `openShareSheet(text)` ne transporte qu'une **string**. → **Aucun chemin technique ne permet de sortir
>   une story ou un sticker PNG de l'app.** Le cœur viral (§11-12) n'est pas « à simplifier » : il est
>   **entièrement à construire**.
> - **`hex_claims` : 9 occurrences dans apps/mobile, toutes des commentaires `TODO(O1)/Milestone 2`.**
>   La carte ne lit jamais le territoire réel — même après une capture serveur, le joueur ne verrait rien.
>
> **Conclusion à retenir : l'épuration n'est pas le chemin critique.** Voir le raisonnement ci-dessous.

**3 vérifications faites moi-même. Deux confirment l'audit, une le prend en défaut.**

---

## (1) Non. Un nouvel utilisateur ne peut ni capturer ni partager. Le plan intégral n'y change rien.

Chaîne cassée, vérifiée :
- `sign-in.tsx` → `'Connexion Google pas encore configurée (O2). Utilise Apple pour l'instant.'` — et rien ne prouve qu'Apple l'est (`useSession().configured` gate l'écran ; prod = 1 user, 0 run).
- **La carte ne lit jamais `hex_claims`.** `grep -rn "hex_claims" apps/mobile` → **9 hits, tous des commentaires `TODO(O1)/Milestone 2`**. Zéro requête. Même après capture serveur, l'utilisateur ne verrait **pas sa zone**.
- `crew.tsx:212-229` : créer/rejoindre = `Alert.alert('… arrive très bientôt')`.
- `openShareSheet(message: string)` → `Share.share({message})` / `nav.share({text})`. **Le paramètre est une string. Il n'y a pas de chemin par lequel une image sort de l'app.** `expo-clipboard`, `react-native-view-shot`, `expo-sharing`, `expo-notifications` : **aucun dans `package.json`** (grep = 0 hit).

Donc après les 4 sprints « exécutables sans O2 » : 15 routes propres, 3 onglets, ~14k lignes en moins — **et toujours 0 capture, 0 story, 0 referral**. On aura épuré une vitrine dont la porte est fermée à clé.

## (2) Ce que l'audit casserait — il a raté ses propres appelants.

**Le bug est dans le Sprint 2 lui-même.** L'audit ordonne : « repointer `territoryStatus.ts` l.182/204/230/250 → Carte, **avant tout le reste** », puis supprimer `crew-discovery.tsx`. Vérification :

```
territoryStatus.ts:274:  route: '/crew-discovery',
territoryStatus.ts:284:  route: '/crew-discovery',
```

**Ces deux lignes ne sont pas dans la liste.** Elles alimentent `contextualAction` → le bouton **GO**. Appliquer le Sprint 2 à la lettre = **GO route sur `/crew-discovery` supprimée** — exactement la régression que l'audit prétend prévenir, dans le commit où il prétend la prévenir.

Idem : l'audit dit « crew-discovery n'a qu'un appelant (crew-public) ». Réel : **6 appelants** — `crew.tsx:220, 226, 252, 2305` + `territoryStatus.ts:274, 284` + `onboarding:187`. **`crew.tsx:252` est le CTA de l'état vide du Crew** : supprimer crew-discovery vide l'onglet Crew de sa seule action cliquable, puisque créer/rejoindre sont des Alert stub. Le Crew devient un écran sans issue.

Le reste des REMOVE tient. Le KEEP moteur/`packages/engine` tient (`ingest_run` importe bien badges/bonus). Le point `view.trace` vs `runCard.trace` est le seul vrai risque grave et il est correctement identifié.

## (3) Le plus court chemin — et non, l'épuration n'est pas la priorité 1.

```
1. Apple Sign-In configuré (Team ID, Supabase provider)     ← 1 personne, 1 après-midi
2. MapScreen lit hex_claims (remplacer fakeHexes)           ← 1 requête + 1 mapper
3. 1 humain court 2 km à Paris → ingest_run → hex_claims ≥ 1
4. captureRef(ShareMap avec view.trace) + expo-sharing      ← 2 deps, 1 fonction
5. Il poste. Fin.
```

**Cinq items. Aucun n'est dans les Sprints 1-3.** Zéro ligne d'épuration n'est requise pour qu'ils marchent : `arsenal.tsx` (4093 l.) ne bloque physiquement rien. Le plan met 4 sprints avant le premier octet de valeur.

L'audit le dit lui-même en §8 — puis passe 7 sections à expliquer comment épurer quand même, et conclut que ça « vaut le coup ». **C'est de la procrastination structurée.** Le §4 (« aide-t-il DIRECTEMENT à… ») se répond avec 20 utilisateurs, pas avec `grep`. Épurer maintenant, c'est trancher 31 routes selon une intuition, sans jamais avoir vu personne s'en servir — le même mécanisme qui a produit les 31 routes.

**Deux choses valent d'être faites avant O2, et deux seulement :**
- **M1 — verser AMENDEMENT-39** (sans rang documentaire, ce prompt sera écrasé ; c'est gratuit et ça a de la valeur composée).
- **Unifier le host/schéma de partage** (0 lien en circulation = la fenêtre se referme au premier lien envoyé).

Tout le reste : après la première vraie course. **L'épuration n'est pas urgente — elle est confortable.** C'est exactement pourquoi elle est en tête du plan.
