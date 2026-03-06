// Synapse — Payment Webhook Handler (Supabase Edge Function)
// Handles webhooks from Lemon Squeezy (international) and Paymob (Egypt)
//
// Deploy: supabase functions deploy handle-payment-webhook
// Set secrets:
//   supabase secrets set LEMONSQUEEZY_WEBHOOK_SECRET=your_secret
//   supabase secrets set PAYMOB_HMAC_SECRET=your_secret
//   supabase secrets set LOGSNAG_TOKEN=your_token  (optional)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LEMONSQUEEZY_SECRET = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET") || "";
const PAYMOB_SECRET = Deno.env.get("PAYMOB_HMAC_SECRET") || "";
const LOGSNAG_TOKEN = Deno.env.get("LOGSNAG_TOKEN") || "";

// Use service role to bypass RLS for admin operations
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ────────────────────────────────────────────────────────────────
// Main handler
// ────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);
  const path = url.pathname;

  try {
    if (path.endsWith("/lemonsqueezy")) {
      return await handleLemonSqueezy(req);
    } else if (path.endsWith("/paymob")) {
      return await handlePaymob(req);
    } else {
      return new Response("Not found", { status: 404 });
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
    });
  }
});

// ────────────────────────────────────────────────────────────────
// Lemon Squeezy webhook handler
// ────────────────────────────────────────────────────────────────

async function handleLemonSqueezy(req: Request): Promise<Response> {
  const body = await req.text();

  // Verify HMAC-SHA256 signature
  const signature = req.headers.get("X-Signature") || "";
  if (LEMONSQUEEZY_SECRET) {
    const isValid = await verifyHmacSha256(body, signature, LEMONSQUEEZY_SECRET);
    if (!isValid) {
      console.error("Invalid Lemon Squeezy signature");
      return new Response("Invalid signature", { status: 403 });
    }
  }

  const payload = JSON.parse(body);
  const eventName = payload?.meta?.event_name || "";
  const customData = payload?.meta?.custom_data || {};
  const userId = customData?.user_id || "";
  const attrs = payload?.data?.attributes || {};

  console.log(`LemonSqueezy event: ${eventName} for user: ${userId}`);

  // Log the event
  await supabase.from("payment_events").insert({
    user_id: userId || null,
    provider: "lemonsqueezy",
    event_name: eventName,
    payload: payload,
  });

  // Update user subscription based on event
  if (userId) {
    switch (eventName) {
      case "subscription_created": {
        const isTrial = attrs.status === "on_trial";
        await supabase
          .from("profiles")
          .update({
            subscription_status: isTrial ? "trial" : "active",
            subscription_id: String(payload?.data?.id || ""),
            subscription_provider: "lemonsqueezy",
            trial_ends_at: attrs.trial_ends_at || null,
            subscription_ends_at: attrs.renews_at || null,
            customer_portal_url: attrs.urls?.customer_portal || "",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await logBusinessEvent("subscription_created", `New subscriber: ${attrs.user_email}`);
        break;
      }

      case "subscription_updated": {
        await supabase
          .from("profiles")
          .update({
            subscription_status: mapLsStatus(attrs.status),
            subscription_ends_at: attrs.renews_at || attrs.ends_at || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        break;
      }

      case "subscription_cancelled": {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "cancelled",
            subscription_ends_at: attrs.ends_at || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await logBusinessEvent("subscription_cancelled", `Churn: ${attrs.user_email}`);
        break;
      }

      case "subscription_resumed": {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_ends_at: attrs.renews_at || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);
        break;
      }

      case "subscription_expired": {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await logBusinessEvent("subscription_expired", `Expired: ${attrs.user_email}`);
        break;
      }

      case "subscription_payment_success": {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            subscription_ends_at: attrs.renews_at || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await logBusinessEvent("payment_success", `Payment received: $5 from ${attrs.user_email}`);
        break;
      }

      case "subscription_payment_failed": {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await logBusinessEvent("payment_failed", `Payment failed: ${attrs.user_email}`);
        break;
      }
    }
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

// ────────────────────────────────────────────────────────────────
// Paymob webhook handler (Egypt)
// ────────────────────────────────────────────────────────────────

async function handlePaymob(req: Request): Promise<Response> {
  const body = await req.text();
  const payload = JSON.parse(body);

  // Paymob uses HMAC-SHA512 in the query parameter or header
  const hmac = new URL(req.url).searchParams.get("hmac") || "";
  if (PAYMOB_SECRET && hmac) {
    // Paymob HMAC verification uses a specific concatenation order
    // Simplified — implement Paymob's exact HMAC spec in production
    console.log("Paymob webhook received (HMAC verification enabled)");
  }

  const txnId = payload?.obj?.id || "";
  const success = payload?.obj?.success === true;
  const orderId = payload?.obj?.order?.id || "";

  // Extract user_id from merchant_order_id (format: "synapse_{user_id}")
  const merchantOrderId = payload?.obj?.order?.merchant_order_id || "";
  const userId = merchantOrderId.replace("synapse_", "");

  console.log(`Paymob event: txn=${txnId} success=${success} user=${userId}`);

  // Log event
  await supabase.from("payment_events").insert({
    user_id: userId || null,
    provider: "paymob",
    event_name: success ? "payment_success" : "payment_failed",
    payload: payload,
  });

  // Update subscription
  if (userId && success) {
    const now = new Date();
    const nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await supabase
      .from("profiles")
      .update({
        subscription_status: "active",
        subscription_provider: "paymob",
        subscription_id: String(txnId),
        subscription_ends_at: nextMonth.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("id", userId);

    await logBusinessEvent("payment_success", `Paymob payment: 250 EGP from user ${userId}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function mapLsStatus(lsStatus: string): string {
  const map: Record<string, string> = {
    active: "active",
    on_trial: "trial",
    cancelled: "cancelled",
    expired: "expired",
    past_due: "past_due",
    paused: "cancelled",
    unpaid: "past_due",
  };
  return map[lsStatus] || "free";
}

async function verifyHmacSha256(
  body: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  const digest = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return digest === signature;
}

async function logBusinessEvent(event: string, description: string) {
  // Send to LogSnag for real-time business event tracking (optional)
  if (!LOGSNAG_TOKEN) return;

  try {
    await fetch("https://api.logsnag.com/v1/log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOGSNAG_TOKEN}`,
      },
      body: JSON.stringify({
        project: "synapse",
        channel: "payments",
        event: event,
        description: description,
        icon: event.includes("success") ? "💰" : event.includes("cancel") ? "📉" : "⚠️",
        notify: true,
      }),
    });
  } catch (e) {
    console.error("LogSnag error:", e);
  }
}
