import React from "react";

function FollowUpPopup({ followups, onConcluir, onFechar }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:20 }}>
      <div className="fade-in" style={{ background:"#0d1a2e", border:"1px solid rgba(251,146,60,.3)", borderRadius:20, padding:28, width:"100%", maxWidth:440, maxHeight:"80vh", overflowY:"auto" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ fontSize:28 }}>🔔</div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:"#fb923c" }}>Follow Ups para Hoje!</div>
            <div style={{ fontSize:12, color:"#4a6080", marginTop:2 }}>{followups.length} lembrete{followups.length>1?"s":""} pendente{followups.length>1?"s":""}</div>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
          {followups.map(f => (
            <div key={f.id} style={{ background:"rgba(251,146,60,.05)", border:"1px solid rgba(251,146,60,.2)", borderRadius:12, padding:"14px 16px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                <div>
                  {f.codigo_cliente && <div style={{ fontSize:12, color:"#fb923c", fontWeight:600, marginBottom:4 }}>🏷️ {f.codigo_cliente}{f.nome_cliente ? ` — ${f.nome_cliente}` : ""}</div>}
                  <div style={{ fontSize:13, color:"#e2e8f0", lineHeight:1.5 }}>{f.observacao}</div>
                  <div style={{ fontSize:11, color:"#4a6080", marginTop:4 }}>
                    📅 {new Date(f.data_followup + "T12:00:00").toLocaleDateString("pt-BR")} · {f.usuario}
                  </div>
                </div>
              </div>
              <button onClick={()=>onConcluir(f.id)}
                style={{ width:"100%", padding:"8px 12px", background:"rgba(34,197,94,.1)", border:"1px solid rgba(34,197,94,.25)", borderRadius:8, color:"#4ade80", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                ✅ Marcar como concluído
              </button>
            </div>
          ))}
        </div>

        <button onClick={onFechar}
          style={{ width:"100%", padding:13, background:"rgba(255,255,255,.04)", border:"1px solid #1e3050", borderRadius:12, color:"#94a3b8", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          Fechar — lembrar depois
        </button>
      </div>
    </div>
  );
}

export default FollowUpPopup;
