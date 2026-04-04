"use client";

import { UploadForm } from "./upload-form";
import type { CopyDictionary } from "@/lib/i18n";

export function UploadPagePanel({ copy }: { copy: CopyDictionary }) {
  return <UploadForm copy={copy} buildSuccessHref={(id) => `/inspirations?selected=${id}`} />;
}
