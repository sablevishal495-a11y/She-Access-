import type { MachineStatus, VendingMachine } from "@/types";

/** At or below this fill level a machine is flagged as "low stock". */
export const LOW_STOCK_RATIO = 0.25;

export function getStatus(
  m: Pick<VendingMachine, "online" | "stock" | "capacity">,
): MachineStatus {
  if (!m.online) return "offline";
  if (m.stock === null) return "unknown";
  if (m.stock <= 0) return "empty";
  if (m.capacity !== null && m.stock / Math.max(m.capacity, 1) <= LOW_STOCK_RATIO) return "low";
  return "available";
}

export const STATUS_META: Record<
  MachineStatus,
  { label: string; chip: string; dot: string; bar: string; tile: string }
> = {
  available: {
    label: "In stock",
    chip: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
    tile: "bg-emerald-50 text-emerald-600",
  },
  low: {
    label: "Low stock",
    chip: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    bar: "bg-amber-500",
    tile: "bg-amber-50 text-amber-600",
  },
  empty: {
    label: "Out of stock",
    chip: "bg-red-50 text-red-700",
    dot: "bg-red-500",
    bar: "bg-red-500",
    tile: "bg-red-50 text-red-500",
  },
  unknown: {
    label: "Stock not reported",
    chip: "bg-slate-100 text-slate-600",
    dot: "bg-slate-300",
    bar: "bg-slate-300",
    tile: "bg-slate-100 text-slate-500",
  },
  offline: {
    label: "Offline",
    chip: "bg-slate-100 text-slate-600",
    dot: "bg-slate-400",
    bar: "bg-slate-400",
    tile: "bg-slate-100 text-slate-500",
  },
};

export function formatPrice(amount: number | null, currency = "INR"): string {
  if (amount === null) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

export function timeAgo(iso: string | null): string {
  if (!iso) return "Unknown";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Unknown";
  const mins = Math.max(0, Math.round((Date.now() - then) / 60_000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

