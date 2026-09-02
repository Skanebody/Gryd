# UX-GATE — Phase 1, les 7 écrans (L1–L19)

> **Portée** : les écrans du groupe `(mvp)`, au 03/08/2026.
> **Méthode** : relecture loi par loi contre le code et contre des captures
> 375 × 812 prises en preview (`mobile-web`).
> **Verdict global : CONFORME SOUS RÉSERVE**, après correction. L7 reste
> PARTIELLE (le son), L14 aussi (les 60 fps mesurés — le skeleton, lui, existe
> désormais), L13 est absente et hors périmètre.
>
> ⚠️ **Ce document s'est trompé, et il faut le lire en le sachant.** Sa première
> version portait un ✅ sur `/profil` et `/connexion` (lignes 3b et 3c). Une
> relecture INDÉPENDANTE, le 03/08, a rendu **NON CONFORME** sur ces deux écrans
> avec 14 constats, dont 5 bloquants — tous vérifiés un par un, tous réels. Le
> verdict précédent était le MIEN sur MON propre travail : c'est exactement la
> configuration dans laquelle un gate ne gate rien. Les corrections sont listées
> ci-dessous ; le ✅ n'est rétabli que sur ce qui a été refait.

## Ce que la relecture indépendante a trouvé (03/08)

Son diagnostic tient en une phrase, et elle vaut plus que la liste :
**« les écrans reprennent d'une main ce que les modules purs ont interdit de
l'autre. »** Les 2 400 tests ne pouvaient pas l'attraper — ils testaient les
modules, pas la COUTURE. `src/mvp/couture.test.ts` teste maintenant la couture
elle-même, et chacune de ses trois règles cite le code réel qui l'aurait fait
échouer.

| | Constat | Ce qu'un joueur vivait | État |
|---|---|---|---|
| ① | `requestDeletion` ne lisait que `error === null` | la RPC répond `{ok:false}` **en 200** : une suppression REFUSÉE passait pour faite | corrigé |
| ② | `Alert.alert` pour confirmer la suppression | `react-native-web` n'a **aucun** module `Alert` : sur web, tap → **rien**, sur l'action qu'Apple 5.1.1(v) exige | corrigé — confirmation rendue DANS l'écran |
| ③ | `/connexion` atteint par `replace`, sans en-tête | on n'en sortait **qu'en tuant l'app** | corrigé |
| ④ | après « Se déconnecter » | **aucun chemin** vers la connexion dans toute l'app | corrigé |
| ⑤ | `signedIn: boolean` passé à `statsStatus` | à froid, `/profil` disait « sans compte » et **masquait la suppression** | corrigé — trois états |
| ⑥ | `{aire ?? '0'}` | un « 0 » héros géant là où `heroArea` avait rendu `null` | corrigé — une phrase, pas un zéro |
| ⑦ | `'—'` pour la distance, `'0'` pour l'aire | deux conventions contradictoires sur la même ligne | corrigé — une seule |
| ⑧ | `suppression?.graceDays ?? 0` | « Tu auras **0 jours** pour changer d'avis » — hors `pending`, le serveur n'envoie aucun délai | corrigé — `ACCOUNT_DELETION_GRACE_DAYS` |
| ⑨ | `danger: { color: colors.gris }` | le commentaire promettait un rouge que le code n'écrivait pas | corrigé — `gameColors.danger` |
| ⑪ | `void signOut()` puis navigation | la carte relisait la session ENCORE connectée | corrigé — attendu |
| ⑫⑬⑭ | retour sans retour visuel ; `busy` invisible ; photo non masquée | on tape dans le vide ; VoiceOver annonce une image décorative | corrigés |
| ⑩ | « Exporter mes données » mènerait à un document | **non retenu** : `/confidentialite` porte un VRAI export (Edge Function `export_account` + partage). Le lien tient sa promesse | écarté, vérifié |

**Trouvé en corrigeant ④, et plus grave que ④ :** sans compte, **GO était un
bouton mort**. La course s'enregistrait, mais ne pouvait JAMAIS devenir un
territoire — personne à qui l'attribuer. C'est l'argument qu'on applique déjà
quand le backend manque ; il ne l'était pas ici. `homeAction` rend `signIn`.

## Les écrans

| # | Écran | Route | Capture |
|---|---|---|---|
| 1+2 | Onboarding **et** priming permission — les deux écrans du 03/08 ont FUSIONNÉ le 02/09/2026 (`/bienvenue` supprimée). Le numéro 2 reste vacant plutôt que renuméroté : les autres numéros sont cités ailleurs dans ce document | `/position` | ✅ (nominal + refus) |
| 3 | Home Map — vide | `/carte` | ✅ (états `unavailable`, `signedOut`, `interrupted`) |
| 3b | Profil : suivi + compte + légal | `/profil` | ✅ **après correction** — 9 constats de la relecture indépendante (① ② ⑤ ⑥ ⑦ ⑧ ⑨ ⑪ ⑫). La capture d'avant montrait un écran conforme ; c'est le code qui ne l'était pas |
| 3c | Connexion | `/connexion` | ✅ **après correction** — ③ ④ ⑬ ⑭. La capture ne pouvait pas montrer le défaut : l'absence de SORTIE ne se voit sur aucune image fixe |
| 4 | Home Map — actif | `/carte` | ⚠️ non capturé : la base est VIDE et le build local n'a pas de `.env`. Le rendu des polygones est couvert par `territoryGeo.test.ts`, pas par une image |
| 5 | Préflight + décompte | `/prete` | ✅ |
| 6 | Live Run | `/course` | ✅ (départ, reprise à 0,43 km) |
| 7 | Capture | `/resultat` | ✅ (42 350 m²) |
| 8 | Résultat (refus / attente) | `/resultat` | ✅ (manque 23 m, attente, intérieur partiel) |

## Verdict loi par loi

| Loi | Verdict | Preuve / réserve |
|---|---|---|
| **L1** — 3 questions en < 1 s | ✅ **après correction (02/09)** | `homeState` répond aux trois. ⚠️ « Où suis-je ? » était FAUX jusqu'au 02/09 : `defaultSettings` n'est lu qu'au montage et `center` arrivait après — la carte ouvrait sur Rouen z12,5 pour tout le monde, `ZOOM_EGO` n'était jamais appliqué (audit de friction, P8). Désormais `openingFraming()` (pur, testé) cadre le TERRITOIRE s'il existe, sinon la position, appliqué UNE SEULE FOIS (clé de valeur + `useRef`) — le test de couture interdit toute caméra en prop. Sans autorisation, la carte ne peint toujours AUCUN point |
| **L2** — une action primaire | ✅ | `Stage` n'accepte qu'un `cta` (objet, pas tableau) : un second bouton de même poids est impossible à écrire. Sur `/carte` et `/course`, les sorties secondaires sont des TEXTES |
| **L3** — 2 taps max jusqu'au départ | ✅ | La bascule d'entrée a eu lieu (03/08) : un joueur connecté ouvre sur `/carte`. Ouvrir n'est pas un tap, il en reste UN — GO — et le préflight se déroule seul, sans « confirmer ». Parcours rejoué en preview de bout en bout |
| **L4** — zone du pouce, ≥ 44 pt | ✅ | CTA dans un `footer` SŒUR du contenu défilant (donc ancré quoi qu'on mette au-dessus) ; `minHeight: 44` sur chaque cible |
| **L5** — Live Run ≤ 5 infos, ≤ 8 mots | ✅ | 4 blocs : distance (ou chrono), chrono, jauge, signal. `mvp.test.ts` vérifie la limite de 8 mots sur les 5 langues |
| **L6** — feedback < 100 ms, haptique | ✅ | `ctaPressed` sur chaque bouton ; haptique aux 4 événements de jeu du MVP (départ, quasi-fermeture, fermeture, perte de signal, capture) via `feedback.ts`. ⚠️ Déclenchée sur TRANSITION et non sur état : sur l'état, le téléphone vibrerait ~1 ×/s pendant tout le retour |
| **L7** — célébration 2–3 s, skippable | ⚠️ **PARTIEL** (le son en poche) | La chorégraphie en TROIS TEMPS est faite — contour qui se stabilise (avec dépassement puis retour) → remplissage → gain, 2,2 s. Skippable au tap, désactivée sous Reduce Motion, haptique `success`. Les bornes sont dans `mvp/ui/celebration.ts`, **testées** (5 tests) : ni la relecture ni la capture ne peuvent attraper un chevauchement, l'aller-retour d'une capture dépassant la durée de la séquence. **Le SON est arrivé le 02/09 par la VOIX** (`expo-speech`, synthèse — donc aucun asset) : trois moments, jamais en continu — départ (`voiceStart`, pas à la reprise), boucle fermable, boucle fermée ; décision PURE `gaugeVoice` avec mémoire (une phrase au plus une fois par course, « presque » ne revient jamais après « fermée »), `stop()` avant chaque phrase pour ne jamais dire une chose devenue fausse. ⚠️ **LIMITE CONNUE, NON MASQUÉE** : `expo-speech` ne pose aucune `AVAudioSession` et `UIBackgroundModes` = `location` seul → la voix est probablement COUPÉE écran verrouillé et par le switch silencieux, et n'offre AUCUN ducking (surface d'options vérifiée : `language/pitch/rate/voice`, rien d'autre). Elle marche écran allumé. Le cas « téléphone en poche » est le premier point à entendre sur iPhone ; s'il est muet, le correctif est un config plugin (`.playback`+`.spokenAudio` + mode `audio`) — une déclaration qu'Apple relit, décidée seulement après l'écoute, pas avant |
| **L8** — aucun écran vide | ✅ | `emptyMap` porte l'action qui la remplit, et `mvp.test.ts` vérifie qu'elle contient bien DEUX phrases (constat + action) |
| **L9** — onboarding ≤ 3, valeur avant permission | ✅ | **1 écran** depuis le 02/09 (`/position`) : `/bienvenue` et le priming portaient le même argument coupé en deux — fusionnés (−1 tap, −1 écran pour 100 % des nouveaux joueurs, vérifié en preview). L9 pose un plafond, pas un objectif. La forme signature et la photo du fondateur sont montrées AVANT toute demande |
| **L10** — progressive disclosure | ✅ | Aucune mécanique n'est expliquée avant de servir : la jauge n'apparaît qu'une fois la trace candidate, le décompte ne parle que du signal |
| **L11** — une seule cible | — | Sans objet au MVP : ni objectif du jour ni rival (Phase 2) |
| **L12** — un chiffre héros | ✅ | Un seul par écran, et JAMAIS un zéro nu : `heroArea` et `heroAreaM2` rendent `null` hors d'un état qui sait ; sur la course, le chrono est le héros tant qu'aucun mètre n'est parcouru |
| **L13** — partage en 1 tap | ✅ **depuis le 02/09** | Sur `captured` uniquement : une carte pré-générée HORS écran pendant le résultat (`ShareCard`), le VRAI tracé en SVG depuis les points retenus AVANT la purge du buffer, extrémités masquées par la MÊME règle que le serveur (`SHARE_TRIM_M` 250 m + Douglas-Peucker 15 m, drift test contre la source du moteur sur 7 fixtures), trois chiffres figés (m², km, temps), aucune carte de fond, aucun lieu. Le lien n'existe que si `Sharing.isAvailableAsync()` ET qu'un fichier a été capturé — jamais sur un refus, une perte, une attente, ni sur `takenNoArea` (pas d'aire fiable). Un échec après le tap se DIT (`shareFailed`). Réserve honnête : `shareText` ne peut pas accompagner l'image sur iOS (`SharingOptions` n'a pas de champ message) — le chiffre voyage gravé dans la carte |
| **L14** — 60 fps, pas de spinner > 1 s | ⚠️ **PARTIEL** (les 60 fps) | Aucun spinner bloquant nulle part. Le SKELETON existe désormais (`mvp/ui/Skeleton.tsx`) sur `/carte` et `/profil` : il peint la FORME du contenu à venir, jamais une valeur — un skeleton qui montrerait des chiffres plausibles serait un mensonge de plus. Coupé sous Reduce Motion, masqué aux lecteurs d'écran, l'annonce restant portée par le conteneur (sinon VoiceOver n'aurait plus rien dit pendant tout le chargement — une régression que la version en texte n'avait pas). **Manque** : une mesure réelle de 60 fps sur appareil |
| **L15** — accessibilité | ✅ | Libellés = `accessibilityLabel` par construction ; `TerritoryMark` masqué aux lecteurs d'écran (l'information est portée par le texte) ; Reduce Motion respecté. ⚠️ « jamais la couleur seule » n'est pas encore éprouvé : le MVP ne peint QU'UN rôle (moi), donc aucune distinction ne repose sur la teinte — la loi redeviendra mordante à l'arrivée des rivaux |
| **L16** — notifications | — | Sans objet au MVP (Phase 2) |
| **L17** — zéro dark pattern | ✅ | « Voir la carte d'abord » toujours offert au priming ; « Annuler » disponible jusqu'au bout du décompte ; aucun compte à rebours factice ; un refus de permission background n'arrête pas la course |
| **L18** — i18n dès le 1ᵉʳ commit | ✅ | Aucun texte en dur ; `Entry` = `Record<Locale, string>` COMPLET, donc une clé sans ses 5 langues est une erreur TypeScript ; `registre.test.ts` vérifie jusqu'au registre (le portugais est brésilien) |
| **L19** — l'app n'accuse jamais | ✅ | Testé : aucun mot d'accusation sur les 5 langues, le manque se dit en MÈTRES, et un INVARIANT vérifie que les stats locales sont affichées dans les 13 issues de résultat — y compris les refus |

## Ce que l'audit de FRICTION a trouvé (02/09) — et que les audits d'écran ne pouvaient pas voir

Quatre audits jugeaient des ÉCRANS ; celui-ci a rejoué huit PARCOURS. Trois de ses
constats étaient des mensonges au sens constitutionnel, tous corrigés et vérifiés :

| | Constat | Ce qu'un joueur vivait | Correctif |
|---|---|---|---|
| P8 | la caméra ne regardait jamais le joueur | l'usage le plus fréquent — ouvrir pour REGARDER son territoire — sans objet | cadrage une seule fois, décideur pur, recentrage 44×44 |
| P1/P2 | `await sendRun` avant de naviguer, sans timeout ni indicateur | un coureur à bout de souffle devant un bouton grisé, durée non bornée | navigation immédiate en état `sending`, résolution sur `/resultat` |
| P3 | `Date.now() − startedAt` après un kill | 20 min de course + 3 h de kill = **3 h 20 affiché** | `activeElapsedMs` / `deadMs` persisté ; et côté serveur `POINT_MAX_GAP_S` (une reprise sur place était REFUSÉE `pace_too_slow`) |
| P4 | la carte muette sur une course en file | l'ancien territoire, sans un mot sur la course qui attend | état `pending`, après `owned`, avant `empty` |
| P1 | la porte e-mail traversait `/sign-in` legacy | +4 taps, 2ᵉ gate d'âge, chevron qui fuyait vers l'onboarding legacy | `/email` direct (sa gate 16+ prouvée), retour d'où l'on vient |
| P2/P7 | `replace('/carte')` depuis une pile où la carte est déjà là | deux MapLibre en mémoire, l'ancienne périmée au geste retour | `retourCarte()` : `dismissTo` ; la carte relit au focus et vide à la déconnexion |

## Ce qui reste à prouver, et qui ne peut pas l'être ici

1. **Home Map actif** — il faut des territoires en base. La base est vide.
2. **Chaîne contre un vrai serveur** — le `.env` est en place et l'app JOINT le
   backend (migrations à jour, `ingest_run` déployée, RLS 11/11). Ce qui manque
   n'est plus technique : il faut un COMPTE et une COURSE, et je ne fabrique ni
   l'un ni l'autre en production.
3. **Never-lose-a-run par un kill réel** — prouvé en preview (buffer → offre →
   reprise à 0,43 km avec chrono continu → effacement), pas par un kill de
   process sur appareil.
4. **e2e Maestro GPS mocké** — gate Phase 1 non tenu.
5. **60 fps mesurés** — demande un appareil.

Ces cinq points sont la même preuve : celle de l'Annexe D, une course réelle à
Rouen sur un build de développement. Tant qu'elle manque, Phase 1 n'est pas
close, quelle que soit la couleur du gate CI.
