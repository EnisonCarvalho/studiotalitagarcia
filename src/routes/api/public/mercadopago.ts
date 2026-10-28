import { createFileRoute } from "@tanstack/react-router";

// Webhook do Mercado Pago: valida assinatura e confirma consultando a API (nunca confia no corpo).
export const Route = createFileRoute("/api/public/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const body = (await request.json().catch(() => ({}))) as { type?: string; data?: { id?: string | number } };
        const dataId = String(url.searchParams.get("data.id") ?? body?.data?.id ?? url.searchParams.get("id") ?? "");
        const type = url.searchParams.get("type") ?? url.searchParams.get("topic") ?? body?.type;
        if (!/^\d{1,30}$/.test(dataId)) return new Response("ignored", { status: 200 });

        const secret = process.env["MERCADOPAGO_WEBHOOK_SECRET"];
        if (!secret) return new Response("not configured", { status: 503 });
        const { mpVerifySignature, mpGetPayment } = await import("@/lib/mercadopago.server");
        const ok = await mpVerifySignature({
          signature: request.headers.get("x-signature"), requestId: request.headers.get("x-request-id"), dataId, secret,
        });
        if (!ok) return new Response("invalid signature", { status: 401 });
        if (type && type !== "payment") return new Response("ok");

        try {
          const p = await mpGetPayment(dataId);
          const ref = p.external_reference ?? "";
          if (!/^[0-9a-f-]{36}$/.test(ref)) return new Response("ok");
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: booking } = await supabaseAdmin.from("bookings").select("deposit_cents").eq("id", ref).maybeSingle();
          if (!booking || Math.round(p.transaction_amount * 100) !== booking.deposit_cents)
            return new Response("payment mismatch", { status: 400 });
          const { error } = await supabaseAdmin.rpc("apply_payment_status", { _booking_id: ref, _payment_id: String(p.id), _mp_status: p.status });
          if (error) {
            console.error("apply_payment_status failed");
            return new Response("retry", { status: 500 });
          }
          return new Response("ok");
        } catch (e) {
          console.error(e);
          return new Response("retry", { status: 500 });
        }
      },
    },
  },
});
