import {
  reportProjectCommentAction,
  reportProjectAction,
} from "@/app/projects/[id]/actions";
import { ReportForm } from "@/src/components/report-form";

type ReportTarget = "project" | "comment";

export function ReportControls({
  target,
  targetId,
  alreadyReported,
}: {
  target: ReportTarget;
  targetId: string;
  alreadyReported: boolean;
}) {
  const action =
    target === "project"
      ? reportProjectAction.bind(null, targetId)
      : reportProjectCommentAction.bind(null, targetId);

  return (
    <ReportForm
      action={action}
      alreadyReported={alreadyReported}
      controlId={`report-${target}-${targetId}`}
      triggerLabel={target === "project" ? "Report project" : "Report"}
    />
  );
}
