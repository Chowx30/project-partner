import Link from "next/link";

import {
  buildPaginationHref,
  MAX_PAGE_NUMBER,
  type PaginationSearchParams,
} from "@/src/lib/pagination";

type PaginationNavProps = {
  pathname: string;
  currentPage: number;
  hasNext: boolean;
  searchParams?: PaginationSearchParams;
  pageParamName?: string;
};

const linkClasses =
  "inline-flex h-10 items-center justify-center rounded-lg border border-zinc-300 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";
const disabledClasses =
  "inline-flex h-10 cursor-not-allowed items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-4 text-sm font-medium text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-600";

export function PaginationNav({
  pathname,
  currentPage,
  hasNext,
  searchParams = {},
  pageParamName = "page",
}: PaginationNavProps) {
  const hasPrevious = currentPage > 1;
  const canGoNext = hasNext && currentPage < MAX_PAGE_NUMBER;

  return (
    <nav
      aria-label="Pagination"
      className="mt-8 flex items-center justify-between gap-4"
    >
      {hasPrevious ? (
        <Link
          href={buildPaginationHref({
            pathname,
            searchParams,
            page: currentPage - 1,
            pageParamName,
          })}
          className={linkClasses}
        >
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClasses}>
          Previous
        </span>
      )}

      <span
        aria-current="page"
        className="text-sm font-medium text-zinc-600 dark:text-zinc-400"
      >
        Page {currentPage}
      </span>

      {canGoNext ? (
        <Link
          href={buildPaginationHref({
            pathname,
            searchParams,
            page: currentPage + 1,
            pageParamName,
          })}
          className={linkClasses}
        >
          Next
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClasses}>
          Next
        </span>
      )}
    </nav>
  );
}
