import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, ArrowRight, Search, Map } from "lucide-react";
import { supabase, type Route, type Schedule } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [selected, setSelected] = useState<Route | null>(null);
  const [scheduledRoutes, setScheduledRoutes] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
  }, [searchParams]);

  useEffect(() => {
    supabase
      .from("routes")
      .select("*")
      .eq("active", true)
      .then(({ data }) => setRoutes(data ?? []));

    supabase
      .from("schedules")
      .select("id, route_id, departure_at")
      .eq("status", "scheduled")
      .gte("departure_at", new Date().toISOString())
      .order("departure_at")
      .then(({ data }) => {
        const grouped: Record<string, string[]> = {};
        (data ?? []).forEach((schedule) => {
          if (!grouped[schedule.route_id]) grouped[schedule.route_id] = [];
          grouped[schedule.route_id].push(schedule.id);
        });
        setScheduledRoutes(grouped);
      });
  }, []);

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      const r = routes.find((r) => r.id === id);
      if (r) loadSchedules(r);
    }
  }, [searchParams, routes]);

  const loadSchedules = async (route: Route) => {
    setSelected(route);
    setLoading(true);
    const { data } = await supabase
      .from("schedules")
      .select("*, routes(*), vehicles(*), profiles!driver_id(*)")
      .eq("route_id", route.id)
      .eq("status", "scheduled")
      .gte("departure_at", new Date().toISOString())
      .order("departure_at");
    setSchedules(data ?? []);
    setLoading(false);
  };

  const filtered = routes.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.origin.toLowerCase().includes(search.toLowerCase()) ||
      r.destination.toLowerCase().includes(search.toLowerCase()) ||
      (r.location ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        All Routes
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        Pick a route to see available schedules
      </p>

      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search routes, origins, destinations…"
          className="w-full bg-[#1a2235] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#f0f4ff] placeholder:text-[#64748b] outline-none focus:border-[#f97316] transition-all"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Routes list */}
        <div className="flex flex-col gap-3">
          {filtered.map((r) => (
            <Card
              key={r.id}
              hover
              onClick={() => loadSchedules(r)}
              className={`p-4 transition-all ${selected?.id === r.id ? "border-orange-500/50 bg-[#1a2235]" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
                    <MapPin size={16} className="text-[#f97316]" />
                  </div>
                  <div>
                    <div className="font-medium text-[#f0f4ff] text-sm">
                      {r.name}
                    </div>
                    <div className="text-xs text-[#64748b] flex items-center gap-1 mt-0.5">
                      {r.origin}
                      <ArrowRight size={10} />
                      {r.destination}
                    </div>
                    {r.location && (
                      <div className="mt-1 text-xs text-[#64748b]">📍 {r.location}</div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#f97316]">
                    KES {r.base_fare}
                  </div>
                  <div className="text-xs text-[#64748b]">
                    {r.distance_km} km
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                <Badge variant={scheduledRoutes[r.id]?.length ? "success" : "default"}>
                  {scheduledRoutes[r.id]?.length ? "Available" : "Unavailable"}
                </Badge>
                <Button
                  size="sm"
                  disabled={!scheduledRoutes[r.id]?.length}
                  onClick={(event) => {
                    event.stopPropagation();
                    const scheduleId = scheduledRoutes[r.id]?.[0];
                    if (scheduleId) navigate(`/passenger/book/${scheduleId}`);
                  }}
                >
                  Book
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Schedules */}
        <div>
          {selected ? (
            <>
              <h2 className="font-semibold text-[#f0f4ff] mb-3">
                Schedules for {selected.name}
              </h2>
              {loading && (
                <div className="text-[#64748b] text-sm">Loading…</div>
              )}
              {!loading && schedules.length === 0 && (
                <Card className="p-6 text-center text-[#64748b] text-sm">
                  No upcoming schedules on this route.
                </Card>
              )}
              <div className="flex flex-col gap-3">
                {schedules.map((s) => (
                  <Card key={s.id} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-medium text-[#f0f4ff] text-sm">
                          {new Date(s.departure_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          →{" "}
                          {new Date(s.arrival_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="text-xs text-[#64748b]">
                          {new Date(s.departure_at).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge
                        variant={
                          s.seats_available > 5
                            ? "success"
                            : s.seats_available > 0
                              ? "warning"
                              : "danger"
                        }
                      >
                        {s.seats_available} seats
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-[#64748b]">
                        {(s.vehicles as any)?.type} ·{" "}
                        {(s.vehicles as any)?.number_plate}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-[#f97316]">
                          KES {s.price}
                        </span>
                        <Button
                          size="sm"
                          disabled={s.seats_available === 0}
                          onClick={() =>
                            navigate(`/passenger/book/${s.id}`)
                          }
                        >
                          Book
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card className="p-8 text-center">
              <Map size={36} className="mx-auto mb-3 text-[#64748b]" />
              <div className="text-[#64748b] text-sm">
                Select a route to see available departures
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
