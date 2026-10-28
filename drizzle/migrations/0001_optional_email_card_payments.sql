create or replace function public.create_booking(_service_id uuid, _addon_ids uuid[], _starts_at timestamptz, _name text, _phone text, _email text)
returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare q record; st public.settings; new_id uuid; local_day date; digits text;
begin
  _name := trim(coalesce(_name, '')); _email := lower(trim(coalesce(_email, '')));
  digits := regexp_replace(coalesce(_phone, ''), '\D', '', 'g');
  if length(_name) < 2 or length(_name) > 100 then raise exception 'invalid_name'; end if;
  if length(digits) < 10 or length(digits) > 13 then raise exception 'invalid_phone'; end if;
  if _email <> '' and (_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(_email) > 255) then raise exception 'invalid_email'; end if;

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

alter table public.bookings add column if not exists mp_checkout_url text;

-- Payment may arrive via Pix (direct) or Checkout (card); booking is matched by external_reference verified with the provider API.
create or replace function public.apply_payment_status(_booking_id uuid, _payment_id text, _mp_status text)
returns booking_status
language plpgsql volatile security definer set search_path = public as $$
declare b public.bookings;
begin
  select * into b from public.bookings where id = _booking_id for update;
  if not found then raise exception 'booking_not_found'; end if;
  if b.status = 'confirmed' then return b.status; end if;
  if _mp_status = 'approved' then
    begin
      update public.bookings set status = 'confirmed', payment_status = 'approved', paid_at = now(), hold_expires_at = null, mp_payment_id = _payment_id
       where id = _booking_id;
    exception when exclusion_violation then
      update public.bookings set payment_status = 'approved_conflict' where id = _booking_id;
      insert into public.booking_events(booking_id, kind, data) values (_booking_id, 'approved_after_conflict', jsonb_build_object('payment_id', _payment_id));
      return b.status;
    end;
    insert into public.booking_events(booking_id, kind, data) values (_booking_id, 'payment_approved', jsonb_build_object('payment_id', _payment_id));
    return 'confirmed';
  elsif _mp_status in ('rejected', 'cancelled', 'refunded', 'charged_back') then
    -- a failed card attempt should not kill the hold while other attempts are possible
    update public.bookings set payment_status = _mp_status where id = _booking_id;
    insert into public.booking_events(booking_id, kind, data) values (_booking_id, 'payment_' || _mp_status, jsonb_build_object('payment_id', _payment_id));
    return b.status;
  else
    update public.bookings set payment_status = _mp_status where id = _booking_id;
    return b.status;
  end if;
end $$;
revoke all on function public.apply_payment_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.apply_payment_status(uuid, text, text) to service_role;