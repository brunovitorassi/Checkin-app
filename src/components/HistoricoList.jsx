import React, { useState } from "react";
import S from "../utils/styles";
import { formatDate, resumirEndereco, ENDERECO_STATUS_STYLE } from "../utils/helpers";

function ResumoModal({ checkin, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:3000, padding:20 }} onClick={onClose}>
      <div style={{ background:"#0d1a2e", border:"1px solid #1a2d4a", borderRadius:16, padding:28, width:"100%", maxWidth:520, maxHeight:"80vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div style={{ fontWeight:700, fontSize:14, color:"#38bdf8" }}>📝 Resumo da Visita</div>
          <button style={{ ...S.btn("ghost"), padding:"4px 10px", fontSize:12 }} onClick={onClose}>✕</button>
        </div>
        {checkin.codigo_cliente && <div style={{ fontSize:12, color:"#fb923c", fontWeight:600, marginBottom:8 }}>🏷️ {checkin.codigo_cliente}{checkin.nome_cliente ? ` — ${checkin.nome_cliente}` : ""}</div>}
        {checkin.motivos_visita && <div style={{ fontSize:12, color:"#a5b4fc", marginBottom:12 }}>🎯 {checkin.motivos_visita}</div>}
        <div style={{ fontSize:13, color:"#e2e8f0", lineHeight:1.7, whiteSpace:"pre-wrap" }}>{checkin.resumo_visita || "Sem resumo."}</div>
        <div style={{ marginTop:16, fontSize:11, color:"#4a6080" }}>{checkin.usuario} · {formatDate(checkin.timestamp)} · {checkin.loja || "—"}</div>
      </div>
    </div>
  );
}

function HistoricoList({ checkins, onDelete, isAdmin, loading }) {
  const [resumoAberto, setResumoAberto] = useState(null);
  if (loading) return <div style={{ textAlign:"center", padding:48, color:"#4a6080" }}><div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Carregando...</div>;
  if (!checkins.length) return <div style={{ textAlign:"center", padding:48, color:"#4a6080" }}><div style={{ fontSize:36, marginBottom:12 }}>📋</div>Nenhum check-in encontrado</div>;

  const cols = isAdmin
    ? ["#", "Usuário", "Data/Hora", "Loja", "Cliente", "Endereço", "Resumo", ""]
    : ["#", "Data/Hora", "Loja", "Cliente", "Endereço", "Resumo"];

  const thStyle = { padding:"9px 12px", fontSize:10, fontWeight:700, color:"#4a6080", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap", borderBottom:"1px solid #1a2d4a", textAlign:"left" };
  const tdStyle = { padding:"10px 12px", fontSize:12, color:"#cbd5e1", verticalAlign:"middle", borderBottom:"1px solid #0f1e33" };

  return (
    <>
      <div style={{ overflowX:"auto", borderRadius:12, border:"1px solid #1a2d4a" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth: isAdmin ? 800 : 600 }}>
          <thead style={{ background:"#07101f" }}>
            <tr>
              {cols.map(c => <th key={c} style={thStyle}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {checkins.map((c, i) => {
              const est = ENDERECO_STATUS_STYLE[c.endereco_status || "nao_verificado"];
              const avatar = (c.usuario||"?").split(" ").map((n)=>n[0]).join("").slice(0,2).toUpperCase();
              const avatarBg = `hsl(${(c.usuario||"").charCodeAt(0)*7%360},55%,35%)`;
              return (
                <tr key={c.id} style={{ background: i%2===0 ? "#0a1628" : "#07101f" }}
                  className="hvr-row">
                  <td style={{ ...tdStyle, color:"#4a6080", fontWeight:600, width:36 }}>{checkins.length-i}</td>
                  {isAdmin && (
                    <td style={tdStyle}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:26, height:26, borderRadius:"50%", background:avatarBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>{avatar}</div>
                        <span style={{ fontWeight:600, whiteSpace:"nowrap" }}>{c.usuario}</span>
                      </div>
                    </td>
                  )}
                  <td style={{ ...tdStyle, whiteSpace:"nowrap", color:"#38bdf8" }}>{formatDate(c.timestamp)}</td>
                  <td style={tdStyle}>
                    {c.loja ? <span style={{ ...S.tag("purple"), fontSize:11 }}>🏪 {c.loja}</span> : <span style={{ color:"#4a6080" }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    {c.codigo_cliente ? <span style={{ ...S.tag("orange"), fontSize:11 }}>🏷️ {c.codigo_cliente}</span> : <span style={{ color:"#4a6080" }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, maxWidth:220 }}>
                    <span title={`${est.title}\n${c.endereco}`} style={{
                      display:"inline-flex", alignItems:"center", gap:5,
                      background: `${est.color}18`,
                      border: `1px solid ${est.color}40`,
                      color: est.color === "#4ade80" ? "#86efac" : est.color,
                      borderRadius:7, padding:"3px 9px", fontSize:11, fontWeight:500,
                      maxWidth:"100%", overflow:"hidden", cursor:"default",
                    }}>
                      <span style={{ flexShrink:0 }}>{est.icon}</span>
                      <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {resumirEndereco(c.endereco)}
                      </span>
                    </span>
                  </td>
                  <td style={{ ...tdStyle, maxWidth:200 }}>
                    {c.resumo_visita
                      ? <span onClick={()=>setResumoAberto(c)} style={{ color:"#94a3b8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block", cursor:"pointer" }} title="Clique para ver tudo">{c.resumo_visita}</span>
                      : <span style={{ color:"#4a6080" }}>—</span>}
                  </td>
                  {isAdmin && (
                    <td style={{ ...tdStyle, width:36 }}>
                      <button style={{ ...S.btn("danger"), padding:"3px 8px", fontSize:11 }} onClick={()=>onDelete(c.id)}>✕</button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {resumoAberto && <ResumoModal checkin={resumoAberto} onClose={()=>setResumoAberto(null)} />}
    </>
  );
}

export default HistoricoList;
