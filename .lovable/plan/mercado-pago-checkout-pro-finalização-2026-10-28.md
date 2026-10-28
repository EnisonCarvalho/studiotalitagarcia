# Mercado Pago Checkout Pro — finalização

Boa parte já está pronta: a reserva temporária sem conflito de horários, o endereço que recebe os avisos de pagamento, a verificação de assinatura e a confirmação somente após a aprovação. Este plano fecha o que falta.

## O que muda para a cliente
- A página de pagamento terá um botão principal, **"Pagar sinal (Pix ou cartão)"**, que abre o Checkout Pro do Mercado Pago. Lá ela escolhe Pix ou cartão de crédito.
- O Pix direto na página (com QR code) continua como alternativa rápida.
- Ao voltar do Mercado Pago, a página consulta o status real do pagamento. A confirmação só aparece se o pagamento foi aprovado. Pendente, recusado ou cancelado não confirma a reserva.
- Um pagamento recusado no cartão não derruba a reserva: a cliente pode tentar de novo até o tempo do horário acabar.

## Segurança e regras (já implementadas, serão revisadas e testadas)
- O token do Mercado Pago só é usado no servidor.
- Cada aviso recebido tem a assinatura conferida com a chave secreta. Depois, o pagamento é consultado na API do Mercado Pago e ligado à reserva pelo código dela.
- Sem confirmação duplicada: avisos repetidos não alteram uma reserva já confirmada.
- Dois clientes não conseguem pegar o mesmo horário, porque o próprio banco bloqueia a sobreposição.
- Se um pagamento for aprovado depois que o horário expirou e já foi ocupado por outra cliente, a reserva fica marcada para a Talita resolver (remarcar ou estornar) e não gera conflito.

## Credenciais
- Vou pedir, num formulário seguro, o **Access Token** de produção e a **assinatura secreta do webhook**. Os dois ficam em Mercado Pago Developers → Suas integrações.

## URL do webhook para cadastrar
`https://studiotalitagarcia.lovable.app/api/public/mercadopago`
- No painel do Mercado Pago, marque o evento **Pagamentos**.
- Ela só funciona depois que o site for publicado com esta versão.

## Testes antes de concluir
- Aviso com assinatura inválida → recusado.
- Aviso de pagamento pendente → reserva continua aguardando.
- Pagamento aprovado → confirmado uma única vez, mesmo com aviso repetido.
- Tentativa de reservar um horário já ocupado → recusada.
- Teste real de ponta a ponta no Checkout Pro, depois que as credenciais forem salvas.

## Detalhes técnicos
- Renomear `mpCreateCardCheckout` → `mpCreateCheckoutPro`; remover a exclusão de `bank_transfer` (Pix) em `payment_methods`, mantendo boleto e lotérica excluídos (o sinal precisa compensar dentro da reserva); `installments: 1`.
- Na tela `/agendamento/$id`: o Checkout Pro vira o botão principal e o Pix direto passa a ser secundário. `getBookingStatus` já consulta `/v1/payments/search?external_reference=`.
- O webhook `/api/public/mercadopago` continua igual (HMAC `x-signature` + `x-request-id`, `mpGetPayment`, `apply_payment_status` restrito ao service role). Fazer o webhook aceitar também `topic=payment&id=` no formato antigo das notificações.
- Atualizar o roadmap com esta tarefa.
