import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
};

function AuthVisual() {
  return (
    <div
      className="relative grid min-h-full place-items-center overflow-hidden bg-dark p-10"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 440 520"
        fill="none"
        focusable="false"
        className="w-full max-w-md"
      >
        <path
          d="M58 125C111 32 296 31 365 118C423 191 393 356 284 426C193 484 63 414 51 291"
          stroke="var(--pp-background)"
          strokeWidth="3"
          strokeDasharray="9 12"
          strokeLinecap="round"
        />
        <path
          d="M82 337C133 401 282 418 361 322"
          stroke="var(--pp-accent)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <circle
          cx="91"
          cy="178"
          r="46"
          fill="var(--pp-accent)"
          stroke="var(--pp-background)"
          strokeWidth="3"
        />
        <circle cx="91" cy="164" r="13" fill="var(--pp-dark)" />
        <path
          d="M65 205C70 181 112 181 117 205"
          fill="var(--pp-background)"
          stroke="var(--pp-dark)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <circle
          cx="356"
          cy="172"
          r="46"
          fill="var(--pp-background)"
          stroke="var(--pp-accent)"
          strokeWidth="3"
        />
        <circle cx="356" cy="158" r="13" fill="var(--pp-dark)" />
        <path
          d="M330 199C335 175 377 175 382 199"
          fill="var(--pp-accent)"
          stroke="var(--pp-dark)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <path
          d="M130 197L169 224M317 195L278 224"
          stroke="var(--pp-background)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle
          cx="171"
          cy="225"
          r="8"
          fill="var(--pp-accent)"
          stroke="var(--pp-background)"
          strokeWidth="3"
        />
        <circle
          cx="277"
          cy="225"
          r="8"
          fill="var(--pp-accent)"
          stroke="var(--pp-background)"
          strokeWidth="3"
        />

        <rect
          x="150"
          y="218"
          width="148"
          height="128"
          rx="26"
          fill="var(--pp-dark)"
          stroke="var(--pp-background)"
          strokeWidth="3"
        />
        <rect
          x="165"
          y="237"
          width="118"
          height="40"
          rx="11"
          fill="var(--pp-accent)"
        />
        <text
          x="224"
          y="262"
          textAnchor="middle"
          fill="var(--pp-dark)"
          fontSize="15"
          fontWeight="800"
          letterSpacing="1.2"
        >
          TEAM SPACE
        </text>
        <path
          d="M182 307H266M194 324H254"
          stroke="var(--pp-background)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <path
          d="M56 61L63 80L82 87L63 94L56 113L49 94L30 87L49 80L56 61Z"
          fill="var(--pp-accent)"
        />
        <path
          d="M375 359L382 378L401 385L382 392L375 411L368 392L349 385L368 378L375 359Z"
          fill="var(--pp-background)"
        />
        <circle
          cx="116"
          cy="404"
          r="13"
          fill="var(--pp-background)"
          stroke="var(--pp-accent)"
          strokeWidth="3"
        />
        <circle cx="339" cy="91" r="9" fill="var(--pp-accent)" />
      </svg>

      <p className="absolute bottom-10 left-10 right-10 text-center text-sm font-black uppercase tracking-[0.2em] text-accent">
        Find · Connect · Build
      </p>
    </div>
  );
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-white px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-base font-black tracking-tight sm:text-lg"
          >
            <span className="grid size-9 place-items-center rounded-full border-2 border-dark bg-accent text-sm">
              PP
            </span>
            Project Partner
          </Link>
          <Link
            href="/"
            className="text-sm font-semibold underline decoration-accent decoration-2 underline-offset-4 hover:decoration-dark"
          >
            Back to home
          </Link>
        </header>

        <section className="mt-8 grid overflow-hidden rounded-feature border-2 border-dark bg-surface shadow-card lg:grid-cols-[1.08fr_0.92fr]">
          <div className="p-6 sm:p-10 lg:p-12">
            <div className="mb-8">
              <p className="inline-block rounded-control bg-accent px-3 py-1 text-sm font-black">
                {eyebrow}
              </p>
              <h1 className="mt-5 max-w-xl text-4xl font-black leading-[1.05] tracking-[-0.035em] sm:text-5xl">
                {title}
              </h1>
              <p className="mt-4 max-w-lg text-base leading-7 text-muted sm:text-lg">
                {description}
              </p>
            </div>

            {children}

            <div className="mt-8 border-t-2 border-dark pt-6 text-sm text-muted">
              {footer}
            </div>
          </div>

          <div className="hidden lg:block">
            <AuthVisual />
          </div>
        </section>
      </div>
    </main>
  );
}
