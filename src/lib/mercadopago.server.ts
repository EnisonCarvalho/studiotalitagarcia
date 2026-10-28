// Mercado Pago (server-only). Credenciais vêm de variáveis secretas.
const API = "https://api.mercadopago.com";

export function mpToken() {
  return process.env["MERCADOPAGO_ACCESS_TOKEN"];
}

export async function mpGetPayment(id: string) {
  const token = mpToken();
  if (!token) throw new Error("payment_not_configured");
  const res = await fetch(`${API}/v1/payments/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`mp_get_failed_${res.status}`);
  return (await res.json()) as { id: number; status: string; external_reference: string | null; transaction_amount: number };
}

function mpDate(d: Date) {
  // Fortaleza (UTC-3, sem horário de verão)
  const local = new Date(d.getTime() - 3 * 3600_000).toISOString().replace("Z", "");
  return `${local}-03:00`;
}

export async function mpCreatePix(input: {
  bookingId: string; amountCents: number; description: string; email: string; name: string; expiresAt: Date; notificationUrl: string;
}) {
  const token = mpToken();
  if (!token) throw new Error("payment_not_configured");
  const [first, ...rest] = input.name.split(" ");
  const res = await fetch(`${API}/v1/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": input.bookingId },
    body: JSON.stringify({
      transaction_amount: input.amountCents / 100,
      description: input.description,
      payment_method_id: "pix",
      external_reference: input.bookingId,
      notification_url: input.notificationUrl,
      date_of_expiration: mpDate(input.expiresAt),
      payer: { email: input.email, first_name: first, last_name: rest.join(" ") || first },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Mercado Pago create failed", res.status, body);
    throw new Error("mp_create_failed");
  }
  const tx = body?.point_of_interaction?.transaction_data ?? {};
  return { id: String(body.id), status: String(body.status), qr: tx.qr_code as string, qrBase64: tx.qr_code_base64 as string };
}

/** Valida o cabeçalho x-signature do Mercado Pago (HMAC-SHA256). */
export async function mpVerifySignature(opts: { signature: string | null; requestId: string | null; dataId: string; secret: string }) {
  if (!opts.signature) return false;
  const parts = Object.fromEntries(opts.signature.split(",").map((p) => p.trim().split("=") as [string, string]));
  const ts = parts["ts"]; const v1 = parts["v1"];
  if (!ts || !v1) return false;
  let manifest = `id:${opts.dataId.toLowerCase()};`;
  if (opts.requestId) manifest += `request-id:${opts.requestId};`;
  manifest += `ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(opts.secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest)));
  const hex = Array.from(sig).map((b) => b.toString(16).padStart(2, "0")).join("");
  if (hex.length !== v1.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ v1.charCodeAt(i);
  return diff === 0;
}

/** E-mail é opcional para a cliente; o Mercado Pago exige um, então usamos um endereço técnico da reserva. */
export function payerEmail(email: string, bookingId: string) {
  return email || `cliente.${bookingId.slice(0, 8)}@studiotalitagarcia.lovable.app`;
}

/** Checkout do Mercado Pago (cartão de crédito). */
export async function mpCreateCardCheckout(input: {
  bookingId: string; amountCents: number; title: string; email: string; expiresAt: Date; origin: string;
}) {
  const token = mpToken();
  if (!token) throw new Error("payment_not_configured");
  const back = `${input.origin}/agendamento/${input.bookingId}`;
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [{ id: input.bookingId, title: input.title, quantity: 1, currency_id: "BRL", unit_price: input.amountCents / 100 }],
      payer: { email: input.email },
      external_reference: input.bookingId,
      notification_url: `${input.origin}/api/public/mercadopago`,
      back_urls: { success: back, pending: back, failure: back },
      auto_return: "approved",
      expires: true,
      expiration_date_to: mpDate(input.expiresAt),
      payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }, { id: "bank_transfer" }], installments: 1 },
      statement_descriptor: "TALITA GARCIA",
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) { console.error("Mercado Pago preference failed", res.status, body); throw new Error("mp_pref_failed"); }
  return String(body.init_point);
}

/** Pagamentos vinculados a uma reserva (consulta direta na API = fonte da verdade). */
export async function mpSearchByReference(bookingId: string) {
  const token = mpToken();
  if (!token) return [];
  const res = await fetch(`${API}/v1/payments/search?external_reference=${encodeURIComponent(bookingId)}&sort=date_created&criteria=desc`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const body = (await res.json()) as { results?: { id: number; status: string; external_reference: string }[] };
  return (body.results ?? []).filter((p) => p.external_reference === bookingId);
}
