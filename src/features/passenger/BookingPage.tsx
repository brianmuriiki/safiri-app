import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Clock, Users, ArrowRight, Phone, Bus, Car, Bike, Smartphone, PartyPopper } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase, type Schedule } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";

type Step = "review" | "seat" | "pay" | "success";

export default function BookingPage() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [step, setStep] = useState<Step>("review");
  const [seat, setSeat] = useState<number | null>(null);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [mpesaCode, setMpesaCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!scheduleId) return;
    supabase
      .from("schedules")
      .select("*, routes(*), vehicles(*)")
      .eq("id", scheduleId)
      .single()
      .then(({ data }) => setSchedule(data as Schedule));
  }, [scheduleId]);

  const handleBook = async () => {
    if (!profile || !schedule) return;
    if (seat === null) {
      setError("Please select a seat before continuing.");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        passenger_id: profile.id,
        trip_id: schedule.id,
        schedule_id: schedule.id,
        amount: schedule.price,
        seat_id: seat,
        seat_number: seat,
        status: "pending",
      })
      .select()
      .single();
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setBookingId(data.id);
    setStep("pay");
    setLoading(false);
  };

  const handlePayment = async () => {
    if (!bookingId || !schedule) return;
    setLoading(true);
    setError("");
    // Simulate M-Pesa STK push (in production, call your edge function)
    await new Promise((r) => setTimeout(r, 2000));
    const receipt = `MPE${Date.now().toString().slice(-8)}`;
    const { error: paymentError } = await supabase.from("payments").insert({
      booking_id: bookingId,
      amount: schedule.price,
      mpesa_receipt: receipt,
      phone,
      // `phone_number` is required by older deployed Safiri schemas. Keep the
      // canonical `phone` field too, so both schema versions receive the same
      // M-Pesa number during the transition.
      phone_number: phone,
      status: "confirmed",
    });
    if (paymentError) {
      setError(paymentError.message);
      setLoading(false);
      return;
    }

    const { error: bookingError } = await supabase
      .from("bookings")
      .update({ status: "confirmed" })
      .eq("id", bookingId);
    if (bookingError) {
      setError(bookingError.message);
      setLoading(false);
      return;
    }

    // Decrement seats
    const { error: scheduleError } = await supabase
      .from("schedules")
      .update({ seats_available: (schedule.seats_available ?? 1) - 1 })
      .eq("id", schedule.id);
    if (scheduleError) {
      setError(scheduleError.message);
      setLoading(false);
      return;
    }

    // Generate ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .insert({ booking_id: bookingId })
      .select()
      .single();
    if (ticketError) {
      setError(ticketError.message);
      setLoading(false);
      return;
    }
    setTicketCode(ticket?.ticket_code ?? null);
    setMpesaCode(receipt);
    setStep("success");
    setLoading(false);
  };

  if (!schedule)
    return (
      <div className="p-6 text-[#64748b] text-sm">Loading schedule…</div>
    );

  const route = schedule.routes as any;
  const vehicle = schedule.vehicles as any;
  const VehicleIcon = vehicle?.type === "bodaboda" ? Bike : vehicle?.type === "taxi" ? Car : Bus;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-[#64748b] hover:text-[#f97316] mb-6 flex items-center gap-1"
      >
        ← Back
      </button>

      <h1
        className="text-2xl font-bold mb-6"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        {step === "review" && "Review your trip"}
        {step === "seat" && "Choose a seat"}
        {step === "pay" && "Pay with M-Pesa"}
        {step === "success" && "Booking confirmed!"}
      </h1>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {(["review", "seat", "pay", "success"] as Step[]).map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all ${
              ["review", "seat", "pay", "success"].indexOf(step) >= i
                ? "bg-[#f97316]"
                : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {step === "review" && (
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 flex items-center justify-center text-[#f97316]"><VehicleIcon size={21} /></div>
              <div>
                <div className="font-semibold text-[#f0f4ff]">
                  {vehicle?.model ?? vehicle?.type}
                </div>
                <div className="text-xs text-[#64748b]">{vehicle?.number_plate}</div>
              </div>
            </div>
            {[
              {
                icon: <MapPin size={14} className="text-[#f97316]" />,
                label: "Route",
                value: route?.name,
              },
              {
                icon: <ArrowRight size={14} className="text-[#64748b]" />,
                label: "From → To",
                value: `${route?.origin} → ${route?.destination}`,
              },
              {
                icon: <Clock size={14} className="text-[#22c55e]" />,
                label: "Departure",
                value: new Date(schedule.departure_at).toLocaleString(),
              },
              {
                icon: <Users size={14} className="text-[#64748b]" />,
                label: "Seats left",
                value: schedule.seats_available,
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2 text-xs text-[#64748b]">
                  {row.icon} {row.label}
                </div>
                <div className="text-sm font-medium text-[#f0f4ff]">
                  {row.value}
                </div>
              </div>
            ))}
          </Card>
          <div className="flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-xl px-5 py-4">
            <span className="text-[#f0f4ff] font-medium">Total fare</span>
            <span className="text-2xl font-bold text-[#f97316]">
              KES {schedule.price}
            </span>
          </div>
          <Button size="lg" onClick={() => setStep("seat")}>
            Choose Seat →
          </Button>
        </div>
      )}

      {step === "seat" && (
        <div>
          <p className="text-[#64748b] text-sm mb-4">
            Select your preferred seat number (optional)
          </p>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {Array.from({ length: vehicle?.seat_count ?? 14 }, (_, i) => i + 1).map(
              (n) => (
                <button
                  key={n}
                  onClick={() => setSeat(seat === n ? null : n)}
                  className={`aspect-square rounded-xl text-sm font-medium transition-all ${
                    seat === n
                      ? "bg-[#f97316] text-white"
                      : "bg-[#1a2235] text-[#64748b] hover:text-[#f0f4ff] hover:bg-[#243152]"
                  }`}
                >
                  {n}
                </button>
              )
            )}
          </div>
          {seat && (
            <p className="text-sm text-[#22c55e] mb-4">
              Seat {seat} selected
            </p>
          )}
          {error && (
            <p className="text-sm text-red-400 mb-4">{error}</p>
          )}
          <Button size="lg" loading={loading} onClick={handleBook}>
            Confirm Booking →
          </Button>
        </div>
      )}

      {step === "pay" && (
        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-green-400"><Smartphone size={20} /></div>
              <div>
                <div className="font-semibold text-[#f0f4ff]">M-Pesa STK Push</div>
                <div className="text-xs text-[#64748b]">
                  A prompt will be sent to your phone
                </div>
              </div>
            </div>
            <Input
              label="M-Pesa Phone Number"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254700000000"
              icon={<Phone size={15} />}
            />
            <div className="mt-4 flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
              <span className="text-sm text-[#f0f4ff]">Amount to pay</span>
              <span className="font-bold text-[#f97316]">
                KES {schedule.price}
              </span>
            </div>
          </Card>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button size="lg" loading={loading} variant="success" onClick={handlePayment}>
            {loading ? "Processing payment…" : "Pay KES " + schedule.price}
          </Button>
        </div>
      )}

      {step === "success" && (
        <div className="text-center">
          <PartyPopper size={48} className="mx-auto mb-4 text-[#f97316]" />
          <h2
            className="text-2xl font-bold mb-2"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            You're all set!
          </h2>
          <p className="text-[#64748b] text-sm mb-6">
            Your booking is confirmed and paid.
          </p>
          <div className="mb-6">
            <div className="inline-flex flex-col items-center rounded-2xl border border-orange-500/25 bg-[#1a2235] p-4">
              <div className="rounded-xl bg-white p-3">
                <QRCodeSVG
                  value={ticketCode ?? mpesaCode}
                  size={164}
                  fgColor="#0a0f1e"
                  level="M"
                  aria-label="Boarding ticket QR code"
                />
              </div>
              <p className="mt-3 text-xs font-medium text-[#f0f4ff]">Scan to verify your ticket</p>
              <p className="mt-1 font-mono text-xs text-[#f97316]">{ticketCode ?? mpesaCode}</p>
            </div>
          </div>
          <Card className="p-6 mb-6 text-left">
            {[
              { label: "Route", value: route?.name },
              { label: "Departure", value: new Date(schedule.departure_at).toLocaleString() },
              { label: "Seat", value: seat ?? "Any" },
              { label: "M-Pesa Receipt", value: mpesaCode },
              { label: "Ticket Code", value: ticketCode },
            ].map((row) => (
              <div key={row.label} className="flex justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-xs text-[#64748b]">{row.label}</span>
                <span
                  className={`text-sm font-medium ${row.label === "Ticket Code" ? "text-[#f97316] font-mono" : "text-[#f0f4ff]"}`}
                >
                  {row.value}
                </span>
              </div>
            ))}
          </Card>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate("/passenger/bookings")}
              className="flex-1"
            >
              My Trips
            </Button>
            <Button onClick={() => navigate("/passenger")} className="flex-1">
              Back Home
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
