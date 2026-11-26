import { ArrowDownRight, ArrowUpRight, Info, Minus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { fmt } from "@/lib/metrics";

type Props = {
  label: string;
  value: string | null;
  unit?: string;
  change?: number | null;
  /** true when an increase is a good outcome */
  higherIsBetter?: boolean;
  method: string;
  loading?: boolean;
};

export function KpiCard({ label, value, unit, change, higherIsBetter = true, method, loading }: Props) {
  const dir = change == null || Math.abs(change) < 0.05 ? 0 : change > 0 ? 1 : -1;
  const good = dir === 0 ? null : (dir > 0) === higherIsBetter;
  const Icon = dir > 0 ? ArrowUpRight : dir < 0 ? ArrowDownRight : Minus;
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
        <Tooltip>
          <TooltipTrigger aria-label={`Metodologia: ${label}`} className="text-subtle hover:text-muted-foreground"><Info className="size-3.5" /></TooltipTrigger>
          <TooltipContent className="max-w-64 text-xs">{method}</TooltipContent>
        </Tooltip>
      </div>
      {loading ? <Skeleton className="mt-3 h-8 w-24" /> : (
        <div className="mt-2 flex items-baseline gap-1">
          <span className="tabular text-[28px] font-semibold leading-none tracking-tight">{value ?? "—"}</span>
          {unit && value != null && <span className="text-[13px] text-muted-foreground">{unit}</span>}
        </div>
      )}
      <div className="mt-2 h-4 text-[12px]">
        {!loading && change != null && (
          <span className={`inline-flex items-center gap-0.5 font-medium ${good == null ? "text-muted-foreground" : good ? "text-success" : "text-destructive"}`}>
            <Icon className="size-3.5" />{fmt.dec(Math.abs(change))}%
            <span className="ml-1 font-normal text-subtle">vs. período anterior</span>
          </span>
        )}
        {!loading && change == null && <span className="text-subtle">Sem base de comparação</span>}
      </div>
    </div>
  );
}
