import { useRef } from "react";
import { useMotion, gsap, EASE } from "@/lib/motion";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** The upload chip's file-type tag (`PDF`, `DOCX`, `TXT`) — mockup 02 shows
 *  the extension in red mono in place of a glyph. */
function extension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "FILE" : name.slice(dot + 1).toUpperCase();
}

/**
 * DESIGN_SYSTEM.md §4 #4 — yellow highlight-tinted chip: red file-type tag +
 * mono filename · size + × remove (mockup 02/07). Sits under the dropzone,
 * inside the resume sheet.
 */
export function FileChip({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  // Feedback: chip pops into the sheet when a file lands (§3.5).
  useMotion(root, () => {
    gsap.from(root.current, {
      y: 8,
      scale: 0.96,
      autoAlpha: 0,
      duration: 0.26,
      ease: EASE,
    });
  }, []);

  return (
    <div
      ref={root}
      className="flex w-full items-center gap-2.5 rounded-[3px] bg-highlight px-3 py-2.5 text-left shadow-[0_1px_2px_rgba(28,26,23,0.12)] sm:w-auto sm:min-w-[300px]"
    >
      {/* label + × sit ON the yellow → dark ink in both themes (§3.1) */}
      <span className="shrink-0 font-mono text-[11px] font-medium uppercase tracking-[0.08em] text-pen-red">
        {extension(file.name)}
      </span>
      <p className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-on-highlight">
        {file.name}
        <span className="text-graphite"> · {formatSize(file.size)}</span>
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${file.name}`}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-[3px] text-on-highlight/70 transition-colors duration-150 hover:text-pen-red"
      >
        <svg
          viewBox="0 0 24 24"
          width="13"
          height="13"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
