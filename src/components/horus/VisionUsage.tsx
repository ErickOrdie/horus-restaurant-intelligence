import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAll } from "@/lib/data";
import { usageSummary } from "@/lib/roboflow";
import { Panel } from "./PageHeader";
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

export function useVisionRequests(){return useQuery({queryKey:["roboflow-requests"],queryFn:()=>fetchAll<Tables<"roboflow_requests">>((from,to)=>supabase.from("roboflow_requests").select("*").order("created_at",{ascending:false}).range(from,to))});}
export function VisionUsage({detailed=false}:{detailed?:boolean}) {
  const q=useVisionRequests();
  const config=useQuery({queryKey:["roboflow-config"],queryFn:async()=>{const {data,error}=await supabase.from("roboflow_config").select("*").maybeSingle();if(error)throw error;return data;}});
  const labels=useQuery({queryKey:["vision-usage-labels"],queryFn:async()=>{const [m,u]=await Promise.all([supabase.from("ai_models").select("id,name"),supabase.from("units").select("id,name")]);return {models:m.data??[],units:u.data??[]};}});
  const rows=q.data??[],s=usageSummary(rows);
  const exportRows=()=>{const a=document.createElement("a");const url=URL.createObjectURL(new Blob([JSON.stringify(rows.map(({result,...r})=>r),null,2)],{type:"application/json"}));a.href=url;a.download="consumo-horus.json";a.click();URL.revokeObjectURL(url);};
  return <>
    <Panel title="Consumo de inferências" action={<Button variant="outline" size="sm" onClick={exportRows} disabled={!rows.length}><Download />Exportar</Button>}>
      {q.isError?<p className="text-destructive text-[13px]">Não foi possível consultar o consumo.</p>:<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[["Requisições enviadas",s.total],["Hoje",`${s.daily} / ${config.data?.daily_limit??"—"}`],["Neste mês",`${s.monthly} / ${config.data?.monthly_limit??"—"}`],["Latência média",s.averageMs===null?"—":`${s.averageMs} ms`]].map(([label,value])=><div key={label}><p className="text-[12px] text-muted-foreground">{label}</p><p className="mt-1 text-[24px] font-semibold tabular">{q.isPending?"—":value}</p></div>)}
      </div>}
      <div className="mt-4 flex flex-wrap gap-4 text-[13px]"><span>Erros: <b>{s.errors}</b></span><span>Custo estimado: <b>{s.costs.length?s.costs.map(([currency,n])=>new Intl.NumberFormat("pt-BR",{style:"currency",currency}).format(n)).join(" + "):"Tarifa não cadastrada"}</b></span></div>
      {config.data&&(s.daily>=config.data.daily_limit*0.8||s.monthly>=config.data.monthly_limit*0.8)&&<p className="mt-3 text-[13px] text-warning">Consumo próximo ou acima do limite. Novas análises são bloqueadas ao atingir a cota.</p>}
    </Panel>
    {detailed&&<div className="mt-4 grid gap-4 md:grid-cols-3">{[{title:"Por modelo",items:s.byModel,label:(id:string)=>labels.data?.models.find(m=>m.id===id)?.name??id},{title:"Por unidade",items:s.byUnit,label:(id:string)=>labels.data?.units.find(u=>u.id===id)?.name??id},{title:"Consumo diário",items:s.byDay,label:(id:string)=>id}].map(group=><Panel key={group.title} title={group.title}>{group.items.length?<dl className="grid gap-2 text-[13px]">{group.items.map(([id,n])=><div key={id} className="flex justify-between gap-3"><dt className="break-words">{group.label(id)}</dt><dd className="tabular">{n}</dd></div>)}</dl>:<p className="text-[13px] text-muted-foreground">Sem requisições.</p>}</Panel>)}</div>}
    <Panel title="Histórico de requisições" className="mt-4">
      {!rows.length?<p className="text-[13px] text-muted-foreground">Nenhuma requisição enviada à Roboflow.</p>:<Table><TableHeader><TableRow>{["Data","Modelo","Unidade","Status","Tempo","Erro"].map(t=><TableHead key={t}>{t}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.slice(0,detailed?200:10).map(r=><TableRow key={r.id}><TableCell className="whitespace-nowrap tabular">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell><TableCell>{labels.data?.models.find(m=>m.id===r.model_id)?.name??"—"}</TableCell><TableCell>{labels.data?.units.find(u=>u.id===r.unit_id)?.name??"—"}</TableCell><TableCell className={r.status==="sucesso"?"text-success":r.status==="erro"?"text-destructive":"text-warning"}>{r.status}</TableCell><TableCell className="tabular whitespace-nowrap">{r.processing_ms===null?"—":`${r.processing_ms} ms`}</TableCell><TableCell className="max-w-sm text-[12px]">{r.error_message}</TableCell></TableRow>)}</TableBody></Table>}
    </Panel>
  </>;
}