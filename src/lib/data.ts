import { supabase } from "@/integrations/supabase/client";

/** Pages through a query to bypass the 1000-row API default. */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const size = 1000;
  const out: T[] = [];
  for (let i = 0; ; i += size) {
    const { data, error } = await build(i, i + size - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
  }
  return out;
}

export async function logAudit(action: string, entity: string, entityId: string | null, details?: Record<string, unknown>) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data: p } = await supabase.from("profiles").select("organization_id").eq("id", u.user.id).single();
  await supabase.from("audit_logs").insert({
    organization_id: p?.organization_id ?? null,
    user_id: u.user.id,
    action,
    entity,
    entity_id: entityId,
    details: (details ?? null) as never,
  });
}
