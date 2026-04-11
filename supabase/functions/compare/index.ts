import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url1, url2, content1, content2, intent } = await req.json();

    if (!url1 || !url2 || !content1 || !content2) {
      return new Response(JSON.stringify({ error: "url1, url2, content1, content2 are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_KEY");

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_KEY secret is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const domain1 = new URL(url1).hostname.replace("www.", "");
    const domain2 = new URL(url2).hostname.replace("www.", "");

    const systemPrompt = `You are a competitive intelligence analyst.
You MUST compare these two webpages.
NEVER return empty output.
NEVER refuse.
NEVER say you cannot find information.

The user wants to compare: ${intent || "general comparison"}

Instructions:
- Read both pages carefully
- Choose 5 dimensions most relevant to the intent
- If exact info is not available for a dimension, infer from what IS on the page or note what is absent
- Always make a comparison no matter what
- Never return empty for any dimension

Return in EXACTLY this format with no deviation:

DIMENSION 1: [dimension name]
Site 1: [finding or what site does instead]
Site 2: [finding or what site does instead]

DIMENSION 2: [dimension name]
Site 1: [finding]
Site 2: [finding]

DIMENSION 3: [dimension name]
Site 1: [finding]
Site 2: [finding]

DIMENSION 4: [dimension name]
Site 1: [finding]
Site 2: [finding]

DIMENSION 5: [dimension name]
Site 1: [finding]
Site 2: [finding]

WINNER: [domain name only]
WHY: [one sentence using actual content]

KEY_INSIGHT: [one clear paragraph — who wins overall and why based on intent]`;

    const userMessage = `Site 1 URL: ${url1}
Site 1 Content: ${content1.slice(0, 6000)}

Site 2 URL: ${url2}
Site 2 Content: ${content2.slice(0, 6000)}

Compare: ${intent || "general comparison"}

You must return output for all 5 dimensions.
Never leave any dimension empty.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ error: `Anthropic error: ${errorText}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const result = data.content?.[0]?.text ?? "";

    return new Response(JSON.stringify({ result, domain1, domain2 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
