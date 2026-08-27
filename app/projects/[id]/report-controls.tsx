"use client";

import { useActionState, useState } from "react";

import {
  reportProjectCommentAction,
  reportProjectAction,
} from "@/app/projects/[id]/actions";
import {
  initialReportFormState,
  type ReportFormState,
} from "@/app/projects/[id]/form-state";
import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASON_OPTIONS,
} from "@/src/lib/reports/validation";

type ReportTarget = "project" | "comment";

export function ReportControls({
  target,
  targetId,
  alreadyReported,
}: {
  target: ReportTarget;
  targetId: string;
  alreadyReported: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const action =
    target === "project"
      ? reportProjectAction.bind(null, targetId)
      : reportProjectCommentAction.bind(null, targetId);
  const [state, formAction, pending] = useActionState<
    ReportFormState,
    FormData
  >(action, initialReportFormState);
  const idPrefix = `report-${target}-${targetId}`;
  const triggerLabel = target === "project" ? "Report project" : "Report";

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
          htmlFor={`${idPrefix}-reason`}
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Reason
        </label>
        <select
          id={`${idPrefix}-reason`}
          name="reason"
          required
          defaultValue=""
          disabled={pending}
          aria-invalid={Boolean(state.reasonError)}
          aria-describedby={
            state.reasonError ? `${idPrefix}-reason-error` : undefined
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
            id={`${idPrefix}-reason-error`}
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {state.reasonError}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-details`}
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Details <span className="font-normal text-zinc-500">(optional)</span>
        </label>
        <textarea
          id={`${idPrefix}-details`}
          name="details"
          rows={3}
          maxLength={REPORT_DETAILS_MAX_LENGTH}
          disabled={pending}
          aria-invalid={Boolean(state.detailsError)}
          aria-describedby={`${idPrefix}-details-help${
            state.detailsError ? ` ${idPrefix}-details-error` : ""
          }`}
          className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-300"
        />
        <p
          id={`${idPrefix}-details-help`}
          className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
        >
          Maximum {REPORT_DETAILS_MAX_LENGTH} characters.
        </p>
        {state.detailsError && (
          <p
            id={`${idPrefix}-details-error`}
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
