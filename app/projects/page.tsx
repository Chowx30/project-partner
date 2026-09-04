import Link from "next/link";

import { PostTypeBadge } from "@/app/projects/post-type-badge";
import { AppHeader } from "@/src/components/app-header";
import { EmptyState } from "@/src/components/empty-state";
import { PaginationNav } from "@/src/components/pagination-nav";
import { Button, ButtonLink } from "@/src/components/ui/button";
import {
  inputStyles,
  labelStyles,
  selectStyles,
} from "@/src/components/ui/form-controls";
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
  const { user } = await requireCompletedProfile();

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
    <div className="min-h-screen bg-background px-4 sm:px-6">
      <AppHeader profileId={user.id} activeItem="projects" />

      <main className="mx-auto max-w-app pb-16 pt-8 sm:pb-20 sm:pt-12">
        <section aria-labelledby="projects-heading">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-block rounded-control bg-accent px-3 py-1 text-sm font-black text-dark">
                Find your team
              </p>
              <h1
                id="projects-heading"
                className="mt-4 text-4xl font-black leading-tight tracking-[-0.035em] text-dark sm:text-5xl"
              >
                Browse Projects
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted sm:text-lg">
                Find project and lab partner opportunities by course and post
                type.
              </p>
            </div>
            <ButtonLink
              href="/projects/new"
              variant="accent"
              featured
              className="w-full shrink-0 sm:w-auto"
            >
              Create Project
            </ButtonLink>
          </div>

          <form
            action="/projects"
            method="get"
            className="mt-8 grid gap-5 rounded-feature border-2 border-dark bg-surface p-5 sm:grid-cols-2 sm:p-6 lg:grid-cols-[minmax(14rem,1.5fr)_minmax(12rem,1fr)_minmax(9rem,0.65fr)_auto] lg:items-end"
          >
            <div>
              <label htmlFor="q" className={labelStyles}>
                Search
              </label>
              <input
                id="q"
                name="q"
                type="search"
                defaultValue={searchQuery}
                maxLength={PROJECT_SEARCH_MAX_LENGTH}
                placeholder="Search title or description"
                className={`${inputStyles} mt-2`}
              />
            </div>

            <div>
              <label htmlFor="course" className={labelStyles}>
                Course
              </label>
              <select
                id="course"
                name="course"
                defaultValue={courseFilter}
                className={`${selectStyles} mt-2`}
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
              <label htmlFor="type" className={labelStyles}>
                Type
              </label>
              <select
                id="type"
                name="type"
                defaultValue={typeFilter}
                className={`${selectStyles} mt-2`}
              >
                <option value="">All types</option>
                <option value="project">Project</option>
                <option value="lab">Lab</option>
              </select>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end lg:flex-col">
              <Button type="submit" variant="primary" className="w-full">
                Apply Filters
              </Button>
              {hasFilters && (
                <ButtonLink
                  href="/projects"
                  variant="ghost"
                  className="w-full whitespace-nowrap"
                >
                  Clear Filters
                </ButtonLink>
              )}
            </div>
          </form>
        </section>

        <section className="mt-12" aria-labelledby="project-results-heading">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-muted">
                Open opportunities
              </p>
              <h2
                id="project-results-heading"
                className="mt-2 text-2xl font-black tracking-tight text-dark sm:text-3xl"
              >
                Project requests
              </h2>
            </div>
            {hasFilters && (
              <span className="hidden rounded-full border-2 border-dark bg-white px-3 py-1 text-xs font-bold text-dark sm:inline-flex">
                Filtered results
              </span>
            )}
          </div>

          {projects.length === 0 ? (
            <EmptyState
              title="No projects found"
              description={
                hasFilters
                  ? "Try changing your filters or browse all projects."
                  : "There are no open partner requests right now."
              }
              action={
                hasFilters ? (
                  <ButtonLink href="/projects" variant="secondary">
                    Browse All Projects
                  </ButtonLink>
                ) : (
                  <ButtonLink href="/projects/new" variant="accent">
                    Create Project
                  </ButtonLink>
                )
              }
              align="center"
              className="mt-7 bg-white py-12 sm:py-14"
            />
          ) : (
            <ul className="mt-7 grid gap-6 md:grid-cols-2">
              {projects.map((project, index) => {
                const course = coursesById.get(project.course_id);
                const owner = ownersById.get(project.owner_id);
                const cardVariant =
                  index % 3 === 0
                    ? "bg-surface"
                    : index % 3 === 1
                      ? "bg-white"
                      : "bg-white shadow-card";

                return (
                  <li
                    key={project.id}
                    className={`relative flex flex-col overflow-hidden rounded-feature border-2 border-dark ${cardVariant}`}
                  >
                    {index % 3 === 2 && (
                      <div
                        aria-hidden="true"
                        className="h-2 border-b-2 border-dark bg-accent"
                      />
                    )}
                    <article className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex rounded-full border-2 border-dark bg-accent px-2.5 py-1 text-xs font-bold text-dark">
                            {course?.course_code ?? "Course unavailable"}
                          </span>
                          <PostTypeBadge postType={project.post_type} />
                        </div>
                        <time
                          dateTime={project.created_at}
                          className="pt-1 text-xs font-semibold text-muted"
                        >
                          {formatProjectDate(project.created_at)}
                        </time>
                      </div>

                      <h3 className="mt-5 text-xl font-black leading-snug tracking-tight text-dark sm:text-2xl">
                        {project.title}
                      </h3>

                      <div className="mt-6 grid gap-4 border-t-2 border-dark pt-5 text-sm sm:grid-cols-[1fr_auto] sm:items-end">
                        <div className="min-w-0">
                          <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">
                            Posted by
                          </p>
                          {owner ? (
                            <Link
                              href={`/profile/${owner.id}`}
                              className="mt-1 inline-flex min-h-11 max-w-full items-center font-bold text-dark underline decoration-accent decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark"
                            >
                              <span className="truncate">{owner.full_name}</span>
                            </Link>
                          ) : (
                            <p className="mt-2 font-bold text-dark">Student</p>
                          )}
                          <p className="text-muted">
                            {owner?.department ?? "Department unavailable"}
                          </p>
                        </div>
                        <p className="font-semibold text-dark sm:text-right">
                          <span className="block text-2xl font-black leading-none">
                            {project.members_needed}
                          </span>
                          {project.members_needed === 1 ? "member" : "members"}{" "}
                          needed
                        </p>
                      </div>

                      <Link
                        href={`/projects/${project.id}`}
                        className="mt-auto inline-flex min-h-11 w-fit items-center pt-6 font-bold text-dark underline decoration-accent decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark"
                      >
                        View Project <span aria-hidden="true">→</span>
                      </Link>
                    </article>
                  </li>
                );
              })}
            </ul>
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
        </section>
      </main>
    </div>
  );
}
