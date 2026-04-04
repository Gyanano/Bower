"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { analyzeInspiration, createInspiration, getApiErrorMessage } from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

export function UploadForm({
  copy,
  buildSuccessHref,
  onComplete,
  onCancel,
  className,
}: {
  copy: CopyDictionary;
  buildSuccessHref: (id: string) => string;
  onComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [selectedFileName, setSelectedFileName] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setUploadError(null);
    setIsUploading(true);

    try {
      const created = await createInspiration(formData);
      const nextHref = buildSuccessHref(created.data.id);
      form.reset();
      setSelectedFileName("");
      onComplete?.();
      router.push(nextHref);
      router.refresh();

      void (async () => {
        try {
          await analyzeInspiration(created.data.id);
        } catch {
          // A later refresh will surface a failed analysis state.
        } finally {
          router.refresh();
        }
      })();
    } catch (error) {
      setUploadError(getApiErrorMessage(error));
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <form className={cn("space-y-4", className)} onSubmit={handleUpload}>
      <div className="space-y-1.5">
        <label className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
          {copy.imageFileLabel}
        </label>
        <div className="flex items-center gap-3">
          <label
            htmlFor="upload-file-input"
            className="inline-flex cursor-pointer items-center gap-2 rounded-md bg-muted px-4 py-2 text-sm font-semibold transition-colors hover:bg-surface-high"
          >
            <Upload size={14} />
            {copy.chooseFile}
          </label>
          <span className="truncate text-sm text-muted-foreground">
            {selectedFileName || copy.noFileSelected}
          </span>
        </div>
        <input
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          id="upload-file-input"
          name="file"
          onChange={(event) => setSelectedFileName(event.target.files?.[0]?.name ?? "")}
          required
          type="file"
        />
      </div>

      <div className="space-y-1.5">
        <label className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
          {copy.titleField}
        </label>
        <Input name="title" placeholder={copy.titlePlaceholder} />
      </div>

      <div className="space-y-1.5">
        <label className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
          {copy.urlField}
        </label>
        <Input name="source_url" placeholder="https://example.com" type="url" />
      </div>

      <div className="space-y-1.5">
        <label className="font-label text-[10px] font-semibold uppercase tracking-[0.3em] text-foreground">
          {copy.notesField}
        </label>
        <textarea
          name="notes"
          placeholder={copy.notesPlaceholder}
          rows={4}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {uploadError ? <p className="text-sm text-destructive">{uploadError}</p> : null}

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {copy.cancel}
          </Button>
        ) : null}
        <Button type="submit" disabled={isUploading} className="bg-primary text-primary-foreground">
          {isUploading ? copy.saving : copy.save}
        </Button>
      </div>
    </form>
  );
}
