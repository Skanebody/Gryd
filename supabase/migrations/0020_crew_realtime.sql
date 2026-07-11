-- ⚠️ Rapatriée depuis la prod (schema_migrations) le 11/07/2026 — appliquée en remote,
-- absente du repo local. Reconstruction fidèle des statements déployés.

-- GRYD — 0020 Realtime : tables crew social + inbox (postgres_changes côté client).
-- Réplication INSERT/UPDATE/DELETE pour rafraîchir les hooks live sans polling.

alter table public.crew_messages            replica identity full;

alter table public.crew_events              replica identity full;

alter table public.crew_event_rsvps         replica identity full;

alter table public.crew_requests            replica identity full;

alter table public.crew_gifts               replica identity full;

alter table public.crew_gift_claims         replica identity full;

alter table public.crew_chest_contributions replica identity full;

alter table public.crew_feed_events         replica identity full;

alter table public.notifications            replica identity full;

do $$
begin
  alter publication supabase_realtime add table public.crew_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.crew_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.crew_event_rsvps;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.crew_requests;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.crew_gifts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.crew_gift_claims;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.crew_chest_contributions;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.crew_feed_events;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
