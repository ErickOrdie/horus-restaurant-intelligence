// Pure metric calculations used by the dashboard. All inputs come from persisted rows.

export type PeriodKey = "hoje" | "ontem" | "7d" | "30d";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  hoje: "Hoje",
  ontem: "Ontem",
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
};

const TZ_OFFSET_HOURS = -3; // America/Sao_Paulo (sem horário de verão)

/** Start of the local (São Paulo) day containing `d`, as a UTC Date. */
export function startOfLocalDay(d: Date): Date {
  const local = new Date(d.getTime() + TZ_OFFSET_HOURS * 3600_000);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - TZ_OFFSET_HOURS * 3600_000);
}

/** Returns [from, to) for the period and the equivalent previous window. */
export function periodRange(key: PeriodKey, now: Date = new Date()) {
  const today = startOfLocalDay(now);
  const day = 86400_000;
  let from: Date;
  let to: Date;
  switch (key) {
    case "hoje":
      from = today;
      to = now;
      break;
    case "ontem":
      from = new Date(today.getTime() - day);
      to = today;
      break;
    case "7d":
      from = new Date(today.getTime() - 6 * day);
      to = now;
      break;
    case "30d":
      from = new Date(today.getTime() - 29 * day);
      to = now;
      break;
  }
  const span = key === "hoje" || key === "ontem" ? day : to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - span);
  const prevTo = key === "hoje" ? new Date(to.getTime() - day) : from;
  return { from, to, prevFrom, prevTo };
}

export function localHour(iso: string): number {
  const h = new Date(iso).getUTCHours() + TZ_OFFSET_HOURS;
  return (h + 24) % 24;
}

export function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function sum(values: number[]): number {
  return values.reduce((a, b) => a + b, 0);
}

/** Percent change from previous to current. null when previous is missing or zero. */
export function pctChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

/** Contribution margin (%) = (receita - custo) / receita. */
export function contributionMargin(revenue: number, cost: number): number | null {
  if (revenue <= 0) return null;
  return ((revenue - cost) / revenue) * 100;
}

/** Occupancy (%) = mesas ocupadas / mesas totais. */
export function occupancy(occupied: number, total: number): number | null {
  if (total <= 0) return null;
  return (occupied / total) * 100;
}

/** Satisfaction index on a 0–100 scale from 0–10 scores (NPS-like average). */
export function satisfactionIndex(scores: number[]): number | null {
  const a = avg(scores);
  return a == null ? null : a * 10;
}

export function groupBy<T>(rows: T[], key: (r: T) => string | number) {
  const map = new Map<string | number, T[]>();
  for (const r of rows) {
    const k = key(r);
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}

export const fmt = {
  int: (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(n),
  dec: (n: number, d = 1) =>
    new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(n),
  brl: (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n),
  kg: (g: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(g / 1000)} kg`,
  min: (s: number) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(s / 60)} min`,
};
