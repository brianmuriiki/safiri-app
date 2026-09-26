import { useEffect, useState, useCallback } from "react";
import PaystackPop from "@paystack/inline-js";
import { useParams, useNavigate } from "react-router-dom";
import { MapPin, Clock, Users, ArrowRight, Bus, Car, Bike, Phone, PartyPopper, CreditCard, Shield } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase, type Schedule } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { toast } from "../../components/ui/Toast";

type Step = "review" | "seat" | "pay" | "success";

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  const fallback = error instanceof Error ? error.message : String(error);
  const context = (error as { context?: unknown } | null)?.context;
  if (!context || typeof context !== "object" || !("clone" in context)) {
    return fallback;
  }

  const response = context as Response;
  try {
    const body = await response.clone().json();
    const detail = body?.error ?? body?.message;
    if (typeof detail === "string" && detail.length > 0) {
      return `Payment service (${response.status}): ${detail}`;
    }
  } catch {
    // Fall back to the SDK message when the response isn't JSON.
  }
  return `Payment service (${response.status}): ${fallback}`;
}

export default function BookingPage() {
  const { scheduleId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuthStore();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState("");
  const [unavailableSeats, setUnavailableSeats] = useState<number[]>([]);
  const [step, setStep] = useState<Step>("review");
  const [seat, setSeat] = useState<number | null>(null);
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [paystackRef, setPaystackRef] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [mobileMoneyMessage, setMobileMoneyMessage] = useState("");

  useEffect(() => {
    let active = true;
    if (!scheduleId) {
      setScheduleError("This booking link is missing a schedule.");
      setScheduleLoading(false);
      return;
    }
    setScheduleLoading(true);
    setScheduleError("");
    Promise.all([
      supabase.from("schedules").select("*, routes(*), vehicles(*)").eq("id", scheduleId).maybeSingle(),
      supabase.rpc("get_unavailable_seats", { p_schedule_id: scheduleId }),
    ]).then(([scheduleResult, seatResult]) => {
      if (!active) return;
      if (scheduleResult.error || !scheduleResult.data) {
        setScheduleError(scheduleResult.error?.message ?? "This schedule is no longer available.");
        return;
      }
      if (seatResult.error) {
        setScheduleError(`Could not check seat availability: ${seatResult.error.message}`);
        return;
      }
      setSchedule(scheduleResult.data as Schedule);
      setUnavailableSeats((seatResult.data ?? []) as number[]);
    }).finally(() => {
      if (active) setScheduleLoading(false);
    });
    return () => { active = false; };
  }, [scheduleId]);

  const handleBook = async () => {
    if (!schedule) return;
    if (seat === null) {
      setError("Please select a seat before continuing.");
      return;
    }
    setLoading(true);
    setError("");
    const { data: authData, error: authError } = await supabase.auth.getUser();
    const authenticatedUser = authData.user;
    if (authError || !authenticatedUser) {
      setError("Your session has expired. Sign in again before booking.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("create_booking", {
      p_schedule_id: schedule.id,
      p_seat_number: seat,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    if (!data) {
      setError("Booking could not be created. Please try again.");
      setLoading(false);
      return;
    }
    setBookingId(data as string);
    setStep("pay");
    setLoading(false);
  };

  const initializePaystackPayment = useCallback(async () => {
    if (!bookingId || !schedule) return;

    setLoading(true);
    setError("");

    try {
      const { data: initData, error: initError } = await supabase.functions.invoke("paystack", {
        body: {
          action: "initialize",
          booking_id: bookingId,
        },
      });

      if (initError) {
        throw new Error(`Could not initialize Paystack: ${await getFunctionErrorMessage(initError)}`);
      }

      if (!initData?.authorization_url) {
        throw new Error("Paystack initialization returned no authorization URL");
      }

      const accessCode = initData.access_code;
      if (!accessCode) {
        throw new Error("Paystack initialization returned no access code");
      }

      setPaystackRef(initData.reference);
      const paystack = new PaystackPop();
      paystack.resumeTransaction(accessCode, {
        onSuccess: async (response) => await verifyPaystackPayment(response.reference),
        onCancel: () => {
          void supabase.functions.invoke("paystack", {
            body: { action: "cancel_attempt", reference: initData.reference },
          });
          setLoading(false);
        },
        onError: (paymentError) => {
          void supabase.functions.invoke("paystack", {
            body: { action: "cancel_attempt", reference: initData.reference },
          });
          setError(paymentError.message);
          setLoading(false);
        },
      });
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }, [bookingId, schedule, seat]);

  const verifyPaystackPayment = async (reference: string) => {
    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase.functions.invoke("paystack", {
        body: {
          action: "verify",
          reference,
        },
      });

      if (error) {
        throw new Error(`Payment verification failed: ${await getFunctionErrorMessage(error)}`);
      }

      if (data?.status === "success" && bookingId) {
        toast.success("Payment successful!");
        setStep("success");
        await refreshTicket(bookingId);
      } else if (data?.status === "failed") {
        setError("Payment failed. Please try again.");
      } else {
        setError("Payment pending. Please wait for confirmation.");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const requestMpesaPayment = async () => {
    if (!bookingId) return;
    setLoading(true);
    setError("");
    setMobileMoneyMessage("");
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user) throw new Error("Your session has expired. Sign in again before paying.");

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, passenger_id")
        .eq("id", bookingId)
        .maybeSingle();
      if (bookingError) throw new Error(`Could not confirm booking ownership: ${bookingError.message}`);
      if (!booking) throw new Error("This booking is no longer available. Start a new booking and try again.");
      if (booking.passenger_id !== authData.user.id) {
        throw new Error("This booking belongs to another account. Start a new booking while signed into your current account.");
      }

      const { data, error: chargeError } = await supabase.functions.invoke("paystack", {
        body: { action: "mobile_money", booking_id: bookingId, phone },
      });
      if (chargeError) throw new Error(await getFunctionErrorMessage(chargeError));
      if (data?.error) throw new Error(data.error);
      setPaystackRef(data.reference);
      if (data.status === "success") {
        await verifyPaystackPayment(data.reference);
      } else if (["failed", "send_failed", "abandoned"].includes(data.status)) {
        throw new Error(data.message ?? "Paystack could not start the mobile money payment. Try again.");
      } else {
        setMobileMoneyMessage(data.message ?? "Check your phone and approve the M-Pesa payment request.");
      }
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const refreshTicket = async (bId: string) => {
    const { data: ticket } = await supabase
      .from("tickets")
      .select("ticket_code")
      .eq("booking_id", bId)
      .single();

    if (ticket) {
      setTicketCode(ticket.ticket_code);
    }
  };

  if (scheduleLoading)
    return (
      <div className="p-6 text-[#64748b] text-sm">Loading schedule…</div>
    );
  if (!schedule)
    return <div className="p-6 max-w-2xl mx-auto"><Card className="p-6"><p className="text-sm text-red-300">{scheduleError || "This schedule is unavailable."}</p><Button className="mt-4" variant="secondary" onClick={() => navigate("/passenger/routes")}>Back to routes</Button></Card></div>;

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
        {step === "pay" && "Pay with Paystack"}
        {step === "success" && "Booking confirmed!"}
      </h1>

      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {["review", "seat", "pay", "success"].map((s, i) => (
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
            {[{
              icon: <MapPin size={14} className="text-[#f97316]" />,
              label: "Route",
              value: route?.name,
            }, {
              icon: <ArrowRight size={14} className="text-[#64748b]" />,
              label: "From → To",
              value: `${route?.origin} → ${route?.destination}`,
            }, {
              icon: <Clock size={14} className="text-[#22c55e]" />,
              label: "Departure",
              value: new Date(schedule.departure_at).toLocaleString(),
            }, {
              icon: <Users size={14} className="text-[#64748b]" />,
              label: "Seats left",
              value: schedule.seats_available,
            }].map((row) => (
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
            Select a seat. Available seats are held for 45 minutes while you complete payment.
          </p>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {Array.from({ length: vehicle?.seat_count ?? 14 }, (_, i) => i + 1).map(
              (n) => (
                <button
                  key={n}
                  disabled={unavailableSeats.includes(n)}
                  onClick={() => setSeat(seat === n ? null : n)}
                  className={`aspect-square rounded-xl text-sm font-medium transition-all ${
                    unavailableSeats.includes(n)
                      ? "cursor-not-allowed bg-[#111827] text-[#475569] line-through"
                      : seat === n
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
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center text-green-400"><Shield size={20} /></div>
              <div>
                <div className="font-semibold text-[#f0f4ff]">Pay with Paystack</div>
                <div className="text-xs text-[#64748b]">
                  Secure payment via Paystack - supports cards, bank transfer, mobile money & more
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between bg-orange-500/10 border border-orange-500/20 rounded-xl px-4 py-3">
              <span className="text-sm text-[#f0f4ff]">Amount to pay</span>
              <span className="font-bold text-[#f97316]">
                KES {schedule.price}
              </span>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <Input
                label="M-Pesa phone number"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+254712345678"
                icon={<Phone size={15} />}
              />
              <Button size="lg" loading={loading} variant="success" onClick={requestMpesaPayment}>
                <Phone size={16} className="mr-2" />
                Send M-Pesa prompt
              </Button>
              {mobileMoneyMessage && (
                <div className="text-sm text-[#94a3b8]">
                  <p>{mobileMoneyMessage}</p>
                  {paystackRef && (
                    <Button className="mt-3" variant="secondary" loading={loading} onClick={() => verifyPaystackPayment(paystackRef)}>
                      I approved it — check payment
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6">
              <Button
                size="lg"
                loading={loading}
                variant="success"
                onClick={initializePaystackPayment}
              >
                <CreditCard size={16} className="mr-2" />
                Pay KES {schedule.price} with Paystack
              </Button>
            </div>
          </Card>

          {error && <p className="text-sm text-red-400">{error}</p>}
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
                  value={ticketCode ?? paystackRef ?? "pending"}
                  size={164}
                  fgColor="#0a0f1e"
                  level="M"
                  aria-label="Boarding ticket QR code"
                />
              </div>
              <p className="mt-3 text-xs font-medium text-[#f0f4ff]">Scan to verify your ticket</p>
              <p className="mt-1 font-mono text-xs text-[#f97316]">{ticketCode ?? paystackRef ?? "pending"}</p>
            </div>
          </div>
          <Card className="p-6 mb-6 text-left">
            {[{
              label: "Route", value: route?.name,
            }, {
              label: "Departure", value: new Date(schedule.departure_at).toLocaleString(),
            }, {
              label: "Seat", value: seat ?? "Any",
            }, {
              label: "Payment", value: "Paystack",
            }, {
              label: "Ticket Code", value: ticketCode,
            }].map((row) => (
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
