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
import { Button } from "@/src/components/ui/button";
import {
  errorTextStyles,
  helpTextStyles,
  inputStyles,
  labelStyles,
} from "@/src/components/ui/form-controls";

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
        <div className="rounded-control border-2 border-success bg-white p-4 text-sm leading-6 text-dark">
          <p className="font-bold text-success">Check your email</p>
          <p className="mt-1">{state.message}</p>
        </div>
        <p className="text-sm text-muted">
          Already confirmed?{" "}
          <Link
            href="/login"
            className="font-bold text-dark underline decoration-accent decoration-2 underline-offset-4"
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
          aria-describedby={errors.email ? "signup-email-error" : undefined}
          className={`mt-2 ${inputStyles}`}
          placeholder="name@northsouth.edu"
        />
        {errors.email && (
          <p
            id="signup-email-error"
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
          autoComplete="new-password"
          minLength={8}
          required
          disabled={isPending}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? "signup-password-error" : "signup-password-help"
          }
          className={`mt-2 ${inputStyles}`}
        />
        {errors.password ? (
          <p
            id="signup-password-error"
            className={errorTextStyles}
          >
            {errors.password}
          </p>
        ) : (
          <p
            id="signup-password-help"
            className={helpTextStyles}
          >
            Use at least 8 characters.
          </p>
        )}
      </div>

      <div className="mt-5">
        <label
          htmlFor="confirmPassword"
          className={labelStyles}
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
          className={`mt-2 ${inputStyles}`}
        />
        {errors.confirmPassword && (
          <p
            id="signup-confirm-error"
            className={errorTextStyles}
          >
            {errors.confirmPassword}
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
        {isPending ? "Creating account…" : "Create Account"}
      </Button>
    </form>
  );
}
