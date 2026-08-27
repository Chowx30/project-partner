import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthShell } from "@/app/auth/auth-shell";
import { SignupForm } from "@/app/auth/signup-form";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

export default async function SignupPage() {
  if (await getAuthenticatedUser()) {
    redirect("/dashboard");
  }

  return (
    <AuthShell
      title="Create your account"
      description="Use your North South University email to join Project Partner."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-zinc-950 underline underline-offset-4 dark:text-white"
          >
            Log in
          </Link>
        </>
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
