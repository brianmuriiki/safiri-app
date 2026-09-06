import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase, type Route } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { toast } from "../../components/ui/Toast";
import { Plus, Trash2, MapPin, Map } from "lucide-react";

interface RouteForm {
  name: string;
  origin: string;
  destination: string;
  location: string;
  distance_km: number;
  base_fare: number;
}

export default function AdminRoutes() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { register, handleSubmit, reset } = useForm<RouteForm>();

  const load = () =>
    supabase
      .from("routes")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Could not load routes: ${error.message}`);
        else setRoutes(data ?? []);
      });

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: RouteForm) => {
    setLoading(true);
    const { error } = await supabase.from("routes").insert({
      ...data,
      distance_km: Number(data.distance_km),
      base_fare: Number(data.base_fare),
    });
    if (error) {
      toast.error(`Could not create route: ${error.message}`);
      setLoading(false);
      return;
    }
    reset();
    setOpen(false);
    await load();
    toast.success("Route created successfully");
    setLoading(false);
  };

  const deleteRoute = async (id: string) => {
    if (!window.confirm("Remove this route? This cannot be undone.")) return;
    setDeleting(id);
    const { error } = await supabase.from("routes").delete().eq("id", id);
    if (error) {
      toast.error(`Could not remove route: ${error.message}`);
    } else {
      await load();
      toast.success("Route removed");
    }
    setDeleting(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Routes
          </h1>
          <p className="text-[#64748b] text-sm mt-1">
            Manage all transport routes
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={15} />
          Add Route
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {routes.map((r) => (
          <Card key={r.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
                <MapPin size={16} className="text-[#f97316]" />
              </div>
              <div>
                <div className="font-medium text-[#f0f4ff] text-sm">{r.name}</div>
                <div className="text-xs text-[#64748b]">
                  {r.origin} → {r.destination} · {r.distance_km} km{r.location ? ` · ${r.location}` : ""}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right mr-2">
                <div className="text-sm font-bold text-[#f97316]">
                  KES {r.base_fare}
                </div>
                <Badge variant={r.active ? "success" : "danger"}>
                  {r.active ? "Active" : "Inactive"}
                </Badge>
              </div>
              <Button
                size="sm"
                variant="danger"
                loading={deleting === r.id}
                onClick={() => deleteRoute(r.id)}
              >
                <Trash2 size={12} />
                Remove
              </Button>
            </div>
          </Card>
        ))}
        {routes.length === 0 && (
          <Card className="p-8 text-center">
            <Map size={36} className="mx-auto mb-2 text-[#64748b]" />
            <div className="text-[#64748b] text-sm">No routes yet</div>
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add New Route">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input
            label="Route Name"
            placeholder="CBD → Westlands"
            {...register("name", { required: true })}
          />
          <Input
            label="Origin"
            placeholder="Nairobi CBD"
            {...register("origin", { required: true })}
          />
          <Input
            label="Destination"
            placeholder="Westlands"
            {...register("destination", { required: true })}
          />
          <Input
            label="Main pickup location"
            placeholder="Kencom stage, Nairobi CBD"
            {...register("location", { required: true })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Distance (km)"
              type="number"
              placeholder="8"
              {...register("distance_km", { required: true })}
            />
            <Input
              label="Base Fare (KES)"
              type="number"
              placeholder="50"
              {...register("base_fare", { required: true })}
            />
          </div>
          <Button type="submit" loading={loading}>
            Create Route
          </Button>
        </form>
      </Modal>
    </div>
  );
}
