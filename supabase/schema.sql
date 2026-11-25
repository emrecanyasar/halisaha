-- =====================================================================
-- Halısaha veritabanı şeması (Supabase / Postgres)
-- Kullanım: Supabase paneli → SQL Editor → New query → bu dosyanın
-- tamamını yapıştır → Run. Boş bir projede bir kez çalıştırılır.
--
-- Güvenlik modeli: tarayıcı veritabanına herkese açık anahtarla bağlanır,
-- bu yüzden tüm yetki kontrolleri burada (RLS + fonksiyonlar) yapılır.
-- * Oylar (votes, base_votes) kimse tarafından okunamaz; herkes sadece
--   kendi verdiği oyu görür. Ortalamalar fonksiyonlarla döner.
-- * Grup, maç ve üye işlemleri sadece grup yöneticisine açıktır.
-- * İlan telefonu sadece giriş yapmış kullanıcılara görünür.
-- =====================================================================

create extension if not exists pgcrypto;

-- ============================ TABLOLAR ===============================

-- Oyuncu = kullanıcının kimliği / kartı. Hesabı olmayan oyuncular da olabilir (user_id boş).
create table public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null check (char_length(name) between 1 and 60),
  number int not null default 0 check (number between 0 and 99),
  foot text not null default 'Sağ' check (foot in ('Sağ', 'Sol', 'İki')),
  size text check (size in ('S', 'M', 'L', 'XL', 'XXL')),
  position text not null default 'OS' check (position in ('KL', 'SAV', 'OS', 'ATK')),
  position2 text check (position2 in ('KL', 'SAV', 'OS', 'ATK')),
  legacy_rating boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 60),
  invite_code text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  is_admin boolean not null default false,
  joined_at timestamptz not null default now(),
  primary key (group_id, player_id)
);

-- Takımlar (isim, renk, diziliş, slotlar, elle konumlar) ve goller JSON olarak tutulur.
create table public.matches (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  date date not null,
  time text not null,
  venue text not null default '',
  players_per_side int not null check (players_per_side between 3 and 11),
  status text not null default 'planned' check (status in ('planned', 'finished')),
  team_a jsonb not null,
  team_b jsonb not null,
  goals jsonb not null default '[]'::jsonb,
  voting_closed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.attendance (
  match_id uuid not null references public.matches (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  status text not null check (status in ('yes', 'no')),
  primary key (match_id, player_id)
);

-- Maç sonu kapalı oylar: her oyuncuya 5 özellik (1-10). Maç puanı = ortalama.
create table public.votes (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.matches (id) on delete cascade,
  voter_id uuid not null references public.players (id) on delete cascade,
  target_id uuid not null references public.players (id) on delete cascade,
  hucum smallint not null check (hucum between 1 and 10),
  teknik smallint not null check (teknik between 1 and 10),
  pas smallint not null check (pas between 1 and 10),
  savunma smallint not null check (savunma between 1 and 10),
  fizik smallint not null check (fizik between 1 and 10),
  created_at timestamptz not null default now(),
  unique (match_id, voter_id, target_id),
  check (voter_id <> target_id)
);

-- İlk değerlendirme (ana rating). Puanlar boşsa "Henüz izlemedim, sonra" demektir.
create table public.base_votes (
  voter_id uuid not null references public.players (id) on delete cascade,
  target_id uuid not null references public.players (id) on delete cascade,
  hucum smallint check (hucum between 1 and 10),
  teknik smallint check (teknik between 1 and 10),
  pas smallint check (pas between 1 and 10),
  savunma smallint check (savunma between 1 and 10),
  fizik smallint check (fizik between 1 and 10),
  created_at timestamptz not null default now(),
  primary key (voter_id, target_id),
  check (voter_id <> target_id),
  check (
    (hucum is null and teknik is null and pas is null and savunma is null and fizik is null)
    or (hucum is not null and teknik is not null and pas is not null and savunma is not null and fizik is not null)
  )
);

create table public.opponent_ads (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.players (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  team_name text not null check (char_length(team_name) between 2 and 40),
  date date not null,
  time text not null,
  venue text not null,
  players_per_side int not null check (players_per_side between 3 and 11),
  level text not null check (level in ('amator', 'orta', 'iyi')),
  fee_split text not null check (fee_split in ('yari', 'kaybeden', 'biz')),
  phone text not null,
  note text check (char_length(note) <= 200),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now()
);

create index on public.group_members (player_id);
create index on public.matches (group_id, date);
create index on public.votes (match_id);
create index on public.votes (target_id);
create index on public.base_votes (target_id);
create index on public.opponent_ads (date) where status = 'open';

-- ======================= YARDIMCI FONKSİYONLAR =======================
-- security definer: RLS'ye takılmadan (döngüye girmeden) kontrol yapar.

create or replace function public.my_player_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from players where user_id = auth.uid()
$$;

create or replace function public.is_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and player_id = my_player_id())
$$;

create or replace function public.is_group_admin(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members where group_id = g and player_id = my_player_id() and is_admin)
$$;

create or replace function public.can_see_group(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups where id = g and is_public) or is_member(g)
$$;

-- Hesabı olmayan bir oyuncunun bulunduğu bir grubun yöneticisi miyim?
create or replace function public.admin_of_player(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members a join group_members b on a.group_id = b.group_id
    where a.player_id = my_player_id() and a.is_admin and b.player_id = pid
  )
$$;

create or replace function public.shares_group(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from group_members x join group_members y on x.group_id = y.group_id
    where x.player_id = a and y.player_id = b
  )
$$;

-- Maçta oynayanlar: iki takımın slotlarındaki oyuncular
create or replace function public.match_participants(m public.matches) returns uuid[]
language sql immutable as $$
  select coalesce(array_agg(x::uuid), '{}')
  from (
    select jsonb_array_elements_text(m.team_a -> 'slots') as x
    union all
    select jsonb_array_elements_text(m.team_b -> 'slots')
  ) s
  where x is not null
$$;

-- Sonuçlar açık mı? Oylama kapatıldıysa ya da herkes herkese oy verdiyse.
create or replace function public.is_revealed(mid uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  m matches;
  p uuid[];
  n int;
begin
  select * into m from matches where id = mid;
  if not found or m.status <> 'finished' then return false; end if;
  if m.voting_closed then return true; end if;
  p := match_participants(m);
  n := cardinality(p);
  if n < 2 then return false; end if;
  return (
    select count(*) from votes v
    where v.match_id = mid and v.voter_id = any (p) and v.target_id = any (p)
  ) >= n * (n - 1);
end $$;

-- ====================== OKUMA FONKSİYONLARI (RPC) ====================
-- Oyların kendisi asla dönmez; sadece toplam ve ortalamalar.

-- Oylama durumu: kaç kişi oy verdi (kimin verdiği gösterilmez), ben verdim mi?
create or replace function public.voting_progress(mid uuid)
returns table (total int, done int, i_voted boolean)
language plpgsql stable security definer set search_path = public as $$
declare
  m matches;
  p uuid[];
  me uuid := my_player_id();
begin
  select * into m from matches where id = mid;
  if not found or not can_see_group(m.group_id) then return; end if;
  p := match_participants(m);
  return query
  select
    cardinality(p),
    (
      select count(*)::int from unnest(p) as t (voter)
      where (
        select count(*) from votes v
        where v.match_id = mid and v.voter_id = t.voter and v.target_id = any (p) and v.target_id <> t.voter
      ) >= cardinality(p) - 1
    ),
    exists (select 1 from votes v where v.match_id = mid and v.voter_id = me);
end $$;

-- Maç ratingleri (sadece sonuçlar açıldıysa)
create or replace function public.match_ratings(mid uuid)
returns table (player_id uuid, rating numeric, votes int)
language sql stable security definer set search_path = public as $$
  select v.target_id,
         round(avg((v.hucum + v.teknik + v.pas + v.savunma + v.fizik) / 5.0), 1),
         count(*)::int
  from votes v
  join matches m on m.id = v.match_id
  where v.match_id = mid and can_see_group(m.group_id) and is_revealed(mid)
  group by v.target_id
$$;

-- Oyuncunun sonuçları açılmış maçlardaki özellik ortalamaları (kartın dönem hesabı için)
create or replace function public.player_match_averages(pid uuid)
returns table (match_id uuid, match_date date, match_time text, votes int,
               hucum numeric, teknik numeric, pas numeric, savunma numeric, fizik numeric)
language sql stable security definer set search_path = public as $$
  select m.id, m.date, m.time, count(*)::int,
         avg(v.hucum), avg(v.teknik), avg(v.pas), avg(v.savunma), avg(v.fizik)
  from votes v
  join matches m on m.id = v.match_id
  where v.target_id = pid and is_revealed(m.id)
  group by m.id, m.date, m.time
  order by m.date, m.time
$$;

-- İlk değerlendirme özeti: kaç kişi değerlendirdi, kaç gerekiyor.
-- Ortalamalar sadece yeterli değerlendirme gelince döner (tek kişinin puanı belli olmasın).
create or replace function public.player_base(pid uuid)
returns table (vote_count int, required int,
               hucum numeric, teknik numeric, pas numeric, savunma numeric, fizik numeric)
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
         case when c.n >= r.req then (select avg(fizik) from b) end
  from c, r
$$;

-- Davet kodu sadece üyelere
create or replace function public.group_invite_code(g uuid) returns text
language sql stable security definer set search_path = public as $$
  select invite_code from groups where id = g and is_member(g)
$$;

-- ======================= İŞLEM FONKSİYONLARI (RPC) ===================

create or replace function public.create_group(p_name text, p_public boolean)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := my_player_id();
  gid uuid;
begin
  if me is null then raise exception 'Önce oyuncu profilini oluştur.'; end if;
  insert into groups (name, is_public) values (trim(p_name), p_public) returning id into gid;
  insert into group_members (group_id, player_id, is_admin) values (gid, me, true);
  return gid;
end $$;

create or replace function public.join_group(p_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  me uuid := my_player_id();
  gid uuid;
begin
  if me is null then raise exception 'Önce oyuncu profilini oluştur.'; end if;
  select id into gid from groups where invite_code = upper(regexp_replace(p_code, '\s', '', 'g'));
  if gid is null then raise exception 'Bu kodla bir grup bulunamadı.'; end if;
  insert into group_members (group_id, player_id) values (gid, me) on conflict do nothing;
  return gid;
end $$;

create or replace function public.regenerate_invite_code(g uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  code text;
begin
  if not is_group_admin(g) then raise exception 'Sadece yönetici yapabilir.'; end if;
  code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
  update groups set invite_code = code where id = g;
  return code;
end $$;

-- Yönetici, hesabı olmayan bir oyuncuyu gruba ekler
create or replace function public.add_guest_player(
  g uuid, p_name text, p_number int, p_foot text, p_size text, p_position text, p_position2 text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
begin
  if not is_group_admin(g) then raise exception 'Sadece yönetici oyuncu ekleyebilir.'; end if;
  insert into players (name, number, foot, size, position, position2)
  values (trim(p_name), coalesce(p_number, 0), coalesce(p_foot, 'Sağ'), p_size, coalesce(p_position, 'OS'), p_position2)
  returning id into pid;
  insert into group_members (group_id, player_id) values (g, pid);
  return pid;
end $$;

-- Kayıt olurken, grupta zaten var olan (hesabı olmayan) oyuncu profilini sahiplenmek
create or replace function public.claim_player(pid uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın.'; end if;
  if my_player_id() is not null then raise exception 'Zaten bir oyuncu profilin var.'; end if;
  update players set user_id = auth.uid() where id = pid and user_id is null;
  if not found then raise exception 'Bu profil başka bir hesaba bağlı.'; end if;
end $$;

-- Bitmiş maçı yeniden planlanmış yapar ve oylarını siler (sadece yönetici)
create or replace function public.reopen_match(mid uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  g uuid;
begin
  select group_id into g from matches where id = mid;
  if g is null or not is_group_admin(g) then raise exception 'Sadece yönetici yapabilir.'; end if;
  delete from votes where match_id = mid;
  update matches set status = 'planned', voting_closed = false where id = mid;
end $$;

-- ============================== YETKİLER =============================

alter table public.players enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.matches enable row level security;
alter table public.attendance enable row level security;
alter table public.votes enable row level security;
alter table public.base_votes enable row level security;
alter table public.opponent_ads enable row level security;

revoke all on all tables in schema public from anon, authenticated;

grant select on public.players, public.group_members, public.matches, public.attendance to anon, authenticated;
grant select (id, name, is_public, created_at) on public.groups to anon, authenticated;
grant select (id, owner_id, group_id, team_name, date, time, venue, players_per_side, level, fee_split, note, status, created_at)
  on public.opponent_ads to anon;

grant insert (id, user_id, name, number, foot, size, position, position2), delete on public.players to authenticated;
grant update (name, number, foot, size, position, position2) on public.players to authenticated;
grant update (name, is_public), delete on public.groups to authenticated;
grant update (is_admin), delete on public.group_members to authenticated;
grant insert, update, delete on public.matches to authenticated;
grant insert, update, delete on public.attendance to authenticated;
grant select, insert, update, delete on public.votes to authenticated;
grant select, insert, update, delete on public.base_votes to authenticated;
grant select, insert, update, delete on public.opponent_ads to authenticated;

-- ---- players ----
create policy "oyuncular herkese açık" on public.players
  for select to anon, authenticated using (true);
create policy "kendi profilini oluşturur" on public.players
  for insert to authenticated with check (user_id = auth.uid());
create policy "kendi profilini ya da yöneticisi olduğu hesapsız oyuncuyu düzenler" on public.players
  for update to authenticated
  using (user_id = auth.uid() or (user_id is null and admin_of_player(id)))
  with check (user_id = auth.uid() or (user_id is null and admin_of_player(id)));
create policy "yönetici hesapsız oyuncuyu siler" on public.players
  for delete to authenticated using (user_id is null and admin_of_player(id));

-- ---- groups ----
create policy "açık gruplar ve üyesi olunan gruplar" on public.groups
  for select to anon, authenticated using (is_public or is_member(id));
create policy "yönetici grubu düzenler" on public.groups
  for update to authenticated using (is_group_admin(id)) with check (is_group_admin(id));
create policy "yönetici grubu siler" on public.groups
  for delete to authenticated using (is_group_admin(id));

-- ---- group_members ----
create policy "görülebilen grubun üyeleri" on public.group_members
  for select to anon, authenticated using (can_see_group(group_id));
create policy "yönetici yetki verir" on public.group_members
  for update to authenticated using (is_group_admin(group_id)) with check (is_group_admin(group_id));
create policy "gruptan ayrılır ya da yönetici çıkarır" on public.group_members
  for delete to authenticated using (player_id = my_player_id() or is_group_admin(group_id));

-- ---- matches ----
create policy "görülebilen grubun maçları" on public.matches
  for select to anon, authenticated using (can_see_group(group_id));
create policy "yönetici maç oluşturur" on public.matches
  for insert to authenticated with check (is_group_admin(group_id));
create policy "yönetici maçı düzenler" on public.matches
  for update to authenticated using (is_group_admin(group_id)) with check (is_group_admin(group_id));
create policy "yönetici maçı siler" on public.matches
  for delete to authenticated using (is_group_admin(group_id));

-- ---- attendance ----
create policy "görülebilen maçın katılımı" on public.attendance
  for select to anon, authenticated
  using (exists (select 1 from matches m where m.id = attendance.match_id and can_see_group(m.group_id)));
create policy "üye kendi katılımını yazar" on public.attendance
  for insert to authenticated
  with check (player_id = my_player_id() and exists (
    select 1 from matches m where m.id = attendance.match_id and m.status = 'planned' and is_member(m.group_id)));
create policy "üye kendi katılımını değiştirir" on public.attendance
  for update to authenticated
  using (player_id = my_player_id())
  with check (player_id = my_player_id() and exists (
    select 1 from matches m where m.id = attendance.match_id and m.status = 'planned' and is_member(m.group_id)));
create policy "üye kendi katılımını siler" on public.attendance
  for delete to authenticated using (player_id = my_player_id());

-- ---- votes: herkes SADECE kendi verdiği oyu görür ----
create policy "sadece kendi oyum" on public.votes
  for select to authenticated using (voter_id = my_player_id());
create policy "maçta oynayan, oylama açıkken oy verir" on public.votes
  for insert to authenticated
  with check (
    voter_id = my_player_id() and exists (
      select 1 from matches m
      where m.id = votes.match_id and m.status = 'finished' and not is_revealed(m.id)
        and votes.voter_id = any (match_participants(m)) and votes.target_id = any (match_participants(m))
    )
  );
create policy "oylama açıkken oyunu değiştirir" on public.votes
  for update to authenticated
  using (voter_id = my_player_id() and not is_revealed(match_id))
  with check (
    voter_id = my_player_id() and exists (
      select 1 from matches m
      where m.id = votes.match_id and m.status = 'finished'
        and votes.voter_id = any (match_participants(m)) and votes.target_id = any (match_participants(m))
    )
  );
create policy "oylama açıkken oyunu siler" on public.votes
  for delete to authenticated using (voter_id = my_player_id() and not is_revealed(match_id));

-- ---- base_votes: herkes SADECE kendi değerlendirmesini görür ----
create policy "sadece kendi değerlendirmem" on public.base_votes
  for select to authenticated using (voter_id = my_player_id());
create policy "grup arkadaşını değerlendirir" on public.base_votes
  for insert to authenticated with check (voter_id = my_player_id() and shares_group(voter_id, target_id));
create policy "değerlendirmesini değiştirir" on public.base_votes
  for update to authenticated
  using (voter_id = my_player_id())
  with check (voter_id = my_player_id() and shares_group(voter_id, target_id));
create policy "değerlendirmesini siler" on public.base_votes
  for delete to authenticated using (voter_id = my_player_id());

-- ---- opponent_ads (telefon sütunu giriş yapmayanlara kapalı, yukarıdaki grant'e bakın) ----
create policy "ilanlar herkese açık" on public.opponent_ads
  for select to anon, authenticated using (true);
create policy "kendi ilanını verir" on public.opponent_ads
  for insert to authenticated with check (owner_id = my_player_id());
create policy "kendi ilanını düzenler" on public.opponent_ads
  for update to authenticated using (owner_id = my_player_id()) with check (owner_id = my_player_id());
create policy "kendi ilanını siler" on public.opponent_ads
  for delete to authenticated using (owner_id = my_player_id());
