export const DEPARTMENTS = ["CSE", "EEE"] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const FULL_NAME_MAX_LENGTH = 120;
export const STUDENT_ID_MAX_LENGTH = 50;
export const BIO_MAX_LENGTH = 1000;
export const MIN_GRADUATION_YEAR = new Date().getUTCFullYear();
export const MAX_GRADUATION_YEAR = Math.min(
  2100,
  MIN_GRADUATION_YEAR + 10,
);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isDepartment(value: string): value is Department {
  return DEPARTMENTS.includes(value as Department);
}

export function isUuid(value: string) {
  return UUID_PATTERN.test(value);
}
