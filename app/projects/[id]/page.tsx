import Link from "next/link";
import { notFound } from "next/navigation";

import { PostTypeBadge } from "@/app/projects/post-type-badge";
import { ProjectsHeader } from "@/app/projects/projects-header";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import type { CourseOption, ProfileRecord } from "@/src/lib/profile/data";
import { isUuid } from "@/src/lib/profile/validation";
import {
  formatProjectDate,
  type ProjectPostType,
} from "@/src/lib/projects/validation";
import { createClient } from "@/src/lib/supabase/server";

type ProjectDetail = {
  id: string;
  owner_id: string;
  course_id: string;
  title: string;
  short_description: string;
  members_needed: number;
  post_type: ProjectPostType;
  status: "open" | "closed" | "completed" | "cancelled";
  created_at: string;
};

type OwnerProfile = Pick<
  ProfileRecord,
  "full_name" | "department" | "graduation_year"
>;

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireCompletedProfile();
  const { id } = await params;

  if (!isUuid(id)) {
    notFound();
  }

  const supabase = await createClient();
  const projectResult = await supabase
    .from("projects")
    .select(
      "id, owner_id, course_id, title, short_description, members_needed, post_type, status, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (projectResult.error) {
    throw new Error("Unable to load this partner post.");
  }

  if (!projectResult.data) {
    notFound();
  }

  const project = projectResult.data as ProjectDetail;
  const [courseResult, ownerResult] = await Promise.all([
    supabase
      .from("courses")
      .select("id, course_code, course_name")
      .eq("id", project.course_id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("full_name, department, graduation_year")
      .eq("id", project.owner_id)
      .maybeSingle(),
  ]);

  if (courseResult.error || ownerResult.error) {
    throw new Error("Unable to load partner post details.");
  }

  if (!courseResult.data || !ownerResult.data) {
    notFound();
  }

  const course = courseResult.data as CourseOption;
  const owner = ownerResult.data as OwnerProfile;
  const isOwner = project.owner_id === user.id;
  const statusLabel =
    project.status.charAt(0).toUpperCase() + project.status.slice(1);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-4xl">
        <ProjectsHeader />

        <article className="py-10 sm:py-14">
          <Link
            href="/projects"
            className="text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white"
          >
            ← Back to partner posts
          </Link>

          <div className="mt-7 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center gap-3">
              <PostTypeBadge postType={project.post_type} />
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                {statusLabel}
              </span>
              {isOwner && (
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Your post
                </span>
              )}
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
              {project.title}
            </h1>
            <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {course.course_code} · {course.course_name}
            </p>
            <p className="mt-6 whitespace-pre-wrap text-base leading-7 text-zinc-700 dark:text-zinc-300">
              {project.short_description}
            </p>

            <dl className="mt-8 grid gap-5 border-t border-zinc-200 pt-6 sm:grid-cols-2 dark:border-zinc-800">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Members needed
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {project.members_needed}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Created
                </dt>
                <dd className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {formatProjectDate(project.created_at)}
                </dd>
              </div>
            </dl>
          </div>

          <section className="mt-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Posted by
            </p>
            <h2 className="mt-2 text-lg font-semibold text-zinc-950 dark:text-white">
              {owner.full_name}
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {owner.department}
              {owner.graduation_year
                ? ` · Graduating ${owner.graduation_year}`
                : ""}
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
