export const MAX_PAGE_NUMBER = 1000 as const;

export const PROJECTS_PAGE_SIZE = 24 as const;
export const NOTIFICATIONS_PAGE_SIZE = 20 as const;
export const APPLICATIONS_PAGE_SIZE = 20 as const;
export const COMMENTS_PAGE_SIZE = 20 as const;
export const APPLICANTS_PAGE_SIZE = 20 as const;
export const DASHBOARD_PROJECT_LIMIT = 5 as const;
export const PROFILE_PROJECT_LIMIT = 5 as const;

export type SearchParamValue = string | string[] | undefined;
export type PaginationSearchParams = Readonly<
  Record<string, SearchParamValue>
>;

function requirePositiveSafeInteger(value: number, name: string) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive safe integer.`);
  }
}

export function parsePage(value: SearchParamValue) {
  if (typeof value !== "string") {
    return 1;
  }

  const normalizedValue = value.trim();

  if (!/^[1-9]\d*$/.test(normalizedValue)) {
    return 1;
  }

  const page = Number(normalizedValue);

  return Number.isSafeInteger(page) && page <= MAX_PAGE_NUMBER ? page : 1;
}

export function getPageOffset(page: number, pageSize: number) {
  requirePositiveSafeInteger(page, "page");
  requirePositiveSafeInteger(pageSize, "pageSize");

  const offset = (page - 1) * pageSize;

  if (!Number.isSafeInteger(offset)) {
    throw new RangeError("Pagination offset exceeds the safe integer range.");
  }

  return offset;
}

export function slicePageResults<T>(rows: readonly T[], pageSize: number) {
  requirePositiveSafeInteger(pageSize, "pageSize");

  return {
    items: rows.slice(0, pageSize),
    hasNext: rows.length > pageSize,
  };
}

function requireInternalPathname(pathname: string) {
  const baseUrl = new URL("http://pagination.local");
  const resolvedUrl = new URL(pathname, baseUrl);

  if (
    resolvedUrl.origin !== baseUrl.origin ||
    resolvedUrl.pathname !== pathname ||
    resolvedUrl.search ||
    resolvedUrl.hash
  ) {
    throw new TypeError("pathname must be a local path without a query or hash.");
  }
}

export function buildPaginationHref({
  pathname,
  searchParams = {},
  page,
  pageParamName = "page",
}: {
  pathname: string;
  searchParams?: PaginationSearchParams;
  page: number;
  pageParamName?: string;
}) {
  requireInternalPathname(pathname);
  requirePositiveSafeInteger(page, "page");

  if (page > MAX_PAGE_NUMBER) {
    throw new RangeError(`page must not exceed ${MAX_PAGE_NUMBER}.`);
  }

  if (pageParamName.length === 0) {
    throw new TypeError("pageParamName must not be empty.");
  }

  const query = new URLSearchParams();

  for (const [name, value] of Object.entries(searchParams)) {
    if (name === pageParamName || value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        query.append(name, item);
      }
    } else {
      query.append(name, value);
    }
  }

  if (page > 1) {
    query.set(pageParamName, String(page));
  }

  const queryString = query.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
