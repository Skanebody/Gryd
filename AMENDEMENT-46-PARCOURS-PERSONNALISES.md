# AMENDEMENT-46 — Parcours personnalisés par les habitudes réelles

**Demande fondateur 21/07/2026** : « Quand tu proposes un parcours du jour pour
une conquête il faudrait se baser sur les habitudes des utilisateurs, nombre de
kilomètres, route utilisée, il faut qu'un algorithme puisse apprendre pour
personnaliser la course et avoir un endroit dans les paramètres pour la
personnaliser. »

---

## §0 — Le constat qui déclenche ce chantier

Le Route Planner affichait déjà, sur l'un de ses parcours de démo, la mention
**« Adaptée à tes habitudes »** (`features/route/demo.ts`). Or **rien dans le
repo n'apprenait quoi que ce soit** : `grep preferredDistance` / `habitude`
donnait zéro. C'était un mensonge d'écran de la même famille que
`users.streak_weeks` jamais écrit ou `daily_zone_awards` jamais alimentée — une
promesse que le code ne tenait pas.

Ce chantier rend la phrase vraie, **ou la rend impossible à afficher**.

---

## §1 — L'algorithme (moteur PUR, `packages/shared/src/habits.ts`)

`computeHabitsProfile(input)` dérive un profil des courses **réelles** de
l'appelant. Aucune I/O, aucune horloge implicite, aucun nombre magique.

### Le seuil d'honnêteté
Sous `HABITS_MIN_RUNS` courses retenues, le profil vaut `status: 'unknown'` avec
**toutes les mesures à `null`**. Il n'existe alors aucune valeur à afficher,
donc aucun écran ne peut prétendre savoir. L'app dit « je ne sais pas encore »,
elle n'extrapole jamais une habitude à partir d'un run.

### Médiane + MAD, jamais moyenne + écart-type
Un semi improvisé ne doit pas déplacer le profil de quelqu'un qui court 5 km.
La moyenne le ferait (~6 450 m sur 10×5 km + 1×21 km), la médiane non. C'est
testé explicitement.

### Ce qui n'apprend rien
Statut `rejected`/`flagged`, date invalide/future/hors fenêtre
(`HABITS_HISTORY_DAYS`), session sous les minima de course. Une allure aberrante
est filtrée **séparément** : la distance reste un fait, seule l'allure devient
inconnue — on peut donc connaître la distance habituelle sans l'allure, et le
dire.

### Jour et créneau LOCAUX
« Tu cours le mardi soir » doit vouloir dire le mardi soir **de la personne** :
le décalage local est un paramètre, `night` enjambe minuit. À part égale, les
récurrences sont départagées par clé croissante — sinon deux appareils
afficheraient deux ordres.

---

## §2 — Vie privée (contraignant)

Apprendre des habitudes de déplacement est du profilage sur des données de
localisation. Le moteur ne reçoit **aucune coordonnée, aucune trace, aucun
identifiant de rue** : uniquement distance, durée, allure, horodatage, statut.

Un profil d'habitudes ne peut donc **structurellement pas** ré-exposer le point
de départ que §7 floute à 500 m. La RPC `habits_inputs` (0055) est bornée à
`auth.uid()` et vérifiée : un joueur ne reçoit aucune course d'un autre, la
réponse ne contient aucune clé géographique, et `learning_enabled = false` est
respecté **côté serveur** (zéro course renvoyée, pas seulement zéro affichage).

> **Note d'implémentation.** La demande mentionnait « route utilisée ». Elle
> n'est délibérément **pas** apprise : mémoriser les rues empruntées
> reconstruirait exactement le domicile que le floutage protège. La distance,
> l'allure, le jour et le créneau suffisent à personnaliser la proposition sans
> jamais cartographier les trajets de quelqu'un.

---

## §3 — Anti pay-to-win

Le profil **suggère** un parcours. Il n'accorde aucun point, aucun territoire,
aucun multiplicateur, et n'entre dans aucune formule de score. C'est structurel :
la sortie de `resolveRouteSuggestion` est une distance et une raison, rien
d'autre ne franchit la frontière.

---

## §4 — L'endroit dans les paramètres (`app/mes-parcours.tsx`)

Quatre blocs, dans cet ordre :

1. **Déduit** — ce que GRYD a compris (distance habituelle, jours, créneaux) ou,
   sous le seuil, combien de courses manquent. Jamais de valeur inventée.
2. **Réglages** — distance cible explicite. **Le réglage manuel gagne toujours**
   sur l'appris : c'est la première branche de `resolveRouteSuggestion`.
3. **Apprentissage** — l'interrupteur. Coupé → `status: 'disabled'`, rien n'est
   calculé, et le serveur ne renvoie plus aucune course.
4. **Oublier** — repart de zéro (`learn_from`), la fenêtre redevient vide.

Ces réglages vivent **sur le compte** (RPC `route_prefs_get`/`route_prefs_set`,
0054), pas sur le téléphone : changer d'appareil ne perd pas le profil.

---

## §5 — La phrase ne peut plus mentir

« Adapté à tes habitudes » n'existe que dans une branche atteignable
**uniquement** si `suggestion.source === 'learned'`, c'est-à-dire si un profil
`known` a réellement produit la distance. Les autres cas ont leur propre copie :
réglage manuel, apprentissage coupé, ou pas encore assez de courses.

---

## §6 — Vérification

- `computeHabitsProfile` : 29 tests Deno (seuil, robustesse à l'aberrant,
  statuts, dates, confiance, récurrences locales, interrupteur, zéro clé géo).
- Migrations 0054/0055 : 42 contrôles PGlite — isolation entre joueurs, absence
  de géographie, opt-out serveur, oubli, écriture bornée à sa propre ligne,
  paramètres invalides, et **le client appelle exactement les RPC qui existent**.

Ce dernier contrôle a attrapé le défaut le plus coûteux du chantier : le Route
Planner appelait `run_habit_profile`, une RPC **qui n'a jamais existé** —
contrat supposé entre deux passes parallèles. Le profil serait resté
éternellement `unavailable` sans qu'aucun test ne s'en aperçoive.
