CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT EXISTS (SELECT 1 FROM public.user_roles r JOIN auth.users u ON u.id=r.user_id WHERE r.user_id=_user_id AND r.role=_role AND u.email_confirmed_at IS NOT NULL)
$$;
CREATE OR REPLACE FUNCTION public.grant_owner_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF new.id='d78894b3-f2fb-44bc-b9b0-03bba02f8bb0'::uuid AND new.email_confirmed_at IS NOT NULL THEN
 INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'admin') ON CONFLICT DO NOTHING;
 END IF;
 RETURN new;
END $$;
CREATE TRIGGER owner_admin_after_confirmation AFTER UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION public.grant_owner_admin();
REVOKE ALL ON FUNCTION public.grant_owner_admin() FROM PUBLIC, anon, authenticated;
CREATE TABLE public.admin_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_id uuid, entity text NOT NULL, record_id text, action text NOT NULL, changes jsonb, created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.admin_audit TO authenticated;
GRANT ALL ON public.admin_audit TO service_role;
ALTER TABLE public.admin_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins read audit" ON public.admin_audit FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
CREATE OR REPLACE FUNCTION public.audit_admin_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE payload jsonb;
BEGIN
 IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin') THEN
 payload := CASE WHEN TG_OP='DELETE' THEN to_jsonb(old) ELSE to_jsonb(new) END;
 INSERT INTO public.admin_audit(actor_id,entity,record_id,action,changes) VALUES(auth.uid(),TG_TABLE_NAME,coalesce(payload->>'id',payload->>'weekday',payload->>'day'),TG_OP,
 jsonb_build_object('before',CASE WHEN TG_OP='INSERT' THEN NULL ELSE to_jsonb(old)-'pix_qr_code'-'pix_qr_base64' END,'after',CASE WHEN TG_OP='DELETE' THEN NULL ELSE to_jsonb(new)-'pix_qr_code'-'pix_qr_base64' END));
 END IF;
 IF TG_OP='DELETE' THEN RETURN old; END IF; RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.audit_admin_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_bookings AFTER INSERT OR UPDATE OR DELETE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER audit_services AFTER INSERT OR UPDATE OR DELETE ON public.services FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER audit_addons AFTER INSERT OR UPDATE OR DELETE ON public.addons FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER audit_hours AFTER INSERT OR UPDATE OR DELETE ON public.business_hours FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER audit_blocks AFTER INSERT OR UPDATE OR DELETE ON public.calendar_blocks FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER audit_exceptions AFTER INSERT OR UPDATE OR DELETE ON public.calendar_exceptions FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE TRIGGER audit_settings AFTER UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.audit_admin_change();
CREATE OR REPLACE FUNCTION public.admin_create_booking(_service_id uuid,_addon_ids uuid[],_starts_at timestamptz,_name text,_phone text,_email text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE bid uuid;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 bid := public.create_booking(_service_id,_addon_ids,_starts_at,_name,_phone,_email);
 UPDATE public.bookings SET status='confirmed',hold_expires_at=NULL,payment_status='manual_unpaid' WHERE id=bid;
 INSERT INTO public.booking_events(booking_id,kind,data) VALUES(bid,'admin_manual_booking',jsonb_build_object('actor_id',auth.uid()));
 RETURN bid;
END $$;
REVOKE ALL ON FUNCTION public.admin_create_booking(uuid,uuid[],timestamptz,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_create_booking(uuid,uuid[],timestamptz,text,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_reschedule_booking(_id uuid,_starts_at timestamptz,_name text,_phone text,_email text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE b public.bookings; st public.settings; bh public.business_hours; ex public.calendar_exceptions; d date; o time; c time; bs time; be time; ending timestamptz; blocking timestamptz; digits text;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 SELECT * INTO b FROM public.bookings WHERE id=_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
 IF b.status NOT IN ('pending','confirmed') OR (b.status='pending' AND b.hold_expires_at<=now()) THEN RAISE EXCEPTION 'booking_inactive'; END IF;
 _name:=trim(coalesce(_name,'')); _email:=lower(trim(coalesce(_email,''))); digits:=regexp_replace(coalesce(_phone,''),'\D','','g');
 IF length(_name)<2 OR length(_name)>100 THEN RAISE EXCEPTION 'invalid_name'; END IF;
 IF length(digits)<10 OR length(digits)>13 THEN RAISE EXCEPTION 'invalid_phone'; END IF;
 IF _email<>'' AND (_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_email)>255) THEN RAISE EXCEPTION 'invalid_email'; END IF;
 IF _starts_at IS DISTINCT FROM b.starts_at THEN
 SELECT * INTO st FROM public.settings WHERE id=1;
 d:=(_starts_at AT TIME ZONE 'America/Fortaleza')::date;
 SELECT * INTO ex FROM public.calendar_exceptions WHERE day=d;
 IF FOUND THEN
 IF ex.closed THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
 o:=ex.open_time; c:=ex.close_time;
 ELSE
 SELECT * INTO bh FROM public.business_hours WHERE weekday=extract(dow FROM d)::int;
 IF NOT FOUND OR bh.closed THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
 o:=bh.open_time; c:=bh.close_time; bs:=bh.break_start; be:=bh.break_end;
 END IF;
 ending:=_starts_at+make_interval(mins=>b.duration_min); blocking:=ending+make_interval(mins=>st.buffer_min);
 IF _starts_at<=now() OR _starts_at<((d+o) AT TIME ZONE 'America/Fortaleza') OR ending>((d+c) AT TIME ZONE 'America/Fortaleza') OR mod(extract(epoch FROM (_starts_at-((d+o) AT TIME ZONE 'America/Fortaleza')))::numeric,(st.slot_step_min*60)::numeric)<>0 THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
 IF bs IS NOT NULL AND tstzrange(_starts_at,ending,'[)') && tstzrange((d+bs) AT TIME ZONE 'America/Fortaleza',(d+be) AT TIME ZONE 'America/Fortaleza','[)') THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
 IF EXISTS(SELECT 1 FROM public.calendar_blocks WHERE tstzrange(starts_at,ends_at,'[)') && tstzrange(_starts_at,blocking,'[)')) THEN RAISE EXCEPTION 'slot_unavailable'; END IF;
 UPDATE public.bookings SET status='expired',payment_status='expired' WHERE status='pending' AND hold_expires_at<=now() AND id<>_id;
 ELSE ending:=b.ends_at; blocking:=b.block_end;
 END IF;
 BEGIN
 UPDATE public.bookings SET starts_at=_starts_at,ends_at=ending,block_end=blocking,customer_name=_name,customer_phone=digits,customer_email=_email WHERE id=_id;
 EXCEPTION WHEN exclusion_violation THEN RAISE EXCEPTION 'slot_unavailable'; END;
 INSERT INTO public.booking_events(booking_id,kind,data) VALUES(_id,'admin_rescheduled',jsonb_build_object('actor_id',auth.uid(),'before',b.starts_at,'after',_starts_at));
END $$;
REVOKE ALL ON FUNCTION public.admin_reschedule_booking(uuid,timestamptz,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_reschedule_booking(uuid,timestamptz,text,text,text) TO authenticated;