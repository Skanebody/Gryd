# AMENDEMENT-33 — App Store readiness : conformité Review Guidelines (06/07/2026)

**Décision fondateur (06/07/2026).** Préparer GRYD pour être **accepté par l'App Store**. Couvrir les points de rejet fréquents (Apple App Review Guidelines) : confidentialité/permissions, **modération du contenu utilisateur**, suppression de compte, achats intégrés, Sign in with Apple. Câblé démo là où O8/O3 bloque, mais la conformité STRUCTURELLE doit être là.

## 1. [P0] Modération UGC (Guideline 1.2) — la cause n°1 de rejet
Toute app avec contenu généré par les utilisateurs (chat crew, pseudos, noms de crew) DOIT fournir :
- **Signaler** un message / un membre / un contenu (flux de report).
- **Bloquer** un utilisateur (masquer ses messages, ne plus le voir).
- **Filtrage** de contenu objectionnable (liste de mots + possibilité de masquer).
- **Un moyen de contacter** (déjà : support.tsx) + un **Code de conduite** (règles de la communauté).
- Traiter les signalements sous 24 h (process documenté). Côté app : le flux + le store (démo persistant).

## 2. [P0] Permissions & app.json (Guideline 5.1.1)
- `NSMotionUsageDescription` (l'app lit le podomètre/motion pour GRYD Verify) — **ABSENT, à ajouter**.
- `NSHealthShareUsageDescription` + entitlement HealthKit (au câblage O8 — ajouter la string + documenter).
- Vérifier que chaque string de permission explique clairement le POURQUOI (GPS déjà OK).
- Rien qui demande une permission sans usage réel visible.

## 3. [P0] Suppression de compte in-app (Guideline 5.1.1v)
- Une app avec création de compte DOIT permettre de **supprimer son compte DEPUIS l'app** (pas seulement un lien web), avec confirmation. Vérifier/renforcer dans Confidentialité (RGPD déjà évoqué) : suppression réelle (appel serveur démo) + purge locale + retour à l'onboarding.

## 4. [P0] Achats intégrés (Guideline 3.1.1)
- Les biens numériques (Premium, Founder, cosmétiques) DOIVENT passer par **Apple IAP** (RevenueCat, O3). L'app mobile ne doit PAS renvoyer vers le web `/abonnement` pour PAYER (anti-steering). Vérifier qu'aucun bouton in-app ne mène à un paiement externe ; le paywall in-app = IAP (câblé démo, réel = O3).
- Le site web `/abonnement` reste un site (légal), séparé de l'app.

## 5. Sign in with Apple (Guideline 4.8) — déjà OK
- Apple sign-in présent (expo-apple-authentication). Quand Google/O2 sera activé, Apple DOIT rester proposé. RAS, confirmer.

## 6. Politique de confidentialité + CGU (URL publiques)
- **Page web Politique de confidentialité** (apps/web `/confidentialite`) + **CGU/Conditions** (`/conditions`) — URL publiques requises par App Store Connect + HealthKit. Contenu réel (données collectées : localisation, santé/motion, compte ; usages ; RGPD ; contact ; jamais de position publique). Liées dans le footer + référencées in-app.

## 7. Docs de soumission (repo)
`GRYD_APPSTORE_CHECKLIST.md` : checklist complète (build, métadonnées, screenshots, âge, URLs) + **notes de review** (compte démo OU l'app se joue avant compte — nos §7/§30 : reviewer teste sans compte) + **App Privacy nutrition label** (map des données déclarées) + mapping guideline→statut.

## 8. Build
Workflow, 4 agents (disjoints) : (A) moderation-safety (signaler/bloquer chat+membres, code de conduite) ∥ (B) permissions-deletion (app.json NSMotion/HealthKit + suppression compte in-app) ∥ (C) web-legal (pages Confidentialité + Conditions apps/web + footer) ∥ (D) review-docs (GRYD_APPSTORE_CHECKLIST + vérif no-steering). Vérif + build + fix. Charte, §A, anti pay-to-win, textes non tronqués. Ce qui dépend d'O3/O8 (IAP réel, HealthKit) = câblé démo + documenté.
