import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase, type Activity } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { toast } from "../../components/ui/Toast";
import { Plus, Trash2, Target } from "lucide-react";

interface ActivityForm {
  title: string;
  description: string;
  type: string;
  image_url: string;
}

export default function AdminActivities() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<ActivityForm>();

  const load = () =>
    supabase
      .from("activities")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Could not load activities: ${error.message}`);
        else setActivities(data ?? []);
      });

  useEffect(() => { load(); }, []);

  const onSubmit = async (data: ActivityForm) => {
    setLoading(true);
    const { error } = await supabase.from("activities").insert(data);
    if (error) {
      toast.error(`Could not add activity: ${error.message}`);
      setLoading(false);
      return;
    }
    reset();
    setOpen(false);
    await load();
    toast.success("Activity added successfully");
    setLoading(false);
  };

  const deleteActivity = async (id: string) => {
    const { error } = await supabase.from("activities").update({ active: false }).eq("id", id);
    if (error) toast.error(`Could not remove activity: ${error.message}`);
    else await load();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
            Activities
          </h1>
          <p className="text-[#64748b] text-sm mt-1">Featured transport activities</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={15} />
          Add Activity
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {activities.map((a) => (
          <Card key={a.id} className="overflow-hidden">
            {a.image_url && (
              <div className="h-32 bg-[#1a2235] overflow-hidden">
                <img src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <Badge variant="info">{a.type}</Badge>
                <Badge variant={a.active ? "success" : "danger"}>
                  {a.active ? "Active" : "Hidden"}
                </Badge>
              </div>
              <div className="font-medium text-[#f0f4ff] mb-1">{a.title}</div>
              <p className="text-xs text-[#64748b] mb-3 line-clamp-2">{a.description}</p>
              <Button size="sm" variant="danger" onClick={() => deleteActivity(a.id)}>
                <Trash2 size={12} />
                Remove
              </Button>
            </div>
          </Card>
        ))}
        {activities.length === 0 && (
          <Card className="p-8 text-center col-span-2">
            <Target size={36} className="mx-auto mb-2 text-[#64748b]" />
            <div className="text-[#64748b] text-sm">No activities yet</div>
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Activity">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Title" placeholder="Nairobi City Tour" {...register("title", { required: true })} />
          <div>
            <label className="text-sm font-medium text-[#94a3b8] block mb-1.5">Description</label>
            <textarea
              {...register("description")}
              placeholder="Describe the activity…"
              rows={3}
              className="w-full bg-[#1a2235] border border-white/10 rounded-xl px-4 py-3 text-sm text-[#f0f4ff] placeholder:text-[#64748b] outline-none focus:border-[#f97316] transition-all resize-none"
            />
          </div>
          <Input label="Type" placeholder="tour, safari, bodaboda, taxi" {...register("type")} />
          <Input label="Image URL (Unsplash)" placeholder="https://…" {...register("image_url")} />
          <Button type="submit" loading={loading}>Add Activity</Button>
        </form>
      </Modal>
    </div>
  );
}
