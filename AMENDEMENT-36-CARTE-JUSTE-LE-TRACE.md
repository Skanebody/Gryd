# AMENDEMENT-36 — Carte : JUSTE LE TRACÉ (zéro aplat de territoire)

**Décision fondateur (12/07/2026).** Sur la carte (Battle Map + « Mon
territoire »), on **retire les zones remplies**. Les gros aplats chartreuse/orange
qui dominaient l'écran ne sont **pas représentatifs** de la vision : la carte doit
être **JUSTE LE TRACÉ**.

## Ce qui change

`apps/mobile/src/features/map/mapStyle.ts` — `territoryStateLayers` :

- **Plus AUCUN `fillColor`/`fillOpacity`** sur les couches de territoire. Chaque
  possession est rendue par son **TRACÉ** (le contour de la boucle / la ligne du
  couloir), **coloré par RÔLE** :
  - **crew** → trait chartreuse net (le tracé de la boucle) ;
  - **rival** → trait orange marqué ;
  - **objectif** → contour chartreuse **pointillé** (le tracé à fermer) + son pin ;
  - **avant-poste** → petit trait chartreuse ;
  - **decay / urgent** → trait pointillé (rouge atténué si urgent) ;
  - **protégé** → trait verify ; **contesté** → double trait chartreuse/orange décalé.
- Aplat objectif (`terr-objective` fill) et aplat decay-urgent (`terr-decay-urgent-fill`)
  **supprimés** ; nouveau token `objectiveStroke` pour le contour pointillé.

L'aire enfermée se **lit par le contour**, plus par un remplissage.

## Ce que ça remplace

Cet amendement **supersède** deux positions antérieures, désormais caduques sur la
carte :

- **AMENDEMENT-16 §0** : « Seules les BOUCLES fermées gardent un aplat. » → NON.
  Même les boucles fermées n'ont plus d'aplat : juste le tracé.
- Le commentaire de `territoryStyle.crewFill` (« aplat chartreuse LISIBLE, retour
  fondateur — renforcé ») : cette demande d'aplat fort est **annulée** pour la
  carte.

Reste **cohérent** avec `GRYD_REGLES_NON_NEGOCIABLES.md` §B (« trace GPS héros
façon Strava ») et §A (épuration) : la carte ne montre fort que ma position, la
mission, la route et les tracés par rôle.

## Portée / non-régression

- Les **tokens de fill** (`crewFill`, `rivalFill`, `objectiveFill`, `outpostFill`,
  `decayUrgentFill`) restent définis dans `territoryStyle` car ils servent AILLEURS :
  les **cards de partage** (`ShareMap`, `ShareCard`) gardent un aplat — un poster
  partagé n'est pas la carte de jeu, l'aplat y est légitime. Seule la **carte**
  passe en tracé-seul.
- Les deux cartes (Battle Map + « Mon territoire ») partagent `territoryStateLayers`
  → même traitement tracé-seul sur les deux (cohérent).
- `MODE_EMPHASIS` inchangé : le trait de chaque rôle est modulé par l'emphase du
  mode actif (defense/raid/route/exploration), comme avant.

## Suite possible (si demandé)

Épaissir les tracés en **vrai style Strava hero** (casing + core, round caps,
largeur par zoom §B) plutôt que le trait fin de frontière actuel — non fait ici
(l'ask était « retire les zones »), à activer sur demande.
