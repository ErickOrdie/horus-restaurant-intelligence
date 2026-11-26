import { createFileRoute } from "@tanstack/react-router";
import { useMutation,useQuery,useQueryClient } from "@tanstack/react-query";
import { useEffect,useRef,useState } from "react";
import { toast } from "sonner";
import { Camera,Download,ImageUp,Play,Square,Trash2,Eye } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { runHostedDetection,type HostedResult } from "@/lib/roboflow.functions";
import { PURPOSES,type Purpose,type Zone } from "@/lib/roboflow";
import { countByClass,filterByConfidence,DetectionSchema } from "@/lib/ai-engine-contract";
import { PageHeader,Panel,EmptyState } from "@/components/horus/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { Table,TableBody,TableCell,TableHead,TableHeader,TableRow } from "@/components/ui/table";

export const Route=createFileRoute("/_app/laboratorio")({component:Laboratorio,head:()=>({meta:[{title:"Laboratório de visão computacional · Hórus"},{name:"description",content:"Análises reais hospedadas na Roboflow com imagens, webcam e regiões."},{property:"og:title",content:"Laboratório de visão computacional · Hórus"},{property:"og:description",content:"Detecções e segmentações reais, sem servidor local."},{property:"og:type",content:"website"},{name:"twitter:card",content:"summary"}]})});
type ImageData={url:string;b64:string;mime:"image/jpeg"|"image/png"|"image/webp"};
function download(name:string,content:string,type:string){const a=document.createElement("a"),url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}
function Laboratorio(){
  const qc=useQueryClient(),detect=useServerFn(runHostedDetection),{data:me}=useProfile();
  const [purpose,setPurpose]=useState< Purpose >("food"),[modelId,setModelId]=useState(""),[unitId,setUnitId]=useState(""),[cameraId,setCameraId]=useState("");
  const [conf,setConf]=useState(0.5),[img,setImg]=useState<ImageData|null>(null),[result,setResult]=useState<HostedResult|null>(null),[failure,setFailure]=useState<string|null>(null);
  const [webcam,setWebcam]=useState(false),[continuous,setContinuous]=useState(false),[frequency,setFrequency]=useState(10),[retain,setRetain]=useState(false);
  const streamRef=useRef<MediaStream|null>(null),videoRef=useRef<HTMLVideoElement>(null),fileRef=useRef<HTMLInputElement>(null),busy=useRef(false);
  const [zones,setZones]=useState<Zone[]>([]),[zoneName,setZoneName]=useState("Região 1"),[drawing,setDrawing]=useState(false),[points,setPoints]=useState<Zone["points"]>([]);
  const models=useQuery({queryKey:["ai-models-lab"],queryFn:async()=>{const {data,error}=await supabase.from("ai_models").select("*").eq("provider","roboflow").eq("status","ativo");if(error)throw error;return data;}});
  const history=useQuery({queryKey:["inference-runs"],queryFn:async()=>(await supabase.from("inference_runs").select("*").order("created_at",{ascending:false}).limit(30)).data??[]});
  const config=useQuery({queryKey:["roboflow-config"],queryFn:async()=>(await supabase.from("roboflow_config").select("*").maybeSingle()).data});
  const cameras=useQuery({queryKey:["lab-cameras"],queryFn:async()=>(await supabase.from("cameras").select("id,name,unit_id,model_id,enabled").eq("connection_type","webcam").eq("enabled",true)).data??[]});
  const selectedUnit=unitId||me?.units[0]?.id||"";
  const taskModels=(models.data??[]).filter(m=>m.purpose===purpose);
  const minFrequency=Math.max(config.data?.min_frame_interval_s??10,Math.ceil(60/(config.data?.requests_per_minute??6)));
  useEffect(()=>{if(webcam&&videoRef.current){videoRef.current.srcObject=streamRef.current;void videoRef.current.play().catch(()=>{});}},[webcam]);
  useEffect(()=>()=>{streamRef.current?.getTracks().forEach(t=>t.stop());},[]);
  function stopWebcam(){streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setContinuous(false);setWebcam(false);}
  useEffect(()=>{const onHidden=()=>{if(document.hidden){streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setContinuous(false);setWebcam(false);}};document.addEventListener("visibilitychange",onHidden);return()=>document.removeEventListener("visibilitychange",onHidden);},[]);
  function loadFile(f:File){if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>10*1024*1024){toast.error("Use JPG, PNG ou WEBP de até 10 MB.");return;}stopWebcam();const r=new FileReader();r.onload=()=>{const url=String(r.result);setImg({url,b64:url.split(",")[1]??"",mime:f.type as "image/jpeg"});setResult(null);setFailure(null);setZones([]);};r.readAsDataURL(f);}
  async function startWebcam(){try{streamRef.current=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});setWebcam(true);setResult(null);setFailure(null);}catch{toast.error("Não foi possível acessar a webcam.");}}
  function frame():ImageData|null{const v=videoRef.current;if(!v?.videoWidth)return null;const c=document.createElement("canvas");c.width=v.videoWidth;c.height=v.videoHeight;const ctx=c.getContext("2d");if(!ctx)return null;ctx.drawImage(v,0,0);const url=c.toDataURL("image/jpeg",0.85);return {url,b64:url.split(",")[1]??"",mime:"image/jpeg"};}
  function capture(){const image=frame();if(!image)return;stopWebcam();setImg(image);setResult(null);setFailure(null);}
  const run=useMutation({mutationFn:async({image,source}:{image:ImageData;source:"laboratorio"|"webcam"})=>{
    if(!modelId||!selectedUnit)throw new Error("Selecione um modelo ativo e uma unidade.");
    return detect({data:{imageBase64:image.b64,mime:image.mime,minConfidence:conf,modelId,unitId:selectedUnit,cameraId:cameraId||null,idempotencyKey:crypto.randomUUID(),source,retainImage:retain,zones}});
  },onSuccess:r=>{void qc.invalidateQueries({queryKey:["inference-runs"]});void qc.invalidateQueries({queryKey:["roboflow-requests"]});if(r.status==="sucesso"){setResult(r.result);setFailure(null);}else{setResult(null);setFailure(r.message);setContinuous(false);}},onError:e=>{setFailure(e.message||"Não foi possível analisar a imagem.");setContinuous(false);}});
  const runnerRef=useRef(run.mutateAsync);runnerRef.current=run.mutateAsync;
  useEffect(()=>{if(!continuous||!webcam)return;const timer=setInterval(()=>{if(busy.current||document.hidden)return;const image=frame();if(!image)return;setImg(image);busy.current=true;void runnerRef.current({image,source:"webcam"}).catch(()=>{}).finally(()=>{busy.current=false;});},Math.max(minFrequency,frequency)*1000);return()=>clearInterval(timer);},[continuous,webcam,frequency,minFrequency]);
  const dets=result?filterByConfidence(result.detections,conf):[];
  async function viewHistory(h:NonNullable<typeof history.data>[number]){
    stopWebcam();setFailure(h.error_message);const parsed=DetectionSchema.array().safeParse(h.detections);
    if(h.status==="sucesso"&&parsed.success){const m=models.data?.find(m=>m.id===h.model_id);setResult({detections:parsed.data,model:m?.name??"Análise registrada",version:m?.version??"",processing_ms:h.processing_ms??0,regions:[]});}else setResult(null);
    setImg(null);
    if(h.image_path){const {data,error}=await supabase.storage.from("vision-images").createSignedUrl(h.image_path,60);if(error){toast.error("Imagem privada não disponível para sua conta.");return;}setImg({url:data.signedUrl,b64:"",mime:"image/jpeg"});}
  }
  async function removeImage(path:string){const {error}=await supabase.storage.from("vision-images").remove([path]);if(error)toast.error("Não foi possível excluir a imagem privada.");else toast.success("Imagem excluída do armazenamento privado.");}
  return <>
    <PageHeader section="Visão computacional" title="Laboratório" description="Análises de imagens hospedadas na Roboflow."/>
    <div className="grid gap-4 xl:grid-cols-[300px_1fr_360px]">
      <Panel title="Configuração"><div className="grid gap-4">
        <div className="grid gap-1.5"><Label>Análise</Label><Select value={purpose} onValueChange={v=>{setPurpose(v as Purpose);setModelId("");setContinuous(false);setResult(null);}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(PURPOSES).map(([p,label])=><SelectItem key={p} value={p}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-1.5"><Label>Modelo</Label><Select value={modelId||"none"} onValueChange={v=>{setModelId(v==="none"?"":v);setContinuous(false);const m=models.data?.find(m=>m.id===v);if(m)setConf(m.min_confidence);}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Selecione um modelo ativo</SelectItem>{taskModels.map(m=><SelectItem key={m.id} value={m.id}>{m.name} · {m.version}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-1.5"><Label>Unidade</Label><Select value={selectedUnit||"none"} onValueChange={v=>{setUnitId(v);setCameraId("");setContinuous(false);}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{!selectedUnit&&<SelectItem value="none">Nenhuma unidade</SelectItem>}{me?.units.map(u=><SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-1.5"><Label>Webcam cadastrada (opcional)</Label><Select value={cameraId||"none"} onValueChange={v=>setCameraId(v==="none"?"":v)}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="none">Sem associação</SelectItem>{cameras.data?.filter(c=>c.unit_id===selectedUnit).map(c=><SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="grid gap-2"><div className="flex justify-between"><Label>Confiança mínima</Label><span className="tabular text-[12px]">{Math.round(conf*100)}%</span></div><Slider min={0} max={1} step={0.05} value={[conf]} onValueChange={v=>setConf(v[0]??0.5)}/></div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)loadFile(f);}}/>
        <div className="grid grid-cols-2 gap-2"><Button variant="outline" size="sm" disabled={run.isPending} onClick={()=>fileRef.current?.click()}><ImageUp/>Imagem</Button><Button variant="outline" size="sm" onClick={webcam?capture:startWebcam}><Camera/>{webcam?"Capturar":"Webcam"}</Button></div>
        {webcam&&<><div className="grid gap-1.5"><Label htmlFor="frequency">Intervalo entre frames (s)</Label><Input id="frequency" type="number" min={minFrequency} max={3600} value={Math.max(minFrequency,frequency)} disabled={continuous} onChange={e=>setFrequency(Math.min(3600,Math.max(minFrequency,Number(e.target.value))))}/></div><Button variant="outline" disabled={!modelId||run.isPending} onClick={()=>setContinuous(!continuous)}>{continuous?<Square/>:<Play/>}{continuous?"Pausar monitoramento":"Monitorar webcam"}</Button><Button variant="outline" onClick={stopWebcam}><Square/>Desligar webcam</Button></>}
        <div className="flex items-center justify-between gap-3"><Label htmlFor="retain">Autorizar guardar imagem</Label><Switch id="retain" checked={retain} onCheckedChange={setRetain}/></div>
        <Button disabled={!img?.b64||!modelId||run.isPending||continuous} onClick={()=>{if(img)run.mutate({image:img,source:"laboratorio"});}}><Play/>{run.isPending?"Analisando…":"Executar análise"}</Button>
      </div></Panel>
      <Panel title="Imagem" description={result?`${dets.length} detecções · ${result.processing_ms} ms · ${result.model}`:""}>
        {webcam&&<video ref={videoRef} className="mb-3 w-full rounded-md" muted playsInline/>}
        {img&&(!webcam||continuous)?<div className="relative"><img src={img.url} alt="Imagem enviada para análise" className={`w-full rounded-md ${drawing?"cursor-crosshair":""}`} onClick={e=>{if(!drawing)return;const r=e.currentTarget.getBoundingClientRect();setPoints([...points,[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height]]);}}/>
          <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none">{zones.map((z,i)=><polygon key={`z${i}`} points={z.points.map(p=>p.join(",")).join(" ")} className="fill-primary/10 stroke-primary" strokeWidth={0.003}/>)}{points.length>0&&<polyline points={points.map(p=>p.join(",")).join(" ")} className="fill-none stroke-primary" strokeWidth={0.004}/>}{dets.map((d,i)=><g key={i}>{d.mask_polygon&&<polygon points={d.mask_polygon.map(p=>p.join(",")).join(" ")} className="fill-gold/25 stroke-gold" strokeWidth={0.002}/>}<rect x={d.bbox[0]} y={d.bbox[1]} width={d.bbox[2]-d.bbox[0]} height={d.bbox[3]-d.bbox[1]} className="fill-none stroke-gold" strokeWidth={0.004}/></g>)}</svg>
        </div>:!webcam&&<EmptyState title="Nenhuma imagem" description="Nenhuma imagem selecionada."/>}
        {img&&!webcam&&<div className="mt-3 grid gap-2"><Label htmlFor="zone-name">Região de contagem</Label><div className="flex flex-wrap gap-2"><Input id="zone-name" className="min-w-0 flex-1" value={zoneName} maxLength={60} onChange={e=>setZoneName(e.target.value)}/><Button size="sm" variant="outline" onClick={()=>{setDrawing(!drawing);setPoints([]);}}>{drawing?"Cancelar":"Delimitar região"}</Button>{drawing&&<Button size="sm" disabled={points.length<3||!zoneName.trim()||zones.length>=20} onClick={()=>{setZones([...zones,{name:zoneName.trim(),points}]);setDrawing(false);setPoints([]);setZoneName(`Região ${zones.length+2}`);}}>Salvar região</Button>}</div><div className="flex flex-wrap gap-2">{zones.map((z,i)=><Button key={i} variant="outline" size="sm" aria-label={`Excluir região ${z.name}`} onClick={()=>setZones(zones.filter((_,j)=>j!==i))}><Trash2/>{z.name}</Button>)}</div></div>}
        {failure&&<div className="mt-3 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-[13px] text-warning">{failure}</div>}
      </Panel>
      <Panel title="Resultados" action={result&&<div className="flex gap-1"><Button size="sm" variant="outline" onClick={()=>download("deteccoes.json",JSON.stringify({...result,detections:dets},null,2),"application/json")}><Download/>JSON</Button><Button size="sm" variant="outline" onClick={()=>download("deteccoes.csv",["classe;confianca;x1;y1;x2;y2",...dets.map(d=>[JSON.stringify(d.class_name),d.confidence,...d.bbox].join(";"))].join("\n"),"text/csv")}><Download/>CSV</Button></div>}>
        {!result?<p className="text-[13px] text-muted-foreground">Nenhuma análise concluída.</p>:<><div className="mb-3 flex flex-wrap gap-1.5">{countByClass(dets).map(c=><span key={c.cls} className="rounded border px-2 py-0.5 text-[12px]">{c.cls} · <b>{c.n}</b></span>)}</div>{dets.length?<Table><TableHeader><TableRow><TableHead>Classe</TableHead><TableHead className="text-right">Confiança</TableHead></TableRow></TableHeader><TableBody>{dets.map((d,i)=><TableRow key={i}><TableCell>{d.class_name}</TableCell><TableCell className="tabular text-right">{(d.confidence*100).toFixed(1)}%</TableCell></TableRow>)}</TableBody></Table>:<p className="text-[13px] text-muted-foreground">Nenhuma detecção acima da confiança mínima.</p>}{result.regions.map((z,i)=><div key={i} className="mt-3 border-t pt-3 text-[13px]"><b>{z.name}</b><p>{Object.entries(z.counts).map(([name,n])=>`${name}: ${n}`).join(" · ")||"Nenhuma detecção na região"}</p></div>)}</>}
      </Panel>
    </div>
    <Panel title="Histórico de análises" className="mt-4">{!history.data?.length?<p className="text-[13px] text-muted-foreground">Nenhuma análise registrada.</p>:<Table><TableHeader><TableRow>{["Data","Análise","Status","Detecções","Tempo","Mensagem",""].map((t,i)=><TableHead key={i}>{t}</TableHead>)}</TableRow></TableHeader><TableBody>{history.data.map(h=><TableRow key={h.id}><TableCell className="tabular whitespace-nowrap">{new Date(h.created_at).toLocaleString("pt-BR")}</TableCell><TableCell>{h.task}</TableCell><TableCell className={h.status==="sucesso"?"text-success":h.status==="erro"?"text-destructive":"text-warning"}>{h.status}</TableCell><TableCell className="tabular">{Array.isArray(h.detections)?h.detections.length:"—"}</TableCell><TableCell className="tabular whitespace-nowrap">{h.processing_ms===null?"—":`${h.processing_ms} ms`}</TableCell><TableCell className="max-w-xs text-[12px]">{h.error_message}</TableCell><TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" aria-label="Ver análise" onClick={()=>void viewHistory(h)}><Eye/></Button>{h.image_path&&<Button variant="ghost" size="icon" aria-label="Excluir imagem privada" onClick={()=>{if(h.image_path)void removeImage(h.image_path);}}><Trash2/></Button>}</div></TableCell></TableRow>)}</TableBody></Table>}</Panel>
  </>;
}
