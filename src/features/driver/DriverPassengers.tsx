import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { User, MapPin, ArrowRight, Users } from "lucide-react";

interface PassengerRow {
  id: string;
  passenger_id: string;
  seat_number: number | null;
  status: string;
  profiles: { full_name: string | null; email: string; phone: string | null } | null;
  schedules: {
    departure_at: string;
    routes: { name: string; origin: string; destination: string } | null;
  } | null;
}

export default function DriverPassengers() {
  const { profile } = useAuthStore();
  const [passengers, setPassengers] = useState<PassengerRow[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("bookings")
      .select(
        "id, passenger_id, seat_number, status, profiles!passenger_id(full_name, email, phone), schedules!inner(departure_at, routes(name, origin, destination))"
      )
      .eq("schedules.driver_id", profile.id)
      .eq("status", "confirmed")
      .order("created_at", { ascending: false })
      .then(({ data }) => setPassengers((data ?? []) as any));
  }, [profile]);

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

      {passengers.length === 0 ? (
        <Card className="p-8 text-center">
          <Users size={42} className="mx-auto mb-3 text-[#64748b]" />
          <div className="text-[#64748b] text-sm">No confirmed passengers yet</div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {passengers.map((p) => (
            <Card key={p.id} className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1a2235] flex items-center justify-center text-sm font-bold text-[#f97316]">
                    {p.profiles?.full_name?.charAt(0) ?? p.profiles?.email?.charAt(0) ?? "?"}
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
  );
}
