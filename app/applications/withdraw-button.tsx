"use client";

import { useActionState } from "react";

import { withdrawApplication } from "@/app/applications/actions";
import { initialWithdrawApplicationFormState } from "@/app/applications/form-state";

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const withdrawCurrentApplication = withdrawApplication.bind(
    null,
    applicationId,
  );
  const [state, formAction, pending] = useActionState(
    withdrawCurrentApplication,
    initialWithdrawApplicationFormState,
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        {pending ? "Withdrawing…" : "Withdraw"}
      </button>
      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "mt-2 text-sm text-red-600 dark:text-red-400"
              : "mt-2 text-sm text-emerald-600 dark:text-emerald-400"
          }
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
