# Agendamento online — Studio Talita Garcia

O site atual continua igual (fotos, textos, cores, depoimentos). Adicionamos o agendamento real com sinal via Pix (Mercado Pago) e um painel para a Talita.

## O que já existe
- Página única com serviços, galeria, depoimentos, mapa e botões de WhatsApp.
- Ainda não há banco de dados, login nem pagamento — tudo isso será criado.

## Para a cliente
1. Botão "Agendar meu horário" em destaque no topo, nos serviços e fixo no rodapé do celular (sem cobrir conteúdo).
2. Página "Agendar": escolhe categoria e serviço, adicionais de decoração (só em unhas), vê preço, duração e total. Bloqueia combinações acima de 120 min com aviso claro.
3. Escolhe data no calendário e só vê horários realmente livres.
4. Informa nome, WhatsApp e e-mail.
5. Revisa: serviço, adicionais, data/hora, duração, total, sinal de 50% e saldo.
6. Paga o sinal por Pix (QR code e copia-e-cola) — o horário fica reservado por 15 minutos.
7. Só após o Mercado Pago confirmar o pagamento aparece a tela de sucesso, com botão para enviar a confirmação pelo WhatsApp.

## Painel da Talita (login com talitaewelin02@gmail.com)
- Agenda do dia, da semana e do mês; aguardando pagamento, confirmados, cancelados e histórico.
- Detalhes de cada agendamento (cliente, WhatsApp, serviço, valores) e cancelamento.
- Serviços: editar nome, preço, duração (1–120 min), ativar/desativar; adicionais e seus preços/durações; percentual do sinal.
- Horários: por dia da semana, pausas, folgas, férias, datas especiais, bloqueios manuais e intervalo entre atendimentos.
- Horário inicial: seg–sex 08:00–21:00, sáb e dom 08:00–20:00 (editável).

## Preços e durações
Todos os 32 serviços e 4 adicionais exatamente como no seu documento. Adicionais com faixa começam no menor valor e a Talita ajusta.

## O que vou precisar de você
- Uma conta Mercado Pago e o **Access Token** de produção (eu peço num formulário seguro na hora certa) e cadastrar o endereço de notificação que eu vou fornecer.
- Até isso, o fluxo funciona até a etapa de pagamento, mas nenhuma reserva será confirmada.

## Detalhes técnicos
- Lovable Cloud: tabelas services, addons, service_addons, settings (sinal %, intervalo, expiração), business_hours, calendar_exceptions/blocks, bookings (tstzrange + exclusion constraint `EXCLUDE USING gist` em status pending/confirmed para impedir sobreposição), payments, booking_events; user_roles + has_role para admin.
- Criação da reserva em função SQL transacional que revalida duração ≤ 120, horário de funcionamento, bloqueios e conflitos; reservas pendentes expiradas ignoradas/liberadas.
- Valores em centavos; sinal = round(total × % / 100), saldo = total − sinal; testes vitest das regras.
- Mercado Pago: createServerFn cria pagamento Pix (idempotency key); webhook em /api/public/mercadopago valida assinatura x-signature e consulta o pagamento na API antes de confirmar; idempotente.
- Fuso America/Fortaleza; rotas /agendar, /agendamento/$id, /auth, /_authenticated/admin/*.
