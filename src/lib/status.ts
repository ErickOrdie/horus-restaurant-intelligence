export const TABLE_STATUS: Record<string, { label: string; dot: string; ring: string }> = {
  disponivel: { label: "Disponível", dot: "bg-success", ring: "border-success/40" },
  ocupada: { label: "Ocupada", dot: "bg-primary", ring: "border-primary/40" },
  aguardando_limpeza: { label: "Aguardando limpeza", dot: "bg-warning", ring: "border-warning/50" },
  em_limpeza: { label: "Em limpeza", dot: "bg-info", ring: "border-info/40" },
  reservada: { label: "Reservada", dot: "bg-gold", ring: "border-gold/50" },
  bloqueada: { label: "Bloqueada", dot: "bg-subtle", ring: "border-border" },
};
export const SEVERITY: Record<string, { label: string; cls: string }> = {
  baixa: { label: "Baixa", cls: "border-border text-muted-foreground" },
  media: { label: "Média", cls: "border-warning/40 text-warning" },
  alta: { label: "Alta", cls: "border-destructive/40 text-destructive" },
  critica: { label: "Crítica", cls: "border-destructive bg-destructive/10 text-destructive" },
};
