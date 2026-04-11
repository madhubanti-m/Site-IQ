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

    const systemPrompt = `You are a competitive analyst comparing two webpages. User wants to compare: ${intent || "general comparison"}

Choose the 5 most relevant dimensions based on this specific intent only.
Do not use generic irrelevant dimensions.

Return in exactly this format with no deviation:

DIMENSION 1: [name]
Site 1: [specific finding from site 1]
Site 2: [specific finding from site 2]

DIMENSION 2: [name]
Site 1: [specific finding]
Site 2: [specific finding]

DIMENSION 3: [name]
Site 1: [specific finding]
Site 2: [specific finding]

DIMENSION 4: [name]
Site 1: [specific finding]
Site 2: [specific finding]

DIMENSION 5: [name]
Site 1: [specific finding]
Site 2: [specific finding]

WINNER: [domain name only]
WHY: [one sentence using actual page content]

KEY_INSIGHT: [one clear paragraph — who wins and why, written for a decision-maker]`;

    const userMessage = `Site 1 URL: ${url1}
Site 1 Content: ${content1.slice(0, 6000)}

Site 2 URL: ${url2}
Site 2 Content: ${content2.slice(0, 6000)}

Compare: ${intent || "general comparison"}`;

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
