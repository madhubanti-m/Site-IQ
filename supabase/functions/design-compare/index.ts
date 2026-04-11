import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function scrapeWithScreenshot(url: string, firecrawlKey: string): Promise<{ screenshot?: string; markdown?: string }> {
  const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${firecrawlKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "links", "screenshot"],
    }),
  });

  if (!response.ok) {
    return {};
  }

  const data = await response.json();
  return {
    screenshot: data.data?.screenshot ?? undefined,
    markdown: data.data?.markdown ?? undefined,
  };
}

async function analyzeDesign(
  screenshotBase64: string | undefined,
  markdown: string,
  domain: string,
  anthropicKey: string
): Promise<string> {
  const messages: unknown[] = [];

  if (screenshotBase64) {
    const base64Data = screenshotBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    messages.push({
      role: "user",
      content: [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: "image/png",
            data: base64Data,
          },
        },
        {
          type: "text",
          text: `Analyse this webpage design for ${domain} and provide:
1. COLOR SCHEME — primary colors and brand feeling
2. TYPOGRAPHY — fonts, sizes, and readability
3. LAYOUT — visual hierarchy, whitespace usage
4. UX — navigation ease, CTA effectiveness
5. BRAND IMPRESSION — one sentence
6. DESIGN SCORE — score out of 10 followed by one reason (format: "7/10 — reason")`,
        },
      ],
    });
  } else {
    messages.push({
      role: "user",
      content: `Based on this webpage content for ${domain}, analyse the design and provide:
1. COLOR SCHEME — inferred colors and brand feeling
2. TYPOGRAPHY — font style and readability from content structure
3. LAYOUT — inferred visual hierarchy and content structure
4. UX — navigation and CTA effectiveness based on content
5. BRAND IMPRESSION — one sentence
6. DESIGN SCORE — score out of 10 followed by one reason (format: "7/10 — reason")

Content: ${markdown.slice(0, 3000)}`,
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
      max_tokens: 1024,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic error: ${errorText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text ?? "";
}

function parseScore(analysis: string): number {
  const match = analysis.match(/(\d+)\s*\/\s*10/);
  return match ? parseInt(match[1], 10) : 5;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url1, url2, domain1, domain2 } = await req.json();

    if (!url1 || !url2) {
      return new Response(JSON.stringify({ error: "url1 and url2 are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anthropicKey = Deno.env.get("ANTHROPIC_KEY");
    const firecrawlKey = Deno.env.get("FIRECRAWL_KEY") ?? "fc-bd2b6285b05e426aa266262e3084b18e";

    if (!anthropicKey) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_KEY secret is not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [scraped1, scraped2] = await Promise.all([
      scrapeWithScreenshot(url1, firecrawlKey),
      scrapeWithScreenshot(url2, firecrawlKey),
    ]);

    const [analysis1, analysis2] = await Promise.all([
      analyzeDesign(scraped1.screenshot, scraped1.markdown ?? "", domain1, anthropicKey),
      analyzeDesign(scraped2.screenshot, scraped2.markdown ?? "", domain2, anthropicKey),
    ]);

    const score1 = parseScore(analysis1);
    const score2 = parseScore(analysis2);
    const designWinner = score1 >= score2 ? domain1 : domain2;
    const winnerReason = score1 >= score2
      ? `scored ${score1}/10 versus ${score2}/10`
      : `scored ${score2}/10 versus ${score1}/10`;

    return new Response(
      JSON.stringify({
        site1: {
          domain: domain1,
          screenshot: scraped1.screenshot ?? null,
          analysis: analysis1,
          score: score1,
        },
        site2: {
          domain: domain2,
          screenshot: scraped2.screenshot ?? null,
          analysis: analysis2,
          score: score2,
        },
        designWinner,
        winnerReason,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
