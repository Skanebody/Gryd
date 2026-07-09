# Checklist Apple Store GRYD

**Complète et étend** `GRYD_APPSTORE_CHECKLIST.md` (AMENDEMENT-33).  
**Dernière revue guidelines :** juillet 2026 (Apple Developer Program).

---

## A. Avant build

### A.1 Identité
- [ ] Nom App Store : **GRYD** (clearance INPI avant usage public)
- [ ] Sous-titre : **Cours. Capture. Défends.**
- [ ] Bundle ID : `fr.nexus1993.gryd`
- [ ] Version : 0.1.0+ (auto-increment EAS)
- [ ] Dark mode forcé ✓ (`userInterfaceStyle: dark`)

### A.2 Assets
- [ ] Icône 1024×1024 (no alpha, fond `#0A0B09`)
- [ ] Splash `#0A0B09`
- [ ] Screenshots iPhone 6,9" (1320×2868) — 5 écrans :
  1. Carte battle
  2. Live run trace
  3. Post-run capture
  4. Crew
  5. Anti-pay-to-win banner

### A.3 Build technique
- [ ] `eas build --platform ios --profile production`
- [ ] Test sur **iPhone physique** (pas Expo Go)
- [ ] GPS background testé en course réelle
- [ ] Crash-free > 99,5 % (TestFlight)
- [ ] Aucun secret dans binaire (scan repo)
- [ ] `usesNonExemptEncryption: false` ✓

---

## B. App Store Connect

### B.1 Métadonnées
- [ ] Catégorie : Health & Fitness (primaire)
- [ ] Description sans promesses non livrées (Season 0 = Paris + Lille)
- [ ] Mots-clés : running, territoire, crew, GPS, Paris, Lille
- [ ] Age rating : **12+** (UGC chat crew, pseudos)
- [ ] URL support : `https://gryd.run/support`
- [ ] URL privacy : `https://gryd.run/confidentialite`
- [ ] URL terms : `https://gryd.run/conditions`

### B.2 Privacy Nutrition Labels
Déclarer collecte :
- [ ] **Location** — App Functionality (capture territoire)
- [ ] **User ID** — Account
- [ ] **Product Interaction** — Analytics (PostHog, si actif)
- [ ] **Health & Fitness** — uniquement si HealthKit activé (O8)
- [ ] Pas de tracking cross-app sans ATT

### B.3 Privacy Manifest (iOS 17+)
- [ ] `PrivacyInfo.xcprivacy` si SDK tiers requiert (MapLibre, Expo modules)
- [ ] Déclarer API reasons (UserDefaults, file timestamp, etc.)

---

## C. Permissions & conformité

### C.1 Localisation
- [ ] `NSLocationWhenInUseUsageDescription` — texte clair FR
- [ ] `NSLocationAlwaysAndWhenInUseUsageDescription` — justification course écran éteint
- [ ] Demande background **progressive** (après 1er passage background) ✓
- [ ] Pas de position live d'autres joueurs sans consentement ✓

### C.2 Authentification
- [ ] Sign in with Apple disponible si OAuth social ✓
- [ ] Suppression compte accessible (Paramètres → Support)
- [ ] Backend delete account (O2) avant review publique

### C.3 Notifications
- [ ] Opt-in explicite onboarding
- [ ] Types utiles seulement (attaque, renfort, badge, streak)
- [ ] Pas de spam

### C.4 Achats intégrés
- [ ] Si O3 non prêt : **masquer boutique** en build review
- [ ] Si O3 prêt : sandbox RevenueCat testé, restore purchases
- [ ] Bannière « territoire ne s'achète pas » visible
- [ ] Pas de mécanisme gambling (loot boxes payantes territoire = interdit)

### C.5 UGC & modération
- [ ] Chat crew modéré (signalement, blocage)
- [ ] Filtre noms crew/pseudo
- [ ] Code de conduite accessible ✓
- [ ] Reporting utilisateur

### C.6 Enfants
- [ ] Pas ciblé < 12
- [ ] Pas de contenu enfantin trompeur

### C.7 Accessibilité minimale
- [ ] Labels accessibility sur CTA principaux
- [ ] Contraste chartreuse sur noir ✓
- [ ] Reduce motion respecté ✓
- [ ] Dynamic Type partiel (textes hero)

---

## D. Notes de review (template)

```
GRYD is a running territory game. GPS trace captures map zones.

TEST WITHOUT ACCOUNT:
- Onboarding → demo capture → skip account ("Plus tard")
- Full map + demo run playable without sign-in

SIGN IN:
- Sign in with Apple available
- Demo account on request: [email/password]

LOCATION:
- When In Use for map + run tracking
- Always requested ONLY after user backgrounds app during active run
- Background = continue GPS when screen off during run

NO LIVE STALKING:
- Other players' live GPS never shown
- Rival activity is approximate/delayed

UGC:
- Crew chat + names moderated; report/block in settings

IAP:
- [If disabled: "In-app purchases disabled in this build"]
- [If enabled: "Sandbox test account provided"]

HEALTHKIT:
- [If disabled: "HealthKit not used in this build"]
```

---

## E. Post-soumission

- [ ] Surveiller App Review messages (< 24 h response)
- [ ] TestFlight feedback loop
- [ ] PostHog funnel : onboarding → first run → share
- [ ] Plan hotfix si rejet (permissions, metadata, crash)

---

## F. Mapping guideline → statut

| Guideline | Sujet | Statut |
|-----------|-------|--------|
| 1.2 | UGC modération | Partiel — renforcer backend |
| 2.1 | Performance | OK démo, tester device bas |
| 2.3 | Metadata accurate | Attention Season 0 scope |
| 2.5.1 | HealthKit | Stub — ne pas activer sans O8 |
| 3.1.1 | IAP | O3 pending |
| 4.8 | Sign in Apple | ✓ |
| 5.1.1 | Privacy, delete account | UI ✓, backend O2 |
| 5.1.2 | ATT | Vérifier PostHog |
| 5.1.5 | Location | ✓ textes |

---

## G. Références internes

- `GRYD_APPSTORE_CHECKLIST.md` — détail technique existant
- `docs/product/GRYD_store_submission.md` — copy marketing
- `docs/product/GRYD_safety_privacy_rgpd.md` — RGPD
- `AMENDEMENT-33` — conformité App Store
