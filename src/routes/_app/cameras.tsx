import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Activity, Pencil, Plus, VideoOff } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/lib/auth";
import { WebcamLive } from "@/components/horus/WebcamLive";
import { logAudit } from "@/lib/data";
import { testRoboflowConnection } from "@/lib/roboflow.functions";
import { PageHeader, EmptyState } from "@/components/horus/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export const Route = createFileRoute("/_app/cameras")({
  component: Cameras,
  head: () => ({
    meta: [
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { title: "Central de câmeras · Hórus" },
      { name: "description", content: "Fontes de vídeo, status, latência e modelos de IA associados." },
      { property: "og:title", content: "Central de câmeras · Hórus" },
      { property: "og:description", content: "Fontes de vídeo e modelos de IA associados." },
    ],
  }),
});

const CONN: Record<string, string> = { webcam: "Webcam USB", ip: "Câmera IP", rtsp: "RTSP", webrtc: "WebRTC", hls: "HLS", mp4: "Arquivo MP4", imagem: "Imagens JPG/PNG", demo: "Demonstração" };
const STATUS: Record<string, { label: string; dot: string }> = {
  online: { label: "Online", dot: "bg-success" }, offline: { label: "Offline", dot: "bg-destructive" },
  erro: { label: "Erro", dot: "bg-destructive" }, desconhecido: { label: "Sem dados do motor", dot: "bg-subtle" },
};
type Cam = {
  id: string; unit_id: string; code: string; name: string; sector: string; connection_type: string; stream_ref: string | null;
  resolution: string | null; fps: number | null; model_id: string | null; schedule: string | null; enabled: boolean;
  status: string; last_latency_ms: number | null; last_event_at: string | null; last_error: string | null;
};

function Cameras() {
  const qc = useQueryClient();
  const { data: me } = useProfile();
  const health = useServerFn(testRoboflowConnection);
  const [grid, setGrid] = useState("4");
  const [edit, setEdit] = useState<Partial<Cam> | null>(null);
  const q = useQuery({
    queryKey: ["cameras"],
    queryFn: async () => {
      const [c, m] = await Promise.all([
        supabase.from("cameras").select("*").order("code"),
        supabase.from("ai_models").select("id,name,version,status,provider"),
      ]);
      if (c.error) throw c.error;
      return { cams: c.data as Cam[], models: m.data ?? [] };
    },
  });
  const sync = useMutation({
    mutationFn: () => health(),
    onSuccess: (r) => { (r.ok ? toast.success : toast.error)(r.message); qc.invalidateQueries({ queryKey: ["roboflow-config"] }); },
    onError: () => toast.error("Não foi possível testar a integração."),
  });
  const save = useMutation({
    mutationFn: async (c: Partial<Cam>) => {
      if (!c.code || !c.name || !c.sector || !c.connection_type) throw new Error("Dados da câmera incompletos.");
      const payload = {
        code: c.code.trim(), name: c.name.trim(), sector: c.sector.trim(), connection_type: c.connection_type, stream_ref: c.stream_ref?.trim() || null,
        resolution: c.resolution?.trim() || null, fps: c.fps ? Number(c.fps) : null, model_id: c.model_id || null, schedule: c.schedule?.trim() || null, enabled: c.enabled ?? true,
      };
      if (c.id) {
        const { error } = await supabase.from("cameras").update(payload).eq("id", c.id);
        if (error) throw error;
        await logAudit("editar_camera", "cameras", c.id, payload);
      } else {
        const unit = me?.units[0];
        if (!unit) throw new Error("Unidade não encontrada.");
        const { data, error } = await supabase.from("cameras").insert({ ...payload, unit_id: unit.id }).select("id").single();
        if (error) throw error;
        await logAudit("criar_camera", "cameras", data.id, payload);
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cameras"] }); setEdit(null); toast.success("Câmera salva"); },
    onError: () => toast.error("Não foi possível salvar.", { description: "Verifique se o identificador é único e se você tem perfil de gestão." }),
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!edit?.code?.trim() || !edit.name?.trim() || !edit.sector?.trim() || !edit.connection_type) { toast.error("Preencha identificador, nome, setor e conexão."); return; }
    if (edit.stream_ref && /:\/\/[^/]*@/.test(edit.stream_ref)) { toast.error("Não informe usuário e senha no endereço. Credenciais ficam somente no motor de IA."); return; }
    save.mutate(edit);
  }

  const cams = q.data?.cams ?? [];
  const n = Number(grid);
  const cols = n === 1 ? "grid-cols-1" : n === 4 ? "md:grid-cols-2" : n === 9 ? "md:grid-cols-3" : "md:grid-cols-4";
  const rfModel = (id: string | null) => { const ms = q.data?.models ?? []; const own = ms.find((m) => m.id === id && m.provider === "roboflow" && m.status === "ativo"); return (own ?? ms.find((m) => m.provider === "roboflow" && m.status === "ativo"))?.id ?? null; };
  const modelName = (id: string | null) => q.data?.models.find((m) => m.id === id)?.name ?? "Nenhum modelo";

  return (
    <>
      <PageHeader section="Visão computacional" title="Central de câmeras" description="Fontes de vídeo e modelos associados. RTSP exige uma integração gerenciada; upload e webcam funcionam no Laboratório."
        actions={<>
          <ToggleGroup type="single" value={grid} onValueChange={(v) => v && setGrid(v)} variant="outline" size="sm">
            {["1", "4", "9", "16"].map((g) => <ToggleGroupItem key={g} value={g} aria-label={`Mosaico ${g}`} className="px-3 text-[12px]">{g}</ToggleGroupItem>)}
          </ToggleGroup>
          <Button size="sm" variant="outline" onClick={() => sync.mutate()} disabled={!me?.roles.includes("admin") || sync.isPending}><Activity />Testar Roboflow</Button>
          {me?.canManage && <Button size="sm" onClick={() => setEdit({ connection_type: "rtsp", enabled: true, schedule: "11:00-15:00" })}><Plus />Nova câmera</Button>}
        </>} />
      {q.isLoading ? <div className={`grid gap-3 ${cols}`}>{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="aspect-video" />)}</div> : cams.length === 0 ? <EmptyState title="Nenhuma câmera" description="Cadastre a primeira fonte de vídeo." /> : (
        <div className={`grid gap-3 ${cols}`}>
          {cams.slice(0, n).map((c) => {
            const st = STATUS[c.enabled ? c.status : "offline"] ?? { label:"Sem dados",dot:"bg-subtle" };
            return (
              <article key={c.id} className="overflow-hidden rounded-lg border bg-card">
                <div className="relative flex aspect-video items-center justify-center bg-muted">
                  {c.enabled && c.connection_type === "webcam" ? <WebcamLive compact target={{ unitId: c.unit_id, cameraId: c.id, modelId: rfModel(c.model_id) }} /> : (
                  <div className="text-center text-muted-foreground">
                    <VideoOff className="mx-auto size-6 text-subtle" />
                    <p className="mt-2 text-[12px]">{!c.enabled ? "Câmera desativada" : "Transmissão depende de integração gerenciada"}</p>
                    {c.enabled && <div className="mt-3"><WebcamLive compact target={{ unitId: c.unit_id, cameraId: c.id, modelId: rfModel(c.model_id) }} /></div>}
                  </div>)}
                  <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded border bg-card px-2 py-0.5 text-[11px]"><span className={`size-1.5 rounded-full ${st.dot}`} />{c.enabled ? st.label : "Desativada"}</span>
                  <span className="absolute right-3 top-3 rounded border bg-card px-2 py-0.5 font-mono text-[11px]">{c.code}</span>
                </div>
                <div className="flex items-start justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium">{c.name}</p>
                    <p className="truncate text-[12px] text-muted-foreground">{c.sector} · {CONN[c.connection_type]} · {modelName(c.model_id)}</p>
                    <p className="tabular mt-1 text-[11px] text-subtle">
                      {c.fps ?? "—"} fps · latência {c.last_latency_ms != null ? `${c.last_latency_ms} ms` : "—"} · último evento {c.last_event_at ? new Date(c.last_event_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </p>
                    {c.last_error && <p className="mt-1 text-[11px] text-destructive">{c.last_error}</p>}
                  </div>
                  {me?.canManage && <Button size="icon" variant="ghost" className="size-7 shrink-0" aria-label={`Editar ${c.name}`} onClick={() => setEdit(c)}><Pencil /></Button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {cams.length > n && <p className="mt-3 text-[12px] text-subtle">Exibindo {n} de {cams.length} câmeras. Escolha um mosaico maior para ver todas.</p>}

      <Sheet open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <SheetContent className="overflow-y-auto">
          <form onSubmit={submit} className="flex h-full flex-col">
            <SheetHeader><SheetTitle>{edit?.id ? "Editar câmera" : "Nova câmera"}</SheetTitle><SheetDescription>Credenciais e endereços privados ficam somente no motor de IA.</SheetDescription></SheetHeader>
            <div className="grid gap-4 px-4">
              <div className="rounded-md border bg-muted/40 p-3">
                <Button type="button" variant="outline" className="w-full" onClick={() => setEdit({ ...edit, connection_type: "webcam", code: edit?.code || "WEBCAM-01", name: edit?.name || "Webcam do computador", sector: edit?.sector || "Salão", stream_ref: null })}>Usar webcam do computador</Button>
                <p className="mt-2 text-[11px] text-subtle">Preenche a câmera como webcam deste computador. A imagem só é capturada após sua autorização no navegador, sem áudio.</p>
                {edit?.connection_type === "webcam" && <div className="mt-3 flex aspect-video items-center justify-center rounded-md bg-muted"><WebcamLive compact /></div>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label htmlFor="cc">Identificador</Label><Input id="cc" maxLength={40} value={edit?.code ?? ""} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="cs">Setor</Label><Input id="cs" maxLength={40} value={edit?.sector ?? ""} onChange={(e) => setEdit({ ...edit, sector: e.target.value })} /></div>
              </div>
              <div className="grid gap-1.5"><Label htmlFor="cn">Nome</Label><Input id="cn" maxLength={80} value={edit?.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label>Tipo de conexão</Label>
                <Select value={edit?.connection_type ?? "rtsp"} onValueChange={(v) => setEdit({ ...edit, connection_type: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CONN).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="grid gap-1.5"><Label htmlFor="sr">Referência da fonte no motor</Label><Input id="sr" placeholder="ex.: augusta/buffet-01" maxLength={200} value={edit?.stream_ref ?? ""} onChange={(e) => setEdit({ ...edit, stream_ref: e.target.value })} /><p className="text-[11px] text-subtle">Nome lógico configurado no motor. Não inclua usuário ou senha.</p></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5"><Label htmlFor="rs">Resolução</Label><Input id="rs" placeholder="1920x1080" value={edit?.resolution ?? ""} onChange={(e) => setEdit({ ...edit, resolution: e.target.value })} /></div>
                <div className="grid gap-1.5"><Label htmlFor="fp">FPS</Label><Input id="fp" type="number" min={1} max={60} value={edit?.fps ?? ""} onChange={(e) => setEdit({ ...edit, fps: Number(e.target.value) || null })} /></div>
              </div>
              <div className="grid gap-1.5"><Label>Modelo de IA associado</Label>
                <Select value={edit?.model_id ?? "none"} onValueChange={(v) => setEdit({ ...edit, model_id: v === "none" ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Nenhum</SelectItem>{q.data?.models.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="grid gap-1.5"><Label htmlFor="hs">Horário de operação</Label><Input id="hs" placeholder="11:00-15:00" value={edit?.schedule ?? ""} onChange={(e) => setEdit({ ...edit, schedule: e.target.value })} /></div>
              <div className="flex items-center justify-between"><Label htmlFor="ce">Câmera ativa</Label><Switch id="ce" checked={edit?.enabled ?? true} onCheckedChange={(v) => setEdit({ ...edit, enabled: v })} /></div>
            </div>
            <SheetFooter><Button type="submit" disabled={save.isPending}>Salvar</Button></SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </>
  );
}
