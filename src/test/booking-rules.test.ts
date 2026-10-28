import { describe, expect, it } from "vitest";
import { depositSplit, isValidDuration, totals } from "@/lib/booking-rules";

describe("sinal de 50%", () => {
  it("R$ 24,99 → sinal R$ 12,50 e saldo R$ 12,49", () => {
    expect(depositSplit(2499, 50)).toEqual({ deposit: 1250, balance: 1249 });
  });
  it("R$ 99,99 → sinal R$ 50,00 e saldo R$ 49,99", () => {
    expect(depositSplit(9999, 50)).toEqual({ deposit: 5000, balance: 4999 });
  });
  it("sinal + saldo sempre igual ao total", () => {
    for (const t of [999, 2499, 5499, 12345]) {
      const { deposit, balance } = depositSplit(t, 50);
      expect(deposit + balance).toBe(t);
    }
  });
});

describe("limite de 120 minutos", () => {
  it("serviço + adicionais acima de 120 min é bloqueado", () => {
    expect(totals({ price_cents: 9999, duration_min: 120 }, [{ price_cents: 499, duration_min: 10 }]).withinLimit).toBe(false);
  });
  it("exatamente 120 min é permitido", () => {
    expect(totals({ price_cents: 6999, duration_min: 90 }, [{ price_cents: 999, duration_min: 15 }, { price_cents: 499, duration_min: 10 }]).withinLimit).toBe(true);
  });
  it("adicionais somam ao preço", () => {
    expect(totals({ price_cents: 4999, duration_min: 60 }, [{ price_cents: 999, duration_min: 15 }]).price).toBe(5998);
  });
  it("durações editáveis só entre 1 e 120", () => {
    expect(isValidDuration(0)).toBe(false);
    expect(isValidDuration(121)).toBe(false);
    expect(isValidDuration(120)).toBe(true);
  });
});
