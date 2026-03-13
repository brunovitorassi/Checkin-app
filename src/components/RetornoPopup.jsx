import React from "react";
import { formatDate } from "../utils/helpers";

function RetornoPopup({ checkins, onFechar }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.8)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:2000, padding:20 }}>
      <div className="fade-in" style={{ background:"#0d1a2e", border:"1px solid rgba(167,139,250,.3)", borderRadius:20, padding:28, width:"100%", maxWidth:440, maxHeight:"80vh", overflowY:"auto" }}>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
          <div style={{ fontSize:28 }}>💬</div>
          <div>
            <div style={{ fontWeight:700, fontSize:16, color:"#a78bfa" }}>Retorno do Supervisor</div>
            <div style={{ fontSize:12, color:"#4a6080", marginTop:2 }}>
              {checkins.length} retorno{checkins.length > 1 ? "s" : ""} novo{checkins.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:20 }}>
          {checkins.map(c => (
            <div key={c.id} style={{ background:"rgba(167,139,250,.05)", border:"1px solid rgba(167,139,250,.2)", borderRadius:12, padding:"14px 16px" }}>
              {c.codigo_cliente && (
                <div style={{ fontSize:12, color:"#fb923c", fontWeight:600, marginBottom:6 }}>
                  🏷️ {c.codigo_cliente}{c.nome_cliente ? ` — ${c.nome_cliente}` : ""}
                </div>
              )}
              <div style={{ fontSize:13, color:"#e2e8f0", lineHeight:1.5, marginBottom:6 }}>
                💬 {c.retorno_supervisor}
              </div>
              <div style={{ fontSize:11, color:"#4a6080" }}>
                {c.retorno_supervisor_autor || "Supervisor"} · {c.retorno_supervisor_at ? new Date(c.retorno_supervisor_at).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }) : "—"}
              </div>
            </div>
          ))}
        </div>

        <button onClick={onFechar}
          style={{ width:"100%", padding:13, background:"rgba(167,139,250,.1)", border:"1px solid rgba(167,139,250,.25)", borderRadius:12, color:"#a78bfa", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
          Entendido ✓
        </button>

      </div>
    </div>
  );
}

export default RetornoPopup;
