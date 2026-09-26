import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, ArrowUpRight, LockKeyhole, ShieldCheck } from "lucide-react"
import Card from "../components/ui/Card"
import Button from "../components/ui/Button"
import { toast } from "../components/ui/Toast"
import { supabase, type PrivacyRequest } from "../lib/supabase"
import { useAuthStore } from "../store/authStore"

export default function PrivacyPage() {
  const { profile } = useAuthStore()
  const homePath = profile?.role === "admin"
    ? "/admin"
    : profile?.role === "driver"
      ? "/driver"
      : profile
        ? "/passenger"
        : "/landing"
  const [kind, setKind] = useState<PrivacyRequest["request_type"]>("access")
  const [details, setDetails] = useState("")
  const [requests, setRequests] = useState<PrivacyRequest[]>([])
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!profile) return
    const { data, error } = await supabase.from("privacy_requests").select("*").eq("user_id", profile.id).order("created_at", { ascending: false })
    if (error) toast.error(`Could not load privacy requests: ${error.message}`)
    else setRequests((data ?? []) as PrivacyRequest[])
  }
  useEffect(() => { void load() }, [profile?.id])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!profile || details.trim().length < 10) {
      toast.error("Please describe your request in at least 10 characters")
      return
    }
    setSaving(true)
    const { error } = await supabase.from("privacy_requests").insert({ user_id: profile.id, request_type: kind, details: details.trim() })
    if (error) toast.error(`Could not submit request: ${error.message}`)
    else { setDetails(""); toast.success("Privacy request submitted"); await load() }
    setSaving(false)
  }

  return <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
    <Link to={homePath} className="mb-6 inline-flex items-center gap-2 text-sm text-[#94a3b8] transition hover:text-white"><ArrowLeft size={15}/> Back to Safiri</Link>
    <div className="mb-8 max-w-2xl"><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-orange-300"><LockKeyhole size={15}/> Privacy</div>
      <h1 className="text-3xl font-bold text-[#f0f4ff] sm:text-4xl" style={{fontFamily:"Fraunces, serif"}}>Privacy Notice</h1>
      <p className="mt-3 text-sm leading-6 text-[#94a3b8]">Safiri uses your account and booking details to operate journeys, process payments, provide support and protect the service. We only ask for information needed for those purposes and restrict access by account role.</p>
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="p-5"><ShieldCheck className="mb-3 text-emerald-300"/><h2 className="font-semibold text-[#f0f4ff]">Information and use</h2><p className="mt-2 text-sm leading-6 text-[#94a3b8]">We handle your name, email, phone number, trip and support records, and payment references. Paystack processes payment details under its own terms; Safiri does not ask for your card PIN or mobile money PIN.</p></Card>
      <Card className="p-5"><h2 className="font-semibold text-[#f0f4ff]">Your choices</h2><p className="mt-2 text-sm leading-6 text-[#94a3b8]">You can review or correct profile details in your <Link className="text-orange-300 hover:text-orange-200" to={profile ? "/profile" : "/auth"}>profile</Link>, request a copy of your data, ask for correction, or request account deletion. Some trip and payment records may need to be retained for safety, dispute handling, or legal/accounting obligations.</p></Card>
    </div>
    {profile ? <>
      <Card className="mt-5 p-5 sm:p-6"><h2 className="text-lg font-semibold text-[#f0f4ff]">Submit a privacy request</h2><p className="mb-4 mt-1 text-sm text-[#94a3b8]">We’ll review it and update its status here. A deletion request is reviewed by support; it does not instantly erase bookings or financial records.</p>
        <form className="space-y-3" onSubmit={submit}><label className="block text-sm text-[#cbd5e1]">Request type<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1a2235] px-3 py-2.5 text-sm text-white"><option value="access">Access / copy of my data</option><option value="correction">Correct my information</option><option value="deletion">Delete my account</option></select></label><label className="block text-sm text-[#cbd5e1]">Details<textarea value={details} onChange={e=>setDetails(e.target.value)} required minLength={10} rows={3} className="mt-1.5 w-full rounded-xl border border-white/10 bg-[#1a2235] px-3 py-2.5 text-sm text-white" placeholder="Tell us what data or correction you need."/></label><Button loading={saving}>Submit request</Button></form>
      </Card>
      <section className="mt-7"><h2 className="mb-3 font-semibold text-[#f0f4ff]">Your requests</h2>{requests.length ? <div className="space-y-2">{requests.map(r=><Card key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-4"><div><div className="text-sm font-medium capitalize text-white">{r.request_type} request</div><p className="mt-1 text-xs text-[#94a3b8]">{r.details}</p><div className="mt-1 text-[11px] text-[#64748b]">{new Date(r.created_at).toLocaleString()}</div></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs capitalize text-[#cbd5e1]">{r.status.replace("_"," ")}</span>{r.admin_note && <p className="w-full text-xs text-[#94a3b8]">Support note: {r.admin_note}</p>}</Card>)}</div>:<p className="text-sm text-[#64748b]">No requests submitted.</p>}</section>
    </> : <Card className="mt-5 p-5"><p className="text-sm text-[#94a3b8]">Sign in to submit or view a privacy request.</p><Link className="mt-3 inline-flex items-center gap-1 text-sm text-orange-300" to="/auth">Sign in <ArrowUpRight size={14}/></Link></Card>}
    <p className="mt-6 text-xs leading-5 text-[#64748b]">Questions? Contact <a className="text-orange-300" href="mailto:safiriapp@gmail.com">safiriapp@gmail.com</a>. See also the <Link className="text-orange-300" to="/terms">Terms and Conditions</Link>.</p>
  </main>
}
