# PROGRESS — KLAIM

| Tâche | Statut | Notes |
|---|---|---|
| 1.1 Artefacts orchestration + CLAUDE.md | done | + AMENDEMENT-02 (corpus GRYD) et AMENDEMENT-03 (typo Outcrowd) |
| 1.2 packages/shared | done | typecheck vert ; constantes GRYD (densité, secteurs, perf cap, XP) |
| 1.3 Migrations SQL + RLS | done | 20 tables RLS, sector_control, validées libpg-query (Docker absent → `supabase db reset` à refaire) |
| 1.4 ingest_run + tests Deno | done | 56 tests verts, `partial`, pionnier par densité, idempotence |
| 1.5 apps/mobile | done | 5 onglets, COURIR flottant, carte France dans Profil ; typecheck vert |
| 1.6 apps/web waitlist | done | build prod vert ; formulaire testé en préview ; typo Josefin/Lora (Avant Garde slot prêt) |
| 1.7 Régression P1 + commit | done | commit initial ; reste : `expo run:ios` sur device réel (nécessite le fondateur) |

Phases P2-P8 : voir PHASES.md. Points ouverts utilisateur : O1-O5 dans DISCOVERY.md.
