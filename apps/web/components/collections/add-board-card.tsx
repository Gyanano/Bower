"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBoard, getApiErrorMessage } from "@/lib/api";
import type { CopyDictionary } from "@/lib/i18n";

export function AddBoardCard({ copy }: { copy: CopyDictionary }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      await createBoard({ name: name.trim() });
      setName("");
      setIsExpanded(false);
      startTransition(() => router.refresh());
    } catch (submissionError) {
      setError(getApiErrorMessage(submissionError));
    } finally {
      setIsSaving(false);
    }
  }

  if (isExpanded) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-border bg-card p-4 shadow-card">
        <form className="flex h-full flex-col gap-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <h3 className="font-headline text-lg text-primary">{copy.addBoard}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{copy.addBoardHint}</p>
          </div>

          <Input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={copy.addBoardPlaceholder}
            maxLength={80}
          />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <div className="mt-auto flex gap-3">
            <Button type="submit" disabled={isSaving || !name.trim()} className="bg-primary text-primary-foreground">
              {isSaving ? copy.saving : copy.addBoardSubmit}
            </Button>
            <Button type="button" variant="outline" disabled={isSaving} onClick={() => setIsExpanded(false)}>
              {copy.cancel}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsExpanded(true)}
      className="group flex aspect-square w-full flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-[#d9d0c3] bg-[#f5efe6] p-6 text-center transition-all duration-300 hover:border-[#cbbda9] hover:bg-[#f7f2ea] hover:shadow-[0_24px_40px_-20px_rgba(104,88,64,0.18)]"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ece3d6] text-[#6f6558] transition-transform duration-300 group-hover:scale-105 group-hover:bg-[#e6dccd]">
        <Plus size={22} strokeWidth={1.8} />
      </div>
      <p className="mt-4 font-headline text-lg text-[#5b6470]">{copy.addBoard}</p>
      <p className="mt-2 text-sm leading-relaxed text-[#857d73]">{copy.addBoardHint}</p>
    </button>
  );
}
