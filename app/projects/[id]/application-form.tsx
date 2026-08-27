"use client";

import { useActionState } from "react";

import { submitProjectApplicationAction } from "@/app/projects/[id]/actions";
import {
  APPLICATION_MESSAGE_MAX_LENGTH,
  initialApplicationFormState,
} from "@/app/projects/[id]/form-state";

export function ApplicationForm({ projectId }: { projectId: string }) {
  const submitForProject = submitProjectApplicationAction.bind(
    null,
    projectId,
  );
  const [state, formAction, pending] = useActionState(
    submitForProject,
    initialApplicationFormState,
  );

  return (
    <form action={formAction} className="mt-5 space-y-5">
      <div>
        <label
          htmlFor="application-message"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Message <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id="application-message"
          name="message"
          rows={5}
          maxLength={APPLICATION_MESSAGE_MAX_LENGTH}
          disabled={pending}
          aria-invalid={Boolean(state.fieldError)}
          aria-describedby={
            state.fieldError
              ? "application-message-error"
              : "application-message-help"
          }
          className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-300"
        />
        {state.fieldError ? (
          <p
            id="application-message-error"
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {state.fieldError}
          </p>
        ) : (
          <p
            id="application-message-help"
            className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
          >
            Briefly introduce yourself or explain why you&apos;d be a good fit.
          </p>
        )}
      </div>

      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
              : "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-11 w-full items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? "Submitting…" : "Apply to join"}
      </button>
    </form>
  );
}
