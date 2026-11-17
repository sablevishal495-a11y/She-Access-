import { ArrowUpRight } from "lucide-react";
import { formatDistance } from "@/lib/geo";
import { formatPrice, getStatus, STATUS_META } from "@/lib/stock";
import type { MachineWithDistance } from "@/types";
import { cn } from "@/utils/cn";

interface Props {
  machine: MachineWithDistance;
  showDistance: boolean;
  onSelect: (id: string) => void;
}

export function MachineCard({ machine, showDistance, onSelect }: Props) {
  const status = getStatus(machine);
  const meta = STATUS_META[status];
  const stockText = status === "offline"
    ? machine.stock !== null ? `Offline · ${machine.stock} pads last reported` : "Offline"
    : status === "unknown"
      ? "Stock not reported"
      : status === "empty"
        ? "Out of stock"
        : `${machine.stock} pads left`;
  const hasPrice = machine.pricePerPad !== null;

  return (
    <button
      type="button"
      onClick={() => onSelect(machine.id)}
      aria-label={`${machine.name}, ${meta.label}${hasPrice ? `, ${formatPrice(machine.pricePerPad, machine.currency)} per pad` : ""}. View details`}
      className="group flex w-full items-start justify-between gap-3 border-b border-[#edf0f3] px-7 py-4 text-left transition-colors hover:bg-[#f8f9fc] focus-visible:bg-[#f8f9fc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-300 active:bg-brand-50 max-md:px-5"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold leading-snug text-[#1d2940] sm:text-[15px]">
          {machine.name}
        </p>
        <p className="mt-1 truncate text-[12px] text-[#778094] sm:text-[13px]">{machine.address}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className={cn("inline-flex items-center gap-1.5 font-semibold", status === "available" ? "text-emerald-700" : status === "low" ? "text-amber-700" : status === "empty" ? "text-rose-600" : "text-slate-500")}>
            <span className={cn("h-[7px] w-[7px] rounded-full", meta.dot)} aria-hidden="true" />
            {stockText}
          </span>
          {showDistance && machine.distanceKm !== null && <span className="text-[#8790a1]">{formatDistance(machine.distanceKm)} away</span>}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5 pl-1">
        {hasPrice && (
          <>
            <span className="text-[18px] font-extrabold tracking-tight text-[#222d48]">
              {formatPrice(machine.pricePerPad, machine.currency)}
            </span>
            <span className="text-[11px] text-[#9299a8]">{machine.products.length > 1 ? "from" : "per pad"}</span>
          </>
        )}
        <ArrowUpRight className="mt-1.5 h-4 w-4 text-[#b8bece] transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-600" aria-hidden="true" />
      </div>
    </button>
  );
}

export function MachineCardSkeleton() {
  return (
    <div className="flex animate-pulse justify-between border-b border-[#edf0f3] px-7 py-5 max-md:px-5" aria-hidden="true">
      <div className="w-3/4 space-y-2.5">
        <div className="h-3.5 w-2/3 rounded bg-slate-100" />
        <div className="h-3 w-4/5 rounded bg-slate-100" />
        <div className="h-3 w-1/3 rounded bg-slate-100" />
      </div>
      <div className="h-5 w-10 rounded bg-slate-100" />
    </div>
  );
}