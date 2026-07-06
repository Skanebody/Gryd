# AMENDEMENT-30 — Onboarding sans friction + on-ramp « capture depuis run synchronisé » (06/07/2026)

**Décision fondateur (06/07/2026).** Source : `GRYD_STRATEGIE_OCEAN_BLEU.md` §6+§7. La friction d'activation est LE risque produit n°1 (le fitness meurt à ~3 % D30). Règle : **déplacer TOUTE la friction hors de la course**, activer (1re capture) le plus vite. **Aucun écran ne demande avant d'avoir donné.** Le compte, le crew et les notifications viennent APRÈS la première capture.

## 1. Flow d'onboarding (écran par écran, §7)
1. **Splash / hook** — 1 phrase (« Prends ta ville. ») + carte animée en fond. Zéro carrousel de texte.
2. **Ta ville, maintenant** — le quartier réel (démo) en PLATEAU DE JEU (zones à prendre, présence rivale) AVANT tout compte. Valeur perçue < 60 s. Réutilise la carte (RealMap) + couleurs par rôle (§C).
3. **Permission GPS pédagogique** — écran d'explication AVANT la demande système (« pour dessiner ton territoire »). (Web preview : simulé.)
4. **Choix du chemin** — 2 options : **« J'ai déjà des runs »** (→ on-ramp sync, §2) / **« Je vais courir »** (→ 1 tap RUN, zéro config).
   - 4a **Sync** — import HealthKit/Strava (DÉMO ici ; réel = O7/O8) → 1re zone capturée en secondes → moment aha.
   - 4b **Premier run** — 1 tap RUN, objectif ultra-simple (« ferme une boucle »), zéro réglage.
5. **1re capture — MOMENT SIGNATURE** — animation de remplissage + haptique success + « +X zones » + partage proposé. Réutilise `ResultReveal`/dopamine + haptics. C'est LE payoff.
6. **Création de compte APRÈS la valeur** — Apple / passkey, 1 tap (lien vers `(auth)/sign-in`). Jamais un mur d'inscription en écran 1.
7. **Rejoindre / créer un crew** — proposé APRÈS la 1re capture (jamais imposé à un joueur seul sans densité).
8. **Notifications (opt-in cadré)** — demandé APRÈS la valeur (« quand ton territoire est attaqué »).

## 2. On-ramp « capture depuis run synchronisé » (§6)
> *« Tu ne dois pas courir dans GRYD. Cours comme tu veux — Apple Watch, Garmin, Strava. GRYD transforme ta course en conquête. »*
- Écran/flux « J'ai déjà des runs » : (démo) importe un run récent → nettoyage → boucle → zone capturée → moment signature. Backend réel = `strava_import` (déployé, prêt-à-clés O7) + HealthKit (O8 dev build). Ici : câblé démo, l'intention est réelle.
- **Sync = activation ; live = rétention** (règle durcie du §6.5) : la sync fait entrer, le live (trace héros, défense, toasts) retient. La sync ne doit pas devenir le mode par défaut — après la 1re capture synchronisée, l'app invite à vivre le live.
- Verify sur import : GPX sans métadonnées → capture partielle/stats-only (anti-triche, §10 du doc principal). Réglage fenêtres decay pour tolérer le délai de sync.

## 3. Gating (réordonner : jouer avant le compte)
- Aujourd'hui : `(tabs)/_layout` redirige `!session → (auth)/sign-in` PUIS onboarding. Nouveau : un NOUVEAU visiteur voit l'ONBOARDING d'abord (avec capture démo), le compte se crée à l'étape 6. État local « onboarding vu / pré-compte » persistant (AsyncStorage). Sur web preview (`configured=false`) : pas d'auth, le flow tourne tel quel.
- Ne casse pas la session réelle native : un utilisateur DÉJÀ authentifié saute l'onboarding.

## 4. Discipline
Charte, §A (1 écran = 1 décision, 1 CTA, textes non tronqués, pas de card-dans-card), reduce motion, haptique (§5.3 : capture = success+heavy), zéro « GO » (verbes contextuels). Métriques à logguer : activation = 1re capture ; funnel par étape ; choix sync vs run.

## 5. Build
Workflow (1 construction max + vérif + fix) : `app/onboarding/` (flow 8 étapes) + `src/features/onboarding/` (contenu/étapes/sync-démo/store) + on-ramp sync + réutilisation `ResultReveal`/simulation/RealMap/haptics + réordonnancement gating `(tabs)/_layout` (+ `_layout` si routes) + lien compte `(auth)/sign-in`. Vérif visuelle (flow entier en preview : hook → ville → permission → choix → capture signature → compte → crew → notifs ; sync on-ramp démo) + build + fix. Câblé démo, prod = O7/O8.
