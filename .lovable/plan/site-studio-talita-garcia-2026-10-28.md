# Site Studio Talita Garcia

Página única (landing page) em português, focada em levar a visitante ao agendamento pelo WhatsApp, seguindo o briefing enviado.

## Seções (na ordem)
1. **Cabeçalho fixo** — logo (texto elegante até a logo oficial ser enviada), links Início, Sobre, Serviços, Resultados, Depoimentos, Contato, botão "Agendar pelo WhatsApp". Menu compacto no celular.
2. **Início** — "STUDIO TALITA GARCIA", título "Realce sua beleza. Valorize quem você é.", descrição, botão "Agendar meu horário" e os três diferenciais com ícones finos. Foto da Talita ao lado.
3. **Conheça a Talita** — duas fotos lado a lado (retrato + espaço do studio), "Prazer, sou a Talita!", subtítulo, texto inicial, um parágrafo neutro editável (sem inventar história), frase final e assinatura "Talita Garcia" em estilo manuscrito.
4. **Nossos Serviços** — 4 cards (Cílios, Sobrancelhas, Unhas, Depilação) com foto, descrição, "Saiba mais" e botão WhatsApp com mensagem personalizada por serviço.
5. **Resultados reais** — galeria em mosaico com filtros por categoria, ampliação ao clicar e botão "Quero um resultado assim" (mensagem conforme a categoria).
6. **Depoimentos** — sem depoimentos inventados: área pronta para preenchimento futuro, com convite para clientes compartilharem pelo Instagram/WhatsApp.
7. **Chamada final** — "Você merece esse momento." com botão grande "Agendar pelo WhatsApp".
8. **Rodapé** — logo, breve descrição, WhatsApp (+55 85 93300-5196), Instagram @studio_talitagarcia, links das seções. Endereço e horários ficam de fora até serem informados.
9. **Botão flutuante do WhatsApp** discreto em todas as telas.

## Visual
- Paleta exata do briefing (off-white, bege, rosé, nude, rosé queimado, marrom, branco quente).
- Títulos em serifa editorial (Cormorant Garamond), textos em sem serifa moderna (Karla), assinatura em fonte manuscrita.
- Cantos levemente arredondados, muito espaço em branco, animações suaves de entrada que respeitam a opção "reduzir movimento".

## Fotografias
Nenhuma foto foi enviada ainda. Até você enviar, cada lugar de foto mostra um espaço elegante em tom nude com a indicação do que deve ir ali (ex.: "Retrato da Talita"). Não usarei modelos ou imagens geradas no lugar das suas fotos. Quando enviar, eu distribuo cada imagem na seção certa.

## Google e compartilhamento
Título e descrição da página, um único título principal, textos alternativos nas imagens, prévia para redes sociais e dados de negócio local apenas com nome, WhatsApp e Instagram (endereço só quando informado).

## Detalhes técnicos
- Página única em `src/routes/index.tsx` com seções ancoradas (pedido explícito de landing page), componentes por seção em `src/components/site/`.
- Conteúdo editável centralizado em `src/content/site.ts` (textos, serviços, mensagens, fotos, depoimentos).
- Helper `whatsappLink(msg)` → `https://wa.me/5585933005196?text=` + `encodeURIComponent`; teste unitário garantindo número e codificação.
- Tokens de cor oklch em `src/styles.css`; fontes via `<link>` no root; lightbox com Dialog do shadcn.
- Observação: o briefing cita Hostinger Horizons, mas o site será construído aqui e pode ser publicado pelo Lovable.
