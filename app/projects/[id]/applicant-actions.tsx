"use client";

import { useActionState } from "react";

import {
  acceptProjectApplicationAction,
  rejectProjectApplicationAction,
} from "@/app/projects/[id]/actions";
import { initialManageApplicationFormState } from "@/app/projects/[id]/form-state";

export function ApplicantActions({
  applicationId,
  canAccept,
}: {
  applicationId: string;
  canAccept: boolean;
}) {
  const acceptApplication = acceptProjectApplicationAction.bind(
    null,
    applicationId,
  );
  const rejectApplication = rejectProjectApplicationAction.bind(
    null,
    applicationId,
  );
  const [acceptState, acceptAction, accepting] = useActionState(
    acceptApplication,
    initialManageApplicationFormState,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(
    rejectApplication,
    initialManageApplicationFormState,
  );
  const pending = accepting || rejecting;
  const resultState =
    rejecting || rejectState.status !== "idle" ? rejectState : acceptState;

  return (
    <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
      {!canAccept && (
        <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
          Accept is unavailable because this project is closed or full.
        </p>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        {canAccept && (
          <form action={acceptAction}>
            <button
              type="submit"
              disabled={pending}
              className="flex h-10 w-full items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              {accepting ? "Accepting…" : "Accept"}
            </button>
          </form>
        )}

        <form action={rejectAction}>
          <button
            type="submit"
            disabled={pending}
            className="flex h-10 w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {rejecting ? "Rejecting…" : "Reject"}
          </button>
        </form>
      </div>

      {resultState.message && (
        <p
          role={resultState.status === "error" ? "alert" : "status"}
          className={
            resultState.status === "error"
              ? "mt-3 text-sm text-red-600 dark:text-red-400"
              : "mt-3 text-sm text-emerald-600 dark:text-emerald-400"
          }
        >
          {resultState.message}
        </p>
      )}
    </div>
  );
}
