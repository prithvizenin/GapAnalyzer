import { cn } from "@/lib/cn";

/** Words in `revised` that don't appear in `original` — the phrases to paint
 *  with the highlighter (mockup 03/08). Short words are skipped so "a"/"to"
 *  don't speckle the line. */
function novelWords(original: string, revised: string): Set<string> {
  const known = new Set(
    original
      .toLowerCase()
      .split(/[^a-z0-9+#./-]+/)
      .filter(Boolean)
  );
  const out = new Set<string>();
  for (const word of revised.split(/(\s+)/)) {
    const key = word.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
    if (key.length >= 3 && !known.has(key)) out.add(word.toLowerCase());
  }
  return out;
}

/** Render `revised` with the changed phrases wrapped in the highlighter. */
function Highlighted({ original, revised }: { original: string; revised: string }) {
  const novel = novelWords(original, revised);
  if (novel.size === 0) return <>{revised}</>;

  const parts = revised.split(/(\s+)/);
  const runs: { text: string; mark: boolean }[] = [];
  for (const part of parts) {
    const mark = /\S/.test(part) && novel.has(part.toLowerCase());
    const last = runs[runs.length - 1];
    if (last && last.mark === mark) last.text += part;
    else runs.push({ text: part, mark });
  }

  return (
    <>
      {runs.map((run, i) =>
        run.mark ? (
          <mark
            key={i}
            className="hl-sweep bg-transparent text-on-highlight box-decoration-clone"
          >
            {run.text}
          </mark>
        ) : (
          <span key={i}>{run.text}</span>
        )
      )}
    </>
  );
}

/**
 * DESIGN_SYSTEM.md §4 #24 — one reviewed resume line (mockups 03/08).
 *
 * A changed row is two paper boxes sharing one hairline on wide screens, the
 * revised half separated by the `--stamp-green` rule; below `md` they stack,
 * the revised box carrying a green top edge. `Unchanged` rows are dashed and
 * muted — the copy deck's "passes through verbatim" note.
 */
export function RewriteRow({
  original,
  revised,
  changed,
  note,
}: {
  original: string;
  revised: string;
  changed: boolean;
  note?: string;
}) {
  const label = "font-mono text-[9.5px] uppercase tracking-[0.16em] text-graphite md:hidden";

  return (
    <div
      className={cn(
        "md:grid md:grid-cols-2 md:bg-paper-raised",
        changed
          ? "md:border md:border-rule"
          : "md:border md:border-dashed md:border-graphite/40"
      )}
    >
      <div
        className={cn(
          "bg-paper-raised p-4 md:bg-transparent md:p-5",
          changed ? "border border-rule" : "border border-dashed border-graphite/40"
        )}
      >
        <p className={label}>Original</p>
        <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.65] text-ink-soft md:mt-0">
          {original || "\u00a0"}
        </pre>
      </div>

      <div
        className={cn(
          "mt-2 bg-paper-raised p-4 md:mt-0 md:bg-transparent md:p-5",
          changed
            ? "border border-rule border-t-2 border-t-stamp-green md:border-t md:border-l-2 md:border-l-stamp-green"
            : "border border-dashed border-graphite/40 md:border-t md:border-l md:border-l-rule"
        )}
      >
        <p className={cn(label, changed && "text-stamp-green")}>Revised</p>
        {changed ? (
          <>
            <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.65] text-ink md:mt-0">
              <Highlighted original={original} revised={revised} />
            </pre>
            {note && (
              <p className="mt-2 font-mono text-[10.5px] leading-[1.6] text-graphite">
                {note}
              </p>
            )}
          </>
        ) : (
          <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[12.5px] leading-[1.65] text-graphite md:mt-0">
            {revised || "\u00a0"}
          </pre>
        )}
      </div>
    </div>
  );
}
