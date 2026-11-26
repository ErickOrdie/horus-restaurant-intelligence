import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { logAudit } from "@/lib/data";
import { TASK_LABELS, type Task } from "@/lib/ai-engine-contract";
import { PageHeader } from "@/components/horus/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { HostedModelEditor } from "@/components/horus/HostedModelEditor";
import { PURPOSES, type Purpose } from "@/lib/roboflow";
import { useVisionRequests } from "@/components/horus/VisionUsage";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_app/modelos")({
  component: Modelos,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Modelos de IA · Hórus" },
      { name: "description", content: "Modelos de visão computacional: origem, licença, classes, pesos e métricas." },
      { property: "og:title", content: "Modelos de IA · Hórus" },
      { property: "og:description", content: "Modelos de visão computacional do Hórus." },
    ],
  }),
});

const WEIGHTS: Record<string, { label: string; cls: string }> = {
  disponivel: { label: "Pesos publicados", cls: "border-success/40 text-success" },
  indisponivel: { label: "Pesos não publicados", cls: "border-warning/40 text-warning" },
  treinamento_necessario: { label: "Requer treinamento", cls: "border-warning/40 text-warning" },
};
const METRIC_LABELS: Record<string, string> = { precision: "Precision", recall: "Recall", map50: "mAP50", map50_95: "mAP50-95", f1: "F1-Score" };

function Modelos() {
  const qc = useQueryClient();
  const { data: me } = useProfile();
  const [provider, setProvider] = useState("roboflow");
  const [editor, setEditor] = useState<{model: Tables<"ai_models"> | null} | null>(null);
  const requests = useVisionRequests();
  const q = useQuery({
    queryKey: ["ai-models"],
    queryFn: async () => {
      const [m, cams] = await Promise.all([
        supabase.from("ai_models").select("*").order("name"),
        supabase.from("cameras").select("model_id,name"),
      ]);
      if (m.error) throw m.error;
      return { models: m.data, cams: cams.data ?? [] };
    },
  });
  const toggle = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) => {
      const { error } = await supabase.from("ai_models").update({ status: on ? "ativo" : "inativo" }).eq("id", id);
      if (error) throw error;
      await logAudit(on ? "ativar_modelo" : "desativar_modelo", "ai_models", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ai-models"] }); toast.success("Status do modelo atualizado"); },
    onError: () => toast.error("Não foi possível alterar o modelo."),
  });

  return (
    <>
      <PageHeader section="Visão computacional" title="Modelos de IA" description="Modelos publicados e treinados para as análises do restaurante." actions={me?.canManage && <Button size="sm" onClick={()=>setEditor({model:null})}><Plus/>Novo modelo</Button>} />
      <ToggleGroup type="single" value={provider} onValueChange={v=>v&&setProvider(v)} variant="outline" className="mb-4 justify-start"><ToggleGroupItem value="roboflow">Roboflow hospedada</ToggleGroupItem><ToggleGroupItem value="legacy">Adaptadores anteriores</ToggleGroupItem></ToggleGroup>
      {editor && me?.profile.organization_id && <HostedModelEditor model={editor.model} organizationId={me.profile.organization_id} onClose={()=>setEditor(null)}/>}
      {!q.isLoading && !q.data?.models.some(m=>m.provider===provider) && <div className="border-t py-10 text-center text-[13px] text-muted-foreground">{provider==="roboflow"?"Nenhum modelo hospedado cadastrado. Identificadores e classes serão definidos pelo seu modelo Roboflow.":"Nenhum adaptador anterior."}</div>}
      {q.isLoading ? <Skeleton className="h-96" /> : (
        <div className="grid gap-4 xl:grid-cols-3">
          {q.data?.models.filter(m=>m.provider===provider).map((m) => {
            const metrics = (m.metrics ?? null) as Record<string, number> | null;
            const usedBy = q.data.cams.filter((c) => c.model_id === m.id).map((c) => c.name);
            const w = WEIGHTS[m.weights_status];
            return (
              <article key={m.id} className="flex flex-col rounded-lg border bg-card">
                <header className="border-b px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-subtle">{PURPOSES[m.purpose as Purpose] ?? TASK_LABELS[m.task as Task] ?? m.task}</p>
                      <h2 className="mt-1 text-[15px] font-semibold">{m.name}</h2>
                      <p className="mt-0.5 text-[12px] text-muted-foreground">{m.architecture} · {m.version}</p>
                    </div>
                    <div className="flex items-center gap-2">{m.provider==="roboflow"&&me?.canManage&&<Button variant="ghost" size="icon" aria-label={`Editar ${m.name}`} onClick={()=>setEditor({model:m})}><Pencil/></Button>}<Switch aria-label={`Ativar ${m.name}`} checked={m.status === "ativo"} disabled={!me?.canManage || m.weights_status !== "disponivel" || toggle.isPending} onCheckedChange={(on) => toggle.mutate({ id: m.id, on })} /></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className={`text-[11px] ${w?.cls}`}>{m.provider==="roboflow"&&m.status!=="pendente"?"API hospedada":w?.label}</Badge>
                    <Badge variant="outline" className="text-[11px]">{m.status === "ativo" ? "Ativo" : m.status === "pendente" ? "Pendente" : "Inativo"}</Badge>
                    <Badge variant="outline" className="max-w-full break-all whitespace-normal font-mono text-[11px]">{m.endpoint}</Badge>
                  </div>
                </header>
                <div className="grid flex-1 gap-4 px-5 py-4 text-[13px]">
                  {m.provider==="roboflow"&&<dl className="grid gap-1 text-[12px] text-muted-foreground"><div>Workspace: {m.workspace_id}</div><div>Modelo: {m.roboflow_model_id||"—"} · versão {m.version||"—"}</div><div>Workflow: {m.workflow_id||"—"}</div><div>Confiança mínima: {(m.min_confidence*100).toFixed(0)}%</div><div>Utilização: {requests.data?.filter(r=>r.model_id===m.id).length??0} requisições</div></dl>}
                  <div>
                    <p className="mb-1 text-[12px] font-medium text-muted-foreground">Origem</p>
                    {m.source_repo && <a href={m.source_repo} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 break-all text-primary hover:underline">{m.source_repo.replace("https://github.com/", "")}<ExternalLink className="size-3" /></a>}
                  </div>
                  <div>
                    <p className="mb-1 text-[12px] font-medium text-muted-foreground">Licença · {m.license}</p>
                    <p className="text-[12px] leading-relaxed text-muted-foreground">{m.license_notes}</p>
                  </div>
                  <div>
                    <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">Classes suportadas</p>
                    {m.classes.length ? <div className="flex flex-wrap gap-1">{m.classes.map((c) => <span key={c} className="rounded border bg-muted px-1.5 py-0.5 text-[11px]">{c}</span>)}</div> : <p className="text-[12px] text-subtle">Classes ainda não informadas.</p>}
                  </div>
                  <div>
                    <p className="mb-1.5 text-[12px] font-medium text-muted-foreground">Métricas</p>
                    {metrics ? (
                      <>
                        <div className="grid grid-cols-4 gap-2">{Object.entries(metrics).map(([k, v]) => <div key={k} className="rounded border px-2 py-1.5"><p className="text-[10px] text-subtle">{METRIC_LABELS[k] ?? k}</p><p className="tabular font-semibold">{(v * 100).toFixed(1)}%</p></div>)}</div>
                        <p className="mt-1.5 text-[11px] text-subtle">{m.metrics_source}</p>
                      </>
                    ) : <p className="text-[12px] text-subtle">Sem avaliação real registrada.</p>}
                  </div>
                  <div>
                    <p className="mb-1 text-[12px] font-medium text-muted-foreground">Requisitos</p>
                    <p className="text-[12px] text-muted-foreground">{m.requirements}</p>
                  </div>
                  <div className="mt-auto border-t pt-3 text-[12px] text-muted-foreground">Câmeras associadas: {usedBy.length ? usedBy.join(", ") : "nenhuma"}</div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
