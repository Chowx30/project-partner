const formControlBaseStyles =
  "w-full rounded-control border-2 border-dark bg-white px-3.5 text-base text-dark placeholder:text-muted/75 focus-visible:border-dark disabled:cursor-not-allowed disabled:bg-surface disabled:text-muted disabled:opacity-70 aria-invalid:border-danger";

export const inputStyles = `${formControlBaseStyles} min-h-11 py-2`;

export const selectStyles = `${formControlBaseStyles} min-h-11 py-2`;

export const textareaStyles = `${formControlBaseStyles} min-h-28 resize-y py-3`;

export const labelStyles = "block text-sm font-semibold text-dark";

export const helpTextStyles = "mt-2 text-sm text-muted";

export const errorTextStyles = "mt-2 text-sm font-medium text-danger";
