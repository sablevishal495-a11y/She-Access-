import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";

type Variant = "primary" | "soft" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  fullWidth?: boolean;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-[0_12px_26px_-14px_rgba(56,72,165,0.95)] hover:bg-brand-700 active:scale-[0.99] disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none",
  soft: "bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-100 disabled:opacity-50",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 active:bg-slate-100 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  loading = false,
  fullWidth = true,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "inline-flex min-h-13 items-center justify-center gap-2 rounded-xl px-6 text-[15px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200",
        fullWidth && "w-full",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
