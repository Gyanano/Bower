"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeInspiration,
  archiveInspiration,
  deleteInspiration,
  getApiErrorMessage,
  type InspirationDetail,
  updateInspiration,
} from "@/lib/api";
import { formatUtcTimestamp } from "@/lib/format";

export function InspirationActions({ item }: { item: InspirationDetail }) {
  const router = useRouter();
  const [title, setTitle] = useState(item.title ?? "");
  const [sourceUrl, setSourceUrl] = useState(item.source_url ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      await updateInspiration(item.id, { notes, source_url: sourceUrl, title });
      setSuccess("Metadata saved.");
      router.refresh();
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleArchive() {
    setError(null);
    setSuccess(null);
    setIsArchiving(true);

    try {
      await archiveInspiration(item.id);
      router.refresh();
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsArchiving(false);
    }
  }

  async function handleAnalyze() {
    setError(null);
    setSuccess(null);
    setIsAnalyzing(true);

    try {
      await analyzeInspiration(item.id);
      setSuccess(item.analyzed_at ? "Analysis refreshed." : "Analysis saved.");
      router.refresh();
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setSuccess(null);
    setIsDeleting(true);

    try {
      await deleteInspiration(item.id);
      router.push("/inspirations?status=archived");
      router.refresh();
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
      setIsDeleting(false);
    }
  }

  function handleDeletePrompt() {
    setError(null);
    setSuccess(null);
    setIsDeleteConfirming(true);
  }

  function handleDeleteCancel() {
    if (isDeleting) {
      return;
    }

    setIsDeleteConfirming(false);
  }

  return (
    <section className="card stack">
      <div>
        <h2>Edit metadata</h2>
        <p className="muted">Update title, source URL, or notes for this inspiration.</p>
      </div>

      <form className="stack" onSubmit={handleSave}>
        <label className="label">
          Title
          <input className="input" onChange={(event) => setTitle(event.target.value)} type="text" value={title} />
        </label>

        <label className="label">
          Source URL
          <input
            className="input"
            onChange={(event) => setSourceUrl(event.target.value)}
            placeholder="https://example.com"
            type="url"
            value={sourceUrl}
          />
        </label>

        <label className="label">
          Notes
          <textarea className="textarea" onChange={(event) => setNotes(event.target.value)} value={notes} />
        </label>

        <button className="button" disabled={isSaving || isAnalyzing || isArchiving || isDeleting} type="submit">
          {isSaving ? "Saving..." : "Save metadata"}
        </button>
      </form>

      <div className="stack">
        <div>
          <h2>AI analysis</h2>
          <p className="muted">
            {item.analyzed_at
              ? `Last analyzed ${formatUtcTimestamp(item.analyzed_at)}.`
              : "Generate a summary and tags for this inspiration image."}
          </p>
        </div>

        <button className="button button-secondary" disabled={isSaving || isAnalyzing || isArchiving || isDeleting} onClick={handleAnalyze} type="button">
          {isAnalyzing ? "Analyzing..." : item.analyzed_at ? "Re-run analysis" : "Analyze image"}
        </button>
      </div>

      <div className="stack">
        <div>
          <h2>{item.status === "archived" ? "Archived inspiration" : "Archive inspiration"}</h2>
          <p className="muted">
            {item.status === "archived"
              ? `Archived ${item.archived_at ? formatUtcTimestamp(item.archived_at) : "recently"}.`
              : "Move this inspiration out of the active list. Unarchive is not included in this pass."}
          </p>
        </div>

        {item.status === "active" ? (
          <button className="button button-secondary" disabled={isSaving || isAnalyzing || isArchiving || isDeleting} onClick={handleArchive} type="button">
            {isArchiving ? "Archiving..." : "Archive inspiration"}
          </button>
        ) : (
          <div className="stack">
            <p className="muted">Permanent delete cannot be undone in this MVP.</p>
            {isDeleteConfirming ? (
              <div className="stack">
                <p className="error">Delete this archived inspiration and remove its local file permanently?</p>
                <div className="button-row">
                  <button className="button button-danger" disabled={isSaving || isAnalyzing || isArchiving || isDeleting} onClick={handleDelete} type="button">
                    {isDeleting ? "Deleting..." : "Confirm permanent delete"}
                  </button>
                  <button className="button button-secondary" disabled={isSaving || isAnalyzing || isArchiving || isDeleting} onClick={handleDeleteCancel} type="button">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button className="button button-danger" disabled={isSaving || isAnalyzing || isArchiving || isDeleting} onClick={handleDeletePrompt} type="button">
                Delete permanently
              </button>
            )}
          </div>
        )}
      </div>

      {success ? <p className="success">{success}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
