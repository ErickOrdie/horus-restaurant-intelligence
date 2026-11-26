<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Hórus architecture
- Authenticated pages live under the pathless `src/routes/_app.tsx` layout (sidebar + header, client-side session guard); data is read in the browser with the Supabase client so RLS scopes it per organization.
- Multi-tenancy: every row belongs to an organization directly or through `units`; RLS uses `current_org()`, `can_access_unit()` and `can_manage()` security-definer helpers. Roles live only in `user_roles`.
- Dashboard numbers are computed from persisted rows via pure functions in `src/lib/metrics.ts` (tested in `metrics.test.ts`); never hardcode indicator values in components.
- Sidebar items come from `src/components/horus/nav.ts`; items without a route show their planned phase and stay disabled until a real page exists.
- Mutations write an entry to `audit_logs` through `logAudit` in `src/lib/data.ts`.
- Hosted vision uses authenticated TanStack server functions in `roboflow.functions.ts` with a backend-only provider key; Python adapters remain optional because image analysis must not require a user-managed server.
- Roboflow responses normalize pixel boxes/polygons in `roboflow.ts`; unsupported workflow shapes fail explicitly because missing outputs must never become fabricated empty detections.
- Quota reservations lock per-organization configuration and deduplicate requests before provider calls; completion uses privileged writes only after tenant/unit/model validation because concurrent requests must not bypass budgets.
- Optional retained images use private storage paths scoped to organization/user and explicit consent; webcam tracks stop on unmount and never request audio because image retention and capture must be minimal.
- Vision updates use a data-free private organization broadcast and debounced query invalidation because inference rows contain large/private payloads.
- Engine-to-app events arrive at `/api/public/ai-engine/events`, which must verify `X-Horus-Key` before touching data. Detections are never simulated: failures are stored in `inference_runs` as `erro`/`indisponivel`.
