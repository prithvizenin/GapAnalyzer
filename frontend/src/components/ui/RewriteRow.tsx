/**
 * DESIGN_SYSTEM.md §4 #24 — one rewritten resume line, week 12.
 *
 * Two columns of a hairline-bordered paper box: `ORIGINAL` (mono graphite
 * label, `ink-soft` body) and `REVISED` (label + 2px left rule in
 * `--stamp-green` — the §3.1 status colour, same family as IMPROVED; `ink`
 * body, plus the model's optional note). Stacks <640px.
 *
 * Presentational on purpose: the owning page staggers the reveal, and rows
 * only exist for lines that actually changed.
 */
export function RewriteRow({
  original,
  revised,
  note,
}: {
  original: string;
  revised: string;
  note?: string;
}) {
  return (
    <div className="grid border border-rule bg-paper-raised sm:grid-cols-2">
      <div className="border-b border-rule p-4 sm:border-b-0 sm:border-r md:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-graphite">
          Original
        </p>
        <p className="mt-2 font-mono text-[13px] leading-[1.6] text-ink-soft">
          {original}
        </p>
      </div>

      <div className="border-l-2 border-stamp-green p-4 md:p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-stamp-green">
          Revised
        </p>
        <p className="mt-2 font-mono text-[13px] leading-[1.6] text-ink">
          {revised}
        </p>
        {note && (
          <p className="mt-2 font-mono text-[11px] leading-[1.5] text-graphite">
            {note}
          </p>
        )}
      </div>
    </div>
  );
}
