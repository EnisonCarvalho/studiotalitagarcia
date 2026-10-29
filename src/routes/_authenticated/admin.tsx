import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { LOGO } from "@/content/site";
import { AgendaTab } from "@/components/admin/agenda-tab";
import { ServicesTab, AddonsTab } from "@/components/admin/catalog-tabs";
import { HoursTab, BlocksTab, SettingsTab } from "@/components/admin/schedule-tabs";
import { Button } from "@/components/ui/button";
import { hasVerifiedAdmin } from "@/lib/admin-booking-schema";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel | Studio Talita Garcia" },
      { name: "description", content: "Painel administrativo de agenda, serviços e horários." },
      { property: "og:title", content: "Painel | Studio Talita Garcia" },
      { property: "og:description", content: "Painel administrativo do studio." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const tabs = [["agenda", "Agenda"], ["servicos", "Serviços"], ["adicionais", "Adicionais"], ["horarios", "Horários"], ["bloqueios", "Folgas e bloqueios"], ["ajustes", "Ajustes"]] as const;

function Admin() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<(typeof tabs)[number][0]>("agenda");
  const role = useQuery({
    queryKey: ["is-admin", user.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (error) throw error;
      return hasVerifiedAdmin(data === true, user.email_confirmed_at ?? null);
    },
  });

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
          <Link to="/" className="flex items-center gap-3"><img src={LOGO} alt="" className="h-10 w-10" /><span className="font-serif text-xl">Painel do Studio</span></Link>
           <Button variant="ghost" onClick={signOut} className="text-muted-foreground"><LogOut />Sair</Button>
        </div>
      </header>
      {role.isLoading ? (
        <p className="flex justify-center gap-2 p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" />Carregando…</p>
      ) : !role.data ? (
        <div className="mx-auto max-w-md p-10 text-center">
          <h1 className="text-3xl">Acesso restrito</h1>
          <p className="mt-2 text-muted-foreground">Esta conta ({user.email}) não tem permissão de administradora.</p>
        </div>
      ) : (
        <main className="mx-auto max-w-6xl px-5 py-6">
          <nav className="mb-6 flex gap-2 overflow-x-auto pb-1" aria-label="Seções do painel">
            {tabs.map(([k, l]) => (
               <Button variant={tab === k ? "default" : "outline"} key={k} onClick={() => setTab(k)} aria-pressed={tab === k}
                 className="rounded-full">{l}</Button>
            ))}
          </nav>
          {tab === "agenda" && <AgendaTab />}
          {tab === "servicos" && <ServicesTab />}
          {tab === "adicionais" && <AddonsTab />}
          {tab === "horarios" && <HoursTab />}
          {tab === "bloqueios" && <BlocksTab />}
          {tab === "ajustes" && <SettingsTab />}
        </main>
      )}
    </div>
  );
}
