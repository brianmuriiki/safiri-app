import { useEffect, useState } from "react";
import { supabase, type Profile, type UserRole } from "../../lib/supabase";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";
import { Search, Ban, Shield } from "lucide-react";

export default function AdminUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [driverEmail, setDriverEmail] = useState("");
  const [addingDriver, setAddingDriver] = useState(false);

  const load = () =>
    supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) toast.error(`Could not load users: ${error.message}`);
        else setUsers(data ?? []);
      });

  useEffect(() => { load(); }, []);

  const banUser = async (id: string, ban: boolean) => {
    setLoading(id);
    const { error } = await supabase
      .from("profiles")
      .update({ banned_at: ban ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) toast.error(`Could not update user: ${error.message}`);
    else await load();
    setLoading(null);
  };

  const setRole = async (id: string, role: UserRole) => {
    setLoading(id);
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) toast.error(`Could not change role: ${error.message}`);
    else await load();
    setLoading(null);
  };

  const addDriver = async () => {
    const email = driverEmail.trim().toLowerCase();
    if (!email) return;
    setAddingDriver(true);
    const { data: user, error: findError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (findError) {
      toast.error(`Could not find user: ${findError.message}`);
    } else if (!user) {
      toast.error("No account exists for that email. Ask the person to register first.");
    } else {
      const { error } = await supabase
        .from("profiles")
        .update({ role: "driver" })
        .eq("id", user.id);
      if (error) toast.error(`Could not add driver: ${error.message}`);
      else {
        setDriverEmail("");
        toast.success("Driver added successfully");
        await load();
      }
    }
    setAddingDriver(false);
  };

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const roleVariant = (r: string) =>
    r === "admin" ? "danger" : r === "driver" ? "success" : "info";

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1
        className="text-2xl font-bold mb-1"
        style={{ fontFamily: "Fraunces, serif" }}
      >
        Users
      </h1>
      <p className="text-[#64748b] text-sm mb-6">
        Manage all registered users
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="w-full bg-[#1a2235] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#f0f4ff] placeholder:text-[#64748b] outline-none focus:border-[#f97316] transition-all"
        />
        </div>
        <div className="flex gap-2">
          <input
            type="email"
            value={driverEmail}
            onChange={(e) => setDriverEmail(e.target.value)}
            placeholder="Existing user email"
            aria-label="Existing user email"
            className="min-w-0 flex-1 bg-[#1a2235] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#f0f4ff] placeholder:text-[#64748b] outline-none focus:border-[#22c55e] transition-all"
          />
          <Button variant="success" loading={addingDriver} onClick={addDriver}>
            <Shield size={14} />
            Add Driver
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              {["User", "Role", "Status", "Joined", "Actions"].map((h) => (
                <th key={h} className="text-left text-xs text-[#64748b] font-medium px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/3">
                <td className="px-4 py-3">
                  <div className="font-medium text-[#f0f4ff]">
                    {u.full_name ?? "—"}
                  </div>
                  <div className="text-xs text-[#64748b]">{u.email}</div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) => setRole(u.id, e.target.value as UserRole)}
                    className="bg-[#1a2235] border border-white/10 rounded-lg px-2 py-1 text-xs text-[#f0f4ff] outline-none"
                  >
                    <option value="passenger">Passenger</option>
                    <option value="driver">Driver</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.banned_at ? "danger" : "success"}>
                    {u.banned_at ? "Banned" : "Active"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-[#64748b]">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant={u.banned_at ? "success" : "danger"}
                    loading={loading === u.id}
                    onClick={() => banUser(u.id, !u.banned_at)}
                  >
                    <Ban size={12} />
                    {u.banned_at ? "Unban" : "Ban"}
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[#64748b] text-sm">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
