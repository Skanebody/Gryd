-- 0174_anticheat_mocked_location_2026.sql
-- GRYD — LE DRAPEAU « POSITION SIMULÉE » DE L'APPAREIL, PERSISTÉ AVEC LA COURSE
-- (cahier de septembre §18.4 « Antitriche proportionnée » : « chronologie,
-- sauts, précision, trajectoire, mouvement, source »).
--
-- ═══ CE QUE CETTE MIGRATION AJOUTE ══════════════════════════════════════════
-- UNE colonne, nullable, sans valeur par défaut, sur `public.runs`. Rien d'autre.
-- Aucune table, aucune policy nouvelle, aucun index : `runs` porte déjà sa RLS
-- (0002) et cette colonne est lue par la MÊME personne, sous la MÊME règle.
--
-- ═══ POURQUOI TROIS ÉTATS, ET PAS UN `boolean not null default false` ═══════
-- C'est le cœur de la migration, et c'est une règle de la constitution
-- (« l'app ne ment jamais : données réelles ou VIDES ») transposée en SQL :
--
--   NULL   ─ la plateforme n'a RIEN dit. C'est le cas de tous les iPhone :
--            CoreLocation ne rend aucune information de simulation, et aucun
--            appel n'existe pour la demander. C'est aussi le cas de toutes les
--            courses ENREGISTRÉES AVANT cette migration.
--   false  ─ l'appareil a RÉPONDU « non ». C'est une mesure, pas une absence.
--   true   ─ Android a déclaré que la position venait d'un fournisseur simulé
--            (`LocationObject.mocked`, expo-location).
--
-- Un `default false` écraserait la première ligne sur la deuxième : toutes les
-- courses iOS, et tout l'historique, affirmeraient « aucune simulation
-- détectée » alors que PERSONNE n'a regardé. Le moteur anti-triche lit
-- exactement cette distinction (`AntiCheatInput.mockedLocation` : absent ⇒
-- signal INDISPONIBLE, il sort du dénominateur et ne pèse dans aucun sens).
--
-- ═══ CE QUE CETTE COLONNE N'EST PAS ═════════════════════════════════════════
--  · Ce n'est PAS une attestation d'intégrité d'appareil. App Attest (Apple) et
--    Play Integrity (Google) sont des traitements à part entière — base légale,
--    information, conservation — et ne sont ni implémentés ni documentés ici.
--    Un binaire modifié omettrait simplement ce champ.
--  · Ce n'est PAS une décision. Elle n'accorde ni ne retire aucun territoire :
--    elle alimente un signal parmi treize, non décisif, qui ouvre au maximum une
--    REVUE avec droit d'appel (0081). Aucun seuil de décision n'apparaît dans ce
--    fichier — la base stocke, le moteur décide (même partage qu'en 0074/0078/0081).
--  · Ce n'est PAS une donnée publique. Elle vit dans `runs`, dont la RLS est
--    personnelle, et aucune vue publique ne l'expose. Une suspicion reste une
--    donnée sensible (0081) : elle ne doit jamais accompagner un profil ou un
--    classement.
--
-- Rollback = `alter table public.runs drop column mocked_location_2026;` —
-- rien d'acquis n'est détruit, par construction.

alter table public.runs
  add column if not exists mocked_location_2026 boolean;

comment on column public.runs.mocked_location_2026 is
  'Position simulée déclarée par l''appareil au moment de l''enregistrement '
  '(LocationObject.mocked, Android uniquement). TROIS états : NULL = la '
  'plateforme n''a rien dit (tout iOS, et tout l''historique antérieur à cette '
  'migration) ; false = l''appareil a répondu « non » ; true = fournisseur de '
  'position simulé. Signal anti-triche NON décisif : il ouvre au maximum une '
  'revue (anticheat_reviews, 0081) avec droit d''appel. Ce n''est pas une '
  'attestation d''intégrité d''appareil, et un client modifié peut l''omettre.';
