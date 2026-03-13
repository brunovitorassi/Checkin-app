import React, { useState, useEffect } from "react";
import S from "../utils/styles";
import { SUPABASE_URL, SUPABASE_KEY } from "../utils/constants";

function FollowUpsTab({ user, isAdmin, canDelete, theme, userLoja }) {
  const isLight = theme === "light";
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("pendentes");
  const [filtroDe, setFiltroDe] = useState("");
  const [filtroAte, setFiltroAte] = useState("");
  const [filtroUsuario, setFiltroUsuario] = useState("Todos");
  const [usuarios, setUsuarios] = useState([]);

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      let path = isAdmin
        ? (() => { const lojas = Array.isArray(userLoja) ? userLoja : (userLoja ? [userLoja] : []); return `/followups?order=data_followup.asc${lojas.length ? `&loja=in.(${lojas.map(encodeURIComponent).join(",")})` : ""}`; })()
        : `/followups?usuario=eq.${encodeURIComponent(user.nome)}&order=data_followup.asc`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
      });
      if (res.ok) {
        const data = await res.json();
        setFollowups(data);
        if (isAdmin) {
          const uniqueUsers = [...new Set(data.map(f => f.usuario).filter(Boolean))].sort();
          setUsuarios(uniqueUsers);
        }
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchFollowups(); }, []);

  const concluir = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/followups?id=eq.${id}`, {
      method: "PATCH",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ concluido: true })
    });
    setFollowups(prev => prev.map(f => f.id === id ? { ...f, concluido: true } : f));
  };

  const excluir = async (id) => {
    if (!window.confirm("Excluir este follow up?")) return;
    await fetch(`${SUPABASE_URL}/rest/v1/followups?id=eq.${id}`, {
      method: "DELETE",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    setFollowups(prev => prev.filter(f => f.id !== id));
  };

  const hoje = new Date().toISOString().split("T")[0];

  const filtered = followups.filter(f => {
    if (filtroStatus === "pendentes" && f.concluido) return false;
    if (filtroStatus === "concluidos" && !f.concluido) return false;
    if (filtroDe && f.data_followup < filtroDe) return false;
    if (filtroAte && f.data_followup > filtroAte) return false;
    if (filtroUsuario !== "Todos" && f.usuario !== filtroUsuario) return false;
    return true;
  });

  const muted   = isLight ? "#2d3f55" : "#4a6080";
  const textMain = isLight ? "#0d1b2a" : "#cbd5e1";
  const border   = isLight ? "#dde3ea" : "#1a2d4a";

  const labelStyle = { fontSize:11, fontWeight:700, color:muted, letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:6 };
  const thStyle = { padding:"9px 12px", fontSize:10, fontWeight:700, color:muted, textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap", borderBottom:`1px solid ${border}`, textAlign:"left" };
  const tdStyle = { padding:"10px 12px", fontSize:12, color:textMain, verticalAlign:"middle", borderBottom:`1px solid ${isLight ? "#edf0f4" : "#0f1e33"}` };

  const statusBadge = (f) => {
    if (f.concluido) return <span style={{ fontSize:10, background:"rgba(34,197,94,.15)", color:"#4ade80", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap" }}>✅ Concluído</span>;
    if (f.data_followup < hoje) return <span style={{ fontSize:10, background:"rgba(239,68,68,.15)", color:"#f87171", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap" }}>⚠️ Atrasado</span>;
    if (f.data_followup === hoje) return <span style={{ fontSize:10, background:"rgba(251,146,60,.15)", color:"#fb923c", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap" }}>🔔 Hoje</span>;
    return <span style={{ fontSize:10, background:"rgba(56,189,248,.1)", color:"#38bdf8", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap" }}>🕐 Pendente</span>;
  };

  const isMobile = window.innerWidth < 768;

  const filtrosBody = (
    <>
      <div style={{ flex: isMobile ? "1 1 100%" : "1 1 130px" }}>
        <label style={labelStyle}>Status</label>
        <select style={{ ...S.input, appearance:"none" }} value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="pendentes">Pendentes</option>
          <option value="concluidos">Concluídos</option>
        </select>
      </div>
      {isAdmin && usuarios.length > 0 && (
        <div style={{ flex: isMobile ? "1 1 100%" : "1 1 140px" }}>
          <label style={labelStyle}>Usuário</label>
          <select style={{ ...S.input, appearance:"none" }} value={filtroUsuario} onChange={e=>setFiltroUsuario(e.target.value)}>
            <option value="Todos">Todos</option>
            {usuarios.map(u=><option key={u}>{u}</option>)}
          </select>
        </div>
      )}
      <div style={{ flex: isMobile ? "1 1 calc(50% - 5px)" : "1 1 120px" }}>
        <label style={labelStyle}>De</label>
        <input type="date" style={S.input} value={filtroDe} onChange={e=>setFiltroDe(e.target.value)} />
      </div>
      <div style={{ flex: isMobile ? "1 1 calc(50% - 5px)" : "1 1 120px" }}>
        <label style={labelStyle}>Até</label>
        <input type="date" style={S.input} value={filtroAte} onChange={e=>setFiltroAte(e.target.value)} />
      </div>
      <div style={{ flex: isMobile ? "1 1 100%" : "0 0 auto", display:"flex", justifyContent: isMobile ? "flex-end" : "flex-start" }}>
        <button onClick={()=>{ setFiltroStatus("pendentes"); setFiltroDe(""); setFiltroAte(""); setFiltroUsuario("Todos"); }}
          style={{ padding:"8px 14px", background:"rgba(255,255,255,.04)", border:"1px solid #1e3050", borderRadius:8, color:"#94a3b8", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
          Limpar
        </button>
      </div>
    </>
  );

  const renderCard = (f) => {
    const vencido = !f.concluido && f.data_followup < hoje;
    const isHoje = !f.concluido && f.data_followup === hoje;
    const borderColor = f.concluido ? "rgba(34,197,94,.2)" : vencido ? "rgba(239,68,68,.3)" : isHoje ? "rgba(251,146,60,.3)" : "#1a2d4a";
    const bgColor = f.concluido ? "rgba(34,197,94,.04)" : vencido ? "rgba(239,68,68,.04)" : isHoje ? "rgba(251,146,60,.04)" : "rgba(255,255,255,.02)";
    const accentColor = f.concluido ? "#4ade80" : vencido ? "#f87171" : isHoje ? "#fb923c" : "#38bdf8";
    return (
      <div key={f.id} style={{ background:bgColor, border:`1px solid ${borderColor}`, borderRadius:14, padding:"14px 16px", marginBottom:10 }}>
        {/* Cliente header */}
        {f.codigo_cliente && (
          <div style={{ fontSize:13, fontWeight:700, color:"#fb923c", marginBottom:6 }}>
            🏷️ {f.codigo_cliente}{f.nome_cliente ? ` — ${f.nome_cliente}` : ""}
          </div>
        )}
        {/* Admin: show user */}
        {isAdmin && f.usuario && (
          <div style={{ fontSize:11, color:muted, marginBottom:4 }}>👤 {f.usuario}</div>
        )}
        {/* Date + status row */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8 }}>
          <span style={{ fontSize:12, color:muted }}>
            📅 {new Date(f.data_followup + "T12:00:00").toLocaleDateString("pt-BR")}
          </span>
          {statusBadge(f)}
        </div>
        {/* Observação */}
        <div style={{ fontSize:13, color: isLight ? "#0d1b2a" : "#e2e8f0", lineHeight:1.5, marginBottom: f.concluido && !canDelete ? 0 : 10 }}>
          {f.observacao}
        </div>
        {/* Action buttons */}
        {(!f.concluido || canDelete) && (
          <div style={{ display:"flex", gap:8 }}>
            {!f.concluido && (
              <button onClick={()=>concluir(f.id)}
                style={{ flex:1, padding:"8px 12px", background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.2)", borderRadius:8, color:"#4ade80", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                ✅ Concluir
              </button>
            )}
            {canDelete && (
              <button onClick={()=>excluir(f.id)}
                style={{ padding:"8px 12px", background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.2)", borderRadius:8, color:"#f87171", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>
                🗑️
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fade-in">
      {/* Filters */}
      <div style={{ ...S.card, padding:14, marginBottom:16, display:"flex", flexWrap:"wrap", gap:10, alignItems:"flex-end" }}>
        {filtrosBody}
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:muted }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:muted }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔔</div>
          <div>Nenhum follow up encontrado</div>
        </div>
      ) : isMobile ? (
        <div>{filtered.map(f => renderCard(f))}</div>
      ) : isAdmin ? (
        <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${border}` }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background: isLight ? "#f8fafc" : "rgba(255,255,255,.02)" }}>
                <th style={thStyle}>Usuário</th>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Observação</th>
                <th style={thStyle}>Status</th>
                {canDelete && <th style={thStyle}></th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="hvr-row">
                  <td style={tdStyle}>{f.usuario}</td>
                  <td style={{ ...tdStyle, whiteSpace:"nowrap" }}>{new Date(f.data_followup + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                  <td style={{ ...tdStyle, whiteSpace:"nowrap" }}>
                    {f.codigo_cliente ? <><span style={{ color:"#fb923c", fontWeight:600 }}>{f.codigo_cliente}</span>{f.nome_cliente ? <span style={{ color: isLight ? "#2d3f55" : "#94a3b8" }}> · {f.nome_cliente}</span> : ""}</> : "—"}
                  </td>
                  <td style={{ ...tdStyle, maxWidth:280 }}>{f.observacao}</td>
                  <td style={tdStyle}>{statusBadge(f)}</td>
                  {canDelete && (
                    <td style={tdStyle}>
                      <button onClick={()=>excluir(f.id)} title="Excluir"
                        style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:6, color:"#f87171", fontSize:12, padding:"4px 9px", cursor:"pointer", fontFamily:"inherit" }}>
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {filtered.map(f => {
            const vencido = !f.concluido && f.data_followup < hoje;
            const isHoje = !f.concluido && f.data_followup === hoje;
            const borderColor = f.concluido ? "rgba(34,197,94,.2)" : vencido ? "rgba(239,68,68,.3)" : isHoje ? "rgba(251,146,60,.3)" : "#1a2d4a";
            const bgColor = f.concluido ? "rgba(34,197,94,.04)" : vencido ? "rgba(239,68,68,.04)" : isHoje ? "rgba(251,146,60,.04)" : "rgba(255,255,255,.02)";
            return (
              <div key={f.id} style={{ background:bgColor, border:`1px solid ${borderColor}`, borderRadius:12, padding:"14px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap", marginBottom:6 }}>
                  {f.codigo_cliente && (
                    <span style={{ fontSize:12, fontWeight:700, color: f.concluido ? "#4ade80" : vencido ? "#f87171" : isHoje ? "#fb923c" : "#38bdf8" }}>
                      🏷️ {f.codigo_cliente}{f.nome_cliente ? ` — ${f.nome_cliente}` : ""}
                    </span>
                  )}
                  {statusBadge(f)}
                </div>
                <div style={{ fontSize:13, color: isLight ? "#0d1b2a" : "#e2e8f0", lineHeight:1.5, marginBottom:6 }}>{f.observacao}</div>
                <div style={{ fontSize:11, color:muted, marginBottom: f.concluido ? 0 : 10 }}>
                  📅 {new Date(f.data_followup + "T12:00:00").toLocaleDateString("pt-BR")}
                </div>
                {!f.concluido && (
                  <button onClick={()=>concluir(f.id)}
                    style={{ width:"100%", padding:"8px 12px", background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.2)", borderRadius:8, color:"#4ade80", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                    ✅ Marcar como concluído
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FollowUpsTab;
