import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

  try {
    const { imageBase64, fileName, prompt: customPrompt, width, height } = await req.json();

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image data provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const requestBody = JSON.stringify({
      model: "google/gemini-3.1-flash-image-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: (customPrompt
                ? `CRITICAL RULES FOR THIS IMAGE — you MUST follow ALL of these:\n1) This is an NFT trait layer PNG with transparent areas. The transparent areas are SACRED — do NOT draw, fill, or place ANYTHING in them. Every pixel that is transparent in the input MUST remain fully transparent (alpha=0) in the output.\n2) ONLY modify the existing artwork — the non-transparent pixels. Do NOT add backgrounds, borders, shadows, extra elements, decorations, or any art outside the original artwork boundaries.\n3) The output MUST be EXACTLY ${width || "the same"}x${height || "the same"} pixels. Do NOT crop, resize, or add padding.\n4) Output as PNG with alpha channel preserved.\n\nNow apply this style/instruction ONLY to the existing artwork (non-transparent pixels): ${customPrompt}`
                : `This is a PNG image${width && height ? ` of ${width}x${height} pixels` : ""} with transparent areas (alpha channel). STRICT RULES — violating ANY of these means failure: 1) Output a PNG at EXACTLY ${width || "the same"}x${height || "the same"} pixel dimensions. 2) Transparent pixels MUST stay fully transparent (alpha=0). NO background added. Do NOT draw ANYTHING in the transparent areas. 3) DO NOT CHANGE ANY HUES. Do NOT introduce new colors. Do NOT shift colors (e.g. blue to purple, red to orange, green to teal). The ONLY modification allowed is increasing saturation and brightness of the EXISTING exact colors. Imagine converting each pixel to HSL, keeping H unchanged, and increasing S and L slightly. That is ALL you may do. 4) Do not redraw, reinterpret, or reimagine the artwork. Copy it pixel-perfectly with only saturation/brightness boosted. 5) No cropping, resizing, padding, borders, text, or watermarks. 6) Alpha channel must be identical to input. Do NOT add any art outside the original artwork boundaries. This is for NFT trait layers.`),
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

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 400) {
        // Return as fallback so client can gracefully handle (e.g. image too large)
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
    console.log("choices[0].message keys:", JSON.stringify(data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : "no message"));

    // Try multiple known response shapes
    let enhancedImage =
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url
      ?? data.choices?.[0]?.message?.content?.[0]?.image_url?.url
      ?? null;

    // Also check if content is an array with inline_data (Gemini style)
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
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
