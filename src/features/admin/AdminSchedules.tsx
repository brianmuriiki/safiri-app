import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase, type Schedule, type Route, type Vehicle, type Profile } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { toast } from "../../components/ui/Toast";
import { Plus, Trash2 } from "lucide-react";

interface ScheduleForm {
  route_id: string;
  vehicle_id: string;
  driver_id: string;
  departure_at: string;
  arrival_at: string;
  seats_available: number;
  price: number;
}

export default function AdminSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<ScheduleForm>();

  const load = () =>
    supabase
      .from("schedules")
      .select("*, routes(*), vehicles(*), profiles!driver_id(full_name, email)")
      .order("departure_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Could not load schedules: ${error.message}`);
        else setSchedules(data ?? []);
      });

  useEffect(() => {
    load();
    supabase.from("routes").select("*").eq("active", true).then(({ data }) => setRoutes(data ?? []));
    supabase.from("vehicles").select("*").eq("status", "active").then(({ data }) => setVehicles(data ?? []));
    supabase.from("profiles").select("*").eq("role", "driver").then(({ data }) => setDrivers(data ?? []));
  }, []);

  const onSubmit = async (data: ScheduleForm) => {
    setLoading(true);
    const vehicle = vehicles.find((v) => v.id === data.vehicle_id);
    const departure = new Date(data.departure_at);
    const arrival = new Date(data.arrival_at);
    const seats = Number(data.seats_available || vehicle?.seat_count || 14);
    const price = Number(data.price);
    if (arrival <= departure) {
      toast.error("Arrival must be after departure");
      setLoading(false);
      return;
    }
    if (!Number.isInteger(seats) || seats < 1 || seats > (vehicle?.seat_count ?? 200)) {
      toast.error("Seats must be positive and cannot exceed vehicle capacity");
      setLoading(false);
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      toast.error("Price must be zero or greater");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("schedules").insert({
      ...data,
      departure_at: departure.toISOString(),
      arrival_at: arrival.toISOString(),
      seats_available: seats,
      price,
    });
    if (error) {
      toast.error(`Could not create schedule: ${error.message}`);
      setLoading(false);
      return;
    }
    reset();
    setOpen(false);
    await load();
    toast.success("Schedule created successfully");
    setLoading(false);
  };

  const deleteSchedule = async (id: string) => {
    const { error } = await supabase.from("schedules").update({ status: "cancelled" }).eq("id", id);
    if (error) toast.error(`Could not cancel schedule: ${error.message}`);
    else await load();
  };

  const statusVariant = (s: string) =>
    s === "completed" ? "success" : s === "in_progress" ? "info" : s === "cancelled" ? "danger" : "default";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
            Schedules
          </h1>
          <p className="text-[#64748b] text-sm mt-1">Assign vehicles and drivers to routes</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={15} />
          Add Schedule
        </Button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              {["Route", "Vehicle", "Driver", "Departure", "Status", ""].map((h) => (
                <th key={h} className="text-left text-xs text-[#64748b] font-medium px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {schedules.map((s) => (
              <tr key={s.id} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                <td className="px-4 py-3 text-[#f0f4ff]">
                  {(s.routes as any)?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-[#94a3b8] text-xs">
                  {(s.vehicles as any)?.number_plate ?? "—"}
                </td>
                <td className="px-4 py-3 text-[#94a3b8] text-xs">
                  {(s.profiles as any)?.full_name ?? (s.profiles as any)?.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs text-[#64748b]">
                  {new Date(s.departure_at).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="danger" onClick={() => deleteSchedule(s.id)}>
                    <Trash2 size={12} />
                  </Button>
                </td>
              </tr>
            ))}
            {schedules.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[#64748b] text-sm">
                  No schedules yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Create Schedule" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-[#94a3b8] block mb-1.5">Route</label>
              <select {...register("route_id", { required: true })}
                className="w-full bg-[#1a2235] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f0f4ff] outline-none focus:border-[#f97316]">
                <option value="">Select route</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-[#94a3b8] block mb-1.5">Vehicle</label>
              <select {...register("vehicle_id", { required: true })}
                className="w-full bg-[#1a2235] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f0f4ff] outline-none focus:border-[#f97316]">
                <option value="">Select vehicle</option>
                {vehicles.map((v) => <option key={v.id} value={v.id}>{v.number_plate} ({v.type})</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-[#94a3b8] block mb-1.5">Driver</label>
            <select {...register("driver_id", { required: true })}
              className="w-full bg-[#1a2235] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-[#f0f4ff] outline-none focus:border-[#f97316]">
              <option value="">Select driver</option>
              {drivers.map((d) => <option key={d.id} value={d.id}>{d.full_name ?? d.email}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Departure" type="datetime-local" {...register("departure_at", { required: true })} />
            <Input label="Arrival" type="datetime-local" {...register("arrival_at", { required: true })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Seats Available" type="number" min={1} placeholder="14" {...register("seats_available", { min: 1 })} />
            <Input label="Price (KES)" type="number" min={0} placeholder="50" {...register("price", { required: true, min: 0 })} />
          </div>
          <Button type="submit" loading={loading}>Create Schedule</Button>
        </form>
      </Modal>
    </div>
  );
}
