import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import { useAuthStore } from "../../store/authStore"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import { toast } from "../../components/ui/Toast"
import { User, MapPin, ArrowRight, Users, Search, X, RotateCcw } from "lucide-react"

interface PassengerRow {
  id: string
  passenger_id: string
  seat_number: number | null
  status: string
  profiles: {
    full_name: string | null
    email: string
    phone: string | null
  } | null
  schedules: {
    departure_at: string
    routes: { name: string; origin: string; destination: string } | null
  } | null
}

export default function DriverPassengers() {
  const { profile } = useAuthStore()
  const [passengers, setPassengers] = useState<PassengerRow[]>([])
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!profile) return
    supabase
      .from("bookings")
      .select(
        "id, passenger_id, seat_number, status, profiles!passenger_id(full_name, email, phone), schedules!bookings_schedule_id_fkey!inner(departure_at, routes(name, origin, destination))",
      )
      .eq("schedules.driver_id", profile.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Could not load passengers: ${error.message}`)
        else setPassengers((data ?? []) as any)
      })
  }, [profile])

  const visiblePassengers = passengers.filter((passenger) => {
    const name = passenger.profiles?.full_name ?? ""
    const email = passenger.profiles?.email ?? ""
    const query = search.trim().toLowerCase()
    return !query || name.toLowerCase().includes(query) || email.toLowerCase().includes(query)
  })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Passengers
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        All confirmed passengers on your routes
      </p>

      <div className="mb-5 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search passengers…"
            className="w-full rounded-xl border border-white/10 bg-[#1a2235] py-2.5 pl-10 pr-10 text-sm text-[#f0f4ff] placeholder:text-[#64748b] outline-none focus:border-[#f97316]"
          />
          {search && (
            <button type="button" aria-label="Clear passenger search" onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748b] hover:text-white">
              <X size={16} />
            </button>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setSearch("")}>
          <RotateCcw size={14} />
          Clear
        </Button>
      </div>

      {passengers.length === 0 ? (
        <Card className="p-8 text-center">
          <Users size={42} className="mx-auto mb-3 text-[#64748b]" />
          <div className="text-[#64748b] text-sm">
            No confirmed passengers yet
          </div>
        </Card>
      ) : visiblePassengers.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[#64748b]">
          No passengers match “{search}”.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visiblePassengers.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1a2235] flex items-center justify-center text-sm font-bold text-[#f97316]">
                    {p.profiles?.full_name?.charAt(0) ??
                      p.profiles?.email?.charAt(0) ??
                      "?"}
                  </div>
                  <div>
                    <div className="font-medium text-[#f0f4ff] text-sm">
                      {p.profiles?.full_name ?? "Anonymous"}
                    </div>
                    <div className="text-xs text-[#64748b]">
                      {p.profiles?.phone ?? p.profiles?.email}
                    </div>
                  </div>
                </div>
                {p.seat_number && (
                  <Badge variant="info">Seat {p.seat_number}</Badge>
                )}
              </div>
              {p.schedules && (
                <div className="flex items-center gap-2 text-xs text-[#64748b]">
                  <MapPin size={11} className="text-[#f97316]" />
                  <span>
                    {(p.schedules.routes as any)?.origin}
                    <ArrowRight size={9} className="inline mx-1" />
                    {(p.schedules.routes as any)?.destination}
                  </span>
                  <span>·</span>
                  <span>
                    {new Date(p.schedules.departure_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
