import { useRef } from "react";
import { useMotion, gsap, EASE } from "@/lib/motion";

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * DESIGN_SYSTEM.md §4 #4 — yellow highlight-tinted chip: red file glyph +
 * mono filename and size + × remove (comp 02). Sits inside the Dropzone.
 */
export function FileChip({
  file,
  onRemove,
}: {
  file: File;
  onRemove: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  // Feedback: chip pops into the dropzone when a file lands (§3.5).
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
      className="flex min-w-[260px] max-w-[300px] items-center gap-3 rounded-[6px] bg-highlight py-2.5 pl-3 pr-2 shadow-[0_1px_2px_rgba(28,26,23,0.12)] md:min-w-[300px]"
    >
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[4px] bg-pen-red text-paper"
      >
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
          <path d="M14 3v5h5" />
        </svg>
      </span>
      <div className="min-w-0 text-left leading-tight">
        {/* label + × sit ON the yellow → dark ink in both themes (§3.1) */}
        <p className="truncate font-mono text-[13px] text-on-highlight">
          {file.name}
        </p>
        <p className="font-mono text-[11px] text-graphite">
          {formatSize(file.size)}
        </p>
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove ${file.name}`}
        className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-[3px] text-on-highlight/70 transition-colors duration-150 hover:text-pen-red"
      >
        <svg
          viewBox="0 0 24 24"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
