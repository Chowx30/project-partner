import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

export default async function Home() {
  const user = await getAuthenticatedUser();

  return (
    <main className="min-h-screen bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col">
        <header className="flex items-center justify-between border-b border-zinc-200 py-5 dark:border-zinc-800">
          <span className="text-sm font-semibold tracking-wide text-zinc-950 dark:text-white">
            Project Partner
          </span>

          <nav aria-label="Account" className="flex items-center gap-2">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Dashboard
                </Link>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  >
                    Log out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Create account
                </Link>
              </>
            )}
          </nav>
        </header>

        <section className="flex flex-1 items-center py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Built for NSU students
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl dark:text-white">
              Find the right partner for your next project.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600 dark:text-zinc-400">
              Connect with classmates for course projects, labs, and capstone teams.
            </p>

            {!user && (
              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="rounded-lg bg-zinc-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                >
                  Create account
                </Link>
                <Link
                  href="/login"
                  className="rounded-lg border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 transition hover:bg-white dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
                >
                  Log in
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
