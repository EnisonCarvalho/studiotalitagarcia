import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { z } from "zod";
import { ArrowLeft, Check, Clock, Loader2 } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/calendar";
import { createPixPayment } from "@/lib/booking.functions";
import { brl, depositSplit, fmtDateTime, fmtTime, friendlyError, localDay, MAX_DURATION_MIN, totals } from "@/lib/booking-rules";
import { LOGO } from "@/content/site";

import { catalogQuery } from "@/lib/catalog-query";

export const Route = createFileRoute("/agendar")({
  validateSearch: z.object({ categoria: z.string().optional() }),
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQuery),
  head: () => ({
    meta: [
      { title: "Agendar meu horário | Studio Talita Garcia" },
      { name: "description", content: "Escolha o procedimento, veja horários livres e garanta seu horário com sinal via Pix no Studio Talita Garcia." },
      { property: "og:title", content: "Agendar meu horário | Studio Talita Garcia" },
      { property: "og:description", content: "Agende cílios, sobrancelhas, unhas e depilação online, com sinal via Pix." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Agendar,
});

const steps = ["Serviço", "Data e horário", "Seus dados", "Revisão"];
const pill = "inline-flex items-center justify-center gap-2 rounded-full bg-cta px-7 py-3.5 text-base font-semibold text-cta-foreground shadow-md transition hover:brightness-95 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const ghost = "inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm hover:border-primary";

function Agendar() {
  const { data: cat } = useSuspenseQuery(catalogQuery);
  const { categoria } = Route.useSearch();
  const navigate = useNavigate();
  const createPix = useServerFn(createPixPayment);

  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [day, setDay] = useState<Date | undefined>();
  const [slot, setSlot] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const service = cat.services.find((s) => s.id === serviceId);
  const chosenAddons = cat.addons.filter((a) => addonIds.includes(a.id));
  const t = service ? totals(service, chosenAddons) : null;
  const split = t ? depositSplit(t.price, cat.depositPercent) : null;

  const groups = useMemo(() => {
    const m = new Map<string, typeof cat.services>();
    for (const s of cat.services) m.set(s.category, [...(m.get(s.category) ?? []), s]);
    const all = [...m.entries()];
    if (!categoria) return all;
    const c = categoria.toLowerCase();
    return [...all.filter(([k]) => k.toLowerCase().includes(c)), ...all.filter(([k]) => !k.toLowerCase().includes(c))];
  }, [cat.services, categoria]);

  const hours = useQuery({
    queryKey: ["hours"],
    queryFn: async () => (await supabase.from("business_hours").select("weekday,closed")).data ?? [],
  });
  const closedDays = (hours.data ?? []).filter((h) => h.closed).map((h) => h.weekday);

  const dayKey = day ? localDay(day) : null;
  const slots = useQuery({
    queryKey: ["slots", serviceId, addonIds.slice().sort().join(","), dayKey],
    enabled: !!serviceId && !!dayKey && step === 1,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("available_slots", { _service_id: serviceId!, _addon_ids: addonIds, _day: dayKey! });
      if (error) throw new Error(friendlyError(error.message));
      return (data ?? []) as unknown as string[];
    },
  });

  function toggleAddon(id: string) {
    setErr(null);
    setAddonIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    setSlot(null);
  }

  const phoneDigits = form.phone.replace(/\D/g, "");
  const formOk = form.name.trim().length >= 2 && phoneDigits.length >= 10 && phoneDigits.length <= 13 && (form.email.trim() === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim()));

  async function confirm() {
    if (!service || !slot) return;
    setBusy(true); setErr(null);
    const { data, error } = await supabase.rpc("create_booking", {
      _service_id: service.id, _addon_ids: addonIds, _starts_at: slot,
      _name: form.name.trim(), _phone: form.phone, _email: form.email.trim(),
    });
    if (error || !data) {
      setBusy(false);
      setErr(friendlyError(error?.message) ?? null);
      if (error?.message.includes("slot_unavailable")) { setSlot(null); setStep(1); slots.refetch(); }
      return;
    }
    await createPix({ data: { id: data as string } }).catch(() => null);
    navigate({ to: "/agendamento/$id", params: { id: data as string } });
  }

  const today = new Date(); today.setHours(0, 0, 0, 0);

  return (
    <div className="min-h-screen pb-28">
      <header className="border-b border-border/60 bg-background/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-3"><img src={LOGO} alt="Studio Talita Garcia" className="h-11 w-11" /><span className="font-serif text-xl">Agendar meu horário</span></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">Voltar ao site</Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        <ol className="mb-8 grid grid-cols-4 gap-2 text-xs">
          {steps.map((s, i) => (
            <li key={s} className={`border-t-2 pt-2 ${i <= step ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>{i + 1}. {s}</li>
          ))}
        </ol>

        {err && <p role="alert" className="mb-6 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">{err}</p>}
        {cat.error && <p role="alert" className="mb-6 rounded-xl bg-destructive/10 p-4 text-sm">{cat.error}</p>}

        {step === 0 && (
          <section>
            <h1 className="text-4xl">Escolha o procedimento</h1>
            <div className="mt-6 space-y-8">
              {groups.map(([category, list]) => (
                <div key={category}>
                  <h2 className="mb-3 text-2xl text-primary">{category}</h2>
                  <div className="grid gap-2">
                    {list.map((s) => (
                      <button key={s.id} onClick={() => { setServiceId(s.id); setAddonIds([]); setSlot(null); setErr(null); }}
                        aria-pressed={serviceId === s.id}
                        className={`flex items-center justify-between gap-4 rounded-xl border p-4 text-left transition ${serviceId === s.id ? "border-primary bg-blush" : "border-border bg-card hover:border-primary"}`}>
                        <span><span className="font-medium">{s.name}</span><span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{s.duration_min} min</span></span>
                        <span className="font-semibold">{brl(s.price_cents)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {service?.allows_addons && cat.addons.length > 0 && (
              <div className="mt-8 rounded-xl bg-secondary p-5">
                <h2 className="text-2xl">Adicionais de decoração</h2>
                <p className="text-sm text-muted-foreground">Opcional, somados ao serviço.</p>
                <div className="mt-4 grid gap-2">
                  {cat.addons.map((a) => {
                    const on = addonIds.includes(a.id);
                    return (
                      <label key={a.id} className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 ${on ? "border-primary bg-card" : "border-border"}`}>
                        <span className="flex items-center gap-3"><input type="checkbox" checked={on} onChange={() => toggleAddon(a.id)} className="h-4 w-4 accent-[var(--primary)]" />{a.name} <span className="text-xs text-muted-foreground">+{a.duration_min} min</span></span>
                        <span className="text-sm font-medium">+ {brl(a.price_cents)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        )}

        {step === 1 && service && (
          <section>
            <h1 className="text-4xl">Escolha data e horário</h1>
            <div className="mt-6 grid gap-6 md:grid-cols-[auto_1fr]">
              <Calendar mode="single" locale={ptBR} selected={day} onSelect={(d) => { setDay(d); setSlot(null); }}
                disabled={[{ before: today }, (d: Date) => closedDays.includes(d.getDay())]}
                className="rounded-xl border border-border" />
              <div>
                {!day && <p className="text-muted-foreground">Selecione uma data no calendário.</p>}
                {day && slots.isLoading && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Buscando horários…</p>}
                {day && slots.error && <p className="text-destructive">{(slots.error as Error).message}</p>}
                {day && slots.data && slots.data.length === 0 && <p className="text-muted-foreground">Não há horários disponíveis nessa data. Tente outro dia.</p>}
                {day && slots.data && slots.data.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {slots.data.map((s) => (
                      <button key={s} onClick={() => setSlot(s)} aria-pressed={slot === s}
                        className={`rounded-lg border py-2.5 text-sm ${slot === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>{fmtTime(s)}</button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section>
            <h1 className="text-4xl">Seus dados</h1>
            <div className="mt-6 grid gap-4">
              {([["name", "Nome", "text", "name", 100], ["phone", "WhatsApp com DDD", "tel", "tel", 20], ["email", "E-mail (opcional)", "email", "email", 255]] as const).map(([k, label, type, ac, max]) => (
                <label key={k} className="grid gap-1.5 text-sm">
                  {label}
                  <input type={type} autoComplete={ac} maxLength={max} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="rounded-lg border border-input bg-card px-4 py-3 text-base outline-none focus:border-primary" />
                </label>
              ))}
              <p className="text-xs text-muted-foreground">Usamos seus dados apenas para este agendamento.</p>
            </div>
          </section>
        )}

        {step === 3 && service && t && split && slot && (
          <section>
            <h1 className="text-4xl">Revise seu agendamento</h1>
            <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-card text-sm">
              <Row k="Procedimento" v={`${service.name} · ${brl(service.price_cents)}`} />
              {chosenAddons.map((a) => <Row key={a.id} k="Adicional" v={`${a.name} · ${brl(a.price_cents)}`} />)}
              <Row k="Data e horário" v={fmtDateTime(slot)} />
              <Row k="Duração" v={`${t.duration} min`} />
              <Row k="Nome" v={form.name} />
              <Row k="WhatsApp" v={form.phone} />
              <Row k="Valor total" v={brl(t.price)} />
              <Row k={`Sinal agora (${cat.depositPercent}%)`} v={brl(split.deposit)} strong />
              <Row k="Restante no atendimento" v={brl(split.balance)} />
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">Ao continuar, o horário fica reservado por alguns minutos enquanto você paga o sinal via Pix ou cartão de crédito. A confirmação só acontece após o pagamento.</p>
          </section>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
          <div className="text-sm">
            {t ? (<><p className="font-semibold">{brl(t.price)}</p><p className={t.withinLimit ? "text-muted-foreground" : "font-medium text-destructive"}>{t.duration} min{!t.withinLimit && ` · máximo ${MAX_DURATION_MIN} min`}</p></>) : <p className="text-muted-foreground">Escolha um procedimento</p>}
          </div>
          <div className="flex gap-2">
            {step > 0 && <button className={ghost} onClick={() => { setErr(null); setStep(step - 1); }} disabled={busy}><ArrowLeft className="h-4 w-4" />Voltar</button>}
            {step < 3 ? (
              <button className={pill} disabled={(step === 0 && (!t || !t.withinLimit)) || (step === 1 && !slot) || (step === 2 && !formOk)} onClick={() => { setErr(null); setStep(step + 1); }}>Continuar</button>
            ) : (
              <button className={pill} disabled={busy} onClick={confirm}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Ir para o pagamento</button>
            )}
          </div>
        </div>
        {t && !t.withinLimit && <p className="px-5 pb-3 text-center text-xs text-destructive">A combinação passa de 120 minutos. Remova algum adicional para continuar.</p>}
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return <div className="flex justify-between gap-4 p-4"><dt className="text-muted-foreground">{k}</dt><dd className={`text-right ${strong ? "font-semibold text-primary" : ""}`}>{v}</dd></div>;
}
