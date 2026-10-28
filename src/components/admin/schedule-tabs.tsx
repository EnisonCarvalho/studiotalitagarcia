import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, TIMEZONE } from "@/lib/booking-rules";

const inp = "rounded-md border border-input bg-background px-2 py-1.5 text-sm";
const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const hhmm = (t: string | null) => (t ? t.slice(0, 5) : "");

type Hours = { weekday: number; closed: boolean; open_time: string; close_time: string; break_start: string | null; break_end: string | null };

export function HoursTab() {
  const q = useQuery({ queryKey: ["admin-hours"], queryFn: async () => (await supabase.from("business_hours").select("*").order("weekday")).data ?? [] });
  if (q.isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  return (
    <section className="space-y-2">
      <p className="text-sm text-muted-foreground">Horário de Fortaleza. A pausa (almoço) é opcional.</p>
      {(q.data ?? []).map((h) => <HoursRow key={h.weekday} h={h} />)}
    </section>
  );
}

function HoursRow({ h }: { h: Hours }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ ...h, open_time: hhmm(h.open_time), close_time: hhmm(h.close_time), break_start: hhmm(h.break_start), break_end: hhmm(h.break_end) });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (f.close_time <= f.open_time) return toast.error("O encerramento precisa ser depois da abertura.");
    if (!!f.break_start !== !!f.break_end || (f.break_start && f.break_end <= f.break_start)) return toast.error("Preencha início e fim da pausa corretamente.");
    setBusy(true);
    const { error } = await supabase.from("business_hours").update({
      closed: f.closed, open_time: f.open_time, close_time: f.close_time, break_start: f.break_start || null, break_end: f.break_end || null,
    }).eq("weekday", h.weekday);
    setBusy(false);
    if (error) toast.error("Não foi possível salvar."); else { toast.success(`${DAYS[h.weekday]} salvo.`); qc.invalidateQueries({ queryKey: ["admin-hours"] }); qc.invalidateQueries({ queryKey: ["hours"] }); }
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
      <span className="w-20 font-medium">{DAYS[h.weekday]}</span>
      <label className="flex items-center gap-1"><input type="checkbox" checked={!f.closed} onChange={(e) => setF({ ...f, closed: !e.target.checked })} />Atende</label>
      {!f.closed && (<>
        <label className="flex items-center gap-1">das <input type="time" className={inp} value={f.open_time} onChange={(e) => setF({ ...f, open_time: e.target.value })} /></label>
        <label className="flex items-center gap-1">às <input type="time" className={inp} value={f.close_time} onChange={(e) => setF({ ...f, close_time: e.target.value })} /></label>
        <label className="flex items-center gap-1">pausa <input type="time" className={inp} value={f.break_start} onChange={(e) => setF({ ...f, break_start: e.target.value })} /></label>
        <label className="flex items-center gap-1">até <input type="time" className={inp} value={f.break_end} onChange={(e) => setF({ ...f, break_end: e.target.value })} /></label>
      </>)}
      <button onClick={save} disabled={busy} className="ml-auto rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground disabled:opacity-50">Salvar</button>
    </div>
  );
}

const toTs = (day: string, time: string) => new Date(`${day}T${time}:00-03:00`).toISOString();
const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: TIMEZONE, day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function BlocksTab() {
  const qc = useQueryClient();
  const blocks = useQuery({ queryKey: ["admin-blocks"], queryFn: async () => (await supabase.from("calendar_blocks").select("*").gte("ends_at", new Date().toISOString()).order("starts_at")).data ?? [] });
  const ex = useQuery({ queryKey: ["admin-exceptions"], queryFn: async () => (await supabase.from("calendar_exceptions").select("*").gte("day", new Date().toISOString().slice(0, 10)).order("day")).data ?? [] });
  const [b, setB] = useState({ from: "", fromTime: "08:00", to: "", toTime: "21:00", reason: "" });
  const [e, setE] = useState({ day: "", closed: true, open: "08:00", close: "18:00", note: "" });

  async function addBlock() {
    if (!b.from || !b.to) return toast.error("Informe as datas.");
    const starts = toTs(b.from, b.fromTime); const ends = toTs(b.to, b.toTime);
    if (ends <= starts) return toast.error("O fim precisa ser depois do início.");
    const { error } = await supabase.from("calendar_blocks").insert({ starts_at: starts, ends_at: ends, reason: b.reason || null });
    if (error) toast.error(friendlyError(error.message)); else { toast.success("Período bloqueado."); qc.invalidateQueries({ queryKey: ["admin-blocks"] }); }
  }
  async function addException() {
    if (!e.day) return toast.error("Informe a data.");
    if (!e.closed && e.close <= e.open) return toast.error("O encerramento precisa ser depois da abertura.");
    const { error } = await supabase.from("calendar_exceptions").upsert({ day: e.day, closed: e.closed, open_time: e.closed ? null : e.open, close_time: e.closed ? null : e.close, note: e.note || null });
    if (error) toast.error("Não foi possível salvar."); else { toast.success("Data especial salva."); qc.invalidateQueries({ queryKey: ["admin-exceptions"] }); }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section>
        <h2 className="text-2xl">Bloqueios, férias e folgas</h2>
        <p className="text-sm text-muted-foreground">Nenhum horário será oferecido neste período. Não é possível bloquear sobre um agendamento existente.</p>
        <div className="mt-3 grid gap-2 rounded-xl border border-border bg-card p-4 text-sm">
          <label className="flex flex-wrap items-center gap-2">De <input type="date" className={inp} value={b.from} onChange={(x) => setB({ ...b, from: x.target.value, to: b.to || x.target.value })} /><input type="time" className={inp} value={b.fromTime} onChange={(x) => setB({ ...b, fromTime: x.target.value })} /></label>
          <label className="flex flex-wrap items-center gap-2">Até <input type="date" className={inp} value={b.to} onChange={(x) => setB({ ...b, to: x.target.value })} /><input type="time" className={inp} value={b.toTime} onChange={(x) => setB({ ...b, toTime: x.target.value })} /></label>
          <input className={inp} placeholder="Motivo (opcional)" maxLength={120} value={b.reason} onChange={(x) => setB({ ...b, reason: x.target.value })} />
          <button onClick={addBlock} className="justify-self-start rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground">Bloquear</button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {(blocks.data ?? []).map((k) => (
            <li key={k.id} className="flex items-center justify-between rounded-lg bg-card p-3">
              <span>{fmt(k.starts_at)} → {fmt(k.ends_at)}{k.reason && ` · ${k.reason}`}</span>
              <button aria-label="Remover bloqueio" onClick={async () => { await supabase.from("calendar_blocks").delete().eq("id", k.id); qc.invalidateQueries({ queryKey: ["admin-blocks"] }); }}><Trash2 className="h-4 w-4 text-destructive" /></button>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h2 className="text-2xl">Datas especiais</h2>
        <p className="text-sm text-muted-foreground">Feche um dia específico ou defina um horário diferente só para ele.</p>
        <div className="mt-3 grid gap-2 rounded-xl border border-border bg-card p-4 text-sm">
          <input type="date" className={inp} value={e.day} onChange={(x) => setE({ ...e, day: x.target.value })} />
          <label className="flex items-center gap-2"><input type="checkbox" checked={e.closed} onChange={(x) => setE({ ...e, closed: x.target.checked })} />Fechado o dia todo</label>
          {!e.closed && <div className="flex gap-2"><input type="time" className={inp} value={e.open} onChange={(x) => setE({ ...e, open: x.target.value })} /><input type="time" className={inp} value={e.close} onChange={(x) => setE({ ...e, close: x.target.value })} /></div>}
          <input className={inp} placeholder="Observação (opcional)" maxLength={120} value={e.note} onChange={(x) => setE({ ...e, note: x.target.value })} />
          <button onClick={addException} className="justify-self-start rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground">Salvar data</button>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {(ex.data ?? []).map((d) => (
            <li key={d.day} className="flex items-center justify-between rounded-lg bg-card p-3">
              <span>{new Date(`${d.day}T12:00:00-03:00`).toLocaleDateString("pt-BR")} · {d.closed ? "Fechado" : `${hhmm(d.open_time)}–${hhmm(d.close_time)}`}{d.note && ` · ${d.note}`}</span>
              <button aria-label="Remover data" onClick={async () => { await supabase.from("calendar_exceptions").delete().eq("day", d.day); qc.invalidateQueries({ queryKey: ["admin-exceptions"] }); }}><Trash2 className="h-4 w-4 text-destructive" /></button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export function SettingsTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-settings"], queryFn: async () => (await supabase.from("settings").select("*").eq("id", 1).single()).data });
  if (q.isLoading || !q.data) return <Loader2 className="h-5 w-5 animate-spin" />;
  return <SettingsForm s={q.data} onSaved={() => { qc.invalidateQueries({ queryKey: ["admin-settings"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); }} />;
}

function SettingsForm({ s, onSaved }: { s: { deposit_percent: number; buffer_min: number; hold_minutes: number; slot_step_min: number }; onSaved: () => void }) {
  const [f, setF] = useState(s);
  const fields: [keyof typeof f, string, number, number][] = [
    ["deposit_percent", "Sinal (% do total)", 1, 100], ["buffer_min", "Intervalo entre atendimentos (min)", 0, 120],
    ["hold_minutes", "Tempo para pagar o Pix (min)", 5, 60], ["slot_step_min", "Horários oferecidos a cada (min)", 5, 120],
  ];
  async function save() {
    for (const [k, l, min, max] of fields) if (!Number.isInteger(f[k]) || f[k] < min || f[k] > max) return toast.error(`${l}: entre ${min} e ${max}.`);
    const { error } = await supabase.from("settings").update(f).eq("id", 1);
    if (error) toast.error("Não foi possível salvar."); else { toast.success("Ajustes salvos."); onSaved(); }
  }
  return (
    <section className="max-w-md space-y-3 rounded-xl border border-border bg-card p-5">
      {fields.map(([k, l, min, max]) => (
        <label key={k} className="flex items-center justify-between gap-3 text-sm">{l}<input type="number" min={min} max={max} className={`${inp} w-24`} value={f[k]} onChange={(e) => setF({ ...f, [k]: Number(e.target.value) })} /></label>
      ))}
      <button onClick={save} className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground">Salvar ajustes</button>
    </section>
  );
}
