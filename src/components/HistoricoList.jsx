import React, { useState } from "react";
import S from "../utils/styles";
import { formatDate, resumirEndereco, ENDERECO_STATUS_STYLE } from "../utils/helpers";
import { SUPABASE_URL, SUPABASE_KEY } from "../utils/constants";

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

function FotoModal({ url, onClose }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.92)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:3000, padding:20 }} onClick={onClose}>
      <img
        src={url}
        alt="Foto do check-in"
        style={{ maxWidth:"100%", maxHeight:"90vh", borderRadius:12, objectFit:"contain" }}
        onClick={e=>e.stopPropagation()}
      />
    </div>
  );
}

function HistoricoList({ checkins, onDelete, isAdmin, isDashboard, loading, theme, user, onUpdateCheckin }) {
  const [resumoAberto, setResumoAberto] = useState(null);
  const [fotoAberta, setFotoAberta] = useState(null);
  const [editandoRetorno, setEditandoRetorno] = useState(null);
  const [textoRetorno, setTextoRetorno] = useState("");
  const [salvando, setSalvando] = useState(false);

  const isLight = theme === "light";
  const muted = isLight ? "#2d3f55" : "#4a6080";

  const salvarRetorno = async (checkinId) => {
    setSalvando(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/checkins?id=eq.${checkinId}`, {
        method: "PATCH",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({
          retorno_supervisor: textoRetorno.trim(),
          retorno_supervisor_autor: user?.nome || "—",
          retorno_supervisor_at: new Date().toISOString(),
        }),
      });
      if (res.ok) {
        onUpdateCheckin?.(checkinId, {
          retorno_supervisor: textoRetorno.trim(),
          retorno_supervisor_autor: user?.nome || "—",
          retorno_supervisor_at: new Date().toISOString(),
        });
        setEditandoRetorno(null);
        setTextoRetorno("");
      }
    } catch {}
    setSalvando(false);
  };

  if (loading) return <div style={{ textAlign:"center", padding:48, color:muted }}><div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Carregando...</div>;
  if (!checkins.length) return <div style={{ textAlign:"center", padding:48, color:muted }}><div style={{ fontSize:36, marginBottom:12 }}>📋</div>Nenhum check-in encontrado</div>;

  const cols = isDashboard
    ? ["#", "Usuário", "Data/Hora", "Loja", "Cliente", "Endereço", "Resumo", "Retorno", "📷 Foto", ...(isAdmin ? [""] : [])]
    : ["#", "Data/Hora", "Loja", "Cliente", "Endereço", "Resumo", "Retorno", "📷 Foto"];

  const borderColor = isLight ? "#dde3ea" : "#1a2d4a";
  const textPrimary = isLight ? "#0d1b2a" : "#e2e8f0";
  const textCell   = isLight ? "#0d1b2a" : "#cbd5e1";
  const thStyle = { padding:"9px 12px", fontSize:10, fontWeight:700, color:muted, textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap", borderBottom:`1px solid ${borderColor}`, textAlign:"left" };
  const tdStyle = { padding:"10px 12px", fontSize:12, color:textCell, verticalAlign:"middle", borderBottom:`1px solid ${isLight ? "#edf0f4" : "#0f1e33"}` };

  return (
    <>
      <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${borderColor}` }}>
        <table style={{ width:"100%", borderCollapse:"collapse", minWidth: isDashboard ? 1100 : 820 }}>
          <thead style={{ background: isLight ? "#f8fafc" : "#07101f" }}>
            <tr>
              {cols.map(c => <th key={c} style={thStyle}>{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {checkins.map((c, i) => {
              const est = ENDERECO_STATUS_STYLE[c.endereco_status || "nao_verificado"];
              const avatar = (c.usuario||"?").split(" ").map((n)=>n[0]).join("").slice(0,2).toUpperCase();
              const avatarBg = `hsl(${(c.usuario||"").charCodeAt(0)*7%360},55%,35%)`;
              const rowBg = isLight
                ? (i%2===0 ? "#ffffff" : "#f8fafc")
                : (i%2===0 ? "#0a1628" : "#07101f");
              return (
                <tr key={c.id} style={{ background: rowBg }} className="hvr-row">
                  <td style={{ ...tdStyle, color:muted, fontWeight:600, width:36 }}>{checkins.length-i}</td>
                  {isDashboard && (
                    <td style={tdStyle}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:26, height:26, borderRadius:"50%", background:avatarBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>{avatar}</div>
                        <span style={{ fontWeight:600, whiteSpace:"nowrap", color:textPrimary }}>{c.usuario}</span>
                      </div>
                    </td>
                  )}
                  <td style={{ ...tdStyle, whiteSpace:"nowrap", color: isLight ? "#1d6fa8" : "#38bdf8" }}>{formatDate(c.timestamp)}</td>
                  <td style={tdStyle}>
                    {c.loja ? <span style={{ ...S.tag("purple"), fontSize:11 }}>🏪 {c.loja}</span> : <span style={{ color:muted }}>—</span>}
                  </td>
                  <td style={tdStyle}>
                    {c.codigo_cliente ? <span style={{ ...S.tag("orange"), fontSize:11 }}>🏷️ {c.codigo_cliente}</span> : <span style={{ color:muted }}>—</span>}
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
                      ? <span onClick={()=>setResumoAberto(c)} style={{ color: isLight ? "#2d3f55" : "#94a3b8", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", display:"block", cursor:"pointer" }} title="Clique para ver tudo">{c.resumo_visita}</span>
                      : <span style={{ color:muted }}>—</span>}
                  </td>

                  {/* Retorno Supervisor */}
                  <td style={{ ...tdStyle, maxWidth:220, minWidth:140 }}>
                    {isDashboard ? (
                      editandoRetorno === c.id ? (
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          <textarea
                            value={textoRetorno}
                            onChange={e => setTextoRetorno(e.target.value.slice(0, 500))}
                            placeholder="Digite o retorno do supervisor..."
                            style={{ width:"100%", background:"#0d1a2e", border:"1px solid #1a2d4a", borderRadius:8, padding:"7px 10px", color:"#e2e8f0", fontSize:12, fontFamily:"inherit", resize:"vertical", minHeight:70, outline:"none" }}
                          />
                          <div style={{ display:"flex", gap:5 }}>
                            <button onClick={() => salvarRetorno(c.id)} disabled={salvando || !textoRetorno.trim()}
                              style={{ flex:1, padding:"5px 8px", background:"rgba(34,197,94,.12)", border:"1px solid rgba(34,197,94,.3)", borderRadius:7, color:"#4ade80", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                              {salvando ? "..." : "Salvar"}
                            </button>
                            <button onClick={() => { setEditandoRetorno(null); setTextoRetorno(""); }}
                              style={{ flex:1, padding:"5px 8px", background:"rgba(255,255,255,.04)", border:"1px solid #1e3050", borderRadius:7, color:"#64748b", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : c.retorno_supervisor ? (
                        <div>
                          <div style={{ fontSize:12, color:"#a78bfa", lineHeight:1.5, marginBottom:4 }}>💬 {c.retorno_supervisor}</div>
                          <button onClick={() => { setEditandoRetorno(c.id); setTextoRetorno(c.retorno_supervisor); }}
                            style={{ background:"none", border:"none", color:muted, fontSize:11, cursor:"pointer", padding:"2px 0", fontFamily:"inherit" }}>
                            ✏️ editar
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => { setEditandoRetorno(c.id); setTextoRetorno(""); }}
                          style={{ background:"none", border:"none", color:muted, fontSize:12, cursor:"pointer", padding:"3px 0", fontFamily:"inherit" }}>
                          + Retorno
                        </button>
                      )
                    ) : (
                      c.retorno_supervisor ? (
                        <div>
                          <div style={{ fontSize:12, color:"#a78bfa", lineHeight:1.5, marginBottom:3 }}>💬 {c.retorno_supervisor}</div>
                          <div style={{ fontSize:10, color:muted }}>
                            {c.retorno_supervisor_autor || "Supervisor"} · {c.retorno_supervisor_at ? new Date(c.retorno_supervisor_at).toLocaleDateString("pt-BR", { day:"2-digit", month:"2-digit" }) : ""}
                          </div>
                        </div>
                      ) : null
                    )}
                  </td>

                  <td style={{ ...tdStyle, width:64 }}>
                    {c.foto_url
                      ? <img src={c.foto_url} alt="foto" style={{ width:48, height:48, borderRadius:8, objectFit:"cover", cursor:"pointer", display:"block" }} onClick={()=>setFotoAberta(c.foto_url)} />
                      : <span style={{ color:muted }}>—</span>}
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
      {fotoAberta && <FotoModal url={fotoAberta} onClose={()=>setFotoAberta(null)} />}
    </>
  );
}

export default HistoricoList;
