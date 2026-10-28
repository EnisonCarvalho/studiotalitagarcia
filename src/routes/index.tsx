import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { catalogQuery } from "@/lib/catalog-query";
import { brl } from "@/lib/booking-rules";
import { CalendarHeart } from "lucide-react";
import { useState } from "react";
import { MapPin, Heart, Sparkles, Flower2, Menu, X, MessageCircle, Instagram, Camera } from "lucide-react";
import {
  ADDRESS, LOGO, MAPS_EMBED, MAPS_URL, GENERAL_MESSAGE, INSTAGRAM_HANDLE, INSTAGRAM_URL, WHATSAPP_DISPLAY, WHATSAPP_NUMBER,
  gallery, photos, serviceMessage, services, whatsappLink,
  type Category, type Photo,
} from "@/content/site";
import { Testimonials } from "@/components/testimonials";

const TITLE = "Studio Talita Garcia | Cílios, Sobrancelhas, Unhas e Depilação";
const DESC = "Studio de beleza com extensão de cílios, design de sobrancelhas, manicure, unhas em gel e acrílico e depilação. Agende pelo WhatsApp.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org", "@type": "BeautySalon", name: "Studio Talita Garcia",
        telephone: `+${WHATSAPP_NUMBER}`, sameAs: [INSTAGRAM_URL],
        address: { "@type": "PostalAddress", streetAddress: "Rua Morada Nova, 142", addressLocality: "Fortaleza", addressRegion: "CE", addressCountry: "BR" },
      }),
    }],
  }),
  component: Index,
});

const nav = [["Início", "inicio"], ["Sobre", "sobre"], ["Serviços", "servicos"], ["Preços", "precos"], ["Resultados", "resultados"], ["Depoimentos", "depoimentos"], ["Contato", "contato"]];
const cta = "inline-flex items-center justify-center gap-2 rounded-full bg-cta px-7 py-3.5 text-base font-semibold text-cta-foreground shadow-md transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";
const btn = "inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium tracking-wide text-primary-foreground transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function Img({ photo, className = "" }: { photo: Photo; className?: string }) {
  if (photo.src) return <img src={photo.src} alt={photo.alt} loading="lazy" className={`h-full w-full rounded-xl object-cover ${className}`} />;
  return (
    <div role="img" aria-label={photo.alt} className={`flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blush to-nude text-foreground/60 ${className}`}>
      <Camera className="h-6 w-6" strokeWidth={1.2} />
      <span className="text-xs uppercase tracking-[0.2em]">{photo.label}</span>
    </div>
  );
}

function Logo({ className = "h-12 w-12" }: { className?: string }) {
  return (
    <a href="#inicio" aria-label="Studio Talita Garcia — início" className="shrink-0 leading-none">
      <img src={LOGO} alt="Logo do Studio Talita Garcia" className={className} />
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Logo />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
          {nav.map(([l, id]) => <a key={id} href={`#${id}`} className="text-sm hover:text-primary">{l}</a>)}
          <Link to="/agendar" className={`${cta} px-5 py-2.5 text-sm`}><CalendarHeart className="h-4 w-4" />Agendar meu horário</Link>
        </nav>
        <button className="p-2 lg:hidden" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav className="flex flex-col gap-1 border-t border-border px-5 pb-5 lg:hidden" aria-label="Menu móvel">
          {nav.map(([l, id]) => <a key={id} href={`#${id}`} onClick={() => setOpen(false)} className="py-3 text-base">{l}</a>)}
          <Link to="/agendar" className={`${cta} mt-2`}><CalendarHeart className="h-4 w-4" />Agendar meu horário</Link>
        </nav>
      )}
    </header>
  );
}

function SectionTitle({ eyebrow, title, sub }: { eyebrow?: string; title: string; sub: string }) {
  return (
    <div className="mx-auto mb-12 max-w-2xl text-center">
      {eyebrow && <p className="mb-3 text-xs uppercase tracking-[0.3em] text-primary">{eyebrow}</p>}
      <h2 className="text-4xl md:text-5xl">{title}</h2>
      <p className="mt-4 text-muted-foreground">{sub}</p>
    </div>
  );
}

function Prices() {
  const { data } = useQuery(catalogQuery);
  const groups = new Map<string, NonNullable<typeof data>["services"]>();
  for (const s of data?.services ?? []) groups.set(s.category, [...(groups.get(s.category) ?? []), s]);
  return (
    <section id="precos" className="scroll-mt-20 px-5 pb-24">
      <SectionTitle eyebrow="Preços" title="Tabela de valores" sub="Escolha seu procedimento e agende online com sinal via Pix." />
      {!data && <p className="text-center text-muted-foreground">Carregando valores…</p>}
      <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[...groups.entries()].map(([cat, list]) => (
          <div key={cat} className="rounded-xl bg-card p-6">
            <h3 className="text-2xl text-primary">{cat}</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {list.map((s) => <li key={s.id} className="flex justify-between gap-3 border-b border-border/60 pb-2"><span>{s.name}</span><span className="font-medium whitespace-nowrap">{brl(s.price_cents)}</span></li>)}
            </ul>
          </div>
        ))}
        {data && data.addons.length > 0 && (
          <div className="rounded-xl bg-card p-6">
            <h3 className="text-2xl text-primary">Decoração de unhas</h3>
            <p className="text-xs text-muted-foreground">Adicional aos serviços de unhas</p>
            <ul className="mt-4 space-y-2 text-sm">
              {data.addons.map((a) => <li key={a.id} className="flex justify-between gap-3 border-b border-border/60 pb-2"><span>{a.name}</span><span className="font-medium whitespace-nowrap">+ {brl(a.price_cents)}</span></li>)}
            </ul>
          </div>
        )}
      </div>
      <div className="mt-10 text-center"><Link to="/agendar" className={cta}><CalendarHeart className="h-5 w-5" />Agendar meu horário</Link></div>
    </section>
  );
}

function Gallery() {
  const cats = ["Todos", ...Array.from(new Set(gallery.map((g) => g.category)))] as ("Todos" | Category)[];
  const [cat, setCat] = useState<"Todos" | Category>("Todos");
  const [zoom, setZoom] = useState<number | null>(null);
  const items = gallery.filter((g) => cat === "Todos" || g.category === cat);
  const term = cat === "Todos" ? null : services.find((s) => s.title === cat)?.term;
  return (
    <section id="resultados" className="scroll-mt-20 px-5 py-24">
      <SectionTitle eyebrow="Resultados reais" title="Beleza que fala por si." sub="Cada detalhe importa. Veja alguns dos nossos trabalhos e inspire-se para o seu próximo cuidado." />
      <div className="mb-10 flex flex-wrap justify-center gap-2">
        {cats.map((c) => (
          <button key={c} onClick={() => setCat(c)} aria-pressed={cat === c}
            className={`rounded-full border px-5 py-2 text-sm transition ${cat === c ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary"}`}>{c}</button>
        ))}
      </div>
      <div className="mx-auto max-w-6xl columns-2 gap-4 md:columns-3">
        {items.map((g, i) => (
          <button key={i} onClick={() => setZoom(i)} aria-label={`Ampliar: ${g.alt}`} className={`mb-4 block w-full break-inside-avoid ${g.tall ? "aspect-[3/4]" : "aspect-square"}`}>
            <Img photo={g} className="transition hover:opacity-90" />
          </button>
        ))}
      </div>
      <div className="mt-12 text-center">
        <a href={whatsappLink(term ? serviceMessage(term) : GENERAL_MESSAGE)} target="_blank" rel="noopener noreferrer" className={btn}>Quero um resultado assim</a>
      </div>
      {zoom !== null && items[zoom] && (
        <div role="dialog" aria-modal="true" aria-label={items[zoom].alt} onClick={() => setZoom(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/80 p-6">
          <button aria-label="Fechar" className="absolute right-5 top-5 text-cream"><X /></button>
          <div className="aspect-[3/4] h-[80vh] max-w-full"><Img photo={items[zoom]} /></div>
        </div>
      )}
    </section>
  );
}

function Index() {
  const wa = whatsappLink(GENERAL_MESSAGE);
  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <Header />
      <main>
        <section id="inicio" className="scroll-mt-20 px-5 py-16 md:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
            <div className="reveal">
              <p className="mb-5 text-xs uppercase tracking-[0.35em] text-primary">Studio Talita Garcia</p>
              <h1 className="text-5xl leading-[1.05] md:text-6xl lg:text-7xl">Realce sua beleza. <em className="text-primary">Valorize quem você é.</em></h1>
              <p className="mt-6 max-w-md text-lg text-muted-foreground">Cílios, sobrancelhas, unhas e depilação com carinho, cuidado e atenção aos detalhes.</p>
              <div className="mt-8 flex flex-wrap items-center gap-4"><Link to="/agendar" className={`${cta} px-9 py-4 text-lg`}><CalendarHeart className="h-5 w-5" />Agendar meu horário</Link><a href={wa} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline-offset-4 hover:underline">ou fale pelo WhatsApp</a></div>
              <ul className="mt-10 grid grid-cols-3 gap-4 border-t border-border pt-6 text-sm">
                {[[Heart, "Atendimento personalizado"], [Flower2, "Ambiente acolhedor"], [Sparkles, "Cuidado em cada detalhe"]].map(([I, t]) => {
                  const Icon = I as typeof Heart;
                  return <li key={t as string} className="flex flex-col gap-2"><Icon className="h-5 w-5 text-primary" strokeWidth={1.2} />{t as string}</li>;
                })}
              </ul>
            </div>
            <div className="reveal relative aspect-[4/5] overflow-hidden rounded-xl">
              <img src={photos.hero.src} alt={photos.hero.alt} className="h-full w-full object-cover object-top" />
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-background" />
            </div>
          </div>
        </section>

        <section id="sobre" className="scroll-mt-20 bg-secondary px-5 py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="grid grid-cols-2 gap-4">
              <div className="aspect-[3/4]"><Img photo={photos.portrait} /></div>
              <div className="mt-12 aspect-[3/4]"><Img photo={photos.space} /></div>
            </div>
            <div>
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-primary">Conheça a Talita</p>
              <h2 className="text-4xl md:text-5xl">Prazer, sou a Talita!</h2>
              <p className="mt-2 font-serif text-2xl italic text-primary">Um espaço pensado para você.</p>
              <div className="mt-6 space-y-4 text-muted-foreground">
                <p>Mais do que realçar a beleza, acredito que cada atendimento é uma oportunidade de cuidar de você, valorizar sua autoestima e proporcionar um momento especial na sua rotina.</p>
                <p>No Studio Talita Garcia, cada cliente é recebida com atenção e carinho, em um ambiente preparado para que você se sinta à vontade.</p>
                <p className="text-foreground">Será um prazer fazer parte da sua rotina de beleza e autoestima.</p>
              </div>
              <p className="mt-6 font-script text-5xl text-primary">Talita Garcia</p>
            </div>
          </div>
        </section>

        <section id="servicos" className="scroll-mt-20 px-5 py-24">
          <SectionTitle eyebrow="Serviços" title="Nossos Serviços" sub="Cada procedimento é pensado para realçar o que torna você única." />
          <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((s) => (
              <article key={s.id} id={s.id} className="flex flex-col rounded-xl bg-card p-3">
                <div className="aspect-[4/5]"><Img photo={s.photo} /></div>
                <div className="flex flex-1 flex-col p-3">
                  <h3 className="text-2xl">{s.title}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted-foreground">{s.description}</p>
                  <a href={whatsappLink(serviceMessage(s.term))} target="_blank" rel="noopener noreferrer" className="mt-4 text-sm font-medium text-primary underline-offset-4 hover:underline">Tirar dúvidas no WhatsApp →</a>
                  <Link to="/agendar" search={{ categoria: s.title }} className={`${cta} mt-3 px-4 py-2.5 text-sm`}>Agendar meu horário</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <Prices />

        <div className="bg-secondary"><Gallery /></div>

        <section id="depoimentos" className="scroll-mt-20 px-5 py-24">
          <SectionTitle title="O que nossas clientes dizem" sub="Palavras de quem já viveu essa experiência." />
          <Testimonials />
        </section>

        <section className="px-5 pb-24">
          <div className="mx-auto grid max-w-6xl overflow-hidden rounded-2xl bg-blush md:grid-cols-2">
            <div className="relative min-h-72">
              <iframe title={`Mapa: ${ADDRESS}`} src={MAPS_EMBED} loading="lazy" className="absolute inset-0 h-full w-full border-0" referrerPolicy="no-referrer-when-downgrade" />
            </div>
            <div className="p-10 md:p-16">
              <h2 className="text-4xl md:text-5xl">Você merece esse momento.</h2>
              <p className="mt-4 text-muted-foreground">Reserve um tempo para você. Será um prazer fazer parte da sua jornada de beleza.</p>
              <div className="mt-8 flex flex-wrap gap-3"><Link to="/agendar" className={cta}><CalendarHeart className="h-5 w-5" />Agendar meu horário</Link><a href={wa} target="_blank" rel="noopener noreferrer" className={btn}><MessageCircle className="h-4 w-4" />WhatsApp</a></div>
              <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="mt-6 flex items-center gap-2 text-sm text-primary hover:underline"><MapPin className="h-4 w-4" />{ADDRESS} · Abrir no mapa</a>
            </div>
          </div>
        </section>
      </main>

      <footer id="contato" className="scroll-mt-20 border-t border-border bg-cream px-5 py-16">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          <div><Logo className="h-24 w-24" /><p className="mt-4 max-w-xs text-sm text-muted-foreground">Studio de beleza especializado em cílios, sobrancelhas, unhas e depilação.</p></div>
          <div className="space-y-3 text-sm">
            <p className="font-medium">Contato</p>
            <a href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary"><MessageCircle className="h-4 w-4" />{WHATSAPP_DISPLAY}</a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary"><Instagram className="h-4 w-4" />{INSTAGRAM_HANDLE}</a>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-primary"><MapPin className="h-4 w-4" />{ADDRESS}</a>
          </div>
          <nav className="grid grid-cols-2 gap-2 text-sm" aria-label="Rodapé">
            {nav.map(([l, id]) => <a key={id} href={`#${id}`} className="hover:text-primary">{l}</a>)}
          </nav>
        </div>
        <p className="mt-12 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} Studio Talita Garcia</p>
      </footer>

      <a href={wa} target="_blank" rel="noopener noreferrer" aria-label="Conversar no WhatsApp" className="fixed bottom-24 right-5 z-40 flex h-14 w-14 lg:bottom-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition hover:scale-105">
        <MessageCircle className="h-6 w-6" />
      </a>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-5 py-3 backdrop-blur lg:hidden">
        <Link to="/agendar" className={`${cta} w-full`}><CalendarHeart className="h-5 w-5" />Agendar meu horário</Link>
      </div>
    </div>
  );
}
