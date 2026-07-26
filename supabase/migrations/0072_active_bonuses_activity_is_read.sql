-- 0072_active_bonuses_activity_is_read.sql
-- GRYD — LA DISCIPLINE D'UNE FENÊTRE DE BONUS EST DÉSORMAIS OPPOSÉE (26/07/2026).
--
-- ═══ POURQUOI CETTE MIGRATION EXISTE, ALORS QU'ELLE NE CHANGE RIEN ══════════
--
-- Elle ne touche AUCUNE table, AUCUNE fonction, AUCUN index. Elle corrige UNE
-- PHRASE — et cette phrase est en base.
--
-- 0071 a posé `active_bonuses.activity` et l'a documentée honnêtement pour son
-- époque :
--
--     « Écrite par digest_job ; ingest_run ne la lit PAS ENCORE. »
--
-- C'était vrai le jour même : la colonne était écrite, personne ne la lisait,
-- et une fenêtre « Défense critique » ouverte sur une zone VÉLO restait
-- réclamable par une course à pied. Ce trou est refermé depuis
-- (`supabase/functions/ingest_run/index.ts` sélectionne `activity` et
-- `bonusWindowOpposable` — ingest_run/activity.ts — l'oppose au monde du run ;
-- preuves dans `ingest_run/bonus_activity_test.ts`).
--
-- Laisser la phrase en l'état aurait deux conséquences, pas une :
--   · le catalogue Postgres AFFIRMERAIT une faille qui n'existe plus, à qui
--     inspecte la base — et un avertissement faux use la confiance dans les
--     avertissements vrais ;
--   · le prochain lecteur du schéma croirait le chantier ouvert et le
--     referait, ou pire, s'y fierait pour construire ailleurs.
--
-- Une doc ne promet jamais au-delà du code (loi du projet) ; l'inverse compte
-- aussi : elle ne doit pas laisser croire à un manque comblé. Et comme une
-- migration écrite ne se réécrit pas — 0071 est figée, appliquée ou non —,
-- la correction ne peut vivre qu'ici.
--
-- ═══ ORDRE DE DÉPLOIEMENT — À NE PAS INVERSER ═══════════════════════════════
--
-- 0071 doit être APPLIQUÉE AVANT le déploiement de `ingest_run` ET de
-- `digest_job`. Les deux touchent maintenant `active_bonuses.activity` :
--   · `digest_job` l'ÉCRIT (contrainte déjà énoncée par 0071 : déployé d'abord,
--     l'insertion échoue sur une colonne inconnue et le cron du soir tombe en
--     entier) ;
--   · `ingest_run` la LIT depuis ce lot — c'est la contrainte NOUVELLE.
--     Déployé avant 0071, son `select('id, scope, bonus_id, activity')` échoue
--     sur une colonne inconnue ; la lecture LÈVE, et comme elle intervient
--     APRÈS l'écriture du run et l'attribution des hexagones, le coureur
--     recevrait un 500 sur une conquête pourtant RÉELLE et enregistrée.
--     C'est la panne la plus visible que ce lot puisse produire, et elle est
--     entièrement évitée par l'ordre : migrations d'abord, fonctions ensuite.
--
-- `decay_job` n'ajoute AUCUNE contrainte d'ordre : son correctif du jour (la
-- copie push par discipline, `_shared/push.ts`) est du code, sans schéma.
--
-- ═══ CE QUE CETTE MIGRATION NE PRÉTEND PAS ══════════════════════════════════
--
-- · `sector_snapshot` reste MÊLÉE, comme 0071 l'a écrit : sa clé primaire est
--   `sector_id` SEUL, la discipliner enverrait deux lignes par secteur au
--   lecteur mobile (`apps/mobile/src/features/map/useSectorSnapshots.ts`).
--   Chantier CONJOINT schéma + carte, toujours ouvert, toujours hors lot.
-- · Le récap hebdomadaire des ZONES PERDUES (`digest_job`) compte désormais des
--   zones et non plus des lignes de notification, mais il S'ABSTIENT de
--   chiffrer quand la discipline d'une perte n'est pas attribuable — parce que
--   `notifications.payload.activity` (écrit par `steal_push_job`) vaut `null`
--   aussi bien pour « pertes dans les deux mondes » que pour « joueur
--   mono-monde, inutile de nommer ». Rendre ce payload univoque demande de
--   rouvrir `steal_push_job` : non fait, dit ici pour que personne ne croie la
--   lecture des vols entièrement disciplinée.

comment on column public.active_bonuses.activity is
  'Discipline de la fenêtre (0071). NULL = fenêtre SANS discipline (coffre '
  'crew : sa progression n''appartient à aucun monde), pas « inconnue ». '
  '« Défense critique » et « Finisher » la portent : leur déclencheur est un '
  'territoire, et un territoire vit dans UN monde (E14). ÉCRITE par digest_job '
  'et OPPOSÉE par ingest_run depuis le 26/07/2026 (0072) : une fenêtre ouverte '
  'dans un monde ne se réclame que par une sortie de ce monde ; une fenêtre '
  'NULL reste réclamable par les deux.';
