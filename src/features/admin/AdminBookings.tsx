import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { toast } from "../../components/ui/Toast";

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [passengers, setPassengers] = useState<Record<string, any>>({});
  const [schedules, setSchedules] = useState<Record<string, any>>({});
  const [payments, setPayments] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBookings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(`Could not load bookings: ${error.message}`);
        setLoading(false);
        return;
      }

      const rows = data ?? [];
      setBookings(rows);
      if (rows.length === 0) {
        setLoading(false);
        return;
      }

      const passengerIds = [...new Set(rows.map((booking) => booking.passenger_id).filter(Boolean))];
      const scheduleIds = [...new Set(rows.map((booking) => booking.schedule_id ?? booking.trip_id).filter(Boolean))];
      const bookingIds = rows.map((booking) => booking.id);
      const [profileResult, scheduleResult, paymentResult] = await Promise.all([
        supabase.from("profiles").select("id, full_name, email").in("id", passengerIds),
        supabase.from("schedules").select("id, departure_at, routes(name), vehicles(number_plate)").in("id", scheduleIds),
        supabase.from("payments").select("booking_id, amount, status, mpesa_receipt").in("booking_id", bookingIds),
      ]);

      const profileMap: Record<string, any> = {};
      (profileResult.data ?? []).forEach((profile) => { profileMap[profile.id] = profile; });
      setPassengers(profileMap);

      const scheduleMap: Record<string, any> = {};
      (scheduleResult.data ?? []).forEach((schedule) => { scheduleMap[schedule.id] = schedule; });
      setSchedules(scheduleMap);

      const paymentMap: Record<string, any> = {};
      (paymentResult.data ?? []).forEach((payment) => { paymentMap[payment.booking_id] = payment; });
      setPayments(paymentMap);
      setLoading(false);
    };

    void loadBookings();
  }, []);

  const bookingVariant = (status: string) =>
    status === "confirmed" ? "success" : status === "cancelled" ? "danger" : status === "pending" ? "warning" : "default";
  const paymentVariant = (status?: string) =>
    status === "confirmed" ? "success" : status === "failed" ? "danger" : "warning";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Bookings
      </h1>
      <p className="text-[#64748b] text-sm mb-6">All passenger bookings and payment records</p>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead>
            <tr className="border-b border-white/8">
              {['Passenger', 'Route & departure', 'Seat', 'Booking', 'Payment', 'Created'].map((heading) => (
                <th key={heading} className="px-4 py-3 text-left text-xs font-medium text-[#64748b]">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const passenger = passengers[booking.passenger_id];
              const schedule = schedules[booking.schedule_id ?? booking.trip_id];
              const payment = payments[booking.id];
              return (
                <tr key={booking.id} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#f0f4ff]">{passenger?.full_name ?? passenger?.email ?? "Passenger"}</div>
                    {passenger?.full_name && <div className="text-xs text-[#64748b]">{passenger.email}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#f0f4ff]">{schedule?.routes?.name ?? "—"}</div>
                    <div className="text-xs text-[#64748b]">
                      {schedule ? new Date(schedule.departure_at).toLocaleString() : "Schedule unavailable"}
                      {schedule?.vehicles?.number_plate ? ` · ${schedule.vehicles.number_plate}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">{booking.seat_number ?? "Any"}</td>
                  <td className="px-4 py-3"><Badge variant={bookingVariant(booking.status)}>{booking.status}</Badge></td>
                  <td className="px-4 py-3">
                    {payment ? (
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={paymentVariant(payment.status)}>{payment.status}</Badge>
                        <span className="text-xs text-[#64748b]">KES {payment.amount}</span>
                      </div>
                    ) : <span className="text-xs text-[#64748b]">No payment</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748b]">{new Date(booking.created_at).toLocaleString()}</td>
                </tr>
              );
            })}
            {!loading && bookings.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[#64748b]">No bookings yet</td></tr>
            )}
            {loading && (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-[#64748b]">Loading bookings…</td></tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
