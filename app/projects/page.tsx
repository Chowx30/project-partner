import Link from "next/link";

import { PostTypeBadge } from "@/app/projects/post-type-badge";
import { ProjectsHeader } from "@/app/projects/projects-header";
import { PaginationNav } from "@/src/components/pagination-nav";
import {
  getPageOffset,
  parsePage,
  PROJECTS_PAGE_SIZE,
  slicePageResults,
} from "@/src/lib/pagination";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import type { CourseOption } from "@/src/lib/profile/data";
import { isUuid } from "@/src/lib/profile/validation";
import {
  buildProjectSearchFilter,
  formatProjectDate,
  isProjectPostType,
  PROJECT_SEARCH_MAX_LENGTH,
  type ProjectPostType,
} from "@/src/lib/projects/validation";
import { createClient } from "@/src/lib/supabase/server";

type ProjectListRow = {
  id: string;
  owner_id: string;
  course_id: string;
  title: string;
  members_needed: number;
  post_type: ProjectPostType;
  created_at: string;
};

type OwnerSummary = {
  id: string;
  full_name: string;
  department: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

function firstSearchParam(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireCompletedProfile();

  const params = await searchParams;
  const currentPage = parsePage(params.page);
  const pageOffset = getPageOffset(currentPage, PROJECTS_PAGE_SIZE);
  const requestedType = firstSearchParam(params.type).trim().toLowerCase();
  const typeFilter = isProjectPostType(requestedType) ? requestedType : "";
  const requestedCourse = firstSearchParam(params.course).trim();
  const searchQuery = firstSearchParam(params.q)
    .trim()
    .slice(0, PROJECT_SEARCH_MAX_LENGTH);
  const supabase = await createClient();
  const coursesResult = await supabase
    .from("courses")
    .select("id, course_code, course_name")
    .order("course_code");

  if (coursesResult.error) {
    throw new Error("Unable to load project filters.");
  }

  const courses = coursesResult.data as CourseOption[];
  const courseFilter =
    isUuid(requestedCourse) &&
    courses.some((course) => course.id === requestedCourse)
      ? requestedCourse
      : "";
  let projectsQuery = supabase
    .from("projects")
    .select(
      "id, owner_id, course_id, title, members_needed, post_type, created_at",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });

  if (typeFilter) {
    projectsQuery = projectsQuery.eq("post_type", typeFilter);
  }

  if (courseFilter) {
    projectsQuery = projectsQuery.eq("course_id", courseFilter);
  }

  if (searchQuery) {
    projectsQuery = projectsQuery.or(buildProjectSearchFilter(searchQuery));
  }

  const projectsResult = await projectsQuery.range(
    pageOffset,
    pageOffset + PROJECTS_PAGE_SIZE,
  );

  if (projectsResult.error) {
    throw new Error("Unable to load partner posts.");
  }

  const { items: projects, hasNext } = slicePageResults(
    projectsResult.data as ProjectListRow[],
    PROJECTS_PAGE_SIZE,
  );
  const ownerIds = [...new Set(projects.map((project) => project.owner_id))];
  const profilesResult =
    ownerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, department")
          .in("id", ownerIds)
      : { data: [] as OwnerSummary[], error: null };

  if (profilesResult.error) {
    throw new Error("Unable to load post owners.");
  }

  const coursesById = new Map(courses.map((course) => [course.id, course]));
  const ownersById = new Map(
    (profilesResult.data as OwnerSummary[]).map((profile) => [
      profile.id,
      profile,
    ]),
  );
  const hasFilters = Boolean(typeFilter || courseFilter || searchQuery);

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <ProjectsHeader />

        <div className="py-10 sm:py-14">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Find your team
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
                Partner posts
              </h1>
              <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
                Browse open project and lab partner requests.
              </p>
            </div>
            <Link
              href="/projects/new"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Create a partner post
            </Link>
          </div>

          <form
            action="/projects"
            method="get"
            className="mt-8 grid gap-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-[0.8fr_1.2fr_2fr_auto] dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <label
                htmlFor="type"
                className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Type
              </label>
              <select
                id="type"
                name="type"
                defaultValue={typeFilter}
                className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              >
                <option value="">All</option>
                <option value="project">Project</option>
                <option value="lab">Lab</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="course"
                className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Course
              </label>
              <select
                id="course"
                name="course"
                defaultValue={courseFilter}
                className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              >
                <option value="">All courses</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.course_code} — {course.course_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="q"
                className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
              >
                Search
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={searchQuery}
                maxLength={PROJECT_SEARCH_MAX_LENGTH}
                placeholder="Search title or description"
                className="mt-2 h-11 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white"
              />
            </div>

            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="h-11 flex-1 rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Filter
              </button>
              {hasFilters && (
                <Link
                  href="/projects"
                  className="inline-flex h-11 items-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Clear
                </Link>
              )}
            </div>
          </form>

          {projects.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                No partner requests found.
              </p>
              <Link
                href="/projects/new"
                className="mt-4 inline-flex text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
              >
                Create a partner post
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              {projects.map((project) => {
                const course = coursesById.get(project.course_id);
                const owner = ownersById.get(project.owner_id);

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="group rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-600"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <PostTypeBadge postType={project.post_type} />
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {formatProjectDate(project.created_at)}
                      </span>
                    </div>
                    <h2 className="mt-4 text-lg font-semibold leading-6 text-zinc-950 group-hover:underline dark:text-white">
                      {project.title}
                    </h2>
                    <p className="mt-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {course?.course_code ?? "Course unavailable"}
                    </p>
                    <div className="mt-5 flex items-end justify-between gap-4 border-t border-zinc-100 pt-4 text-sm dark:border-zinc-800">
                      <div>
                        <p className="font-medium text-zinc-800 dark:text-zinc-200">
                          {owner?.full_name ?? "Student"}
                        </p>
                        <p className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                          {owner?.department ?? "Department unavailable"}
                        </p>
                      </div>
                      <p className="text-right text-zinc-600 dark:text-zinc-400">
                        {project.members_needed} {project.members_needed === 1 ? "member" : "members"} needed
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {(currentPage > 1 || hasNext) && (
            <PaginationNav
              pathname="/projects"
              currentPage={currentPage}
              hasNext={hasNext}
              searchParams={params}
              pageParamName="page"
            />
          )}
        </div>
      </div>
    </main>
  );
}
