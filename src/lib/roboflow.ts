import { z } from "zod";
import type { Detection } from "./ai-engine-contract";

export const PURPOSES = {
  food: "Reconhecimento de alimentos", leftovers: "Reconhecimento de sobras", waste: "Desperdício alimentar",
  plates: "Detecção de pratos", cups: "Detecção de copos", dishes: "Detecção de louças", objects: "Detecção de objetos",
  people: "Contagem anônima por região", segment: "Segmentação de alimentos", buffet: "Monitoramento das cubas",
} as const;
export type Purpose = keyof typeof PURPOSES;
export const purposeTask = (p: string) => p === "segment" ? "segment" : p === "people" ? "count" : p === "waste" || p === "leftovers" ? "waste" : p === "food" || p === "buffet" ? "food" : "objects";
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export function validateImage(base64: string, mime: string): Uint8Array {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64) || base64.length % 4 !== 0 || base64.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new Error("Imagem inválida ou acima de 10 MB.");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const png = [137,80,78,71,13,10,26,10].every((v,i) => bytes[i] === v);
  const jpg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  const webp = binary.slice(0,4) === "RIFF" && binary.slice(8,12) === "WEBP";
  if (bytes.length > MAX_IMAGE_BYTES || !(mime === "image/png" && png || mime === "image/jpeg" && jpg || mime === "image/webp" && webp)) throw new Error("O conteúdo não corresponde a uma imagem JPG, PNG ou WEBP.");
  return bytes;
}
export function hostedEndpoint(value: string) {
  const u = new URL(value);
  if (u.protocol !== "https:" || u.username || u.password || u.search || u.hash || u.port || u.pathname !== "/" || !(u.hostname === "serverless.roboflow.com" || /^[a-z0-9-]+\.roboflow\.cloud$/.test(u.hostname))) throw new Error("Use o endereço HTTPS da API hospedada Roboflow, sem caminhos ou credenciais.");
  return u.origin;
}
const id = z.string().regex(/^[a-zA-Z0-9_-]+$/).max(160);
export const HostedModelSchema = z.object({
  name: z.string().trim().min(2).max(100), purpose: z.enum(Object.keys(PURPOSES) as [Purpose, ...Purpose[]]),
  workspace_id: id, roboflow_model_id: z.string().max(160), workflow_id: z.string().max(160),
  version: z.string().max(40), endpoint: z.string().transform(hostedEndpoint),
  min_confidence: z.number().min(0).max(1), classes: z.array(z.string().min(1).max(80)).max(200),
  license: z.string().trim().max(200), status: z.enum(["ativo","inativo","pendente"]),
  image_input: id, output_key: id, price_per_inference: z.number().min(0).nullable(),
}).superRefine((m,ctx) => {
  if (m.workflow_id) { if (!id.safeParse(m.workflow_id).success) ctx.addIssue({ code: "custom", message: "Workflow inválido" }); }
  else if (!id.safeParse(m.roboflow_model_id).success || m.status === "ativo" && !/^\d+$/.test(m.version) || m.version !== "" && !/^\d+$/.test(m.version)) ctx.addIssue({ code: "custom", message: "Informe o identificador real do modelo e sua versão numérica para ativá-lo." });
  if (m.status === "ativo" && !m.workflow_id && !m.license.trim()) ctx.addIssue({ code:"custom", message:"Informe a licença real antes de ativar o modelo." });
});
const Point = z.object({ x: z.number().finite(), y: z.number().finite() });
const Prediction = z.object({ x: z.number().finite(), y: z.number().finite(), width: z.number().nonnegative(), height: z.number().nonnegative(), confidence: z.number().min(0).max(1), class: z.string(), class_id: z.number().int().optional(), points: z.array(Point).optional() });
const Payload = z.object({ image: z.object({ width: z.number().positive(), height: z.number().positive() }), predictions: z.array(Prediction), time: z.number().nonnegative().optional() });
const clamp = (n: number) => Math.min(1,Math.max(0,n));
export function normalizePredictions(body: unknown, outputKey = "predictions", workflow = false): { detections: Detection[]; width: number; height: number } {
  let raw: unknown = body;
  if (workflow) {
    const envelope = z.object({ outputs: z.array(z.record(z.string(),z.unknown())).min(1) }).parse(body);
    raw = envelope.outputs[0]?.[outputKey];
  }
  const p = Payload.parse(raw);
  const { width:w, height:h } = p.image;
  return { width:w, height:h, detections: p.predictions.map(d => ({
    class_name:d.class, confidence:d.confidence,
    bbox: [clamp((d.x-d.width/2)/w),clamp((d.y-d.height/2)/h),clamp((d.x+d.width/2)/w),clamp((d.y+d.height/2)/h)],
    ...(d.class_id === undefined ? {} : { class_id:d.class_id }),
    ...(d.points ? { mask_polygon:d.points.map(p => [clamp(p.x/w),clamp(p.y/h)] as [number,number]) } : {}),
  })) };
}
export const ZonesSchema = z.array(z.object({ name:z.string().min(1).max(60), points:z.array(z.tuple([z.number().min(0).max(1),z.number().min(0).max(1)])).min(3).max(30) })).max(20);
export type Zone = z.infer<typeof ZonesSchema>[number];
export function pointInPolygon(x:number,y:number,points:Zone["points"]) {
  let inside=false;
  for (let i=0,j=points.length-1;i<points.length;j=i++) {
    const a=points[i],b=points[j]; if (!a || !b) continue;
    if ((a[1]>y)!==(b[1]>y) && x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  return inside;
}
export function countRegions(detections:Detection[],zones:Zone[]) {
  return zones.map(z => ({ name:z.name, counts: detections.filter(d => pointInPolygon((d.bbox[0]+d.bbox[2])/2,(d.bbox[1]+d.bbox[3])/2,z.points)).reduce<Record<string,number>>((a,d) => { a[d.class_name]=(a[d.class_name]??0)+1; return a; },{}) }));
}
export function usageSummary<T extends { created_at:string; model_id:string; unit_id:string; processing_ms:number|null; estimated_cost:number|null; currency:string; status:string }>(rows:T[],now=new Date()) {
  const local=(date:Date) => new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
  const today=local(now),month=today.slice(0,7);
  const daily=rows.filter(r=>local(new Date(r.created_at))===today).length;
  const monthly=rows.filter(r=>local(new Date(r.created_at)).slice(0,7)===month).length;
  const latencies=rows.flatMap(r=>r.processing_ms===null?[]:[r.processing_ms]);
  const by=(key:"model_id"|"unit_id") => Object.entries(rows.reduce<Record<string,number>>((a,r)=> {a[r[key]]=(a[r[key]]??0)+1;return a;},{}));
  return { total:rows.length,daily,monthly,errors:rows.filter(r=>r.status==="erro"||r.status==="indisponivel").length,averageMs:latencies.length?Math.round(latencies.reduce((a,b)=>a+b,0)/latencies.length):null,byModel:by("model_id"),byUnit:by("unit_id"),byDay:Object.entries(rows.reduce<Record<string,number>>((a,r)=>{const k=local(new Date(r.created_at));a[k]=(a[k]??0)+1;return a;},{})),costs:Object.entries(rows.reduce<Record<string,number>>((a,r)=>{if(r.estimated_cost!==null)a[r.currency]=(a[r.currency]??0)+r.estimated_cost;return a;},{})) };
}