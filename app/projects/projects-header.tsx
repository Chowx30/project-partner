import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";

export function ProjectsHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 pb-5 dark:border-zinc-800">
      <Link
        href="/dashboard"
        className="text-sm font-semibold tracking-wide text-zinc-950 dark:text-white"
      >
        Project Partner
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/applications"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
        >
          My Applications
        </Link>
        <Link
          href="/projects"
          className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-white hover:text-zinc-950 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-white"
        >
          Browse
        </Link>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
          >
            Log out
          </button>
        </form>
      </div>
    </header>
  );
}
