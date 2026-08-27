import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/auth/actions";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between border-b border-zinc-200 pb-5 dark:border-zinc-800">
          <Link
            href="/"
            className="text-sm font-semibold tracking-wide text-zinc-950 dark:text-white"
          >
            Project Partner
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
            >
              Log out
            </button>
          </form>
        </header>

        <section className="py-16 sm:py-24">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
            Welcome to Project Partner
          </h1>
          <p className="mt-4 text-base text-zinc-600 dark:text-zinc-400">
            Signed in as{" "}
            <span className="font-medium text-zinc-900 dark:text-zinc-100">
              {user.email}
            </span>
          </p>
        </section>
      </div>
    </main>
  );
}
