import Link from "next/link";
import { redirect } from "next/navigation";

import { logoutAction } from "@/app/auth/actions";
import { getAuthenticatedUser } from "@/src/lib/auth/session";
import {
  type CourseOption,
  getOnboardingSnapshot,
  type SkillOption,
} from "@/src/lib/profile/data";
import { createClient } from "@/src/lib/supabase/server";

export default async function DashboardPage() {
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  let snapshot;

  try {
    snapshot = await getOnboardingSnapshot(user.id);
  } catch {
    throw new Error("Unable to load dashboard profile data.");
  }

  if (!snapshot.isComplete || !snapshot.profile) {
    redirect("/onboarding");
  }

  const supabase = await createClient();
  const [coursesResult, skillsResult] = await Promise.all([
    supabase
      .from("courses")
      .select("id, course_code, course_name")
      .in("id", snapshot.courseIds)
      .order("course_code"),
    supabase
      .from("skills")
      .select("id, name")
      .in("id", snapshot.skillIds)
      .order("name"),
  ]);

  if (coursesResult.error || skillsResult.error) {
    throw new Error("Unable to load dashboard selections.");
  }

  const courses = coursesResult.data as CourseOption[];
  const skills = skillsResult.data as SkillOption[];

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

        <section className="py-12 sm:py-16">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Dashboard
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
            Welcome, {snapshot.profile.full_name}
          </h1>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            {snapshot.profile.department} · {user.email}
          </p>

          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Current courses
              </h2>
              <ul className="mt-4 space-y-3">
                {courses.map((course) => (
                  <li key={course.id} className="text-sm">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {course.course_code}
                    </span>
                    <span className="mt-0.5 block text-zinc-500 dark:text-zinc-400">
                      {course.course_name}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-white">
                Skills
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <li
                    key={skill.id}
                    className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {skill.name}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
