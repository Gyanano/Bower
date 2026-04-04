"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInspiration, getApiErrorMessage } from "@/lib/api";

export function UploadForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);

    setError(null);
    setIsSubmitting(true);

    try {
      const response = await createInspiration(formData);
      form.reset();
      router.push(`/inspirations/${response.data.id}`);
      router.refresh();
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <label className="label">
        Image file
        <input accept="image/png,image/jpeg,image/webp" className="input" name="file" required type="file" />
      </label>

      <label className="label">
        Title
        <input className="input" name="title" placeholder="Landing page reference" type="text" />
      </label>

      <label className="label">
        Source URL
        <input className="input" name="source_url" placeholder="https://example.com" type="url" />
      </label>

      <label className="label">
        Notes
        <textarea className="textarea" name="notes" placeholder="Optional notes" />
      </label>

      <button className="button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Saving..." : "Save inspiration"}
      </button>

      {error ? <p className="error">{error}</p> : null}
    </form>
  );
}
