-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — 0185 : LE LIEN ENTRE UN PARRAIN ET UN FILLEUL, ET LE CRÉDIT GRYD+.
--
-- Requiert 0184 (le code). Les RÉCOMPENSES et l'attribution sont en 0186 :
-- cette migration ne fait qu'ouvrir la maison des faits, sans rien octroyer.
--
-- ─── LES SEPT GARDE-FOUS, ET OÙ CHACUN VIT ─────────────────────────────────
--  1. un seul parrain par filleul ....... index UNIQUE `referee_id` (ici)
--  2. pas d'auto-parrainage ............. contrainte `referrer_id <> referee_id` (ici)
--  3. pas de réciprocité ................ `redeem_referral_code_2026` (0186)
--  4. compte filleul ≤ 7 jours .......... `redeem_referral_code_2026` (0186)
--  5. les DEUX ont couru ................ colonnes `*_qualified_at` (ici), posées
--                                          par le déclencheur de 0186
--  6. fenêtre de 30 jours ............... `completed_at` refusé au-delà (0186)
--  7. plafond par saison ................ `referrer_capped` (ici), décidé à
--                                          l'octroi (0186)
-- Le plafond ne PRIVE JAMAIS le filleul : il coupe la récompense du PARRAIN,
-- parce que c'est lui, et lui seul, que le plafond vise.
--
-- ─── LE CRÉDIT GRYD+ EST BANQUÉ, PAS DÉPENSÉ ───────────────────────────────
-- ADR-016 (pré-vente, 11/09/2026) : la boutique ne vend RIEN, et les outils
-- GRYD+ sont ouverts à tout compte connecté PRÉCISÉMENT parce que personne ne
-- peut payer. Faire courir 30 jours contre une porte déjà ouverte reviendrait à
-- offrir zéro jour en écrivant « 30 ». Les jours sont donc INSCRITS
-- (`granted_at`, `days`) et DÉMARRENT le jour de l'ouverture, par
-- `start_referral_gryd_plus_credits_2026()`. Tant qu'ils n'ont pas démarré,
-- l'écran dit « crédité, démarre à l'ouverture de GRYD+ » — c'est vrai, et ça
-- ne promet rien au-delà du code.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.referral_links_2026 (
  id           bigint generated always as identity primary key,
  referrer_id  uuid not null references public.users(id) on delete cascade,
  referee_id   uuid not null references public.users(id) on delete cascade,
  -- Le code TEL QU'IL A ÉTÉ SAISI (déjà normalisé). Conservé même si le compte
  -- du parrain disparaît : un lien sans son code ne se relit plus.
  code         text not null,
  redeemed_at  timestamptz not null default now(),
  -- La saison au moment de la SAISIE. Le plafond se compte par saison, et une
  -- saison qui se termine ne doit pas déplacer les liens déjà noués.
  season_key   text not null,

  -- ─── LES DEUX PREUVES DE SORTIE RÉELLE (NULL = pas encore) ───────────────
  referrer_run_id       uuid references public.runs(id) on delete set null,
  referrer_qualified_at timestamptz,
  referee_run_id        uuid references public.runs(id) on delete set null,
  referee_qualified_at  timestamptz,

  completed_at    timestamptz,
  -- Vrai quand le parrain était DÉJÀ au plafond de la saison à l'instant de
  -- l'octroi : le filleul a reçu sa part, le parrain non. Le fait est écrit,
  -- pas déduit d'un comptage refait plus tard.
  referrer_capped boolean not null default false,
  revoked_at      timestamptz,
  revoked_reason  text,

  constraint referral_links_2026_no_self check (referrer_id <> referee_id),
  -- Une DATE sans sa course reste vraie : `on delete set null` efface la course
  -- quand la ligne `runs` disparaît (purge, suppression de compte), et la
  -- qualification, elle, a bien eu lieu. L'inverse, une course sans date,
  -- serait une ligne qu'on ne sait plus dater : elle est interdite.
  constraint referral_links_2026_qualification_dated check (
    (referrer_run_id is null or referrer_qualified_at is not null)
    and (referee_run_id is null or referee_qualified_at is not null)),
  constraint referral_links_2026_completion_needs_both check (
    completed_at is null
    or (referrer_qualified_at is not null and referee_qualified_at is not null)),
  constraint referral_links_2026_revocation_reasoned check (
    (revoked_at is null) = (revoked_reason is null))
);

-- « Un filleul a UN parrain » : structurel, pas déclaratif.
create unique index referral_links_2026_referee_unique
  on public.referral_links_2026 (referee_id);
create index referral_links_2026_referrer_idx
  on public.referral_links_2026 (referrer_id, season_key);
-- Le déclencheur de 0186 part d'une SORTIE et cherche son lien : sans ces deux
-- index, chaque évidence sportive du dépôt balaierait la table entière.
create index referral_links_2026_referrer_run_idx
  on public.referral_links_2026 (referrer_run_id) where referrer_run_id is not null;
create index referral_links_2026_referee_run_idx
  on public.referral_links_2026 (referee_run_id) where referee_run_id is not null;

alter table public.referral_links_2026 enable row level security;
-- Comme 0184 : aucune policy. Un lien nomme DEUX comptes ; une policy « je vois
-- mes lignes » exposerait l'`user_id` de l'autre, valeur que l'app ne rend
-- jamais (`features/social/profileLink.ts`). La lecture passe par
-- `my_referral_2026()` (0186), qui rend un pseudo et jamais un identifiant.
revoke all on public.referral_links_2026 from public, anon, authenticated;
grant all on public.referral_links_2026 to service_role;

-- ═══ LE CRÉDIT GRYD+ ═══════════════════════════════════════════════════════
create table public.referral_gryd_plus_credits_2026 (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.users(id) on delete cascade,
  link_id     bigint not null references public.referral_links_2026(id) on delete cascade,
  days        integer not null check (days > 0),
  granted_at  timestamptz not null default now(),
  -- NULL = banqué (la boutique n'a pas encore ouvert pour ce compte).
  consumed_at timestamptz,
  ends_at     timestamptz,
  revoked_at  timestamptz,
  -- Un parrainage = un crédit par bénéficiaire. Rejouer l'octroi n'en crée pas
  -- un deuxième : la contrainte le refuse, plutôt qu'un `select` préalable.
  unique (user_id, link_id),
  constraint referral_credits_2026_started_pairs check (
    (consumed_at is null and ends_at is null)
    or (consumed_at is not null and ends_at is not null and ends_at > consumed_at))
);
create index referral_gryd_plus_credits_2026_user_idx
  on public.referral_gryd_plus_credits_2026 (user_id);

alter table public.referral_gryd_plus_credits_2026 enable row level security;
revoke all on public.referral_gryd_plus_credits_2026 from public, anon, authenticated;
grant all on public.referral_gryd_plus_credits_2026 to service_role;

/**
 * L'INTERRUPTEUR DU JOUR D'OUVERTURE. Fait démarrer tous les crédits banqués
 * qui n'ont pas été révoqués, et rend le nombre de crédits partis.
 *
 * Rejouable : un crédit déjà démarré n'est pas redémarré (`consumed_at is
 * null` dans le `where`), donc un second appel rend 0 et ne prolonge personne.
 *
 * `p_user_id` NULL = tout le monde (l'interrupteur global du jour J) ; renseigné
 * = un seul compte (rattrapage d'un support, ou d'un compte créé après J).
 *
 * ⚠️ AUCUN APPELANT AUJOURD'HUI, ET C'EST ASSUMÉ — la boutique n'ouvre pas
 * encore. C'est la DIFFÉRENCE avec `public.referrals` (0002), qui était un
 * chemin mort SANS que personne le sache : ici le fait est écrit, la fonction
 * est testée de bout en bout (`supabase/tests/referral_2026.pglite.test.mjs`),
 * et l'écran ne promet aux joueurs que ce que cet état dit — « crédité,
 * démarre à l'ouverture ».
 */
create function public.start_referral_gryd_plus_credits_2026(p_user_id uuid default null)
returns integer language plpgsql security definer set search_path=public,pg_temp as $$
declare started integer;
begin
  update public.referral_gryd_plus_credits_2026 c
     set consumed_at = now(),
         ends_at = now() + make_interval(days => c.days)
   where c.consumed_at is null
     and c.revoked_at is null
     and (p_user_id is null or c.user_id = p_user_id)
     and exists(select 1 from public.users u
                 where u.id = c.user_id and u.deletion_requested_at is null);
  get diagnostics started = row_count;
  return started;
end $$;

/** Le crédit est-il en train de courir, à cet instant ? (pur, sans effet) */
create function public.referral_gryd_plus_active_2026(p_user_id uuid, p_at timestamptz default now())
returns boolean language sql stable security definer set search_path=public,pg_temp as $$
  select exists(
    select 1 from public.referral_gryd_plus_credits_2026
     where user_id = p_user_id and revoked_at is null
       and consumed_at is not null and ends_at > p_at);
$$;

/**
 * ─── LA SEULE MODIFICATION DE LA CHAÎNE GRYD+ DE CE LOT ────────────────────
 *
 * `has_gryd_plus_access_2026` (0120) DÉCIDE l'accès aux outils GRYD+ côté
 * serveur : `grant_earned_season_variants2026` (0121) et les cosmétiques
 * `obtain='gryd_plus'` (0180) le lisent. Un crédit de parrainage EST un accès
 * accordé par le serveur : il entre donc ici, sinon les « 30 jours » seraient
 * un mot sans effet.
 *
 * ⚠️ CE QUI N'EST **PAS** MODIFIÉ, ET POURQUOI : `get_gryd_plus_access_2026()`,
 * la lecture que l'app affiche. Elle rend `active` d'après le REÇU DU STORE, et
 * `features/premium/access2026.ts` en tire le mot « Abonnement actif ». Un
 * crédit de parrainage n'est pas un abonnement : y répondre `active: true`
 * ferait dire à l'app qu'une personne est abonnée alors qu'elle n'a jamais
 * payé. C'est exactement le mensonge que ce fichier a corrigé le 11/09/2026.
 * L'écran `/parrainage` dit le crédit avec SES mots, à SA place.
 *
 * ⚠️ `sync_gryd_plus_access_2026` N'EXISTE PAS. Le nom circule dans un
 * commentaire de `features/premium/access2026.ts:26` ; aucune fonction SQL ni
 * Edge ne le porte (`grep -rn "sync_gryd_plus_access_2026"` ne rend que ce
 * commentaire et deux fichiers mobiles). La fonction qui DÉCIDE réellement est
 * celle-ci, et c'est elle qu'on étend.
 */
create or replace function public.has_gryd_plus_access_2026(p_user_id uuid) returns boolean
language sql stable security definer set search_path=public,pg_temp as $$
  select exists(select 1 from public.premium_entitlements_2026
                 where user_id = p_user_id and is_active and (lifetime or expires_at > now()))
      or public.referral_gryd_plus_active_2026(p_user_id, now());
$$;

revoke all on function public.start_referral_gryd_plus_credits_2026(uuid) from public, anon, authenticated;
revoke all on function public.referral_gryd_plus_active_2026(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.has_gryd_plus_access_2026(uuid) from public, anon, authenticated;
grant execute on function public.start_referral_gryd_plus_credits_2026(uuid) to service_role;
grant execute on function public.referral_gryd_plus_active_2026(uuid, timestamptz) to service_role;
grant execute on function public.has_gryd_plus_access_2026(uuid) to service_role;

comment on table public.referral_links_2026 is
  'Lien de parrainage 2026 : un filleul a UN parrain (index unique), jamais '
  'lui-même, et la récompense n''arrive que quand les DEUX ont une sortie '
  'validée dans les 30 jours (game-rules §3.7).';
comment on table public.referral_gryd_plus_credits_2026 is
  'Crédit GRYD+ de parrainage : BANQUÉ à l''octroi, démarré le jour de '
  'l''ouverture de la boutique par start_referral_gryd_plus_credits_2026().';
