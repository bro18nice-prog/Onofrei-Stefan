-- Medicenter Clinic: baza de date pentru programări (Supabase / PostgreSQL).
--
-- Se rulează în Supabase → SQL Editor → New query → se lipește tot fișierul → Run.
-- Fișierul poate fi rulat de mai multe ori: la o bază existentă doar adaugă ce lipsește.
-- La prima instalare, înlocuiește la final EMAIL_ADMINISTRATOR cu emailul administratorului clinicii.
--
-- Cine ce poate face:
--   * pacienții (fără cont) văd doar câte locuri sunt ocupate pe fiecare oră, fără nume,
--     trimit cereri de programare prin book() și își văd starea cererii doar cu linkul primit;
--   * personalul (emailuri trecute în tabelul staff, cu email confirmat) vede, confirmă, mută și anulează;
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

-- Cereri cu confirmare, copii, disponibilitatea pacientului, evaluare obligatorie.
alter table public.bookings add column if not exists status text not null default 'confirmed';
alter table public.bookings add column if not exists token uuid not null default gen_random_uuid();
alter table public.bookings add column if not exists child_name text not null default '';
alter table public.bookings add column if not exists child_age smallint;
alter table public.bookings add column if not exists availability text not null default '';
alter table public.bookings add column if not exists eval_declared boolean not null default false;
alter table public.bookings add column if not exists new_patient boolean not null default false;
alter table public.bookings add column if not exists staff_note text not null default '';
alter table public.bookings add column if not exists updated_at timestamptz not null default now();

do $$
begin
  alter table public.bookings add constraint bookings_status_check
    check (status in ('pending', 'confirmed', 'rejected', 'cancelled'));
exception when duplicate_object then null;
end $$;
do $$
begin
  alter table public.bookings add constraint bookings_extra_check check (
    char_length(child_name) <= 120 and (child_age is null or child_age between 0 and 17)
    and char_length(availability) <= 300 and char_length(staff_note) <= 500);
exception when duplicate_object then null;
end $$;

create index if not exists bookings_date_cat on public.bookings (date, cat);
create index if not exists bookings_date_service on public.bookings (date, service_id);
create unique index if not exists bookings_token on public.bookings (token);
create index if not exists bookings_phone on public.bookings (phone);

-- Terapeutul care lucrează cu pacientul (ales din agendă).
alter table public.bookings add column if not exists therapist text not null default '';
do $$
begin
  alter table public.bookings add constraint bookings_therapist_check check (char_length(therapist) <= 80);
exception when duplicate_object then null;
end $$;

-- Locuri setate manual din agendă pentru o anumită zi și oră (pe secție sau '*' = toată clinica).
-- Fără nume sau date personale: le citesc și pacienții, ca să vadă doar orele cu locuri.
create table if not exists public.slot_caps (
  date date not null,
  hour smallint not null check (hour between 0 and 23),
  cat text not null check (cat in ('kineto', 'masaj', 'fizio', 'neuro', '*')),
  cap smallint not null check (cap between 0 and 50),
  updated_at timestamptz not null default now(),
  primary key (date, hour, cat)
);

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

-- Versiunea veche (locuri pe secție) se înlocuiește cu locuri pe fiecare terapie.
drop function if exists private.check_capacity(text, date, int, int, uuid);

-- Locurile se numără pe terapie: settings.serviceCapacity[terapie], altfel settings.capacity[secție].
-- Cererile în așteptare țin locul ocupat, ca să nu se suprapună programări.
create or replace function private.check_capacity(p_service text, p_cat text, p_date date, p_hour int, p_hours int, p_exclude uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  s jsonb;
  cap int;
  c int;
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
  cap := coalesce((s -> 'serviceCapacity' ->> p_service)::int, (s -> 'capacity' ->> p_cat)::int, 1);
  -- programările din aceeași zi se verifică una după alta, ca să nu se depășească locurile
  perform pg_advisory_xact_lock(hashtext('medicenter:' || p_date::text));
  for k in 0 .. p_hours - 1 loop
    select count(*) into n
    from public.bookings b
    where b.service_id = p_service and b.date = p_date
      and b.status in ('pending', 'confirmed')
      and (p_exclude is null or b.id <> p_exclude)
      and p_hour + k >= b.hour and p_hour + k < b.hour + b.hours;
    if n >= cap then
      raise exception 'FULL';
    end if;
    -- locuri setate manual din agendă pentru ora respectivă: pe secție și/sau pe toată clinica ('*')
    select sc.cap into c from public.slot_caps sc where sc.date = p_date and sc.hour = p_hour + k and sc.cat = p_cat;
    if found then
      select count(*) into n from public.bookings b
      where b.cat = p_cat and b.date = p_date and b.status in ('pending', 'confirmed')
        and (p_exclude is null or b.id <> p_exclude)
        and p_hour + k >= b.hour and p_hour + k < b.hour + b.hours;
      if n >= c then raise exception 'FULL'; end if;
    end if;
    select sc.cap into c from public.slot_caps sc where sc.date = p_date and sc.hour = p_hour + k and sc.cat = '*';
    if found then
      select count(*) into n from public.bookings b
      where b.date = p_date and b.status in ('pending', 'confirmed')
        and (p_exclude is null or b.id <> p_exclude)
        and p_hour + k >= b.hour and p_hour + k < b.hour + b.hours;
      if n >= c then raise exception 'FULL'; end if;
    end if;
  end loop;
end $$;
revoke all on function private.check_capacity(text, text, date, int, int, uuid) from public, anon, authenticated;

-- ---------- funcții folosite de site ----------

-- Ocuparea orelor (fără nume sau telefoane), pentru calendarul pacienților.
drop function if exists public.get_availability(date, date);
create or replace function public.get_availability(p_from date, p_to date)
returns table (service_id text, cat text, date date, hour smallint, hours smallint)
language sql stable security definer set search_path = public as $$
  select b.service_id, b.cat, b.date, b.hour, b.hours
  from public.bookings b
  where b.date between p_from and least(p_to, p_from + 400)
    and b.status in ('pending', 'confirmed')
$$;

-- Programare nouă: cerere de pe site (pacient, „în așteptare”) sau din agendă (personal, „confirmată”).
-- Întoarce { id, token, status }; pacientul primește linkul de status cu token-ul.
drop function if exists public.book(text, text, date, int, int, text, text, text, text);
drop function if exists public.book(text, text, date, int, int, text, text, text, text, text, int, text, boolean);
create or replace function public.book(
  p_service_id text, p_cat text, p_date date, p_hour int, p_hours int,
  p_name text, p_phone text, p_note text default '', p_source text default 'online',
  p_child_name text default '', p_child_age int default null, p_availability text default '',
  p_eval_declared boolean default false, p_new_patient boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  staff boolean := private.is_staff();
  s jsonb;
  local_now timestamp := now() at time zone 'Europe/Bucharest';
  digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  r public.bookings;
begin
  -- serviciul trebuie să aparțină secției (k = kineto, m = masaj, f = fizio, n = neuro)
  if left(p_service_id, 1) <> left(p_cat, 1) or p_hours not between 1 and 2 then
    raise exception 'BAD_SERVICE';
  end if;
  select data into s from public.settings where id = 1;
  if not staff then
    if digits !~ '^(\+40|0040|0)[237][0-9]{8}$' then
      raise exception 'BAD_PHONE';
    end if;
    if char_length(trim(p_name)) < 3 or char_length(coalesce(p_note, '')) > 500
       or char_length(coalesce(p_child_name, '')) > 120 or char_length(coalesce(p_availability, '')) > 300
       or (p_child_age is not null and p_child_age not between 0 and 17) then
      raise exception 'BAD_INPUT';
    end if;
    -- terapiile marcate cer evaluarea făcută înainte la clinică
    -- pacienții noi / fără trimitere pot cere doar evaluările și consultațiile marcate
    if coalesce(p_new_patient, false) then
      if not (coalesce(s -> 'newPatient', '[]'::jsonb) ? p_service_id) then
        raise exception 'NEW_PATIENT_ONLY';
      end if;
    elsif coalesce(s -> 'evalRequired', '{}'::jsonb) ? p_service_id and not coalesce(p_eval_declared, false) then
      raise exception 'EVAL_REQUIRED';
    end if;
    if p_date < local_now::date or (p_date = local_now::date and p_hour <= extract(hour from local_now)) then
      raise exception 'PAST';
    end if;
    if p_date > local_now::date + (s ->> 'maxDaysAhead')::int then
      raise exception 'TOO_FAR';
    end if;
    if (select count(*) from public.bookings
        where phone = trim(p_phone) and date >= local_now::date and status in ('pending', 'confirmed')) >= 5 then
      raise exception 'LIMIT';
    end if;
    -- protecție împotriva umplerii agendei cu programări false
    if (select count(*) from public.bookings where source = 'online' and created_at > now() - interval '10 minutes') >= 20 then
      raise exception 'BUSY';
    end if;
  end if;
  perform private.check_capacity(p_service_id, p_cat, p_date, p_hour, p_hours, null);
  insert into public.bookings (service_id, cat, date, hour, hours, name, phone, note, source, created_by,
                               status, child_name, child_age, availability, eval_declared, new_patient)
  values (p_service_id, p_cat, p_date, p_hour, p_hours, trim(p_name), trim(p_phone), coalesce(trim(p_note), ''),
          case when staff then coalesce(p_source, 'clinica') else 'online' end, auth.uid(),
          case when staff then 'confirmed' else 'pending' end,
          coalesce(trim(p_child_name), ''), p_child_age, coalesce(trim(p_availability), ''), coalesce(p_eval_declared, false), coalesce(p_new_patient, false))
  returning * into r;
  return jsonb_build_object('id', r.id, 'token', r.token, 'status', r.status);
end $$;

-- Mutarea unei programări (doar personalul). Cu p_confirm = true, programarea devine și confirmată.
drop function if exists public.move_booking(uuid, date, int);
create or replace function public.move_booking(p_id uuid, p_date date, p_hour int, p_confirm boolean default false)
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
  perform private.check_capacity(b.service_id, b.cat, p_date, p_hour, b.hours, p_id);
  update public.bookings
     set date = p_date, hour = p_hour, updated_at = now(),
         status = case when p_confirm or b.status in ('rejected', 'cancelled') then 'confirmed' else b.status end
   where id = p_id;
end $$;

-- Confirmare, refuz sau anulare (doar personalul), cu un mesaj opțional pentru pacient.
create or replace function public.set_booking_status(p_id uuid, p_status text, p_note text default '')
returns void
language plpgsql security definer set search_path = public as $$
declare
  b public.bookings;
begin
  if not private.is_staff() then
    raise exception 'NOT_STAFF';
  end if;
  if p_status not in ('confirmed', 'rejected', 'cancelled') then
    raise exception 'BAD_INPUT';
  end if;
  select * into b from public.bookings where id = p_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  -- o programare refuzată sau anulată care redevine activă are nevoie de loc liber
  if p_status = 'confirmed' and b.status in ('rejected', 'cancelled') then
    perform private.check_capacity(b.service_id, b.cat, b.date, b.hour, b.hours, p_id);
  end if;
  update public.bookings
     set status = p_status, staff_note = left(coalesce(trim(p_note), ''), 500), updated_at = now()
   where id = p_id;
end $$;

-- Starea unei cereri, pentru pacientul care are linkul (fără alte date personale).
create or replace function public.get_booking_status(p_token uuid)
returns table (service_id text, date date, hour smallint, hours smallint, status text, staff_note text, child_name text)
language sql stable security definer set search_path = public as $$
  select b.service_id, b.date, b.hour, b.hours, b.status, b.staff_note, b.child_name
  from public.bookings b
  where b.token = p_token
$$;

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

alter table public.slot_caps enable row level security;
drop policy if exists "locuri vizibile" on public.slot_caps;
create policy "locuri vizibile" on public.slot_caps for select using (true);
drop policy if exists "locuri setate de personal" on public.slot_caps;
create policy "locuri setate de personal" on public.slot_caps for insert with check (private.is_staff());
drop policy if exists "locuri modificate de personal" on public.slot_caps;
create policy "locuri modificate de personal" on public.slot_caps for update using (private.is_staff()) with check (private.is_staff());
drop policy if exists "locuri sterse de personal" on public.slot_caps;
create policy "locuri sterse de personal" on public.slot_caps for delete using (private.is_staff());
grant select on public.slot_caps to anon, authenticated;
grant insert, update, delete on public.slot_caps to authenticated;

revoke all on function public.move_booking(uuid, date, int, boolean) from public, anon;
grant execute on function public.move_booking(uuid, date, int, boolean) to authenticated;
revoke all on function public.set_booking_status(uuid, text, text) from public, anon;
grant execute on function public.set_booking_status(uuid, text, text) to authenticated;
grant execute on function public.get_availability(date, date) to anon, authenticated;
grant execute on function public.get_booking_status(uuid) to anon, authenticated;
grant execute on function public.book(text, text, date, int, int, text, text, text, text, text, int, text, boolean, boolean) to anon, authenticated;
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
    "capacity": {"kineto": 7, "masaj": 7, "fizio": 7, "neuro": 7}}')
on conflict (id) do nothing;

-- Locuri pe terapie și terapiile cu evaluare obligatorie (valori inițiale, se schimbă din agendă → Setări).
-- Clinica a ales 7 locuri pe oră la fiecare terapie: medicul așază pacienții la confirmare.
-- Se completează doar ce lipsește, fără să suprascrie ce a setat clinica.
update public.settings set data = data
  || case when data ? 'serviceCapacity' then '{}'::jsonb else jsonb_build_object('serviceCapacity', (
       select jsonb_object_agg(id, 7) from unnest(array[
         'k01','k02','k03','k04','k05','k06','k07','k08','k09','k10','k11','k12','k13','k14','k15','k16',
         'm01','m02','m03','m04','m05','m06','m07','m08','m09','m10','m11','m12',
         'f01','f02','f03','f04','f05','f06','f07','f08','f09','f10',
         'n01','n02','n03','n04','n05','n06','n07','n08','n09','n10','n11','n12','n13','n14']) as id)) end
  || case when data ? 'evalRequired' then '{}'::jsonb else '{"evalRequired": {"k05": "k06", "k10": "k06"}}'::jsonb end
  || case when data ? 'newPatient' then '{}'::jsonb else '{"newPatient": ["k06", "n01", "n02", "n03"]}'::jsonb end
where id = 1;

-- Primul administrator. Ceilalți membri ai personalului se adaugă apoi din agendă → Setări → Personal.
insert into public.staff (email, name, role) values (lower('EMAIL_ADMINISTRATOR'), 'Administrator', 'admin')
on conflict (email) do nothing;

-- ---------- notificări pe telefon pentru cererile noi ----------
-- Telefoanele personalului se abonează din agendă (Cont și telefon → Activează notificările).
-- La fiecare cerere nouă de pe site, declanșatorul cheamă funcția supabase/functions/notify-booking,
-- care trimite notificarea (fără numele pacientului) pe toate telefoanele abonate.
-- Cheile de semnare (VAPID) stau în Vault: 'vapid_public' și 'vapid_private'. Se creează o singură dată, separat
-- (perechea publică e și în js/config.js → vapidPublicKey). Cheia privată nu se pune niciodată în acest fișier.

create extension if not exists pg_net with schema extensions;
alter table public.bookings add column if not exists notified_at timestamptz;
create table if not exists public.push_subscriptions (
  endpoint text primary key check (char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  email text not null default '',
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "abonare personal" on public.push_subscriptions;
create policy "abonare personal" on public.push_subscriptions for insert with check (private.is_staff());
drop policy if exists "abonare actualizata de personal" on public.push_subscriptions;
create policy "abonare actualizata de personal" on public.push_subscriptions for update using (private.is_staff()) with check (private.is_staff());
drop policy if exists "dezabonare personal" on public.push_subscriptions;
create policy "dezabonare personal" on public.push_subscriptions for delete using (private.is_staff());
grant insert, update, delete on public.push_subscriptions to authenticated;

create or replace function public.push_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'public', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public'),
    'private', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private'))
$$;
revoke all on function public.push_config() from public, anon, authenticated;
grant execute on function public.push_config() to service_role;

-- Cheia „anon” de mai jos e publică (aceeași ca în js/config.js); funcția verifică singură că cererea e nouă.
create or replace function private.notify_new_booking() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.source = 'online' and new.status = 'pending' then
    perform net.http_post(
      url := 'https://bywgiyyqwyrbvyfuqtcx.supabase.co/functions/v1/notify-booking',
      body := jsonb_build_object('id', new.id),
      headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ANON_KEY_DIN_CONFIG_JS')
    );
  end if;
  return new;
exception when others then
  return new; -- notificarea nu are voie să blocheze programarea
end $$;
create or replace trigger bookings_notify after insert on public.bookings for each row execute function private.notify_new_booking();
