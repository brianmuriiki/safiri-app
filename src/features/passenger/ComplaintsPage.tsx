import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { supabase, type Complaint, type Profile } from "../../lib/supabase"
import { useAuthStore } from "../../store/authStore"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import { toast } from "../../components/ui/Toast"
import { CheckCircle2, RotateCcw } from "lucide-react"

interface FormData {
  subject: string
  driver_id: string
  message: string
}

export default function ComplaintsPage() {
  const { profile } = useAuthStore()
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("all")
  const { register, handleSubmit, reset } = useForm<FormData>()

  const load = () => {
    if (!profile) return
    supabase
      .from("complaints")
      .select("*")
      .eq("passenger_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setComplaints(data ?? []))
  }

  useEffect(load, [profile])

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "driver")
      .then(({ data }) => setDrivers((data ?? []) as Profile[]))
  }, [])

  const onSubmit = async (data: FormData) => {
    if (!profile) return
    setLoading(true)
    const { error } = await supabase.from("complaints").insert({
      passenger_id: profile.id,
      subject: data.subject.trim(),
      driver_id: data.driver_id,
      message: data.message,
    })
    if (error) {
      toast.error(`Failed to submit complaint: ${error.message}`)
    } else {
      toast.success("Complaint submitted successfully")
      reset()
      load()
    }
    setLoading(false)
  }

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
        Report any issues with drivers or vehicles
      </p>

      <Card className="p-5 mb-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-[#f0f4ff] text-sm">
            Submit a complaint
          </h2>
          <Button type="button" variant="secondary" size="sm" onClick={() => reset()}>
            Clear form
          </Button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
          <Input
            label="Subject"
            placeholder="What happened?"
            {...register("subject", { required: true })}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">
              Driver
            </label>
            <select
              {...register("driver_id", { required: true })}
              className="w-full rounded-xl border border-white/10 bg-[#1a2235] px-4 py-2.5 text-sm text-[#f0f4ff] outline-none transition-all focus:border-[#f97316]"
              defaultValue=""
            >
              <option value="" disabled>
                Select the driver involved
              </option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name ?? driver.email}
                </option>
              ))}
            </select>
            {drivers.length === 0 && (
              <p className="mt-1.5 text-xs text-[#64748b]">
                No driver accounts are available yet.
              </p>
            )}
          </div>
          <textarea
            {...register("message", { required: true })}
            placeholder="Describe your issue in detail…"
            rows={4}
            className="w-full bg-[#1a2235] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f0f4ff] placeholder:text-[#64748b] outline-none focus:border-[#f97316] transition-all resize-none"
          />
          <Button type="submit" loading={loading} size="md">
            Submit Complaint
          </Button>
        </form>
      </Card>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-semibold text-[#f0f4ff] text-sm">
          Your complaints ({complaints.length})
        </h2>
        {(["all", "open", "resolved"] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setStatusFilter(filter)}
            className={`rounded-full px-3 py-1 text-xs capitalize ${statusFilter === filter ? "bg-[#f97316] text-white" : "bg-[#1a2235] text-[#94a3b8] hover:text-white"}`}
          >
            {filter}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setStatusFilter("all")}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-[#cbd5e1] hover:bg-white/5"
        >
          <RotateCcw size={12} />
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {visibleComplaints.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <Badge variant={c.status === "resolved" ? "success" : "warning"}>
                {c.status}
              </Badge>
              <span className="text-xs text-[#64748b]">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </div>
            <p className="text-sm text-[#94a3b8]">{c.message}</p>
          </Card>
        ))}
        {complaints.length === 0 && (
          <Card className="p-8 text-center">
            <CheckCircle2 size={36} className="mx-auto mb-2 text-[#64748b]" />
            <div className="text-[#64748b] text-sm">No complaints filed</div>
          </Card>
        )}
        {complaints.length > 0 && visibleComplaints.length === 0 && (
          <Card className="p-8 text-center text-sm text-[#64748b]">
            No {statusFilter} complaints to show.
          </Card>
        )}
      </div>
    </div>
  )
}
