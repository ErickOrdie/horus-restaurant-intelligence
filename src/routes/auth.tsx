import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { HorusLogo } from "@/components/horus/HorusLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Entrar · Hórus" },
      { name: "description", content: "Acesse a plataforma Hórus — AI Restaurant Intelligence." },
      { property: "og:title", content: "Entrar · Hórus" },
      { property: "og:description", content: "Acesse a plataforma Hórus — AI Restaurant Intelligence." },
    ],
  }),
});

function AuthPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) toast.error("Não foi possível entrar", { description: "Verifique e-mail e senha." });
    } else {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
      });
      if (error) toast.error("Não foi possível criar a conta", { description: error.message });
      else setSent(true);
    }
    setBusy(false);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_480px]">
      <aside className="hidden flex-col justify-between border-r bg-card p-10 lg:flex">
        <HorusLogo />
        <div className="max-w-md">
          <p className="text-[13px] font-medium uppercase tracking-[0.14em] text-gold">Inteligência operacional</p>
          <h1 className="mt-3 text-[28px] font-semibold leading-tight tracking-tight">Inteligência que transforma visão em decisões.</h1>
          <p className="mt-3 text-sm text-muted-foreground">Filas, mesas, composição dos pratos e desperdício em indicadores mensuráveis para a gestão do restaurante.</p>
        </div>
        <p className="text-xs text-subtle">© {new Date().getFullYear()} Hórus · AI Restaurant Intelligence</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden"><HorusLogo /></div>
          {sent ? (
            <div>
              <h2 className="text-xl font-semibold">Confirme seu e-mail</h2>
              <p className="mt-2 text-sm text-muted-foreground">Enviamos um link de confirmação para <span className="font-medium text-foreground">{email}</span>. Após confirmar, volte e entre normalmente.</p>
              <Button variant="outline" className="mt-6 w-full" onClick={() => { setSent(false); setMode("login"); }}>Voltar para o login</Button>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold tracking-tight">{mode === "login" ? "Entrar na plataforma" : "Criar conta"}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{mode === "login" ? "Use suas credenciais corporativas." : "Novos usuários entram com perfil Analista."}</p>
              <form onSubmit={onSubmit} className="mt-6 grid gap-4">
                {mode === "signup" && (
                  <div className="grid gap-1.5"><Label htmlFor="name">Nome completo</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
                )}
                <div className="grid gap-1.5"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="grid gap-1.5"><Label htmlFor="password">Senha</Label><Input id="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={busy}>{busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}</Button>
              </form>
              {mode === "login" && (
                <button type="button" className="mt-4 w-full text-center text-sm text-primary hover:underline" onClick={async () => {
                  if (!email) { toast.error("Digite seu e-mail acima primeiro."); return; }
                  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
                  if (error) toast.error("Não foi possível enviar", { description: error.message });
                  else toast.success("Enviamos um link para redefinir sua senha.", { description: email });
                }}>Esqueci minha senha</button>
              )}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "login" ? "Ainda não tem acesso?" : "Já possui conta?"}{" "}
                <button type="button" className="font-medium text-primary hover:underline" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
                  {mode === "login" ? "Criar conta" : "Entrar"}
                </button>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
