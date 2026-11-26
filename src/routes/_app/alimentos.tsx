import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { ArrowUpDown, Pencil, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { logAudit } from "@/lib/data";
import { fmt } from "@/lib/metrics";
import { PageHeader, EmptyState } from "@/components/horus/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const Route = createFileRoute("/_app/alimentos")({
  component: Alimentos,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Cadastro de alimentos · Hórus" },
      { name: "description", content: "Alimentos do buffet com categoria e custo por quilo usados nos cálculos." },
      { property: "og:title", content: "Cadastro de alimentos · Hórus" },
      { property: "og:description", content: "Alimentos do buffet e custo por quilo." },
    ],
  }),
});

const CATEGORIES = ["Carnes", "Acompanhamentos", "Saladas", "Sobremesas", "Bebidas"];
type Food = { id: string; name: string; category: string; cost_per_kg: number; active: boolean };
type SortKey = "name" | "category" | "cost_per_kg";
const PAGE = 10;

function Alimentos() {
  const qc = useQueryClient();
  const { data: me } = useProfile();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<{ k: SortKey; asc: boolean }>({ k: "name", asc: true });
  const [page, setPage] = useState(0);
  const [edit, setEdit] = useState<Partial<Food> | null>(null);

  const q = useQuery({
    queryKey: ["foods"],
    queryFn: async () => {
      const { data, error } = await supabase.from("foods").select("id,name,category,cost_per_kg,active");
      if (error) throw error;
      return data as Food[];
    },
  });

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? [])
      .filter((f) => !s || f.name.toLowerCase().includes(s) || f.category.toLowerCase().includes(s))
      .sort((a, b) => {
        const av = a[sort.k]; const bv = b[sort.k];
        const r = typeof av === "number" ? av - (bv as number) : String(av).localeCompare(String(bv), "pt-BR");
        return sort.asc ? r : -r;
      });
  }, [q.data, search, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const view = rows.slice(page * PAGE, page * PAGE + PAGE);

  const save = useMutation({
    mutationFn: async (f: Partial<Food>) => {
      const payload = { name: f.name!.trim(), category: f.category!, cost_per_kg: Number(f.cost_per_kg), active: f.active ?? true };
      if (f.id) {
        const { error } = await supabase.from("foods").update(payload).eq("id", f.id);
        if (error) throw error;
        await logAudit("editar_alimento", "foods", f.id, payload);
      } else {
        const { data, error } = await supabase.from("foods").insert({ ...payload, organization_id: me!.profile.organization_id! }).select("id").single();
        if (error) throw error;
        await logAudit("criar_alimento", "foods", data.id, payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["foods"] }); setEdit(null); toast.success("Alimento salvo"); },
    onError: () => toast.error("Não foi possível salvar.", { description: "Somente administradores e gestores podem editar o cadastro." }),
  });
  const del = useMutation({
    mutationFn: async (f: Food) => {
      const { error } = await supabase.from("foods").delete().eq("id", f.id);
      if (error) throw error;
      await logAudit("excluir_alimento", "foods", f.id, { name: f.name });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["foods"] }); toast.success("Alimento excluído"); },
    onError: () => toast.error("Não foi possível excluir."),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!edit?.name?.trim() || !edit.category || edit.cost_per_kg == null || Number(edit.cost_per_kg) < 0) {
      toast.error("Preencha nome, categoria e custo válido.");
      return;
    }
    save.mutate(edit);
  }

  const canManage = !!me?.canManage;
  const SortHead = ({ k, children, right }: { k: SortKey; children: string; right?: boolean }) => (
    <TableHead className={right ? "text-right" : ""}>
      <button className="inline-flex items-center gap-1 text-[12px] font-medium" onClick={() => setSort({ k, asc: sort.k === k ? !sort.asc : true })}>{children}<ArrowUpDown className="size-3 text-subtle" /></button>
    </TableHead>
  );

  return (
    <>
      <PageHeader section="Inteligência alimentar" title="Cadastro de alimentos" description="Base de custos por quilo usada nos cálculos de composição, desperdício e margem."
        actions={canManage && <Button size="sm" onClick={() => setEdit({ category: "Carnes", active: true })}><Plus />Novo alimento</Button>} />
      <div className="mb-3 flex items-center gap-3">
        <Input placeholder="Buscar por nome ou categoria" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} className="h-8 max-w-xs text-[13px]" />
        {!canManage && <span className="text-[12px] text-subtle">Somente leitura para o seu perfil.</span>}
      </div>
      <div className="rounded-lg border bg-card">
        {q.isLoading ? <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9" />)}</div> : rows.length === 0 ? (
          <div className="p-4"><EmptyState title="Nenhum alimento encontrado" description="Ajuste a busca ou cadastre um novo alimento." /></div>
        ) : (
          <Table>
            <TableHeader><TableRow><SortHead k="name">Alimento</SortHead><SortHead k="category">Categoria</SortHead><SortHead k="cost_per_kg" right>Custo / kg</SortHead><TableHead className="text-[12px]">Status</TableHead>{canManage && <TableHead />}</TableRow></TableHeader>
            <TableBody>
              {view.map((f) => (
                <TableRow key={f.id}>
                  <TableCell className="font-medium">{f.name}</TableCell>
                  <TableCell className="text-muted-foreground">{f.category}</TableCell>
                  <TableCell className="tabular text-right">{fmt.brl(Number(f.cost_per_kg))}</TableCell>
                  <TableCell><span className={`text-[12px] ${f.active ? "text-success" : "text-subtle"}`}>{f.active ? "Ativo" : "Inativo"}</span></TableCell>
                  {canManage && <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="size-7" aria-label="Editar" onClick={() => setEdit(f)}><Pencil /></Button>
                    <Button size="icon" variant="ghost" className="size-7 text-destructive" aria-label="Excluir" onClick={() => { if (confirm(`Excluir ${f.name}?`)) del.mutate(f); }}><Trash2 /></Button>
                  </TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t px-4 py-2.5 text-[12px] text-muted-foreground">
          <span>{rows.length} itens</span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="h-7" disabled={page === 0} onClick={() => setPage(page - 1)}>Anterior</Button>
            <span className="tabular">{page + 1} / {pages}</span>
            <Button size="sm" variant="outline" className="h-7" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Próxima</Button>
          </div>
        </div>
      </div>
      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent>
          <form onSubmit={submit} className="flex h-full flex-col">
            <SheetHeader><SheetTitle>{edit?.id ? "Editar alimento" : "Novo alimento"}</SheetTitle><SheetDescription>O custo por quilo alimenta os cálculos financeiros.</SheetDescription></SheetHeader>
            <div className="grid gap-4 px-4">
              <div className="grid gap-1.5"><Label htmlFor="fn">Nome</Label><Input id="fn" maxLength={80} value={edit?.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Categoria</Label>
                <Select value={edit?.category ?? "Carnes"} onValueChange={(v) => setEdit({ ...edit, category: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="grid gap-1.5"><Label htmlFor="fc">Custo por kg (R$)</Label><Input id="fc" type="number" step="0.01" min="0" value={edit?.cost_per_kg ?? ""} onChange={(e) => setEdit({ ...edit, cost_per_kg: e.target.value as unknown as number })} /></div>
              <div className="flex items-center justify-between"><Label htmlFor="fa">Ativo no buffet</Label><Switch id="fa" checked={edit?.active ?? true} onCheckedChange={(v) => setEdit({ ...edit, active: v })} /></div>
            </div>
            <SheetFooter><Button type="submit" disabled={save.isPending}>Salvar</Button></SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
