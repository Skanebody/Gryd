# AMENDEMENT-20 — Live Run / Résultat / Partage épurés « façon Strava » (05/07/2026)

**Décision fondateur (05/07/2026).** *« Strava partage une activité. GRYD partage une conquête. »* Les 3 écrans du run (Live · Résultat · Partage) gardent la couche jeu mais adoptent la discipline Strava : radicalement simples, chiffres grands, 1 CTA, partage immédiat.

## 1. Live Run — 1 mission + 1 toast MAX
- **Un seul bandeau mission** en haut (fusion ETA + intention) : `DÉFENSE · République · 80 %` + `9 min` — plus de 4 pills empilées. Textes courts : `Défense République · Frontière couverte : 80 %` → `Défense · République · 80 %`.
- **« Segment exclu »** = info technique → rétrogradé : petite icône discrète / `GPS faible` bref, PAS un bandeau plein. Le détail (« 1 segment exclu · GPS instable 180 m ») va au RÉSULTAT.
- **Rival** : plus de bandeau `Activité Canal détectée · pression élevée` → **halo orange sur la carte** + toast court `Canal actif`.
- **Événements = toasts temporaires** (3-5 mots, 2 s, jamais permanents) : `Boucle possible` · `320 m pour fermer` · `Presque fermé` · `Boucle fermée` · `+47 zones · Secteur pris` · `République défendue · +48 h` · `Canal actif`.
- **Carte plus silencieuse pendant le run** : labels de quartiers masqués, rues secondaires plus fines, focus route. Route verte DOMINANTE ; hiérarchie : 1 position · 2 route · 3 point de fermeture/arrivée · 4 progression · 5 événements (atténués).
- Tailles : mission 13-14 px · KPI live 20-28 px · toast 13-15 px. Gros texte réservé aux chiffres (`+247`, `80 %`, `4,4 km`).

## 2. Résultat de course — 3 temps (émotionnel d'abord)
- **Écran 1 (principal, ultra simple)** : `COURSE VALIDÉE` + **KPI géant** `+247 zones` + `République défendue · Paris Est +5 %` + CTA **[Partager]** / [Voir détails]. C'EST TOUT. Plus de mélange validation/GPS/défense/comparaison sur le premier écran.
- **Voir détails (section secondaire / au tap)** : Impact (2 zones défendues · 1 conquise · 1 route ouverte · +247 total) · GRYD Verified (GPS 89 · Motion 93) · **Analyse « La boucle fait la zone »** (Trait seul +214 · Boucle fermée +247 · **+33 gagnées**, avec l'anim trait→boucle→remplissage) — excellente pédagogie mais PAS sur l'écran 1.
- La séquence dopamine existante se replie derrière ce modèle : le burst reste, mais l'état final = écran 1 simple + détails.

## 3. Partage — « Partager ta conquête » (moteur de viralité)
- Après validation, **[Partager] proposé immédiatement** → nouvel écran `/partage` `PARTAGER TA CONQUÊTE` avec preview + **5 templates** : **Carte simple** (trace chartreuse + 3 stats, façon Strava) · **Conquête** (`SECTEUR PRIS · +47 zones · République`) · **Défense** (`RÉPUBLIQUE DÉFENDUE · 2 zones · +48 h` + bouclier) · **Boucle** (`BOUCLE FERMÉE · +33 zones bonus`, avant/après) · **Crew** (blason + `LES FOULÉES 9³ · Crew +420 pts`).
- **Formats MVP** : Story 9:16 · Carré 1:1 · Sauvegarder image · Copier · Partager (natif). Replay vidéo = V1.
- Card partage PLUS propre que le résultat : fond carte sombre, trace chartreuse, zone capturée en glow, blason crew discret, ≤ 3 stats + KPI. Chaque template = un `ShareCard` variant, exportable (capture/Share API démo).

## 4. Épuration transverse (rappel)
Aucun bandeau live > 1 mission + 1 toast ; textes d'action jamais tronqués ni longs ; événements 2 s ; carte silencieuse en run ; détails techniques après la course. « L'utilisateur comprend son résultat en 2 secondes et le partage immédiatement. »

## 5. Build
Workflow : (a) live-épuration (course-live + LiveNavMap : 1 bandeau, toasts 2 s, rival halo+toast, segment exclu discret, carte silencieuse) ∥ (b) résultat 3-temps (course-result : écran 1 + Voir détails) ∥ (c) partage (/partage + 5 templates + formats). Puis vérif + fix. Charte, anti pay-to-win, reduce motion, typecheck/tests/preview verts.
