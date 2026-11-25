-- =====================================================================
-- 4. dosya: "Hız" özelliği. Oylara ve ilk değerlendirmelere hız sütunu
-- eklenir, ortalama fonksiyonları hızı da döndürür.
-- Sıra: schema.sql → 002 → 003 → bu dosya. SQL Editor'de bir kez çalıştırılır.
-- Eski oylarda hız boştur; ortalamalarda onun yerine fizik puanı kullanılır.
-- =====================================================================

alter table public.votes add column if not exists hiz smallint check (hiz between 1 and 10);
alter table public.base_votes add column if not exists hiz smallint check (hiz between 1 and 10);

drop function if exists public.all_player_base();
drop function if exists public.player_base(uuid);
drop function if exists public.all_player_averages();
drop function if exists public.player_match_averages(uuid);

create function public.player_base(pid uuid)
returns table (vote_count int, required int,
               hucum numeric, teknik numeric, pas numeric, savunma numeric, fizik numeric, hiz numeric)
language sql stable security definer set search_path = public as $$
  with b as (
    select * from base_votes where target_id = pid and hucum is not null
  ),
  r as (
    select greatest(1, least(3, count(distinct y.player_id)))::int as req
    from group_members x join group_members y on x.group_id = y.group_id
    where x.player_id = pid and y.player_id <> pid
  ),
  c as (select count(*)::int as n from b)
  select c.n, r.req,
         case when c.n >= r.req then (select avg(hucum) from b) end,
         case when c.n >= r.req then (select avg(teknik) from b) end,
         case when c.n >= r.req then (select avg(pas) from b) end,
         case when c.n >= r.req then (select avg(savunma) from b) end,
         case when c.n >= r.req then (select avg(fizik) from b) end,
         case when c.n >= r.req then (select avg(coalesce(hiz, fizik)) from b) end
  from c, r
$$;

create function public.all_player_base()
returns table (player_id uuid, vote_count int, required int,
               hucum numeric, teknik numeric, pas numeric, savunma numeric, fizik numeric, hiz numeric)
language sql stable security definer set search_path = public as $$
  select p.id, b.vote_count, b.required, b.hucum, b.teknik, b.pas, b.savunma, b.fizik, b.hiz
  from players p
  cross join lateral player_base(p.id) b
$$;

create function public.all_player_averages()
returns table (player_id uuid, match_id uuid, match_date date, match_time text, votes int,
               hucum numeric, teknik numeric, pas numeric, savunma numeric, fizik numeric, hiz numeric)
language sql stable security definer set search_path = public as $$
  select v.target_id, m.id, m.date, m.time, count(*)::int,
         avg(v.hucum), avg(v.teknik), avg(v.pas), avg(v.savunma), avg(v.fizik), avg(coalesce(v.hiz, v.fizik))
  from votes v
  join matches m on m.id = v.match_id
  where is_revealed(m.id)
  group by v.target_id, m.id, m.date, m.time
$$;

create function public.player_match_averages(pid uuid)
returns table (match_id uuid, match_date date, match_time text, votes int,
               hucum numeric, teknik numeric, pas numeric, savunma numeric, fizik numeric, hiz numeric)
language sql stable security definer set search_path = public as $$
  select m.id, m.date, m.time, count(*)::int,
         avg(v.hucum), avg(v.teknik), avg(v.pas), avg(v.savunma), avg(v.fizik), avg(coalesce(v.hiz, v.fizik))
  from votes v
  join matches m on m.id = v.match_id
  where v.target_id = pid and is_revealed(m.id)
  group by m.id, m.date, m.time
  order by m.date, m.time
$$;
