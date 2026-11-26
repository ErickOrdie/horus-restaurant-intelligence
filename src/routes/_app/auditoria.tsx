import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { PageHeader, EmptyState } from "@/components/horus/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/auditoria")({
  component: Auditoria,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Auditoria · Hórus" },
      { name: "description", content: "Registro das ações realizadas pelos usuários na plataforma." },
      { property: "og:title", content: "Auditoria · Hórus" },
      { property: "og:description", content: "Registro das ações dos usuários." },
    ],
  }),
});

function Auditoria() {
  const { data: me } = useProfile();
  const q = useQuery({
    queryKey: ["audit"],
    enabled: !!me?.canManage,
    queryFn: async () => {
      const { data, error } = await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      const ids = [...new Set(data.map((d) => d.user_id).filter(Boolean))] as string[];
      const { data: people } = ids.length ? await supabase.from("profiles").select("id,full_name,email").in("id", ids) : { data: [] };
      const names = new Map((people ?? []).map((p) => [p.id, p.full_name ?? p.email]));
      return data.map((d) => ({ ...d, who: (d.user_id && names.get(d.user_id)) || "—" }));
    },
  });

  return (
    <>
      <PageHeader section="Administração" title="Auditoria" description="Últimas 200 ações registradas: quem fez, o quê e quando." />
      {me && !me.canManage ? <EmptyState title="Acesso restrito" description="Somente administradores e gestores podem consultar a auditoria." /> : (
        <div className="rounded-lg border bg-card">
          {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9" />)}</div> : !q.data?.length ? (
            <div className="p-4"><EmptyState title="Nenhuma ação registrada" description="Alterações em mesas, alertas e alimentos aparecerão aqui." /></div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead className="text-[12px]">Data</TableHead><TableHead className="text-[12px]">Usuário</TableHead><TableHead className="text-[12px]">Ação</TableHead><TableHead className="text-[12px]">Entidade</TableHead><TableHead className="text-[12px]">Detalhes</TableHead></TableRow></TableHeader>
              <TableBody>
                {q.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="tabular whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{r.who}</TableCell>
                    <TableCell className="font-medium">{r.action.replaceAll("_", " ")}</TableCell>
                    <TableCell className="text-muted-foreground">{r.entity}</TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-[11px] text-subtle">{r.details ? JSON.stringify(r.details) : ""}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}
    </>
  );
}
