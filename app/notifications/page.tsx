import Link from "next/link";

import {
  MarkAllNotificationsReadButton,
  MarkNotificationReadButton,
} from "@/app/notifications/notification-actions";
import { ProjectsHeader } from "@/app/projects/projects-header";
import { PaginationNav } from "@/src/components/pagination-nav";
import {
  getPageOffset,
  NOTIFICATIONS_PAGE_SIZE,
  parsePage,
  slicePageResults,
} from "@/src/lib/pagination";
import { requireCompletedProfile } from "@/src/lib/profile/access";
import { createClient } from "@/src/lib/supabase/server";

type NotificationType =
  | "application_received"
  | "application_accepted"
  | "application_rejected"
  | "new_comment";

type NotificationRow = {
  id: string;
  actor_id: string | null;
  project_id: string | null;
  type: NotificationType;
  title: string;
  message: string;
  read_at: string | null;
  created_at: string;
};

type ActorProfile = {
  id: string;
  full_name: string;
  department: string;
};

type SearchParams = Record<string, string | string[] | undefined>;

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  application_received: "Application received",
  application_accepted: "Application accepted",
  application_rejected: "Application rejected",
  new_comment: "New comment",
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { user } = await requireCompletedProfile();
  const params = await searchParams;
  const currentPage = parsePage(params.page);
  const pageOffset = getPageOffset(currentPage, NOTIFICATIONS_PAGE_SIZE);
  const supabase = await createClient();
  const [notificationsResult, unreadCountResult] = await Promise.all([
    supabase
      .from("notifications")
      .select(
        "id, actor_id, project_id, type, title, message, read_at, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(pageOffset, pageOffset + NOTIFICATIONS_PAGE_SIZE),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null),
  ]);

  if (notificationsResult.error || unreadCountResult.error) {
    throw new Error("Unable to load notifications.");
  }

  const { items: notifications, hasNext } = slicePageResults(
    notificationsResult.data as NotificationRow[],
    NOTIFICATIONS_PAGE_SIZE,
  );
  const actorIds = [
    ...new Set(
      notifications
        .map((notification) => notification.actor_id)
        .filter((actorId): actorId is string => Boolean(actorId)),
    ),
  ];
  const actorsResult =
    actorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, department")
          .in("id", actorIds)
      : { data: [] as ActorProfile[], error: null };

  if (actorsResult.error) {
    throw new Error("Unable to load notification details.");
  }

  const actorById = new Map(
    (actorsResult.data as ActorProfile[]).map((actor) => [actor.id, actor]),
  );
  const unreadCount = unreadCountResult.count ?? 0;

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-6 sm:px-6 dark:bg-zinc-950">
      <div className="mx-auto max-w-5xl">
        <ProjectsHeader />

        <section className="py-10 sm:py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                Account activity
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
                Notifications
              </h1>
              <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                {unreadCount === 0
                  ? "You're all caught up."
                  : `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}.`}
              </p>
            </div>

            {unreadCount > 0 && <MarkAllNotificationsReadButton />}
          </div>

          {notifications.length === 0 ? (
            <section className="mt-8 rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                You don&apos;t have any notifications yet.
              </p>
              <div className="mt-4 flex flex-wrap gap-4">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                >
                  Back to dashboard
                </Link>
                <Link
                  href="/projects"
                  className="text-sm font-medium text-zinc-700 underline underline-offset-4 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
                >
                  Browse partner posts
                </Link>
              </div>
            </section>
          ) : (
            <ul className="mt-8 space-y-4">
              {notifications.map((notification) => {
                const isUnread = notification.read_at === null;
                const actor = notification.actor_id
                  ? actorById.get(notification.actor_id)
                  : undefined;

                return (
                  <li
                    key={notification.id}
                    className={
                      isUnread
                        ? "rounded-2xl border border-zinc-300 bg-white p-5 shadow-sm sm:p-6 dark:border-zinc-700 dark:bg-zinc-900"
                        : "rounded-2xl border border-zinc-200 bg-zinc-50 p-5 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950"
                    }
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          isUnread
                            ? "rounded-full bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white dark:bg-white dark:text-zinc-950"
                            : "rounded-full bg-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                        }
                      >
                        {isUnread ? "Unread" : "Read"}
                      </span>
                      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {NOTIFICATION_TYPE_LABELS[notification.type]}
                      </span>
                    </div>

                    <h2 className="mt-4 text-lg font-semibold text-zinc-950 dark:text-white">
                      {notification.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                      {notification.message}
                    </p>

                    {actor && (
                      <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                        From: {actor.full_name} · {actor.department}
                      </p>
                    )}

                    <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                      {dateTimeFormatter.format(
                        new Date(notification.created_at),
                      )}
                    </p>

                    <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                      {notification.project_id && (
                        <Link
                          href={`/projects/${notification.project_id}`}
                          className="inline-flex h-10 items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
                        >
                          View Project
                        </Link>
                      )}
                      {isUnread && (
                        <MarkNotificationReadButton
                          notificationId={notification.id}
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {(currentPage > 1 || hasNext) && (
            <PaginationNav
              pathname="/notifications"
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
