import { useEffect, useState } from "react";
import { Bell, Send } from "lucide-react";
import { supabase, type Profile } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import { toast } from "../../components/ui/Toast";

type Audience = "passenger" | "driver" | "specific";

export default function AdminNotifications() {
  const { profile } = useAuthStore();
  const [audience, setAudience] = useState<Audience>("passenger");
  const [users, setUsers] = useState<Profile[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    supabase.from("profiles").select("*").in("role", ["passenger", "driver"]).order("full_name").then(({ data, error }) => {
      if (error) toast.error(`Could not load recipients: ${error.message}`);
      else setUsers((data ?? []) as Profile[]);
    });
  }, []);

  const send = async () => {
    if (!profile || !title.trim() || !message.trim()) return;
    setSending(true);
    const recipients = audience === "specific"
      ? users.filter((user) => user.id === recipientId)
      : users.filter((user) => user.role === audience);
    if (recipients.length === 0) {
      toast.error("No matching recipients found.");
      setSending(false);
      return;
    }
    const { error } = await supabase.from("notifications").insert(recipients.map((recipient) => ({
      recipient_id: recipient.id,
      sender_id: profile.id,
      title: title.trim(),
      message: message.trim(),
    })));
    if (error) toast.error(`Could not send notification: ${error.message}`);
    else {
      toast.success(`Notification sent to ${recipients.length} ${recipients.length === 1 ? "recipient" : "recipients"}.`);
      setTitle("");
      setMessage("");
      setRecipientId("");
    }
    setSending(false);
  };

  const specificUsers = users.filter((user) => user.role === "passenger" || user.role === "driver");

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>Send notification</h1><p className="mt-1 text-sm text-[#64748b]">Share updates with passengers or drivers.</p></div>
      <Card className="p-5">
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400"><Bell size={21} /></div>
        <div className="flex flex-col gap-4">
          <div><label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Recipients</label><select value={audience} onChange={(event) => setAudience(event.target.value as Audience)} className="w-full rounded-xl border border-white/10 bg-[#1a2235] px-4 py-2.5 text-sm text-[#f0f4ff] outline-none focus:border-violet-400"><option value="passenger">All passengers</option><option value="driver">All drivers</option><option value="specific">One person</option></select></div>
          {audience === "specific" && <div><label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Recipient</label><select value={recipientId} onChange={(event) => setRecipientId(event.target.value)} className="w-full rounded-xl border border-white/10 bg-[#1a2235] px-4 py-2.5 text-sm text-[#f0f4ff] outline-none focus:border-violet-400"><option value="">Select a passenger or driver</option>{specificUsers.map((user) => <option key={user.id} value={user.id}>{user.full_name ?? user.email} ({user.role})</option>)}</select></div>}
          <Input label="Title" placeholder="Service update" value={title} onChange={(event) => setTitle(event.target.value)} />
          <div><label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">Message</label><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} placeholder="Write your notification…" className="w-full resize-none rounded-xl border border-white/10 bg-[#1a2235] px-4 py-3 text-sm text-[#f0f4ff] outline-none placeholder:text-[#64748b] focus:border-violet-400" /></div>
          <Button loading={sending} disabled={!title.trim() || !message.trim() || (audience === "specific" && !recipientId)} onClick={send}><Send size={15} />Send notification</Button>
        </div>
      </Card>
    </div>
  );
}
