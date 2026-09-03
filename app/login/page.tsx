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
      eyebrow="Welcome back"
      title="Log in to Project Partner"
      description="Continue finding project and lab partners."
      footer={
        <>
          New here?{" "}
          <Link
            href="/signup"
            className="font-bold text-dark underline decoration-accent decoration-2 underline-offset-4"
          >
            Create an account
          </Link>
        </>
      }
    >
      {notice && (
        <p
          role="status"
          className="mb-6 rounded-control border-2 border-dark bg-white p-3 text-sm text-dark"
        >
          {notice}
        </p>
      )}
      <LoginForm />
    </AuthShell>
  );
}
