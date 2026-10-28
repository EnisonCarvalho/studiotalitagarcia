import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Componente oficial do Mercado Pago (Payment Brick) para cartão de crédito.
// O SDK tokeniza o cartão no navegador: número e CVV nunca passam pelo nosso servidor.

type BrickFormData = {
  token: string;
  payment_method_id: string;
  issuer_id?: string | number;
  installments: number;
  payer?: { email?: string; identification?: { type?: string; number?: string } };
};

export function CardPaymentBrick(props: {
  publicKey: string;
  amountCents: number;
  onSubmit: (data: BrickFormData) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [mod, setMod] = useState<typeof import("@mercadopago/sdk-react") | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    import("@mercadopago/sdk-react")
      .then((m) => {
        if (!alive) return;
        m.initMercadoPago(props.publicKey, { locale: "pt-BR" });
        setMod(m);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [props.publicKey]);

  if (failed) return <p className="text-sm text-muted-foreground">Não foi possível carregar o pagamento com cartão. Tente o Pix.</p>;
  if (!mod) return <p className="flex justify-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando pagamento com cartão…</p>;

  const Payment = mod.Payment;
  return (
    <Payment
      initialization={{ amount: props.amountCents / 100 }}
      customization={{
        paymentMethods: { creditCard: "all", maxInstallments: 1 },
        visual: { style: { theme: "default" } },
      }}
      onSubmit={async ({ formData }) => {
        await props.onSubmit(formData as BrickFormData);
      }}
      onError={(e) => {
        console.error("brick error", e);
        props.onError("Não foi possível carregar o pagamento com cartão. Tente o Pix.");
      }}
      onReady={() => undefined}
    />
  );
}
