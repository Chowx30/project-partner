import type { HTMLAttributes } from "react";

export type SurfaceVariant = "white" | "surface" | "dark" | "accent";

export type SurfaceProps = HTMLAttributes<HTMLDivElement> & {
  variant?: SurfaceVariant;
  featured?: boolean;
};

const variantStyles: Record<SurfaceVariant, string> = {
  white: "bg-white text-dark",
  surface: "bg-surface text-dark",
  dark: "bg-dark text-white",
  accent: "bg-accent text-dark",
};

export function Surface({
  variant = "white",
  featured = false,
  className,
  ...props
}: SurfaceProps) {
  return (
    <div
      {...props}
      className={[
        "rounded-card border-2 border-dark p-5 sm:p-6",
        variantStyles[variant],
        featured ? "shadow-card" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
