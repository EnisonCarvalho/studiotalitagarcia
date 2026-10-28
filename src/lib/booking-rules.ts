// Regras de valores e duração do agendamento (espelham as funções do banco).
export const MAX_DURATION_MIN = 120;
export const TIMEZONE = "America/Fortaleza";

export function depositSplit(totalCents: number, percent: number) {
  const deposit = Math.round((totalCents * percent) / 100);
  return { deposit, balance: totalCents - deposit };
}

export function totals(
  service: { price_cents: number; duration_min: number },
  addons: { price_cents: number; duration_min: number }[],
) {
  const price = service.price_cents + addons.reduce((s, a) => s + a.price_cents, 0);
  const duration = service.duration_min + addons.reduce((s, a) => s + a.duration_min, 0);
  return { price, duration, withinLimit: duration <= MAX_DURATION_MIN };
}

export function isValidDuration(min: number) {
  return Number.isInteger(min) && min >= 1 && min <= MAX_DURATION_MIN;
}

export function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TIMEZONE, weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit",
  });
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { timeZone: TIMEZONE, hour: "2-digit", minute: "2-digit" });
}

/** Data local de Fortaleza no formato YYYY-MM-DD */
export function localDay(d: Date) {
  return d.toLocaleDateString("en-CA", { timeZone: TIMEZONE });
}

const ERRORS: Record<string, string> = {
  slot_unavailable: "Esse horário acabou de ser reservado ou não está mais disponível. Escolha outro, por favor.",
  duration_over_limit: "A combinação escolhida passa de 120 minutos. Remova algum adicional para continuar.",
  addons_not_allowed: "Esse procedimento não aceita adicionais.",
  addon_unavailable: "Um dos adicionais não está mais disponível.",
  service_unavailable: "Esse procedimento não está disponível no momento.",
  invalid_name: "Informe seu nome.",
  invalid_phone: "Informe um WhatsApp válido com DDD.",
  invalid_email: "Informe um e-mail válido.",
  block_conflicts_booking: "Já existe agendamento nesse período. Cancele-o antes de bloquear.",
};

export function friendlyError(message?: string) {
  if (!message) return "Algo deu errado. Tente novamente.";
  const key = Object.keys(ERRORS).find((k) => message.includes(k));
  return key ? ERRORS[key] : "Algo deu errado. Tente novamente.";
}
