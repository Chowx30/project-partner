import type { ReactNode } from "react";

export type EmptyStateProps = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  align?: "left" | "center";
  className?: string;
};

export function EmptyState({
  title,
  description,
  action,
  align = "left",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={[
        "rounded-card border-2 border-dark bg-surface p-6",
        align === "center" ? "text-center" : "text-left",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <h3 className="text-lg font-semibold text-dark">{title}</h3>
      {description ? (
        <div className="mt-2 text-sm leading-6 text-muted">{description}</div>
      ) : null}
      {action ? (
        <div
          className={[
            "mt-4 flex flex-wrap gap-3",
            align === "center" ? "justify-center" : "justify-start",
          ].join(" ")}
        >
          {action}
        </div>
      ) : null}
    </div>
  );
}
