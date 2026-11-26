import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { NAV } from "@/components/horus/nav";
import { PageHeader, Panel } from "@/components/horus/PageHeader";

function find(slug: string) {
  for (const g of NAV) for (const it of g.items) if (it.slug === slug) return { group: g.label, item: it };
  return null;
}

export const Route = createFileRoute("/_app/modulos/$slug")({
  loader: ({ params }) => { const m = find(params.slug); if (!m) throw notFound(); return { title: m.item.label, group: m.group }; },
  component: Modulo,
  head: ({ loaderData }) => {
    const t = `${loaderData?.title ?? "Módulo"} · Hórus`;
    const d = `${loaderData?.title ?? "Módulo"} — ${loaderData?.group ?? "Hórus"} com dados da operação.`;
    return { meta: [{ title: t }, { name: "description", content: d }, { property: "og:title", content: t }, { property: "og:description", content: d }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] };
  },
});

type Row = Record<string, unknown>;
type Src = { table: string; select: string; order: string; cols: [string, string, (v: unknown, r: Row) => string][] };
const brl = (v: unknown) => Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dt = (v: unknown) => new Date(String(v)).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const s = (v: unknown) => String(v ?? "—");
const min = (v: unknown) => `${(Number(v) / 60).toFixed(1)} min`;

const SRC: Record<string, Src> = {
  plates: { table: "plate_analyses", select: "analyzed_at,weight_g,estimated_cost,price_charged", order: "analyzed_at", cols: [["Horário", "analyzed_at", dt], ["Peso", "weight_g", (v) => `${v} g`], ["Custo", "estimated_cost", brl], ["Cobrado", "price_charged", brl]] },
  visits: { table: "service_visits", select: "arrived_at,wait_seconds,sector,party_size", order: "arrived_at", cols: [["Chegada", "arrived_at", dt], ["Setor", "sector", s], ["Pessoas", "party_size", s], ["Espera", "wait_seconds", min]] },
  clean: { table: "cleaning_events", select: "started_at,duration_seconds,confirmed", order: "started_at", cols: [["Início", "started_at", dt], ["Duração", "duration_seconds", min], ["Confirmada", "confirmed", (v) => (v ? "Sim" : "Não")]] },
  waste: { table: "waste_records", select: "recorded_at,waste_g,estimated_cost,foods(name)", order: "recorded_at", cols: [["Registro", "recorded_at", dt], ["Alimento", "foods", (v) => s((v as Row | null)?.["name"])], ["Desperdício", "waste_g", (v) => `${v} g`], ["Custo", "estimated_cost", brl]] },
  occ: { table: "occupancy_metrics", select: "created_at,people_count,occupied_count,available_count,awaiting_count,occupancy_percent", order: "created_at", cols: [["Horário", "created_at", dt], ["Pessoas", "people_count", s], ["Ocupadas", "occupied_count", s], ["Livres", "available_count", s], ["Ocupação", "occupancy_percent", (v) => `${v}%`]] },
  sat: { table: "satisfaction_responses", select: "responded_at,score,comment", order: "responded_at", cols: [["Data", "responded_at", dt], ["Nota", "score", s], ["Comentário", "comment", s]] },
  runs: { table: "inference_runs", select: "created_at,task,source,status,processing_ms", order: "created_at", cols: [["Horário", "created_at", dt], ["Tarefa", "task", s], ["Fonte", "source", s], ["Status", "status", s], ["Latência", "processing_ms", (v) => `${v ?? "—"} ms`]] },
  alerts: { table: "alerts", select: "created_at,title,severity,status", order: "created_at", cols: [["Data", "created_at", dt], ["Alerta", "title", s], ["Severidade", "severity", s], ["Status", "status", s]] },
  units: { table: "units", select: "name,city,total_tables,created_at", order: "created_at", cols: [["Unidade", "name", s], ["Cidade", "city", s], ["Mesas", "total_tables", s]] },
  orgs: { table: "organizations", select: "name,slug,created_at", order: "created_at", cols: [["Organização", "name", s], ["Identificador", "slug", s], ["Criada", "created_at", dt]] },
  users: { table: "profiles", select: "full_name,email,created_at", order: "created_at", cols: [["Nome", "full_name", s], ["E-mail", "email", s], ["Desde", "created_at", dt]] },
  audit: { table: "audit_logs", select: "created_at,action,entity", order: "created_at", cols: [["Data", "created_at", dt], ["Ação", "action", s], ["Entidade", "entity", s]] },
  tse: { table: "table_state_events", select: "created_at,state,source,dining_tables(code)", order: "created_at", cols: [["Horário", "created_at", dt], ["Mesa", "dining_tables", (v) => s((v as Row | null)?.["code"])], ["Estado", "state", s], ["Origem", "source", s]] },
};
const MAP: Record<string, string> = {
  "indicadores-executivos": "plates", "insights-operacionais": "alerts", "composicao-dos-pratos": "plates",
  "filas-e-atendimento": "visits", "limpeza-das-mesas": "clean", "jornada-do-cliente": "tse",
  "desperdicio-alimentar": "waste", "monitoramento-do-buffet": "occ", "aceitacao-dos-alimentos": "sat",
  "analise-financeira": "plates", "historico-de-deteccoes": "runs", "horus-ai": "alerts", relatorios: "audit",
  "pesquisa-de-satisfacao": "sat", organizacoes: "orgs", unidades: "units", usuarios: "users", permissoes: "users", configuracoes: "units",
};

function kpis(key: string, rows: Row[], count: number): [string, string][] {
  const n = (k: string) => rows.map((r) => Number(r[k] ?? 0));
  const avg = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  switch (key) {
    case "plates": { const c = sum(n("estimated_cost")), p = sum(n("price_charged")); return [["Pratos analisados", String(count)], ["Peso médio", `${avg(n("weight_g")).toFixed(0)} g`], ["Ticket médio", brl(avg(n("price_charged")))], ["Margem (amostra)", p ? `${(((p - c) / p) * 100).toFixed(1)}%` : "—"]]; }
    case "visits": return [["Atendimentos", String(count)], ["Espera média", min(avg(n("wait_seconds")))], ["Maior espera", min(Math.max(0, ...n("wait_seconds")))], ["Grupo médio", avg(n("party_size")).toFixed(1)]];
    case "clean": return [["Limpezas", String(count)], ["Duração média", min(avg(n("duration_seconds")))], ["Confirmadas", `${rows.filter((r) => r["confirmed"]).length}/${rows.length}`]];
    case "waste": return [["Registros", String(count)], ["Desperdício (amostra)", `${(sum(n("waste_g")) / 1000).toFixed(1)} kg`], ["Custo (amostra)", brl(sum(n("estimated_cost")))]];
    case "occ": return [["Leituras", String(count)], ["Pessoas (média)", avg(n("people_count")).toFixed(0)], ["Ocupação média", `${avg(n("occupancy_percent")).toFixed(1)}%`], ["Pico de pessoas", String(Math.max(0, ...n("people_count")))]];
    case "sat": { const sc = n("score"); return [["Respostas", String(count)], ["Nota média", avg(sc).toFixed(1)], ["Notas 4–5", `${sc.length ? ((sc.filter((x) => x >= 4).length / sc.length) * 100).toFixed(0) : 0}%`]]; }
    case "runs": return [["Análises", String(count)], ["Sucesso", `${rows.filter((r) => r["status"] === "sucesso").length}/${rows.length}`], ["Latência média", `${avg(n("processing_ms")).toFixed(0)} ms`]];
    case "alerts": return [["Alertas", String(count)], ["Abertos (amostra)", String(rows.filter((r) => r["status"] === "aberto").length)], ["Alta severidade", String(rows.filter((r) => r["severity"] === "alta").length)]];
    default: return [["Registros", String(count)]];
  }
}

function Modulo() {
  const { slug } = Route.useParams();
  const m = find(slug)!;
  const key = MAP[slug] ?? "runs";
  const src = SRC[key]!;
  const q = useQuery({
    queryKey: ["modulo", slug],
    queryFn: async () => {
      const { data, count, error } = await supabase.from(src.table as "alerts").select(src.select, { count: "exact" }).order(src.order as "created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return { rows: (data ?? []) as unknown as Row[], count: count ?? 0 };
    },
  });
  const rows = q.data?.rows ?? [];
  const Icon = m.item.icon;
  return (
    <>
      <PageHeader section={m.group} title={m.item.label} description="Inclui dados fictícios de demonstração para apresentação." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis(key, rows, q.data?.count ?? 0).map(([l, v]) => (
          <div key={l} className="rounded-lg border bg-card p-5"><p className="text-[12px] text-muted-foreground">{l}</p><p className="tabular mt-1 text-2xl font-semibold">{q.isLoading ? "…" : v}</p></div>
        ))}
      </div>
      <Panel title="Registros recentes" className="mt-4">
        {q.error ? <p className="p-5 text-sm text-destructive">Não foi possível carregar os dados.</p> : rows.length === 0 && !q.isLoading ? (
          <div className="flex gap-3 p-5 text-[13px] text-muted-foreground"><Icon className="size-5 text-gold" />Sem registros ainda.</div>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-[13px]">
            <thead><tr className="border-b text-left text-muted-foreground">{src.cols.map(([h]) => <th key={h} className="px-4 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>{rows.slice(0, 25).map((r, i) => <tr key={i} className="border-b last:border-0">{src.cols.map(([h, k, f]) => <td key={h} className="tabular px-4 py-2">{f(r[k], r)}</td>)}</tr>)}</tbody>
          </table></div>
        )}
      </Panel>
    </>
  );
}
