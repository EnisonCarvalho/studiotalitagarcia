create extension if not exists btree_gist;

-- Roles
create type public.app_role as enum ('admin', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.grant_owner_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if lower(new.email) = 'talitaewelin02@gmail.com' then
    insert into public.user_roles(user_id, role) values (new.id, 'admin') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created_grant_admin after insert on auth.users
for each row execute function public.grant_owner_admin();

-- Services
create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  category text not null check (length(trim(category)) between 1 and 80),
  description text,
  price_cents integer not null check (price_cents > 0),
  duration_min integer not null check (duration_min between 1 and 120),
  allows_addons boolean not null default false,
  active boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.services to anon, authenticated;
grant insert, update, delete on public.services to authenticated;
grant all on public.services to service_role;
alter table public.services enable row level security;
create policy "public reads active services" on public.services for select to anon, authenticated using (active or public.has_role(auth.uid(), 'admin'));
create policy "admin writes services" on public.services for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.addons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 120),
  price_cents integer not null check (price_cents > 0),
  duration_min integer not null check (duration_min between 1 and 120),
  range_note text,
  active boolean not null default true,
  sort integer not null default 0
);
grant select on public.addons to anon, authenticated;
grant insert, update, delete on public.addons to authenticated;
grant all on public.addons to service_role;
alter table public.addons enable row level security;
create policy "public reads active addons" on public.addons for select to anon, authenticated using (active or public.has_role(auth.uid(), 'admin'));
create policy "admin writes addons" on public.addons for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Settings (single row)
create table public.settings (
  id integer primary key default 1 check (id = 1),
  deposit_percent integer not null default 50 check (deposit_percent between 1 and 100),
  buffer_min integer not null default 0 check (buffer_min between 0 and 120),
  hold_minutes integer not null default 15 check (hold_minutes between 5 and 60),
  slot_step_min integer not null default 30 check (slot_step_min between 5 and 120)
);
grant select on public.settings to anon, authenticated;
grant update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "public reads settings" on public.settings for select to anon, authenticated using (true);
create policy "admin updates settings" on public.settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.settings default values;

-- Business hours (weekday 0 = domingo)
create table public.business_hours (
  weekday integer primary key check (weekday between 0 and 6),
  closed boolean not null default false,
  open_time time not null default '08:00',
  close_time time not null default '20:00',
  break_start time,
  break_end time,
  check (close_time > open_time),
  check ((break_start is null and break_end is null) or (break_start is not null and break_end is not null and break_end > break_start))
);
grant select on public.business_hours to anon, authenticated;
grant insert, update, delete on public.business_hours to authenticated;
grant all on public.business_hours to service_role;
alter table public.business_hours enable row level security;
create policy "public reads hours" on public.business_hours for select to anon, authenticated using (true);
create policy "admin writes hours" on public.business_hours for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
insert into public.business_hours(weekday, open_time, close_time) values
 (0,'08:00','20:00'),(1,'08:00','21:00'),(2,'08:00','21:00'),(3,'08:00','21:00'),(4,'08:00','21:00'),(5,'08:00','21:00'),(6,'08:00','20:00');

-- Date exceptions (special hours or closed day)
create table public.calendar_exceptions (
  day date primary key,
  closed boolean not null default true,
  open_time time,
  close_time time,
  note text,
  check (closed or (open_time is not null and close_time is not null and close_time > open_time))
);
grant select, insert, update, delete on public.calendar_exceptions to authenticated;
grant all on public.calendar_exceptions to service_role;
alter table public.calendar_exceptions enable row level security;
create policy "admin manages exceptions" on public.calendar_exceptions for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Manual blocks / vacations
create table public.calendar_blocks (
  id uuid primary key default gen_random_uuid(),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
grant select, insert, update, delete on public.calendar_blocks to authenticated;
grant all on public.calendar_blocks to service_role;
alter table public.calendar_blocks enable row level security;
create policy "admin manages blocks" on public.calendar_blocks for all to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Bookings
create type public.booking_status as enum ('pending', 'confirmed', 'cancelled', 'expired');
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  service_id uuid references public.services(id),
  service_name text not null,
  addons jsonb not null default '[]',
  customer_name text not null,
  customer_phone text not null,
  customer_email text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  block_end timestamptz not null,
  duration_min integer not null check (duration_min between 1 and 120),
  total_cents integer not null check (total_cents > 0),
  deposit_cents integer not null check (deposit_cents > 0),
  balance_cents integer not null check (balance_cents >= 0),
  status booking_status not null default 'pending',
  hold_expires_at timestamptz,
  payment_status text not null default 'awaiting',
  mp_payment_id text unique,
  pix_qr_code text,
  pix_qr_base64 text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  period tstzrange generated always as (tstzrange(starts_at, block_end, '[)')) stored,
  check (deposit_cents + balance_cents = total_cents),
  check (ends_at > starts_at and block_end >= ends_at),
  constraint bookings_no_overlap exclude using gist (period with &&) where (status in ('pending', 'confirmed'))
);
grant select, update on public.bookings to authenticated;
grant all on public.bookings to service_role;
alter table public.bookings enable row level security;
create policy "admin reads bookings" on public.bookings for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "admin updates bookings" on public.bookings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create table public.booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  kind text not null,
  data jsonb,
  created_at timestamptz not null default now()
);
grant select on public.booking_events to authenticated;
grant all on public.booking_events to service_role;
alter table public.booking_events enable row level security;
create policy "admin reads events" on public.booking_events for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Blocks must not silently conflict with active bookings
create or replace function public.check_block_conflict()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.bookings b
             where (b.status = 'confirmed' or (b.status = 'pending' and b.hold_expires_at > now()))
               and b.period && tstzrange(new.starts_at, new.ends_at, '[)')) then
    raise exception 'block_conflicts_booking' using hint = 'Existe agendamento nesse período. Cancele-o antes de bloquear.';
  end if;
  return new;
end $$;
create trigger calendar_blocks_conflict before insert or update on public.calendar_blocks
for each row execute function public.check_block_conflict();

-- Quote: duration/price for service + addons
create or replace function public.booking_quote(_service_id uuid, _addon_ids uuid[])
returns table(service_name text, addons jsonb, duration_min integer, total_cents integer, deposit_cents integer, balance_cents integer)
language plpgsql stable security definer set search_path = public as $$
declare s public.services; a_dur int := 0; a_price int := 0; a_json jsonb := '[]'; pct int; n int;
begin
  select * into s from public.services where id = _service_id and active;
  if not found then raise exception 'service_unavailable'; end if;
  _addon_ids := coalesce(_addon_ids, '{}');
  if array_length(_addon_ids, 1) > 0 then
    if not s.allows_addons then raise exception 'addons_not_allowed'; end if;
    select count(*), coalesce(sum(duration_min),0), coalesce(sum(price_cents),0),
           coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'price_cents', price_cents, 'duration_min', duration_min) order by sort), '[]')
      into n, a_dur, a_price, a_json
      from public.addons where id = any(_addon_ids) and active;
    if n <> (select count(distinct x) from unnest(_addon_ids) x) then raise exception 'addon_unavailable'; end if;
  end if;
  if s.duration_min + a_dur > 120 then raise exception 'duration_over_limit'; end if;
  select deposit_percent into pct from public.settings where id = 1;
  service_name := s.name; addons := a_json; duration_min := s.duration_min + a_dur;
  total_cents := s.price_cents + a_price;
  deposit_cents := round(total_cents * pct / 100.0)::int;
  balance_cents := total_cents - deposit_cents;
  return next;
end $$;

-- Available start times (Fortaleza local) for a date
create or replace function public.available_slots(_service_id uuid, _addon_ids uuid[], _day date)
returns setof timestamptz
language plpgsql stable security definer set search_path = public as $$
declare q record; st public.settings; bh public.business_hours; ex public.calendar_exceptions;
  o time; c time; bs time; be time; t timestamptz; day_start timestamptz; day_end timestamptz; dur interval; buf interval;
begin
  select * into q from public.booking_quote(_service_id, _addon_ids);
  select * into st from public.settings where id = 1;
  dur := make_interval(mins => q.duration_min); buf := make_interval(mins => st.buffer_min);
  select * into ex from public.calendar_exceptions where day = _day;
  if found then
    if ex.closed then return; end if;
    o := ex.open_time; c := ex.close_time; bs := null; be := null;
  else
    select * into bh from public.business_hours where weekday = extract(dow from _day)::int;
    if not found or bh.closed then return; end if;
    o := bh.open_time; c := bh.close_time; bs := bh.break_start; be := bh.break_end;
  end if;
  day_start := (_day + o) at time zone 'America/Fortaleza';
  day_end := (_day + c) at time zone 'America/Fortaleza';
  t := day_start;
  while t + dur <= day_end loop
    if t > now()
       and (bs is null or not tstzrange(t, t + dur, '[)') && tstzrange((_day + bs) at time zone 'America/Fortaleza', (_day + be) at time zone 'America/Fortaleza', '[)'))
       and not exists (select 1 from public.calendar_blocks k where tstzrange(k.starts_at, k.ends_at, '[)') && tstzrange(t, t + dur, '[)'))
       and not exists (select 1 from public.bookings b
                       where (b.status = 'confirmed' or (b.status = 'pending' and b.hold_expires_at > now()))
                         and b.period && tstzrange(t, t + dur + buf, '[)'))
    then
      return next t;
    end if;
    t := t + make_interval(mins => st.slot_step_min);
  end loop;
end $$;

-- Create a temporary hold (pending booking), fully validated server-side
create or replace function public.create_booking(_service_id uuid, _addon_ids uuid[], _starts_at timestamptz, _name text, _phone text, _email text)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare q record; st public.settings; new_id uuid; local_day date; digits text;
begin
  _name := trim(coalesce(_name, '')); _email := lower(trim(coalesce(_email, '')));
  digits := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
  if length(_name) < 2 or length(_name) > 100 then raise exception 'invalid_name'; end if;
  if length(digits) < 10 or length(digits) > 13 then raise exception 'invalid_phone'; end if;
  if _email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(_email) > 255 then raise exception 'invalid_email'; end if;

  select * into q from public.booking_quote(_service_id, _addon_ids);
  select * into st from public.settings where id = 1;

  update public.bookings set status = 'expired', payment_status = 'expired'
   where status = 'pending' and hold_expires_at <= now();

  local_day := (_starts_at at time zone 'America/Fortaleza')::date;
  if not exists (select 1 from public.available_slots(_service_id, _addon_ids, local_day) s where s = _starts_at) then
    raise exception 'slot_unavailable';
  end if;

  begin
    insert into public.bookings(service_id, service_name, addons, customer_name, customer_phone, customer_email,
      starts_at, ends_at, block_end, duration_min, total_cents, deposit_cents, balance_cents, hold_expires_at)
    values (_service_id, q.service_name, q.addons, _name, digits, _email,
      _starts_at, _starts_at + make_interval(mins => q.duration_min),
      _starts_at + make_interval(mins => q.duration_min + st.buffer_min),
      q.duration_min, q.total_cents, q.deposit_cents, q.balance_cents, now() + make_interval(mins => st.hold_minutes))
    returning id into new_id;
  exception when exclusion_violation then
    raise exception 'slot_unavailable';
  end;
  insert into public.booking_events(booking_id, kind) values (new_id, 'hold_created');
  return new_id;
end $$;

-- Public, minimal view of a booking by its unguessable id
create or replace function public.get_booking_public(_id uuid)
returns table(id uuid, service_name text, addons jsonb, customer_name text, starts_at timestamptz, duration_min int,
  total_cents int, deposit_cents int, balance_cents int, status booking_status, payment_status text,
  hold_expires_at timestamptz, pix_qr_code text, pix_qr_base64 text, has_payment boolean)
language sql stable security definer set search_path = public as $$
  select b.id, b.service_name, b.addons, split_part(b.customer_name, ' ', 1), b.starts_at, b.duration_min,
    b.total_cents, b.deposit_cents, b.balance_cents,
    case when b.status = 'pending' and b.hold_expires_at <= now() then 'expired'::booking_status else b.status end,
    b.payment_status, b.hold_expires_at, b.pix_qr_code, b.pix_qr_base64, b.mp_payment_id is not null
  from public.bookings b where b.id = _id
$$;

-- Apply a payment status verified with the provider API (service role only)
create or replace function public.apply_payment_status(_booking_id uuid, _payment_id text, _mp_status text)
returns booking_status
language plpgsql volatile security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = _booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if b.mp_payment_id is not null and b.mp_payment_id <> _payment_id then raise exception 'payment_mismatch'; end if;
  if b.status = 'confirmed' then return b.status; end if;
  if _mp_status = 'approved' then
    begin
      update public.bookings set status = 'confirmed', payment_status = 'approved', paid_at = now(), hold_expires_at = null
       where id = _booking_id;
    exception when exclusion_violation then
      update public.bookings set payment_status = 'approved_conflict' where id = _booking_id;
      insert into public.booking_events(booking_id, kind, data) values (_booking_id, 'approved_after_conflict', jsonb_build_object('payment_id', _payment_id));
      return b.status;
    end;
    insert into public.booking_events(booking_id, kind, data) values (_booking_id, 'payment_approved', jsonb_build_object('payment_id', _payment_id));
    return 'confirmed';
  elsif _mp_status in ('rejected', 'cancelled', 'refunded', 'charged_back') then
    update public.bookings set status = case when status = 'pending' then 'cancelled'::booking_status else status end,
      payment_status = _mp_status where id = _booking_id;
    insert into public.booking_events(booking_id, kind, data) values (_booking_id, 'payment_' || _mp_status, jsonb_build_object('payment_id', _payment_id));
    return (select status from public.bookings where id = _booking_id);
  else
    update public.bookings set payment_status = _mp_status where id = _booking_id;
    return b.status;
  end if;
end $$;

revoke all on function public.apply_payment_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.apply_payment_status(uuid, text, text) to service_role;
grant execute on function public.booking_quote(uuid, uuid[]) to anon, authenticated;
grant execute on function public.available_slots(uuid, uuid[], date) to anon, authenticated;
grant execute on function public.create_booking(uuid, uuid[], timestamptz, text, text, text) to anon, authenticated;
grant execute on function public.get_booking_public(uuid) to anon, authenticated;

-- Seed catalog (exact names/prices/durations from the owner)
insert into public.services(name, category, price_cents, duration_min, allows_addons, sort) values
('Design simples','Sobrancelhas',2499,30,false,10),
('Design + Henna','Sobrancelhas',3499,40,false,11),
('Brow Lamination','Sobrancelhas',6999,60,false,12),
('Volume Brasileiro','Cílios — aplicação',8999,120,false,20),
('Volume Egípcio','Cílios — aplicação',9999,120,false,21),
('Manutenção Brasileiro','Cílios — manutenção e remoção',5999,90,false,30),
('Manutenção Egípcio','Cílios — manutenção e remoção',6999,120,false,31),
('Remoção de cílios','Cílios — manutenção e remoção',1999,30,false,32),
('Manicure simples MÃOS','Unhas, mãos e pés',2499,45,true,40),
('Pedicure simples PÉS','Unhas, mãos e pés',2999,50,true,41),
('Mão + pé','Unhas, mãos e pés',4999,90,true,42),
('Postiça Realista simples','Unhas artificiais',4499,60,true,50),
('Postiça Realista + esmaltação em gel','Unhas artificiais',5499,75,true,51),
('Alongamento em Gel','Unhas artificiais',9999,120,true,52),
('Manutenção do Alongamento','Unhas artificiais',7499,120,true,53),
('Remoção do Alongamento','Unhas artificiais',2999,45,false,54),
('Esmaltação em Gel','Unhas em gel',4999,60,true,60),
('Blindagem + esmaltação em gel','Unhas em gel',6999,90,true,61),
('Manutenção da Blindagem','Unhas em gel',4999,60,true,62),
('Remoção de Gel / Blindagem','Unhas em gel',2499,30,false,63),
('Buço','Depilação',999,10,false,70),
('Axila','Depilação',2499,20,false,71),
('Meia perna','Depilação',2499,25,false,72),
('Perna inteira','Depilação',3999,40,false,73),
('Contorno simples','Depilação',2999,25,false,74),
('Contorno completo','Depilação',5999,45,false,75),
('Braços','Depilação',2499,25,false,76),
('Rosto','Depilação',2999,30,false,77);

insert into public.addons(name, price_cents, duration_min, range_note, sort) values
('Decoração simples',499,10,null,1),
('Francesinha',999,15,null,2),
('Decoração elaborada',999,15,'Faixa: R$ 9,99 a R$ 19,99 · 15 a 30 min',3),
('Decoração em todas as unhas',1499,20,'Faixa: R$ 14,99 a R$ 19,99 · 20 a 30 min',4);