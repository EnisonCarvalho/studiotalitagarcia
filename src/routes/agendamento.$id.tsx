import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, Copy, CreditCard, Loader2, MessageCircle, XCircle } from "lucide-react";
import { createCardPayment, createPixPayment, getBookingStatus, getPaymentConfig } from "@/lib/booking.functions";
import { brl, fmtDateTime } from "@/lib/booking-rules";
import { ADDRESS, LOGO, whatsappLink } from "@/content/site";
import { CardPaymentBrick } from "@/components/card-payment-brick";

export const Route = createFileRoute("/agendamento/$id")({
  head: () => ({
    meta: [
      { title: "Seu agendamento | Studio Talita Garcia" },
      { name: "description", content: "Acompanhe o pagamento do sinal e a confirmação do seu horário no Studio Talita Garcia." },
      { property: "og:title", content: "Seu agendamento | Studio Talita Garcia" },
      { property: "og:description", content: "Pagamento do sinal e confirmação do agendamento." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: Status,
});

function Status() {
  const { id } = Route.useParams();
  const fetchStatus = useServerFn(getBookingStatus);
  const createPix = useServerFn(createPixPayment);
  const payCardFn = useServerFn(createCardPayment);
  const fetchConfig = useServerFn(getPaymentConfig);
  const [method, setMethod] = useState<"pix" | "card">("pix");
  const [cardBusy, setCardBusy] = useState(false);
  const [cardErr, setCardErr] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  useEffect(() => { fetchConfig().then((c) => setPublicKey(c.publicKey)).catch(() => setPublicKey(null)); }, []);
  const [pixErr, setPixErr] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());

  const q = useQuery({
    queryKey: ["booking", id],
    queryFn: () => fetchStatus({ data: { id } }),
    refetchInterval: (query) => (query.state.data?.status === "pending" ? 5000 : false),
  });
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const b = q.data;
  const [autoTried, setAutoTried] = useState(false);
  useEffect(() => {
    if (b && b.status === "pending" && !b.pix_qr_code && !autoTried) { setAutoTried(true); retryPix(); }
  }, [b, autoTried]);
  async function retryPix() {
    setRetrying(true); setPixErr(null);
    const r = await createPix({ data: { id } }).catch(() => ({ ok: false as const, error: "Falha de conexão. Tente novamente." }));
    if (!r.ok) setPixErr(r.error);
    await q.refetch(); setRetrying(false);
  }

  const shell = (children: ReactNode) => (
    <div className="min-h-screen px-5 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="mb-8 flex justify-center"><img src={LOGO} alt="Studio Talita Garcia" className="h-20 w-20" /></Link>
        {children}
      </div>
    </div>
  );

  if (q.isLoading) return shell(<p className="flex justify-center gap-2 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando…</p>);
  if (!b) return shell(<p className="text-center">Agendamento não encontrado. <Link to="/agendar" className="text-primary underline">Agendar</Link></p>);

  const details = (
    <dl className="mt-6 divide-y divide-border rounded-xl border border-border bg-card text-sm">
      {[["Procedimento", b.service_name + ((b.addons as { name: string }[]).length ? ` + ${(b.addons as { name: string }[]).map((a) => a.name).join(", ")}` : "")],
        ["Data e horário", fmtDateTime(b.starts_at)], ["Duração", `${b.duration_min} min`], ["Valor total", brl(b.total_cents)],
        ["Sinal", brl(b.deposit_cents)], ["Restante no atendimento", brl(b.balance_cents)]].map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 p-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>
      ))}
    </dl>
  );

  if (b.status === "confirmed") {
    const msg = `Olá, Talita! Meu agendamento está confirmado: ${b.service_name}, ${fmtDateTime(b.starts_at)}. Sinal pago: ${brl(b.deposit_cents)}. Restante: ${brl(b.balance_cents)}. Nome: ${b.customer_name}.`;
    return shell(
      <div className="text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-primary" strokeWidth={1.3} />
        <h1 className="mt-4 text-4xl">Agendamento confirmado!</h1>
        <p className="mt-2 text-muted-foreground">{b.customer_name}, recebemos seu sinal de {brl(b.deposit_cents)}. O restante de {brl(b.balance_cents)} é pago no atendimento.</p>
        <div className="text-left">{details}</div>
        <p className="mt-4 text-sm text-muted-foreground">Endereço: {ADDRESS}. Chegue com alguns minutos de antecedência.</p>
        <a href={whatsappLink(msg)} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-full bg-cta px-7 py-3.5 font-semibold text-cta-foreground"><MessageCircle className="h-5 w-5" />Enviar confirmação pelo WhatsApp</a>
      </div>,
    );
  }

  if (b.status !== "pending") {
    return shell(
      <div className="text-center">
        <XCircle className="mx-auto h-14 w-14 text-muted-foreground" strokeWidth={1.3} />
        <h1 className="mt-4 text-4xl">{b.status === "expired" ? "O tempo da reserva acabou" : "Reserva não confirmada"}</h1>
        <p className="mt-2 text-muted-foreground">{b.payment_status === "approved_conflict" ? "Seu pagamento chegou depois que o horário foi liberado. Fale com a Talita pelo WhatsApp para remarcar ou receber o estorno." : "O pagamento não foi concluído e o horário foi liberado. Você pode escolher outro horário."}</p>
        <Link to="/agendar" className="mt-6 inline-flex rounded-full bg-cta px-7 py-3.5 font-semibold text-cta-foreground">Escolher outro horário</Link>
      </div>,
    );
  }

  const left = b.hold_expires_at ? Math.max(0, new Date(b.hold_expires_at).getTime() - now) : 0;
  const mm = String(Math.floor(left / 60000)).padStart(2, "0"); const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");

  return shell(
    <div>
      <h1 className="text-center text-4xl">Pague o sinal</h1>
      <p className="mt-2 text-center text-muted-foreground">Horário reservado por <strong className="text-foreground">{mm}:{ss}</strong>. Aguardando pagamento…</p>
      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <p className="text-center text-2xl font-semibold text-primary">{brl(b.deposit_cents)}</p>
        <div className="mt-4 grid grid-cols-2 gap-2 rounded-full border border-border p-1" role="tablist" aria-label="Forma de pagamento">
          <button role="tab" aria-selected={method === "pix"} onClick={() => setMethod("pix")} className={`rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${method === "pix" ? "bg-cta text-cta-foreground" : "text-muted-foreground"}`}>Pix</button>
          <button role="tab" aria-selected={method === "card"} onClick={() => setMethod("card")} className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-colors ${method === "card" ? "bg-cta text-cta-foreground" : "text-muted-foreground"}`}><CreditCard className="h-4 w-4" />Cartão</button>
        </div>
        {method === "pix" ? (
          <div className="mt-5 text-center">
            {b.pix_qr_code ? (
              <>
                {b.pix_qr_base64 && <img src={`data:image/png;base64,${b.pix_qr_base64}`} alt="QR code Pix" className="mx-auto h-56 w-56" />}
                <button onClick={() => { navigator.clipboard.writeText(b.pix_qr_code!); setCopied(true); }} className="mt-4 inline-flex items-center gap-2 rounded-full border border-primary px-5 py-2.5 text-sm text-primary">
                  <Copy className="h-4 w-4" />{copied ? "Código copiado!" : "Copiar código Pix"}
                </button>
                <p className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Aguardando pagamento — a confirmação aparece aqui automaticamente.</p>
              </>
            ) : pixErr ? (
              <p className="text-sm text-muted-foreground">{pixErr}</p>
            ) : (
              <button onClick={retryPix} disabled={retrying} className="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline disabled:opacity-50">{retrying && <Loader2 className="h-4 w-4 animate-spin" />}Gerar QR code Pix</button>
            )}
          </div>
        ) : (
          <div className="mt-5">
            {publicKey ? (
              <CardPaymentBrick
                publicKey={publicKey}
                amountCents={b.deposit_cents}
                onSubmit={async (form) => {
                  setCardBusy(true); setCardErr(null);
                  const r = await payCardFn({
                    data: {
                      id, token: form.token, paymentMethodId: form.payment_method_id, issuerId: form.issuer_id, installments: form.installments,
                      payerEmail: form.payer?.email, identificationType: form.payer?.identification?.type, identificationNumber: form.payer?.identification?.number,
                    },
                  }).catch(() => ({ ok: false as const, error: "Falha de conexão. Tente novamente." }));
                  if (r.ok) await q.refetch(); else setCardErr(r.error);
                  setCardBusy(false);
                }}
                onError={(m) => setCardErr(m)}
              />
            ) : (
              <p className="text-center text-sm text-muted-foreground">O pagamento com cartão ainda não foi ativado pelo studio. Use o Pix ou fale conosco pelo WhatsApp.</p>
            )}
            {cardBusy && <p className="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Processando pagamento…</p>}
            {cardErr && <p role="alert" className="mt-3 text-center text-sm">{cardErr}</p>}
          </div>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">Pagamento seguro pelo Mercado Pago, sem sair desta página.</p>
      </div>
      {details}
    </div>,
  );
}
