import { useEffect, useState } from "react"
import { supabase, type Booking, type Ticket, type BookingChangeRequest } from "../../lib/supabase"
import { useAuthStore } from "../../store/authStore"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Modal from "../../components/ui/Modal"
import { QRCodeSVG } from "qrcode.react"
import { MapPin, Clock, ArrowRight, Ticket as TicketIcon, RotateCcw, XCircle } from "lucide-react"
import Button from "../../components/ui/Button"
import { toast } from "../../components/ui/Toast"

export default function MyTripsPage() {
  const { profile } = useAuthStore()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [tickets, setTickets] = useState<Record<string, Ticket>>({})
  const [schedules, setSchedules] = useState<Record<string, any>>({})
  const [selected, setSelected] = useState<Booking | null>(null)
  const [tripFilter, setTripFilter] = useState<"all" | "upcoming" | "past">("all")
  const [changeRequests, setChangeRequests] = useState<BookingChangeRequest[]>([])
  const [requesting, setRequesting] = useState<Booking | null>(null)
  const [reason, setReason] = useState("")
  const [sendingRequest, setSendingRequest] = useState(false)
  const [paidBookings, setPaidBookings] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!profile) return
    const loadTrips = async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("passenger_id", profile.id)
        .order("created_at", { ascending: false })

      if (error) {
        toast.error(`Could not load your trips: ${error.message}`)
        setBookings([])
        return
      }

      const tripBookings = (data ?? []) as Booking[]
      setBookings(tripBookings)
      if (tripBookings.length === 0) return

      const bookingIds = tripBookings.map((booking) => booking.id)
      const scheduleIds = [
        ...new Set(
          tripBookings.map((booking) => booking.schedule_id).filter(Boolean),
        ),
      ]
      const [{ data: ticketData }, { data: scheduleData }, { data: payments }, { data: requests }] = await Promise.all([
        supabase.from("tickets").select("*").in("booking_id", bookingIds),
        supabase
          .from("schedules")
          .select("*, routes(*), vehicles(*)")
          .in("id", scheduleIds),
        supabase.from("payments").select("booking_id,status").in("booking_id", bookingIds).eq("status", "confirmed"),
        supabase.from("booking_change_requests").select("*").in("booking_id", bookingIds).order("created_at", { ascending: false }),
      ])
      setPaidBookings(new Set((payments ?? []).map((p) => p.booking_id)))
      setChangeRequests((requests ?? []) as BookingChangeRequest[])

      const ticketMap: Record<string, Ticket> = {}
      ;(ticketData ?? []).forEach((ticket) => {
        ticketMap[ticket.booking_id] = (ticket as Ticket)
      })
      setTickets(ticketMap)

      const scheduleMap: Record<string, any> = {}
      ;(scheduleData ?? []).forEach((schedule) => {
        scheduleMap[schedule.id] = schedule
      })
      setSchedules(scheduleMap)
    }

    void loadTrips()
  }, [profile])

  const submitChangeRequest = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!requesting || !profile || reason.trim().length < 5) return
    setSendingRequest(true)
    const kind = paidBookings.has(requesting.id) ? "refund" : "cancellation"
    const { error } = await supabase.from("booking_change_requests").insert({ booking_id: requesting.id, passenger_id: profile.id, kind, reason: reason.trim() })
    if (error) toast.error(error.code === "23505" ? "There is already an open request for this booking" : `Could not submit request: ${error.message}`)
    else {
      toast.success(kind === "refund" ? "Refund request sent for review" : "Cancellation request sent for review")
      setRequesting(null); setReason("")
      const { data } = await supabase.from("booking_change_requests").select("*").eq("passenger_id", profile.id).order("created_at", { ascending: false })
      setChangeRequests((data ?? []) as BookingChangeRequest[])
    }
    setSendingRequest(false)
  }

  const statusVariant = (s: string) =>
    s === "confirmed"
      ? "success"
      : s === "cancelled"
        ? "danger"
        : s === "pending"
        ? "warning"
        : "default"

  const visibleBookings = bookings.filter((booking) => {
    if (tripFilter === "all") return true
    const departure = schedules[booking.schedule_id]?.departure_at
    const isPast =
      booking.status === "completed" ||
      booking.status === "cancelled" ||
      (departure && new Date(departure).getTime() < Date.now())
    return tripFilter === "past" ? Boolean(isPast) : !isPast
  })

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

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["all", "upcoming", "past"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setTripFilter(filter)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize ${tripFilter === filter ? "bg-[#f97316] text-white" : "bg-[#1a2235] text-[#94a3b8] hover:text-white"}`}
          >
            {filter === "all" ? "All trips" : filter}
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setTripFilter("all"); setSelected(null) }}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[#cbd5e1] hover:bg-white/5 hover:text-white"
        >
          <RotateCcw size={14} />
          Clear filters
        </button>
      </div>

      {bookings.length === 0 ? (
        <Card className="p-10 text-center">
          <TicketIcon size={42} className="mx-auto mb-3 text-[#64748b]" />
          <div className="text-[#64748b]">
            No bookings yet — find a route and book!
          </div>
        </Card>
      ) : visibleBookings.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[#64748b]">
          No {tripFilter} trips to show.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleBookings.map((b) => {
            const sched = schedules[b.schedule_id] ?? b.schedules as any
            const route = sched?.routes
            const ticket = tickets[b.id]
            const activeRequest = changeRequests.find((request) => request.booking_id === b.id && ["requested", "approved", "processing"].includes(request.status))
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
                  <Badge variant={statusVariant(b.status)}>{b.status}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4 text-[#64748b]">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {sched
                        ? new Date(sched.departure_at).toLocaleDateString()
                        : "—"}
                    </span>
                    {b.seat_number && <span>Seat {b.seat_number}</span>}
                  </div>
                  {ticket && (
                    <span className="text-[#f97316] font-mono font-medium">
                      {ticket.ticket_code}
                    </span>
                  )}
                </div>
                {(b.status === "pending" || b.status === "confirmed") && !activeRequest ? <button type="button" onClick={(event) => { event.stopPropagation(); setRequesting(b) }} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-orange-300 hover:text-orange-200"><XCircle size={14}/>{paidBookings.has(b.id) ? "Request refund" : "Request cancellation"}</button> : null}
                {changeRequests.filter((r) => r.booking_id === b.id).slice(0, 1).map((r) => <div key={r.id} className="mt-2 text-xs text-[#94a3b8]">{r.kind === "refund" ? "Refund" : "Cancellation"} request: <span className="capitalize">{r.status.replace("_"," ")}</span>{r.admin_note ? ` · ${r.admin_note}` : ""}</div>)}
              </Card>
            )
          })}
        </div>
      )}

      {/* Ticket modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Your Ticket"
      >
        {selected &&
          (() => {
            const sched =
              schedules[selected.schedule_id] ?? selected.schedules as any
            const route = sched?.routes
            const ticket = tickets[selected.id]
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
                      <span className="text-xs text-[#64748b]">
                        {row.label}
                      </span>
                      <span className="text-sm font-medium text-[#f0f4ff]">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
      </Modal>
      <Modal open={!!requesting} onClose={() => setRequesting(null)} title={requesting && paidBookings.has(requesting.id) ? "Request a refund" : "Request cancellation"}>
        <form onSubmit={submitChangeRequest} className="space-y-4"><p className="text-sm leading-6 text-[#94a3b8]">Your request will be reviewed by Safiri support. A refund is not automatic; approved refunds are processed separately through Paystack.</p><label className="block text-sm text-[#cbd5e1]">Reason<textarea value={reason} onChange={e=>setReason(e.target.value)} required minLength={5} rows={3} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1a2235] px-3 py-2.5 text-sm text-white" placeholder="Tell us why you need this change."/></label><Button loading={sendingRequest}>Send request</Button></form>
      </Modal>
    </div>
  )
}
