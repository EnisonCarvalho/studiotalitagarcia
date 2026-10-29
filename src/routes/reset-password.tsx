import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LOGO } from "@/content/site";
import { PasswordInput } from "@/components/password-input";
import { MIN_PASSWORD_LENGTH, passwordValidation, recoveryAction, RECOVERY_STORAGE_KEY } from "@/lib/password-recovery";

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

export function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [message, setMessage] = useState("Validando seu link…");
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    const hash = window.location.hash;
    const recovery = recoveryAction(hash);
    let active = true;
    // getUser waits for the auth client to consume/verify the link; never accept a URL type alone as authorization.
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      const invalid = hash.includes("error=") || hash.includes("error_code=");
      if (invalid || (!recovery && sessionStorage.getItem(RECOVERY_STORAGE_KEY) !== "active") || error || !data.user) {
        sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
        setMessage("Link inválido ou expirado. Solicite um novo link de redefinição.");
      } else { setReady(true); setMessage(""); }
      setChecking(false);
    }).catch(() => { if (active) { setChecking(false); setMessage("Não foi possível validar o link. Solicite um novo link de redefinição."); } });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => navigate({ to: "/admin", replace: true }), 2000);
    return () => window.clearTimeout(timer);
  }, [success, navigate]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ready || busy || success) return;
    const validation = passwordValidation(password, repeat);
    if (validation) { setMessage(validation); return; }
    setBusy(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) { setReady(false); setMessage("Sua sessão expirou. Solicite um novo link de redefinição."); return; }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setMessage("Não foi possível definir a senha. O link pode ter expirado ou a senha não atende aos requisitos. Solicite outro link se necessário."); return; }
      sessionStorage.removeItem(RECOVERY_STORAGE_KEY);
      setPassword(""); setRepeat(""); setSuccess(true); setMessage("Senha redefinida com sucesso.");
    } catch { setMessage("Não foi possível salvar sua senha. Tente novamente."); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center px-5"><div className="w-full max-w-sm">
    <img src={LOGO} alt="Studio Talita Garcia" className="mx-auto h-20 w-20" /><h1 className="mt-4 text-center text-3xl">Definir senha</h1>
    {ready && !success && <form onSubmit={submit} className="mt-6 grid gap-3"><label className="grid gap-1 text-sm">Nova senha<PasswordInput required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></label><p className="text-sm text-muted-foreground">Pelo menos 8 caracteres.</p><label className="grid gap-1 text-sm">Confirmar senha<PasswordInput required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} /></label><Button disabled={busy} type="submit">{busy ? "Salvando…" : "Salvar senha"}</Button></form>}
    {message && <p role={success ? "status" : "alert"} className="mt-4 text-center text-sm">{message}</p>}
    {!checking && !ready && <RecoveryRequest />}
    <Button className="mt-4 w-full" variant="link" onClick={() => navigate({ to: success ? "/admin" : "/auth", replace: success })}>{success ? "Ir para o painel" : "Entrar no painel"}</Button>
  </div></main>;
}

function RecoveryRequest() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
      setMessage(error ? "Não foi possível enviar o link. Tente novamente mais tarde." : "Se houver uma conta com esse e-mail, você receberá um link para redefinir sua senha.");
    } catch { setMessage("Não foi possível enviar o link. Tente novamente mais tarde."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="mt-5 grid gap-3"><label className="grid gap-1 text-sm">E-mail<input className="rounded-lg border border-input bg-card px-4 py-3" required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label><Button disabled={busy} type="submit">Solicitar novo link</Button>{message && <p role="status" className="text-center text-sm">{message}</p>}</form>;
}