"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createInspiration, analyzeInspiration, getApiErrorMessage } from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

export function UploadDialog({
  open,
  onOpenChange,
  copy,
  buildHref,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: CopyDictionary;
  buildHref: (overrides: Record<string, string | null | undefined>) => string;
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
      const nextHref = buildHref({ compose: null, selected: created.data.id });
      form.reset();
      setSelectedFileName("");
      onOpenChange(false);
      router.push(nextHref);
      router.refresh();

      void (async () => {
        try {
          await analyzeInspiration(created.data.id);
        } catch {
          // Page refresh will surface the failed state
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-background border-border">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl uppercase tracking-[0.1em] text-primary">
            {copy.uploadTitle}
          </DialogTitle>
          <DialogDescription className="font-body text-sm text-muted-foreground">
            {copy.uploadHint}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4 mt-2" onSubmit={handleUpload}>
          <div className="space-y-1.5">
            <label className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground font-semibold">
              {copy.imageFileLabel}
            </label>
            <div className="flex items-center gap-3">
              <label
                htmlFor="upload-file-input"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-muted text-sm font-semibold cursor-pointer hover:bg-surface-high transition-colors"
              >
                <Upload size={14} />
                {copy.chooseFile}
              </label>
              <span className="text-sm text-muted-foreground truncate">
                {selectedFileName || copy.noFileSelected}
              </span>
            </div>
            <input
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              id="upload-file-input"
              name="file"
              onChange={(e) => setSelectedFileName(e.target.files?.[0]?.name ?? "")}
              required
              type="file"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground font-semibold">
              {copy.titleField}
            </label>
            <Input name="title" placeholder={copy.titlePlaceholder} />
          </div>

          <div className="space-y-1.5">
            <label className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground font-semibold">
              {copy.urlField}
            </label>
            <Input name="source_url" placeholder="https://example.com" type="url" />
          </div>

          <div className="space-y-1.5">
            <label className="font-label text-[10px] uppercase tracking-[0.3em] text-foreground font-semibold">
              {copy.notesField}
            </label>
            <textarea
              name="notes"
              placeholder={copy.notesPlaceholder}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-vertical"
            />
          </div>

          {uploadError && (
            <p className="text-sm text-destructive">{uploadError}</p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {copy.cancel}
            </Button>
            <Button type="submit" disabled={isUploading} className="bg-primary text-primary-foreground">
              {isUploading ? copy.saving : copy.save}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
