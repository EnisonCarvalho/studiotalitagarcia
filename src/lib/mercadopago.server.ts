// Mercado Pago (server-only). Credenciais vêm de variáveis secretas.
const API = "https://api.mercadopago.com";
const PAYMENT_NOTIFICATION_URL = "https://studiotalitagarcia.lovable.app/api/public/mercadopago";

export function mpToken() {
  return process.env["MERCADOPAGO_ACCESS_TOKEN"];
}

/** Chave pública (publishable) usada pelo SDK no navegador para tokenizar o cartão. */
export function mpPublicKey() {
  return process.env["MERCADOPAGO_PUBLIC_KEY"];
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
      notification_url: PAYMENT_NOTIFICATION_URL,
      date_of_expiration: mpDate(input.expiresAt),
      payer: { email: input.email, first_name: first, last_name: rest.join(" ") || first },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Mercado Pago create failed", res.status);
    throw new Error("mp_create_failed");
  }
  const tx = body?.point_of_interaction?.transaction_data ?? {};
  if (!body.id || typeof tx.qr_code !== "string" || !tx.qr_code || typeof tx.qr_code_base64 !== "string" || !tx.qr_code_base64)
    throw new Error("mp_pix_qr_missing");
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

/** Pagamento com cartão via Checkout Transparente: o token vem do SDK oficial no navegador (nunca recebemos número/CVV). */
export async function mpCreateCardPayment(input: {
  bookingId: string; amountCents: number; description: string; email: string;
  token: string; paymentMethodId: string; issuerId?: string | number | undefined; installments: number; idempotencyKey: string;
  identificationType?: string | undefined; identificationNumber?: string | undefined;
}) {
  const token = mpToken();
  if (!token) throw new Error("payment_not_configured");
  const res = await fetch(`${API}/v1/payments`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify({
      transaction_amount: input.amountCents / 100,
      description: input.description,
      token: input.token,
      payment_method_id: input.paymentMethodId,
      ...(input.issuerId != null && input.issuerId !== "" ? { issuer_id: Number(input.issuerId) } : {}),
      installments: Math.max(1, Math.min(12, Math.floor(input.installments))),
      external_reference: input.bookingId,
      notification_url: PAYMENT_NOTIFICATION_URL,
      statement_descriptor: "TALITA GARCIA",
      payer: {
        email: input.email,
        ...(input.identificationType && input.identificationNumber ? {
          identification: { type: input.identificationType, number: input.identificationNumber },
        } : {}),
      },
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error("Mercado Pago card payment failed", res.status);
    throw new Error("mp_card_failed");
  }
  return { id: String(body.id), status: String(body.status), detail: String(body.status_detail ?? "") };
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
