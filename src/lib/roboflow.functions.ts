import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { hostedEndpoint, HostedModelSchema, normalizePredictions, countRegions, validateImage, ZonesSchema } from "./roboflow";
import { filterByConfidence, type Detection } from "./ai-engine-contract";
import type { Json } from "@/integrations/supabase/types";
import { normalizeRestaurant, RESTAURANT_WORKFLOW, snapshotCounts, matchTableRegions, type RestaurantSnapshot } from "./restaurant";

export type HostedResult = { detections:Detection[]; processing_ms:number; model:string; version:string; regions:ReturnType<typeof countRegions>; restaurant?:RestaurantSnapshot; processedImage?:string|null };
export type HostedOutcome = { status:"sucesso"; result:HostedResult; runId:string|null } | { status:"erro"|"indisponivel"|"processando"; message:string; runId:string|null };
const ConfigInput=z.object({workspace_id:z.string().max(160),model_id:z.string().max(160),workflow_id:z.string().max(160),model_version:z.string().max(40),endpoint:z.string().transform(hostedEndpoint),daily_limit:z.number().int().min(0).max(1000000),monthly_limit:z.number().int().min(0).max(10000000),requests_per_minute:z.number().int().min(1).max(60),min_frame_interval_s:z.number().int().min(5).max(3600),price_per_inference:z.number().min(0).nullable(),currency:z.enum(["BRL","USD"])});
const json=(v:unknown):Json => JSON.parse(JSON.stringify(v)) as Json;
async function providerFetch(url:string,init:RequestInit,key:string|undefined,timeout=60000) {
  if (!key) throw new Error("Chave Roboflow não configurada nos segredos.");
  return fetch(url,{...init,headers:{...init.headers,Authorization:`Bearer ${key}`},redirect:"manual",signal:AbortSignal.timeout(timeout)});
}
export const roboflowKeyStatus=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async()=>({configured:Boolean(process.env["ROBOFLOW_API_KEY"])}));
export const saveRoboflowConfig=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>ConfigInput.parse(d)).handler(async({data,context})=>{
  const {data:admin,error:roleError}=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
  if(roleError||!admin)throw new Error("Somente administradores podem configurar a Roboflow.");
  const {data:p}=await context.supabase.from("profiles").select("organization_id").eq("id",context.userId).single();
  if(!p?.organization_id)throw new Error("Organização não encontrada.");
  const {error}=await context.supabase.from("roboflow_config").upsert({...data,organization_id:p.organization_id,last_status:null,last_error:null,updated_at:new Date().toISOString()});
  if(error)throw new Error("Não foi possível salvar a configuração.");
  await context.supabase.from("audit_logs").insert({organization_id:p.organization_id,user_id:context.userId,action:"configurar_roboflow",entity:"roboflow_config",details:json(data)});
  return {ok:true};
});
export const testRoboflowConnection=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).handler(async({context})=>{
  const {data:admin}=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
  if(!admin)throw new Error("Somente administradores testam esta integração.");
  const {data:p}=await context.supabase.from("profiles").select("organization_id").eq("id",context.userId).single();
  if(!p?.organization_id)throw new Error("Organização não encontrada.");
  let ok=false,message="",workspace="";
  const start=Date.now();
  try {
    const res=await providerFetch("https://api.roboflow.com/",{method:"GET"},process.env["ROBOFLOW_API_KEY"],15000);
    if(!res.ok) { message=`Roboflow respondeu HTTP ${res.status}. Verifique chave, permissões e plano.`; }
    else {const root=z.object({workspace:z.string().optional(),error:z.unknown().optional()}).passthrough().parse(await res.json());if(root.error)message="A Roboflow recusou a chave informada.";else {ok=true;workspace=root.workspace??"";message="Roboflow conectada. A disponibilidade de cada modelo é validada na inferência.";}}
  } catch(e) {message=process.env["ROBOFLOW_API_KEY"]?"Não foi possível validar a conexão com a Roboflow.":"Chave Roboflow não configurada nos segredos.";}
  const latency=Date.now()-start;
  await context.supabase.from("roboflow_config").upsert({organization_id:p.organization_id,last_status:ok?"online":"erro",last_test_at:new Date().toISOString(),last_latency_ms:latency,last_error:ok?null:message,...(workspace?{workspace_id:workspace}:{})});
  return {ok,message,workspace,latency_ms:latency};
});
const Input=z.object({imageBase64:z.string().min(100).max(14000000),mime:z.enum(["image/jpeg","image/png","image/webp"]),minConfidence:z.number().min(0).max(1),modelId:z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),unitId:z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i),cameraId:z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).nullable(),idempotencyKey:z.string().min(8).max(80),source:z.enum(["laboratorio","webcam","teste"]),retainImage:z.boolean(),zones:ZonesSchema});
export const runHostedDetection=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((d:unknown)=>Input.parse(d)).handler(async({data,context}):Promise<HostedOutcome>=>{
  const sb=context.supabase;
  const bytes=validateImage(data.imageBase64,data.mime);
  const [{data:p},{data:unit},{data:model},{data:cfg}]=await Promise.all([
    sb.from("profiles").select("organization_id").eq("id",context.userId).single(),
    sb.from("units").select("id,organization_id").eq("id",data.unitId).maybeSingle(),
    sb.from("ai_models").select("*").eq("id",data.modelId).maybeSingle(),
    sb.from("roboflow_config").select("*").maybeSingle(),
  ]);
  const org=p?.organization_id;
  if(!org||!unit||unit.organization_id!==org||!model||model.organization_id!==org)throw new Error("Unidade ou modelo indisponível para sua organização.");
  if(model.provider!=="roboflow"||model.status!=="ativo")throw new Error("Selecione um modelo Roboflow ativo.");
  if(data.cameraId){const {data:cam}=await sb.from("cameras").select("unit_id,enabled").eq("id",data.cameraId).maybeSingle();if(!cam||cam.unit_id!==unit.id||!cam.enabled)throw new Error("Câmera indisponível nesta unidade.");}
  const configured=HostedModelSchema.safeParse({...model,workspace_id:model.workspace_id??"",roboflow_model_id:model.roboflow_model_id??"",workflow_id:model.workflow_id??"",license:model.license??"",purpose:model.purpose??model.task});
  if(!configured.success)throw new Error("O modelo precisa de identificador, versão, licença e endpoint válidos.");
  if(!cfg||!process.env["ROBOFLOW_API_KEY"]){
    const message=!cfg?"Configure a integração Roboflow antes de analisar.":"Chave Roboflow não configurada nos segredos.";
    const {data:run,error}=await sb.from("inference_runs").insert({organization_id:org,unit_id:unit.id,model_id:model.id,camera_id:data.cameraId,task:model.task,source:data.source,status:"indisponivel",error_message:message,created_by:context.userId,idempotency_key:`${org}:${data.idempotencyKey}`}).select("id").single();
    if(error)throw new Error("Não foi possível registrar a análise indisponível.");
    return {status:"indisponivel",message,runId:run.id};
  }
  const {data:reservation,error:reserveError}=await sb.rpc("reserve_roboflow_request",{p_unit:unit.id,p_model:model.id,p_key:data.idempotencyKey});
  if(reserveError)throw new Error("Não foi possível reservar o consumo da análise.");
  const reserved=z.object({id:z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i).optional(),duplicate:z.boolean().optional(),blocked:z.string().optional()}).parse(reservation);
  if(reserved.blocked)return {status:"indisponivel",message:reserved.blocked,runId:null};
  const requestId=reserved.id;
  if(!requestId)throw new Error("Reserva de inferência inválida.");
  if(reserved.duplicate){
    const {data:previous}=await sb.from("roboflow_requests").select("result,run_id,status,error_message").eq("id",requestId).single();
    if(previous?.status==="sucesso"&&previous.result)return {status:"sucesso",result:previous.result as unknown as HostedResult,runId:previous.run_id};
    return {status:previous?.status==="erro"?"erro":previous?.status==="indisponivel"?"indisponivel":"processando",message:previous?.error_message??"Esta requisição já foi recebida. Consulte o histórico; ela não será enviada novamente.",runId:previous?.run_id??null};
  }
  // Privileged completion occurs only after the authenticated, tenant-scoped reservation.
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const started=Date.now();let httpStatus:number|null=null;
  const finish=async(status:"sucesso"|"erro"|"indisponivel",result:HostedResult|null,message:string|null,imagePath:string|null):Promise<HostedOutcome>=>{
    const processing=Date.now()-started;
    const persisted=result?{...result,processedImage:null}:null;
    const {data:run,error}=await supabaseAdmin.from("inference_runs").insert({organization_id:org,unit_id:unit.id,camera_id:data.cameraId,model_id:model.id,task:model.task,source:data.source,status,processing_ms:processing,detections:result?json(result.detections):null,summary:result?json({provider:"roboflow",model:result.model,version:result.version,regions:result.regions,restaurant:result.restaurant??null}):null,error_message:message,created_by:context.userId,idempotency_key:`${org}:${data.idempotencyKey}`,image_path:imagePath}).select("id").single();
    if (run && result?.restaurant) {
      const s=result.restaurant,c=snapshotCounts(s);
      const {error:metricError}=await supabaseAdmin.from("occupancy_metrics").insert({organization_id:org,unit_id:unit.id,camera_id:data.cameraId,run_id:run.id,people_count:s.people,table_count:s.tables,occupied_count:c.occupied,available_count:c.available,awaiting_count:c.awaiting,unknown_count:c.unknown,occupancy_percent:c.occupancy,processing_ms:processing});
      if(metricError)throw new Error("Análise recebida, mas os indicadores não puderam ser registrados.");
      if(data.cameraId){
        const {data:regions}=await sb.from("table_regions").select("table_id,points").eq("camera_id",data.cameraId);
        const mapped=matchTableRegions(s.states,(regions??[]).flatMap(r=>{const p=ZonesSchema.safeParse([{name:r.table_id,points:r.points}]);return p.success&&p.data[0]?[{table_id:r.table_id,points:p.data[0].points}]:[];}));
        if(mapped.length){const {error:stateError}=await supabaseAdmin.from("table_state_events").insert(mapped.map(t=>({...t,organization_id:org,unit_id:unit.id,camera_id:data.cameraId,run_id:run.id,source:"estimativa"})));if(stateError)throw new Error("Não foi possível registrar as estimativas das mesas.");}
      }
    }
    const {error:updateError}=await supabaseAdmin.from("roboflow_requests").update({status,processing_ms:processing,http_status:httpStatus,error_message:message,result:persisted?json(persisted):null,run_id:run?.id??null}).eq("id",requestId).eq("organization_id",org);
    if(error||updateError)throw new Error("A requisição foi enviada, mas seu registro não pôde ser concluído. Consulte o histórico antes de repetir.");
    await supabaseAdmin.from("roboflow_config").update({last_status:status==="sucesso"?"online":"erro",last_latency_ms:processing,last_error:message}).eq("organization_id",org);
    await sb.from("audit_logs").insert({organization_id:org,user_id:context.userId,action:"inferencia_roboflow",entity:"inference_runs",entity_id:run.id,details:json({model_id:model.id,status,request_id:requestId})});
    return result?{status:"sucesso",result,runId:run.id}:{status:status==="erro"?"erro":"indisponivel",message:message??"Inferência indisponível.",runId:run.id};
  };
  let result:HostedResult;
  try {
    const m=configured.data,base=hostedEndpoint(m.endpoint);
    const url=m.workflow_id?`${base}/${encodeURIComponent(m.workspace_id)}/workflows/${encodeURIComponent(m.workflow_id)}`:`${base}/${encodeURIComponent(m.roboflow_model_id)}/${encodeURIComponent(m.version)}?confidence=${data.minConfidence}&format=json&image_type=base64`;
    const res=await providerFetch(url,{method:"POST",headers:{"Content-Type":m.workflow_id?"application/json":"application/x-www-form-urlencoded"},body:m.workflow_id?JSON.stringify({inputs:{[m.image_input]:{type:"base64",value:data.imageBase64}},disable_sinks:true}):data.imageBase64},process.env["ROBOFLOW_API_KEY"],cfg.timeout_ms);
    httpStatus=res.status;
    if(!res.ok){await res.body?.cancel();return finish("erro",null,`Roboflow respondeu HTTP ${res.status}. Verifique modelo, chave, limites e plano.`,null);}
    const body:unknown=await res.json();
    const restaurant=m.workflow_id===RESTAURANT_WORKFLOW?normalizeRestaurant(body):null;
    const n=restaurant??normalizePredictions(body,m.output_key,Boolean(m.workflow_id));
    const detections=filterByConfidence(n.detections,data.minConfidence);
    result={detections,processing_ms:Date.now()-started,model:m.workflow_id||m.roboflow_model_id,version:m.version,regions:countRegions(detections,data.zones),...(restaurant?{restaurant:restaurant.snapshot,processedImage:restaurant.processedImage}:{})};
  }catch(e){return finish("erro",null,e instanceof z.ZodError?"Resposta fora do contrato de detecção. Confira a saída do workflow e as coordenadas de imagem.":"A Roboflow não concluiu a análise. A requisição não será reenviada automaticamente.",null);}
  let imagePath:string|null=null;
  let retentionError:string|null=null;
  if(data.retainImage){
    imagePath=`${org}/${context.userId}/${requestId}.${data.mime==="image/png"?"png":data.mime==="image/webp"?"webp":"jpg"}`;
    const {error}=await sb.storage.from("vision-images").upload(imagePath,bytes,{contentType:data.mime,upsert:false});
    if(error){imagePath=null;retentionError="Inferência concluída, mas a imagem não foi armazenada.";}
  }
  return finish("sucesso",result,retentionError,imagePath);
});