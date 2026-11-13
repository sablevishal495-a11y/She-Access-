import { STATUS_META } from "@/lib/stock";
import type { MachineStatus } from "@/types";
import { cn } from "@/utils/cn";

export function StockBar({
  stock,
  capacity,
  status,
  className,
}: {
  stock: number;
  capacity: number;
  status: MachineStatus;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, (stock / Math.max(capacity, 1)) * 100));
  return (
    <div
      role="progressbar"
      aria-label="Stock level"
      aria-valuemin={0}
      aria-valuemax={capacity}
      aria-valuenow={stock}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-slate-100", className)}
    >
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-500",
          STATUS_META[status].bar,
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
