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
  previousLabel?: string;
  nextLabel?: string;
};

const linkClasses =
  "inline-flex min-h-11 items-center justify-center rounded-control border-2 border-dark bg-white px-4 text-sm font-semibold text-dark transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark motion-reduce:transition-none";
const disabledClasses =
  "inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-control border-2 border-border bg-surface px-4 text-sm font-semibold text-muted opacity-60";

export function PaginationNav({
  pathname,
  currentPage,
  hasNext,
  searchParams = {},
  pageParamName = "page",
  previousLabel = "Previous",
  nextLabel = "Next",
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
          {previousLabel}
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClasses}>
          {previousLabel}
        </span>
      )}

      <span
        aria-current="page"
        className="rounded-full border-2 border-dark bg-accent px-3 py-1 text-sm font-bold text-dark"
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
          {nextLabel}
        </Link>
      ) : (
        <span aria-disabled="true" className={disabledClasses}>
          {nextLabel}
        </span>
      )}
    </nav>
  );
}
