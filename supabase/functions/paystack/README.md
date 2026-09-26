# Safiri Paystack Edge Function

## Database update

For an existing project, run only `supabase/migrations/20260926000000_trust_privacy_payments.sql` in the Supabase SQL Editor. This avoids re-running the original seed data. A fresh project should run `src/lib/database.sql` first, then the migration. It adds privacy requests, passenger cancellation/refund requests, driver/vehicle verification, and an atomic payment confirmation RPC. Existing drivers and vehicles become **unverified** and need admin review before their schedules appear to passengers.

## Secret and deployment

In Supabase Dashboard, open **Edge Functions → Secrets** and add `PAYSTACK_SECRET_KEY`. Use a test secret while testing and keep the key out of browser environment variables and source control. Supabase supplies the database URL and service credentials to deployed Edge Functions.

After applying the database migration, deploy from the project root:

```sh
supabase functions deploy paystack --project-ref gncdamoomvxqiiycsjiz
```

`supabase/config.toml` disables gateway JWT verification so Paystack can reach the function. The function still checks Supabase bearer tokens for browser actions and checks Paystack's HMAC signature for webhook requests.

## Paystack webhook

In the Paystack Dashboard, set the webhook URL to:

```text
https://gncdamoomvxqiiycsjiz.supabase.co/functions/v1/paystack
```

Use the same Paystack mode (test/live) as the configured secret. `charge.success` callbacks are authenticated using `x-paystack-signature`; the function then verifies the transaction directly with Paystack and calls `confirm_paystack_payment`, which locks the booking and applies payment, ticket, and seat changes idempotently. Check Supabase Edge Function logs after a test charge to confirm delivery.

## Refund handling

Passengers submit cancellation or refund requests in My Trips. Admins review requests in Bookings. Refund approval changes the request to processing; issue the refund in the Paystack Dashboard, then mark it completed in Safiri so the payment record reflects the refund.
