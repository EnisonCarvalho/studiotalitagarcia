import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

function publicClient() {
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [s, a, st] = await Promise.all([
    sb.from("services").select("id,name,category,description,price_cents,duration_min,allows_addons,sort").eq("active", true).order("sort"),
    sb.from("addons").select("id,name,price_cents,duration_min,sort").eq("active", true).order("sort"),
    sb.from("settings").select("deposit_percent").eq("id", 1).single(),
  ]);
  if (s.error || a.error) {
    console.error(s.error ?? a.error);
    return { services: [], addons: [], depositPercent: 50, error: "Não foi possível carregar os serviços." };
  }
  return { services: s.data, addons: a.data, depositPercent: st.data?.deposit_percent ?? 50, error: null as string | null };
});

const idSchema = z.object({ id: z.string().uuid() });

/** Cria (ou reaproveita) a cobrança Pix do sinal para uma reserva pendente. */
export const createPixPayment = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { mpCreatePix, mpToken } = await import("@/lib/mercadopago.server");
    if (!mpToken()) return { ok: false as const, error: "O pagamento online ainda não foi ativado pelo studio. Fale conosco pelo WhatsApp." };
    const { data: b } = await supabaseAdmin.from("bookings").select("*").eq("id", data.id).single();
    if (!b) return { ok: false as const, error: "Reserva não encontrada." };
    if (b.status !== "pending" || !b.hold_expires_at || new Date(b.hold_expires_at) <= new Date())
      return { ok: false as const, error: "Essa reserva não está mais aguardando pagamento." };
    if (b.mp_payment_id) return { ok: true as const };
    try {
      const origin = new URL(getRequest().url).origin;
      const p = await mpCreatePix({
        bookingId: b.id, amountCents: b.deposit_cents, email: b.customer_email, name: b.customer_name,
        description: `Sinal - ${b.service_name} - Studio Talita Garcia`, expiresAt: new Date(b.hold_expires_at),
        notificationUrl: `${origin}/api/public/mercadopago`,
      });
      await supabaseAdmin.from("bookings").update({ mp_payment_id: p.id, payment_status: p.status, pix_qr_code: p.qr, pix_qr_base64: p.qrBase64 }).eq("id", b.id).is("mp_payment_id", null);
      await supabaseAdmin.from("booking_events").insert({ booking_id: b.id, kind: "pix_created", data: { payment_id: p.id } });
      return { ok: true as const };
    } catch (e) {
      console.error(e);
      return { ok: false as const, error: "Não foi possível gerar o Pix agora. Tente novamente em instantes." };
    }
  });

/** Status público da reserva. Se houver pagamento pendente, consulta o Mercado Pago (fonte da verdade). */
export const getBookingStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: b } = await supabaseAdmin.from("bookings").select("id,status,mp_payment_id").eq("id", data.id).single();
    if (b?.status === "pending" && b.mp_payment_id) {
      try {
        const { mpGetPayment } = await import("@/lib/mercadopago.server");
        const p = await mpGetPayment(b.mp_payment_id);
        if (p.external_reference === b.id) {
          await supabaseAdmin.rpc("apply_payment_status", { _booking_id: b.id, _payment_id: String(p.id), _mp_status: p.status });
        }
      } catch (e) {
        console.error("status refresh failed", e);
      }
    }
    const { data: pub } = await supabaseAdmin.rpc("get_booking_public", { _id: data.id }).maybeSingle();
    return pub ?? null;
  });
