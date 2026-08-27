export type AuthFieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: AuthFieldErrors;
};

export const initialAuthFormState: AuthFormState = {
  status: "idle",
};
