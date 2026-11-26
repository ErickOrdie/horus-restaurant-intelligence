import { cn } from "@/lib/utils";

/** Geometric Eye of Horus mark: almond eye, iris, and the two classic strokes below. */
export function HorusMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-7", className)} aria-hidden="true">
      <rect width="32" height="32" rx="6" className="fill-primary" />
      <path d="M5 14.5C8.5 10 12 8.5 16 8.5s7.5 1.5 11 6c-3.5 4.5-7 6-11 6s-7.5-1.5-11-6Z" className="stroke-primary-foreground" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="16" cy="14.5" r="3" className="fill-gold" />
      <path d="M13 20.5 11.5 26" className="stroke-primary-foreground" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18.5 20.5c0 2.5 1.5 4 4 4.5" className="stroke-gold" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function HorusLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <HorusMark />
      {!compact && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight text-foreground">Hórus</div>
          <div className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-subtle">Restaurant Intelligence</div>
        </div>
      )}
    </div>
  );
}
