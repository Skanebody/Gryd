# AMENDEMENT-12 — « La boucle fait la zone » + 2 objectifs (04/07/2026)

**Décision fondateur (04/07/2026), delta explicite sur les règles gelées SPEC §3.** Deux changements : (A) le modèle mental joueur se réduit à **2 objectifs : CONQUÉRIR / DÉFENDRE** ; (B) **fermer une boucle capture l'intérieur** (« dès que la boucle est faite, ça fait une zone »). Formule : **« Trace un trait, tu prends la rue. Ferme la boucle, tu prends la zone. »**

## A. Deux objectifs — simplification UI (le backend ne change pas de barème)
- **CONQUÉRIR** absorbe capture (neutre), raid (rival), exploration (pionnier) — même verbe, contexte différent. **DÉFENDRE** = retracer ses zones/frontières (refresh decay, défense +3 pts existants).
- Bouton central contextuel : 2 états `CONQUÉRIR` / `DÉFENDRE` (DÉFENDRE si decay urgent ou mission défense active ; sinon CONQUÉRIR). SCOUT/RAID/CAPTURE/RUN disparaissent du bouton.
- Route Planner : 2 onglets **Conquérir** (routes rapide/optimisée/exploration) et **Défendre** (routes défense) — les 8 types deviennent des sous-types internes. Social Run/Course privée restent des MODES de course (RunModeSheet inchangé), pas des objectifs.
- War Room / Today / missions / notifications : formulations alignées sur les 2 verbes.
- Les barèmes gelés (10 neutre / 15 vol / 3 défense / bonus pionnier) et TOUTES les règles serveur restent inchangés.

## B. La boucle fait la zone — changement de règle moteur (delta §3.1)
- **Trait (par défaut, comportement actuel)** : une course capture le couloir de cellules H3 res 10 traversées. Un aller-retour ou un A→B reste pleinement récompensé.
- **Boucle fermée** : si la trace revient à ≤ `LOOP_CLOSE_TOLERANCE_M` (100 m) de son départ, le polygone de la trace est fermé et **l'intérieur est capturé** : `polygonToCells(trace, res 10)` → cellules intérieures ajoutées aux claims du run.
- **Chaque cellule intérieure passe par les règles existantes UNE PAR UNE** : lock 24 h et bouclier résistent, protection nouveau joueur, vol = barème vol, contested/anti-collusion AMENDEMENT-07 inchangés, plafond `MAX_CLAIMS_PER_DAY` (1200) inchangé et appliqué au total couloir+intérieur (l'intérieur est tronqué par distance croissante au tracé si dépassement).
- **Garde-fous** : `LOOP_MIN_PERIMETER_M = 1000` (pas de micro-boucle farmée sur place — en deçà, couloir seulement) ; l'auto-limite physique fait le reste (5 km de boucle ≈ 1,9 km² ≈ 130 zones ; 10 km ≈ 530). Figure-8 / boucles multiples par auto-intersection = **V1** (MVP : fermeture par tolérance départ/arrivée uniquement). Validations anti-triche §3.2 inchangées (une boucle en voiture reste rejetée).
- Réponse d'ingest : `loopClosed: boolean` + `enclosedZones: number` pour l'UI/le résultat.
- Constantes dans `game-rules.ts` UNIQUEMENT ; moteur pur testé (Deno) ; copies `_shared` régénérées ; **redéploiement ingest_run obligatoire**.

## C. UI de la boucle
- **Live Run** : état « Boucle ouverte » discret ; à l'approche du départ (< 300 m), aperçu du remplissage (zone fantôme chartreuse translucide) + « Ferme ta boucle » ; à la fermeture : burst — remplissage organique animé + toast `BOUCLE FERMÉE — la zone est à toi` + haptic fort + compteur `+N zones` qui saute. Mode Stats : la même info en texte (pas de carte).
- **Post-run** : l'étape zones distingue `dont N en boucle fermée` ; before/after organique montre le remplissage.
- **Route Planner** : les routes « Boucle · retour départ » affichent l'aire estimée de la boucle (`≈ +86 zones dont 52 en boucle`).
- **Onboarding écran 2** : le visuel devient la démonstration de la boucle (trace qui se ferme → zone qui se remplit) — c'est LE geste signature du jeu.
- Vocabulaire : jamais « polygone/polyfill » à l'écran — « boucle », « zone », « frontière ».

## D. Hors scope (V1)
Figure-8/multi-boucles, boucles collaboratives (boucle fermée à plusieurs en run groupé — les règles contested s'appliquent cellule par cellule en attendant), aire minimale dynamique par densité, replay animé de la fermeture.
