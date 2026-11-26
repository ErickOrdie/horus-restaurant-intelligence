import { z } from "zod";

// Contrato entre a plataforma Hórus e o motor de visão externo (ver ai-engine/openapi.yaml).
export const TASKS = ["food", "waste", "objects", "segment"] as const;
export type Task = (typeof TASKS)[number];

export const TASK_LABELS: Record<Task, string> = {
  food: "Reconhecimento de alimentos",
  waste: "Detecção de desperdício",
  objects: "Detecção de louças e objetos",
  segment: "Segmentação de alimentos",
};

export const TASK_ENDPOINT: Record<Task, string> = {
  food: "/detect/food",
  waste: "/detect/waste",
  objects: "/detect/objects",
  segment: "/segment/food",
};

export const DetectionSchema = z.object({
  class_name: z.string(),
  class_id: z.number().optional(),
  confidence: z.number().min(0).max(1),
  /** Normalized [x1, y1, x2, y2] in 0..1 */
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  area_px: z.number().optional(),
  mask_polygon: z.array(z.tuple([z.number(), z.number()])).optional(),
});
export type Detection = z.infer<typeof DetectionSchema>;

export const DetectResponseSchema = z.object({
  analysis_id: z.string(),
  model: z.string(),
  version: z.string(),
  timestamp: z.string(),
  processing_ms: z.number(),
  image_width: z.number().optional(),
  image_height: z.number().optional(),
  detections: z.array(DetectionSchema),
  estimates: z.record(z.string(), z.unknown()).optional(),
  status: z.enum(["ok", "error"]),
  error: z.string().nullable().optional(),
});
export type DetectResponse = z.infer<typeof DetectResponseSchema>;

export const HealthSchema = z.object({
  status: z.string(),
  version: z.string().optional(),
  device: z.string().optional(),
  models: z.array(z.object({ id: z.string(), loaded: z.boolean(), task: z.string().optional() })).optional(),
});

export const CameraStatusSchema = z.object({
  cameras: z.array(z.object({
    code: z.string(),
    status: z.enum(["online", "offline", "erro"]),
    fps: z.number().nullable().optional(),
    latency_ms: z.number().nullable().optional(),
    last_event_at: z.string().nullable().optional(),
    error: z.string().nullable().optional(),
  })),
});

/** Keeps only detections at or above the minimum confidence. */
export function filterByConfidence(dets: Detection[], min: number): Detection[] {
  return dets.filter((d) => d.confidence >= min);
}

/** Counts detections per class, sorted by count desc. */
export function countByClass(dets: Detection[]) {
  const m = new Map<string, number>();
  for (const d of dets) m.set(d.class_name, (m.get(d.class_name) ?? 0) + 1);
  return [...m].map(([cls, n]) => ({ cls, n })).sort((a, b) => b.n - a.n);
}

export function normalizeBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}
