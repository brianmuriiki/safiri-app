import { useEffect, useState } from "react";
import { supabase, type Activity } from "../../lib/supabase";
import { useAuthStore } from "../../store/authStore";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import { CardSkeleton } from "../../components/ui/Skeleton";
import { toast } from "../../components/ui/Toast";
import { Search, Zap, Target } from "lucide-react";

const typeColors: Record<string, "info" | "success" | "warning" | "default"> = {
  tour: "info",
  safari: "success",
  bodaboda: "warning",
  taxi: "default",
  general: "default",
};

export default function ActivitiesPage() {
  const { profile } = useAuthStore();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState("all");
  const [selected, setSelected] = useState<Activity | null>(null);
  const [activityDate, setActivityDate] = useState("");
  const [guests, setGuests] = useState(1);
  const [notes, setNotes] = useState("");
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    supabase
      .from("activities")
      .select("*")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setActivities(data ?? []);
        setLoading(false);
      });
  }, []);

  const types = ["all", ...Array.from(new Set(activities.map((a) => a.type)))];

  const filtered = activities.filter((a) => {
    const matchSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.description ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = activeType === "all" || a.type === activeType;
    return matchSearch && matchType;
  });

  const openBooking = (activity: Activity) => {
    setSelected(activity);
    setActivityDate(new Date(Date.now() + 86_400_000).toISOString().slice(0, 10));
    setGuests(1);
    setNotes("");
  };

  const submitBooking = async () => {
    if (!profile || !selected || !activityDate) return;
    setBooking(true);
    const { error } = await supabase.from("activity_bookings").insert({
      activity_id: selected.id,
      passenger_id: profile.id,
      activity_date: activityDate,
      guests,
      notes: notes.trim() || null,
      status: "requested",
    });
    setBooking(false);

    if (error) {
      toast.error(`Could not request activity: ${error.message}`);
      return;
    }
    setSelected(null);
    toast.success("Activity requested! We'll confirm your booking shortly.");
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden mb-8 h-48">
        <img
          src="https://images.unsplash.com/photo-1516426122078-c23e76319801?w=1200&h=400&fit=crop&auto=format"
          alt="Kenya safari"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0f1e]/90 to-transparent flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-[#f97316]" />
            <span className="text-xs text-[#f97316] font-medium">
              Featured Experiences
            </span>
          </div>
          <h1
            className="text-3xl font-bold text-white"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Activities & Experiences
          </h1>
          <p className="text-white/60 text-sm mt-1">
            Discover curated travel experiences across Kenya
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]"
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search activities…"
          className="w-full bg-[#1a2235] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-[#f0f4ff] placeholder:text-[#64748b] outline-none focus:border-[#f97316] transition-all"
        />
      </div>

      {/* Type filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setActiveType(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-all ${
              activeType === t
                ? "bg-[#f97316] text-white"
                : "bg-[#1a2235] text-[#64748b] hover:text-[#f0f4ff]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Target size={42} className="mx-auto mb-3 text-[#64748b]" />
          <div className="text-[#64748b]">No activities found</div>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a) => (
            <Card key={a.id} hover className="overflow-hidden group">
              <div className="h-40 bg-[#1a2235] overflow-hidden relative">
                {a.image_url ? (
                  <img
                    src={a.image_url}
                    alt={a.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#64748b]"><Target size={36} /></div>
                )}
                <div className="absolute top-3 left-3">
                  <Badge variant={typeColors[a.type] ?? "default"}>
                    {a.type}
                  </Badge>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[#f0f4ff] mb-1.5 leading-snug">
                  {a.title}
                </h3>
                <p className="text-xs text-[#64748b] line-clamp-3 leading-relaxed">
                  {a.description}
                </p>
                <div className="mt-3 pt-3 border-t border-white/5 text-xs text-[#64748b]">
                  {new Date(a.created_at).toLocaleDateString("en-KE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </div>
                <Button size="sm" className="mt-3 w-full" onClick={() => openBooking(a)}>
                  Book activity
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => !booking && setSelected(null)}
        title={selected ? `Book ${selected.title}` : "Book activity"}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-[#94a3b8]">
            Choose your preferred date and group size. We will confirm availability with you.
          </p>
          <Input
            label="Preferred date"
            type="date"
            value={activityDate}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(event) => setActivityDate(event.target.value)}
          />
          <Input
            label="Number of travellers"
            type="number"
            min="1"
            value={guests}
            onChange={(event) => setGuests(Math.max(1, Number(event.target.value) || 1))}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#94a3b8]">
              Notes for the organiser <span className="text-[#64748b]">(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Pickup needs, group details, or a question…"
              className="w-full resize-none rounded-xl border border-white/10 bg-[#1a2235] px-4 py-3 text-sm text-[#f0f4ff] outline-none transition-all placeholder:text-[#64748b] focus:border-[#f97316]"
            />
          </div>
          <Button loading={booking} disabled={!activityDate} onClick={submitBooking}>
            Send booking request
          </Button>
        </div>
      </Modal>
    </div>
  );
}
