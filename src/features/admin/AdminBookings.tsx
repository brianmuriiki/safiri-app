import { useEffect, useState } from "react"
import { supabase } from "../../lib/supabase"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import { toast } from "../../components/ui/Toast"
import Button from "../../components/ui/Button"
import type { BookingChangeRequest } from "../../lib/supabase"

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([])
  const [passengers, setPassengers] = useState<Record<string, any>>({})
  const [schedules, setSchedules] = useState<Record<string, any>>({})
  const [payments, setPayments] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [changeRequests, setChangeRequests] = useState<BookingChangeRequest[]>([])
  const [requestBusy, setRequestBusy] = useState<string | null>(null)

  useEffect(() => {
    void supabase.from("booking_change_requests").select("*").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) toast.error(`Could not load cancellation/refund requests: ${error.message}`)
      else setChangeRequests((data ?? []) as BookingChangeRequest[])
    })
    const loadBookings = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        toast.error(`Could not load bookings: ${error.message}`)
        setLoading(false)
        return
      }

      const rows = data ?? []
      setBookings(rows)
      if (rows.length === 0) {
        setLoading(false)
        return
      }

      const passengerIds = [
        ...new Set(rows.map((booking) => booking.passenger_id).filter(Boolean)),
      ]
      const scheduleIds = [
        ...new Set(
          rows
            .map((booking) => booking.schedule_id ?? booking.trip_id)
            .filter(Boolean),
        ),
      ]
      const bookingIds = rows.map((booking) => booking.id)
      const [profileResult, scheduleResult, paymentResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", passengerIds),
        supabase
          .from("schedules")
          .select("id, departure_at, routes(name), vehicles(number_plate)")
          .in("id", scheduleIds),
        supabase
          .from("payments")
          .select("booking_id, amount, status, mpesa_receipt")
          .in("booking_id", bookingIds),
      ])

      const profileMap: Record<string, any> = {}
      ;(profileResult.data ?? []).forEach((profile) => {
        profileMap[profile.id] = profile
      })
      setPassengers(profileMap)

      const scheduleMap: Record<string, any> = {}
      ;(scheduleResult.data ?? []).forEach((schedule) => {
        scheduleMap[schedule.id] = schedule
      })
      setSchedules(scheduleMap)

      const paymentMap: Record<string, any> = {}
      ;(paymentResult.data ?? []).forEach((payment) => {
        paymentMap[payment.booking_id] = payment
      })
      setPayments(paymentMap)
      setLoading(false)
    }

    void loadBookings()
  }, [])

  const reviewRequest = async (request: BookingChangeRequest, status: BookingChangeRequest["status"]) => {
    const note = window.prompt(status === "approved" && request.kind === "refund" ? "Refund approved. Add a note confirming it will be processed in Paystack." : "Optional note for the passenger", request.admin_note ?? "")
    if (note === null) return
    setRequestBusy(request.id)
    if (status === "approved") {
      const { error } = await supabase.rpc("admin_cancel_booking", { p_booking_id: request.booking_id })
      if (error) { toast.error(`Could not cancel booking: ${error.message}`); setRequestBusy(null); return }
    }
    if (status === "completed" && request.kind === "refund") {
      const { error } = await supabase.from("payments").update({ status: "refunded" }).eq("booking_id", request.booking_id).eq("status", "confirmed")
      if (error) { toast.error(`Could not record completed refund: ${error.message}`); setRequestBusy(null); return }
    }
    const nextStatus = status === "approved" && request.kind === "refund" ? "processing" : status
    const { error } = await supabase.from("booking_change_requests").update({ status: nextStatus, admin_note: note.trim() || null, updated_at: new Date().toISOString() }).eq("id", request.id)
    if (error) toast.error(`Could not update request: ${error.message}`)
    else {
      if (status === "completed" && request.kind === "refund") setPayments((current) => ({ ...current, [request.booking_id]: { ...current[request.booking_id], status: "refunded" } }))
      if (status === "approved" && request.kind === "refund") toast.success("Refund approved. Process it in Paystack, then mark the request completed.")
      else toast.success(`Request marked ${nextStatus}`)
      const { data } = await supabase.from("booking_change_requests").select("*").order("created_at", { ascending: false })
      setChangeRequests((data ?? []) as BookingChangeRequest[])
    }
    setRequestBusy(null)
  }

  const bookingVariant = (status: string) =>
    status === "confirmed"
      ? "success"
      : status === "cancelled"
        ? "danger"
        : status === "pending"
          ? "warning"
          : "default"
  const paymentVariant = (status?: string) =>
    status === "confirmed"
      ? "success"
      : status === "failed"
        ? "danger"
        : status === "refunded"
          ? "info"
          : "warning"

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Bookings
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        All passenger bookings and payment records
      </p>

      <section className="mb-7"><h2 className="mb-3 text-lg font-semibold text-white">Cancellation and refund requests</h2><div className="space-y-2">{changeRequests.map((request) => { const booking = bookings.find((b) => b.id === request.booking_id); const passenger = booking ? passengers[booking.passenger_id] : null; return <Card key={request.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><div className="text-sm font-medium capitalize text-white">{request.kind} · {passenger?.full_name ?? passenger?.email ?? "Passenger"}</div><p className="mt-1 text-xs text-[#94a3b8]">{request.reason}</p><p className="mt-1 text-[11px] text-[#64748b]">{new Date(request.created_at).toLocaleString()}{request.admin_note ? ` · ${request.admin_note}` : ""}</p>{request.kind === "refund" && request.status === "processing" && <p className="mt-1 text-xs text-amber-300">Process the refund through Paystack before completing this request.</p>}</div><div className="flex items-center gap-2"><Badge variant={request.status === "completed" ? "success" : request.status === "rejected" ? "danger" : "warning"}>{request.status}</Badge>{request.status === "requested" && <><Button size="sm" variant="success" loading={requestBusy===request.id} onClick={()=>reviewRequest(request,"approved")}>Approve</Button><Button size="sm" variant="danger" loading={requestBusy===request.id} onClick={()=>reviewRequest(request,"rejected")}>Reject</Button></>}{request.status === "processing" && <Button size="sm" variant="success" loading={requestBusy===request.id} onClick={()=>reviewRequest(request,"completed")}>Mark refunded</Button>}</div></Card>})}{changeRequests.length===0&&<Card className="p-5 text-sm text-[#64748b]">No cancellation or refund requests.</Card>}</div></section>

      <Card className="overflow-x-auto">
        <table className="w-full min-w-[850px] text-sm">
          <thead>
            <tr className="border-b border-white/8">
              {[
                "Passenger",
                "Route & departure",
                "Seat",
                "Booking",
                "Payment",
                "Created",
              ].map((heading) => (
                <th
                  key={heading}
                  className="px-4 py-3 text-left text-xs font-medium text-[#64748b]"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => {
              const passenger = passengers[booking.passenger_id]
              const schedule = schedules[booking.schedule_id ?? booking.trip_id]
              const payment = payments[booking.id]
              return (
                <tr
                  key={booking.id}
                  className="border-b border-white/5 last:border-0 hover:bg-white/3"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[#f0f4ff]">
                      {passenger?.full_name ?? passenger?.email ?? "Passenger"}
                    </div>
                    {passenger?.full_name && (
                      <div className="text-xs text-[#64748b]">
                        {passenger.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-[#f0f4ff]">
                      {schedule?.routes?.name ?? "—"}
                    </div>
                    <div className="text-xs text-[#64748b]">
                      {schedule
                        ? new Date(schedule.departure_at).toLocaleString()
                        : "Schedule unavailable"}
                      {schedule?.vehicles?.number_plate
                        ? ` · ${schedule.vehicles.number_plate}`
                        : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#94a3b8]">
                    {booking.seat_number ?? "Any"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={bookingVariant(booking.status)}>
                      {booking.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {payment ? (
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={paymentVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                        <span className="text-xs text-[#64748b]">
                          KES {payment.amount}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#64748b]">No payment</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748b]">
                    {new Date(booking.created_at).toLocaleString()}
                  </td>
                </tr>
              )
            })}
            {!loading && bookings.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-[#64748b]"
                >
                  No bookings yet
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-sm text-[#64748b]"
                >
                  Loading bookings…
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
