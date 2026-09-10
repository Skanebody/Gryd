-- ═══════════════════════════════════════════════════════════════════════════
-- GRYD — LES PRODUCTEURS : LES FAITS DU JEU ARRIVENT ENFIN À QUELQU'UN.
--
-- 0192 a posé la boîte, le catalogue et la lecture. Ici, huit déclencheurs
-- branchent la boîte sur des faits QUI EXISTENT DÉJÀ en base. Aucun fait n'est
-- inventé pour l'occasion, et aucun fait sans producteur n'est déclaré.
--
-- ─── POURQUOI DES TRIGGERS, ET PAS DES APPELS DANS LES RPC ─────────────────
-- « Un nouveau membre » a SIX portes d'entrée vivantes (`create_crew`,
-- `join_crew_by_code`, `crew_apply_2026`, `crew_decide_join_request`,
-- `redeem_crew_invite`, plus les réécritures de 0190). Poser l'appel dans
-- chacune, c'est signer six fois la même promesse et en oublier une le jour où
-- une septième naîtra. Le trigger est posé sur le FAIT — la ligne de
-- `crew_members` — donc toutes les portes le franchissent, y compris celles qui
-- n'existent pas encore.
--
-- Même raisonnement pour la capture (un job cron promeut par lots), la
-- vérification (une RPC d'opérateur ET une expiration automatique de 24 h
-- mènent au même refus), et le défi de crew (`maintain_challenge_2026` est
-- appelée depuis un cron, depuis chaque lecture et depuis chaque dépôt de
-- trace). Réécrire ces fonctions pour y glisser une ligne aurait rendu à
-- réécrire des migrations vivantes ; le trigger n'en touche aucune.
--
-- ─── LE BUDGET N'EST PAS CONSOMMÉ, ET C'EST LE CONTRAIRE D'UN OUBLI ────────
-- Ces producteurs écrivent la BOÎTE (`notification_inbox_write_2026`), jamais
-- le journal de sollicitations. Raison, déjà écrite par 0188 : « consommer un
-- budget pour un message que rien n'emporte ferait taire de vraies
-- sollicitations plus tard ». Aucun canal distant n'existe (l'entitlement APNs
-- est retiré par `plugins/withoutPushEntitlement.js`), donc aucune ligne écrite
-- ici ne va chercher personne. Le jour où le push existera, c'est le
-- DISPATCHEUR qui appellera `claim_notification_2026` avant d'envoyer — la
-- porte est déjà là, elle écrit déjà la boîte, et §14.1 reste tenu à
-- 3 sollicitations par semaine parce que rien d'autre ne les consomme.
--
-- ─── CE QUI N'EST PAS PRODUIT, DIT ICI PLUTÔT QUE LAISSÉ CROIRE ───────────
--  · LE RAPPEL DE RENDEZ-VOUS (§14.2, ligne 2) n'a AUCUN support serveur :
--    ni table de rappel, ni échéance, ni job. `RendezvousOptIn.tsx` programme
--    une notification LOCALE sur l'appareil, et c'est tout. Écrire un
--    producteur ici aurait demandé d'inventer le job qui le déclenche.
--  · L'EXPIRATION D'UNE QUÊTE HEBDO est volontairement SILENCIEUSE (0167) :
--    §4.2 refuse la relance sur un échec. Rien n'est branché dessus.
--  · LA REPRISE DE TERRAIN PAR UN RIVAL : « alimente le journal du jeu et le
--    résumé choisi, pas une alarme immédiate » (§14.2, dernière ligne). Aucun
--    fait de ce lot ne nomme un adversaire.
--  · L'ANNONCE RETIRÉE ne produit rien : le fait annoncé, c'est la
--    publication ; un retrait n'a pas de message honnête à porter.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. LA SORTIE : VÉRIFICATION, TERRAIN, REFUS ────────────────────────────
/**
 * Quatre moments d'une même vie, sur `capture_events_2026` :
 *   · insertion en `pending`               → `result_pending`  (⏳)
 *   · `pending` → `scheduled`              → `result_ready`    (✅) — réadmise
 *   · `→ published`                        → `capture_published` (🏁)
 *   · `→ rejected`                         → `result_refused`  (⛔)
 *
 * UNE LIGNE PAR SORTIE, PAS PAR FACE. `capture_events_2026` porte une ligne par
 * face de la carte : une boucle qui en touche quatre en écrit quatre. La clé
 * d'événement porte donc le `run_id`, et l'index unique de 0188 fait le reste —
 * la deuxième face n'écrit rien. C'est le regroupement de §14.3 tenu par une
 * contrainte plutôt que par la vigilance du producteur.
 *
 * AUCUNE SURFACE DANS LE MESSAGE. Au moment où la première face bascule, les
 * autres ne sont pas encore publiées : tout total écrit ici serait partiel. Le
 * chiffre vit sur l'écran de la sortie, où il est complet.
 *
 * LE REFUS NE DIT PAS LE SOUPÇON. `result_refused` couvre DEUX chemins — le
 * verdict d'opérateur qui confirme (0187) et l'expiration de 24 h sans reçu
 * (0156) — et dit le même fait : cette sortie ne prend pas de terrain. Les
 * raisons vivent dans `anticheat_reviews`, jamais dans une notification
 * (ADR-015 : une suspicion est une donnée sensible).
 */
create function public.notify_capture_event_2026() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_kind text; v_key text;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then v_kind := 'result_pending'; end if;
  elsif new.status is distinct from old.status then
    v_kind := case new.status
      when 'published' then 'capture_published'
      when 'rejected'  then 'result_refused'
      when 'scheduled' then case when old.status = 'pending' then 'result_ready' end
    end;
  end if;
  if v_kind is null or new.owner_id is null then return null; end if;

  v_key := coalesce(new.run_id::text, new.id::text);
  begin
    perform public.notification_inbox_write_2026(new.owner_id, v_kind, v_key,
      jsonb_build_object('runId', new.run_id, 'activity', new.activity), now());
  exception when others then
    -- Best-effort ASSUMÉ : le terrain est déjà écrit. Une boîte de réception
    -- indisponible ne doit pas annuler une capture méritée.
    raise warning 'notify_capture_event_2026: boîte indisponible (%, %)', v_kind, v_key;
  end;
  return null;
end $$;

create trigger notify_capture_event_2026
  after insert or update of status on public.capture_events_2026
  for each row execute function public.notify_capture_event_2026();

-- ── 2. LE CREW S'AGRANDIT ──────────────────────────────────────────────────
/**
 * Une ligne de `crew_members` naît → DEUX messages, et pas le même :
 *   · au nouvel arrivant : `crew_joined` (§14.2, ligne 4 : « Tu as rejoint Les
 *     Foulées du Canal. ») ;
 *   · aux membres déjà là : `crew_member_joined`.
 *
 * LA CRÉATION D'UN CREW N'EST PAS UNE ARRIVÉE. Quand la ligne est la PREMIÈRE
 * du crew, personne n'est prévenu : dire « tu as rejoint » à qui vient de
 * fonder serait faux, et il n'y a personne d'autre à prévenir.
 *
 * La clé porte `joined_at` : quelqu'un qui revient après un départ est une
 * nouvelle arrivée, et le message se redit. Deux passages du même job, non.
 */
create function public.notify_crew_membership_2026() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_key text; v_name text; v_handle text; v_others integer; v_member record;
begin
  if new.left_at is not null then return null; end if;

  select count(*) into v_others from public.crew_members m
   where m.crew_id = new.crew_id and m.left_at is null and m.user_id <> new.user_id;
  if v_others = 0 then return null; end if;

  select c.name into v_name from public.crews c where c.id = new.crew_id;
  select coalesce(p.display_name, p.handle) into v_handle
    from public.user_profiles p where p.user_id = new.user_id;
  v_key := new.crew_id::text || ':' || new.user_id::text || ':'
        || to_char(new.joined_at at time zone 'UTC', 'YYYYMMDD"T"HH24MISSUS');

  begin
    perform public.notification_inbox_write_2026(new.user_id, 'crew_joined', v_key,
      jsonb_build_object('crewId', new.crew_id, 'crewName', v_name), now());
    for v_member in
      select m.user_id from public.crew_members m
       where m.crew_id = new.crew_id and m.left_at is null and m.user_id <> new.user_id
    loop
      perform public.notification_inbox_write_2026(v_member.user_id, 'crew_member_joined', v_key,
        jsonb_build_object('crewId', new.crew_id, 'crewName', v_name, 'handle', v_handle), now());
    end loop;
  exception when others then
    raise warning 'notify_crew_membership_2026: boîte indisponible (%)', v_key;
  end;
  return null;
end $$;

create trigger notify_crew_membership_2026
  after insert on public.crew_members
  for each row execute function public.notify_crew_membership_2026();

-- ── 3. LES RENDEZ-VOUS ─────────────────────────────────────────────────────
/**
 * §14.2, lignes 2 et 3. Trois faits sur `crew_events` :
 *   · une sortie est PROPOSÉE  → à tous les membres actifs, sauf l'hôte ;
 *   · une sortie CHANGE        → aux INSCRITS seuls, transactionnel ;
 *   · une sortie est ANNULÉE   → aux INSCRITS seuls, transactionnel.
 *
 * AUX INSCRITS SEULS, et c'est la ligne du cahier : « Modification ou
 * annulation | Inscrits concernés ». Prévenir tout le crew d'un changement
 * d'horaire qui ne le concerne pas serait la sollicitation de trop.
 * `crew_outing_change_2026` supprime les RSVP APRÈS avoir écrit l'annulation :
 * ce trigger, qui s'exécute à la fin de l'UPDATE, les voit encore. C'est la
 * seule fenêtre où l'on sait qui prévenir, et elle est ouverte.
 *
 * LE LIEU N'ENTRE PAS DANS LE PAYLOAD. `place_label` est une information de
 * MEMBRE (0152) protégée par sa propre modération d'adresse (0085) : le jour
 * d'un aperçu sur écran verrouillé, §14.3 le refuserait. Le payload porte
 * l'heure et le crew ; le lieu s'ouvre dans l'application.
 *
 * La clé d'un changement porte la RÉVISION : une seconde correction est un
 * second fait, deux passages de la même révision n'en sont qu'un.
 */
create function public.notify_crew_outing_2026() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_kind text; v_key text; v_name text; v_payload jsonb; v_target record;
begin
  if tg_op = 'INSERT' then
    if new.cancelled_at_2026 is not null then return null; end if;
    v_kind := 'crew_outing_proposed';
    v_key  := new.id::text;
  elsif new.cancelled_at_2026 is not null and old.cancelled_at_2026 is null then
    v_kind := 'crew_outing_cancelled';
    v_key  := new.id::text;
  elsif new.cancelled_at_2026 is null
    and new.revision_2026 is distinct from old.revision_2026 then
    v_kind := 'crew_outing_changed';
    v_key  := new.id::text || ':' || new.revision_2026::text;
  end if;
  if v_kind is null then return null; end if;

  select c.name into v_name from public.crews c where c.id = new.crew_id;
  v_payload := jsonb_build_object(
    'outingId', new.id, 'crewId', new.crew_id, 'crewName', v_name,
    'startsAt', new.starts_at, 'activity', new.activity);

  begin
    if v_kind = 'crew_outing_proposed' then
      for v_target in
        select m.user_id from public.crew_members m
         where m.crew_id = new.crew_id and m.left_at is null and m.user_id <> new.created_by
      loop
        perform public.notification_inbox_write_2026(v_target.user_id, v_kind, v_key, v_payload, now());
      end loop;
    else
      for v_target in
        select r.user_id from public.crew_event_rsvps r
          join public.crew_members m
            on m.user_id = r.user_id and m.crew_id = new.crew_id and m.left_at is null
         where r.event_id = new.id and r.choice = 'coming'
      loop
        perform public.notification_inbox_write_2026(v_target.user_id, v_kind, v_key, v_payload, now());
      end loop;
    end if;
  exception when others then
    raise warning 'notify_crew_outing_2026: boîte indisponible (%, %)', v_kind, v_key;
  end;
  return null;
end $$;

create trigger notify_crew_outing_2026
  after insert or update on public.crew_events
  for each row execute function public.notify_crew_outing_2026();

-- ── 4. L'ANNONCE DU CAPITAINE ──────────────────────────────────────────────
/**
 * `crew_announcements` (0096) EST l'annonce épinglée du capitaine : la
 * conversation 2026 (`crew_messages_2026`, 0127) n'a ni `kind` ni `pinned`, et
 * inventer un type de message pour l'occasion aurait été bâtir la mécanique
 * plutôt que de brancher celle qui existe.
 *
 * Le CORPS n'entre pas dans le payload : une annonce va jusqu'à 280 caractères
 * d'UGC, et une notification est courte. Le message dit qu'une annonce existe
 * et ouvre le fil, où elle se lit en entier et où la modération s'applique.
 */
create function public.notify_crew_announcement_2026() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_name text; v_target record;
begin
  if new.removed_at is not null then return null; end if;
  select c.name into v_name from public.crews c where c.id = new.crew_id;
  begin
    for v_target in
      select m.user_id from public.crew_members m
       where m.crew_id = new.crew_id and m.left_at is null and m.user_id <> new.author_id
    loop
      perform public.notification_inbox_write_2026(v_target.user_id, 'crew_announcement',
        new.id::text, jsonb_build_object('crewId', new.crew_id, 'crewName', v_name), now());
    end loop;
  exception when others then
    raise warning 'notify_crew_announcement_2026: boîte indisponible (%)', new.id;
  end;
  return null;
end $$;

create trigger notify_crew_announcement_2026
  after insert on public.crew_announcements
  for each row execute function public.notify_crew_announcement_2026();

-- ── 5. LE DÉFI DE CREW ─────────────────────────────────────────────────────
/**
 * `scheduled → active` et `→ final` (0122, `maintain_challenge_2026`). Aux
 * joueurs RÉSERVÉS du roster, jamais à tout le crew : un membre hors roster n'a
 * pas pu contribuer, et 0190 avait déjà tranché ainsi pour l'avertissement.
 *
 * `final` SEULEMENT, jamais une publication intermédiaire : §14.2 dit « Une
 * fois après clôture effective ». Un classement d'étape n'est pas un résultat.
 * `challengeTitle`, et surtout PAS `title` : dans un payload, `title` et `body`
 * sont réservés aux lignes d'AVANT ce lot, qui portent leur copie figée.
 * `notification_renderable_2026` lit cette clé pour reconnaître une ligne
 * héritée — la réutiliser pour un nom de défi aurait brouillé les deux mondes.
 *
 * `cancelled` ne produit rien non plus : le seul cas automatique est
 * `roster_incomplete_at_start`, et annoncer à quelqu'un que son défi n'a pas eu
 * lieu faute de coéquipiers est un reproche déguisé (§14.4, aucune pression).
 */
create function public.notify_crew_challenge_2026() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_kind text; v_target record;
begin
  if new.status is not distinct from old.status then return null; end if;
  v_kind := case new.status
    when 'active' then 'crew_challenge_started'
    when 'final'  then 'crew_challenge_ended'
  end;
  if v_kind is null then return null; end if;

  begin
    for v_target in
      select distinct r.player_id from public.challenge_roster_2026 r
       where r.challenge_id = new.id and r.reserved
    loop
      perform public.notification_inbox_write_2026(v_target.player_id, v_kind, new.id::text,
        jsonb_build_object('challengeId', new.id, 'challengeTitle', new.title,
                           'activity', new.activity),
        now());
    end loop;
  exception when others then
    raise warning 'notify_crew_challenge_2026: boîte indisponible (%, %)', v_kind, new.id;
  end;
  return null;
end $$;

create trigger notify_crew_challenge_2026
  after update of status on public.crew_challenges_2026
  for each row execute function public.notify_crew_challenge_2026();

-- ── 6. LA QUÊTE HEBDO ACCOMPLIE ────────────────────────────────────────────
/**
 * `weekly_quest_assignments_2026` passe à `completed` (0167 l. 265), dans la
 * même transaction que l'octroi de l'objet. Le message annonce donc une
 * récompense qui EXISTE déjà en base — jamais une qui arriverait « bientôt ».
 *
 * `expired` ne produit rien : 0167 le dit, l'expiration est silencieuse.
 */
create function public.notify_weekly_quest_2026() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.status <> 'completed' or old.status = 'completed' then return null; end if;
  begin
    perform public.notification_inbox_write_2026(new.user_id, 'weekly_quest_done',
      new.week_start::text || ':' || new.activity || ':' || new.quest_id,
      jsonb_build_object('questId', new.quest_id, 'activity', new.activity,
                         'weekStart', new.week_start), now());
  exception when others then
    raise warning 'notify_weekly_quest_2026: boîte indisponible (%)', new.quest_id;
  end;
  return null;
end $$;

create trigger notify_weekly_quest_2026
  after update of status on public.weekly_quest_assignments_2026
  for each row execute function public.notify_weekly_quest_2026();

-- ── 7. LA RÉCOMPENSE DE NIVEAU ─────────────────────────────────────────────
/**
 * `level_reward_ownership_2026` reçoit une ligne (0144 l. 84) : l'objet est
 * POSSÉDÉ à cet instant, dans la transaction du crédit d'XP.
 *
 * Le trigger est posé sur la POSSESSION, et non dans `grant_level_rewards_2026`
 * qui ne rend qu'un COMPTE : elle sait combien d'objets sont tombés, pas
 * lesquels. Le niveau et l'objet viennent du modèle gelé, jamais d'un calcul
 * refait ici.
 */
create function public.notify_level_reward_2026() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
declare v_level integer;
begin
  select tpl.level into v_level
    from public.level_reward_templates_2026 tpl where tpl.reward_id = new.reward_id;
  begin
    perform public.notification_inbox_write_2026(new.user_id, 'level_reward', new.reward_id,
      jsonb_build_object('rewardId', new.reward_id, 'level', v_level), now());
  exception when others then
    raise warning 'notify_level_reward_2026: boîte indisponible (%)', new.reward_id;
  end;
  return null;
end $$;

create trigger notify_level_reward_2026
  after insert on public.level_reward_ownership_2026
  for each row execute function public.notify_level_reward_2026();

-- ── 8. PRIVILÈGES ──────────────────────────────────────────────────────────
-- Aucune de ces fonctions n'est appelable : ce sont des triggers, et un client
-- qui pourrait les invoquer écrirait des notifications à la place du serveur.
revoke all on function public.notify_capture_event_2026(),
  public.notify_crew_membership_2026(), public.notify_crew_outing_2026(),
  public.notify_crew_announcement_2026(), public.notify_crew_challenge_2026(),
  public.notify_weekly_quest_2026(), public.notify_level_reward_2026()
  from public, anon, authenticated;

comment on function public.notify_capture_event_2026() is
  'Producteur §14.2 : vérification en cours, vérification terminée, terrain '
  'publié, sortie refusée. UNE ligne par SORTIE (clé = run_id), jamais par face. '
  'N''écrit aucune surface : au moment de la première face, le total serait faux.';
comment on function public.notify_crew_membership_2026() is
  'Producteur §14.2 ligne 4 : « Tu as rejoint … » au nouvel arrivant, et le fait '
  'aux membres déjà là. La création d''un crew n''est pas une arrivée.';
comment on function public.notify_crew_outing_2026() is
  'Producteur §14.2 lignes 2 et 3 : sortie proposée (aux membres), changée ou '
  'annulée (aux INSCRITS seuls, transactionnel). Le lieu n''entre pas dans le '
  'payload.';
