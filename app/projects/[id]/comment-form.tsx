"use client";

import { useActionState, useEffect, useRef } from "react";

import { createProjectCommentAction } from "@/app/projects/[id]/actions";
import {
  COMMENT_MAX_LENGTH,
  initialCommentFormState,
} from "@/app/projects/[id]/form-state";

export function CommentForm({ projectId }: { projectId: string }) {
  const createComment = createProjectCommentAction.bind(null, projectId);
  const [state, formAction, pending] = useActionState(
    createComment,
    initialCommentFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") {
      formRef.current?.reset();
    }
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="mt-6 space-y-4">
      <div>
        <label
          htmlFor="new-comment-content"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Comment
        </label>
        <textarea
          id="new-comment-content"
          name="content"
          rows={4}
          required
          maxLength={COMMENT_MAX_LENGTH}
          disabled={pending}
          aria-invalid={Boolean(state.fieldError)}
          aria-describedby={
            state.fieldError ? "new-comment-error" : "new-comment-help"
          }
          className="mt-2 w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-300"
        />
        {state.fieldError ? (
          <p
            id="new-comment-error"
            className="mt-2 text-sm text-red-600 dark:text-red-400"
          >
            {state.fieldError}
          </p>
        ) : (
          <p
            id="new-comment-help"
            className="mt-2 text-xs text-zinc-500 dark:text-zinc-400"
          >
            Keep it relevant and concise. Maximum {COMMENT_MAX_LENGTH} characters.
          </p>
        )}
      </div>

      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300"
              : "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
          }
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
      >
        {pending ? "Posting…" : "Post comment"}
      </button>
    </form>
  );
}
