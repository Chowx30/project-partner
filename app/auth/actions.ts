"use server";

import { redirect } from "next/navigation";

import type { AuthFieldErrors, AuthFormState } from "@/app/auth/form-state";
import {
  isNsuEmail,
  normalizeEmail,
  NSU_EMAIL_MESSAGE,
} from "@/src/lib/auth/validation";
import { createClient } from "@/src/lib/supabase/server";

const LOCAL_CONFIRM_URL = "http://localhost:3000/auth/confirm";

function readFormValue(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function signUpAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeEmail(readFormValue(formData, "email"));
  const password = readFormValue(formData, "password");
  const confirmPassword = readFormValue(formData, "confirmPassword");
  const errors: AuthFieldErrors = {};

  if (!isNsuEmail(email)) {
    errors.email = NSU_EMAIL_MESSAGE;
  }

  if (password.length < 8) {
    errors.password = "Password must be at least 8 characters.";
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: LOCAL_CONFIRM_URL,
    },
  });

  if (error) {
    return {
      status: "error",
      message: "We could not create your account. Please try again.",
    };
  }

  if (data.session) {
    redirect("/dashboard");
  }

  return {
    status: "success",
    message:
      "Verification is required before login. Open the confirmation link in your university email.",
  };
}

export async function loginAction(
  _previousState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = normalizeEmail(readFormValue(formData, "email"));
  const password = readFormValue(formData, "password");
  const errors: AuthFieldErrors = {};

  if (!isNsuEmail(email)) {
    errors.email = NSU_EMAIL_MESSAGE;
  }

  if (!password) {
    errors.password = "Enter your password.";
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      status: "error",
      message: "Invalid email or password, or the account is not confirmed.",
    };
  }

  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?loggedOut=1");
}
