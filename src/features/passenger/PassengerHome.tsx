import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  MapPin,
  Zap,
  Users,
  ArrowRight,
  Bike,
  Bus,
  Car,
} from "lucide-react"
import { supabase, type Activity, type Route } from "../../lib/supabase"
import { useAuthStore } from "../../store/authStore"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import MatatuAnimation from "../../components/MatatuAnimation"

const vehicleIcons = {
  matatu: Bus,
  bus: Bus,
  taxi: Car,
  bodaboda: Bike,
}

export default function PassengerHome() {
  const { profile } = useAuthStore()
  const [activities, setActivities] = useState<Activity[]>([])
  const [routes, setRoutes] = useState<Route[]>([])
  const [search, setSearch] = useState("")
  const [counts, setCounts] = useState({ routes: 0, drivers: 0, vehicles: 0 })
  const [countsLoading, setCountsLoading] = useState(true)
  const [countsError, setCountsError] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    void supabase.rpc("release_expired_booking_seats").then(({ error }) => {
      if (error) console.error("Could not release expired seat holds", error)
    })
    supabase
      .from("activities")
      .select("*")
      .eq("active", true)
      .limit(4)
      .then(({ data }) => setActivities(data ?? []))
    supabase
      .from("routes")
      .select("*")
      .eq("active", true)
      .limit(8)
      .then(({ data }) => setRoutes(data ?? []))
    Promise.all([
      supabase.from("routes").select("id", { count: "exact", head: true }).eq("active", true),
      supabase.rpc("count_active_drivers"),
      supabase.rpc("count_active_vehicles"),
    ]).then(([routeCount, driverCount, vehicleCount]) => {
      if (routeCount.error || driverCount.error || vehicleCount.error) {
        console.error("Passenger home count query failed", routeCount.error ?? driverCount.error ?? vehicleCount.error)
        setCountsError(true)
        return
      }
      setCounts({ routes: routeCount.count ?? 0, drivers: Number(driverCount.data ?? 0), vehicles: Number(vehicleCount.data ?? 0) })
    }).finally(() => setCountsLoading(false))
  }, [])

  const filtered = routes.filter(
    (r) =>
      r.origin.toLowerCase().includes(search.toLowerCase()) ||
      r.destination.toLowerCase().includes(search.toLowerCase()) ||
      r.name.toLowerCase().includes(search.toLowerCase()),
  )

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[#64748b] text-sm mb-1">{greeting},</p>
        <h1
          className="text-3xl font-bold text-[#f0f4ff]"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          {profile?.full_name?.split(" ")[0] ?? "Traveller"}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#94a3b8]">
          Kenya moves better with Safiri. Find trusted rides, book your seat in
          minutes, and pay securely—all in one place.
        </p>
        <MatatuAnimation />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-3 sm:gap-4">
        {[
          {
            icon: <MapPin size={16} className="text-[#f97316]" />,
            label: "Routes",
            value: counts.routes.toLocaleString(),
          },
          {
            icon: <Users size={16} className="text-[#22c55e]" />,
            label: "Drivers",
            value: counts.drivers.toLocaleString(),
          },
          {
            icon: <Bus size={16} className="text-[#38bdf8]" />,
            label: "Vehicles",
            value: counts.vehicles.toLocaleString(),
          },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="mb-2 flex min-h-9 items-center gap-2">
              {s.icon}
              <span className="text-xs font-medium leading-4 text-[#94a3b8]">{s.label}</span>
            </div>
            <div className="text-3xl font-bold tabular-nums text-[#f0f4ff]">{countsLoading || countsError ? "—" : s.value}</div>
          </Card>
        ))}
      </div>
      {countsError && <p className="-mt-6 mb-8 text-xs text-amber-300">Live counts unavailable. Check the Safiri database migrations, then refresh this page.</p>}
      {!countsLoading && !countsError && counts.drivers === 0 && counts.vehicles === 0 && <p className="-mt-6 mb-8 text-xs text-[#64748b]">No non-banned drivers or active vehicles are registered yet. Admins can add drivers under Users and register vehicles under Vehicles.</p>}

      {/* Quick book */}
      <div className="bg-gradient-to-r from-[#f97316] to-[#ea580c] rounded-2xl p-6 mb-8 relative overflow-hidden">
        <Bus
          size={128}
          className="absolute right-3 top-3 opacity-10"
          aria-hidden="true"
        />
        <h2 className="text-xl font-bold text-white mb-1">Where to?</h2>
        <p className="text-orange-100/80 text-sm mb-4">
          Search any route across Nairobi
        </p>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search origin or destination…"
            className="flex-1 bg-white/20 placeholder:text-orange-100/60 text-white rounded-xl px-4 py-2.5 text-sm outline-none focus:bg-white/30 transition-all border border-white/20"
          />
          <Button
            variant="secondary"
            onClick={() =>
              navigate(`/passenger/routes?search=${encodeURIComponent(search)}`)
            }
            className="bg-white text-orange-600 hover:bg-orange-50 border-0"
          >
            Search
          </Button>
        </div>
      </div>

      {/* Vehicle types */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-[#f0f4ff] mb-4">
          Browse by vehicle
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { type: "matatu", label: "Matatus", color: "#f97316" },
            { type: "bus", label: "Buses", color: "#3b82f6" },
            { type: "taxi", label: "Taxis", color: "#f59e0b" },
            { type: "bodaboda", label: "Bodabodas", color: "#22c55e" },
          ].map((v) => {
            const VehicleIcon = vehicleIcons[v.type as keyof typeof vehicleIcons]
            return (
              <Card
                key={v.type}
                hover
                onClick={() => navigate(`/passenger/vehicles?type=${v.type}`)}
                className="p-4 text-center"
              >
                <div
                  className="mb-2 flex justify-center"
                  style={{ color: v.color }}
                >
                  <VehicleIcon size={30} />
                </div>
                <div className="text-sm font-medium text-[#f0f4ff]">
                  {v.label}
                </div>
                <div
                  className="w-6 h-0.5 mx-auto mt-2 rounded-full"
                  style={{ backgroundColor: v.color }}
                />
              </Card>
            )
          })}
        </div>
      </div>

      {/* Popular routes */}
      {filtered.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#f0f4ff]">
              {search ? "Results" : "Popular routes"}
            </h2>
            <button
              onClick={() => navigate("/passenger/routes")}
              className="text-sm text-[#f97316] flex items-center gap-1 hover:gap-2 transition-all"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>
          <div className="grid gap-3">
            {filtered.slice(0, 5).map((r) => (
              <Card
                key={r.id}
                hover
                onClick={() => navigate(`/passenger/routes?id=${r.id}`)}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1a2235] flex items-center justify-center">
                    <MapPin size={16} className="text-[#f97316]" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[#f0f4ff]">
                      {r.name}
                    </div>
                    <div className="text-xs text-[#64748b]">
                      {r.origin} → {r.destination}
                    </div>
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
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Activities */}
      {activities.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#f0f4ff]">
              Featured activities
            </h2>
            <Badge variant="info">
              <Zap size={10} />
              New
            </Badge>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {activities.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => navigate(`/passenger/activities?book=${encodeURIComponent(a.id)}`)}
                aria-label={`Book ${a.title}`}
                className="group overflow-hidden rounded-2xl border border-white/8 bg-[#111827] text-left transition hover:border-orange-500/30 hover:bg-[#141e33] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f97316]"
              >
                {a.image_url && (
                  <div className="h-36 bg-[#1a2235] overflow-hidden">
                    <img
                      src={a.image_url}
                      alt={a.title}
                      className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity"
                    />
                  </div>
                )}
                <span className="block p-4">
                  <Badge variant="info" className="mb-2">
                    {a.type}
                  </Badge>
                  <h3 className="font-semibold text-[#f0f4ff] mb-1">
                    {a.title}
                  </h3>
                  <p className="text-xs text-[#64748b] line-clamp-2">
                    {a.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#f97316]">
                    Book this experience <ArrowRight size={13} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
