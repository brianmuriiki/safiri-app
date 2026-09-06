import { useEffect, useState } from "react";
import { supabase, type Booking, type Ticket } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { QRCodeSVG } from "qrcode.react";
import { MapPin, Clock, ArrowRight, Ticket as TicketIcon } from "lucide-react";
import { toast } from "../../components/ui/Toast";

export default function MyTripsPage() {
  const { profile } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tickets, setTickets] = useState<Record<string, Ticket>>({});
  const [schedules, setSchedules] = useState<Record<string, any>>({});
  const [selected, setSelected] = useState<Booking | null>(null);

  useEffect(() => {
    if (!profile) return;
    const loadTrips = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
      .eq("passenger_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(`Could not load your trips: ${error.message}`);
        setBookings([]);
        return;
      }

      const tripBookings = (data ?? []) as Booking[];
      setBookings(tripBookings);
      if (tripBookings.length === 0) return;

      const bookingIds = tripBookings.map((booking) => booking.id);
      const scheduleIds = [...new Set(tripBookings.map((booking) => booking.schedule_id).filter(Boolean))];
      const [{ data: ticketData }, { data: scheduleData }] = await Promise.all([
        supabase.from("tickets").select("*").in("booking_id", bookingIds),
        supabase.from("schedules").select("*, routes(*), vehicles(*)").in("id", scheduleIds),
      ]);

      const ticketMap: Record<string, Ticket> = {};
      (ticketData ?? []).forEach((ticket) => {
        ticketMap[ticket.booking_id] = ticket as Ticket;
      });
      setTickets(ticketMap);

      const scheduleMap: Record<string, any> = {};
      (scheduleData ?? []).forEach((schedule) => {
        scheduleMap[schedule.id] = schedule;
      });
      setSchedules(scheduleMap);
    };

    void loadTrips();
  }, [profile]);

  const statusVariant = (s: string) =>
    s === "confirmed"
      ? "success"
      : s === "cancelled"
        ? "danger"
        : s === "pending"
          ? "warning"
          : "default";

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        My Trips
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        All your past and upcoming bookings
      </p>

      {bookings.length === 0 ? (
        <Card className="p-10 text-center">
          <TicketIcon size={42} className="mx-auto mb-3 text-[#64748b]" />
          <div className="text-[#64748b]">No bookings yet — find a route and book!</div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {bookings.map((b) => {
            const sched = schedules[b.schedule_id] ?? (b.schedules as any);
            const route = sched?.routes;
            const ticket = tickets[b.id];
            return (
              <Card
                key={b.id}
                hover
                onClick={() => setSelected(b)}
                className="p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-[#f0f4ff] text-sm">
                      {route?.name ?? "Route"}
                    </div>
                    <div className="text-xs text-[#64748b] flex items-center gap-1 mt-0.5">
                      {route?.origin}
                      <ArrowRight size={10} />
                      {route?.destination}
                    </div>
                  </div>
                  <Badge variant={statusVariant(b.status)}>
                    {b.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-[#64748b]">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {sched
                        ? new Date(sched.departure_at).toLocaleDateString()
                        : "—"}
                    </span>
                    {b.seat_number && (
                      <span>Seat {b.seat_number}</span>
                    )}
                  </div>
                  {ticket && (
                    <span className="text-[#f97316] font-mono font-medium">
                      {ticket.ticket_code}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Ticket modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Your Ticket"
      >
        {selected && (() => {
          const sched = schedules[selected.schedule_id] ?? (selected.schedules as any);
          const route = sched?.routes;
          const ticket = tickets[selected.id];
          return (
            <div>
              {ticket ? (
                <div className="text-center mb-5">
                  <div className="bg-white p-4 rounded-xl inline-block mb-3">
                    <QRCodeSVG
                      value={ticket.ticket_code}
                      size={140}
                      fgColor="#0a0f1e"
                    />
                  </div>
                  <div className="font-mono text-[#f97316] font-bold text-lg">
                    {ticket.ticket_code}
                  </div>
                </div>
              ) : (
                <div className="text-center text-[#64748b] text-sm mb-4">
                  Ticket not yet issued
                </div>
              )}
              <div className="flex flex-col gap-2">
                {[
                  { label: "Route", value: route?.name },
                  { label: "From", value: route?.origin },
                  { label: "To", value: route?.destination },
                  {
                    label: "Departure",
                    value: sched
                      ? new Date(sched.departure_at).toLocaleString()
                      : "—",
                  },
                  { label: "Seat", value: selected.seat_number ?? "Any" },
                  { label: "Status", value: selected.status },
                ].map((row) => (
                  <div
                    key={row.label}
                    className="flex justify-between py-1.5 border-b border-white/5"
                  >
                    <span className="text-xs text-[#64748b]">{row.label}</span>
                    <span className="text-sm font-medium text-[#f0f4ff]">
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
