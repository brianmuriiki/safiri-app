import { createClient } from "jsr:@supabase/supabase-js@2"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? ""
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? ""
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } })
}

function message(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === "object" && "message" in error) return String(error.message)
  return "Unexpected payment error"
}

async function validWebhookSignature(rawBody: string, signature: string) {
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secretKey), { name: "HMAC", hash: "SHA-512" }, false, ["sign"])
    const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody)))
    const expected = [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")
    if (signature.length !== expected.length) return false
    let mismatch = 0
    for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ signature.toLowerCase().charCodeAt(i)
    return mismatch === 0
  } catch { return false }
}

async function verifyReference(reference: string) {
  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  })
  const result = await response.json()
  if (!response.ok || !result.status || !result.data) throw new Error(result.message ?? "Could not verify Paystack transaction")
  return result.data
}

async function failPaymentAttempt(db: any, reference: string) {
  const { data: attempt, error } = await db.from("payments").select("booking_id, status")
    .eq("paystack_reference", reference).maybeSingle()
  if (error) throw error
  if (!attempt || attempt.status !== "initiated") return
  const { error: paymentError } = await db.from("payments").update({ status: "failed" })
    .eq("paystack_reference", reference).eq("status", "initiated")
  if (paymentError) throw paymentError
  const { error: bookingError } = await db.from("bookings").update({ payment_expires_at: new Date().toISOString() })
    .eq("id", attempt.booking_id).eq("status", "pending").eq("seat_reserved", true)
  if (bookingError) throw bookingError
}

async function confirmFromTransaction(db: any, transaction: any) {
  if (transaction.status !== "success") return { status: transaction.status, reference: transaction.reference }
  const metadata = transaction.metadata ?? {}
  const bookingId = metadata.booking_id
  const passengerId = metadata.passenger_id
  const scheduleId = metadata.schedule_id
  if (!bookingId || !passengerId || !scheduleId || !transaction.reference) throw new Error("Verified transaction is missing booking metadata")
  const { error } = await db.rpc("confirm_paystack_payment", {
    p_booking_id: bookingId,
    p_passenger_id: passengerId,
    p_schedule_id: scheduleId,
    p_reference: transaction.reference,
    p_amount_kobo: transaction.amount,
    p_currency: transaction.currency,
    p_channel: transaction.channel ?? null,
    p_paid_at: transaction.paid_at ?? new Date().toISOString(),
    p_phone: transaction.customer?.phone ?? "",
  })
  if (error) throw error
  return { status: transaction.status, reference: transaction.reference }
}

async function handleWebhook(req: Request, db: any) {
  const signature = req.headers.get("x-paystack-signature") ?? ""
  const rawBody = await req.text()
  if (!signature || !await validWebhookSignature(rawBody, signature)) return json({ error: "Invalid webhook signature" }, 401)
  let event: any
  try { event = JSON.parse(rawBody) } catch { return json({ error: "Invalid webhook payload" }, 400) }
  if (event.event !== "charge.success" || !event.data?.reference) return json({ received: true })
  try {
    // Treat the signed webhook as a notification, then confirm against Paystack's API.
    const transaction = await verifyReference(event.data.reference)
    if (transaction.status !== "success") return json({ received: true, status: transaction.status })
    const result = await confirmFromTransaction(db, transaction)
    return json({ received: true, ...result })
  } catch (error) {
    console.error("Paystack webhook processing failed", message(error))
    return json({ error: "Webhook processing failed" }, 500)
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)
  if (!supabaseUrl || !anonKey || !serviceKey || !secretKey) return json({ error: "Payment service is not configured" }, 500)
  const db = createClient(supabaseUrl, serviceKey)

  // Paystack webhooks have no Supabase bearer token; HMAC verification is their authentication.
  if (req.headers.has("x-paystack-signature")) return await handleWebhook(req, db)

  const authorization = req.headers.get("Authorization")
  if (!authorization) return json({ error: "Sign in to continue" }, 401)
  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } })
  const { data: authData, error: authError } = await authClient.auth.getUser()
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401)

  try {
    const body = await req.json()
    if (body.action === "initialize" || body.action === "mobile_money") {
      const bookingId = body.booking_id
      if (!bookingId) return json({ error: "booking_id is required" }, 400)
      const { data: booking, error } = await db.from("bookings")
        .select("id, passenger_id, status, schedule_id, seat_reserved, payment_expires_at, schedules!bookings_schedule_id_fkey(price)")
        .eq("id", bookingId).maybeSingle()
      if (error) throw error
      if (!booking) return json({ error: "Booking not found in this Supabase project" }, 404)
      if (booking.passenger_id !== authData.user.id) return json({ error: "This booking belongs to a different signed-in account" }, 403)
      if (booking.status !== "pending") return json({ error: "Booking is not payable" }, 409)
      if (!booking.seat_reserved || !booking.payment_expires_at || Date.parse(booking.payment_expires_at) <= Date.now()) {
        return json({ error: "This seat reservation expired. Create a new booking and try again." }, 409)
      }
      const paymentExpiry = new Date(Date.now() + 45 * 60 * 1000).toISOString()
      const { data: extendedBooking, error: expiryError } = await db.from("bookings").update({ payment_expires_at: paymentExpiry })
        .eq("id", booking.id).eq("status", "pending").eq("seat_reserved", true)
        .select("id").maybeSingle()
      if (expiryError) throw expiryError
      if (!extendedBooking) return json({ error: "This booking expired before payment could start. Create a new booking." }, 409)
      const schedule = Array.isArray(booking.schedules) ? booking.schedules[0] : booking.schedules
      const amount = Number(schedule?.price)
      if (!Number.isFinite(amount) || amount <= 0) return json({ error: "Invalid booking amount" }, 400)
      const { data: profile } = await db.from("profiles").select("email, phone").eq("id", authData.user.id).maybeSingle()
      const reference = `saf_${booking.id}_${crypto.randomUUID().replaceAll("-", "")}`
      let paymentPhone = profile?.phone ?? ""
      const payload: Record<string, unknown> = {
        email: profile?.email ?? authData.user.email,
        amount: Math.round(amount * 100), currency: "KES", reference,
        metadata: { booking_id: booking.id, schedule_id: booking.schedule_id, passenger_id: authData.user.id },
      }
      let endpoint = "https://api.paystack.co/transaction/initialize"
      if (body.action === "mobile_money") {
        let phone = typeof body.phone === "string" ? body.phone.replace(/[\s()-]/g, "") : ""
        if (/^0\d{9}$/.test(phone)) phone = `+254${phone.slice(1)}`
        else if (/^254\d{9}$/.test(phone)) phone = `+${phone}`
        if (!/^\+?\d{9,15}$/.test(phone)) return json({ error: "A valid mobile number is required" }, 400)
        paymentPhone = phone
        payload.mobile_money = { phone, provider: "mpesa" }
        endpoint = "https://api.paystack.co/charge"
      }
      const { error: attemptError } = await db.from("payments").insert({
        booking_id: booking.id,
        amount,
        phone: paymentPhone,
        status: "initiated",
        paystack_reference: reference,
      })
      if (attemptError) {
        if (attemptError.code === "23505") return json({ error: "A payment attempt is already in progress for this booking." }, 409)
        throw attemptError
      }
      let response: Response
      let result: any
      try {
        response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" }, body: JSON.stringify(payload) })
        result = await response.json()
      } catch (error) {
        await failPaymentAttempt(db, reference)
        throw error
      }
      if (!response.ok || !result.status) {
        await failPaymentAttempt(db, reference)
        return json({ error: result.data?.message ?? result.message ?? "Paystack request failed" }, 400)
      }
      if (!result.data?.reference) {
        await failPaymentAttempt(db, reference)
        return json({ error: result.data?.message ?? "Paystack did not return a payment reference" }, 400)
      }
      if (result.data.reference !== reference) {
        const { error: referenceError } = await db.from("payments").update({ paystack_reference: result.data.reference })
          .eq("paystack_reference", reference).eq("status", "initiated")
        if (referenceError) throw referenceError
      }
      if (body.action === "initialize") return json({ authorization_url: result.data.authorization_url, access_code: result.data.access_code, reference: result.data.reference })
      if (["failed", "send_failed", "abandoned"].includes(result.data.status)) {
        await failPaymentAttempt(db, result.data.reference)
      }
      return json({ status: result.data.status, reference: result.data.reference, message: result.data.display_text ?? result.message })
    }

    if (body.action === "cancel_attempt") {
      const reference = typeof body.reference === "string" ? body.reference : ""
      if (!reference) return json({ error: "reference is required" }, 400)
      const { data: payment, error } = await db.from("payments").select("booking_id, status")
        .eq("paystack_reference", reference).maybeSingle()
      if (error) throw error
      if (!payment) return json({ cancelled: true })
      const { data: booking, error: bookingError } = await db.from("bookings").select("passenger_id")
        .eq("id", payment.booking_id).maybeSingle()
      if (bookingError) throw bookingError
      if (booking?.passenger_id !== authData.user.id) return json({ error: "Payment attempt does not belong to this account" }, 403)
      if (payment.status === "initiated") {
        await failPaymentAttempt(db, reference)
      }
      return json({ cancelled: true })
    }

    if (body.action === "verify") {
      const reference = typeof body.reference === "string" ? body.reference : ""
      if (!reference) return json({ error: "reference is required" }, 400)
      const transaction = await verifyReference(reference)
      const metadata = transaction.metadata ?? {}
      if (metadata.passenger_id !== authData.user.id) return json({ error: "Payment reference does not belong to this account" }, 403)
      if (["failed", "abandoned", "reversed"].includes(transaction.status)) {
        await failPaymentAttempt(db, reference)
      }
      return json(await confirmFromTransaction(db, transaction))
    }
    return json({ error: "action must be initialize or verify" }, 400)
  } catch (error) {
    console.error("Paystack function error", error)
    return json({ error: message(error) }, 500)
  }
})
