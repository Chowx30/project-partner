export const NSU_EMAIL_MESSAGE =
  "Use your North South University email ending in @northsouth.edu.";

const NSU_EMAIL_PATTERN = /^[^@\s]+@northsouth\.edu$/i;

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isNsuEmail(value: string) {
  return NSU_EMAIL_PATTERN.test(normalizeEmail(value));
}
