import Link from "next/link";
import type {
  ButtonHTMLAttributes,
  ComponentProps,
} from "react";

export type ButtonVariant =
  | "primary"
  | "accent"
  | "secondary"
  | "danger"
  | "ghost";

export type ButtonStyleOptions = {
  variant?: ButtonVariant;
  featured?: boolean;
  className?: string;
};

const baseStyles =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-control border-2 px-5 py-2.5 text-sm font-semibold leading-5 transition-[background-color,color,border-color,box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50";

const variantStyles: Record<ButtonVariant, string> = {
  primary: "border-dark bg-dark text-white hover:bg-dark/90",
  accent: "border-dark bg-accent text-dark hover:bg-accent/80",
  secondary: "border-dark bg-white text-dark hover:bg-surface",
  danger:
    "border-danger bg-danger text-white hover:bg-danger/90 focus-visible:outline-danger focus-visible:shadow-[0_0_0_2px_var(--pp-danger)]",
  ghost: "border-transparent bg-transparent text-dark hover:bg-surface",
};

function joinClasses(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function buttonStyles({
  variant = "primary",
  featured = false,
  className,
}: ButtonStyleOptions = {}) {
  return joinClasses(
    baseStyles,
    variantStyles[variant],
    featured && "shadow-card hover:shadow-card-hover",
    className,
  );
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  Omit<ButtonStyleOptions, "className">;

export function Button({
  variant = "primary",
  featured = false,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={buttonStyles({ variant, featured, className })}
    />
  );
}

export type ButtonLinkProps = Omit<ComponentProps<typeof Link>, "className"> &
  ButtonStyleOptions;

export function ButtonLink({
  variant = "primary",
  featured = false,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={buttonStyles({ variant, featured, className })}
    />
  );
}
