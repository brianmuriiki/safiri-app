import { useCallback, useEffect, useState } from "react"
import { Bus, ShieldCheck } from "lucide-react"
import { supabase, type Profile, type Vehicle } from "../../lib/supabase"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import { toast } from "../../components/ui/Toast"

export default function AdminVerifications() {
  const [drivers, setDrivers] = useState<Profile[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [driverResult, vehicleResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("*")
        .eq("role", "driver")
        .order("created_at", { ascending: false }),
      supabase.from("vehicles").select("*").order("created_at", { ascending: false }),
    ])
    if (driverResult.error) toast.error(`Could not load drivers: ${driverResult.error.message}`)
    if (vehicleResult.error) toast.error(`Could not load vehicles: ${vehicleResult.error.message}`)
    if (!driverResult.error) setDrivers(driverResult.data ?? [])
    if (!vehicleResult.error) setVehicles(vehicleResult.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setDriverStatus = async (driver: Profile, status: "verified" | "rejected") => {
    setBusyId(driver.id)
    const { error } = await supabase
      .from("profiles")
      .update({ driver_verification_status: status })
      .eq("id", driver.id)
    if (error) toast.error(`Could not update ${driver.full_name ?? "driver"}: ${error.message}`)
    else {
      toast.success(`${driver.full_name ?? "Driver"} marked ${status}`)
      await load()
    }
    setBusyId(null)
  }

  const setVehicleStatus = async (vehicle: Vehicle, status: "verified" | "rejected") => {
    setBusyId(vehicle.id)
    const { error } = await supabase
      .from("vehicles")
      .update({ verification_status: status })
      .eq("id", vehicle.id)
    if (error) toast.error(`Could not update ${vehicle.number_plate}: ${error.message}`)
    else {
      toast.success(`${vehicle.number_plate} marked ${status}`)
      await load()
    }
    setBusyId(null)
  }

  const needsReviewDrivers = drivers.filter((driver) => driver.driver_verification_status !== "verified")
  const needsReviewVehicles = vehicles.filter((vehicle) => vehicle.verification_status !== "verified")

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-orange-300">Admin review</p>
        <h1 className="text-2xl font-bold text-[#f0f4ff]" style={{ fontFamily: "Fraunces, serif" }}>
          Driver and vehicle verifications
        </h1>
        <p className="mt-1 text-sm text-[#64748b]">
          Review operators and vehicles before they can be assigned to passenger schedules.
        </p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Card className="flex items-center gap-3 p-4">
          <ShieldCheck className="text-emerald-300" size={20} />
          <div><div className="text-2xl font-bold text-white">{needsReviewDrivers.length}</div><div className="text-xs text-[#94a3b8]">Drivers awaiting verification</div></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <Bus className="text-sky-300" size={20} />
          <div><div className="text-2xl font-bold text-white">{needsReviewVehicles.length}</div><div className="text-xs text-[#94a3b8]">Vehicles awaiting verification</div></div>
        </Card>
      </div>

      {loading ? (
        <Card className="p-6 text-sm text-[#94a3b8]">Loading verification records…</Card>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Drivers</h2>
            <div className="space-y-3">
              {drivers.map((driver) => {
                const status = driver.driver_verification_status ?? "unverified"
                return (
                  <Card key={driver.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-[#f0f4ff]">{driver.full_name || "Name not provided"}</div>
                        <div className="mt-1 break-all text-xs text-[#64748b]">{driver.email}</div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-[#94a3b8]">
                          <Badge variant={status === "verified" ? "success" : status === "rejected" ? "danger" : "warning"}>{status}</Badge>
                          {driver.banned_at && <Badge variant="danger">banned</Badge>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {status !== "verified" && <Button size="sm" variant="success" loading={busyId === driver.id} onClick={() => void setDriverStatus(driver, "verified")}>Verify</Button>}
                        {status !== "rejected" && <Button size="sm" variant="danger" loading={busyId === driver.id} onClick={() => void setDriverStatus(driver, "rejected")}>Reject</Button>}
                      </div>
                    </div>
                  </Card>
                )
              })}
              {drivers.length === 0 && <Card className="p-5 text-sm text-[#64748b]">No driver accounts found.</Card>}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-white">Vehicles</h2>
            <div className="space-y-3">
              {vehicles.map((vehicle) => {
                const status = vehicle.verification_status ?? "unverified"
                return (
                  <Card key={vehicle.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-[#f0f4ff]">{vehicle.number_plate}</div>
                        <div className="mt-1 text-xs capitalize text-[#64748b]">{vehicle.model || vehicle.type} · {vehicle.seat_count} seats{vehicle.location ? ` · ${vehicle.location}` : ""}</div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-[#94a3b8]">
                          <Badge variant={status === "verified" ? "success" : status === "rejected" ? "danger" : "warning"}>{status}</Badge>
                          <Badge variant={vehicle.status === "active" ? "success" : "danger"}>{vehicle.status}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {status !== "verified" && <Button size="sm" variant="success" loading={busyId === vehicle.id} onClick={() => void setVehicleStatus(vehicle, "verified")}>Verify</Button>}
                        {status !== "rejected" && <Button size="sm" variant="danger" loading={busyId === vehicle.id} onClick={() => void setVehicleStatus(vehicle, "rejected")}>Reject</Button>}
                      </div>
                    </div>
                  </Card>
                )
              })}
              {vehicles.length === 0 && <Card className="p-5 text-sm text-[#64748b]">No vehicles registered.</Card>}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
