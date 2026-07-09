-- GRYD — 0027 sync entitlements GRYD Club (rc_webhook).
-- Matrice : docs/product/GRYD_free_vs_premium_running_layer.md

create or replace function public.sync_club_entitlements(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_keys text[] := array[
    'advanced_stats',
    'advanced_history',
    'leaderboard_filters',
    'advanced_goals',
    'route_builder_advanced'
  ];
  v_key text;
begin
  if p_active then
    foreach v_key in array v_keys loop
      update public.feature_entitlements
      set is_active = true, expires_at = null, starts_at = now()
      where user_id = p_user_id and feature_key = v_key and source = 'pass';
      if not found then
        insert into public.feature_entitlements (user_id, feature_key, source, starts_at, is_active)
        values (p_user_id, v_key, 'pass', now(), true);
      end if;
    end loop;
  else
    update public.feature_entitlements
    set is_active = false, expires_at = now()
    where user_id = p_user_id
      and feature_key = any (v_keys)
      and source = 'pass';
  end if;
end;
$$;

revoke all on function public.sync_club_entitlements(uuid, boolean) from public;
