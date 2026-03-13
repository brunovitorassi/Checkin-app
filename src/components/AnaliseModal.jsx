import React, { useState, useEffect } from "react";
import { OPENAI_KEY } from "../utils/constants";

function AnaliseModal({ checkins, onClose }) {
  const [loading, setLoading] = useState(true);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState("");

  const analisar = async () => {
    setLoading(true);
    setErro("");
    setResultado(null);

    try {
      const amostra = checkins.length > 300 ? checkins.slice(0, 300) : checkins;

      const linhas = amostra.map(c =>
        `Cliente: ${c.codigo_cliente || "—"} - ${c.nome_cliente || "—"} | Loja: ${c.loja || "—"} | Promotor: ${c.usuario || "—"} | Motivos: ${c.motivos_visita || "—"} | Resumo: ${c.resumo_visita || "—"}`
      ).join("\n\n");

      const systemPrompt = `Você é um analista de campo especializado em equipes de promotores de vendas. Analise os resumos de visitas abaixo e retorne EXATAMENTE neste formato JSON, sem markdown, sem explicações fora do JSON:
{"pontos":["ponto 1","ponto 2"],"alertas":["alerta 1","alerta 2"],"ranking":[{"motivo":"nome","quantidade":N}]}
Pontos: principais temas e padrões recorrentes (máx 6 itens).
Alertas: clientes com problemas mencionados, queda de vendas, reclamações (máx 5 itens).
Ranking: contagem real dos motivos de visita encontrados, ordenado por quantidade.`;

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_KEY}`,
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

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const raw = data.choices?.[0]?.message?.content || "";

      let parsed;
      try {
        // Strip markdown fences if present
        const clean = raw.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(clean);
      } catch {
        throw new Error("Resposta inválida da IA. Tente novamente.");
      }

      setResultado(parsed);
    } catch (err) {
      setErro(err.message || "Erro ao analisar. Tente novamente.");
    }

    setLoading(false);
  };

  useEffect(() => {
    analisar();
  }, []);

  const maxRanking = resultado?.ranking?.length
    ? Math.max(...resultado.ranking.map(r => r.quantidade || 0))
    : 1;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", backdropFilter:"blur(6px)", display:"flex", alignItems:"flex-start", justifyContent:"center", zIndex:2000, overflowY:"auto", padding:"20px 16px" }}>
      <div style={{ background:"#0d1f35", border:"1px solid #1a2d4a", borderRadius:18, width:"100%", maxWidth:580, margin:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"20px 24px", borderBottom:"1px solid #1a2d4a" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:12, background:"#c0392b", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🧠</div>
            <div>
              <div style={{ fontWeight:700, fontSize:15, color:"#fff" }}>Análise de Período</div>
              <div style={{ fontSize:11, color:"#4a6080", marginTop:2 }}>{checkins.length} visitas analisadas</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.06)", border:"1px solid #1a2d4a", borderRadius:8, color:"#94a3b8", fontSize:18, width:34, height:34, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding:"24px" }}>

          {/* Loading */}
          {loading && (
            <div style={{ textAlign:"center", padding:"48px 0" }}>
              <div style={{ fontSize:40, marginBottom:16 }}>🧠</div>
              <div style={{ fontSize:15, color:"#e2e8f0", fontWeight:600, marginBottom:8 }}>Analisando {checkins.length} visitas...</div>
              <div style={{ fontSize:12, color:"#4a6080" }}>Isso pode levar alguns segundos</div>
            </div>
          )}

          {/* Erro */}
          {erro && !loading && (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
              <div style={{ fontSize:13, color:"#f87171", marginBottom:20, lineHeight:1.6 }}>{erro}</div>
              <button onClick={analisar} style={{ background:"#c0392b", color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Tentar novamente
              </button>
            </div>
          )}

          {/* Resultado */}
          {resultado && !loading && (
            <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

              {/* Seção 1 — Pontos */}
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", marginBottom:12 }}>📌 Principais Pontos</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {(resultado.pontos || []).map((p, i) => (
                    <div key={i} style={{ background:"rgba(255,255,255,.04)", border:"1px solid #1a2d4a", borderRadius:10, padding:"10px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
                      <span style={{ color:"#c0392b", fontWeight:700, flexShrink:0, marginTop:1 }}>•</span>
                      <span style={{ fontSize:13, color:"#cbd5e1", lineHeight:1.5 }}>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seção 2 — Alertas */}
              <div>
                <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", marginBottom:12 }}>⚠️ Alertas</div>
                {(resultado.alertas || []).length === 0 ? (
                  <div style={{ fontSize:13, color:"#4ade80", padding:"10px 14px", background:"rgba(34,197,94,.07)", border:"1px solid rgba(34,197,94,.2)", borderRadius:10 }}>
                    ✅ Nenhum alerta identificado
                  </div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {resultado.alertas.map((a, i) => (
                      <div key={i} style={{ background:"rgba(192,57,43,.1)", border:"1px solid rgba(192,57,43,.25)", borderRadius:10, padding:"10px 14px", display:"flex", gap:10, alignItems:"flex-start" }}>
                        <span style={{ color:"#f87171", fontWeight:700, flexShrink:0, marginTop:1 }}>!</span>
                        <span style={{ fontSize:13, color:"#fca5a5", lineHeight:1.5 }}>{a}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Seção 3 — Ranking */}
              {(resultado.ranking || []).length > 0 && (
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#e2e8f0", marginBottom:12 }}>📊 Ranking de Motivos</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                    {resultado.ranking.map((r, i) => (
                      <div key={i}>
                        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                          <span style={{ fontSize:12, color:"#cbd5e1" }}>{r.motivo}</span>
                          <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{r.quantidade}</span>
                        </div>
                        <div style={{ height:6, background:"#1a2d4a", borderRadius:3, overflow:"hidden" }}>
                          <div style={{ height:"100%", background:"#c0392b", borderRadius:3, width:`${Math.round((r.quantidade / maxRanking) * 100)}%`, transition:"width .4s ease" }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rodapé */}
              <div style={{ borderTop:"1px solid #1a2d4a", paddingTop:16, fontSize:11, color:"#4a6080", textAlign:"center" }}>
                Análise baseada em {checkins.length} visitas • Período filtrado
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AnaliseModal;
