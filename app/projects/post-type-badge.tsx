import {
  projectPostTypeLabel,
  type ProjectPostType,
} from "@/src/lib/projects/validation";

export function PostTypeBadge({ postType }: { postType: ProjectPostType }) {
  const isLab = postType === "lab";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        isLab
          ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
      }`}
    >
      {projectPostTypeLabel(postType)}
    </span>
  );
}
