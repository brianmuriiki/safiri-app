// Paystack payment integration for Safiri
// This edge function handles Paystack payment initialization and verification

import { createClient } from "jsr:@supabase/supabase-js@2.49.8"
import { serve } from "std/server"

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY") ?? ""

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function handlePaystack(req: Request): Promise<Response> {
  try {
    const body = await req.json()
    const { action, ...params } = body

    if (!action) {
      return new Response(JSON.stringify({ error: "action is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    switch (action) {
      case "initialize": {
        const { email, amount, reference, metadata } = params
        if (!email || !amount) {
          return new Response(
            JSON.stringify({ error: "email and amount are required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          )
        }

        const ref =
          reference ?? `saf_${Math.random().toString(36).slice(2, 12)}`

        const payload = {
          email,
          amount: Math.round(amount * 100),
          reference: ref,
          callback_url: `${new URL(req.url).origin}/paystack-callback`,
          metadata: {
            ...metadata,
            platform: "safiri",
          },
          channels: [
            "card",
            "bank",
            "ussd",
            "qr",
            "mobile_money",
            "bank_transfer",
          ],
        }

        const response = await fetch(
          "https://api.paystack.co/transaction/initialize",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
          },
        )

        const data = await response.json()

        if (!data.status) {
          return new Response(
            JSON.stringify({
              error: data.message ?? "Failed to initialize payment",
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          )
        }

        return new Response(
          JSON.stringify({
            authorization_url: data.data.authorization_url,
            access_code: data.data.access_code,
            reference: data.data.reference,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      case "verify": {
        const { reference } = params
        if (!reference) {
          return new Response(
            JSON.stringify({ error: "reference is required" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          )
        }

        const response = await fetch(
          `https://api.paystack.co/transaction/verify/${reference}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${paystackSecretKey}`,
              "Content-Type": "application/json",
            },
          },
        )

        const data = await response.json()

        if (!data.status) {
          return new Response(
            JSON.stringify({ error: data.message ?? "Verification failed" }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          )
        }

        const transaction = data.data

        if (transaction.status === "success") {
          // Record the payment in our database
          const bookingId = metadata?.booking_id
          const scheduleId = metadata?.schedule_id

          if (bookingId) {
            await supabase
              .from("bookings")
              .update({ status: "confirmed" })
              .eq("id", bookingId)
          }

          if (scheduleId && transaction.metadata) {
            const { data: schedule } = await supabase
              .from("schedules")
              .select("seats_available")
              .eq("id", scheduleId)
              .single()

            if (schedule) {
              await supabase
                .from("schedules")
                .update({
                  seats_available: Math.max(
                    0,
                    (schedule.seats_available ?? 1) - 1,
                  ),
                })
                .eq("id", scheduleId)
            }
          }

          // Create ticket if booking exists
          if (bookingId) {
            await supabase.from("tickets").insert({
              booking_id: bookingId,
            })
          }
        }

        return new Response(
          JSON.stringify({
            status: transaction.status,
            reference: transaction.reference,
            amount: transaction.amount / 100,
            channel: transaction.channel,
            paid_at: transaction.paid_at,
            customer: transaction.customer,
            metadata: transaction.metadata,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        )
    }
  } catch (error) {
    console.error("Paystack edge function error:", error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}

serve(async (req: Request) => {
  // Handle both direct HTTP requests and supabase.functions.invoke()
  const url = new URL(req.url)
  const path = url.pathname
    .replace("/.netlify/functions/paystack", "")
    .replace("/functions/paystack", "")

  // If the path is just "/" or empty, try to determine from headers or body
  if (path === "/" || path === "") {
    // Try to parse body for action
    try {
      const body = await req.json()
      const action = body?.action
      if (action) {
        const result = await handlePaystack(req)
        return result
      }
    } catch {
      // If we can't parse body, return 400
    }
    return new Response(JSON.stringify({ error: "No action specified" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }

  // If path contains the function name, handle it
  if (path.includes("paystack")) {
    return handlePaystack(req)
  }

  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  })
})
