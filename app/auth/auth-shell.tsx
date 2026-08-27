import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-8 block text-center text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100"
        >
          Project Partner
        </Link>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="mb-7">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              {description}
            </p>
          </div>

          {children}

          <div className="mt-7 border-t border-zinc-200 pt-5 text-center text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
