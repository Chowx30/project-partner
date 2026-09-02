import type { HTMLAttributes } from "react";

export type StatusBadgeStatus =
  | "open"
  | "closed"
  | "completed"
  | "cancelled"
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "read"
  | "unread";

export type StatusBadgeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  "children"
> & {
  status: StatusBadgeStatus;
};

const statusStyles: Record<StatusBadgeStatus, string> = {
  open: "border-success bg-success/10 text-success",
  accepted: "border-success bg-success/10 text-success",
  pending: "border-dark bg-accent text-dark",
  rejected: "border-danger bg-danger/10 text-danger",
  cancelled: "border-danger bg-danger/10 text-danger",
  closed: "border-border bg-surface text-muted",
  completed: "border-border bg-surface text-muted",
  withdrawn: "border-border bg-surface text-muted",
  read: "border-border bg-surface text-muted",
  unread: "border-dark bg-accent text-dark",
};

const statusLabels: Record<StatusBadgeStatus, string> = {
  open: "Open",
  closed: "Closed",
  completed: "Completed",
  cancelled: "Cancelled",
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  read: "Read",
  unread: "Unread",
};

export function StatusBadge({
  status,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      {...props}
      className={[
        "inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-xs font-semibold leading-none",
        statusStyles[status],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {statusLabels[status]}
    </span>
  );
}
