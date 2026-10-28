// All provider responses below are isolated unit fixtures: no network or charges.
import { afterEach, describe, expect, it, vi } from "vitest";
import { mpCreateCardPayment, mpCreatePix, mpVerifySignature } from "@/lib/mercadopago.server";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("pagamentos reais sem redirecionamento", () => {
  const input = {
    bookingId: "00000000-0000-4000-8000-000000000001", amountCents: 1250,
    description: "Sinal", email: "cliente@example.com",
  };

  it("Pix envia R$ 12,50 à API oficial e usa o webhook publicado mesmo no preview", async () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "unit-fixture-not-a-credential");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: 123, status: "pending", point_of_interaction: { transaction_data: { qr_code: "unit-qr", qr_code_base64: "unit-image" } } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await mpCreatePix({ ...input, name: "Cliente", expiresAt: new Date("2026-10-29T12:15:00Z"), notificationUrl: "http://localhost:8080/api/public/mercadopago" });
    const [url, options] = fetchMock.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe("https://api.mercadopago.com/v1/payments");
    expect(body.transaction_amount).toBe(12.5);
    expect(body.payment_method_id).toBe("pix");
    expect(body.external_reference).toBe(input.bookingId);
    expect(body.notification_url).toBe("https://studiotalitagarcia.lovable.app/api/public/mercadopago");
    expect(body.date_of_expiration).toBe("2026-10-29T09:15:00.000-03:00");
    expect(result.status).toBe("pending");
    expect(result.qr).toBe("unit-qr");
  });

  it("não aceita cobrança Pix sem QR dinâmico", async () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "unit-fixture-not-a-credential");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ id: 123, status: "pending" })));
    await expect(mpCreatePix({ ...input, name: "Cliente", expiresAt: new Date("2026-10-29T12:15:00Z"), notificationUrl: "https://studiotalitagarcia.lovable.app/api/public/mercadopago" })).rejects.toThrow("mp_pix_qr_missing");
  });

  it("cartão envia identificação, referência e webhook sem número ou CVV", async () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "unit-fixture-not-a-credential");
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ id: 124, status: "pending" }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await mpCreateCardPayment({ ...input, token: "unit-card-token", paymentMethodId: "visa", installments: 1, idempotencyKey: "unit-attempt", identificationType: "CPF", identificationNumber: "00000000000" });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.notification_url).toBe("https://studiotalitagarcia.lovable.app/api/public/mercadopago");
    expect(body.payer.identification).toEqual({ type: "CPF", number: "00000000000" });
    expect(body.external_reference).toBe(input.bookingId);
    expect(body).not.toHaveProperty("card_number");
    expect(body).not.toHaveProperty("security_code");
    expect(result.status).toBe("pending");
  });

  it("não registra o corpo de erros do provedor", async () => {
    vi.stubEnv("MERCADOPAGO_ACCESS_TOKEN", "unit-fixture-not-a-credential");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ sensitive: "fixture" }, { status: 401 })));
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(mpCreateCardPayment({ ...input, token: "unit-card-token", paymentMethodId: "visa", installments: 1, idempotencyKey: "unit-attempt" })).rejects.toThrow("mp_card_failed");
    expect(log).toHaveBeenCalledExactlyOnceWith("Mercado Pago card payment failed", 401);
  });

  it("rejeita notificação sem assinatura válida", async () => {
    expect(await mpVerifySignature({ signature: null, requestId: "unit-request", dataId: "123", secret: "unit-signing-fixture" })).toBe(false);
    expect(await mpVerifySignature({ signature: "ts=1,v1=invalid", requestId: "unit-request", dataId: "123", secret: "unit-signing-fixture" })).toBe(false);
  });
});