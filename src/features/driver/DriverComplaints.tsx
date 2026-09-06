import { useEffect, useState } from "react";
import { supabase, type Complaint } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { Star } from "lucide-react";

export default function DriverComplaints() {
  const { profile } = useAuthStore();
  const [complaints, setComplaints] = useState<Complaint[]>([]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("complaints")
      .select("*")
      .eq("driver_id", profile.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setComplaints(data ?? []));
  }, [profile]);

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

      {complaints.length === 0 ? (
        <Card className="p-8 text-center">
          <Star size={42} className="mx-auto mb-3 text-[#f59e0b]" />
          <div className="text-[#64748b] text-sm">No complaints — keep up the great work!</div>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {complaints.map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-medium text-[#f0f4ff]">
                  Passenger complaint
                </div>
                <Badge variant={c.status === "resolved" ? "success" : "warning"}>
                  {c.status}
                </Badge>
              </div>
              {c.subject && <div className="mb-1 text-sm font-medium text-[#f0f4ff]">{c.subject}</div>}
              <p className="text-sm text-[#94a3b8] mb-2">{c.message}</p>
              <span className="text-xs text-[#64748b]">
                {new Date(c.created_at).toLocaleDateString()}
              </span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
