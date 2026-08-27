"use client";

import { useActionState, useState } from "react";

import { loginAction } from "@/app/auth/actions";
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

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialAuthFormState,
  );
  const [clientErrors, setClientErrors] = useState<AuthFieldErrors>({});
  const errors = { ...state.errors, ...clientErrors };

  function validateBeforeSubmit(event: React.FormEvent<HTMLFormElement>) {
    const formData = new FormData(event.currentTarget);
    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const password = String(formData.get("password") ?? "");
    const nextErrors: AuthFieldErrors = {};

    if (!isNsuEmail(email)) {
      nextErrors.email = NSU_EMAIL_MESSAGE;
    }

    if (!password) {
      nextErrors.password = "Enter your password.";
    }

    setClientErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      event.preventDefault();
    }
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
          aria-describedby={errors.email ? "login-email-error" : undefined}
          className={inputClassName}
          placeholder="name@northsouth.edu"
        />
        {errors.email && (
          <p
            id="login-email-error"
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
          autoComplete="current-password"
          required
          disabled={isPending}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? "login-password-error" : undefined}
          className={inputClassName}
        />
        {errors.password && (
          <p
            id="login-password-error"
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {errors.password}
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
        {isPending ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
