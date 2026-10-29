import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, MessageCircle, Plus, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtTime, localDay, TIMEZONE } from "@/lib/booking-rules";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BookingEditor } from "./booking-editor";
import type { Database } from "@/integrations/supabase/types";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
const PAYMENT: Record<string, string> = { approved: "Aprovado", pending: "Pendente", in_process: "Em análise", awaiting: "Aguardando", rejected: "Recusado", cancelled: "Cancelado", expired: "Expirado", manual_unpaid: "Manual · sinal não pago", refunded: "Devolvido", charged_back: "Contestado", approved_conflict: "Aprovado · conflito de horário" };

type View = "dia" | "semana" | "mes" | "historico";
const STATUS: Record<string, string> = { pending: "Aguardando pagamento", confirmed: "Confirmado", cancelled: "Cancelado", expired: "Expirado" };
const STATUS_CLS: Record<string, string> = { pending: "bg-blush text-foreground", confirmed: "bg-primary text-primary-foreground", cancelled: "bg-muted text-muted-foreground", expired: "bg-muted text-muted-foreground" };

function range(view: View, anchor: Date): [Date, Date] {
  const d = new Date(`${localDay(anchor)}T00:00:00-03:00`);
  if (view === "dia") return [d, new Date(d.getTime() + 864e5)];
  if (view === "semana") { const dow = new Date(d.getTime() + 3 * 36e5).getUTCDay(); const s = new Date(d.getTime() - dow * 864e5); return [s, new Date(s.getTime() + 7 * 864e5)]; }
  if (view === "mes") { const [y = 2026, m = 1] = localDay(anchor).split("-").map(Number); return [new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00-03:00`), new Date(`${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01T00:00:00-03:00`)]; }
  return [new Date("2020-01-01"), new Date()];
}

export function AgendaTab() {
  const qc = useQueryClient();
  const [view, setView] = useState<View>("dia");
  const [anchor, setAnchor] = useState(new Date());
  const [status, setStatus] = useState<string>("ativos");
  const [editor, setEditor] = useState<Booking | "new" | null>(null);
  const [from, to] = range(view, anchor);

  const q = useQuery({
    queryKey: ["admin-bookings", view, from.toISOString(), status],
    queryFn: async () => {
      let req = supabase.from("bookings").select("*").gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at", { ascending: view !== "historico" }).limit(500);
      if (status === "ativos") req = req.in("status", ["pending", "confirmed"]);
      else if (status !== "todos") req = req.eq("status", status as "pending");
      const { data, error } = await req;
      if (error) throw error;
      return data;
    },
  });

  function shift(dir: number) {
    const step = view === "dia" ? 1 : view === "semana" ? 7 : 30;
    setAnchor(new Date(anchor.getTime() + dir * step * 864e5));
  }

  async function cancel(id: string) {
    if (!confirm("Cancelar este agendamento? O horário será liberado.")) return;
    const { error } = await supabase.from("bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error("Não foi possível cancelar."); else { toast.success("Agendamento cancelado."); qc.invalidateQueries({ queryKey: ["admin-bookings"] }); qc.invalidateQueries({ queryKey: ["slots"] }); }
  }

  const byDay = new Map<string, NonNullable<typeof q.data>>();
  for (const b of q.data ?? []) { const k = localDay(new Date(b.starts_at)); byDay.set(k, [...(byDay.get(k) ?? []), b]); }
  const now = Date.now();

  return (
    <section>
      <div className="flex flex-wrap items-center gap-2">
        {(["dia", "semana", "mes", "historico"] as View[]).map((v) => (
          <Button variant="outline" size="sm" key={v} onClick={() => setView(v)} aria-pressed={view === v} className={view === v ? "border-primary font-medium" : ""}>{{ dia: "Dia", semana: "Semana", mes: "Mês", historico: "Histórico" }[v]}</Button>
        ))}
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm">
          <option value="ativos">Confirmados e aguardando</option><option value="confirmed">Confirmados</option><option value="pending">Aguardando pagamento</option><option value="cancelled">Cancelados</option><option value="expired">Expirados</option><option value="todos">Todos</option>
        </select>
        <Button size="sm" onClick={() => setEditor("new")}><Plus />Novo agendamento</Button>
        {view !== "historico" && (
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Anterior"><ChevronLeft /></Button>
            <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>Hoje</Button>
            <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Próximo"><ChevronRight /></Button>
            <input type="date" value={localDay(anchor)} onChange={(e) => e.target.value && setAnchor(new Date(`${e.target.value}T12:00:00-03:00`))} className="rounded-lg border border-border bg-card px-2 py-1 text-sm" />
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{view === "historico" ? "Atendimentos anteriores" : `${from.toLocaleDateString("pt-BR", { timeZone: TIMEZONE })} a ${new Date(to.getTime() - 1).toLocaleDateString("pt-BR", { timeZone: TIMEZONE })}`}</p>

      {q.isLoading && <p className="mt-6 flex gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando…</p>}
      {q.isError && <p role="alert" className="mt-6 text-destructive">Não foi possível consultar a agenda. Tente novamente.</p>}
      {q.data && q.data.length === 0 && <p className="mt-6 rounded-xl bg-card p-6 text-muted-foreground">Nenhum agendamento neste período.</p>}
      <div className="mt-4 space-y-6">
        {[...byDay.entries()].map(([day, list]) => (
          <div key={day}>
            <h3 className="mb-2 font-serif text-xl capitalize">{new Date(`${day}T12:00:00-03:00`).toLocaleDateString("pt-BR", { timeZone: TIMEZONE, weekday: "long", day: "2-digit", month: "long" })}</h3>
            <div className="grid gap-2">
              {list.map((b) => {
                const st = b.status === "pending" && b.hold_expires_at && new Date(b.hold_expires_at).getTime() < now ? "expired" : b.status;
                const addons = (b.addons as { name: string }[]).map((a) => a.name).join(", ");
                return (
                  <article key={b.id} className="rounded-xl border border-border bg-card p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{fmtTime(b.starts_at)}–{fmtTime(b.ends_at)} · {b.service_name}{addons && ` + ${addons}`}</p>
                      <span className={`rounded-full px-3 py-1 text-xs ${STATUS_CLS[st]}`}>{STATUS[st]}{b.payment_status === "approved_conflict" && " · pago após expirar"}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-muted-foreground sm:grid-cols-2">
                      <p>{b.customer_name} · <a className="text-primary" href={`https://wa.me/55${b.customer_phone.replace(/^55/, "")}`} target="_blank" rel="noopener noreferrer"><MessageCircle className="inline h-3 w-3" /> {b.customer_phone}</a></p>
                      <p>{b.duration_min} min · Total {brl(b.total_cents)} · Sinal {brl(b.deposit_cents)} · Restante {brl(b.balance_cents)}</p>
                      <p>Pagamento: {PAYMENT[b.payment_status] ?? b.payment_status}{b.mp_payment_id && ` · Mercado Pago #${b.mp_payment_id}`}</p>
                      {b.customer_email && <p>{b.customer_email}</p>}
                    </div>
                    {(st === "confirmed" || st === "pending") && (
                      <div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => setEditor(b)}><Pencil />Editar / reagendar</Button><Button variant="ghost" size="sm" onClick={() => cancel(b.id)} className="text-destructive">Cancelar agendamento</Button></div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <Dialog open={editor !== null} onOpenChange={(open) => { if (!open) setEditor(null); }}><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>{editor === "new" ? "Novo agendamento manual" : "Editar / reagendar"}</DialogTitle></DialogHeader>{editor && <BookingEditor {...(editor === "new" ? {} : { booking: editor })} onClose={() => setEditor(null)} />}</DialogContent></Dialog>
    </section>
  );
}
