import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { saveAdminBooking } from "@/lib/admin-booking.functions";
import { brl, fmtTime, friendlyError, localDay } from "@/lib/booking-rules";

type Booking = Database["public"]["Tables"]["bookings"]["Row"];
const input = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

export function BookingEditor({ booking, onClose }: { booking?: Booking; onClose: () => void }) {
  const qc = useQueryClient();
  const save = useServerFn(saveAdminBooking);
  const [name, setName] = useState(booking?.customer_name ?? "");
  const [phone, setPhone] = useState(booking?.customer_phone ?? "");
  const [email, setEmail] = useState(booking?.customer_email ?? "");
  const [day, setDay] = useState(localDay(booking ? new Date(booking.starts_at) : new Date()));
  const [time, setTime] = useState(booking ? fmtTime(booking.starts_at) : "08:00");
  const [serviceId, setServiceId] = useState(booking?.service_id ?? "");
  const [addonIds, setAddonIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const catalog = useQuery({ queryKey: ["admin-editor-catalog"], enabled: !booking, queryFn: async () => {
    const [services, addons] = await Promise.all([supabase.from("services").select("*").eq("active", true).order("sort"), supabase.from("addons").select("*").eq("active", true).order("sort")]);
    if (services.error) throw services.error;
    if (addons.error) throw addons.error;
    return { services: services.data, addons: addons.data };
  } });
  const service = catalog.data?.services.find((s) => s.id === serviceId);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await save({ data: { name, phone, email, startsAt: new Date(`${day}T${time}:00-03:00`).toISOString(), addonIds,
        ...(booking ? { id: booking.id } : { serviceId }) } });
      await Promise.all([qc.invalidateQueries({ queryKey: ["admin-bookings"] }), qc.invalidateQueries({ queryKey: ["slots"] }), qc.invalidateQueries({ queryKey: ["admin-audit"] })]);
      toast.success(booking ? "Agendamento atualizado." : "Agendamento manual cadastrado. Nenhuma cobrança foi criada.");
      onClose();
    } catch (err) { toast.error(friendlyError(err instanceof Error ? err.message : "")); }
    finally { setBusy(false); }
  }

  return <form onSubmit={submit} className="grid gap-4">
    {!booking && <>
      <label className="grid gap-1 text-sm">Serviço<select required className={input} value={serviceId} onChange={(e) => { setServiceId(e.target.value); setAddonIds([]); }}><option value="">Selecionar serviço</option>{catalog.data?.services.map((s) => <option key={s.id} value={s.id}>{s.name} · {brl(s.price_cents)} · {s.duration_min} min</option>)}</select></label>
      {service?.allows_addons && <fieldset className="grid gap-2 text-sm"><legend className="mb-2">Adicionais</legend>{catalog.data?.addons.map((a) => <label key={a.id} className="flex items-center gap-2"><input type="checkbox" checked={addonIds.includes(a.id)} onChange={(e) => setAddonIds(e.target.checked ? [...addonIds, a.id] : addonIds.filter((id) => id !== a.id))} />{a.name} · {brl(a.price_cents)}</label>)}</fieldset>}
    </>}
    {booking && <p className="text-sm text-muted-foreground">{booking.service_name} · {booking.duration_min} min · {brl(booking.total_cents)}</p>}
    <label className="grid gap-1 text-sm">Nome da cliente<input className={input} required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></label>
    <label className="grid gap-1 text-sm">WhatsApp<input className={input} required type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} /></label>
    <label className="grid gap-1 text-sm">E-mail (opcional)<input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm">Data<input className={input} required type="date" value={day} onChange={(e) => setDay(e.target.value)} /></label><label className="grid gap-1 text-sm">Horário<input className={input} required type="time" value={time} onChange={(e) => setTime(e.target.value)} /></label></div>
    <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={onClose}>Voltar</Button><Button disabled={busy || (!booking && !serviceId)} type="submit">{busy ? <Loader2 className="animate-spin" /> : <Save />}Salvar</Button></div>
  </form>;
}