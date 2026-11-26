import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Webhook autenticado: o motor de IA envia eventos (status de câmera, alertas) para a plataforma.
const EventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("camera_status"),
    unit_id: z.string().uuid(),
    camera_code: z.string().max(40),
    status: z.enum(["online", "offline", "erro"]),
    latency_ms: z.number().int().nonnegative().nullable().optional(),
    error: z.string().max(300).nullable().optional(),
  }),
  z.object({
    type: z.literal("alert"),
    unit_id: z.string().uuid(),
    alert_type: z.enum(["fila", "limpeza", "buffet", "camera", "desperdicio"]),
    severity: z.enum(["baixa", "media", "alta", "critica"]),
    title: z.string().min(3).max(140),
    description: z.string().max(500).optional(),
  }),
]);

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export const Route = createFileRoute("/api/public/ai-engine/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["HORUS_AI_ENGINE_KEY"];
        const got = request.headers.get("x-horus-key") ?? "";
        if (!key || !safeEqual(got, key)) return Response.json({ error: "unauthorized" }, { status: 401 });

        let body: unknown;
        try { body = await request.json(); } catch { return Response.json({ error: "invalid_json" }, { status: 400 }); }
        const parsed = EventSchema.safeParse(body);
        if (!parsed.success) return Response.json({ error: "invalid_payload", issues: parsed.error.issues.slice(0, 5) }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const ev = parsed.data;
        if (ev.type === "camera_status") {
          const { error } = await supabaseAdmin.from("cameras").update({
            status: ev.status, last_latency_ms: ev.latency_ms ?? null, last_error: ev.error ?? null, last_event_at: new Date().toISOString(),
          }).eq("unit_id", ev.unit_id).eq("code", ev.camera_code);
          if (error) return Response.json({ error: "db_error" }, { status: 500 });
        } else {
          const { error } = await supabaseAdmin.from("alerts").insert({
            unit_id: ev.unit_id, type: ev.alert_type, severity: ev.severity, title: ev.title, description: ev.description ?? null,
          });
          if (error) return Response.json({ error: "db_error" }, { status: 500 });
        }
        return Response.json({ received: true });
      },
    },
  },
});
