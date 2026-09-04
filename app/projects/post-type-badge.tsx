import {
  projectPostTypeLabel,
  type ProjectPostType,
} from "@/src/lib/projects/validation";

export function PostTypeBadge({ postType }: { postType: ProjectPostType }) {
  const isLab = postType === "lab";

  return (
    <span
      className={`inline-flex rounded-full border-2 px-2.5 py-1 text-xs font-bold leading-none ${
        isLab
          ? "border-dark bg-white text-dark"
          : "border-success bg-success/10 text-success"
      }`}
    >
      {projectPostTypeLabel(postType)}
    </span>
  );
}
