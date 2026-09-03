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
      eyebrow="Join Project Partner"
      title="Create your student account"
      description="Use your NSU email to get started."
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-bold text-dark underline decoration-accent decoration-2 underline-offset-4"
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
