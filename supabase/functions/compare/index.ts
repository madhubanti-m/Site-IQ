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

    const systemPrompt = `You are a competitive intelligence analyst. Compare these two webpages and return a structured comparison in this exact format:

| Dimension           | ${domain1} | ${domain2} |
|---------------------|------------|------------|
| Value Proposition   |            |            |
| Target Audience     |            |            |
| Key Features        |            |            |
| Tone and Voice      |            |            |
| What They Emphasize |            |            |
| Strengths           |            |            |
| Weaknesses          |            |            |
| Overall Winner      |            |            |

Use actual content from the pages. Be specific. After the table, write a "## Key Insight" section with one paragraph summarizing who wins and why, based on the intent.`;

    const userMessage = `Page 1 URL: ${url1}
Page 1 Content: ${content1.slice(0, 6000)}

Page 2 URL: ${url2}
Page 2 Content: ${content2.slice(0, 6000)}

Intent: ${intent || "general comparison"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
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
