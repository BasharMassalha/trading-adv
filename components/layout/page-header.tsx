import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4 pb-1",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <div className="mb-1.5 font-mono text-[11px] uppercase tracking-wider text-faint">
            {eyebrow}
          </div>
        ) : null}
        <h1 className="text-[19px] font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </div>
  );
}

/** Section label used above tables and secondary blocks. */
export function SectionTitle({
  children,
  actions,
  className,
}: {
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-2",
        className,
      )}
    >
      <h2 className="text-[14px] font-semibold tracking-tight">{children}</h2>
      {actions}
    </div>
  );
}
