"use client";

import { useActionState, useState } from "react";

import {
  deleteProjectCommentAction,
  editProjectCommentAction,
} from "@/app/projects/[id]/actions";
import {
  COMMENT_MAX_LENGTH,
  initialCommentFormState,
} from "@/app/projects/[id]/form-state";

export function CommentControls({
  commentId,
  content,
}: {
  commentId: string;
  content: string;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const editComment = editProjectCommentAction.bind(null, commentId);
  const deleteComment = deleteProjectCommentAction.bind(null, commentId);
  const [editState, editAction, editingPending] = useActionState(
    editComment,
    initialCommentFormState,
  );
  const [deleteState, deleteAction, deletingPending] = useActionState(
    deleteComment,
    initialCommentFormState,
  );
  const pending = editingPending || deletingPending;

  if (editing) {
    return (
      <form action={editAction} className="mt-4 space-y-3">
        <div>
          <label
            htmlFor={`edit-comment-${commentId}`}
            className="sr-only"
          >
            Edit comment
          </label>
          <textarea
            id={`edit-comment-${commentId}`}
            name="content"
            rows={4}
            required
            maxLength={COMMENT_MAX_LENGTH}
            defaultValue={content}
            disabled={pending}
            aria-invalid={Boolean(editState.fieldError)}
            className="w-full resize-y rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none transition focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-zinc-300"
          />
          {editState.fieldError && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">
              {editState.fieldError}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-9 items-center justify-center rounded-lg bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            {editingPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setEditing(false)}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-zinc-300 px-3 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
        </div>

        {editState.message && (
          <p
            role={editState.status === "error" ? "alert" : "status"}
            className={
              editState.status === "error"
                ? "text-sm text-red-600 dark:text-red-400"
                : "text-sm text-emerald-600 dark:text-emerald-400"
            }
          >
            {editState.message}
          </p>
        )}
      </form>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setEditing(true)}
          className="text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-white"
        >
          Edit
        </button>
        {!confirmingDelete ? (
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmingDelete(true)}
            className="text-sm font-medium text-red-600 underline underline-offset-4 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
          >
            Delete
          </button>
        ) : (
          <form action={deleteAction} className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-zinc-600 dark:text-zinc-400">
              Delete this comment?
            </span>
            <button
              type="submit"
              disabled={pending}
              className="text-sm font-semibold text-red-600 underline underline-offset-4 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60 dark:text-red-400 dark:hover:text-red-300"
            >
              {deletingPending ? "Deleting…" : "Confirm"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirmingDelete(false)}
              className="text-sm font-medium text-zinc-600 underline underline-offset-4 hover:text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-400 dark:hover:text-white"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {deleteState.message && (
        <p
          role={deleteState.status === "error" ? "alert" : "status"}
          className={
            deleteState.status === "error"
              ? "mt-2 text-sm text-red-600 dark:text-red-400"
              : "mt-2 text-sm text-emerald-600 dark:text-emerald-400"
          }
        >
          {deleteState.message}
        </p>
      )}
    </div>
  );
}
