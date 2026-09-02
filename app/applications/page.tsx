import Link from "next/link";

import { WithdrawButton } from "@/app/applications/withdraw-button";
import { PostTypeBadge } from "@/app/projects/post-type-badge";
import { AppHeader } from "@/src/components/app-header";
import { PaginationNav } from "@/src/components/pagination-nav";
import {
  APPLICATIONS_PAGE_SIZE,
  getPageOffset,
  parsePage,
  slicePageResults,
} from "@/src/lib/pagination";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import type { CourseOption } from "@/src/lib/profile/data";
import {
  formatProjectDate,
  type ProjectPostType,
} from "@/src/lib/projects/validation";
import { createClient } from "@/src/lib/supabase/server";

type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";

type ApplicationRow = {
  id: string;
  project_id: string;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
};

type ProjectSummary = {
  id: string;
  owner_id: string;
  course_id: string;
  title: string;
  post_type: ProjectPostType;
};

type OwnerSummary = {
  id: string;
  full_name: string;
  department: string;
};

type ApplicationDetails = ApplicationRow & {
  project: ProjectSummary;
  course: CourseOption;
  owner: OwnerSummary;
};

type SearchParams = Record<string, string | string[] | undefined>;

const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const APPLICATION_STATUS_CLASSES: Record<ApplicationStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  accepted:
    "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  withdrawn: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
};

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireCompletedProfile();
  const params = await searchParams;
  const currentPage = parsePage(params.page);
  const pageOffset = getPageOffset(currentPage, APPLICATIONS_PAGE_SIZE);
  const supabase = await createClient();
  const applicationsResult = await supabase
    .from("applications")
    .select("id, project_id, message, status, created_at")
    .eq("applicant_id", user.id)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(pageOffset, pageOffset + APPLICATIONS_PAGE_SIZE);

  if (applicationsResult.error) {
    throw new Error("Unable to load your applications.");
  }

  const { items: applications, hasNext } = slicePageResults(
    applicationsResult.data as ApplicationRow[],
    APPLICATIONS_PAGE_SIZE,
  );
  let applicationDetails: ApplicationDetails[] = [];

  if (applications.length > 0) {
    const projectIds = [...new Set(applications.map((row) => row.project_id))];
    const projectsResult = await supabase
      .from("projects")
      .select("id, owner_id, course_id, title, post_type")
      .in("id", projectIds);

    if (projectsResult.error) {
      throw new Error("Unable to load application projects.");
    }

    const projects = projectsResult.data as ProjectSummary[];
    const ownerIds = [...new Set(projects.map((project) => project.owner_id))];
    const courseIds = [
      ...new Set(projects.map((project) => project.course_id)),
    ];
    const [ownersResult, coursesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, department")
        .in("id", ownerIds),
      supabase
        .from("courses")
        .select("id, course_code, course_name")
        .in("id", courseIds),
    ]);

    if (ownersResult.error || coursesResult.error) {
      throw new Error("Unable to load application details.");
    }

    const projectById = new Map(projects.map((project) => [project.id, project]));
    const ownerById = new Map(
      (ownersResult.data as OwnerSummary[]).map((owner) => [owner.id, owner]),
    );
    const courseById = new Map(
      (coursesResult.data as CourseOption[]).map((course) => [course.id, course]),
    );

    applicationDetails = applications.map((application) => {
      const project = projectById.get(application.project_id);
      const owner = project ? ownerById.get(project.owner_id) : undefined;
      const course = project ? courseById.get(project.course_id) : undefined;

      if (!project || !owner || !course) {
        throw new Error("Unable to load an application.");
      }

      return { ...application, project, owner, course };
    });
  }

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 dark:bg-zinc-950">
      <AppHeader profileId={user.id} activeItem="applications" />

      <div className="mx-auto max-w-5xl">
        <section className="py-10 sm:py-14">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            Your activity
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 dark:text-white">
            My Applications
          </h1>
          <p className="mt-3 text-base text-zinc-600 dark:text-zinc-400">
            Track your project and lab partner requests.
          </p>

          {applicationDetails.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-zinc-300 bg-white px-5 py-14 text-center dark:border-zinc-700 dark:bg-zinc-900">
              <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                You haven&apos;t applied to any projects yet.
              </p>
              <Link
                href="/projects"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Browse partner posts
              </Link>
            </div>
          ) : (
            <ul className="mt-8 space-y-5">
              {applicationDetails.map((application) => (
                <li
                  key={application.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <PostTypeBadge postType={application.project.post_type} />
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${APPLICATION_STATUS_CLASSES[application.status]}`}
                    >
                      {APPLICATION_STATUS_LABELS[application.status]}
                    </span>
                  </div>

                  <h2 className="mt-4 text-xl font-semibold text-zinc-950 dark:text-white">
                    {application.project.title}
                  </h2>
                  <p className="mt-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {application.course.course_code} —{" "}
                    {application.course.course_name}
                  </p>
                  <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                    Owner: {application.owner.full_name} ·{" "}
                    {application.owner.department}
                  </p>

                  {application.message && (
                    <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                      <p className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                        Message
                      </p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {application.message}
                      </p>
                    </div>
                  )}

                  <p className="mt-5 text-xs text-zinc-500 dark:text-zinc-400">
                    Applied {formatProjectDate(application.created_at)}
                  </p>

                  <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-start">
                    <Link
                      href={`/projects/${application.project_id}`}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                    >
                      View Project
                    </Link>
                    {application.status === "pending" && (
                      <WithdrawButton applicationId={application.id} />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {(currentPage > 1 || hasNext) && (
            <PaginationNav
              pathname="/applications"
              currentPage={currentPage}
              hasNext={hasNext}
              searchParams={params}
              pageParamName="page"
            />
          )}
        </section>
      </div>
    </main>
  );
}
