import { useNavigate } from "react-router-dom";
import { MapPin, Shield, Zap, Phone, Star, ArrowRight, Bus, CheckCircle, Car, Bike } from "lucide-react";
import Button from "../../components/ui/Button";

const stats = [
  { value: "50K+", label: "Happy passengers" },
  { value: "200+", label: "Daily routes" },
  { value: "1.2K+", label: "Registered drivers" },
  { value: "4.8★", label: "Average rating" },
];

const features = [
  {
    icon: <MapPin size={22} className="text-[#f97316]" />,
    title: "Find any route",
    desc: "Search matatus, buses, taxis, and bodabodas across Nairobi and beyond in seconds.",
    bg: "#f97316",
  },
  {
    icon: <Phone size={22} className="text-[#22c55e]" />,
    title: "Pay with M-Pesa",
    desc: "Secure, instant M-Pesa STK push payments. No cash, no hassle.",
    bg: "#22c55e",
  },
  {
    icon: <Zap size={22} className="text-[#f59e0b]" />,
    title: "Digital tickets",
    desc: "Get your QR-code ticket instantly. Show it to board — no printing needed.",
    bg: "#f59e0b",
  },
  {
    icon: <Shield size={22} className="text-[#8b5cf6]" />,
    title: "Verified drivers",
    desc: "Every driver is vetted and rated. Travel with total confidence.",
    bg: "#8b5cf6",
  },
];

const vehicles = [
  { icon: Bus, name: "Matatu", desc: "Fast, frequent, affordable" },
  { icon: Bus, name: "Bus", desc: "Comfortable long-distance" },
  { icon: Car, name: "Taxi", desc: "Private, door-to-door" },
  { icon: Bike, name: "Bodaboda", desc: "Quick last-mile rides" },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen bg-[#0a0f1e] text-[#f0f4ff] overflow-x-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
    >
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-[#0a0f1e]/80 backdrop-blur-md border-b border-white/8 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#f97316] flex items-center justify-center">
            <span className="text-white font-bold" style={{ fontFamily: "Fraunces, serif" }}>
              S
            </span>
          </div>
          <span
            className="text-xl font-bold"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Safiri
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>
            Sign in
          </Button>
          <Button size="sm" onClick={() => navigate("/auth")}>
            Get started
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 pt-20 pb-24 max-w-6xl mx-auto">
        {/* Decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#f97316]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-[#f97316]/10 border border-[#f97316]/20 rounded-full px-4 py-1.5 text-sm text-[#f97316] font-medium mb-6">
              <Zap size={13} />
              Kenya's #1 transport booking platform
            </div>
            <h1
              className="text-5xl lg:text-6xl font-bold leading-[1.1] mb-6"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Travel Kenya{" "}
              <span className="text-[#f97316]">your</span>{" "}
              <span className="italic">way.</span>
            </h1>
            <p className="text-lg text-[#94a3b8] mb-8 leading-relaxed max-w-lg">
              Book matatus, buses, taxis and bodabodas across Nairobi and beyond.
              Pay with M-Pesa. Get digital tickets instantly.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              <Button size="lg" onClick={() => navigate("/auth")}>
                Start booking <ArrowRight size={16} />
              </Button>
              <Button size="lg" variant="secondary" onClick={() => navigate("/auth")}>
                I'm a driver
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#64748b]">
              <CheckCircle size={14} className="text-[#22c55e]" />
              Free to join · No hidden fees · Cancel anytime
            </div>
          </div>

          {/* Hero image */}
          <div className="relative hidden lg:block">
            <div className="rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl shadow-black/40">
              <img
                src="https://images.unsplash.com/photo-1558981285-6f0c94958bb6?w=800&h=600&fit=crop&auto=format"
                alt="Nairobi matatu"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f1e]/50 to-transparent" />
            </div>
            {/* Floating cards */}
            <div className="absolute -left-8 top-1/2 -translate-y-1/2 bg-[#111827] border border-white/10 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-[#f97316]"><Bus size={17} /></div>
                <div>
                  <div className="text-xs font-semibold text-[#f0f4ff]">CBD → Westlands</div>
                  <div className="text-xs text-[#64748b]">Departs 2:30 PM</div>
                </div>
              </div>
              <div className="text-xs font-bold text-[#f97316]">KES 50 · 8 seats left</div>
            </div>
            <div className="absolute -right-4 bottom-8 bg-[#111827] border border-white/10 rounded-2xl p-3 shadow-2xl">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-[#22c55e]" />
                <div className="text-xs text-[#f0f4ff] font-medium">Payment confirmed</div>
              </div>
              <div className="text-xs text-[#64748b] mt-0.5">M-Pesa · KES 50</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-white/8 py-10">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div
                className="text-3xl font-bold text-[#f97316] mb-1"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {s.value}
              </div>
              <div className="text-sm text-[#64748b]">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Vehicle types */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2
            className="text-3xl font-bold mb-3"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Every vehicle, one platform
          </h2>
          <p className="text-[#64748b]">
            From quick bodaboda hops to long-distance buses — Safiri has it all.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {vehicles.map((v) => {
            const VehicleIcon = v.icon;
            return (
            <div
              key={v.name}
              className="bg-[#111827] border border-white/8 rounded-2xl p-6 text-center hover:border-orange-500/30 hover:bg-[#141e33] transition-all duration-200 cursor-default"
            >
              <VehicleIcon size={36} className="mx-auto mb-3 text-[#f97316]" />
              <div className="font-semibold text-[#f0f4ff] mb-1">{v.name}</div>
              <div className="text-xs text-[#64748b]">{v.desc}</div>
            </div>
            );
          })}
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-[#0d1424]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-3xl font-bold mb-3"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              Built for Kenyan travellers
            </h2>
            <p className="text-[#64748b]">Everything you need, nothing you don't.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-[#111827] border border-white/8 rounded-2xl p-6 hover:border-white/15 transition-all"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${f.bg}15` }}
                >
                  {f.icon}
                </div>
                <h3 className="font-semibold text-[#f0f4ff] mb-2">{f.title}</h3>
                <p className="text-sm text-[#64748b] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <h2
          className="text-3xl font-bold text-center mb-10"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          What passengers say
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            {
              name: "Wanjiru M.",
              location: "Nairobi",
              text: "Safiri saved me 20 minutes every morning. I book my matatu while having breakfast!",
              stars: 5,
            },
            {
              name: "Brian O.",
              location: "Westlands",
              text: "Paying with M-Pesa is seamless. The digital ticket on my phone — brilliant.",
              stars: 5,
            },
            {
              name: "Aisha K.",
              location: "Kibera",
              text: "Finally, an app that understands how we travel in Kenya. Highly recommend.",
              stars: 5,
            },
          ].map((t) => (
            <div
              key={t.name}
              className="bg-[#111827] border border-white/8 rounded-2xl p-5"
            >
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.stars }).map((_, i) => (
                  <Star key={i} size={13} className="text-[#f59e0b] fill-[#f59e0b]" />
                ))}
              </div>
              <p className="text-sm text-[#94a3b8] mb-4 leading-relaxed">
                "{t.text}"
              </p>
              <div>
                <div className="text-sm font-semibold text-[#f0f4ff]">{t.name}</div>
                <div className="text-xs text-[#64748b]">{t.location}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center bg-gradient-to-br from-[#f97316] to-[#ea580c] rounded-3xl p-12 relative overflow-hidden">
          <Bus size={140} className="absolute right-2 top-2 opacity-10" aria-hidden="true" />
          <h2
            className="text-4xl font-bold text-white mb-4 relative"
            style={{ fontFamily: "Fraunces, serif" }}
          >
            Ready to travel smarter?
          </h2>
          <p className="text-orange-100/80 mb-8 relative">
            Join over 50,000 Kenyans already using Safiri.
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-orange-600 hover:bg-orange-50 border-0 shadow-xl relative"
          >
            Create free account <ArrowRight size={16} />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 py-8 px-6 text-center text-xs text-[#64748b]">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-[#f97316] flex items-center justify-center">
            <span className="text-white font-bold text-xs">S</span>
          </div>
          <span className="font-semibold text-[#f0f4ff]" style={{ fontFamily: "Fraunces, serif" }}>
            Safiri
          </span>
        </div>
        <p>© {new Date().getFullYear()} Safiri. Built for Kenya.</p>
      </footer>
    </div>
  );
}
