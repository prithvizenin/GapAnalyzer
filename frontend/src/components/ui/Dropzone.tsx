import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { FileChip } from "@/components/ui/FileChip";
import { useMotion, gsap, EASE } from "@/lib/motion";

/**
 * DESIGN_SYSTEM.md §4 #3 — manila fill, dashed border, paperclip centered,
 * copy "Drag and drop your resume here or click to upload"; red border on
 * file-type error. Selected file shows as a FileChip inside the zone.
 */
export function Dropzone({
  file,
  error,
  onSelect,
}: {
  file: File | null;
  error?: string | null;
  onSelect: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const errRef = useRef<HTMLParagraphElement>(null);
  const [dragging, setDragging] = useState(false);

  // Feedback: a validation error rises into its slot under the dropzone.
  useMotion(
    rootRef,
    () => {
      if (error && errRef.current) {
        gsap.from(errRef.current, {
          y: 8,
          autoAlpha: 0,
          duration: 0.3,
          ease: EASE,
        });
      }
    },
    [error]
  );

  function pick() {
    inputRef.current?.click();
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.currentTarget.files?.[0] ?? null;
    if (picked) onSelect(picked);
    e.currentTarget.value = ""; // allow re-selecting the same file
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) onSelect(dropped);
  }

  return (
    <>
      <div
        ref={rootRef}
        role="button"
        tabIndex={0}
        aria-label="Upload your resume — drag and drop, or press Enter to browse"
        onClick={pick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            pick();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex min-h-[300px] cursor-pointer flex-col items-center justify-center gap-6 rounded-[3px] border-2 border-dashed bg-manila px-6 py-10 text-center transition duration-150 md:min-h-[460px]",
          error
            ? "border-pen-red"
            : dragging
              ? "border-ink scale-[1.008] shadow-paper"
              : "border-ink/60 hover:border-ink/80 hover:shadow-[0_2px_10px_rgba(28,26,23,0.08)]"
        )}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-16 w-16 text-ink md:h-20 md:w-20"
        >
          <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
        </svg>

        <p className="max-w-[300px] font-display text-[18px] leading-snug text-ink-soft md:text-[21px]">
          Drag and drop your resume here or click to upload
        </p>

        {file && <FileChip file={file} onRemove={() => onSelect(null)} />}

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleInput}
        />
      </div>
      {error && (
        <p
          ref={errRef}
          role="alert"
          className="mt-3 font-mono text-[12px] text-pen-red"
        >
          {error}
        </p>
      )}
    </>
  );
}
