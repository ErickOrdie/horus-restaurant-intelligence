import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Activity, KeyRound } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { logAudit } from "@/lib/data";
import { checkEngineHealth, engineKeyConfigured } from "@/lib/ai-engine.functions";
import { PageHeader, Panel } from "@/components/horus/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RoboflowIntegration } from "@/components/horus/RoboflowIntegration";

export const Route = createFileRoute("/_app/integracoes")({
  component: Integracoes,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Integrações · Hórus" },
      { name: "description", content: "Conexão com o motor externo de visão computacional." },
      { property: "og:title", content: "Integrações · Hórus" },
      { property: "og:description", content: "Conexão com o motor externo de visão computacional." },
    ],
  }),
});

const STATUS_TEXT: Record<string, { label: string; cls: string }> = {
  online: { label: "Conectado", cls: "text-success" },
  offline: { label: "Sem resposta", cls: "text-destructive" },
  erro: { label: "Erro", cls: "text-destructive" },
  nao_configurado: { label: "Não configurado", cls: "text-warning" },
};

function Integracoes() {
  const qc = useQueryClient();
  const { data: me } = useProfile();
  const isAdmin = !!me?.roles.includes("admin");
  const health = useServerFn(checkEngineHealth);
  const keyFn = useServerFn(engineKeyConfigured);
  const cfgQ = useQuery({
    queryKey: ["engine-config"],
    queryFn: async () => {
      const [c, m] = await Promise.all([
        supabase.from("ai_engine_config").select("*").maybeSingle(),
        supabase.from("ai_models").select("id,name,version").order("name"),
      ]);
      return { cfg: c.data, models: m.data ?? [] };
    },
  });
  const keyQ = useQuery({ queryKey: ["engine-key"], queryFn: () => keyFn() });
  const [form, setForm] = useState({ base_url: "", timeout_ms: 15000, min_confidence: 0.5, sync_interval_s: 60, default_model_id: "" });
  useEffect(() => {
    const c = cfgQ.data?.cfg;
    if (c) setForm({ base_url: c.base_url ?? "", timeout_ms: c.timeout_ms, min_confidence: Number(c.min_confidence), sync_interval_s: c.sync_interval_s, default_model_id: c.default_model_id ?? "" });
  }, [cfgQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      const url = form.base_url.trim();
      if (url && !/^https?:\/\/[^\s]+$/i.test(url)) throw new Error("URL inválida");
      const c = cfgQ.data?.cfg;
      if (!c) throw new Error("Configuração legada não disponível.");
      const { error } = await supabase.from("ai_engine_config").update({
        base_url: url || null, timeout_ms: form.timeout_ms, min_confidence: form.min_confidence,
        sync_interval_s: form.sync_interval_s, default_model_id: form.default_model_id || null, updated_at: new Date().toISOString(),
      }).eq("organization_id", c.organization_id);
      if (error) throw error;
      await logAudit("configurar_motor_ia", "ai_engine_config", null, { base_url: url, timeout_ms: form.timeout_ms });
    },
    onSuccess: () => { toast.success("Configuração salva"); qc.invalidateQueries({ queryKey: ["engine-config"] }); },
    onError: (e) => toast.error(e instanceof Error && e.message === "URL inválida" ? "Informe uma URL começando com http:// ou https://" : "Não foi possível salvar. Somente administradores podem alterar."),
  });
  const test = useMutation({
    mutationFn: () => health(),
    onSuccess: (r) => {
      (r.ok ? toast.success : toast.error)(r.message);
      qc.invalidateQueries({ queryKey: ["engine-config"] });
      qc.invalidateQueries({ queryKey: ["cameras"] });
    },
    onError: () => toast.error("Falha ao testar a conexão."),
  });

  const c = cfgQ.data?.cfg;
  const st = STATUS_TEXT[c?.last_health_status ?? "nao_configurado"] ?? { label: "Não configurado", cls: "text-warning" };

  return (
    <>
      <PageHeader section="Administração" title="Integrações" description="Serviços de visão computacional e conexões autorizadas." />
      <RoboflowIntegration />
      <details>
      <summary className="mb-4 cursor-pointer text-[14px] font-medium">Adaptador Python legado · integração futura opcional</summary>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <Panel title="Motor de visão computacional" description="Contrato: GET /health, POST /detect/*, GET /cameras/status, webhook /api/public/ai-engine/events">
          {cfgQ.isLoading ? <Skeleton className="h-64" /> : (
            <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
              <div className="grid gap-1.5"><Label htmlFor="url">URL do servidor</Label><Input id="url" disabled={!isAdmin} placeholder="https://motor.seudominio.com.br" value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} /></div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-1.5"><Label htmlFor="to">Timeout (ms)</Label><Input id="to" type="number" min={1000} max={60000} disabled={!isAdmin} value={form.timeout_ms} onChange={(e) => setForm({ ...form, timeout_ms: Number(e.target.value) })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="mc">Confiança mínima</Label><Input id="mc" type="number" step="0.05" min={0} max={1} disabled={!isAdmin} value={form.min_confidence} onChange={(e) => setForm({ ...form, min_confidence: Number(e.target.value) })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="si">Sincronização (s)</Label><Input id="si" type="number" min={10} disabled={!isAdmin} value={form.sync_interval_s} onChange={(e) => setForm({ ...form, sync_interval_s: Number(e.target.value) })} /></div>
              </div>
              <div className="grid gap-1.5"><Label>Modelo padrão</Label>
                <Select disabled={!isAdmin} value={form.default_model_id || "none"} onValueChange={(v) => setForm({ ...form, default_model_id: v === "none" ? "" : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Nenhum</SelectItem>{cfgQ.data?.models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name} · {m.version}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={!isAdmin || save.isPending}>Salvar</Button>
                <Button type="button" variant="outline" disabled={test.isPending} onClick={() => test.mutate()}><Activity />{test.isPending ? "Testando…" : "Testar conexão"}</Button>
              </div>
              {!isAdmin && <p className="text-[12px] text-subtle">Somente administradores alteram esta configuração.</p>}
            </form>
          )}
        </Panel>
        <div className="grid content-start gap-4">
          <Panel title="Status">
            <dl className="grid gap-3 text-[13px]">
              <div className="flex justify-between"><dt className="text-muted-foreground">Conexão</dt><dd className={`font-medium ${st.cls}`}>{st.label}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Último teste</dt><dd className="tabular">{c?.last_health_at ? new Date(c.last_health_at).toLocaleString("pt-BR") : "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Latência</dt><dd className="tabular">{c?.last_health_latency_ms != null ? `${c.last_health_latency_ms} ms` : "—"}</dd></div>
            </dl>
          </Panel>
          <Panel title="Chave de autenticação">
            <div className="flex items-start gap-2 text-[13px]">
              <KeyRound className="mt-0.5 size-4 text-subtle" />
              <p className="text-muted-foreground">{keyQ.isLoading ? "Verificando…" : keyQ.data?.configured ? "Chave legada configurada com segurança no servidor." : "Chave legada ausente. O webhook recusa chamadas sem autenticação."}</p>
            </div>
          </Panel>
        </div>
      </div>
      </details>
    </>
  );
}
