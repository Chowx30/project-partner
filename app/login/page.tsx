import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/app/auth/auth-shell";
import { LoginForm } from "@/app/auth/login-form";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    loggedOut?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (await getAuthenticatedUser()) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const notice =
    params.loggedOut === "1"
      ? "You have been logged out."
      : params.error === "confirmation_failed"
        ? "That confirmation link is invalid or has expired."
        : params.error === "nsu_email_required"
          ? "Only confirmed @northsouth.edu accounts can continue."
          : null;

  return (
    <AuthShell
      title="Welcome back"
      description="Log in with your North South University account."
      footer={
        <>
          Need an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-zinc-950 underline underline-offset-4 dark:text-white"
          >
            Create one
          </Link>
        </>
      }
    >
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-lg bg-zinc-100 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
        >
          {notice}
        </p>
      )}
      <LoginForm />
    </AuthShell>
  );
}
