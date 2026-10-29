import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LOGO } from "@/content/site";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";

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
  const [mode, setMode] = useState<"in" | "reset">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) navigate({ to: "/admin", replace: true }); });
  }, [navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setMsg(null);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) setMsg("E-mail ou senha incorretos.");
        else navigate({ to: "/admin", replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        setMsg(error ? "Não foi possível enviar o link. Tente novamente mais tarde." : "Se houver uma conta com esse e-mail, você receberá um link para definir sua senha.");
      }
    } catch { setMsg("Não foi possível concluir. Tente novamente mais tarde."); }
    finally { setBusy(false); }
  }

  const input = "w-full rounded-lg border border-input bg-card px-4 py-3 outline-none focus:border-primary";
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <img src={LOGO} alt="Studio Talita Garcia" className="mx-auto h-20 w-20" />
        <h1 className="mt-4 text-center text-3xl">{mode === "in" ? "Entrar no painel" : "Ativar acesso / recuperar senha"}</h1>
        <form onSubmit={submit} className="mt-6 grid gap-3">
          <label className="grid gap-1 text-sm">E-mail<input className={input} type="email" required autoComplete="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          {mode === "in" && <>
            <label className="grid gap-1 text-sm">Senha<PasswordInput required autoComplete="current-password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            <Button type="button" variant="link" onClick={() => { setMode("reset"); setMsg(null); setPassword(""); }} className="h-auto justify-self-start px-0">Esqueceu sua senha?</Button>
          </>}
          <Button disabled={busy} type="submit" className="h-auto rounded-full bg-cta px-6 py-3 font-semibold text-cta-foreground">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{mode === "in" ? "Entrar" : "Enviar link seguro"}</Button>
        </form>
        {msg && <p role="alert" className="mt-4 text-center text-sm">{msg}</p>}
        {mode === "reset" && <Button variant="link" onClick={() => { setMode("in"); setMsg(null); }} className="mt-4 h-auto w-full whitespace-normal text-center">Voltar para entrar</Button>}
      </div>
    </div>
  );
}
