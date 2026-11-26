import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  CameraStatusSchema, DetectResponseSchema, HealthSchema, TASKS, TASK_ENDPOINT, normalizeBaseUrl,
} from "./ai-engine-contract";

function engineHeaders(): Record<string, string> {
  const key = process.env["HORUS_AI_ENGINE_KEY"];
  return key ? { "X-Horus-Key": key, "Content-Type": "application/json" } : { "Content-Type": "application/json" };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Tests connectivity with GET /health and syncs GET /cameras/status. */
export const checkEngineHealth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sb = context.supabase;
    const { data: cfg } = await sb.from("ai_engine_config").select("*").maybeSingle();
    if (!cfg?.base_url) return { ok: false as const, status: "nao_configurado", message: "Endereço do motor de IA não configurado." };
    const base = normalizeBaseUrl(cfg.base_url);
    const started = Date.now();
    let result: { ok: boolean; status: string; message: string; latency_ms?: number; device?: string | undefined; models?: { id: string; loaded: boolean; task?: string | undefined }[] | undefined };
    try {
      const res = await fetchWithTimeout(`${base}/health`, { headers: engineHeaders() }, cfg.timeout_ms);
      const latency = Date.now() - started;
      if (!res.ok) {
        result = { ok: false, status: "erro", message: `O motor respondeu com status ${res.status}.`, latency_ms: latency };
      } else {
        const parsed = HealthSchema.safeParse(await res.json());
        result = parsed.success
          ? { ok: true, status: "online", message: "Motor de IA conectado.", latency_ms: latency, device: parsed.data.device, models: parsed.data.models }
          : { ok: false, status: "erro", message: "Resposta de /health fora do contrato esperado.", latency_ms: latency };
      }
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      result = { ok: false, status: "offline", message: aborted ? `Sem resposta em ${cfg.timeout_ms} ms.` : "Não foi possível alcançar o motor de IA." };
    }
    await sb.from("ai_engine_config").update({
      last_health_status: result.status, last_health_at: new Date().toISOString(), last_health_latency_ms: result.latency_ms ?? null,
    }).eq("organization_id", cfg.organization_id);

    if (result.ok) {
      try {
        const res = await fetchWithTimeout(`${base}/cameras/status`, { headers: engineHeaders() }, cfg.timeout_ms);
        const parsed = res.ok ? CameraStatusSchema.safeParse(await res.json()) : null;
        if (parsed?.success) {
          for (const c of parsed.data.cameras) {
            await sb.from("cameras").update({
              status: c.status, last_latency_ms: c.latency_ms ?? null, last_event_at: c.last_event_at ?? null, last_error: c.error ?? null,
            }).eq("code", c.code);
          }
        }
      } catch { /* camera sync is best effort */ }
    }
    return result;
  });

const DetectInput = z.object({
  task: z.enum(TASKS),
  imageBase64: z.string().min(100).max(14_000_000),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  minConfidence: z.number().min(0).max(1),
  modelId: z.string().uuid().nullable(),
  cameraId: z.string().uuid().nullable(),
  idempotencyKey: z.string().min(8).max(80),
});

/** Sends one image to the external engine and records the run. Never fabricates detections. */
export const runDetection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => DetectInput.parse(d))
  .handler(async ({ data, context }) => {
    const sb = context.supabase;
    const { data: profile } = await sb.from("profiles").select("organization_id").eq("id", context.userId).single();
    const org = profile?.organization_id;
    if (!org) throw new Error("Usuário sem organização.");
    const { data: cfg } = await sb.from("ai_engine_config").select("*").maybeSingle();
    const { data: unit } = await sb.from("units").select("id").limit(1).maybeSingle();
    const model = data.modelId ? (await sb.from("ai_models").select("slug,version").eq("id", data.modelId).maybeSingle()).data : null;

    const record = async (row: { status: "sucesso" | "erro" | "indisponivel"; processing_ms?: number | null; detections?: unknown; summary?: unknown; error_message?: string | null }) => {
      const { data: ins } = await sb.from("inference_runs").insert({
        organization_id: org, unit_id: unit?.id ?? null, camera_id: data.cameraId, model_id: data.modelId, task: data.task,
        source: "laboratorio", created_by: context.userId, idempotency_key: data.idempotencyKey,
        status: row.status, processing_ms: row.processing_ms ?? null, detections: (row.detections ?? null) as never,
        summary: (row.summary ?? null) as never, error_message: row.error_message ?? null,
      }).select("id").single();
      return ins?.id ?? null;
    };

    if (!cfg?.base_url) {
      const msg = "Motor de IA não configurado. Cadastre o endereço em Integrações.";
      const runId = await record({ status: "indisponivel", error_message: msg });
      return { status: "indisponivel" as const, message: msg, runId };
    }
    const started = Date.now();
    try {
      const res = await fetchWithTimeout(`${normalizeBaseUrl(cfg.base_url)}${TASK_ENDPOINT[data.task]}`, {
        method: "POST",
        headers: { ...engineHeaders(), "Idempotency-Key": data.idempotencyKey },
        body: JSON.stringify({
          image_base64: data.imageBase64, mime: data.mime, min_confidence: data.minConfidence,
          model: model?.slug ?? null, version: model?.version ?? null, unit_id: unit?.id ?? null, camera_id: data.cameraId,
        }),
      }, cfg.timeout_ms);
      if (!res.ok) {
        const body = (await res.text()).slice(0, 300);
        const msg = `O motor respondeu ${res.status}: ${body || "sem detalhes"}`;
        const runId = await record({ status: "erro", processing_ms: Date.now() - started, error_message: msg });
        return { status: "erro" as const, message: msg, runId };
      }
      const parsed = DetectResponseSchema.safeParse(await res.json());
      if (!parsed.success) {
        const msg = "Resposta do motor fora do contrato esperado.";
        const runId = await record({ status: "erro", processing_ms: Date.now() - started, error_message: msg });
        return { status: "erro" as const, message: msg, runId };
      }
      const r = parsed.data;
      if (r.status === "error") {
        const runId = await record({ status: "erro", processing_ms: r.processing_ms, error_message: r.error ?? "Erro no motor." });
        return { status: "erro" as const, message: r.error ?? "Erro no motor.", runId };
      }
      const runId = await record({
        status: "sucesso", processing_ms: r.processing_ms, detections: r.detections,
        summary: { analysis_id: r.analysis_id, model: r.model, version: r.version, estimates: r.estimates ?? null, image_width: r.image_width, image_height: r.image_height },
      });
      return { status: "sucesso" as const, result: { analysis_id: r.analysis_id, model: r.model, version: r.version, processing_ms: r.processing_ms, detections: r.detections }, runId };
    } catch (e) {
      const aborted = e instanceof Error && e.name === "AbortError";
      const msg = aborted ? `O motor não respondeu em ${cfg.timeout_ms} ms.` : "Não foi possível alcançar o motor de IA.";
      const runId = await record({ status: "indisponivel", processing_ms: Date.now() - started, error_message: msg });
      return { status: "indisponivel" as const, message: msg, runId };
    }
  });

export const engineKeyConfigured = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => ({ configured: !!process.env["HORUS_AI_ENGINE_KEY"] }));
