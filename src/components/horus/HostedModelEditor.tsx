import { useState } from "react";
import { useMutation,useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/data";
import { HostedModelSchema,PURPOSES,purposeTask } from "@/lib/roboflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { Sheet,SheetContent,SheetHeader,SheetTitle,SheetDescription,SheetFooter } from "@/components/ui/sheet";
import type { Tables } from "@/integrations/supabase/types";

export function HostedModelEditor({model,organizationId,onClose}:{model:Tables<"ai_models">|null;organizationId:string;onClose:()=>void}){
  const qc=useQueryClient();
  const [form,setForm]=useState({name:model?.name??"",purpose:model?.purpose??"food",workspace_id:model?.workspace_id??"",roboflow_model_id:model?.roboflow_model_id??"",workflow_id:model?.workflow_id??"",version:model?.version??"",endpoint:model?.endpoint??"https://serverless.roboflow.com",min_confidence:model?.min_confidence??0.5,classes:model?.classes.join(", ")??"",license:model?.license??"",status:model?.status??"pendente",image_input:model?.image_input??"image",output_key:model?.output_key??"predictions",price_per_inference:model?.price_per_inference??null});
  const save=useMutation({mutationFn:async()=>{
    const parsed=HostedModelSchema.parse({...form,classes:form.classes.split(",").map(c=>c.trim()).filter(Boolean)});
    const payload={...parsed,provider:"roboflow",task:purposeTask(parsed.purpose),architecture:parsed.workflow_id?"Roboflow Workflow hospedado":"Roboflow Cloud API",weights_status:parsed.status==="pendente"?"treinamento_necessario":"disponivel",slug:model?.slug??`rf-${crypto.randomUUID()}`,organization_id:organizationId,requirements:"API hospedada Roboflow; sem servidor local",source_repo:"https://github.com/roboflow/inference"};
    const res=model?await supabase.from("ai_models").update(payload).eq("id",model.id).select("id").single():await supabase.from("ai_models").insert(payload).select("id").single();
    if(res.error)throw res.error;
    await logAudit(model?"editar_modelo_roboflow":"criar_modelo_roboflow","ai_models",res.data.id);
  },onSuccess:()=>{for(const key of ["ai-models","ai-models-lab","roboflow-test-models","cameras"])void qc.invalidateQueries({queryKey:[key]});toast.success("Modelo salvo");onClose();},onError:()=>toast.error("Confira identificador real, versão numérica, licença e endpoint hospedado.")});
  const textFields=[["name","Nome"],["workspace_id","Workspace ID"],["roboflow_model_id","Model ID"],["version","Versão do modelo"],["workflow_id","Workflow ID (opcional)"],["endpoint","Endpoint de inferência"],["classes","Classes suportadas (separadas por vírgula)"],["license","Licença do modelo"],["image_input","Entrada de imagem no workflow"],["output_key","Saída de detecções no workflow"]] as const;
  return <Sheet open onOpenChange={open=>!open&&onClose()}><SheetContent className="overflow-y-auto sm:max-w-lg"><form onSubmit={e=>{e.preventDefault();save.mutate();}}><SheetHeader><SheetTitle>{model?"Editar modelo Roboflow":"Novo modelo Roboflow"}</SheetTitle><SheetDescription>Identificadores e classes do seu modelo publicado.</SheetDescription></SheetHeader><div className="grid gap-4 px-4">
    <div className="grid gap-1.5"><Label>Finalidade</Label><Select value={form.purpose} onValueChange={v=>setForm({...form,purpose:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{Object.entries(PURPOSES).map(([id,label])=><SelectItem key={id} value={id}>{label}</SelectItem>)}</SelectContent></Select></div>
    {textFields.map(([field,label])=><div key={field} className="grid gap-1.5"><Label htmlFor={`model-${field}`}>{label}</Label><Input id={`model-${field}`} value={form[field]} onChange={e=>setForm({...form,[field]:e.target.value})} required={["name","workspace_id","endpoint"].includes(field)||field==="license"&&form.status==="ativo"}/></div>)}
    <div className="grid gap-1.5"><Label htmlFor="model-confidence">Confiança mínima</Label><Input id="model-confidence" type="number" min="0" max="1" step="0.05" value={form.min_confidence} onChange={e=>setForm({...form,min_confidence:Number(e.target.value)})}/></div>
    <div className="grid gap-1.5"><Label htmlFor="model-price">Tarifa por inferência (opcional)</Label><Input id="model-price" type="number" min="0" step="0.000001" value={form.price_per_inference??""} onChange={e=>setForm({...form,price_per_inference:e.target.value===""?null:Number(e.target.value)})}/></div>
    <div className="grid gap-1.5"><Label>Status</Label><Select value={form.status} onValueChange={v=>setForm({...form,status:v})}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente / em treinamento</SelectItem><SelectItem value="ativo">Ativo</SelectItem><SelectItem value="inativo">Inativo</SelectItem></SelectContent></Select></div>
  </div><SheetFooter><Button type="submit" disabled={save.isPending}>Salvar modelo</Button></SheetFooter></form></SheetContent></Sheet>;
}