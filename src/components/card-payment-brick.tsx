import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// Componente oficial do Mercado Pago (Payment Brick) para cartão de crédito.
// O SDK tokeniza o cartão no navegador: número e CVV nunca passam pelo nosso servidor.
// O Brick reinicializa sempre que recebe novos objetos/callbacks; por isso as props
// repassadas ao SDK são estáveis (useMemo + refs) e o componente é memoizado.

type BrickFormData = {
  token: string;
  payment_method_id: string;
  issuer_id?: string | number;
  installments: number;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
};

type SdkModule = typeof import("@mercadopago/sdk-react");
let sdkPromise: Promise<SdkModule> | null = null;
let initializedKey: string | null = null;
function loadSdk(publicKey: string) {
  sdkPromise ??= import("@mercadopago/sdk-react");
  return sdkPromise.then((m) => {
    if (initializedKey !== publicKey) {
      m.initMercadoPago(publicKey, { locale: "pt-BR" });
      initializedKey = publicKey;
    }
    return m;
  });
}

const CUSTOMIZATION = {
  paymentMethods: { creditCard: "all", maxInstallments: 1 },
  visual: { style: { theme: "default" } },
} as const;

export const CardPaymentBrick = memo(function CardPaymentBrick(props: {
  publicKey: string;
  amountCents: number;
  onSubmit: (data: BrickFormData) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [mod, setMod] = useState<SdkModule | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const submitRef = useRef(props.onSubmit);
  const errorRef = useRef(props.onError);
  submitRef.current = props.onSubmit;
  errorRef.current = props.onError;

  useEffect(() => {
    let alive = true;
    loadSdk(props.publicKey)
      .then((m) => alive && setMod(() => m))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [props.publicKey]);

  // Desmonta a instância do Brick ao sair da aba de cartão.
  useEffect(() => () => {
    const w = window as unknown as { paymentBrickController?: { unmount: () => void } };
    try { w.paymentBrickController?.unmount(); } catch { /* já desmontado */ }
  }, []);

  const initialization = useMemo(() => ({ amount: props.amountCents / 100 }), [props.amountCents]);
  const handlers = useMemo(() => ({
    onSubmit: async ({ formData }: { formData: unknown }) => { await submitRef.current(formData as BrickFormData); },
    onError: () => errorRef.current("Não foi possível carregar o pagamento com cartão. Tente o Pix."),
    onReady: () => setReady(true),
  }), []);

  if (failed) return <p className="text-sm text-muted-foreground">Não foi possível carregar o pagamento com cartão. Tente o Pix.</p>;
  const Payment = mod?.Payment;
  return (
    <div className="min-h-[420px]">
      {!ready && <p className="flex justify-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando pagamento com cartão…</p>}
      {Payment && (
        <Payment
          initialization={initialization}
          customization={CUSTOMIZATION as never}
          onSubmit={handlers.onSubmit as never}
          onError={handlers.onError}
          onReady={handlers.onReady}
        />
      )}
    </div>
  );
});
