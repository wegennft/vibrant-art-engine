import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, fileName, prompt: customPrompt } = await req.json();

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

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: (customPrompt
                    ? `CRITICAL: The output image MUST be the EXACT same pixel dimensions as the input. Do NOT crop, resize, or add padding. Preserve transparent areas (alpha=0). Output as PNG.\n\n${customPrompt}`
                    : "This is a PNG image with transparent areas (alpha channel). STRICT RULES — violating ANY of these means failure: 1) Output a PNG at the EXACT same pixel dimensions. 2) Transparent pixels MUST stay fully transparent (alpha=0). NO background added. 3) DO NOT CHANGE ANY HUES. Do NOT introduce new colors. Do NOT shift colors (e.g. blue to purple, red to orange, green to teal). The ONLY modification allowed is increasing saturation and brightness of the EXISTING exact colors. Imagine converting each pixel to HSL, keeping H unchanged, and increasing S and L slightly. That is ALL you may do. 4) Do not redraw, reinterpret, or reimagine the artwork. Copy it pixel-perfectly with only saturation/brightness boosted. 5) No cropping, resizing, padding, borders, text, or watermarks. 6) Alpha channel must be identical to input. This is for NFT trait layers."),
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
        }),
      }
    );

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

      return new Response(
        JSON.stringify({ error: "Failed to enhance image" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("AI response structure:", JSON.stringify(Object.keys(data)));
    console.log("choices[0].message keys:", JSON.stringify(data.choices?.[0]?.message ? Object.keys(data.choices[0].message) : "no message"));

    // Try multiple known response shapes
    let enhancedImage =
      data.choices?.[0]?.message?.images?.[0]?.image_url?.url          // images array
      ?? data.choices?.[0]?.message?.content?.[0]?.image_url?.url      // content array with image_url
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
      console.error("Full AI response:", JSON.stringify(data).slice(0, 2000));
      return new Response(
        JSON.stringify({ error: "No enhanced image returned from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
