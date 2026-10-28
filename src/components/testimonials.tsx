import { useEffect, useState } from "react";
import { Pause, Play, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { testimonials } from "@/content/site";

export function Testimonials() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPaused(true);
  }, []);

  useEffect(() => {
    if (paused || hovered || testimonials.length < 2) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % testimonials.length), 5000);
    return () => window.clearInterval(timer);
  }, [paused, hovered, active]);

  const current = testimonials[active];
  if (!current) return null;

  return (
    <div className="mx-auto max-w-2xl text-center" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="mb-8 inline-flex items-center gap-4 border-b border-border pb-5">
        <MapBadge />
        <div className="text-left">
          <p className="font-medium">Google Meu Negócio</p>
          <div aria-label="5 estrelas" className="mt-1 flex gap-1 text-rating">
            {Array.from({ length: 5 }, (_, i) => <Star key={i} className="h-4 w-4 fill-current" aria-hidden="true" />)}
          </div>
        </div>
      </div>
      <figure id={`testimonial-panel-${active}`} role="tabpanel" aria-labelledby={`testimonial-tab-${active}`} className="flex min-h-64 flex-col items-center justify-center rounded-lg bg-card px-6 py-8 md:min-h-56 md:px-12">
        <blockquote key={active} className="reveal font-serif text-2xl italic leading-relaxed md:text-3xl">“{current.text}”</blockquote>
        <figcaption className="mt-6 text-sm font-medium text-primary">{current.name}</figcaption>
      </figure>
      <div className="mt-6 flex items-center justify-center gap-4">
        <div role="tablist" aria-label="Depoimentos das clientes" className="flex gap-2">
          {testimonials.map((t, i) => (
            <Button key={t.name} id={`testimonial-tab-${i}`} role="tab" aria-selected={i === active} aria-controls={`testimonial-panel-${i}`} variant={i === active ? "default" : "outline"} size="icon" onClick={() => setActive(i)} onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (i + 1) % testimonials.length : event.key === "ArrowLeft" ? (i + testimonials.length - 1) % testimonials.length : null;
              if (next === null) return;
              event.preventDefault();
              setActive(next);
              document.getElementById(`testimonial-tab-${next}`)?.focus();
            }}>{i + 1}</Button>
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={() => setPaused((value) => !value)} aria-label={paused ? "Retomar depoimentos" : "Pausar depoimentos"} title={paused ? "Retomar depoimentos" : "Pausar depoimentos"}>
          {paused ? <Play /> : <Pause />}
        </Button>
      </div>
    </div>
  );
}

function MapBadge() {
  return <div role="img" aria-label="Perfil de empresa no Google" className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary font-sans text-3xl font-bold text-primary">G</div>;
}