import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase, type Complaint, type Profile } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { toast } from "../../components/ui/Toast";
import { CheckCircle2 } from "lucide-react";

interface FormData {
  subject: string;
  driver_id: string;
  message: string;
}

export default function ComplaintsPage() {
  const { profile } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [drivers, setDrivers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<FormData>();

  const load = () => {
    if (!profile) return;
    supabase
      .from("complaints")
      .select("*")
      .eq("passenger_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setComplaints(data ?? []));
  };

  useEffect(load, [profile]);

  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("role", "driver")
      .then(({ data }) => setDrivers((data ?? []) as Profile[]));
  }, []);

  const onSubmit = async (data: FormData) => {
    if (!profile) return;
    setLoading(true);
    const { error } = await supabase.from("complaints").insert({
      passenger_id: profile.id,
      subject: data.subject.trim(),
      driver_id: data.driver_id,
      message: data.message,
    });
    if (error) {
      toast.error(`Failed to submit complaint: ${error.message}`);
    } else {
      toast.success("Complaint submitted successfully");
      reset();
      load();
    }
    setLoading(false);
  };

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
        <h2 className="font-semibold text-[#f0f4ff] mb-3 text-sm">
          Submit a complaint
        </h2>
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
              <option value="" disabled>Select the driver involved</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.full_name ?? driver.email}
                </option>
              ))}
            </select>
            {drivers.length === 0 && (
              <p className="mt-1.5 text-xs text-[#64748b]">No driver accounts are available yet.</p>
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

      <h2 className="font-semibold text-[#f0f4ff] mb-3 text-sm">
        Your complaints ({complaints.length})
      </h2>
      <div className="flex flex-col gap-3">
        {complaints.map((c) => (
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
      </div>
    </div>
  );
}
