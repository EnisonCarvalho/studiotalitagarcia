import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LOGO } from "@/content/site";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [
    { title: "Definir senha | Studio Talita Garcia" },
    { name: "description", content: "Defina sua senha com segurança para acessar o painel do Studio Talita Garcia." },
    { property: "og:title", content: "Definir senha | Studio Talita Garcia" },
    { property: "og:description", content: "Ativação segura do acesso ao painel do studio." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" },
  ] }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [message, setMessage] = useState("Validando seu link…");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const recovery = hash.get("type") === "recovery" || hash.get("type") === "invite";
    // Capture the action before the client consumes its hash. No other session may define a password here.
    supabase.auth.getUser().then(({ data, error }) => {
      if ((!recovery && sessionStorage.getItem("studio-password-recovery") !== "active") || error || !data.user) setMessage("Link inválido ou expirado. Solicite outro em Entrar no painel.");
      else { setReady(true); setMessage(""); }
    });
  }, []);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password !== repeat) { setMessage("As senhas precisam ser iguais."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { setMessage("Não foi possível definir a senha. Solicite um novo link e tente novamente."); return; }
    sessionStorage.removeItem("studio-password-recovery");
    navigate({ to: "/admin", replace: true });
  }
  return <main className="flex min-h-screen items-center justify-center px-5"><div className="w-full max-w-sm">
    <img src={LOGO} alt="Studio Talita Garcia" className="mx-auto h-20 w-20" /><h1 className="mt-4 text-center text-3xl">Definir senha</h1>
    {ready && <form onSubmit={submit} className="mt-6 grid gap-3"><label className="grid gap-1 text-sm">Nova senha<input required minLength={8} type="password" autoComplete="new-password" className="rounded-md border border-input bg-card px-4 py-3" value={password} onChange={(e) => setPassword(e.target.value)} /></label><label className="grid gap-1 text-sm">Confirmar senha<input required minLength={8} type="password" autoComplete="new-password" className="rounded-md border border-input bg-card px-4 py-3" value={repeat} onChange={(e) => setRepeat(e.target.value)} /></label><Button disabled={busy} type="submit">Salvar senha</Button></form>}
    {message && <p role="alert" className="mt-4 text-center text-sm">{message}</p>}<Button className="mt-4 w-full" variant="link" onClick={() => navigate({ to: "/auth" })}>Entrar no painel</Button>
  </div></main>;
}