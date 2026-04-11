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
    const { intent, content } = await req.json();

    if (!intent || !content) {
      return new Response(JSON.stringify({ error: "intent and content are required" }), {
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

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 512,
        system: `You are a smart research assistant analyzing a webpage for a user with a specific goal.
The user's research goal is: ${intent}
Rules:
1. Extract what is most relevant to the user's goal from this page
2. If page does not directly address the goal, find the closest relevant insights that still help the user
3. NEVER refuse to answer
4. ALWAYS provide exactly 3 bullet points
5. If page has no relevance, provide 3 observations about what the page IS about that the user should know
Format: exactly 3 bullet points.
Use actual content from the page.
Never say I cannot or I need to clarify.`,
        messages: [
          {
            role: "user",
            content: content.slice(0, 8000),
          },
        ],
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
    const summary = data.content?.[0]?.text ?? "";

    return new Response(JSON.stringify({ summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
