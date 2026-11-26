import {
  LayoutDashboard, Gauge, Lightbulb, Utensils, Timer, LayoutGrid, SprayCan, Route as RouteIcon,
  Trash2, Soup, ThumbsUp, LineChart, Apple, Cctv, FlaskConical, Boxes, History, MessageSquareText,
  FileText, Smile, Bell, Building2, Store, Users, ShieldCheck, Plug, ScrollText, Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = { label: string; icon: LucideIcon; to?: string; phase?: number; slug?: string };
export type NavGroup = { label: string; items: NavItem[] };

// `to` = disponível; `phase` = previsto na ordem de implementação (seção 40 do escopo).
export const NAV: NavGroup[] = [
  { label: "Visão geral", items: [
    { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard" },
    { label: "Indicadores executivos", icon: Gauge, slug: "indicadores-executivos" },
    { label: "Insights operacionais", icon: Lightbulb, slug: "insights-operacionais" },
  ]},
  { label: "Operações", items: [
    { label: "Composição dos pratos", icon: Utensils, slug: "composicao-dos-pratos" },
    { label: "Filas e atendimento", icon: Timer, slug: "filas-e-atendimento" },
    { label: "Monitoramento do salão", icon: LayoutGrid, to: "/salao" },
    { label: "Limpeza das mesas", icon: SprayCan, slug: "limpeza-das-mesas" },
    { label: "Jornada do cliente", icon: RouteIcon, slug: "jornada-do-cliente" },
  ]},
  { label: "Inteligência alimentar", items: [
    { label: "Desperdício alimentar", icon: Trash2, slug: "desperdicio-alimentar" },
    { label: "Monitoramento do buffet", icon: Soup, slug: "monitoramento-do-buffet" },
    { label: "Aceitação dos alimentos", icon: ThumbsUp, slug: "aceitacao-dos-alimentos" },
    { label: "Análise financeira", icon: LineChart, slug: "analise-financeira" },
    { label: "Cadastro de alimentos", icon: Apple, to: "/alimentos" },
  ]},
  { label: "Visão computacional", items: [
    { label: "Central de câmeras", icon: Cctv, to: "/cameras" },
    { label: "Laboratório", icon: FlaskConical, to: "/laboratorio" },
    { label: "Modelos de IA", icon: Boxes, to: "/modelos" },
    { label: "Histórico de detecções", icon: History, slug: "historico-de-deteccoes" },
  ]},
  { label: "Inteligência gerencial", items: [
    { label: "Hórus AI", icon: MessageSquareText, slug: "horus-ai" },
    { label: "Relatórios", icon: FileText, slug: "relatorios" },
    { label: "Pesquisa de satisfação", icon: Smile, slug: "pesquisa-de-satisfacao" },
    { label: "Alertas", icon: Bell, to: "/alertas" },
  ]},
  { label: "Administração", items: [
    { label: "Organizações", icon: Building2, slug: "organizacoes" },
    { label: "Unidades", icon: Store, slug: "unidades" },
    { label: "Usuários", icon: Users, slug: "usuarios" },
    { label: "Permissões", icon: ShieldCheck, slug: "permissoes" },
    { label: "Integrações", icon: Plug, to: "/integracoes" },
    { label: "Consumo de IA", icon: Gauge, to: "/consumo" },
    { label: "Auditoria", icon: ScrollText, to: "/auditoria" },
    { label: "Configurações", icon: Settings, slug: "configuracoes" },
  ]},
];
