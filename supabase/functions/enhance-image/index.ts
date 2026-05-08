import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CREDIT_COST = 2;

async function callAIGateway(body: string, apiKey: string, maxRetries = 3): Promise<Response> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
      }
    );

    // Retry on transient server errors (502, 503, 504)
    if ([502, 503, 504].includes(response.status) && attempt < maxRetries - 1) {
      console.warn(`AI gateway returned ${response.status}, retrying (${attempt + 1}/${maxRetries})...`);
      await response.text(); // consume body
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1))); // backoff
      continue;
    }

    return response;
  }
  // Should never reach here, but just in case
  throw new Error("Exhausted retries");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth check
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Sign in to use AI enhancement" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey);
  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData.user) {
    console.error("getUser failed:", userErr);
    return new Response(
      JSON.stringify({ error: "Session expired. Please sign in again.", code: "AUTH_EXPIRED" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
  const userId = userData.user.id;
  const adminClient = createClient(supabaseUrl, serviceKey);

  // Check admin role — admins bypass credits
  const { data: adminCheck } = await adminClient.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  const isAdmin = !!adminCheck;

  let creditsDeducted = false;
  if (!isAdmin) {
    const { data: newBalance, error: deductErr } = await adminClient.rpc("deduct_credits", {
      _user_id: userId,
      _amount: CREDIT_COST,
      _description: "AI image enhancement",
    });
    if (deductErr) {
      console.error("deduct_credits error:", deductErr);
      return new Response(
        JSON.stringify({ error: "Failed to check credits. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (newBalance === null) {
      return new Response(
        JSON.stringify({ error: "Insufficient credits. Please top up to continue.", code: "INSUFFICIENT_CREDITS" }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    creditsDeducted = true;
    console.log(`Deducted ${CREDIT_COST} credits from ${userId}. New balance: ${newBalance}`);
  } else {
    console.log(`Admin ${userId} — bypassing credit deduction`);
  }

  const refundIfNeeded = async () => {
    if (!creditsDeducted) return;
    await adminClient.rpc("add_credits", {
      _user_id: userId,
      _amount: CREDIT_COST,
      _kind: "refund",
      _description: "AI enhancement failed — refund",
    });
    creditsDeducted = false;
  };

  try {
    const { imageBase64, fileName, prompt: customPrompt, width, height, transparentPercent } = await req.json();

    if (!imageBase64) {
      await refundIfNeeded();
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context about the trait layer for the AI
    const isSmallTrait = transparentPercent !== undefined && transparentPercent > 80;
    const traitContext = isSmallTrait
      ? `\nIMPORTANT CONTEXT: This image is a SMALL NFT trait layer (like an eye, mouth, accessory, or other facial/body feature). About ${Math.round(transparentPercent)}% of the image is transparent — the actual artwork occupies only a small portion. Focus your attention on the small non-transparent region which contains the artwork. Do NOT be confused by the large transparent area — that is intentional for layer compositing.`
      : "";

    const requestBody = JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: (customPrompt
                ? `CRITICAL RULES FOR THIS IMAGE — you MUST follow ALL of these:\n1) This is an NFT trait layer PNG with transparent areas. The transparent areas are SACRED — do NOT draw, fill, or place ANYTHING in them. Every pixel that is transparent in the input MUST remain fully transparent (alpha=0) in the output.\n2) ONLY modify the existing artwork — the non-transparent pixels. Do NOT add backgrounds, borders, shadows, extra elements, decorations, or any art outside the original artwork boundaries.\n3) The output MUST be EXACTLY ${width || "the same"}x${height || "the same"} pixels. Do NOT crop, resize, or add padding.\n4) Output as PNG with alpha channel preserved.${traitContext}\n\nNow apply this style/instruction ONLY to the existing artwork (non-transparent pixels): ${customPrompt}`
                : `This is a PNG image${width && height ? ` of ${width}x${height} pixels` : ""} with transparent areas (alpha channel).${traitContext} STRICT RULES — violating ANY of these means failure: 1) Output a PNG at EXACTLY ${width || "the same"}x${height || "the same"} pixel dimensions. 2) Transparent pixels MUST stay fully transparent (alpha=0). NO background added. Do NOT draw ANYTHING in the transparent areas. 3) DO NOT CHANGE ANY HUES. Do NOT introduce new colors. Do NOT shift colors (e.g. blue to purple, red to orange, green to teal). The ONLY modification allowed is increasing saturation and brightness of the EXISTING exact colors. Imagine converting each pixel to HSL, keeping H unchanged, and increasing S and L slightly. That is ALL you may do. 4) Do not redraw, reinterpret, or reimagine the artwork. Copy it pixel-perfectly with only saturation/brightness boosted. 5) No cropping, resizing, padding, borders, text, or watermarks. 6) Alpha channel must be identical to input. Do NOT add any art outside the original artwork boundaries. This is for NFT trait layers.`),
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
      modalities: ["image", "text"],
    });

    const response = await callAIGateway(requestBody, LOVABLE_API_KEY);

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      await refundIfNeeded();

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI service temporarily unavailable. Your credits were not charged." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 400) {
        return new Response(
          JSON.stringify({ error: "Image could not be processed (it may be too large). Try a smaller image.", fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI gateway error (${response.status}). Please try again.` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response structure:", JSON.stringify(Object.keys(data)));

    let enhancedImage =
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url
      ?? data.choices?.[0]?.message?.content?.[0]?.image_url?.url
      ?? null;

    if (!enhancedImage && Array.isArray(data.choices?.[0]?.message?.content)) {
      for (const part of data.choices[0].message.content) {
        if (part.type === "image_url" && part.image_url?.url) {
          enhancedImage = part.image_url.url;
          break;
        }
        if (part.inline_data?.data) {
          enhancedImage = `data:${part.inline_data.mime_type || "image/png"};base64,${part.inline_data.data}`;
          break;
        }
      }
    }

    if (!enhancedImage) {
      const msg = data.choices?.[0]?.message;
      const textContent = typeof msg?.content === "string"
        ? msg.content
        : Array.isArray(msg?.content)
          ? msg.content.filter((p: any) => p.type === "text").map((p: any) => p.text).join(" ")
          : null;
      const errorMsg = textContent || "No enhanced image returned from AI";
      console.error("AI returned no image. Text:", errorMsg);
      await refundIfNeeded();
      return new Response(
        JSON.stringify({ error: errorMsg, fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ enhancedImage, fileName }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("enhance-image error:", e);
    await refundIfNeeded();
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
