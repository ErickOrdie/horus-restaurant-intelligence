import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, LogOut, ChevronsUpDown, CircleDot } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABELS, useAuth, useProfile } from "@/lib/auth";
import { NAV } from "@/components/horus/nav";
import { HorusLogo, HorusMark } from "@/components/horus/HorusLogo";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel, SidebarHeader,
  SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useVisionRealtime } from "@/lib/use-vision-realtime";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function AppLayout() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center"><HorusMark className="size-9 animate-pulse" /></div>
    );
  }
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="bg-background">
        <AppHeader />
        <div className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 md:px-8"><Outlet /></div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { state } = useSidebar();
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b px-3">
        <HorusLogo compact={state === "collapsed"} />
      </SidebarHeader>
      <SidebarContent className="gap-0 py-2">
        {NAV.map((g) => (
          <SidebarGroup key={g.label} className="py-1">
            <SidebarGroupLabel className="text-[11px] font-medium uppercase tracking-[0.08em] text-subtle">{g.label}</SidebarGroupLabel>
            <SidebarMenu>
              {g.items.map((it) => {
                const Icon = it.icon;
                if (!it.to) {
                  return (
                    <SidebarMenuItem key={it.label}>
                      <SidebarMenuButton asChild isActive={path === `/modulos/${it.slug}`} tooltip={it.label} className="h-8 text-[13px] data-[active=true]:font-medium">
                        <Link to="/modulos/$slug" params={{ slug: it.slug ?? "" }}><Icon /><span>{it.label}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                }
                return (
                  <SidebarMenuItem key={it.label}>
                    <SidebarMenuButton asChild isActive={path.startsWith(it.to)} tooltip={it.label} className="h-8 text-[13px] data-[active=true]:font-medium">
                      <Link to={it.to}><Icon /><span>{it.label}</span></Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}

function AppHeader() {
  const { data, isLoading } = useProfile();
  useVisionRealtime(data?.profile.organization_id);
  const navigate = useNavigate();
  const unit = data?.units[0];
  const alerts = useQuery({
    queryKey: ["alerts", "open-header"],
    queryFn: async () => {
      const { data, error } = await supabase.from("alerts").select("id,title,severity,created_at").eq("status", "aberto").order("created_at", { ascending: false }).limit(6);
      if (error) throw error;
      return data;
    },
  });

  const engine = useQuery({
    queryKey: ["roboflow-config"],
    queryFn: async () => (await supabase.from("roboflow_config").select("*").maybeSingle()).data,
  });
  const es = engine.data?.last_status;
  const engineLabel = es === "online" ? "conectado" : es ? "indisponível" : "não conectado";
  const engineColor = es === "online" ? "text-success" : "text-warning";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }
  const name = data?.profile.full_name ?? data?.profile.email ?? "";
  const org = data?.profile.organizations as { name: string; is_demo: boolean } | null | undefined;

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-card px-4 md:px-6">
      <SidebarTrigger className="-ml-1 text-muted-foreground" />
      <div className="h-5 w-px bg-border" />
      {isLoading ? <Skeleton className="h-5 w-48" /> : (
        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <span className="truncate font-medium">{org?.name}</span>
          <span className="text-subtle">/</span>
          <span className="truncate text-muted-foreground">{unit?.name}</span>
          {org?.is_demo && <Badge variant="outline" className="ml-1 border-gold/40 text-[10px] font-medium text-gold">Demonstração</Badge>}
        </div>
      )}
      <div className="ml-auto flex items-center gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link to="/integracoes" className="hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[12px] text-muted-foreground hover:bg-accent md:flex">
              <CircleDot className={`size-3 ${engineColor}`} />Motor de IA: {engineLabel}
            </Link>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">Status do último teste da Roboflow. Os indicadores operacionais existentes continuam usando os registros persistidos.</TooltipContent>
        </Tooltip>
        <DropdownMenu>
          <DropdownMenuTrigger className="relative rounded-md p-2 text-muted-foreground hover:bg-accent" aria-label="Notificações">
            <Bell className="size-4" />
            {!!alerts.data?.length && <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-destructive" />}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="text-xs">Alertas em aberto</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {alerts.data?.length ? alerts.data.map((a) => (
              <DropdownMenuItem key={a.id} onSelect={() => navigate({ to: "/alertas" })} className="flex-col items-start gap-0.5">
                <span className="text-[13px]">{a.title}</span>
                <span className="text-[11px] text-subtle">{new Date(a.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · {a.severity}</span>
              </DropdownMenuItem>
            )) : <div className="px-2 py-4 text-center text-xs text-muted-foreground">Nenhum alerta em aberto.</div>}
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-accent">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">{name.slice(0, 2).toUpperCase()}</span>
            <span className="hidden text-left leading-tight md:block">
              <span className="block max-w-36 truncate text-[13px] font-medium">{name}</span>
              <span className="block text-[11px] text-subtle">{data?.roles.map((r) => ROLE_LABELS[r]).join(", ")}</span>
            </span>
            <ChevronsUpDown className="size-3.5 text-subtle" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate text-xs font-normal text-muted-foreground">{data?.profile.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={signOut}><LogOut />Sair</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
