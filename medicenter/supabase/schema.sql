-- Medicenter Clinic: baza de date pentru programări (Supabase / PostgreSQL).
--
-- Se rulează o singură dată: Supabase → SQL Editor → New query → se lipește tot fișierul → Run.
-- ÎNAINTE de rulare, înlocuiește la final EMAIL_ADMINISTRATOR cu emailul administratorului clinicii.
--
-- Cine ce poate face:
--   * pacienții (fără cont) văd doar câte locuri sunt ocupate pe fiecare oră, fără nume,
--     și pot face programări doar prin funcția book(), care verifică locurile libere;
--   * personalul (emailuri trecute în tabelul staff, cu email confirmat) vede și modifică programările;
--   * administratorii schimbă setările și lista personalului.

create extension if not exists pgcrypto;

-- ---------- tabele ----------

create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.staff (
  email text primary key check (email = lower(email)),
  name text not null default '',
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_id text not null check (char_length(service_id) <= 10),
  cat text not null check (cat in ('kineto', 'masaj', 'fizio', 'neuro')),
  date date not null,
  hour smallint not null check (hour between 0 and 23),
  hours smallint not null default 1 check (hours between 1 and 4),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (char_length(phone) <= 40),
  note text not null default '' check (char_length(note) <= 1000),
  source text not null default 'online' check (source in ('online', 'clinica')),
  created_at timestamptz not null default now(),
  created_by uuid
);
create index if not exists bookings_date_cat on public.bookings (date, cat);

-- ---------- cine este membru al personalului ----------

-- Funcțiile ajutătoare stau în schema „private”, care nu este expusă prin API.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- Membru al personalului = utilizator logat, cu email confirmat, trecut în tabelul staff.
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select s.role
  from public.staff s
  join auth.users u on lower(u.email) = s.email
  where u.id = auth.uid() and u.email_confirmed_at is not null
$$;

create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.my_role() is not null
$$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;
-- folosite de regulile de acces de mai jos, deci trebuie să poată fi apelate de orice vizitator
grant execute on function private.is_staff(), private.is_admin() to anon, authenticated;

-- ---------- verificarea locurilor libere ----------

create or replace function private.check_capacity(p_cat text, p_date date, p_hour int, p_hours int, p_exclude uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  cap int;
  n int;
  k int;
begin
  select data into s from public.settings where id = 1;
  if not ((s -> 'days') @> to_jsonb(extract(dow from p_date)::int)) then
    raise exception 'CLOSED_DAY';
  end if;
  if p_hour < (s ->> 'open')::int or p_hour + p_hours > (s ->> 'close')::int then
    raise exception 'OUT_OF_HOURS';
  end if;
  cap := coalesce((s -> 'capacity' ->> p_cat)::int, 1);
  -- două programări simultane pe aceeași secție și zi așteaptă una după alta, ca să nu se depășească locurile
  perform pg_advisory_xact_lock(hashtext(p_cat || p_date::text));
  for k in 0 .. p_hours - 1 loop
    select count(*) into n
    from public.bookings b
    where b.cat = p_cat and b.date = p_date
      and (p_exclude is null or b.id <> p_exclude)
      and p_hour + k >= b.hour and p_hour + k < b.hour + b.hours;
    if n >= cap then
      raise exception 'FULL';
    end if;
  end loop;
end $$;

-- ---------- funcții folosite de site ----------

-- Ocuparea orelor (fără nume sau telefoane), pentru calendarul pacienților.
create or replace function public.get_availability(p_from date, p_to date)
returns table (cat text, date date, hour smallint, hours smallint)
language sql stable security definer set search_path = public as $$
  select b.cat, b.date, b.hour, b.hours
  from public.bookings b
  where b.date between p_from and least(p_to, p_from + 400)
$$;

-- Programare nouă: de pe site (pacient) sau din agendă (personal).
create or replace function public.book(
  p_service_id text, p_cat text, p_date date, p_hour int, p_hours int,
  p_name text, p_phone text, p_note text default '', p_source text default 'online'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  staff boolean := private.is_staff();
  s jsonb;
  local_now timestamp := now() at time zone 'Europe/Bucharest';
  digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  new_id uuid;
begin
  -- serviciul trebuie să aparțină secției (k = kineto, m = masaj, f = fizio, n = neuro)
  if left(p_service_id, 1) <> left(p_cat, 1) or p_hours not between 1 and 2 then
    raise exception 'BAD_SERVICE';
  end if;
  if not staff then
    select data into s from public.settings where id = 1;
    if digits !~ '^(\+40|0040|0)[237][0-9]{8}$' then
      raise exception 'BAD_PHONE';
    end if;
    if char_length(trim(p_name)) < 3 or char_length(coalesce(p_note, '')) > 500 then
      raise exception 'BAD_INPUT';
    end if;
    if p_date < local_now::date or (p_date = local_now::date and p_hour <= extract(hour from local_now)) then
      raise exception 'PAST';
    end if;
    if p_date > local_now::date + (s ->> 'maxDaysAhead')::int then
      raise exception 'TOO_FAR';
    end if;
    if (select count(*) from public.bookings where phone = trim(p_phone) and date >= local_now::date) >= 5 then
      raise exception 'LIMIT';
    end if;
    -- protecție împotriva umplerii agendei cu programări false
    if (select count(*) from public.bookings where source = 'online' and created_at > now() - interval '10 minutes') >= 20 then
      raise exception 'BUSY';
    end if;
  end if;
  perform private.check_capacity(p_cat, p_date, p_hour, p_hours, null);
  insert into public.bookings (service_id, cat, date, hour, hours, name, phone, note, source, created_by)
  values (p_service_id, p_cat, p_date, p_hour, p_hours, trim(p_name), trim(p_phone), coalesce(trim(p_note), ''),
          case when staff then coalesce(p_source, 'clinica') else 'online' end, auth.uid())
  returning id into new_id;
  return new_id;
end $$;

-- Mutarea unei programări (doar personalul).
create or replace function public.move_booking(p_id uuid, p_date date, p_hour int)
returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
begin
  if not private.is_staff() then
    raise exception 'NOT_STAFF';
  end if;
  select * into b from public.bookings where id = p_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  perform private.check_capacity(b.cat, p_date, p_hour, b.hours, p_id);
  update public.bookings set date = p_date, hour = p_hour where id = p_id;
end $$;

-- ---------- reguli de acces (Row Level Security) ----------

alter table public.settings enable row level security;
alter table public.staff enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "setari vizibile" on public.settings;
create policy "setari vizibile" on public.settings for select using (true);
drop policy if exists "setari modificate de admin" on public.settings;
create policy "setari modificate de admin" on public.settings for update using (private.is_admin()) with check (private.is_admin());

drop policy if exists "personal vizibil personalului" on public.staff;
create policy "personal vizibil personalului" on public.staff for select using (private.is_staff());
drop policy if exists "personal adaugat de admin" on public.staff;
create policy "personal adaugat de admin" on public.staff for insert with check (private.is_admin());
drop policy if exists "personal modificat de admin" on public.staff;
create policy "personal modificat de admin" on public.staff for update using (private.is_admin()) with check (private.is_admin());
drop policy if exists "personal sters de admin" on public.staff;
create policy "personal sters de admin" on public.staff for delete using (private.is_admin());

drop policy if exists "programari vizibile personalului" on public.bookings;
create policy "programari vizibile personalului" on public.bookings for select using (private.is_staff());
drop policy if exists "programari modificate de personal" on public.bookings;
create policy "programari modificate de personal" on public.bookings for update using (private.is_staff()) with check (private.is_staff());
drop policy if exists "programari anulate de personal" on public.bookings;
create policy "programari anulate de personal" on public.bookings for delete using (private.is_staff());
-- Nu există regulă de insert: programările noi intră doar prin book(), care verifică locurile.

revoke all on function private.check_capacity(text, date, int, int, uuid) from public, anon, authenticated;
revoke all on function public.move_booking(uuid, date, int) from public, anon;
grant execute on function public.move_booking(uuid, date, int) to authenticated;
grant execute on function public.get_availability(date, date) to anon, authenticated;
grant execute on function public.book(text, text, date, int, int, text, text, text, text) to anon, authenticated;
grant execute on function public.my_role() to anon, authenticated;

-- ---------- păstrarea datelor (GDPR) ----------

-- Programările mai vechi de 24 de luni se șterg automat, în fiecare noapte la 03:17.
-- (Pe un Postgres fără pg_cron, blocul se sare.)
do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'medicenter-retentie';
  perform cron.schedule('medicenter-retentie', '17 3 * * *',
    $job$delete from public.bookings where date < current_date - interval '24 months'$job$);
exception when others then
  raise notice 'pg_cron indisponibil: %', sqlerrm;
end $$;

-- ---------- date inițiale ----------

insert into public.settings (id, data) values (1,
  '{"open": 9, "close": 20, "days": [1, 2, 3, 4, 5], "maxDaysAhead": 60,
    "capacity": {"kineto": 4, "masaj": 2, "fizio": 4, "neuro": 1}}')
on conflict (id) do nothing;

-- Primul administrator. Ceilalți membri ai personalului se adaugă apoi din agendă → Setări → Personal.
insert into public.staff (email, name, role) values (lower('EMAIL_ADMINISTRATOR'), 'Administrator', 'admin')
on conflict (email) do nothing;
