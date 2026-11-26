import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/data";
import { TABLE_STATUS } from "@/lib/status";
import { PageHeader } from "@/components/horus/PageHeader";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/salao")({
  component: Salao,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Monitoramento do salão · Hórus" },
      { name: "description", content: "Mapa das mesas em tempo real: disponibilidade, ocupação e limpeza." },
      { property: "og:title", content: "Monitoramento do salão · Hórus" },
      { property: "og:description", content: "Mapa das mesas e status de ocupação e limpeza." },
    ],
  }),
});

type Table = { id: string; code: string; seats: number; area: string; status: string; status_since: string };

function minutesSince(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

function Salao() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<Table | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ["tables"],
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("dining_tables").select("id,code,seats,area,status,status_since").order("code");
      if (error) throw error;
      return data as Table[];
    },
  });
  const m = useMutation({
    mutationFn: async ({ t, status }: { t: Table; status: string }) => {
      const { error } = await supabase.from("dining_tables").update({ status, status_since: new Date().toISOString() }).eq("id", t.id);
      if (error) throw error;
      await logAudit("alterar_status_mesa", "dining_tables", t.id, { de: t.status, para: status, mesa: t.code });
    },
    onSuccess: (_d, v) => {
      toast.success(`Mesa ${v.t.code}: ${TABLE_STATUS[v.status]?.label}`);
      qc.invalidateQueries({ queryKey: ["tables"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setSel(null);
    },
    onError: () => toast.error("Não foi possível atualizar a mesa."),
  });

  const tables = q.data ?? [];
  const counts = Object.keys(TABLE_STATUS).map((s) => ({ s, n: tables.filter((t) => t.status === s).length }));
  const areas = [...new Set(tables.map((t) => t.area))];

  return (
    <>
      <PageHeader section="Operações" title="Monitoramento do salão" description="Status de cada mesa, atualizado a cada 30 segundos. Clique em uma mesa para alterar o status." />
      <div className="mb-5 flex flex-wrap gap-2">
        <button onClick={() => setFilter(null)} className={`rounded-md border px-3 py-1.5 text-[12px] ${filter == null ? "border-primary bg-accent font-medium" : "bg-card text-muted-foreground"}`}>Todas · {tables.length}</button>
        {counts.map(({ s, n }) => (
          <button key={s} onClick={() => setFilter(filter === s ? null : s)} className={`flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-[12px] ${filter === s ? "border-primary bg-accent font-medium" : "bg-card text-muted-foreground"}`}>
            <span className={`size-2 rounded-full ${TABLE_STATUS[s]?.dot}`} />{TABLE_STATUS[s]?.label} · <span className="tabular">{n}</span>
          </button>
        ))}
      </div>
      {q.isLoading ? <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">{Array.from({ length: 16 }, (_, i) => <Skeleton key={i} className="h-24" />)}</div> : areas.map((area) => (
        <section key={area} className="mb-6">
          <h2 className="mb-3 text-[13px] font-semibold text-muted-foreground">{area}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
            {tables.filter((t) => t.area === area && (!filter || t.status === filter)).map((t) => {
              const st = TABLE_STATUS[t.status];
              const mins = minutesSince(t.status_since);
              const late = t.status === "aguardando_limpeza" && mins >= 10;
              return (
                <button key={t.id} onClick={() => setSel(t)} className={`rounded-lg border-l-[3px] border bg-card p-3 text-left transition-colors hover:bg-accent ${st?.ring} ${late ? "bg-warning/5" : ""}`}>
                  <div className="flex items-center justify-between"><span className="text-[15px] font-semibold">{t.code}</span><span className="text-[11px] text-subtle">{t.seats} lug.</span></div>
                  <div className="mt-2 flex items-center gap-1.5 text-[12px] text-muted-foreground"><span className={`size-1.5 rounded-full ${st?.dot}`} />{st?.label}</div>
                  <div className={`tabular mt-0.5 text-[11px] ${late ? "font-medium text-warning" : "text-subtle"}`}>há {mins} min</div>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      <Sheet open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <SheetContent>
          {sel && <>
            <SheetHeader>
              <SheetTitle>Mesa {sel.code}</SheetTitle>
              <SheetDescription>{sel.area} · {sel.seats} lugares · {TABLE_STATUS[sel.status]?.label} há {minutesSince(sel.status_since)} min</SheetDescription>
            </SheetHeader>
            <div className="grid gap-2 px-4">
              <p className="mb-1 text-[12px] font-medium text-muted-foreground">Alterar status</p>
              {Object.entries(TABLE_STATUS).map(([k, v]) => (
                <Button key={k} variant={k === sel.status ? "secondary" : "outline"} disabled={k === sel.status || m.isPending} className="justify-start" onClick={() => m.mutate({ t: sel, status: k })}>
                  <span className={`size-2 rounded-full ${v.dot}`} />{v.label}
                </Button>
              ))}
            </div>
          </>}
        </SheetContent>
      </Sheet>
    </>
  );
}
