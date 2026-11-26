import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function PageHeader({ section, title, description, actions }: { section: string; title: string; description: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <nav aria-label="Breadcrumb" className="mb-2 flex items-center gap-1 text-[12px] text-subtle">
          <Link to="/dashboard" className="hover:text-foreground">Hórus</Link>
          <ChevronRight className="size-3" /><span>{section}</span>
          <ChevronRight className="size-3" /><span className="text-muted-foreground">{title}</span>
        </nav>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, children, className = "", action }: { title: string; description?: string; children: ReactNode; className?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-lg border bg-card ${className}`}>
      <header className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
        <div>
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-[12px] text-muted-foreground">{description}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-10 text-center">
      <p className="text-[13px] font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-[12px] text-muted-foreground">{description}</p>
    </div>
  );
}
