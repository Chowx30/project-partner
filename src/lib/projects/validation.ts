export const PROJECT_POST_TYPES = ["project", "lab"] as const;

export type ProjectPostType = (typeof PROJECT_POST_TYPES)[number];

export const PROJECT_TITLE_MAX_LENGTH = 120;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 1000;
export const PROJECT_MEMBERS_MIN = 1;
export const PROJECT_MEMBERS_MAX = 20;
export const PROJECT_SEARCH_MAX_LENGTH = 100;
export const PROJECT_BROWSE_LIMIT = 100;

export function isProjectPostType(value: string): value is ProjectPostType {
  return PROJECT_POST_TYPES.includes(value as ProjectPostType);
}

export function projectPostTypeLabel(postType: ProjectPostType) {
  return postType === "lab" ? "Lab" : "Project";
}

export function buildProjectSearchFilter(value: string) {
  const escapedValue = value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
  const pattern = `"%${escapedValue}%"`;

  return `title.ilike.${pattern},short_description.ilike.${pattern}`;
}

export function formatProjectDate(value: string) {
  return new Intl.DateTimeFormat("en-BD", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}
