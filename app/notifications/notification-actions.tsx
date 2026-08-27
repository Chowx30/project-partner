"use client";

import { useActionState } from "react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions";
import { initialNotificationActionState } from "@/app/notifications/form-state";

function ActionMessage({
  status,
  message,
}: {
  status: "idle" | "error" | "success";
  message?: string;
}) {
  if (!message) {
    return null;
  }

  return (
    <p
      role={status === "error" ? "alert" : "status"}
      className={
        status === "error"
          ? "mt-2 text-sm text-red-600 dark:text-red-400"
          : "mt-2 text-sm text-emerald-600 dark:text-emerald-400"
      }
    >
      {message}
    </p>
  );
}

export function MarkNotificationReadButton({
  notificationId,
}: {
  notificationId: string;
}) {
  const markCurrentNotificationRead = markNotificationRead.bind(
    null,
    notificationId,
  );
  const [state, formAction, pending] = useActionState(
    markCurrentNotificationRead,
    initialNotificationActionState,
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {pending ? "Marking…" : "Mark as read"}
      </button>
      <ActionMessage status={state.status} message={state.message} />
    </form>
  );
}

export function MarkAllNotificationsReadButton() {
  const [state, formAction, pending] = useActionState(
    markAllNotificationsRead,
    initialNotificationActionState,
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {pending ? "Marking all…" : "Mark all as read"}
      </button>
      <ActionMessage status={state.status} message={state.message} />
    </form>
  );
}
