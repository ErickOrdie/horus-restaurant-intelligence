import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { occupancyHistory } from "@/lib/restaurant";
import { KpiCard } from "./KpiCard";
import { Panel } from "./PageHeader";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { LineChart,Line,CartesianGrid,XAxis,YAxis,Tooltip,ResponsiveContainer } from "recharts";

export function RestaurantMetrics(){
  const [source,setSource]=useState("latest");
  const q=useQuery({queryKey:["restaurant-metrics"],queryFn:async()=>{
    const since=new Date(Date.now()-86400000).toISOString();
    const {data,error}=await supabase.from("occupancy_metrics").select("*, units(name), cameras(name)").gte("created_at",since).order("created_at",{ascending:false}).limit(1000);if(error)throw error;return data;
  }});
  const rows=q.data??[], latestSource=rows[0];
  const key=(r:typeof rows[number])=>`${r.unit_id}:${r.camera_id??"upload"}`;
  const selected=source==="latest"&&latestSource?key(latestSource):source;
  const filtered=rows.filter(r=>key(r)===selected),latest=filtered[0],stats=occupancyHistory(filtered);
  const sources=[...new Map(rows.map(r=>[key(r),`${r.units?.name??"Unidade"} · ${r.cameras?.name??"Imagem / webcam sem associação"}`])).entries()];
  const metrics=[ ["Pessoas visíveis",latest?.people_count], ["Mesas detectadas",latest?.table_count], ["Mesas ocupadas · estimativa",latest?.occupied_count], ["Mesas disponíveis · estimativa",latest?.available_count], ["Aguardando recolhimento · estimativa",latest?.awaiting_count], ["Mesas indeterminadas",latest?.unknown_count], ["Ocupação estimada (%)",latest?.occupancy_percent], ["Média de pessoas · 24h",stats.averagePeople], ["Pico de pessoas · 24h",stats.peakPeople], ["Média de ocupação (%) · 24h",stats.averageOccupancy] ] as const;
  return <section className="mb-6">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-[18px] font-semibold">Hórus Flow · Salão ao vivo</h2><p className="text-[12px] text-muted-foreground">{latest?`Última inferência: ${new Date(latest.created_at).toLocaleString("pt-BR")} · ${latest.processing_ms??"—"} ms`:q.isError?"Não foi possível carregar as inferências.":"Nenhuma inferência registrada"}</p></div><Select value={source} onValueChange={setSource}><SelectTrigger className="w-full sm:w-80"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="latest">Fonte mais recente</SelectItem>{sources.map(([id,label])=><SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select></div>
    <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{metrics.map(([label,value])=><KpiCard key={label} label={label} value={value==null?null:Number(value).toLocaleString("pt-BR",{maximumFractionDigits:1})} method="Observações da mesma unidade e fonte; contagens por imagem, sem soma de clientes ou identificação pessoal." loading={q.isPending}/>)}</div>
    <Panel title="Pessoas visíveis · últimas 24 horas">{filtered.length?<div className="h-56"><ResponsiveContainer width="100%" height="100%"><LineChart data={[...filtered].reverse().map(r=>({hora:new Date(r.created_at).toLocaleTimeString("pt-BR"),pessoas:r.people_count,mesas:r.table_count}))}><CartesianGrid stroke="var(--border)" vertical={false}/><XAxis dataKey="hora" tick={{fontSize:11}} minTickGap={60}/><YAxis allowDecimals={false} tick={{fontSize:11}}/><Tooltip/><Line dataKey="pessoas" name="Pessoas visíveis" stroke="var(--chart-1)" dot={false} connectNulls={false}/><Line dataKey="mesas" name="Mesas detectadas" stroke="var(--chart-2)" dot={false} connectNulls={false}/></LineChart></ResponsiveContainer></div>:<p className="text-[13px] text-muted-foreground">Sem observações reais nas últimas 24 horas.</p>}</Panel>
  </section>;
}