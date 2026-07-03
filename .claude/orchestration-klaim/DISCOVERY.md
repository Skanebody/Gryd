# DISCOVERY — GRYD (ex-KLAIM) v0.1

> **MISE À JOUR 03/07/2026** : le corpus produit GRYD (`docs/product/GRYD_*.md`) et `AMENDEMENT-02-GRYD.md` priment sur les décisions ci-dessous en cas de conflit. Deltas majeurs : nom public GRYD, France entière capturable (D1 amendée — plus de gating bloquant), statut de course `partial`, bonus pionnier par densité, nav 5 onglets, XP permanent, secteurs/contrôle.
- D18. XP joueur = points territoire bruts ×1 (XP_RATE_OF_POINTS), permanent, jamais acheté.

Session autonome : les décisions sont extraites de la spec (gelée pour la Saison 0), pas d'un Q&A. Chaque décision est numérotée et référence sa section source. **Si une question n'est pas tranchée ici ni dans la spec → appliquer la spec ; si la spec est muette → choisir l'option la plus simple et la documenter ici.**

## Décisions produit (source : spec)
- D1. Grille H3 res 10, buffer 15 m autour de la polyline, carte bornée aux `city_zones` ouvertes (Paris, Lille). [§3.1]
- D2. Validité course : ≥1 km, ≥6 min, allure moyenne 2:50-10:00 min/km ; points GPS précision ≤25 m, vitesse >25 km/h rejetée, saut >100 m coupe le segment ; segments hors 2:30-12:00 exclus du claim. [§3.2]
- D3. Propriété : dernier passage valide prend l'hex ; lock 24 h ; protection compte <14 j (involable + sans decay) ; decay 21 j (notif J-3) ; bouclier cluster ≤300 hexes / 48 h, cap 2 actifs/joueur/semaine. [§3.3]
- D4. Points : +10 neutre, +15 volé, +3 défendu (1×/24 h/hex), +5 pionnier ; streak +10 %/sem cap ×1,5 ; Foulées = 10 % des points ; Éclats achetés uniquement, n'achètent jamais hexes/points/Foulées/stats. [§3.4]
- D5. Crews 2-10, 12 couleurs (en DB), code 6 caractères, cooldown 7 j. Rendu carte = égocentré monochrome+chartreuse (AMENDEMENT-01, addendum §D) — les couleurs crew restent des données d'identité. [§3.5 + addendum D]
- D6. 9 écrans, pas un de plus ; onboarding <90 s ; quiet hours push 21h-8h, max 2 push/jour. [§4]
- D7. Monétisation : SKUs §5.1, règles d'or §5.2 (jamais de paywall sur tracking/capture/crews/classements ; aucune offre avant J5 ET 1re capture ; pas de loot box ; zéro offre aux churned).
- D8. Vie privée : zones privées (≤3, 200-500 m, ON par défaut domicile), jamais de position live, centre en H3 res 8, polylines brutes 90 j max, export/suppression self-service, 16+. [§7]
- D9. Anti-triche : validation 100 % serveur, plafond 1 200 hexes/jour/compte, courses flagged en file de revue. [§6.4]
- D10. Analytics : events PostHog nommés exactement comme §8.

## Décisions techniques (Milestone 1)
- D11. Monorepo npm workspaces : `apps/mobile` (Expo SDK récent, TS strict), `apps/web` (Next.js App Router), `packages/shared`, `supabase/`.
- D12. `packages/shared/src/game-rules.ts` = source de vérité des constantes. Les Edge Functions Deno ne peuvent pas importer hors de `supabase/functions/` au deploy → copie générée `supabase/functions/_shared/game-rules.ts` via `scripts/sync-game-rules.mjs`, avec test Deno qui vérifie l'égalité byte-à-byte (drift = test rouge).
- D13. H3 côté serveur : h3-js dans les Edge Functions (l'extension Postgres h3 n'est pas garantie sur Supabase). `h3index` stocké en BIGINT (conversion string↔BigInt aux frontières).
- D14. Idempotence `ingest_run` : `client_run_id` UUID généré côté client, contrainte UNIQUE `(user_id, client_run_id)` ; un retry renvoie le résultat déjà calculé (payload de célébration persisté dans `runs`).
- D15. RLS : écriture owner-only partout ; INSERT direct sur `runs`/`hex_claims` interdit aux clients (service-role via Edge Functions uniquement) ; lecture publique limitée à `hex_claims` (hexes + propriétaire/couleur, jamais de trace), classements, `city_zones`, crews. `privacy_zones`, `purchases`, `waitlist` : owner-only strict.
- D16. Hexes factices Milestone 1 : générés à la volée avec h3-js autour de Paris (48.8566, 2.3522) côté mobile — pas de dépendance réseau pour valider le rendu 60 fps.
- D17. Rendu carte : source GeoJSON MapLibre + fill/line layers aux tokens addendum §C/§D ; style de fond sombre custom (Protomaps), fallback style JSON minimal hors ligne.

## Points ouverts (bloqués sur l'utilisateur — n'empêchent pas Milestone 1)
- O1. Projet Supabase réel (URL + clés) : `.env.example` fourni ; `supabase start` local possible.
- O2. Compte Apple Developer + Google OAuth (Sign in with Apple/Google) : config placeholder, flux codé.
- O3. Clés RevenueCat + PostHog : placeholders `.env`, wrappers no-op si absentes.
- O4. GeoJSON précis des zones Paris/Lille : seed provisoire (bounding polygons grossiers) à remplacer avant bêta.
- O5. Nom « KLAIM » : clearance INPI/EUIPO non faite — aucun usage public.
