# Spécification UX/UI GRYD

**Autorité :** `GRYD_REGLES_NON_NEGOCIABLES.md` > ce document > prompt maître  
**Charte :** noir `#0A0B09` · chartreuse `#B4FF0D` · dark-first · jamais chartreuse sur fond clair

---

## 1. Principes non négociables

- **1 écran = 1 intention = 1 CTA chartreuse max**
- **Compréhension < 3 s** (checklist §A, 20 règles)
- **Carte = mission**, pas dashboard
- **Couleurs par rôle** : chartreuse=moi · orange=rival · violet=contesté · bleu=protégé · gris=neutre · or=bonus
- **Trace GPS = héros** en run (casing + core, round caps, §B)
- **Post-run 2 niveaux** : écran 1 émotionnel, détails au tap

---

## 2. Navigation cible

### MVP soumission (Phase 1–2)

```
┌─────────────────────────────────────────┐
│  Carte  │ Missions │ [RUN] │ Crew │ Moi  │
└─────────────────────────────────────────┘
         FAB chartreuse central = RUN
```

- **RUN** : plus visible que les autres (taille, couleur, position centrale).
- **Missions** : accès War Room compact (Urgent / Actif / Coffre — 1 card/section).
- **Moi** : fusion Profil + Saison + Réglages (Profil reste route `/profil`, Saison accessible depuis Moi).

### Flows sans bottom nav

`course-live` · `course-result` · `route-planner` · onboarding · stack settings

---

## 3. Écrans clés

### 3.1 Carte (Battle Map)

**Questions répondues en < 3 s :**
- Où suis-je ?
- Qui contrôle quoi ?
- Quelle action maintenant ?

**Visible par défaut (max 5 éléments) :**
1. Position joueur (point + halo)
2. Objectif prioritaire (pin + micro-label)
3. Route recommandée (ligne pointillée chartreuse)
4. Territoires essentiels (LOD zoom)
5. CTA RUN / DÉFENDRE / CONQUÉRIR

**Calques (sheet « Couches ») :**

| Mode | Affiche |
|------|---------|
| **Contrôle** | Propriétaires, allié, rival, neutre, protection |
| **Action** | Meilleure action, attaque, défense, route reco |
| **Crew** | Membres proches, pings, raids, HQ |

**Interdit :** tous les filtres visibles · légende longue · 200k runners · couleur par crew

### 3.2 Conquérir / Route planner

Structure :

```
[Mini-map route]

[Recommandation principale]
Titre · distance · durée · +zones · +pts
Pourquoi : 2–4 puces courtes

[2 alternatives max]
Rapide · Optimisée crew

[Objectif crew — 1 ligne]
Défendre X · N rues · +pts

[Chips]
Distance : 3/5/10/L · Boucle/Direct/Explorer

[CTA chartreuse]
CONQUÉRIR / DÉFENDRE
```

Max **3 options** comparables. Pas de configurateur.

### 3.3 Live Run

**Afficher :** distance · temps · objectif · statut GPS · pause · terminer (hold)

**Ne pas afficher :** classement · boutique · chat · stats avancées · badges

**Modes :** Stats (défaut) · Carte (navigation Uber-style)

Trace : chartreuse pleine épaisse + casing ; rival orange plus fin.

### 3.4 Post-run

**Écran 1 :**
```
COURSE VALIDÉE
+52 ZONES
République +5 %
[Partager]  [Voir détails]
```

**Écran 2 (tap) :** verify · breakdown · boucle · crew · badges

### 3.5 Onboarding (cible Phase 2)

3 écrans :
1. Cours pour capturer
2. Défends avec ton crew
3. Ferme des boucles

Puis : permission GPS → profil optionnel → mission reco → **[Commencer]**

---

## 4. Typographie et icônes

- **Règle 24/32 px** : icônes lisibles à 24 et 32 px
- **Textes courts** : « À sauver · 759 m » pas paragraphe
- **Jamais tronqué par …** sur CTA et labels action
- Fonts cible : Space Grotesk (TODO intégration — system font interim)

---

## 5. États et feedback

| État | Traitement |
|------|------------|
| GPS faible | Pill orange, jamais bloquant |
| Offline upload | « Envoi dès que possible » discret |
| Refus permission | Course démo + phrase Réglages |
| Contesté | Violet + double contour + pulse |
| Reduce motion | Fondus courts, pas séquence longue |

---

## 6. Checklist revue écran (§A)

Avant merge UI, chaque écran passe :
- [ ] 1 décision principale identifiable
- [ ] ≤ 1 CTA chartreuse
- [ ] Pas card-in-card
- [ ] 80 % valeur sans scroll (écrans décision)
- [ ] Filtres derrière Couches si carte
- [ ] Textes < 40 caractères sur labels action
- [ ] Couleurs = rôle sémantique

---

## 7. Références visuelles

- `maquette-ui-klaim.html` — 4 écrans clés
- `packages/shared/src/design-tokens.ts` — tokens
- `apps/mobile/src/ui/game/` — composants
