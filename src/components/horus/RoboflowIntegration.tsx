import { useEffect,useRef,useState } from "react";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Activity,ImageUp,KeyRound,Play } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { roboflowKeyStatus,saveRoboflowConfig,testRoboflowConnection,runHostedDetection } from "@/lib/roboflow.functions";
import { Panel } from "./PageHeader";
import { VisionUsage } from "./VisionUsage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";

export function RoboflowIntegration(){
  const {data:me}=useProfile(),qc=useQueryClient(),admin=Boolean(me?.roles.includes("admin"));
  const keyFn=useServerFn(roboflowKeyStatus),saveFn=useServerFn(saveRoboflowConfig),testFn=useServerFn(testRoboflowConnection),infer=useServerFn(runHostedDetection);
  const key=useQuery({queryKey:["roboflow-key"],queryFn:()=>keyFn()});
  const q=useQuery({queryKey:["roboflow-config"],queryFn:async()=>{const {data,error}=await supabase.from("roboflow_config").select("*").maybeSingle();if(error)throw error;return data;}});
  const [form,setForm]=useState({workspace_id:"",model_id:"",workflow_id:"",model_version:"",endpoint:"https://serverless.roboflow.com",daily_limit:100,monthly_limit:1000,requests_per_minute:6,min_frame_interval_s:10,price_per_inference:null as number|null,currency:"BRL" as "BRL"|"USD"});
  useEffect(()=>{if(q.data){const c=q.data;setForm({workspace_id:c.workspace_id,model_id:c.model_id,workflow_id:c.workflow_id,model_version:c.model_version,endpoint:c.endpoint,daily_limit:c.daily_limit,monthly_limit:c.monthly_limit,requests_per_minute:c.requests_per_minute,min_frame_interval_s:c.min_frame_interval_s,price_per_inference:c.price_per_inference,currency:c.currency==="USD"?"USD":"BRL"});}},[q.data]);
  const models=useQuery({queryKey:["roboflow-test-models"],queryFn:async()=>(await supabase.from("ai_models").select("id,name").eq("provider","roboflow").eq("status","ativo")).data??[]});
  const [model,setModel]=useState("");const fileRef=useRef<HTMLInputElement>(null);const [image,setImage]=useState<{b64:string;mime:"image/jpeg"|"image/png"|"image/webp"}|null>(null);
  const save=useMutation({mutationFn:()=>saveFn({data:form}),onSuccess:()=>{toast.success("Configuração Roboflow salva");void qc.invalidateQueries({queryKey:["roboflow-config"]});},onError:e=>toast.error(e.message)});
  const test=useMutation({mutationFn:()=>testFn(),onSuccess:r=>{(r.ok?toast.success:toast.error)(r.message);void qc.invalidateQueries({queryKey:["roboflow-config"]});},onError:e=>toast.error(e.message)});
  const run=useMutation({mutationFn:async()=>{const unit=me?.units[0];if(!image||!unit||!model)throw new Error("Escolha imagem e modelo ativo.");return infer({data:{imageBase64:image.b64,mime:image.mime,minConfidence:0.5,unitId:unit.id,modelId:model,cameraId:null,idempotencyKey:crypto.randomUUID(),source:"teste",retainImage:false,zones:[]}});},onSuccess:r=>{if(r.status==="sucesso")toast.success(`${r.result.detections.length} detecções · ${r.result.processing_ms} ms`);else toast.error(r.message);void qc.invalidateQueries({queryKey:["roboflow-requests"]});},onError:e=>toast.error(e.message)});
  const textFields=[ ["workspace_id","Workspace ID"],["model_id","Model ID padrão"],["model_version","Versão do modelo"],["workflow_id","Workflow ID padrão"],["endpoint","Endpoint de inferência"] ] as const;
  const numberFields=[["daily_limit","Limite diário",0,1000000],["monthly_limit","Limite mensal",0,10000000],["requests_per_minute","Requisições por minuto",1,60],["min_frame_interval_s","Intervalo mínimo (s)",5,3600]] as const;
  return <div className="mb-6 grid gap-4">
    <Panel title="Roboflow · API hospedada" action={<span className={`text-[13px] ${q.data?.last_status==="online"?"text-success":"text-warning"}`}>{q.data?.last_status==="online"?"Conectada":"Não conectado"}</span>}>
      <form className="grid gap-4" onSubmit={e=>{e.preventDefault();save.mutate();}}>
        <fieldset disabled={!admin||save.isPending} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {textFields.map(([field,label])=><div key={field} className="grid gap-1.5"><Label htmlFor={`rf-${field}`}>{label}</Label><Input id={`rf-${field}`} value={form[field]} onChange={e=>setForm({...form,[field]:e.target.value})}/></div>)}
          {numberFields.map(([field,label,min,max])=><div key={field} className="grid gap-1.5"><Label htmlFor={`rf-${field}`}>{label}</Label><Input id={`rf-${field}`} type="number" required min={min} max={max} value={form[field]} onChange={e=>setForm({...form,[field]:Number(e.target.value)})}/></div>)}
          <div className="grid gap-1.5"><Label htmlFor="rf-price">Tarifa por inferência (opcional)</Label><Input id="rf-price" type="number" min="0" step="0.000001" value={form.price_per_inference??""} onChange={e=>setForm({...form,price_per_inference:e.target.value===""?null:Number(e.target.value)})}/></div>
          <div className="grid gap-1.5"><Label>Moeda</Label><Select value={form.currency} onValueChange={v=>setForm({...form,currency:v==="USD"?"USD":"BRL"})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="BRL">BRL · Real</SelectItem><SelectItem value="USD">USD · Dólar</SelectItem></SelectContent></Select></div>
        </fieldset>
        <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={!admin||save.isPending}>Salvar Roboflow</Button><Button type="button" variant="outline" disabled={!admin||test.isPending} onClick={()=>test.mutate()}><Activity/>{test.isPending?"Testando…":"Testar conexão Roboflow"}</Button><span className="text-[12px] text-muted-foreground">{q.data?.last_test_at?`Último teste: ${new Date(q.data.last_test_at).toLocaleString("pt-BR")} · ${q.data.last_latency_ms??"—"} ms`:"Ainda não testada"}</span></div>
      </form>
      <div className="mt-4 flex items-center gap-2 border-t pt-4 text-[13px]"><KeyRound className="size-4 text-subtle"/><span>{key.isPending?"Verificando chave…":key.data?.configured?"Chave privada configurada nos segredos do servidor.":"Chave privada não configurada nos segredos do servidor."}</span></div>
      {q.data?.last_error&&<p className="mt-2 text-[13px] text-destructive">{q.data.last_error}</p>}
    </Panel>
    <Panel title="Inferência de teste"><div className="flex flex-wrap items-center gap-3"><Select value={model||"none"} onValueChange={v=>setModel(v==="none"?"":v)}><SelectTrigger className="w-full sm:w-72"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Selecione um modelo cadastrado</SelectItem>{models.data?.map(m=><SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(!f)return;if(f.size>10*1024*1024||!["image/jpeg","image/png","image/webp"].includes(f.type)){toast.error("Use JPG, PNG ou WEBP de até 10 MB.");return;}const reader=new FileReader();reader.onload=()=>setImage({b64:String(reader.result).split(",")[1]??"",mime:f.type as "image/jpeg"});reader.readAsDataURL(f);}}/><Button variant="outline" onClick={()=>fileRef.current?.click()}><ImageUp/>{image?"Imagem selecionada":"Selecionar imagem de teste"}</Button><Button disabled={!image||!model||run.isPending} onClick={()=>run.mutate()}><Play/>{run.isPending?"Analisando…":"Executar inferência de teste"}</Button></div><div className="mt-3 flex flex-wrap gap-4 text-[13px]"><Link to="/modelos" className="text-primary hover:underline">Modelos de IA</Link><Link to="/laboratorio" className="text-primary hover:underline">Abrir laboratório</Link></div></Panel>
    <VisionUsage/>
  </div>;
}