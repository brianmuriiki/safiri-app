import { useEffect, useState } from "react";
import { supabase, type Complaint } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { CheckCircle, CheckCircle2 } from "lucide-react";

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [resolving, setResolving] = useState<string | null>(null);

  const load = () =>
    supabase
      .from("complaints")
      .select("*, profiles!passenger_id(full_name, email)")
      .order("created_at", { ascending: false })
      .then(({ data }) => setComplaints(data ?? []));

  useEffect(() => { load(); }, []);

  const resolve = async (id: string) => {
    setResolving(id);
    await supabase.from("complaints").update({ status: "resolved" }).eq("id", id);
    await load();
    setResolving(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "Fraunces, serif" }}>
        Complaints
      </h1>
      <p className="text-[#64748b] text-sm mb-6">All passenger complaints</p>

      <div className="flex flex-col gap-3">
        {complaints.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-[#f0f4ff]">
                  {(c as any).profiles?.full_name ?? (c as any).profiles?.email ?? "Unknown"}
                </div>
                <div className="text-xs text-[#64748b]">
                  {new Date(c.created_at).toLocaleString()}
                </div>
              </div>
              <Badge variant={c.status === "resolved" ? "success" : "warning"}>
                {c.status}
              </Badge>
            </div>
            <p className="text-sm text-[#94a3b8] mb-3">{c.message}</p>
            {c.status === "open" && (
              <Button
                size="sm"
                variant="success"
                loading={resolving === c.id}
                onClick={() => resolve(c.id)}
              >
                <CheckCircle size={13} />
                Mark Resolved
              </Button>
            )}
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
