CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles r JOIN auth.users u ON u.id=r.user_id WHERE r.user_id=_user_id AND r.role=_role AND u.email_confirmed_at IS NOT NULL AND NOT (r.role='admin' AND r.user_id='d78894b3-f2fb-44bc-b9b0-03bba02f8bb0'::uuid))
$$;
CREATE OR REPLACE FUNCTION public.grant_owner_admin() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF new.id='8d9dc92a-20dd-4dc6-94db-6eb090c4be27'::uuid AND new.email_confirmed_at IS NOT NULL THEN
 INSERT INTO public.user_roles(user_id,role) VALUES(new.id,'admin') ON CONFLICT DO NOTHING;
 DELETE FROM public.user_roles WHERE user_id='d78894b3-f2fb-44bc-b9b0-03bba02f8bb0'::uuid AND role='admin';
 INSERT INTO public.admin_audit(actor_id,entity,record_id,action,changes) VALUES(new.id,'user_roles',new.id::text,'OWNER_ACTIVATED',jsonb_build_object('retired_owner_id','d78894b3-f2fb-44bc-b9b0-03bba02f8bb0','verified_owner_id',new.id));
 END IF;
 RETURN new;
END $$;
REVOKE ALL ON FUNCTION public.grant_owner_admin() FROM PUBLIC,anon,authenticated;