import React, { useState } from "react";
import { SUPABASE_URL, SUPABASE_KEY } from "../utils/constants";

function FollowUpModal({ user, checkin, onSave, onSkip }) {
  const hoje = new Date().toISOString().split("T")[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const [observacao, setObservacao] = useState("");
  const [data, setData] = useState(amanha);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const salvar = async () => {
    if (!observacao.trim()) { setErro("Informe o que precisa ser verificado."); return; }
    if (!data) { setErro("Selecione a data do follow up."); return; }
    setSalvando(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/followups`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          checkin_id: checkin?.id || null,
          usuario: user.nome,
          codigo_cliente: checkin?.codigo_cliente || null,
          nome_cliente: checkin?.nome_cliente || null,
          observacao: observacao.trim(),
          data_followup: data,
          concluido: false,
        })
      });
      if (!res.ok) throw new Error(await res.text());
      onSave();
    } catch(e) {
      setErro("Erro ao salvar follow up. Tente novamente.");
    }
    setSalvando(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
      <div className="fade-in" style={{ background:"#0d1a2e", border:"1px solid #1e3050", borderRadius:20, padding:28, width:"100%", maxWidth:440 }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22 }}>
          <div style={{ width:46, height:46, borderRadius:13, background:"linear-gradient(135deg,rgba(251,146,60,.2),rgba(251,146,60,.1))", border:"1px solid rgba(251,146,60,.3)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🔔</div>
          <div>
            <div style={{ fontWeight:700, fontSize:16 }}>Follow Up</div>
            <div style={{ fontSize:12, color:"#4a6080", marginTop:2 }}>Agendar lembrete para este cliente</div>
          </div>
        </div>

        {/* Cliente info */}
        {checkin?.codigo_cliente && (
          <div style={{ background:"rgba(56,189,248,.05)", border:"1px solid rgba(56,189,248,.12)", borderRadius:10, padding:"10px 14px", marginBottom:18, fontSize:13, color:"#94a3b8" }}>
            🏷️ Cliente: <strong style={{ color:"#e2e8f0" }}>{checkin.codigo_cliente}</strong>
            {checkin.loja && <span style={{ marginLeft:8, fontSize:11, background:"rgba(99,102,241,.2)", color:"#a5b4fc", padding:"2px 7px", borderRadius:5 }}>🏪 {checkin.loja}</span>}
          </div>
        )}

        {/* Observação */}
        <div style={{ marginBottom:16 }}>
          <label style={{ fontSize:11, fontWeight:700, color:"#4a6080", letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>O que precisa ser verificado?</label>
          <textarea
            style={{ width:"100%", background:"#0a1628", border:"1px solid #1e3050", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontFamily:"inherit", fontSize:14, outline:"none", resize:"vertical", minHeight:90, boxSizing:"border-box" }}
            placeholder="Ex: Verificar entrega do pedido, confirmar pagamento..."
            value={observacao} onChange={e=>setObservacao(e.target.value)} autoFocus
          ></textarea>
        </div>

        {/* Data */}
        <div style={{ marginBottom:18 }}>
          <label style={{ fontSize:11, fontWeight:700, color:"#4a6080", letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:7 }}>Data do Follow Up</label>
          <input
            type="date" min={hoje}
            style={{ width:"100%", background:"#0a1628", border:"1px solid #1e3050", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontFamily:"inherit", fontSize:14, outline:"none", boxSizing:"border-box" }}
            value={data} onChange={e=>setData(e.target.value)}
          />
        </div>

        {erro && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:9, padding:"9px 13px", color:"#f87171", fontSize:13, marginBottom:14 }}>⚠️ {erro}</div>}

        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onSkip} style={{ flex:1, padding:13, background:"rgba(255,255,255,.04)", border:"1px solid #1e3050", borderRadius:12, color:"#94a3b8", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
            Pular
          </button>
          <button onClick={salvar} disabled={salvando} style={{ flex:2, padding:13, background:"linear-gradient(135deg,#fb923c,#f97316)", border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:700, cursor:salvando?"not-allowed":"pointer", fontFamily:"inherit", opacity:salvando?.7:1 }}>
            {salvando ? "Salvando..." : "🔔 Agendar Follow Up"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FollowUpModal;
