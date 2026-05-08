import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

async function handleCheckoutCompleted(session: any) {
  const userId = session.metadata?.userId;
  const credits = Number(session.metadata?.credits || 0);
  const priceId = session.metadata?.priceId;

  if (!userId || !credits || credits <= 0) {
    console.error("Missing/invalid metadata on session", session.id, session.metadata);
    return;
  }

  const { data, error } = await getSupabase().rpc("add_credits", {
    _user_id: userId,
    _amount: credits,
    _kind: "purchase",
    _description: `Purchased ${credits} credits (${priceId})`,
    _stripe_session_id: session.id,
  });

  if (error) {
    console.error("add_credits failed:", error);
    throw error;
  }
  console.log(`Credited ${credits} to ${userId}. New balance: ${data}`);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;

  try {
    const event = await verifyWebhook(req, env);
    console.log("Webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      default:
        console.log("Unhandled event:", event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response("Webhook error", { status: 400 });
  }
});
