import { useEffect, useState } from "react";
import { supabase, type Schedule, type Booking } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { MapPin, Clock, Users, ArrowRight, CalendarDays } from "lucide-react";

export default function DriverDashboard() {
  const { profile } = useAuthStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [todayBookings, setTodayBookings] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    supabase
      .from("schedules")
      .select("*, routes(*), vehicles(*)")
      .eq("driver_id", profile.id)
      .gte("departure_at", new Date().toISOString())
      .order("departure_at")
      .limit(5)
      .then(async ({ data }) => {
        setSchedules(data ?? []);
        setUpcomingCount(data?.length ?? 0);
        if (data && data.length > 0) {
          const ids = data.map((s) => s.id);
          const { count } = await supabase
            .from("bookings")
            .select("*", { count: "exact", head: true })
            .in("schedule_id", ids)
            .eq("status", "confirmed");
          setTodayBookings(count ?? 0);
        }
      });
  }, [profile]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Driver Dashboard
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        Welcome back,{" "}
        Welcome back, {profile?.full_name?.split(" ")[0] ?? "Driver"}
      </p>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          {
            label: "Upcoming trips",
            value: upcomingCount,
            color: "#f97316",
          },
          {
            label: "Confirmed passengers",
            value: todayBookings,
            color: "#22c55e",
          },
          { label: "Rating", value: "4.9 ★", color: "#f59e0b" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-2xl font-bold mb-1" style={{ color: s.color }}>
              {s.value}
            </div>
            <div className="text-xs text-[#64748b]">{s.label}</div>
          </Card>
        ))}
      </div>

      <h2 className="font-semibold text-[#f0f4ff] mb-3">
        Upcoming schedules
      </h2>
      <div className="flex flex-col gap-3">
        {schedules.length === 0 && (
          <Card className="p-8 text-center">
            <CalendarDays size={36} className="mx-auto mb-2 text-[#64748b]" />
            <div className="text-[#64748b] text-sm">
              No upcoming schedules assigned
            </div>
          </Card>
        )}
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
                    {route?.origin}
                    <ArrowRight size={10} />
                    {route?.destination}
                  </div>
                </div>
                <Badge
                  variant={
                    s.status === "scheduled"
                      ? "info"
                      : s.status === "in_progress"
                        ? "success"
                        : "default"
                  }
                >
                  {s.status}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#64748b]">
                <span className="flex items-center gap-1">
                  <Clock size={11} />
                  {new Date(s.departure_at).toLocaleString()}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={11} />
                  {s.seats_available} seats available
                </span>
                <span>{vehicle?.number_plate}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
