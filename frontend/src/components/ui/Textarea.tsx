import { cn } from "@/lib/cn";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** Ruled notebook lines + red margin line + mono text (JD field, comp 02). */
  ruled?: boolean;
};

/**
 * DESIGN_SYSTEM.md §4 #2 — paper-raised fill, 1px rule border, focus = pen-red
 * ring (via the global :focus-visible outline). `ruled` renders the notebook
 * treatment: `.ruled-paper` in globals.css carries the line rules.
 */
export function Textarea({ ruled = false, className, ...props }: TextareaProps) {
  return (
    <textarea
      {...props}
      className={cn(
        "w-full resize-y rounded-[3px] border border-rule bg-paper-raised text-ink transition-colors duration-150 placeholder:text-graphite",
        ruled
          ? "ruled-paper pb-6 pl-11 pr-4 font-mono text-[15px] leading-[32px] md:text-[16px]"
          : "p-4 text-[15px] leading-relaxed",
        className
      )}
    />
  );
}
