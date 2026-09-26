import { useEffect, useState } from "react"
import {
  AlertCircle,
  Bus,
  CalendarDays,
  Route,
  Ticket,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react"
import { supabase } from "../../lib/supabase"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import { toast } from "../../components/ui/Toast"

interface Stats {
  users: number
  activeVehicles: number
  routes: number
  bookings: number
  revenue: number
  weekRevenue: number
  complaints: number
}

const statusColors: Record<string, string> = {
  confirmed: "#22c55e",
  pending: "#f59e0b",
  cancelled: "#ef4444",
  completed: "#64748b",
  failed: "#ef4444",
}

const statusVariant = (status: string) =>
  status === "confirmed"
    ? "success"
    : status === "cancelled" || status === "failed"
      ? "danger"
      : status === "pending"
        ? "warning"
        : "default"

export default function AdminAnalytics() {
  const [stats, setStats] = useState<Stats>({
    users: 0,
    activeVehicles: 0,
    routes: 0,
    bookings: 0,
    revenue: 0,
    weekRevenue: 0,
    complaints: 0,
  })
  const [bookingStatusCounts, setBookingStatusCounts] = useState<Record<string, number>>({})
  const [bookingDayCounts, setBookingDayCounts] = useState<Record<string, number>>({})
  const [recentBookings, setRecentBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const loadAnalytics = async () => {
    setLoading(true)
    const [summary, recent] = await Promise.all([
      supabase.rpc("admin_analytics_summary"),
      supabase.from("bookings")
        .select("*, profiles!passenger_id(full_name, email), schedules(routes(name))")
        .order("created_at", { ascending: false })
        .limit(8),
    ])
    if (summary.error) toast.error(`Could not load analytics: ${summary.error.message}`)
    if (recent.error) toast.error(`Could not load recent bookings: ${recent.error.message}`)
    const totals = (summary.data ?? {}) as Record<string, any>
    setStats({
      users: Number(totals.users ?? 0),
      activeVehicles: Number(totals.active_vehicles ?? 0),
      routes: Number(totals.routes ?? 0),
      bookings: Number(totals.bookings ?? 0),
      revenue: Number(totals.revenue ?? 0),
      weekRevenue: Number(totals.week_revenue ?? 0),
      complaints: Number(totals.complaints ?? 0),
    })
    setBookingStatusCounts(totals.booking_statuses ?? {})
    setBookingDayCounts(totals.booking_days ?? {})
    setRecentBookings(recent.data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    void loadAnalytics()
  }, [])

  const cards = [
    {
      label: "Total users",
      value: stats.users,
      hint: "All registered accounts",
      icon: <Users size={18} />,
      color: "#f97316",
    },
    {
      label: "Active vehicles",
      value: stats.activeVehicles,
      hint: "Available on the network",
      icon: <Bus size={18} />,
      color: "#3b82f6",
    },
    {
      label: "Configured routes",
      value: stats.routes,
      hint: "Routes in the system",
      icon: <Route size={18} />,
      color: "#22c55e",
    },
    {
      label: "Total bookings",
      value: stats.bookings,
      hint: "All-time booking count",
      icon: <Ticket size={18} />,
      color: "#8b5cf6",
    },
    {
      label: "Confirmed revenue",
      value: `KES ${stats.revenue.toLocaleString()}`,
      hint: `KES ${stats.weekRevenue.toLocaleString()} in the last 7 days`,
      icon: <Wallet size={18} />,
      color: "#f59e0b",
    },
    {
      label: "Open complaints",
      value: stats.complaints,
      hint: stats.complaints ? "Needs review" : "Nothing awaiting review",
      icon: <AlertCircle size={18} />,
      color: "#ef4444",
    },
  ]
  const bookingStatuses = [
    "confirmed",
    "pending",
    "cancelled",
    "completed",
  ].map((status) => ({
    status,
    count: Number(bookingStatusCounts[status] ?? 0),
  }))
  const maxStatusCount = Math.max(
    1,
    ...bookingStatuses.map((item) => item.count),
  )
  const dayData = Array.from({ length: 7 }, (_, index) => {
    const day = new Date()
    day.setDate(day.getDate() - (6 - index))
    day.setHours(0, 0, 0, 0)
    return {
      label: day.toLocaleDateString("en-KE", { weekday: "short" }),
      count: Number(bookingDayCounts[
        `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
      ] ?? 0),
    }
  })
  const maxDailyCount = Math.max(1, ...dayData.map((day) => day.count))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2 text-orange-400">
            <TrendingUp size={15} />
            <span className="text-xs font-semibold uppercase tracking-wider">
              Operations overview
            </span>
          </div>
          <h1
            className="text-3xl font-bold text-[#f0f4ff]"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Admin Analytics
          </h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Bookings, revenue, and service health in one view.
          </p>
        </div>
        <button
          onClick={() => void loadAnalytics()}
          className="rounded-xl border border-white/10 bg-[#1a2235] px-4 py-2 text-sm font-medium text-[#f0f4ff] transition-colors hover:bg-[#243152]"
        >
          Refresh data
        </button>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="mb-4 flex items-start justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{
                  color: card.color,
                  backgroundColor: `${card.color}20`,
                }}
              >
                {card.icon}
              </div>
              {card.label === "Open complaints" && stats.complaints > 0 && (
                <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
              )}
            </div>
            <div className="mb-1 text-2xl font-bold text-[#f0f4ff]">
              {loading ? "—" : card.value}
            </div>
            <div className="text-xs font-medium text-[#94a3b8]">
              {card.label}
            </div>
            <div className="mt-1 text-xs text-[#64748b]">{card.hint}</div>
          </Card>
        ))}
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-[#f0f4ff]">Booking activity</h2>
              <p className="text-xs text-[#64748b]">
                New bookings over the last 7 days
              </p>
            </div>
            <CalendarDays size={18} className="text-orange-400" />
          </div>
          <div className="flex h-36 items-end gap-3">
            {dayData.map((day) => (
              <div
                key={day.label}
                className="flex flex-1 flex-col items-center gap-2"
              >
                <span className="text-xs text-[#94a3b8]">
                  {day.count || ""}
                </span>
                <div className="flex h-24 w-full items-end rounded-t-lg bg-white/5">
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-orange-600 to-orange-400 transition-all"
                    style={{
                      height: `${Math.max(day.count ? 10 : 2, (day.count / maxDailyCount) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-[#64748b]">{day.label}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-semibold text-[#f0f4ff]">Booking status</h2>
          <p className="mb-5 text-xs text-[#64748b]">Current distribution</p>
          <div className="flex flex-col gap-3">
            {bookingStatuses.map((item) => (
              <div key={item.status}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="capitalize text-[#94a3b8]">
                    {item.status}
                  </span>
                  <span className="text-[#f0f4ff]">{item.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(item.count / maxStatusCount) * 100}%`,
                      backgroundColor: statusColors[item.status],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[#f0f4ff]">Recent bookings</h2>
          <p className="text-xs text-[#64748b]">Latest passenger activity</p>
        </div>
        <span className="text-xs text-[#64748b]">
          {recentBookings.length} shown
        </span>
      </div>
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-white/8">
              {["Passenger", "Route", "Status", "Date"].map((heading) => (
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
            {recentBookings.map((booking) => (
              <tr
                key={booking.id}
                className="border-b border-white/5 last:border-0 hover:bg-white/3"
              >
                <td className="px-4 py-3 text-[#f0f4ff]">
                  {booking.profiles?.full_name ??
                    booking.profiles?.email ??
                    "Passenger"}
                </td>
                <td className="px-4 py-3 text-[#94a3b8]">
                  {booking.schedules?.routes?.name ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(booking.status)}>
                    {booking.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-[#64748b]">
                  {new Date(booking.created_at).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </td>
              </tr>
            ))}
            {!loading && recentBookings.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-sm text-[#64748b]"
                >
                  No bookings yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
