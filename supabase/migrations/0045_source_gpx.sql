-- GRYD — source « gpx » : import d'un fichier .gpx choisi par l'utilisateur.
--
-- PÉRIMÈTRE 5 (21/07/2026). Le Verify Hub n'affiche plus QUE les sources
-- réellement disponibles ; « Import GPX » devient un vrai import (sélecteur de
-- fichier natif → parse local → ingest_run), là où il ne faisait que rejouer un
-- échantillon de démonstration.
--
-- La provenance est PERSISTÉE telle quelle (« l'app ne ment jamais ») : un GPX
-- n'est ni une capture GRYD Live (`gryd_live`/`gps`) ni un import santé OS
-- (`healthkit`). D'où une valeur propre dans les deux contraintes concernées.
-- Aucune règle de jeu ici : le serveur (ingest_run §3.2) reste seul juge du
-- claim, exactement comme pour les autres sources.

-- ─── runs.source ────────────────────────────────────────────────────────────
-- État avant : ('gps', 'healthkit', 'strava') — posé par 0021_onboarding_import.
alter table public.runs drop constraint if exists runs_source_check;

alter table public.runs
  add constraint runs_source_check
  check (source in ('gps', 'healthkit', 'strava', 'gpx'));

-- ─── imported_activities.source (Activity Hub §4) ───────────────────────────
-- État avant : liste des écosystèmes posée par 0009_badges_v2.
alter table public.imported_activities drop constraint if exists imported_activities_source_check;

alter table public.imported_activities
  add constraint imported_activities_source_check
  check (source in (
    'gryd_live', 'healthkit', 'health_connect', 'strava', 'garmin',
    'whoop', 'fitbit', 'polar', 'coros', 'suunto', 'gpx'
  ));

comment on constraint runs_source_check on public.runs is
  'Provenance déclarée de la trace (RunSource, packages/shared/src/types.ts). gpx = fichier .gpx importé par l''utilisateur, parsé sur l''appareil.';
