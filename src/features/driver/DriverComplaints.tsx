import { useEffect, useState } from "react"
import { supabase, type Complaint } from "../../lib/supabase"
import { useAuthStore } from "../../store/authStore"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import { RotateCcw, Star } from "lucide-react"

export default function DriverComplaints() {
  const { profile } = useAuthStore()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all")

  useEffect(() => {
    if (!profile) return
    supabase
      .from("complaints")
      .select("*")
      .eq("driver_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setComplaints(data ?? []))
  }, [profile])

  const visibleComplaints = complaints.filter(
    (complaint) => statusFilter === "all" || complaint.status === statusFilter,
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Complaints
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        Passenger complaints filed against you
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["all", "open", "resolved"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`rounded-full px-4 py-1.5 text-sm capitalize ${statusFilter === filter ? "bg-[#f97316] text-white" : "bg-[#1a2235] text-[#94a3b8] hover:text-white"}`}
          >
            {filter === "all" ? "All complaints" : filter}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-sm text-[#cbd5e1] hover:bg-white/5 hover:text-white"
        >
          <RotateCcw size={14} />
          Clear filters
        </button>
      </div>

      {complaints.length === 0 ? (
        <Card className="p-8 text-center">
          <Star size={42} className="mx-auto mb-3 text-[#f59e0b]" />
          <div className="text-[#64748b] text-sm">
            No complaints — keep up the great work!
          </div>
        </Card>
      ) : visibleComplaints.length === 0 ? (
        <Card className="p-8 text-center text-sm text-[#64748b]">
          No {statusFilter} complaints to show.
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleComplaints.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-medium text-[#f0f4ff]">
                  Passenger complaint
                </div>
                <Badge
                  variant={c.status === "resolved" ? "success" : "warning"}
                >
                  {c.status}
                </Badge>
              </div>
              {c.subject && (
                <div className="mb-1 text-sm font-medium text-[#f0f4ff]">
                  {c.subject}
                </div>
              )}
              <p className="text-sm text-[#94a3b8] mb-2">{c.message}</p>
              <span className="text-xs text-[#64748b]">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
