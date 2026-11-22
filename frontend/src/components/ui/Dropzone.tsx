import { useRef, useState } from "react";
import { cn } from "@/lib/cn";

/**
 * DESIGN_SYSTEM.md §4 #3 — manila fill, dashed border, paperclip centered,
 * copy "Drag and drop your resume here or click to upload" (mockup 02; the
 * mobile comp shortens it to "Tap to upload a PDF, DOCX or TXT"); red dashed
 * border on file-type error. The picked file and the error line render below
 * the zone, in the owning sheet (mockup 02/07).
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
  const [dragging, setDragging] = useState(false);

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
    <div
      role="button"
      tabIndex={0}
      aria-label={
        file
          ? `Replace ${file.name} — drag and drop, or press Enter to browse`
          : "Upload your resume — drag and drop, or press Enter to browse"
      }
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
        "flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-3 rounded-[2px] border-2 border-dashed bg-manila px-5 py-8 text-center transition duration-150 md:min-h-[248px] md:gap-4",
        error
          ? "border-pen-red"
          : dragging
            ? "border-ink bg-manila/80 shadow-paper"
            : "border-ink/55 hover:border-ink/75"
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
        className="h-7 w-7 text-ink md:h-9 md:w-9"
      >
        <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
      </svg>

      <p className="max-w-[34ch] text-[14px] leading-snug text-ink-soft md:text-[15.5px]">
        <span className="md:hidden">Tap to upload a PDF, DOCX or TXT</span>
        <span className="hidden md:inline">
          Drag and drop your resume here or click to upload
        </span>
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        className="hidden"
        onChange={handleInput}
      />
    </div>
  );
}
