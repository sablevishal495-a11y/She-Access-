import { Activity, ArrowLeft, ArrowUpRight, Clock3, MapPin, Navigation, Package, PackageCheck } from "lucide-react";
import { directionsUrl, formatDistance } from "@/lib/geo";
import { formatPrice, getStatus, STATUS_META, timeAgo } from "@/lib/stock";
import type { MachineWithDistance } from "@/types";
import { cn } from "@/utils/cn";
import { StockBar } from "./StockBar";

interface Props {
  machine: MachineWithDistance;
  showDistance: boolean;
  onClose: () => void;
}

export function MachineDetail({ machine, showDistance, onClose }: Props) {
  const status = getStatus(machine);
  const meta = STATUS_META[status];
  const hasLevel = machine.stock !== null && machine.capacity !== null;
  const percentage = hasLevel ? Math.round(Math.max(0, Math.min(100, (machine.stock! / Math.max(machine.capacity!, 1)) * 100))) : 0;

  return (
    <div className="detail-enter flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-7 pb-8 pt-6 max-md:px-5 max-md:pt-4">
        <button type="button" onClick={onClose} className="inline-flex items-center gap-2 text-[13px] font-semibold text-brand-700 transition hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to locations
        </button>

        <div className="mt-9 flex items-center justify-between gap-3 max-md:mt-6">
          <span className={cn("inline-flex items-center gap-2 text-xs font-bold", status === "available" ? "text-emerald-700" : status === "low" ? "text-amber-700" : status === "empty" ? "text-rose-600" : "text-slate-500")}>
            <span className={cn("h-2 w-2 rounded-full", meta.dot)} aria-hidden="true" />{meta.label}
          </span>
          {showDistance && machine.distanceKm !== null && <span className="text-xs text-[#8790a1]">{formatDistance(machine.distanceKm)} away</span>}
        </div>
        <h2 className="mt-3 text-[27px] font-bold leading-[1.15] tracking-[-0.04em] text-[#1d2940] max-md:text-[24px]">
          {machine.name}
        </h2>
        <p className="mt-3 flex items-start gap-2 text-[13px] leading-relaxed text-[#788195]">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
          {machine.address || "Address not available"}
        </p>

        {status === "offline" && (
          <p className="mt-5 border-l-2 border-amber-400 pl-3 text-[13px] leading-relaxed text-amber-800">
            This machine is not reporting right now. Its last known stock may be out of date.
          </p>
        )}

        <div className="mt-8 grid grid-cols-2 gap-6 border-y border-[#e9edf2] py-6 max-md:mt-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c94a4]">Price per pad</p>
            <p className="mt-2 text-[31px] font-bold leading-none tracking-tight text-brand-700">{formatPrice(machine.pricePerPad, machine.currency)}</p>
          </div>
          <div className="border-l border-[#e9edf2] pl-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c94a4]">{status === "offline" ? "Last reported stock" : "Pads available"}</p>
            <p className="mt-2 text-[31px] font-bold leading-none tracking-tight text-[#1d2940]">
              {machine.stock ?? "—"}{machine.capacity !== null && <span className="ml-1 text-sm font-medium text-[#a4acba]">/ {machine.capacity}</span>}
            </p>
          </div>
        </div>

        {hasLevel && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between text-xs text-[#7f899b]"><span>Stock level</span><span>{percentage}%</span></div>
            <StockBar stock={machine.stock!} capacity={machine.capacity!} status={status} />
          </div>
        )}

        <dl className="mt-7 divide-y divide-[#edf0f3] text-[13px]">
          {machine.productName && <InfoRow icon={<Package className="h-4 w-4" />} label="Product">{machine.productName}</InfoRow>}
          <InfoRow icon={<Activity className="h-4 w-4" />} label="Last online">{machine.lastSeenAt ? timeAgo(machine.lastSeenAt) : "Not reported"}</InfoRow>
          {machine.openHours && <InfoRow icon={<Clock3 className="h-4 w-4" />} label="Open hours">{machine.openHours}</InfoRow>}
          {machine.lastRestockedAt && <InfoRow icon={<PackageCheck className="h-4 w-4" />} label="Last refilled">{timeAgo(machine.lastRestockedAt)}</InfoRow>}
        </dl>

        {machine.products.length > 0 && (
          <div className="mt-7">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8c94a4]">Products</p>
            <ul className="mt-3 divide-y divide-[#edf0f3] text-[13px]">
              {machine.products.map((product) => (
                <li key={product.name} className="flex items-center justify-between gap-3 py-3">
                  <span className="font-semibold capitalize text-[#25314c]">{product.name}</span>
                  <span className="text-right text-[#7b8495]">
                    {product.price !== null && <span className="mr-3 font-bold text-brand-700">{formatPrice(product.price, machine.currency)}</span>}
                    {product.stock ?? "—"}{product.capacity !== null && ` / ${product.capacity}`} left
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>

      <div className="border-t border-[#edf0f3] bg-white px-7 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-4 max-md:px-5">
        {!machine.location ? (
          <button type="button" disabled className="inline-flex h-13 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-[#eef0f5] text-sm font-semibold text-[#818a9d]">
            <Navigation className="h-4 w-4" aria-hidden="true" /> No map location for this machine
          </button>
        ) : (
          <a href={directionsUrl(machine.location)} target="_blank" rel="noopener noreferrer" className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-semibold text-white transition hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-200">
            Get walking directions <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-4">
      <dt className="flex items-center gap-2.5 text-[#7b8495]"><span className="text-brand-500" aria-hidden="true">{icon}</span>{label}</dt>
      <dd className="text-right font-semibold text-[#25314c]">{children}</dd>
    </div>
  );
}