import { useEffect, useRef, useState } from "react";
import { Camera, ScanSearch, Square } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { runHostedDetection } from "@/lib/roboflow.functions";
import type { Detection } from "@/lib/ai-engine-contract";
import { Button } from "@/components/ui/button";

type Target = { unitId: string; modelId: string | null; cameraId: string | null };

export function WebcamLive({ compact = false, target }: { compact?: boolean; target?: Target }) {
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [dets, setDets] = useState<Detection[] | null>(null);
  const detect = useServerFn(runHostedDetection);
  const stop = () => { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setOn(false); setDets(null); };
  useEffect(() => stop, []);
  useEffect(() => { if (on && video.current) { video.current.srcObject = stream.current; void video.current.play().catch(() => {}); } }, [on]);
  async function start() {
    try { stream.current = await navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); setOn(true); }
    catch { toast.error("Não foi possível acessar a webcam.", { description: "Permita o acesso à câmera no navegador." }); }
  }
  async function analyze() {
    const v = video.current;
    if (!v?.videoWidth || !target?.modelId) { toast.error("Associe um modelo Roboflow ativo a esta câmera."); return; }
    const c = document.createElement("canvas"); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    const b64 = c.toDataURL("image/jpeg", 0.85).split(",")[1] ?? "";
    setBusy(true);
    try {
      const r = await detect({ data: { imageBase64: b64, mime: "image/jpeg", minConfidence: 0.4, modelId: target.modelId, unitId: target.unitId, cameraId: target.cameraId, idempotencyKey: crypto.randomUUID(), source: "webcam", retainImage: false, zones: [] } });
      if (r.status === "sucesso") { setDets(r.result.detections); toast.success(`${r.result.detections.length} detecções`); }
      else toast.error(r.message);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Falha na análise."); }
    finally { setBusy(false); }
  }
  if (on) {
    const counts = Object.entries((dets ?? []).reduce<Record<string, number>>((a, d) => ({ ...a, [d.class_name]: (a[d.class_name] ?? 0) + 1 }), {}));
    return (
      <div className="relative h-full w-full">
        <video ref={video} className="h-full w-full rounded-md object-cover" muted playsInline />
        {dets && <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none">
          {dets.map((d, i) => <rect key={i} x={d.bbox[0]} y={d.bbox[1]} width={d.bbox[2] - d.bbox[0]} height={d.bbox[3] - d.bbox[1]} className="fill-gold/10 stroke-gold" strokeWidth={0.005} />)}
        </svg>}
        {dets && <div className="absolute left-2 top-10 flex max-w-[70%] flex-wrap gap-1">{counts.map(([k, n]) => <span key={k} className="rounded border bg-card px-1.5 py-0.5 text-[11px]">{k}: {n}</span>)}</div>}
        <div className="absolute bottom-2 right-2 flex gap-1">
          {target && <Button type="button" size="sm" className="h-7" disabled={busy} onClick={analyze}><ScanSearch />{busy ? "Analisando…" : "Detectar com Roboflow"}</Button>}
          <Button type="button" size="sm" variant="outline" className="h-7 bg-card" onClick={stop}><Square />Desligar</Button>
        </div>
      </div>
    );
  }
  return <Button type="button" size={compact ? "sm" : "default"} variant="outline" onClick={start}><Camera />Usar webcam do computador</Button>;
}
