import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";
import { HeroVisual } from "@/src/components/landing/hero-visual";
import { Button, ButtonLink } from "@/src/components/ui/button";
import { getAuthenticatedUser } from "@/src/lib/auth/session";

const contextLabels = [
  "CSE",
  "EEE",
  "Lab partners",
  "Course projects",
  "Capstone teams",
  "Skill matching",
];

const howItWorks = [
  {
    number: "01",
    title: "Build your profile",
    description: "Add your courses, skills, and academic information.",
    className: "bg-surface text-dark shadow-card",
  },
  {
    number: "02",
    title: "Find opportunities",
    description: "Browse project and lab partner posts.",
    className: "bg-accent text-dark",
  },
  {
    number: "03",
    title: "Apply to join",
    description: "Send an application to a team that fits.",
    className: "bg-dark text-white",
  },
  {
    number: "04",
    title: "Build the team",
    description: "Owners review applicants and form the project team.",
    className: "bg-white text-dark shadow-card",
  },
];

function LandingHeader({ isAuthenticated }: { isAuthenticated: boolean }) {
  return (
    <header className="border-b-2 border-dark bg-white">
      <div className="mx-auto flex min-h-20 max-w-app items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-base font-black tracking-tight sm:text-lg"
        >
          <span className="grid size-9 place-items-center rounded-full border-2 border-dark bg-accent text-sm">
            PP
          </span>
          <span className="hidden min-[390px]:inline">Project Partner</span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden items-center gap-7 lg:flex"
        >
          <Link
            href="#how-it-works"
            className="font-medium underline-offset-4 hover:underline"
          >
            How It Works
          </Link>
          <Link
            href="/projects"
            className="font-medium underline-offset-4 hover:underline"
          >
            Projects
          </Link>
          {isAuthenticated ? (
            <>
              <ButtonLink href="/dashboard" variant="accent" featured>
                Dashboard
              </ButtonLink>
              <form action={logoutAction}>
                <Button type="submit" variant="ghost">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="secondary">
                Log In
              </ButtonLink>
              <ButtonLink href="/signup" variant="accent" featured>
                Get Started
              </ButtonLink>
            </>
          )}
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <ButtonLink
            href={isAuthenticated ? "/dashboard" : "/signup"}
            variant="accent"
            className="px-3 sm:px-4"
          >
            {isAuthenticated ? "Dashboard" : "Get Started"}
          </ButtonLink>

          <details className="relative">
            <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-control border-2 border-dark bg-white px-3 text-sm font-semibold marker:hidden hover:bg-surface">
              Menu
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-48 rounded-card border-2 border-dark bg-white p-2 shadow-card">
              <Link
                href="#how-it-works"
                className="block rounded-control px-3 py-2.5 font-medium hover:bg-surface"
              >
                How It Works
              </Link>
              <Link
                href="/projects"
                className="block rounded-control px-3 py-2.5 font-medium hover:bg-surface"
              >
                Projects
              </Link>
              {isAuthenticated ? (
                <form action={logoutAction}>
                  <Button
                    type="submit"
                    variant="ghost"
                    className="w-full justify-start px-3"
                  >
                    Log out
                  </Button>
                </form>
              ) : (
                <Link
                  href="/login"
                  className="block rounded-control px-3 py-2.5 font-medium hover:bg-surface"
                >
                  Log In
                </Link>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

function WhyVisual() {
  return (
    <div className="relative grid min-h-64 place-items-center overflow-hidden bg-dark p-8">
      <svg
        viewBox="0 0 360 260"
        fill="none"
        className="w-full max-w-sm"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M42 177C89 238 258 245 316 154C356 91 287 28 210 52C136 75 139 141 73 144"
          stroke="var(--pp-background)"
          strokeWidth="3"
          strokeDasharray="8 10"
          strokeLinecap="round"
        />
        <circle
          cx="70"
          cy="145"
          r="35"
          fill="var(--pp-accent)"
          stroke="var(--pp-background)"
          strokeWidth="3"
        />
        <circle
          cx="286"
          cy="91"
          r="35"
          fill="var(--pp-background)"
          stroke="var(--pp-accent)"
          strokeWidth="3"
        />
        <rect
          x="122"
          y="92"
          width="122"
          height="88"
          rx="22"
          fill="var(--pp-accent)"
          stroke="var(--pp-background)"
          strokeWidth="3"
        />
        <circle cx="159" cy="128" r="13" fill="var(--pp-dark)" />
        <circle
          cx="205"
          cy="128"
          r="13"
          fill="var(--pp-background)"
          stroke="var(--pp-dark)"
          strokeWidth="3"
        />
        <path
          d="M172 128H192M143 156H222"
          stroke="var(--pp-dark)"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M41 51L48 69L66 76L48 83L41 101L34 83L16 76L34 69L41 51Z"
          fill="var(--pp-accent)"
        />
        <path
          d="M316 181L321 194L334 199L321 204L316 217L311 204L298 199L311 194L316 181Z"
          fill="var(--pp-background)"
        />
      </svg>
    </div>
  );
}

export default async function Home() {
  const user = await getAuthenticatedUser();
  const isAuthenticated = Boolean(user);

  return (
    <div className="min-h-screen overflow-x-clip bg-background text-dark">
      <LandingHeader isAuthenticated={isAuthenticated} />

      <main>
        <section className="mx-auto grid max-w-app items-center gap-10 px-4 pb-14 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:py-20">
          <div>
            <p className="inline-flex rounded-full border-2 border-dark bg-surface px-4 py-2 text-xs font-black uppercase tracking-[0.16em] sm:text-sm">
              Built for NSU students
            </p>
            <h1 className="mt-6 text-5xl font-black leading-[0.94] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              <span className="block">Find the</span>
              <span className="my-2 inline-block rounded-control bg-accent px-2 py-1">
                right partner
              </span>
              <span className="block">for your next</span>
              <span className="block">project.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-muted">
              Connect with classmates for course projects, labs, and team-based
              work based on courses, skills, and project needs.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink
                href="/projects"
                variant="primary"
                featured
                className="w-full sm:w-auto"
              >
                Browse Projects
              </ButtonLink>
              <ButtonLink
                href={isAuthenticated ? "/dashboard" : "/signup"}
                variant="secondary"
                className="w-full sm:w-auto"
              >
                {isAuthenticated ? "Dashboard" : "Get Started"}
              </ButtonLink>
            </div>
          </div>

          <HeroVisual />
        </section>

        <section
          aria-labelledby="contexts-heading"
          className="border-y-2 border-dark bg-surface"
        >
          <h2 id="contexts-heading" className="sr-only">
            Ways to find a partner
          </h2>
          <ul className="mx-auto flex max-w-app flex-wrap items-center justify-center gap-x-5 gap-y-3 px-4 py-6 sm:justify-between sm:px-6">
            {contextLabels.map((label, index) => (
              <li
                key={label}
                className="flex items-center gap-3 text-sm font-black uppercase tracking-[0.12em] sm:text-base"
              >
                {index > 0 && (
                  <span className="size-2 rotate-45 bg-dark" aria-hidden="true" />
                )}
                {label}
              </li>
            ))}
          </ul>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-app scroll-mt-8 px-4 py-20 sm:px-6 sm:py-24"
        >
          <div className="grid items-start gap-5 md:grid-cols-[auto_1fr] md:gap-10">
            <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
              <span className="inline-block rounded-control bg-accent px-3 py-1">
                How It Works
              </span>
            </h2>
            <p className="max-w-2xl text-lg leading-8 text-muted">
              Go from profile to project team with a focused workflow built for
              student collaboration.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {howItWorks.map((step) => (
              <article
                key={step.number}
                className={`min-h-64 rounded-feature border-2 border-dark p-7 sm:p-9 ${step.className}`}
              >
                <div className="flex items-start justify-between gap-6">
                  <span
                    className={`text-5xl font-black leading-none tracking-[-0.05em] ${
                      step.number === "03" ? "text-accent" : ""
                    }`}
                  >
                    {step.number}
                  </span>
                  <span
                    className={`mt-1 size-7 shrink-0 rounded-full border-2 ${
                      step.number === "03"
                        ? "border-accent bg-accent"
                        : "border-dark bg-dark"
                    }`}
                    aria-hidden="true"
                  />
                </div>
                <h3 className="mt-12 text-2xl font-black tracking-tight sm:text-3xl">
                  {step.title}
                </h3>
                <p
                  className={`mt-4 max-w-md leading-7 ${
                    step.number === "03" ? "text-white/75" : "text-muted"
                  }`}
                >
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-app px-4 pb-20 sm:px-6 sm:pb-24">
          <div className="grid overflow-hidden rounded-feature border-2 border-dark bg-surface shadow-card lg:grid-cols-[1.08fr_0.92fr]">
            <div className="p-7 sm:p-10 lg:p-12">
              <h2 className="max-w-xl text-3xl font-black tracking-tight sm:text-5xl">
                Find people who fit the work.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
                Reduce mismatch by finding students whose courses, skills, and
                project expectations align with the team you want to build.
              </p>
              <ButtonLink
                href="/projects"
                variant="primary"
                featured
                className="mt-8 w-full sm:w-auto"
              >
                Browse Projects
              </ButtonLink>
            </div>

            <WhyVisual />
          </div>
        </section>
      </main>

      <footer className="bg-dark text-white">
        <div className="mx-auto flex max-w-app flex-col gap-8 px-4 py-10 sm:px-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-lg font-black focus-visible:outline-accent"
            >
              <span className="grid size-9 place-items-center rounded-full border-2 border-accent bg-accent text-sm text-dark">
                PP
              </span>
              Project Partner
            </Link>
            <p className="mt-3 text-sm text-white/65">
              Built for student project collaboration.
            </p>
          </div>

          <nav
            aria-label="Footer navigation"
            className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold"
          >
            <Link
              href="/projects"
              className="underline-offset-4 hover:text-accent hover:underline focus-visible:outline-accent"
            >
              Browse Projects
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="underline-offset-4 hover:text-accent hover:underline focus-visible:outline-accent"
                >
                  Dashboard
                </Link>
                <Link
                  href="/applications"
                  className="underline-offset-4 hover:text-accent hover:underline focus-visible:outline-accent"
                >
                  Applications
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="underline-offset-4 hover:text-accent hover:underline focus-visible:outline-accent"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="underline-offset-4 hover:text-accent hover:underline focus-visible:outline-accent"
                >
                  Get Started
                </Link>
              </>
            )}
          </nav>
        </div>
      </footer>
    </div>
  );
}
