import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Crosshair, LocateFixed, LogOut, MapPin, MapPinOff, RefreshCw, Search, UserRound, WifiOff, X } from "lucide-react";
import { Button } from "@/components/shared/Button";
import { LogoMark, Wordmark } from "@/components/shared/Logo";
import { MachineCard, MachineCardSkeleton } from "@/components/MachineCard";
import { MachineDetail } from "@/components/MachineDetail";
import { MapView } from "@/components/MapView";
import { useBackHandler } from "@/lib/backButton";
import { config } from "@/config";
import { haversineKm } from "@/lib/geo";
import { getStatus } from "@/lib/stock";
import { fetchMachines, toUserMessage } from "@/services/api/api";
import { getUserLocation, LocationError, type LocationIssue } from "@/services/location";
import type { Coordinates, MachineWithDistance, Session, VendingMachine } from "@/types";
import { cn } from "@/utils/cn";

interface Props {
  session: Session;
  onLogout: () => void;
}

type Filter = "all" | "instock";
type LoadStatus = "loading" | "ready" | "error";

const LOCATION_ISSUE: Record<LocationIssue, string> = {
  denied: "Location permission is off.",
  unavailable: "Your location is unavailable right now.",
  timeout: "Finding your location took too long.",
};

export default function DashboardScreen({ session, onLogout }: Props) {
  const [center, setCenter] = useState<Coordinates>(config.defaultLocation);
  const [located, setLocated] = useState(false);
  const [locationIssue, setLocationIssue] = useState<LocationIssue | null>(null);
  const [locating, setLocating] = useState(false);
  const [machines, setMachines] = useState<VendingMachine[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [lastPage, setLastPage] = useState(true);
  const [total, setTotal] = useState<number | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [moreError, setMoreError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [focus, setFocus] = useState<{ key: number; mode: "overview" | "me" }>({ key: 0, mode: "overview" });
  const [menuOpen, setMenuOpen] = useState(false);
  const runRef = useRef(0);

  /** Loads page 0 for the current search, replacing the list. */
  const load = useCallback(async (term: string) => {
    const run = ++runRef.current;
    setStatus("loading");
    setError("");
    setMoreError("");
    setLoadingMore(false);
    setSelectedId(null);
    try {
      const result = await fetchMachines({ page: 0, search: term });
      if (run !== runRef.current) return;
      setMachines(result.machines);
      setPage(0);
      setLastPage(result.last);
      setTotal(result.total);
      setStatus("ready");
      setFocus((previous) => ({ key: previous.key + 1, mode: "overview" }));
    } catch (err) {
      if (run !== runRef.current) return;
      setError(toUserMessage(err, "We couldn't load machines."));
      setStatus("error");
    }
  }, []);

  /** Appends the next page to the list. */
  async function loadMore() {
    if (loadingMore || lastPage) return;
    const run = runRef.current;
    setLoadingMore(true);
    setMoreError("");
    try {
      const result = await fetchMachines({ page: page + 1, search });
      if (run !== runRef.current) return;
      setMachines((previous) => {
        const seen = new Set(previous.map((machine) => machine.id));
        return [...previous, ...result.machines.filter((machine) => !seen.has(machine.id))];
      });
      setPage(result.page);
      setLastPage(result.last || result.machines.length === 0);
      if (result.total !== null) setTotal(result.total);
    } catch (err) {
      if (run !== runRef.current) return;
      setMoreError(toUserMessage(err, "We couldn't load more machines."));
    } finally {
      if (run === runRef.current) setLoadingMore(false);
    }
  }

  // Wait until the user stops typing, then ask the API.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 400);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void load(search);
    return () => { runRef.current += 1; };
  }, [load, search]);

  useBackHandler(() => {
    if (menuOpen) { setMenuOpen(false); return true; }
    if (selectedId) { setSelectedId(null); return true; }
    return false;
  });

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (menuOpen) setMenuOpen(false);
      else if (selectedId) setSelectedId(null);
    }
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [menuOpen, selectedId]);

  async function locate() {
    if (locating) return;
    setLocating(true);
    setLocationIssue(null);
    try {
      const coordinates = await getUserLocation();
      setCenter(coordinates);
      setLocated(true);
      setFocus((previous) => ({ key: previous.key + 1, mode: "me" }));
    } catch (err) {
      setLocationIssue(err instanceof LocationError ? err.reason : "unavailable");
    } finally {
      setLocating(false);
    }
  }

  const items = useMemo<MachineWithDistance[]>(() => {
    const withDistance = machines.map((machine) => ({
      ...machine,
      distanceKm: machine.location ? haversineKm(center, machine.location) : null,
    }));
    if (!located) return withDistance; // keep the API's order until we know where the user is
    return withDistance.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
  }, [center, located, machines]);

  const inStockCount = useMemo(() => items.filter((machine) => {
    const machineStatus = getStatus(machine);
    return machineStatus === "available" || machineStatus === "low";
  }).length, [items]);

  const visible = useMemo(() => items.filter((machine) => {
    if (filter === "all") return true;
    const machineStatus = getStatus(machine);
    return machineStatus === "available" || machineStatus === "low";
  }), [items, filter]);

  const selected = items.find((machine) => machine.id === selectedId) ?? null;
  const loading = status === "loading";

  function chooseFilter(next: Filter) {
    setFilter(next);
    setSelectedId(null);
  }

  function recenter() {
    setSelectedId(null);
    setFocus((previous) => ({ key: previous.key + 1, mode: located ? "me" : "overview" }));
  }

  return (
    <div className="dashboard-shell">
      <header className="dashboard-header">
        <div className="flex items-center gap-2.5">
          <LogoMark size={36} />
          <Wordmark />
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden max-w-[160px] truncate text-sm font-semibold text-[#4c5970] sm:block">Hi, {session.user.name}</span>
          <div className="relative">
            <button
              type="button"
              aria-label="Account menu"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8ebf2] bg-[#f7f8fc] text-[#4c5970] transition hover:border-brand-300 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
            >
              <UserRound className="h-[18px] w-[18px]" aria-hidden="true" />
            </button>
            {menuOpen && (
              <>
                <button type="button" aria-label="Close account menu" className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} />
                <div role="menu" className="absolute right-0 top-12 z-20 w-60 rounded-xl border border-[#edf0f3] bg-white p-2 shadow-[0_18px_50px_rgba(30,41,72,0.14)]">
                  <div className="border-b border-[#edf0f3] px-3 py-3">
                    <p className="text-[11px] text-[#8b94a6]">Signed in as</p>
                    <p className="mt-1 truncate text-sm font-semibold text-[#1d2940]">{session.user.name}</p>
                  </div>
                  <button type="button" role="menuitem" onClick={onLogout} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold text-[#bd4f5d] transition hover:bg-[#fff2f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
                    <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="results-panel" aria-label="Nearby machines">
          <div className="mobile-sheet-handle" aria-hidden="true" />
          {selected ? (
            <MachineDetail key={selected.id} machine={selected} showDistance={located} onClose={() => setSelectedId(null)} />
          ) : (
            <>
              <div className="results-panel__top">
                <p className="results-eyebrow">HI, {session.user.name.toUpperCase()}</p>
                <h1 className="results-title">Care, close by.</h1>
                <p className="results-description">Find a sanitary pad vending machine when you need one.</p>

                <div className="area-control">
                  <MapPin className="h-[18px] w-[18px] shrink-0 text-brand-600" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8992a3]">{located ? "Sorted by distance" : "Showing"}</p>
                    <p className="mt-0.5 truncate text-[14px] font-bold text-[#283550]">{located ? "Nearest to you first" : "All machines"}</p>
                  </div>
                  <button type="button" onClick={() => void locate()} disabled={locating} aria-label="Use my current location" title="Use my current location" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700 transition hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-60">
                    <LocateFixed className={cn("h-[19px] w-[19px]", locating && "animate-pulse")} aria-hidden="true" />
                  </button>
                </div>

                {locationIssue && (
                  <p role="alert" className="mt-3 text-xs leading-relaxed text-amber-800">
                    {LOCATION_ISSUE[locationIssue]} Showing all machines instead. <button type="button" className="font-bold underline underline-offset-2" onClick={() => void locate()}>Try again</button>
                  </p>
                )}

                <div className="search-control">
                  <Search className="h-[18px] w-[18px] shrink-0 text-[#8993a5]" aria-hidden="true" />
                  <input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setSelectedId(null); }} placeholder="Search by name or location" aria-label="Search by name or location" className="min-w-0 flex-1 bg-transparent text-[13px] text-[#27344e] outline-none placeholder:text-[#a0a8b6]" />
                  {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-[#8b95a7] hover:text-[#29364f]"><X className="h-4 w-4" /></button>}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3">
                  <div className="flex gap-5" role="group" aria-label="Filter machines">
                    <FilterTab active={filter === "all"} onClick={() => chooseFilter("all")}>All <span>{total ?? items.length}</span></FilterTab>
                    <FilterTab active={filter === "instock"} onClick={() => chooseFilter("instock")}>In stock <span>{inStockCount}</span></FilterTab>
                  </div>
                  <button type="button" onClick={() => void load(search)} disabled={loading} aria-label="Refresh machines" title="Refresh machines" className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg text-[#8c96a8] transition hover:bg-[#f2f4f9] hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 disabled:opacity-50">
                    <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="results-panel__scroll" aria-live="polite">
                {loading && <div aria-busy="true" aria-label="Loading machines"><MachineCardSkeleton /><MachineCardSkeleton /><MachineCardSkeleton /></div>}
                {status === "error" && <EmptyState icon={<WifiOff className="h-6 w-6" />} title="Couldn't load locations" message={error} action={<Button onClick={() => void load(search)}>Try again</Button>} />}
                {status === "ready" && items.length === 0 && <EmptyState icon={<MapPinOff className="h-6 w-6" />} title={search ? "No matching machines" : "No machines yet"} message={search ? `Nothing found for "${search}". Try another name or location.` : "No machines are listed right now."} action={search ? <Button variant="soft" onClick={() => setQuery("")}>Clear search</Button> : undefined} />}
                {status === "ready" && items.length > 0 && visible.length === 0 && <EmptyState icon={<Search className="h-6 w-6" />} title="Nothing in stock" message="None of the loaded machines are reporting stock right now." action={<Button variant="soft" onClick={() => chooseFilter("all")}>Show all machines</Button>} />}
                {status === "ready" && visible.length > 0 && (
                  <ul>
                    {visible.map((machine) => <li key={machine.id}><MachineCard machine={machine} showDistance={located} onSelect={setSelectedId} /></li>)}
                  </ul>
                )}
                {status === "ready" && !lastPage && (
                  <div className="px-7 py-5 max-md:px-5">
                    {moreError && <p role="alert" className="mb-3 text-center text-xs text-rose-600">{moreError}</p>}
                    <Button variant="soft" loading={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Loading" : "Load more machines"}</Button>
                  </div>
                )}
              </div>

            </>
          )}
        </section>

        <section className="map-panel" aria-label="Machine map">
          <MapView center={center} user={located ? center : null} machines={visible} selectedId={selectedId} focusKey={focus.key} focusMode={focus.mode} onSelect={setSelectedId} />
          <button type="button" onClick={recenter} aria-label="Recenter map" title="Recenter map" className="map-recenter">
            <Crosshair className="h-[19px] w-[19px]" aria-hidden="true" />
          </button>
        </section>
      </main>
    </div>
  );
}

function FilterTab({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={cn("filter-tab", active && "filter-tab--active")}>{children}</button>;
}

function EmptyState({ icon, title, message, action }: { icon: ReactNode; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-8 py-12 text-center max-md:py-8">
      <span className="text-brand-500" aria-hidden="true">{icon}</span>
      <h2 className="mt-4 text-base font-bold text-[#25314c]">{title}</h2>
      <p className="mt-2 max-w-[260px] text-[13px] leading-relaxed text-[#8490a1]">{message}</p>
      {action && <div className="mt-5 w-full max-w-[220px]">{action}</div>}
    </div>
  );
}