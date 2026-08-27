export type OnboardingFieldErrors = {
  fullName?: string;
  department?: string;
  studentId?: string;
  graduationYear?: string;
  bio?: string;
  courses?: string;
  skills?: string;
};

export type OnboardingFormState = {
  status: "idle" | "error";
  message?: string;
  errors?: OnboardingFieldErrors;
};

export const initialOnboardingFormState: OnboardingFormState = {
  status: "idle",
};
