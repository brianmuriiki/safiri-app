import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase, type Vehicle, type Route } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { toast } from "../../components/ui/Toast";
import { Plus, Ban, Trash2, Bike, Bus, Car } from "lucide-react";

interface VehicleForm {
  type: "matatu" | "bus" | "taxi" | "bodaboda";
  number_plate: string;
  seat_count: number;
  model: string;
  color: string;
  location: string;
  route_id: string;
}

const vehicleIcons = {
  matatu: Bus,
  bus: Bus,
  taxi: Car,
  bodaboda: Bike,
};

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banning, setBanning] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<VehicleForm>();

  const load = () =>
    supabase
      .from("vehicles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Could not load vehicles: ${error.message}`);
        else setVehicles(data ?? []);
      });

  useEffect(() => {
    load();
    supabase.from("routes").select("*").eq("active", true).then(({ data }) => setRoutes(data ?? []));
  }, []);

  const onSubmit = async (data: VehicleForm) => {
    setLoading(true);
    const seatCount = Number(data.seat_count);
    if (!Number.isInteger(seatCount) || seatCount < 1 || seatCount > 200) {
      toast.error("Capacity must be a whole number between 1 and 200");
      setLoading(false);
      return;
    }
    const { error } = await supabase.from("vehicles").insert({
      ...data,
      route_id: data.route_id || null,
      seat_count: seatCount,
      seat_map: Array.from({ length: seatCount }, (_, index) => index + 1),
    });
    if (error) {
      toast.error(`Could not register vehicle: ${error.message}`);
      setLoading(false);
      return;
    }
    reset();
    setOpen(false);
    await load();
    toast.success("Vehicle registered successfully");
    setLoading(false);
  };

  const toggleBan = async (v: Vehicle) => {
    setBanning(v.id);
    const { error } = await supabase
      .from("vehicles")
      .update({ status: v.status === "banned" ? "active" : "banned" })
      .eq("id", v.id);
    if (error) toast.error(`Could not update vehicle: ${error.message}`);
    else await load();
    setBanning(null);
  };

  const removeVehicle = async (id: string) => {
    if (!window.confirm("Remove this vehicle? Vehicles with trip history will be archived instead.")) return;
    setRemoving(id);
    const { data: schedules, error: scheduleLookupError } = await supabase
      .from("schedules")
      .select("id")
      .eq("vehicle_id", id);

    if (scheduleLookupError) {
      toast.error(`Could not check vehicle schedules: ${scheduleLookupError.message}`);
      setRemoving(null);
      return;
    }

    if ((schedules ?? []).length > 0) {
      const { error: cancelError } = await supabase
        .from("schedules")
        .update({ status: "cancelled" })
        .eq("vehicle_id", id)
        .eq("status", "scheduled");
      if (cancelError) {
        toast.error(`Could not cancel vehicle schedules: ${cancelError.message}`);
        setRemoving(null);
        return;
      }

      const { error: retireError } = await supabase
        .from("vehicles")
        .update({ status: "inactive" })
        .eq("id", id);
      if (retireError) {
        toast.error(`Could not retire vehicle: ${retireError.message}`);
      } else {
        await load();
        toast.success("Vehicle removed from passenger listings; its scheduled trips were cancelled.");
      }
      setRemoving(null);
      return;
    }

    const { error } = await supabase.from("vehicles").delete().eq("id", id);
    if (error) {
      toast.error(`Could not remove vehicle: ${error.message}`);
    } else {
      await load();
      toast.success("Vehicle removed");
    }
    setRemoving(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
            Vehicles
          </h1>
          <p className="text-[#64748b] text-sm mt-1">All registered vehicles</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={15} />
          Add Vehicle
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {vehicles.map((v) => {
          const VehicleIcon = vehicleIcons[v.type] ?? Car;
          return <Card key={v.id} className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15 text-[#f97316]"><VehicleIcon size={20} /></div>
                <div>
                  <div className="font-medium text-[#f0f4ff] text-sm">
                    {v.number_plate}
                  </div>
                  <div className="text-xs text-[#64748b]">
                    {v.model ?? v.type} · {v.color ?? "—"}
                  </div>
                </div>
              </div>
              <Badge
                variant={
                  v.status === "active"
                    ? "success"
                    : v.status === "banned"
                      ? "danger"
                      : "default"
                }
              >
                {v.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-[#64748b]">
                {v.location ? `${v.location} · ` : ""}{v.seat_count} seats
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={v.status === "banned" ? "success" : "danger"}
                  loading={banning === v.id}
                  onClick={() => toggleBan(v)}
                >
                  <Ban size={12} />
                  {v.status === "banned" ? "Unban" : "Ban"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={removing === v.id}
                  onClick={() => removeVehicle(v.id)}
                >
                  <Trash2 size={12} />
                  Remove
                </Button>
              </div>
            </div>
          </Card>;
        })}
        {vehicles.length === 0 && (
          <Card className="p-8 text-center col-span-2">
            <Car size={36} className="mx-auto mb-2 text-[#64748b]" />
            <div className="text-[#64748b] text-sm">No vehicles registered</div>
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add New Vehicle">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-[#94a3b8] block mb-1.5">
              Type
            </label>
            <select
              {...register("type", { required: true })}
              className="w-full bg-[#1a2235] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f0f4ff] outline-none focus:border-[#f97316] transition-all"
            >
              <option value="matatu">Matatu</option>
              <option value="bus">Bus</option>
              <option value="taxi">Taxi</option>
              <option value="bodaboda">Bodaboda</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Plate Number" placeholder="KAA 000A" {...register("number_plate", { required: true })} />
            <Input label="Capacity" type="number" min={1} max={200} placeholder="14" {...register("seat_count", { required: true, min: 1, max: 200 })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Model" placeholder="Toyota HiAce" {...register("model")} />
            <Input label="Color" placeholder="Yellow/Green" {...register("color")} />
          </div>
          <Input
            label="Current / pickup location"
            placeholder="Nairobi CBD, Kencom stage"
            {...register("location", { required: true })}
          />
          <div>
            <label className="text-sm font-medium text-[#94a3b8] block mb-1.5">
              Assign Route
            </label>
            <select
              {...register("route_id")}
              className="w-full bg-[#1a2235] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f0f4ff] outline-none focus:border-[#f97316] transition-all"
            >
              <option value="">— No route —</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={loading}>
            Register Vehicle
          </Button>
        </form>
      </Modal>
    </div>
  );
}
