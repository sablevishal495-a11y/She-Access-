import { cn } from "@/utils/cn";

export function LogoMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="SHE-ACCESS logo"
      className={cn("shrink-0", className)}
    >
      <rect width="64" height="64" rx="18" fill="#5268E8" />
      <path
        d="M32 11c9.2 10.6 15 18.2 15 25.8a15 15 0 0 1-30 0C17 29.200 22.800 21.600 32 11z"
        fill="#ffffff"
      />
      <path
        d="M26 38.500c.6 3.300 3 5.500 6 5.500"
        fill="none"
        stroke="#5268E8"
        strokeWidth="3.200"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-[15px] font-extrabold tracking-[0.13em] text-[#1d2940]",
        className,
      )}
    >
      SHE<span className="text-brand-600">-</span>ACCESS
    </span>
  );
}
