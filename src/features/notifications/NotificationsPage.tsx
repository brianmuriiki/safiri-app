import { useEffect, useState } from "react";
import { Bell, CheckCheck, Inbox } from "lucide-react";
import { supabase, type AppNotification } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import { toast } from "../../components/ui/Toast";

export default function NotificationsPage() {
  const { profile } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const load = async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", profile.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(`Could not load notifications: ${error.message}`);
    else setNotifications((data ?? []) as AppNotification[]);
  };

  useEffect(() => { void load(); }, [profile]);

  const markAllRead = async () => {
    if (!profile) return;
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("recipient_id", profile.id)
      .is("read_at", null);
    if (error) toast.error(`Could not mark notifications as read: ${error.message}`);
    else await load();
  };

  const unread = notifications.filter((notification) => !notification.read_at).length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>Notifications</h1>
          <p className="mt-1 text-sm text-[#64748b]">Updates from the Safiri team</p>
        </div>
        {unread > 0 && <Button size="sm" variant="secondary" onClick={markAllRead}><CheckCheck size={14} />Mark all read</Button>}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-10 text-center"><Inbox size={42} className="mx-auto mb-3 text-[#64748b]" /><p className="text-sm text-[#64748b]">You have no notifications yet.</p></Card>
      ) : (
        <div className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <Card key={notification.id} className={`p-4 ${!notification.read_at ? "border-orange-500/30 bg-orange-500/[0.03]" : ""}`}>
              <div className="flex gap-3">
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${notification.read_at ? "bg-white/5 text-[#64748b]" : "bg-orange-500/15 text-[#f97316]"}`}><Bell size={17} /></div>
                <div className="min-w-0 flex-1"><div className="mb-1 flex items-start justify-between gap-3"><h2 className="font-semibold text-[#f0f4ff]">{notification.title}</h2>{!notification.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f97316]" />}</div><p className="text-sm leading-relaxed text-[#94a3b8]">{notification.message}</p><p className="mt-3 text-xs text-[#64748b]">{new Date(notification.created_at).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}</p></div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
