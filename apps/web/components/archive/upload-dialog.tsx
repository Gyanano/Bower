"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UploadForm } from "./upload-form";
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

        <UploadForm
          copy={copy}
          buildSuccessHref={(id) => buildHref({ compose: null, selected: id })}
          onCancel={() => onOpenChange(false)}
          onComplete={() => onOpenChange(false)}
          className="mt-2"
        />
      </DialogContent>
    </Dialog>
  );
}
