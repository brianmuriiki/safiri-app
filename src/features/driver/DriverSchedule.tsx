import { useEffect, useState } from "react";
import { supabase, type Schedule } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { Clock, MapPin, ArrowRight, Users, CalendarDays } from "lucide-react";

export default function DriverSchedule() {
  const { profile } = useAuthStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("schedules")
      .select("*, routes(*), vehicles(*)")
      .eq("driver_id", profile.id)
      .order("departure_at", { ascending: false })
      .then(({ data }) => setSchedules(data ?? []));
  }, [profile]);

  const statusVariant = (s: string) =>
    s === "completed"
      ? "success"
      : s === "in_progress"
        ? "info"
        : s === "cancelled"
          ? "danger"
          : "default";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        My Schedule
      </h1>
      <p className="text-[#64748b] text-sm mb-6">All assigned routes</p>

      {schedules.length === 0 ? (
        <Card className="p-8 text-center">
          <CalendarDays size={42} className="mx-auto mb-3 text-[#64748b]" />
          <div className="text-[#64748b] text-sm">No schedules assigned yet</div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {schedules.map((s) => {
            const route = s.routes as any;
            const vehicle = s.vehicles as any;
            return (
              <Card key={s.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-[#f0f4ff] text-sm">
                      {route?.name}
                    </div>
                    <div className="text-xs text-[#64748b] flex items-center gap-1 mt-0.5">
                      <MapPin size={9} className="text-[#f97316]" />
                      {route?.origin}
                      <ArrowRight size={9} />
                      {route?.destination}
                    </div>
                  </div>
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-[#64748b]">
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {new Date(s.departure_at).toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={11} />
                    {s.seats_available} seats left
                  </span>
                  <span>
                    {vehicle?.type} · {vehicle?.number_plate}
                  </span>
                  <span className="text-[#f97316] font-medium">
                    KES {s.price}
                  </span>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
