import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  className?: string;
  mono?: boolean;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
};

const sizes = {
  sm: "h-10 md:h-11 px-5 text-[14px]",
  md: "h-12 md:h-[48px] px-6 text-[15px]",
};

const variants = {
  primary: "bg-ink text-paper hover:bg-ink-soft active:bg-ink",
  secondary:
    "bg-transparent text-ink border border-rule hover:border-ink hover:bg-paper-raised",
  danger: "bg-pen-red text-paper hover:bg-pen-red/90",
};

/**
 * DESIGN_SYSTEM.md §4 #1 — primary: ink fill, paper text; height 44–48px,
 * radius 3px. `mono` renders the uppercase letterspaced CTA style
 * (ANALYZE THE GAP, DOWNLOAD REPORT).
 */
export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className,
  mono = false,
  type = "button",
  disabled = false,
  onClick,
}: ButtonProps) {
  const cls = cn(
    "group inline-flex items-center justify-center gap-2 rounded-[3px] font-medium transition duration-150 ease-out cursor-pointer select-none active:translate-y-px active:scale-[0.98]",
    sizes[size],
    disabled
      ? "bg-graphite text-paper cursor-not-allowed"
      : variants[variant],
    mono && "font-mono uppercase tracking-[0.12em] text-[14px]",
    className
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
