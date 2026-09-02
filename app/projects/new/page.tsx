import Link from "next/link";

import { ProjectForm } from "@/app/projects/new/project-form";
import { AppHeader } from "@/src/components/app-header";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import type { CourseOption } from "@/src/lib/profile/data";
import { createClient } from "@/src/lib/supabase/server";

export default async function NewProjectPage() {
  const { user } = await requireCompletedProfile();

  const supabase = await createClient();
  const coursesResult = await supabase
    .from("courses")
    .select("id, course_code, course_name")
    .order("course_code");

  if (coursesResult.error) {
    throw new Error("Unable to load the course catalog.");
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 dark:bg-zinc-950">
      <AppHeader profileId={user.id} activeItem="projects" />

      <div className="mx-auto max-w-3xl">
        <div className="py-10 sm:py-14">
          <Link
            href="/projects"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            ← Back to partner posts
          </Link>
          <div className="mt-6">
            <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
              Partner request
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              Create a partner post
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Share what you are working on and the kind of teammate you need.
            </p>
          </div>

          <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-7 dark:border-zinc-800 dark:bg-zinc-900">
            <ProjectForm courses={coursesResult.data as CourseOption[]} />
          </section>
        </div>
      </div>
    </main>
  );
}
