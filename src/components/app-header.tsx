import Link from "next/link";

import { logoutAction } from "@/app/auth/actions";
import { Button, ButtonLink } from "@/src/components/ui/button";

export type AppHeaderItem =
  | "dashboard"
  | "projects"
  | "applications"
  | "notifications"
  | "profile";

type AppHeaderProps = {
  profileId: string;
  activeItem?: AppHeaderItem;
};

const navigationItems: Array<{
  key: Exclude<AppHeaderItem, "profile">;
  label: string;
  href: string;
}> = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard" },
  { key: "projects", label: "Projects", href: "/projects" },
  { key: "applications", label: "Applications", href: "/applications" },
  { key: "notifications", label: "Notifications", href: "/notifications" },
];

const navLinkBaseStyles =
  "inline-flex min-h-11 items-center rounded-control border-2 px-3 text-sm font-semibold text-dark transition-colors motion-reduce:transition-none";

function navLinkStyles(isActive: boolean) {
  return [
    navLinkBaseStyles,
    isActive
      ? "border-dark bg-accent"
      : "border-transparent hover:border-border hover:bg-surface",
  ].join(" ");
}

export function AppHeader({ profileId, activeItem }: AppHeaderProps) {
  const items = [
    ...navigationItems,
    {
      key: "profile" as const,
      label: "Profile",
      href: `/profile/${profileId}`,
    },
  ];

  return (
    <header className="mx-auto w-full max-w-app border-b-2 border-dark bg-white">
      <div className="flex min-h-20 items-center gap-3 py-3">
        <Link
          href="/dashboard"
          aria-label="Project Partner dashboard"
          className="flex min-w-0 shrink-0 items-center gap-2 text-sm font-bold tracking-tight text-dark"
        >
          <span
            aria-hidden="true"
            className="grid h-8 w-8 place-items-center rounded-control border-2 border-dark bg-accent text-base leading-none"
          >
            P
          </span>
          <span className="whitespace-nowrap">Project Partner</span>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="ml-auto hidden items-center gap-1 lg:flex"
        >
          {items.map((item) => {
            const isActive = activeItem === item.key;

            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={navLinkStyles(isActive)}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <ButtonLink
          href="/projects/new"
          variant="accent"
          featured
          className="ml-auto shrink-0 lg:ml-0"
        >
          <span className="lg:hidden">Create</span>
          <span className="hidden lg:inline">Create Project</span>
        </ButtonLink>

        <form action={logoutAction} className="hidden lg:block">
          <Button type="submit" variant="ghost">
            Logout
          </Button>
        </form>

        <details className="group relative shrink-0 lg:hidden">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center justify-center rounded-control border-2 border-dark bg-white px-3 text-sm font-semibold text-dark hover:bg-surface [&::-webkit-details-marker]:hidden">
            Menu
          </summary>

          <div className="absolute right-0 top-full z-50 mt-3 w-[min(18rem,calc(100vw-2rem))] rounded-card border-2 border-dark bg-white p-3 shadow-card">
            <nav aria-label="Mobile navigation" className="grid gap-1">
              {items.map((item) => {
                const isActive = activeItem === item.key;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={navLinkStyles(isActive)}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <form
              action={logoutAction}
              className="mt-2 border-t-2 border-dark pt-2"
            >
              <Button type="submit" variant="ghost" className="w-full">
                Logout
              </Button>
            </form>
          </div>
        </details>
      </div>
    </header>
  );
}
