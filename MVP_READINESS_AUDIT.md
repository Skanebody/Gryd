# MVP_READINESS_AUDIT — GRYD, test fermé une ville

> Audit du **code réel** (pas des docs), 8 vérificateurs de domaine + synthèse, chaque constat cité `fichier:ligne`.
> Date : 17/07/2026. Portée : peut-on ouvrir un **test fermé, 20-100 coureurs, une ville pilote** ?
> Méthode : lecture seule, aucune capture réputée réelle sur la seule présence d'un bouton.

---

## 1. Verdict exécutif

### `NO-GO — boucle produit non fonctionnelle`

La boucle vécue par le coureur n'est pas réelle de bout en bout. **Le moteur serveur est solide et testé** (détection de boucle, décision de claim, RPC atomique, idempotence, restauration après crash) — mais rien de tout ça n'a jamais tourné en prod (**0 run, 0 hex_claims, 1 user**), et la couche que le coureur *voit* ment ou manque à trois endroits décisifs :

1. **La porte d'entrée est verrouillée.** L'app n'offre que Apple + Google ([auth.ts:76,117](apps/mobile/src/lib/auth.ts:76)), les deux sont **désactivés côté serveur** (vérifié en prod : `external_apple_enabled=false`, `external_google_enabled=false`), il n'existe **aucune UI email/OTP** (grep `signInWithOtp|verifyOtp|signUp(` = néant), et le gate force une vraie session ([(tabs)/_layout.tsx:42](apps/mobile/app/(tabs)/_layout.tsx:42)). **Zéro des 20-100 coureurs ne peut s'inscrire aujourd'hui.** C'est l'explication mécanique du « 1 user / 0 run ».
2. **L'app ment au moment de la récompense.** L'écran de résultat rejoue une simulation démo plafonnée à 8,2 km pour tout le monde ([course-result.tsx:514](apps/mobile/app/course-result.tsx:514), [RealCourseLive.tsx:81](apps/mobile/src/features/run/gps/RealCourseLive.tsx:81)) au lieu de la vraie capture, et la carte ne se rafraîchit pas après une course (`reload()` est du **code mort**, [hexClaims.ts:79](apps/mobile/src/features/map/hexClaims.ts:79)). Impossible de « courir puis voir sa zone » sans redémarrer.
3. **La boucle virale n'existe pas.** La story n'exporte **aucune image** ([shareActions.ts:96](apps/mobile/src/features/share/shareActions.ts:96) = texte seul ; deps `react-native-view-shot`/`expo-sharing`/`expo-file-system` **absentes**), et un lien partagé (`gryd.run/…`) tombe sur un **404** (aucun handler Linking, aucune route web, aucun fichier d'association).

**Second verdict simultané : `NO-GO — mesure insuffisante`.** L'unique event d'activation `claim_result` est défini mais **jamais émis** ([events.ts:18](packages/shared/src/events.ts:18) ; grep = 1 seule occurrence, sa définition), et **aucun event d'attribution** n'existe (`deep_link_opened`, `signup_attributed`, `invited_user_first_capture` : néant). Le pilote serait aveugle sur ses deux seules questions : *les gens capturent-ils ? le partage ramène-t-il du monde ?*

**La bonne nouvelle :** ce ne sont pas des trous d'architecture. La quasi-totalité des P0 sont des correctifs **repo** ciblés + **un interrupteur dashboard**. Aucun moteur n'est à réécrire.

---

## 2. Scores /100

| Domaine | Score | Lecture |
|---|---:|---|
| Authentification | **30** | Tuyauterie solide (session, logout, delete RGPD, trigger provisioning) mais porte verrouillée + aucun filet email. |
| Tracking GPS | **58** | État-machine pause/reprise/arrêt, idempotence, restauration crash OK ; mais 403 avalé comme hors-ligne, fenêtre de perte ~30 s. |
| Capture | **45** | Moteur serveur excellent et testé, mais jamais exercé en prod + `city_id` NULL casse le classement. |
| Carte | **55** | Battle Map lit vraiment `hex_claims` (P0.2 fait, testé) ; mais pas de refresh post-capture + « Mon territoire » 100 % démo. |
| Résultat | **28** | KPI démo clampé à 8,2 km ; le backend capture pour de vrai mais l'écran affiche une conquête fabriquée. |
| Partage | **22** | CTA correct, privacy honnête ; mais aucun export d'image — story = texte. |
| Deep links | **15** | Lien émis (`gryd.run/…`) mais aucun handler/route/AASA → 404. |
| Analytics | **32** | Haut de funnel instrumenté ; activation + attribution absentes. |
| Fiabilité | **55** | Restauration double-kill OK ; angles morts : 403 permanent, fenêtre 30 s. |
| Confidentialité | **70** | Masquage départ/arrivée, delete/export RGPD réels, RLS partout. |
| **Readiness test fermé** | **25** | Non ouvrable en l'état : entrée verrouillée + boucle vécue non réelle + mesure aveugle. |

---

## 3. Tableau d'audit (P0 uniquement — table complète : voir CRITICAL_PATH)

| Domaine | Exigence | État réel | Preuve | Priorité |
|---|---|---|---|---|
| Auth | Un coureur peut s'inscrire | **BLOQUANT** | Apple/Google seuls, OFF serveur, gate `_layout.tsx:42`, zéro email | **P0** |
| Résultat | L'écran montre SA course | **SIMULÉ** | `course-result.tsx:514` buildRunSimulation + `RealCourseLive.tsx:81` clamp 8,2 km | **P0** |
| Carte | La zone apparaît après capture | **BLOQUANT** | `reload()` sans consommateur `hexClaims.ts:79` ; effet sur `[session,tick]` seul | **P0** |
| Carte | « Mon territoire » dit le vrai | **SIMULÉ** | `TerritoryFranceMap.tsx:82` + `territoire.tsx` rendent la démo comme le joueur | **P0** |
| Partage | Story = vraie image 9:16 | **ABSENT** | deps view-shot/sharing/file-system absentes ; `shareActions.ts:96` texte seul | **P0** |
| Analytics | Activation mesurée | **ABSENT** | `claim_result` défini jamais émis ; 0 event d'attribution | **P0** |
| Ville | Run rattaché à la ville | **BLOQUANT** | `tracker.ts:299` buildPayload sans cityId → `p_city_id` NULL → `season_scores` vide | **P0** |
| Deep link | Lien ouvre la zone | **ABSENT** | 0 associatedDomains/intentFilters/handler/route/AASA ; host `gryd.run` ≠ reco `gryd.app` | **P0** |

---

## 4. Ce qui est VRAI et solide (à ne pas retoucher)

- **Moteur territorial** (`packages/engine`) : `detectLoop`/`enclosedCells` ([hexing.ts:336](packages/engine/src/hexing.ts:336)), `validateRun`, `decideClaims` (ordre gelé) — purs, déterministes, testés (`loop_test.ts`).
- **RPC de capture atomique** : [ingest_run/index.ts:1523](supabase/functions/ingest_run/index.ts:1523) `claim_hexes` + idempotence `clientRunId` + garde TOCTOU (0031).
- **Provisioning user** : trigger `on_auth_user_created` (0028), **vérifié en prod : 0 orphelin**.
- **Carte réelle (P0.2/P0.3)** : la Battle Map lit `hex_claims` via `useRealTerritories`, fusion par territoire, tap, dimming, état vide honnête, note de source à 3 états — **15 tests Deno**, prouvé de bout en bout.
- **Confidentialité** : delete_account + export_account réels, masquage privacy, RLS partout.
- **Restauration** : double-kill géré (runStore ACTIVE/CURRENT/BG_FIXES + drain background).

---

## 5. Décision finale — 3 arguments

1. **La porte d'entrée est verrouillée, c'est un fait vérifié en prod, pas une hypothèse.** Apple + Google seuls, tous deux OFF, zéro email → aucun coureur ne peut entrer. Premier geste, à toi : activer le provider Apple dans le dashboard et le tester sur un iPhone neuf jusqu'à voir une ligne `auth.users` + `public.users`.
2. **Même la porte ouverte, l'app ment aux deux instants qui bâtissent la confiance d'un pilote** (le résultat de course, la zone sur la carte) — et ce sont des correctifs repo, pas de l'architecture. La capture est vraie en base ; la tromperie est purement à l'affichage, exactement là où vit le bouche-à-oreille.
3. **Tu lancerais le pilote aveugle.** `claim_result` jamais émis, aucune attribution, `city_id` NULL → classement local jamais peuplé. Sans ça, le test fermé ne t'apprend ni si les gens capturent, ni si le partage ramène du monde.

**Conclusion : ne pas ouvrir le test fermé aujourd'hui.** Le chemin est court et balisé — voir [CRITICAL_PATH_TO_FIRST_CAPTURE.md](CRITICAL_PATH_TO_FIRST_CAPTURE.md) pour les 15 étapes, [MVP_LAUNCH_PLAN_20_DAYS.md](MVP_LAUNCH_PLAN_20_DAYS.md) pour l'ordre d'exécution.
