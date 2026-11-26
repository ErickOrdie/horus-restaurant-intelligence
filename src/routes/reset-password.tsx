import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HorusLogo } from "@/components/horus/HorusLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
  head: () => ({ meta: [
    { title: "Redefinir senha · Hórus" }, { name: "description", content: "Crie uma nova senha para acessar o Hórus." },
    { property: "og:title", content: "Redefinir senha · Hórus" }, { property: "og:description", content: "Crie uma nova senha para acessar o Hórus." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
});

function ResetPassword() {
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) toast.error("Não foi possível alterar a senha", { description: "Abra novamente o link do e-mail." });
    else { toast.success("Senha alterada"); navigate({ to: "/dashboard" }); }
  }
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="grid w-full max-w-sm gap-4">
        <HorusLogo />
        <h1 className="text-xl font-semibold">Nova senha</h1>
        <div className="grid gap-1.5"><Label htmlFor="pw">Senha</Label><Input id="pw" type="password" minLength={8} required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></div>
        <Button type="submit" disabled={busy}>{busy ? "Aguarde…" : "Salvar nova senha"}</Button>
      </form>
    </main>
  );
}
