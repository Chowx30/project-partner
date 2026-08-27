export const REPORT_DETAILS_MAX_LENGTH = 2000;

export const REPORT_REASON_OPTIONS = [
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "inappropriate_content", label: "Inappropriate content" },
  { value: "misrepresentation", label: "Misrepresentation" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASON_OPTIONS)[number]["value"];

export type ReportFormState = {
  status: "idle" | "error" | "success";
  message?: string;
  reasonError?: string;
  detailsError?: string;
};

export const initialReportFormState: ReportFormState = {
  status: "idle",
};

type ValidReportInput = {
  valid: true;
  reason: ReportReason;
  details: string | null;
};

type InvalidReportInput = {
  valid: false;
  reasonError?: string;
  detailsError?: string;
};

export type ReportInputValidation = ValidReportInput | InvalidReportInput;

function isReportReason(value: unknown): value is ReportReason {
  return (
    typeof value === "string" &&
    REPORT_REASON_OPTIONS.some((option) => option.value === value)
  );
}

export function validateReportInput(formData: FormData): ReportInputValidation {
  const rawReason = formData.get("reason");
  const rawDetails = formData.get("details");
  const trimmedDetails =
    typeof rawDetails === "string" ? rawDetails.trim() : "";
  const details = trimmedDetails.length > 0 ? trimmedDetails : null;
  const reasonError = isReportReason(rawReason)
    ? undefined
    : "Please choose a report reason.";
  const detailsError =
    details !== null &&
    Array.from(details).length > REPORT_DETAILS_MAX_LENGTH
      ? `Details must be ${REPORT_DETAILS_MAX_LENGTH} characters or fewer.`
      : undefined;

  if (reasonError || detailsError) {
    return { valid: false, reasonError, detailsError };
  }

  return {
    valid: true,
    reason: rawReason as ReportReason,
    details,
  };
}
