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
import { Button } from "@/src/components/ui/button";
import {
  errorTextStyles,
  inputStyles,
  labelStyles,
} from "@/src/components/ui/form-controls";

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
          className={labelStyles}
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
          className={`mt-2 ${inputStyles}`}
          placeholder="name@northsouth.edu"
        />
        {errors.email && (
          <p
            id="login-email-error"
            className={errorTextStyles}
          >
            {errors.email}
          </p>
        )}
      </div>

      <div className="mt-5">
        <label
          htmlFor="password"
          className={labelStyles}
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
          className={`mt-2 ${inputStyles}`}
        />
        {errors.password && (
          <p
            id="login-password-error"
            className={errorTextStyles}
          >
            {errors.password}
          </p>
        )}
      </div>

      {state.message && (
        <p
          role="alert"
          className="mt-5 rounded-control border-2 border-danger bg-white p-3 text-sm font-medium text-danger"
        >
          {state.message}
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        featured
        className="mt-7 w-full"
      >
        {isPending ? "Logging in…" : "Log In"}
      </Button>
    </form>
  );
}
