-- =====================================================================
-- 2. dosya: sitenin bağlanması için ek fonksiyonlar.
-- schema.sql'den SONRA, SQL Editor'de bir kez çalıştırılır.
-- =====================================================================

-- Grup ve hesapsız oyuncu kimliği tarayıcıda üretilir (sayfa hemen yönlenebilsin diye)
drop function if exists public.create_group(text, boolean);
create or replace function public.create_group(p_id uuid, p_name text, p_public boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := my_player_id();
begin
  if me is null then raise exception 'Önce oyuncu profilini oluştur.'; end if;
  insert into groups (id, name, is_public) values (p_id, trim(p_name), p_public);
  insert into group_members (group_id, player_id, is_admin) values (p_id, me, true);
  return p_id;
end $$;

drop function if exists public.add_guest_player(uuid, text, int, text, text, text, text);
create or replace function public.add_guest_player(
  p_id uuid, g uuid, p_name text, p_number int, p_foot text, p_size text, p_position text, p_position2 text
) returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not is_group_admin(g) then raise exception 'Sadece yönetici oyuncu ekleyebilir.'; end if;
  insert into players (id, name, number, foot, size, position, position2)
  values (p_id, trim(p_name), coalesce(p_number, 0), coalesce(p_foot, 'Sağ'), p_size, coalesce(p_position, 'OS'), p_position2);
  insert into group_members (group_id, player_id) values (g, p_id);
  return p_id;
end $$;

-- Üyesi olduğum grupların davet kodları
create or replace function public.my_invite_codes()
returns table (group_id uuid, invite_code text)
language sql stable security definer set search_path = public as $$
  select g.id, g.invite_code from groups g where is_member(g.id)
$$;

-- Davet linki önizlemesi: kodu bilen, grubun adını ve yöneticilerini görür
create or replace function public.invite_preview(p_code text)
returns table (group_id uuid, name text, member_count int, admin_names text[])
language sql stable security definer set search_path = public as $$
  select g.id, g.name,
         (select count(*)::int from group_members m where m.group_id = g.id),
         (select coalesce(array_agg(p.name), '{}') from group_members m join players p on p.id = m.player_id
           where m.group_id = g.id and m.is_admin)
  from groups g
  where g.invite_code = upper(regexp_replace(p_code, '\s', '', 'g'))
$$;

-- Görülebilen bitmiş maçların oylama durumu (kimin oy verdiği yok, sadece sayılar)
create or replace function public.match_stats()
returns table (match_id uuid, total int, done int, i_voted boolean, revealed boolean)
language sql stable security definer set search_path = public as $$
  select m.id, p.total, p.done, p.i_voted, is_revealed(m.id)
  from matches m
  cross join lateral voting_progress(m.id) p
  where m.status = 'finished' and can_see_group(m.group_id)
$$;

-- Sonuçları açılmış görülebilen maçların ratingleri
create or replace function public.all_match_ratings()
returns table (match_id uuid, player_id uuid, rating numeric, votes int)
language sql stable security definer set search_path = public as $$
  select v.match_id, v.target_id,
         round(avg((v.hucum + v.teknik + v.pas + v.savunma + v.fizik) / 5.0), 1),
         count(*)::int
  from votes v
  join matches m on m.id = v.match_id
  where m.status = 'finished' and can_see_group(m.group_id) and is_revealed(m.id)
  group by v.match_id, v.target_id
$$;

-- Tüm oyuncuların maç başına özellik ortalamaları (kartlar herkese açık kimlik olduğu için)
create or replace function public.all_player_averages()
returns table (player_id uuid, match_id uuid, match_date date, match_time text, votes int,
               hucum numeric, teknik numeric, pas numeric, savunma numeric, fizik numeric)
language sql stable security definer set search_path = public as $$
  select v.target_id, m.id, m.date, m.time, count(*)::int,
         avg(v.hucum), avg(v.teknik), avg(v.pas), avg(v.savunma), avg(v.fizik)
  from votes v
  join matches m on m.id = v.match_id
  where is_revealed(m.id)
  group by v.target_id, m.id, m.date, m.time
$$;

-- Tüm oyuncuların ilk değerlendirme özeti
create or replace function public.all_player_base()
returns table (player_id uuid, vote_count int, required int,
               hucum numeric, teknik numeric, pas numeric, savunma numeric, fizik numeric)
language sql stable security definer set search_path = public as $$
  select p.id, b.vote_count, b.required, b.hucum, b.teknik, b.pas, b.savunma, b.fizik
  from players p
  cross join lateral player_base(p.id) b
$$;
