# MVP_ANALYTICS_TAXONOMY — funnel mesurable, delta réel

> Ce que le pilote DOIT mesurer vs ce qui existe dans [events.ts](packages/shared/src/events.ts).
> Inventaire vérifié : ~50 events définis, envoyés via [analytics.ts](apps/mobile/src/lib/analytics.ts) (PostHog).
> Règle : un event « défini » ≠ « émis ». Plusieurs events clés sont **définis mais jamais `track()`és**.

---

## 1. Funnel MVP — état par étape

| Étape funnel | Event attendu | Existe ? | Réalité vérifiée |
|---|---|---|---|
| Ouverture | `app_opened` | ✅ `app_open` | émis. |
| Inscription lancée | `signup_started` | ⛔ | absent. |
| Inscription finie | `signup_completed` | 🟡 `signup_completed` | défini, mais **émis seulement sur Apple/Google** (désactivés) → jamais en pratique. |
| Onboarding | `onboarding_started/completed` | 🟡 `onboarding_step` | un seul event générique `{n}`, pas started/completed nommés. |
| Permission | `permission_prompted/granted/denied` | 🟡 `permission_location` | un seul event `{result}`, pas les 3 états. |
| 1er run lancé | `first_run_started` | 🟡 `run_start` | pas de distinction « first ». |
| 1er run fini | `first_run_completed` | 🟡 `run_complete` | idem. |
| 1re boucle fermée | `first_loop_closed` | ⛔ | absent (aucun `loop_closed`/`loop_almost_closed`). |
| **1re capture** | `first_territory_captured` | 🔴 `claim_result` | **défini ([events.ts:18](packages/shared/src/events.ts:18)) mais JAMAIS émis** (grep = 1 occurrence). C'est l'event d'ACTIVATION. |
| Story générée | `share_preview_generated` | ⛔ | absent (il y a `share_card_generated` mais côté preview React, non rasterisé). |
| Story exportée | `share_exported` | ⛔ | absent (pas d'export image). |
| Partage fini | `share_completed` | ✅ `share_completed` | défini. |
| Lien ouvert | `share_link_opened` / `deep_link_opened` | ⛔ | **absent** — aucun handler de lien. |
| Attribution inscription | `signup_attributed` | ⛔ | absent. |
| Attribution capture | `first_capture_attributed` | ⛔ | absent. |

**Verdict mesure :** haut de funnel instrumenté ; **activation et toute l'attribution virale sont à zéro.** Le pilote ne peut répondre ni à « les gens capturent-ils ? » ni à « le partage ramène-t-il du monde ? ».

---

## 2. Les events à AJOUTER (minimum pilote)

Priorité absolue — sans eux, aucun apprentissage :

```txt
territory_captured        # émettre sur capture PERSISTÉE (IngestRunResponse.hexes.new>0), pas sur un bouton
loop_closed               # boucle validée serveur
loop_almost_closed        # boucle ratée + mètres manquants (signal d'activation raté)
run_rejected              # + reason (too_short/too_brief/pace/trust) — pourquoi une capture échoue
share_exported            # image PNG réellement produite et passée au share sheet
deep_link_created         # lien généré, avec territory_id
deep_link_opened          # lien ouvert (handler Linking) — clé de toute l'attribution
signup_attributed         # inscription précédée d'un deep_link_opened dans la session
first_capture_attributed  # 1re capture d'un utilisateur venu par un lien
```

Émettre `territory_captured` **uniquement** depuis la réponse serveur ([useRealRun.ts:132](apps/mobile/src/features/run/gps/useRealRun.ts:132) `setLastRunResult`), jamais depuis l'UI — c'est la seule source de vérité d'une capture persistée.

---

## 3. Propriétés communes (à poser quand pertinent)

```txt
user_id · anonymous_id · session_id · event_id · event_timestamp(UTC)
app_version · build_number · platform · os_version · device_model
city_id · territory_id · crew_id · run_id
campaign_id · creator_id · referral_id · source · medium · consent_status
```

**Trois règles non négociables :**
- **`event_id` unique** par event (déduplication). À vérifier : `analytics.ts` en génère-t-il un ? Sinon l'ajouter au wrapper `track`.
- **`event_timestamp` en UTC** systématiquement.
- **`city_id` depuis un identifiant contrôlé** (`CITIES` de [game-rules.ts:435](packages/shared/src/game-rules.ts:435)), **jamais** un texte libre. ⚠️ Aujourd'hui `city_id` n'est même pas envoyé au serveur sur un run ([tracker.ts:299](apps/mobile/src/features/run/gps/tracker.ts:299)) — à corriger côté capture ET côté analytics.

---

## 4. Événement d'activation & North Star

**Activation (event principal) :** `territory_captured`.
> Un utilisateur est **activé** quand il termine une course valide qui produit une capture **persistée et visible sur la carte**. Pas « compte créé », pas « course lancée ».

**Activation secondaire :** `first_capture_shared` (activé ayant aussi exporté/partagé sa 1re conquête).

**North Star pilote :** *Weekly Activated Territorial Runners* = utilisateurs uniques ayant, dans la semaine, terminé au moins une course valide qui capture/reprend/défend un territoire.

**Garde-fous (à surveiller autant que la North Star) :** `run_loss_rate`, `gps_failure_rate`, `crash_free_sessions`, `invalid_run_rate`, `privacy_incidents`.

---

## 5. Quatre dashboards (aucun de plus)

1. **Activation** — app_open → signup → onboarding → GPS → 1er run → 1re boucle → **1re capture** + *time-to-first-capture*. Décision : où décrochent-ils avant la 1re capture ?
2. **Viralité** — captures → previews → exports → partages → clics → installs attribuées → inscriptions attribuées → 1res captures attribuées. **KPI : nouveaux activés pour 100 captures partagées.**
3. **Fiabilité** — run_loss_rate, crashes, GPS degradation, failed sync, failed capture, duplicate run, recovered run, privacy incidents.
4. **Ville pilote** — activés, WAU, runs territoriaux, territoires créés, zones reprises, interactions compétitives, partages, invités.

Filtres communs : **ville, version, plateforme, source, cohorte**.

---

## 6. Pré-requis technique bloquant

⚠️ **Confirmer que `EXPO_PUBLIC_POSTHOG_KEY` est injectée dans le build EAS du pilote.** Les 4 variables `EXPO_PUBLIC_*` sont posées sur les 3 environnements EAS et chaque profil `eas.json` déclare son `"environment"` — mais sans cette clé dans le binaire, **tout le funnel est un no-op silencieux** et le pilote ne mesure rien.
