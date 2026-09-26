import { useEffect, useState } from "react"
import Card from "../../components/ui/Card"
import Badge from "../../components/ui/Badge"
import Button from "../../components/ui/Button"
import { toast } from "../../components/ui/Toast"
import { supabase, type PrivacyRequest } from "../../lib/supabase"
import { useAuthStore } from "../../store/authStore"

export default function AdminPrivacyRequests() {
  const [rows, setRows] = useState<(PrivacyRequest & { profiles?: { email: string; full_name: string | null } })[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const { profile } = useAuthStore()
  const load = async () => {
    const { data, error } = await supabase.from("privacy_requests").select("*, profiles!privacy_requests_user_id_fkey(email,full_name)").order("created_at", { ascending: false })
    if (error) toast.error(`Could not load requests: ${error.message}`)
    else setRows((data ?? []) as any)
  }
  useEffect(() => { void load() }, [])
  const update = async (row: PrivacyRequest, status: PrivacyRequest["status"]) => {
    const note = window.prompt("Optional note for the user", row.admin_note ?? "")
    if (note === null) return
    setBusy(row.id)
    const { error } = await supabase.from("privacy_requests").update({ status, admin_note: note.trim() || null, resolved_by: profile?.id, updated_at: new Date().toISOString() }).eq("id", row.id)
    if (error) toast.error(`Could not update request: ${error.message}`)
    else { toast.success("Request updated"); await load() }
    setBusy(null)
  }
  return <div className="mx-auto max-w-5xl p-6"><h1 className="text-2xl font-bold text-[#f0f4ff]" style={{fontFamily:"Fraunces, serif"}}>Privacy requests</h1><p className="mb-6 mt-1 text-sm text-[#64748b]">Review access, correction and account deletion requests.</p><div className="space-y-3">{rows.map(r=><Card key={r.id} className="p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-medium capitalize text-white">{r.request_type} · {r.profiles?.full_name ?? r.profiles?.email ?? r.user_id}</div><p className="mt-1 text-xs text-[#94a3b8]">{r.profiles?.email} · {new Date(r.created_at).toLocaleString()}</p><p className="mt-3 whitespace-pre-wrap text-sm text-[#cbd5e1]">{r.details}</p>{r.admin_note&&<p className="mt-2 text-xs text-[#94a3b8]">Note: {r.admin_note}</p>}</div><Badge variant={r.status === "completed" ? "success" : r.status === "declined" ? "danger" : "warning"}>{r.status.replace("_"," ")}</Badge></div><div className="mt-4 flex flex-wrap gap-2">{(["in_review","completed","declined"] as const).map(status=><Button key={status} size="sm" variant={status === "declined" ? "danger" : status === "completed" ? "success" : "secondary"} loading={busy===r.id} onClick={()=>update(r,status)}>{status.replace("_"," ")}</Button>)}</div></Card>)}{!rows.length&&<Card className="p-8 text-center text-sm text-[#64748b]">No privacy requests.</Card>}</div></div>
}
