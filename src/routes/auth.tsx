import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { LOGO } from "@/content/site";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no painel | Studio Talita Garcia" },
      { name: "description", content: "Acesso restrito ao painel administrativo do Studio Talita Garcia." },
      { property: "og:title", content: "Entrar no painel | Studio Talita Garcia" },
      { property: "og:description", content: "Acesso restrito ao painel do studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/admin", replace: true }); });
    const { data } = supabase.auth.onAuthStateChange((e, s) => { if (e === "SIGNED_IN" && s) navigate({ to: "/admin", replace: true }); });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg("E-mail ou senha incorretos.");
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth` } });
      if (error) setMsg(error.message.includes("Password") ? "A senha precisa ter pelo menos 6 caracteres." : "Não foi possível criar a conta.");
      else if (!data.session) setMsg("Enviamos um link de confirmação para o seu e-mail. Confirme e depois entre aqui.");
    }
    setBusy(false);
  }

  async function google() {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/auth` });
    if (r.error) setMsg("Não foi possível entrar com Google.");
  }

  const input = "w-full rounded-lg border border-input bg-card px-4 py-3 outline-none focus:border-primary";
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <img src={LOGO} alt="Studio Talita Garcia" className="mx-auto h-20 w-20" />
        <h1 className="mt-4 text-center text-3xl">{mode === "in" ? "Entrar no painel" : "Criar acesso"}</h1>
        <form onSubmit={submit} className="mt-6 grid gap-3">
          <input className={input} type="email" required autoComplete="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className={input} type="password" required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={busy} className="inline-flex items-center justify-center gap-2 rounded-full bg-cta px-6 py-3 font-semibold text-cta-foreground disabled:opacity-50">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "in" ? "Entrar" : "Criar conta"}</button>
        </form>
        <button onClick={google} className="mt-3 w-full rounded-full border border-border px-6 py-3 text-sm hover:border-primary">Continuar com Google</button>
        {msg && <p role="alert" className="mt-4 text-center text-sm">{msg}</p>}
        <button onClick={() => { setMode(mode === "in" ? "up" : "in"); setMsg(null); }} className="mt-4 w-full text-center text-sm text-primary">
          {mode === "in" ? "Primeiro acesso? Criar conta" : "Já tenho conta. Entrar"}
        </button>
      </div>
    </div>
  );
}
