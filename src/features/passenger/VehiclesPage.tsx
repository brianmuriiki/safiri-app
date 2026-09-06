import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bike, Bus, Car, MapPin, Route as RouteIcon } from "lucide-react";
import { supabase, type Route, type Vehicle } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

const vehicleIcons = {
  matatu: Bus,
  bus: Bus,
  taxi: Car,
  bodaboda: Bike,
};

type VType = "matatu" | "bus" | "taxi" | "bodaboda";
type SortBy = "location" | "route";

const tabs: { id: VType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "matatu", label: "Matatus" },
  { id: "bus", label: "Buses" },
  { id: "taxi", label: "Taxis" },
  { id: "bodaboda", label: "Bodabodas" },
];

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [availableSchedules, setAvailableSchedules] = useState<Record<string, string>>({});
  const [routeDetails, setRouteDetails] = useState<Record<string, Pick<Route, "name" | "location">>>({});
  const [sortBy, setSortBy] = useState<SortBy>("location");
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const activeTab = (searchParams.get("type") ?? "all") as VType | "all";

  useEffect(() => {
    supabase
      .from("vehicles")
      .select("*")
      .eq("status", "active")
      .then(({ data, error }) => {
        if (error) toast.error(`Could not load vehicles: ${error.message}`);
        else setVehicles(data ?? []);
      });

    // Route metadata is optional for the vehicle list. Loading it separately
    // means vehicles remain visible on older databases that do not yet have
    // the new location field or where route access is restricted.
    supabase
      .from("routes")
      .select("id, name, location")
      .then(({ data }) => {
        const details: Record<string, Pick<Route, "name" | "location">> = {};
        (data ?? []).forEach((route) => {
          details[route.id] = route;
        });
        setRouteDetails(details);
      });

    supabase
      .from("schedules")
      .select("id, vehicle_id")
      .eq("status", "scheduled")
      .gt("seats_available", 0)
      .gte("departure_at", new Date().toISOString())
      .order("departure_at")
      .then(({ data }) => {
        const nextScheduleByVehicle: Record<string, string> = {};
        (data ?? []).forEach((schedule) => {
          if (!nextScheduleByVehicle[schedule.vehicle_id]) {
            nextScheduleByVehicle[schedule.vehicle_id] = schedule.id;
          }
        });
        setAvailableSchedules(nextScheduleByVehicle);
      });
  }, []);

  const filtered =
    activeTab === "all"
      ? vehicles
      : vehicles.filter((v) => v.type === activeTab);
  const sorted = [...filtered].sort((first, second) => {
    const firstRoute = first.route_id ? routeDetails[first.route_id] : null;
    const secondRoute = second.route_id ? routeDetails[second.route_id] : null;
    const firstValue = sortBy === "location"
      ? first.location ?? firstRoute?.location ?? ""
      : firstRoute?.name ?? "";
    const secondValue = sortBy === "location"
      ? second.location ?? secondRoute?.location ?? ""
      : secondRoute?.name ?? "";
    return firstValue.localeCompare(secondValue);
  });

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Vehicles
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        Browse all registered vehicles on the Safiri network
      </p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() =>
              t.id === "all"
                ? setSearchParams({})
                : setSearchParams({ type: t.id })
            }
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === t.id
                ? "bg-[#f97316] text-white"
                : "bg-[#1a2235] text-[#64748b] hover:text-[#f0f4ff]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-5 flex items-center justify-end gap-2">
        <label htmlFor="vehicle-sort" className="text-xs text-[#64748b]">Sort by</label>
        <select
          id="vehicle-sort"
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as SortBy)}
          className="rounded-lg border border-white/10 bg-[#1a2235] px-3 py-2 text-sm text-[#f0f4ff] outline-none focus:border-[#f97316]"
        >
          <option value="location">Location</option>
          <option value="route">Route</option>
        </select>
      </div>

      {sorted.length === 0 ? (
        <Card className="p-10 text-center">
          <Car size={42} className="mx-auto mb-3 text-[#64748b]" />
          <div className="text-[#64748b]">No vehicles found</div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((v) => {
            const scheduleId = availableSchedules[v.id];
            const route = v.route_id ? routeDetails[v.route_id] : null;
            const VehicleIcon = vehicleIcons[v.type] ?? Car;
            return (
            <Card key={v.id} hover className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-[#f97316]"><VehicleIcon size={23} /></div>
                <Badge variant={scheduleId ? "success" : "default"}>
                  {scheduleId ? "Available" : "On request"}
                </Badge>
              </div>
              <div className="font-semibold text-[#f0f4ff] mb-1">
                {v.model ?? v.type.charAt(0).toUpperCase() + v.type.slice(1)}
              </div>
              <div className="text-xs text-[#64748b] mb-3">
                {v.number_plate} · {v.color ?? "—"}
              </div>
              <div className="mb-3 space-y-1 text-xs text-[#64748b]">
                <div className="flex items-center gap-1.5"><MapPin size={12} /> {v.location ?? route?.location ?? "Location not listed"}</div>
                <div className="flex items-center gap-1.5"><RouteIcon size={12} /> {route?.name ?? "Route not assigned"}</div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#64748b]">Capacity</span>
                <span className="font-medium text-[#f0f4ff]">
                  {v.seat_count} seats
                </span>
              </div>
              <Button
                size="sm"
                className="mt-4 w-full"
                onClick={() => {
                  if (scheduleId) {
                    navigate(`/passenger/book/${scheduleId}`);
                    return;
                  }
                  navigate(
                    v.route_id
                      ? `/passenger/routes?id=${v.route_id}`
                      : "/passenger/routes"
                  );
                }}
              >
                {scheduleId ? "Book now" : "Request a trip"}
              </Button>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
