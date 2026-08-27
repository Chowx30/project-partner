"use client";

import { useActionState, useState } from "react";

import {
  initialReportFormState,
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASON_OPTIONS,
  type ReportFormState,
} from "@/src/lib/reports/validation";

type ReportAction = (
  previousState: ReportFormState,
  formData: FormData,
) => Promise<ReportFormState>;

export function ReportForm({
  action,
  alreadyReported,
  controlId,
  triggerLabel,
}: {
  action: ReportAction;
  alreadyReported: boolean;
  controlId: string;
  triggerLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [state, formAction, pending] = useActionState(
    action,
    initialReportFormState,
  );

  if (alreadyReported) {
    return (
      <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
        Reported
      </p>
    );
  }

  if (state.status === "success") {
    return (
      <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
        Report submitted.
      </p>
    );
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-sm font-medium text-zinc-500 underline underline-offset-4 transition hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
      >
        {triggerLabel}
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <label
          htmlFor={`${controlId}-reason`}
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Reason
        </label>
        <select
          id={`${controlId}-reason`}
          name="reason"
          required
          defaultValue=""
          disabled={pending}
          aria-invalid={Boolean(state.reasonError)}
          aria-describedby={
            state.reasonError ? `${controlId}-reason-error` : undefined
          }
          className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-300"
        >
          <option value="" disabled>
            Choose a reason
          </option>
          {REPORT_REASON_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {state.reasonError && (
          <p
            id={`${controlId}-reason-error`}
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {state.reasonError}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={`${controlId}-details`}
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Details <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id={`${controlId}-details`}
          name="details"
          rows={3}
          maxLength={REPORT_DETAILS_MAX_LENGTH}
          disabled={pending}
          aria-invalid={Boolean(state.detailsError)}
          aria-describedby={`${controlId}-details-help${
            state.detailsError ? ` ${controlId}-details-error` : ""
          }`}
          className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-300"
        />
        <p
          id={`${controlId}-details-help`}
          className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
        >
          Maximum {REPORT_DETAILS_MAX_LENGTH} characters.
        </p>
        {state.detailsError && (
          <p
            id={`${controlId}-details-error`}
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {state.detailsError}
          </p>
        )}
      </div>

      {state.message && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
        >
          {pending ? "Submitting…" : "Submit report"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setExpanded(false)}
          className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
