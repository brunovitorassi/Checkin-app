import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { checkins } = await req.json();

    if (!Array.isArray(checkins) || checkins.length === 0) {
      return new Response(
        JSON.stringify({ error: "Nenhum checkin enviado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amostra = checkins.length > 300 ? checkins.slice(0, 300) : checkins;

    const linhas = amostra.map((c: Record<string, string>) =>
      `Cliente: ${c.codigo_cliente || "—"} - ${c.nome_cliente || "—"} | Loja: ${c.loja || "—"} | Promotor: ${c.usuario || "—"} | Motivos: ${c.motivos_visita || "—"} | Resumo: ${c.resumo_visita || "—"}`
    ).join("\n\n");

    const systemPrompt = `Você é um analista de campo especializado em equipes de promotores de vendas. Analise os resumos de visitas abaixo e retorne EXATAMENTE neste formato JSON, sem markdown, sem explicações fora do JSON:
{"pontos":["ponto 1","ponto 2"],"alertas":["alerta 1","alerta 2"],"ranking":[{"motivo":"nome","quantidade":1}]}
Pontos: principais temas e padrões recorrentes (máx 6 itens).
Alertas: clientes com problemas mencionados, queda de vendas, reclamações (máx 5 itens).
Ranking: contagem real dos motivos de visita encontrados, ordenado por quantidade.`;

    const openaiKey = Deno.env.get("OPENAI_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_KEY não configurada no servidor." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: linhas },
        ],
        temperature: 0.3,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return new Response(
        JSON.stringify({ error: `OpenAI ${openaiRes.status}: ${errText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const openaiData = await openaiRes.json();
    const raw = openaiData.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const clean = raw.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      return new Response(
        JSON.stringify({ error: "Resposta inválida da IA." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify(parsed),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
