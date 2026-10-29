import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { adminBookingSchema } from "./admin-booking-schema";
import { z } from "zod";

export const saveAdminBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => adminBookingSchema.extend({
    id: z.string().uuid().optional(), serviceId: z.string().uuid().optional(), addonIds: z.array(z.string().uuid()).default([]),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError || admin !== true) throw new Error("forbidden");
    if (data.id) {
      const { error } = await context.supabase.rpc("admin_reschedule_booking", {
        _id: data.id, _starts_at: data.startsAt, _name: data.name, _phone: data.phone, _email: data.email,
      });
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    if (!data.serviceId) throw new Error("service_unavailable");
    const { data: id, error } = await context.supabase.rpc("admin_create_booking", {
      _service_id: data.serviceId, _addon_ids: data.addonIds, _starts_at: data.startsAt,
      _name: data.name, _phone: data.phone, _email: data.email,
    });
    if (error) throw new Error(error.message);
    return { id };
  });