import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/data";
import { SEVERITY } from "@/lib/status";
import { PageHeader, EmptyState } from "@/components/horus/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/alertas")({
  component: Alertas,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Central de alertas · Hórus" },
      { name: "description", content: "Alertas operacionais de filas, limpeza, buffet, câmeras e desperdício." },
      { property: "og:title", content: "Central de alertas · Hórus" },
      { property: "og:description", content: "Alertas operacionais do restaurante." },
    ],
  }),
});

const STATUS_LABEL: Record<string, string> = { aberto: "Em aberto", reconhecido: "Reconhecido", resolvido: "Resolvido" };

function Alertas() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("aberto");
  const q = useQuery({
    queryKey: ["alerts", "list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("alerts").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const m = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const patch = status === "resolvido" ? { status, resolved_at: new Date().toISOString(), resolved_by: u.user?.id ?? null } : { status };
      const { error } = await supabase.from("alerts").update(patch).eq("id", id);
      if (error) throw error;
      await logAudit(`alerta_${status}`, "alerts", id);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["alerts"] }); toast.success("Alerta atualizado"); },
    onError: () => toast.error("Não foi possível atualizar o alerta."),
  });
  const list = (q.data ?? []).filter((a) => tab === "todos" || a.status === tab);
  const count = (s: string) => (q.data ?? []).filter((a) => a.status === s).length;

  return (
    <>
      <PageHeader section="Inteligência gerencial" title="Alertas" description="Acompanhe, reconheça e resolva ocorrências operacionais." />
      <Tabs value={tab} onValueChange={setTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="aberto">Em aberto · {count("aberto")}</TabsTrigger>
          <TabsTrigger value="reconhecido">Reconhecidos · {count("reconhecido")}</TabsTrigger>
          <TabsTrigger value="resolvido">Resolvidos · {count("resolvido")}</TabsTrigger>
          <TabsTrigger value="todos">Todos</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="rounded-lg border bg-card">
        {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}</div> : list.length === 0 ? (
          <div className="p-4"><EmptyState title="Nenhum alerta" description="Não há alertas com este status." /></div>
        ) : list.map((a) => (
          <div key={a.id} className="flex flex-col gap-3 border-b px-5 py-4 last:border-0 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-[11px] ${SEVERITY[a.severity]?.cls}`}>{SEVERITY[a.severity]?.label}</Badge>
                <span className="text-[11px] uppercase tracking-wide text-subtle">{a.type}</span>
              </div>
              <p className="mt-1.5 text-[14px] font-medium">{a.title}</p>
              {a.description && <p className="mt-0.5 text-[13px] text-muted-foreground">{a.description}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span className="tabular text-[12px] text-subtle">{new Date(a.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} · {STATUS_LABEL[a.status]}</span>
              {a.status === "aberto" && <Button size="sm" variant="outline" disabled={m.isPending} onClick={() => m.mutate({ id: a.id, status: "reconhecido" })}>Reconhecer</Button>}
              {a.status !== "resolvido" && <Button size="sm" disabled={m.isPending} onClick={() => m.mutate({ id: a.id, status: "resolvido" })}>Resolver</Button>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
