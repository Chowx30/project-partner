"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { signUpAction } from "@/app/auth/actions";
import {
  initialAuthFormState,
  type AuthFieldErrors,
} from "@/app/auth/form-state";
import {
  isNsuEmail,
  normalizeEmail,
  NSU_EMAIL_MESSAGE,
} from "@/src/lib/auth/validation";

const inputClassName =
  "mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-300";

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(
    signUpAction,
    initialAuthFormState,
  );
  const [clientErrors, setClientErrors] = useState<AuthFieldErrors>({});
  const errors = { ...state.errors, ...clientErrors };

  function validateBeforeSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const nextErrors: AuthFieldErrors = {};

    if (!isNsuEmail(email)) {
      nextErrors.email = NSU_EMAIL_MESSAGE;
    }

    if (password.length < 8) {
      nextErrors.password = "Password must be at least 8 characters.";
    }

    if (password !== confirmPassword) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setClientErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
    }
  }

  if (state.status === "success") {
    return (
      <div role="status" className="space-y-4">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <p className="font-medium">Check your email</p>
          <p className="mt-1">{state.message}</p>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Already confirmed?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-950 underline underline-offset-4 dark:text-white"
          >
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} onSubmit={validateBeforeSubmit} noValidate>
      <div>
        <label
          htmlFor="email"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          University email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          disabled={isPending}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "signup-email-error" : undefined}
          className={inputClassName}
          placeholder="name@northsouth.edu"
        />
        {errors.email && (
          <p
            id="signup-email-error"
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {errors.email}
          </p>
        )}
      </div>

      <div className="mt-5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isPending}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? "signup-password-error" : "signup-password-help"
          }
          className={inputClassName}
        />
        {errors.password ? (
          <p
            id="signup-password-error"
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {errors.password}
          </p>
        ) : (
          <p
            id="signup-password-help"
            className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
          >
            Use at least 8 characters.
          </p>
        )}
      </div>

      <div className="mt-5">
        <label
          htmlFor="confirmPassword"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Confirm password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isPending}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword ? "signup-confirm-error" : undefined
          }
          className={inputClassName}
        />
        {errors.confirmPassword && (
          <p
            id="signup-confirm-error"
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {errors.confirmPassword}
          </p>
        )}
      </div>

      {state.message && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
