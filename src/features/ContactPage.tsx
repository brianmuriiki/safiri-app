import { Link } from "react-router-dom"
import { ArrowLeft, ArrowUpRight, Mail, MessageSquare, Phone, UserRound } from "lucide-react"
import { useAuthStore } from "../store/authStore"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"

export default function ContactPage() {
  const { profile } = useAuthStore()
  const supportPath = profile?.role === "admin"
    ? "/admin/complaints"
    : profile?.role === "driver"
      ? "/driver/complaints"
      : "/passenger/complaints"
  const homePath = profile?.role === "admin"
    ? "/admin"
    : profile?.role === "driver"
      ? "/driver"
      : profile
        ? "/passenger"
        : "/landing"

  return (
    <div className="mx-auto min-h-[65vh] max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
      <Link to={homePath} className="mb-6 inline-flex items-center gap-2 text-sm text-[#94a3b8] transition hover:text-white">
        <ArrowLeft size={15} /> Back to Safiri
      </Link>
      <div className="mb-8 max-w-2xl">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-orange-300">We’re here to help</p>
        <h1 className="text-3xl font-bold text-[#f0f4ff] sm:text-4xl" style={{ fontFamily: "Fraunces, serif" }}>Contact details</h1>
        <p className="mt-3 text-sm leading-6 text-[#94a3b8]">Get help with your Safiri account, a booking, or a journey.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-orange-400/10 text-orange-300"><MessageSquare size={20} /></div>
          <h2 className="text-base font-semibold text-[#f0f4ff]">Contact Safiri support</h2>
          <p className="mt-2 min-h-12 text-sm leading-6 text-[#8491a8]">Send us a message with the in-app support form. Include your trip details if your question is about a journey.</p>
          <a href="mailto:safiriapp@gmail.com" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#cbd5e1] transition hover:text-white">
            <Mail size={15} className="text-orange-300" /> safiriapp@gmail.com
          </a>
          <Link to={profile ? supportPath : "/auth"} className="mt-5 inline-flex">
            <Button> {profile ? "Open support form" : "Sign in to contact support"} <ArrowUpRight size={15} /></Button>
          </Link>
        </Card>

        <Card className="p-6">
          <div className="mb-4 grid h-11 w-11 place-items-center rounded-2xl bg-sky-400/10 text-sky-300"><UserRound size={20} /></div>
          <h2 className="text-base font-semibold text-[#f0f4ff]">Your contact details</h2>
          {profile ? (
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 text-sm text-[#cbd5e1]"><Mail size={16} className="text-[#8491a8]" /><span className="break-all">{profile.email}</span></div>
              <div className="flex items-center gap-3 text-sm text-[#cbd5e1]"><Phone size={16} className="text-[#8491a8]" /><span>{profile.phone || "No phone number added"}</span></div>
              <Link to="/profile" className="mt-2 inline-flex text-sm font-semibold text-orange-300 hover:text-orange-200">Update your details <ArrowUpRight size={14} className="ml-1" /></Link>
            </div>
          ) : (
            <p className="mt-2 text-sm leading-6 text-[#8491a8]">Sign in to view or update the email and phone number on your Safiri profile.</p>
          )}
        </Card>
      </div>

      <p className="mt-6 text-xs leading-5 text-[#66758d]">For your security, never share your password, payment PIN, or one-time verification code with anyone.</p>
    </div>
  )
}
