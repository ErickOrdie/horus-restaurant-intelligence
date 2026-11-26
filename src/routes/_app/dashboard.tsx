import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/data";
import {
  PERIOD_LABELS, avg, contributionMargin, fmt, groupBy, localHour, occupancy, pctChange, periodRange,
  satisfactionIndex, startOfLocalDay, sum, type PeriodKey,
} from "@/lib/metrics";
import { PageHeader, Panel, EmptyState } from "@/components/horus/PageHeader";
import { KpiCard } from "@/components/horus/KpiCard";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/dashboard")({
  component: Dashboard,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Dashboard executivo · Hórus" },
      { name: "description", content: "Visão consolidada da operação: fluxo, salão, desperdício, custos e satisfação." },
      { property: "og:title", content: "Dashboard executivo · Hórus" },
      { property: "og:description", content: "Visão consolidada da operação do restaurante." },
    ],
  }),
});

async function loadWindow(from: Date, to: Date) {
  const f = from.toISOString();
  const t = to.toISOString();
  const [visits, plates, waste, cleaning, sat] = await Promise.all([
    fetchAll<{ arrived_at: string; wait_seconds: number; sector: string; party_size: number }>((a, b) =>
      supabase.from("service_visits").select("arrived_at,wait_seconds,sector,party_size").gte("arrived_at", f).lt("arrived_at", t).range(a, b)),
    fetchAll<{ analyzed_at: string; weight_g: number; estimated_cost: number; price_charged: number; composition: unknown }>((a, b) =>
      supabase.from("plate_analyses").select("analyzed_at,weight_g,estimated_cost,price_charged,composition").gte("analyzed_at", f).lt("analyzed_at", t).range(a, b)),
    fetchAll<{ recorded_at: string; waste_g: number; estimated_cost: number; foods: { name: string } | null }>((a, b) =>
      supabase.from("waste_records").select("recorded_at,waste_g,estimated_cost,foods(name)").gte("recorded_at", f).lt("recorded_at", t).range(a, b)),
    fetchAll<{ duration_seconds: number }>((a, b) =>
      supabase.from("cleaning_events").select("duration_seconds").gte("started_at", f).lt("started_at", t).range(a, b)),
    fetchAll<{ responded_at: string; score: number }>((a, b) =>
      supabase.from("satisfaction_responses").select("responded_at,score").gte("responded_at", f).lt("responded_at", t).range(a, b)),
  ]);
  return { visits, plates, waste, cleaning, sat };
}

function summarize(w: Awaited<ReturnType<typeof loadWindow>>) {
  const revenue = sum(w.plates.map((p) => Number(p.price_charged)));
  const cost = sum(w.plates.map((p) => Number(p.estimated_cost)));
  return {
    customers: sum(w.visits.map((v) => v.party_size)),
    plates: w.plates.length,
    wait: avg(w.visits.map((v) => v.wait_seconds)),
    cleaning: avg(w.cleaning.map((c) => c.duration_seconds)),
    wasteG: sum(w.waste.map((x) => x.waste_g)),
    wasteCost: sum(w.waste.map((x) => Number(x.estimated_cost))),
    avgPlateCost: w.plates.length ? cost / w.plates.length : null,
    margin: contributionMargin(revenue, cost),
    satisfaction: satisfactionIndex(w.sat.map((s) => s.score)),
  };
}

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = { contentStyle: { borderRadius: 6, border: "1px solid var(--border)", fontSize: 12, boxShadow: "none" } };

function Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>("ontem");
  const q = useQuery({
    queryKey: ["dashboard", period],
    queryFn: async () => {
      const r = periodRange(period);
      const [cur, prev, tables] = await Promise.all([
        loadWindow(r.from, r.to),
        loadWindow(r.prevFrom, r.prevTo),
        supabase.from("dining_tables").select("status"),
      ]);
      return { cur, prev, tables: tables.data ?? [], r, fetchedAt: new Date() };
    },
  });

  const d = q.data;
  const c = d ? summarize(d.cur) : null;
  const p = d ? summarize(d.prev) : null;
  const tableCount = (s: string) => d?.tables.filter((t) => t.status === s).length ?? 0;
  const occupied = tableCount("ocupada");
  const total = d?.tables.length ?? 0;
  const loading = q.isLoading;

  const hourly = d ? Array.from({ length: 6 }, (_, i) => 10 + i).map((h) => ({
    hora: `${h}h`,
    clientes: sum(d.cur.visits.filter((v) => localHour(v.arrived_at) === h).map((v) => v.party_size)),
  })) : [];
  const bySector = d ? [...groupBy(d.cur.visits, (v) => v.sector)].map(([k, v]) => ({ setor: String(k), min: (avg(v.map((x) => x.wait_seconds)) ?? 0) / 60 })).sort((a, b) => b.min - a.min) : [];
  const topWaste = d ? [...groupBy(d.cur.waste, (w) => w.foods?.name ?? "Não identificado")].map(([k, v]) => ({ alimento: String(k), kg: sum(v.map((x) => x.waste_g)) / 1000 })).sort((a, b) => b.kg - a.kg).slice(0, 6) : [];
  const dayKey = (iso: string) => startOfLocalDay(new Date(iso)).toISOString();
  const dayLabel = (k: string) => new Date(new Date(k).getTime() + 3 * 3600_000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" });
  const wasteDaily = d ? [...groupBy(d.cur.waste, (w) => dayKey(w.recorded_at))].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([k, v]) => ({ dia: dayLabel(String(k)), kg: sum(v.map((x) => x.waste_g)) / 1000, custo: sum(v.map((x) => Number(x.estimated_cost))) })) : [];
  const satDaily = d ? [...groupBy(d.cur.sat, (s) => dayKey(s.responded_at))].sort(([a], [b]) => String(a).localeCompare(String(b))).map(([k, v]) => ({ dia: dayLabel(String(k)), indice: satisfactionIndex(v.map((x) => x.score)) ?? 0 })) : [];
  const composition = d ? (["Carnes", "Acompanhamentos", "Saladas"] as const).map((k) => ({
    classe: k, pct: avg(d.cur.plates.map((pl) => Number((pl.composition as Record<string, number>)[k] ?? 0))) ?? 0,
  })) : [];

  function exportCsv() {
    if (!c) return;
    const rows = [
      ["Indicador", "Valor"],
      ["Período", PERIOD_LABELS[period]],
      ["Clientes contabilizados", c.customers],
      ["Pratos analisados", c.plates],
      ["Tempo médio de espera (min)", c.wait != null ? (c.wait / 60).toFixed(2) : ""],
      ["Tempo médio de limpeza (min)", c.cleaning != null ? (c.cleaning / 60).toFixed(2) : ""],
      ["Desperdício (kg)", (c.wasteG / 1000).toFixed(2)],
      ["Custo do desperdício (R$)", c.wasteCost.toFixed(2)],
      ["Custo médio por prato (R$)", c.avgPlateCost?.toFixed(2) ?? ""],
      ["Margem de contribuição (%)", c.margin?.toFixed(1) ?? ""],
      ["Índice de satisfação", c.satisfaction?.toFixed(1) ?? ""],
    ];
    const blob = new Blob(["\uFEFF" + rows.map((r) => r.join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `horus-dashboard-${period}.csv`;
    a.click();
  }

  const noData = !!c && c.plates === 0 && c.customers === 0;

  return (
    <>
      <PageHeader
        section="Visão geral"
        title="Dashboard executivo"
        description={d ? `Atualizado às ${d.fetchedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · Serviço de almoço` : "Consolidado da operação"}
        actions={<>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="h-8 w-44 text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => <SelectItem key={k} value={k}>{PERIOD_LABELS[k]}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}><RefreshCw className={q.isFetching ? "animate-spin" : ""} />Atualizar</Button>
          <Button size="sm" onClick={exportCsv} disabled={!c}><Download />Exportar CSV</Button>
        </>}
      />

      {q.isError && <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-[13px] text-destructive">Não foi possível carregar os indicadores. Tente atualizar.</div>}
      {noData && <div className="mb-4 rounded-md border bg-card px-4 py-3 text-[13px] text-muted-foreground">Ainda não há registros do serviço de almoço neste período. O serviço é monitorado entre 11h e 15h.</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <KpiCard loading={loading} label="Clientes contabilizados" value={c ? fmt.int(c.customers) : null} change={pctChange(c?.customers ?? null, p?.customers ?? null)} method="Soma de pessoas por grupo registrado na entrada no período." />
        <KpiCard loading={loading} label="Pratos analisados" value={c ? fmt.int(c.plates) : null} change={pctChange(c?.plates ?? null, p?.plates ?? null)} method="Total de pratos registrados na balança com análise de composição." />
        <KpiCard loading={loading} label="Ocupação do salão" value={total ? fmt.dec(occupancy(occupied, total) ?? 0) : null} unit="%" method="Mesas ocupadas ÷ total de mesas, no estado atual do salão." />
        <KpiCard loading={loading} label="Tempo médio de espera" value={c?.wait != null ? fmt.dec(c.wait / 60) : null} unit="min" higherIsBetter={false} change={pctChange(c?.wait ?? null, p?.wait ?? null)} method="Média do tempo entre chegada na fila e atendimento, todos os setores." />
        <KpiCard loading={loading} label="Mesas disponíveis" value={d ? `${tableCount("disponivel")}` : null} unit={`de ${total}`} method="Mesas com status Disponível no momento." />
        <KpiCard loading={loading} label="Mesas ocupadas" value={d ? `${occupied}` : null} method="Mesas com status Ocupada no momento." />
        <KpiCard loading={loading} label="Aguardando limpeza" value={d ? `${tableCount("aguardando_limpeza")}` : null} method="Mesas liberadas pelos clientes que ainda não foram higienizadas." />
        <KpiCard loading={loading} label="Tempo médio de limpeza" value={c?.cleaning != null ? fmt.dec(c.cleaning / 60) : null} unit="min" higherIsBetter={false} change={pctChange(c?.cleaning ?? null, p?.cleaning ?? null)} method="Média da duração dos eventos de higienização registrados." />
        <KpiCard loading={loading} label="Desperdício alimentar" value={c ? fmt.dec(c.wasteG / 1000) : null} unit="kg" higherIsBetter={false} change={pctChange(c?.wasteG ?? null, p?.wasteG ?? null)} method="Soma dos descartes pesados ao final do serviço." />
        <KpiCard loading={loading} label="Custo do desperdício" value={c ? fmt.brl(c.wasteCost) : null} higherIsBetter={false} change={pctChange(c?.wasteCost ?? null, p?.wasteCost ?? null)} method="Peso descartado × custo por kg cadastrado de cada alimento." />
        <KpiCard loading={loading} label="Custo médio por prato" value={c?.avgPlateCost != null ? fmt.brl(c.avgPlateCost) : null} higherIsBetter={false} change={pctChange(c?.avgPlateCost ?? null, p?.avgPlateCost ?? null)} method="Soma do custo estimado dos pratos ÷ número de pratos." />
        <KpiCard loading={loading} label="Margem de contribuição" value={c?.margin != null ? fmt.dec(c.margin) : null} unit="%" change={pctChange(c?.margin ?? null, p?.margin ?? null)} method="(Receita por peso − custo estimado dos pratos) ÷ receita." />
        <KpiCard loading={loading} label="Índice de satisfação" value={c?.satisfaction != null ? fmt.dec(c.satisfaction) : null} unit="/ 100" change={pctChange(c?.satisfaction ?? null, p?.satisfaction ?? null)} method="Média das notas (0–10) da pesquisa de satisfação × 10." />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Fluxo de clientes por horário" description="Pessoas registradas na entrada, por hora">
          <ChartBox loading={loading} empty={!hourly.some((h) => h.clientes)}>
            <AreaChart data={hourly}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="hora" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} width={36} /><RTooltip {...tooltipStyle} /><Area dataKey="clientes" name="Clientes" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.08} strokeWidth={1.75} /></AreaChart>
          </ChartBox>
        </Panel>
        <Panel title="Tempo de atendimento por setor" description="Espera média em minutos">
          <ChartBox loading={loading} empty={!bySector.length}>
            <BarChart data={bySector} layout="vertical" margin={{ left: 8 }}><CartesianGrid horizontal={false} stroke="var(--border)" /><XAxis type="number" tick={axis} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="setor" tick={axis} axisLine={false} tickLine={false} width={64} /><RTooltip {...tooltipStyle} formatter={(v: number) => `${fmt.dec(v)} min`} /><Bar dataKey="min" name="Espera" fill="var(--chart-1)" radius={[0, 3, 3, 0]} barSize={14} /></BarChart>
          </ChartBox>
        </Panel>
        <Panel title="Alimentos mais desperdiçados" description="Descarte acumulado no período (kg)">
          <ChartBox loading={loading} empty={!topWaste.length}>
            <BarChart data={topWaste}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="alimento" tick={axis} axisLine={false} tickLine={false} interval={0} /><YAxis tick={axis} axisLine={false} tickLine={false} width={36} /><RTooltip {...tooltipStyle} formatter={(v: number) => `${fmt.dec(v)} kg`} /><Bar dataKey="kg" name="Desperdício" fill="var(--chart-2)" radius={[3, 3, 0, 0]} barSize={28} /></BarChart>
          </ChartBox>
        </Panel>
        <Panel title="Composição média dos pratos" description="Participação por classe de alimento (%)">
          {loading ? <Skeleton className="h-56 w-full" /> : composition.every((x) => !x.pct) ? <EmptyState title="Sem pratos analisados" description="A composição aparece quando houver pratos registrados no período." /> : (
            <div className="grid gap-4 py-2">
              {composition.map((x, i) => (
                <div key={x.classe}>
                  <div className="mb-1.5 flex justify-between text-[13px]"><span>{x.classe}</span><span className="tabular font-medium">{fmt.dec(x.pct)}%</span></div>
                  <div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full" style={{ width: `${x.pct}%`, background: `var(--chart-${i + 1})` }} /></div>
                </div>
              ))}
            </div>
          )}
        </Panel>
        <Panel title="Evolução do desperdício" description="Quilos descartados por dia">
          <ChartBox loading={loading} empty={wasteDaily.length < 2} emptyText="Selecione um período de vários dias para ver a evolução.">
            <LineChart data={wasteDaily}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="dia" tick={axis} axisLine={false} tickLine={false} /><YAxis tick={axis} axisLine={false} tickLine={false} width={36} /><RTooltip {...tooltipStyle} formatter={(v: number) => `${fmt.dec(v)} kg`} /><Line dataKey="kg" name="Desperdício" stroke="var(--chart-5)" strokeWidth={1.75} dot={false} /></LineChart>
          </ChartBox>
        </Panel>
        <Panel title="Histórico de satisfação" description="Índice diário (0–100)">
          <ChartBox loading={loading} empty={satDaily.length < 2} emptyText="Selecione um período de vários dias para ver o histórico.">
            <LineChart data={satDaily}><CartesianGrid vertical={false} stroke="var(--border)" /><XAxis dataKey="dia" tick={axis} axisLine={false} tickLine={false} /><YAxis domain={[50, 100]} tick={axis} axisLine={false} tickLine={false} width={36} /><RTooltip {...tooltipStyle} formatter={(v: number) => fmt.dec(v)} /><Line dataKey="indice" name="Índice" stroke="var(--chart-3)" strokeWidth={1.75} dot={false} /></LineChart>
          </ChartBox>
        </Panel>
      </div>
    </>
  );
}

function ChartBox({ loading, empty, emptyText, children }: { loading: boolean; empty: boolean; emptyText?: string; children: React.ReactElement }) {
  if (loading) return <Skeleton className="h-56 w-full" />;
  if (empty) return <EmptyState title="Sem dados no período" description={emptyText ?? "Não há registros para o filtro selecionado."} />;
  return <div className="h-56"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>;
}
