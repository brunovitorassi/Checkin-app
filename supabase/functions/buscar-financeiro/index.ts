import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const clienteId = url.searchParams.get("clienteId");
    const cpfCnpj   = url.searchParams.get("cpfCnpj");

    if (!clienteId && !cpfCnpj) {
      return new Response(JSON.stringify({ error: "Informe clienteId ou cpfCnpj." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const param = clienteId ? `clienteId=${clienteId}` : `cpfCnpj=${cpfCnpj}`;
    const token = Deno.env.get("HEIDERMAQ_TOKEN");

    const res = await fetch(
      `https://portal.heidermaq.com.br/api/Clientes/FinanceiroEmAberto?${param}&registrosPorPagina=100&pagina=1`,
      { headers: { "Authorization": token ?? "", "Accept": "application/json" } }
    );

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
