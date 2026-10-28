import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { isValidDuration, MAX_DURATION_MIN } from "@/lib/booking-rules";

const inp = "w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm";
const toCents = (v: string) => Math.round(parseFloat(v.replace(",", ".")) * 100);
const fromCents = (c: number) => (c / 100).toFixed(2).replace(".", ",");

type Svc = { id?: string; name: string; category: string; description: string | null; price_cents: number; duration_min: number; allows_addons: boolean; active: boolean; sort: number };

function validate(name: string, priceCents: number, duration: number) {
  if (!name.trim()) return "Informe o nome.";
  if (!Number.isFinite(priceCents) || priceCents <= 0) return "Informe um preço válido.";
  if (!isValidDuration(duration)) return `A duração deve ficar entre 1 e ${MAX_DURATION_MIN} minutos.`;
  return null;
}

export function ServicesTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-services"], queryFn: async () => (await supabase.from("services").select("*").order("sort")).data ?? [] });
  const [adding, setAdding] = useState(false);
  if (q.isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-services"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };
  const maxSort = Math.max(0, ...(q.data ?? []).map((s) => s.sort));
  return (
    <section className="space-y-2">
      <p className="text-sm text-muted-foreground">Edite e clique em Salvar. Duração máxima: {MAX_DURATION_MIN} min. "Adicionais" libera as decorações de unhas.</p>
      {(q.data ?? []).map((s) => <ServiceRow key={s.id} s={s} onSaved={refresh} />)}
      {adding ? <ServiceRow s={{ name: "", category: "", description: null, price_cents: 0, duration_min: 30, allows_addons: false, active: true, sort: maxSort + 1 }} onSaved={() => { setAdding(false); refresh(); }} />
        : <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm text-primary"><Plus className="h-4 w-4" />Novo serviço</button>}
    </section>
  );
}

function ServiceRow({ s, onSaved }: { s: Svc; onSaved: () => void }) {
  const [f, setF] = useState({ ...s, price: s.price_cents ? fromCents(s.price_cents) : "" });
  const [busy, setBusy] = useState(false);
  async function save() {
    const price_cents = toCents(f.price); const duration = Number(f.duration_min);
    const err = validate(f.name, price_cents, duration) ?? (!f.category.trim() ? "Informe a categoria." : null);
    if (err) return toast.error(err);
    setBusy(true);
    const row = { name: f.name.trim(), category: f.category.trim(), description: f.description || null, price_cents, duration_min: duration, allows_addons: f.allows_addons, active: f.active, sort: f.sort };
    const { error } = s.id ? await supabase.from("services").update(row).eq("id", s.id) : await supabase.from("services").insert(row);
    setBusy(false);
    if (error) toast.error("Não foi possível salvar."); else { toast.success("Serviço salvo."); onSaved(); }
  }
  return (
    <div className="grid items-center gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-[2fr_1.6fr_0.8fr_0.7fr_auto_auto_auto]">
      <input aria-label="Nome" className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nome" />
      <input aria-label="Categoria" className={inp} value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Categoria" />
      <label className="flex items-center gap-1 text-xs">R$<input aria-label="Preço" className={inp} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
      <label className="flex items-center gap-1 text-xs"><input aria-label="Duração em minutos" className={inp} type="number" min={1} max={MAX_DURATION_MIN} value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: Number(e.target.value) })} />min</label>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.allows_addons} onChange={(e) => setF({ ...f, allows_addons: e.target.checked })} />Adicionais</label>
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Ativo</label>
      <button onClick={save} disabled={busy} className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground disabled:opacity-50">{busy ? "…" : "Salvar"}</button>
    </div>
  );
}

type Addon = { id?: string; name: string; price_cents: number; duration_min: number; range_note: string | null; active: boolean; sort: number };

export function AddonsTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-addons"], queryFn: async () => (await supabase.from("addons").select("*").order("sort")).data ?? [] });
  const [adding, setAdding] = useState(false);
  if (q.isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-addons"] }); qc.invalidateQueries({ queryKey: ["catalog"] }); };
  return (
    <section className="space-y-2">
      <p className="text-sm text-muted-foreground">Adicionais aparecem só nos serviços marcados com "Adicionais". Para itens com faixa de valor, defina aqui o preço e a duração que a cliente verá.</p>
      {(q.data ?? []).map((a) => <AddonRow key={a.id} a={a} onSaved={refresh} />)}
      {adding ? <AddonRow a={{ name: "", price_cents: 0, duration_min: 10, range_note: null, active: true, sort: 99 }} onSaved={() => { setAdding(false); refresh(); }} />
        : <button onClick={() => setAdding(true)} className="flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm text-primary"><Plus className="h-4 w-4" />Novo adicional</button>}
    </section>
  );
}

function AddonRow({ a, onSaved }: { a: Addon; onSaved: () => void }) {
  const [f, setF] = useState({ ...a, price: a.price_cents ? fromCents(a.price_cents) : "" });
  const [busy, setBusy] = useState(false);
  async function save() {
    const price_cents = toCents(f.price); const duration = Number(f.duration_min);
    const err = validate(f.name, price_cents, duration);
    if (err) return toast.error(err);
    setBusy(true);
    const row = { name: f.name.trim(), price_cents, duration_min: duration, active: f.active, sort: f.sort, range_note: f.range_note };
    const { error } = a.id ? await supabase.from("addons").update(row).eq("id", a.id) : await supabase.from("addons").insert(row);
    setBusy(false);
    if (error) toast.error("Não foi possível salvar."); else { toast.success("Adicional salvo."); onSaved(); }
  }
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="grid items-center gap-2 md:grid-cols-[2fr_0.8fr_0.7fr_auto_auto]">
        <input aria-label="Nome" className={inp} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Nome" />
        <label className="flex items-center gap-1 text-xs">+R$<input aria-label="Preço" className={inp} inputMode="decimal" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></label>
        <label className="flex items-center gap-1 text-xs">+<input aria-label="Duração adicional" className={inp} type="number" min={1} max={MAX_DURATION_MIN} value={f.duration_min} onChange={(e) => setF({ ...f, duration_min: Number(e.target.value) })} />min</label>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Ativo</label>
        <button onClick={save} disabled={busy} className="rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground disabled:opacity-50">{busy ? "…" : "Salvar"}</button>
      </div>
      {a.range_note && <p className="mt-2 text-xs text-muted-foreground">{a.range_note}</p>}
    </div>
  );
}
