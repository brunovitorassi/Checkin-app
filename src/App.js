import React, { useState, useEffect, useCallback } from "react";
import S from "./utils/styles";
import { SUPABASE_URL, SUPABASE_KEY, LOJAS, todayStr } from "./utils/constants";
import { api, reverseGeocode, exportCSV, formatDate } from "./utils/helpers";
import MobileOnly from "./components/MobileOnly";
import LoginScreen from "./components/LoginScreen";
import CheckInModal from "./components/CheckInModal";
import MapView from "./components/MapView";
import HistoricoList from "./components/HistoricoList";
import AdminUsers from "./components/AdminUsers";
import FollowUpModal from "./components/FollowUpModal";
import FollowUpPopup from "./components/FollowUpPopup";
import ClienteSearch from "./components/ClienteSearch";
import FollowUpsTab from "./components/FollowUpsTab";
import SolicitacoesTab from "./components/SolicitacoesTab";
import SolicitacaoPopup from "./components/SolicitacaoPopup";
import AnaliseModal from "./components/AnaliseModal";
import RetornoPopup from "./components/RetornoPopup";

// ─── MOBILE GUARD ─────────────────────────────────────────────────────────────
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
};

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("checkpoint_user"));
      // On desktop, only restore session if user is admin
      if (stored && !isMobile() && stored.role !== "admin" && stored.role !== "gerente" && stored.role !== "gerente_loja") {
        localStorage.removeItem("checkpoint_user");
        return null;
      }
      return stored;
    } catch { return null; }
  });
  const [tab, setTab] = useState("checkin");
  const [checkins, setCheckins] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [allUsers, setAllUsers] = useState([]);

  // Filtros
  const [filterUser, setFilterUser] = useState("Todos");
  const [filterDe, setFilterDe] = useState(todayStr());
  const [filterAte, setFilterAte] = useState(todayStr());
  const [filterLoja, setFilterLoja] = useState("Todas");
  const [filterCliente, setFilterCliente] = useState("");

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [pendingPos, setPendingPos] = useState(null);

  const [showFiltros, setShowFiltros] = useState(false);

  // Follow Up
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showAnalise, setShowAnalise] = useState(false);
  const [lastCheckin, setLastCheckin] = useState(null);
  const [followupPopup, setFollowupPopup] = useState([]);
  const [retornoPopup, setRetornoPopup] = useState([]);

  const [theme, setTheme] = useState(() => localStorage.getItem("hm_theme") || "dark");

  const isAdmin = user?.role === "admin";
  const isGerente = user?.role === "gerente";
  const isGerenteLoja = user?.role === "gerente_loja";
  const isDashboard = isAdmin || isGerente || isGerenteLoja;

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("hm_theme", theme);
  }, [theme]);

  const handleLogin = (u) => { localStorage.setItem("checkpoint_user", JSON.stringify(u)); setUser(u); };
  const handleLogout = () => {
    localStorage.removeItem("checkpoint_user");
    setUser(null);
    setTab("checkin");
  };

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    try {
      const lojas = Array.isArray(user.loja) ? user.loja : (user.loja ? [user.loja] : []);
      const path = isGerenteLoja && lojas.length > 0
        ? `/checkins?loja=in.(${lojas.map(l=>`"${l}"`).join(",")})&order=timestamp.desc&limit=500`
        : isDashboard
        ? "/checkins?order=timestamp.desc&limit=500"
        : `/checkins?usuario=eq.${encodeURIComponent(user.nome)}&order=timestamp.desc&limit=200`;
      setCheckins(await api(path));
    } catch(e) { console.error(e); } finally { setFetching(false); }
  }, [user, isDashboard, isGerenteLoja]);

  const fetchUsers = useCallback(async () => {
    if (!isDashboard) return;
    try { setAllUsers((await api("/app_users?select=nome&order=nome.asc")).map(u=>u.nome)); } catch{}
  }, [isDashboard]);

  useEffect(() => {
    fetchCheckins(); fetchUsers();
    const t = setInterval(fetchCheckins, 10000);
    return () => clearInterval(t);
  }, [fetchCheckins, fetchUsers]);

  // Check for due follow ups + new retornos on load — only for regular users
  useEffect(() => {
    if (!user || isDashboard) return;
    const checkNotificacoes = async () => {
      try {
        const hoje = new Date().toISOString().split("T")[0];
        const resFu = await fetch(`${SUPABASE_URL}/rest/v1/followups?concluido=eq.false&data_followup=lte.${hoje}&usuario=eq.${encodeURIComponent(user.nome)}&order=data_followup.asc`, {
          headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        if (resFu.ok) {
          const data = await resFu.json();
          if (data.length > 0) setFollowupPopup(data);
        }
      } catch {}
      try {
        const lastSeen = localStorage.getItem(`hm_last_seen_${user.nome}`) || new Date(0).toISOString();
        const resRet = await fetch(`${SUPABASE_URL}/rest/v1/checkins?usuario=eq.${encodeURIComponent(user.nome)}&retorno_supervisor=not.is.null&retorno_supervisor_at=gt.${encodeURIComponent(lastSeen)}&order=retorno_supervisor_at.desc`, {
          headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        if (resRet.ok) {
          const data = await resRet.json();
          if (data.length > 0) setRetornoPopup(data);
        }
      } catch {}
    };
    checkNotificacoes();
  }, [user, isDashboard]);

  const concluirFollowUp = async (id) => {
    await fetch(`${SUPABASE_URL}/rest/v1/followups?id=eq.${id}`, {
      method: "PATCH",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ concluido: true })
    });
    setFollowupPopup(prev => prev.filter(f => f.id !== id));
  };

  // Inicia o check-in: pega GPS e abre o modal
  const iniciarCheckIn = async () => {
    if (loading) return;
    setLoading(true); setStatus(null);
    try {
      const pos = await new Promise((res,rej) => navigator.geolocation.getCurrentPosition(res,rej,{timeout:10000}));
      const {latitude:lat, longitude:lng} = pos.coords;
      const endereco = await reverseGeocode(lat, lng);

      setPendingPos({ lat, lng, endereco });
      setShowModal(true);
    } catch(e) {
      setStatus({ type:"error", msg: e.code ? "Permissão de localização negada. Verifique as configurações do navegador." : "Erro ao obter localização. Tente novamente." });
      setTimeout(()=>setStatus(null), 5000);
    }
    setLoading(false);
  };

  // Confirma o check-in com os dados do modal
  const confirmarCheckIn = async ({ codigo_cliente, nome_cliente, resumo_visita, motivos_visita, loja, endereco_status, foto_url }) => {
    setLoading(true);
    // Guard: pendingPos must exist
    if (!pendingPos) {
      setStatus({ type:"error", msg:"⚠️ Posição GPS perdida. Feche e tente novamente." });
      setTimeout(()=>setStatus(null), 5000);
      setShowModal(false); setLoading(false); return;
    }
    // Verificar duplicata: mesmo endereço E mesmo código de cliente nos últimos 20min
    const vinte = new Date(Date.now() - 20*60*1000).toISOString();
    const duplicata = checkins.find(c =>
      c.usuario === user.nome &&
      new Date(c.timestamp) > new Date(vinte) &&
      Math.abs(c.lat - pendingPos.lat) < 0.002 &&
      Math.abs(c.lng - pendingPos.lng) < 0.002 &&
      (c.codigo_cliente || "").trim().toLowerCase() === codigo_cliente.trim().toLowerCase()
    );
    if (duplicata) {
      setStatus({ type:"error", msg:"⚠️ Check-in já realizado para este cliente neste endereço. Tente novamente mais tarde." });
      setTimeout(()=>setStatus(null), 6000);
      setShowModal(false); setPendingPos(null);
      setLoading(false); return;
    }
    try {
      const resumo_visita_truncado = (resumo_visita || "").slice(0, 1000);
      const payload = { usuario: user.nome, endereco: pendingPos.endereco, lat: pendingPos.lat, lng: pendingPos.lng, codigo_cliente, nome_cliente, motivos_visita: motivos_visita || null, resumo_visita: resumo_visita_truncado, loja, endereco_status, foto_url: foto_url || null };

      // Use fetch directly to have full control over the response
      const res = await fetch(`${SUPABASE_URL}/rest/v1/checkins`, {
        method: "POST",
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      console.log("✅ Status:", res.status, "Body:", text);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      // Close modal and show success FIRST, before any state updates
      setShowModal(false);
      setPendingPos(null);
      setLoading(false);
      setStatus({ type:"success", msg:"✅ Check-in registrado com sucesso!" });
      setTimeout(()=>setStatus(null), 3500);

      // Then update checkins list and trigger follow up
      try {
        const inserted = text ? JSON.parse(text) : null;
        const item = Array.isArray(inserted) ? inserted[0] : inserted;
        if (item) {
          setCheckins(prev => [item, ...prev]);
          setLastCheckin({ ...item, nome_cliente: item.nome_cliente || nome_cliente });
        } else {
          await fetchCheckins();
          setLastCheckin({ codigo_cliente, nome_cliente, loja });
        }
      } catch {
        await fetchCheckins();
        setLastCheckin({ codigo_cliente, nome_cliente, loja });
      }
      // Silently mark matching solicitacao as concluida
      try {
        let checkinId = null;
        try { const parsed = text ? JSON.parse(text) : null; checkinId = (Array.isArray(parsed) ? parsed[0] : parsed)?.id ?? null; } catch { /* silent */ }
        const codigoCliente = codigo_cliente;
        const sols = await api(
          `/solicitacoes_visita?promotor=eq.${encodeURIComponent(user.email)}&codigo_cliente=eq.${encodeURIComponent(codigoCliente)}&status=eq.pendente`
        );
        if (sols?.length > 0) {
          await api(
            `/solicitacoes_visita?promotor=eq.${encodeURIComponent(user.email)}&codigo_cliente=eq.${encodeURIComponent(codigoCliente)}&status=eq.pendente`,
            {
              method: "PATCH",
              body: JSON.stringify({ status: "concluida", checkin_id: checkinId }),
              headers: { "Prefer": "return=minimal" },
            }
          );
        }
      } catch { /* silent */ }

      // Show follow up modal after short delay
      setTimeout(() => setShowFollowUp(true), 600);
      return;

    } catch(e) {
      console.error("❌ Erro check-in:", e);
      const msg = e?.message || String(e);
      const friendly = msg.includes("duplicate") ? "Check-in duplicado detectado."
        : msg.includes("violates") ? "Erro de validação no servidor."
        : msg.includes("JWT") || msg.includes("auth") ? "Erro de autenticação. Faça login novamente."
        : "Erro: " + msg.slice(0, 200);
      setStatus({ type:"error", msg:"⚠️ " + friendly });
      setTimeout(()=>setStatus(null), 8000);
    }
    setLoading(false);
  };

  const handleDeleteCheckin = async (id) => {
    if (!window.confirm("Excluir este check-in?")) return;
    await api(`/checkins?id=eq.${id}`, { method:"DELETE" });
    setCheckins(prev => prev.filter(c=>c.id!==id));
  };

  const handleUpdateCheckin = (id, fields) => {
    setCheckins(prev => prev.map(c => c.id === id ? { ...c, ...fields } : c));
  };

  // Aplicar filtros
  const applyFilters = (list) => {
    let r = list;
    if (isDashboard && filterUser !== "Todos") r = r.filter(c => c.usuario === filterUser);
    if (filterDe)  r = r.filter(c => c.timestamp.slice(0,10) >= filterDe);
    if (filterAte) r = r.filter(c => c.timestamp.slice(0,10) <= filterAte);
    if (filterLoja !== "Todas") r = r.filter(c => c.loja === filterLoja);
    if (filterCliente.trim()) r = r.filter(c => (c.codigo_cliente||"").toLowerCase().includes(filterCliente.trim().toLowerCase()));
    return r;
  };

  const filtered = applyFilters(checkins);
  const totalToday = checkins.filter(c=>new Date(c.timestamp).toDateString()===new Date().toDateString()).length;
  const totalMes = checkins.filter(c=>{ const d=new Date(c.timestamp); const n=new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }).length;

  const tabs = [
    ...(!isDashboard ? [{ id:"checkin", label:"Check-in", icon:"✅" }] : []),
    { id:"historico",  label:"Histórico",  icon:"📋" },
    { id:"clientes",   label:"Clientes",   icon:"🔍" },
    { id:"followups",  label:"Follow Ups", icon:"🔔" },
    ...(!isDashboard || isGerenteLoja ? [{ id:"solicitacoes", label:"Solicitações", icon:"📋" }] : []),
    ...(isDashboard ? [{ id:"mapa", label:"Mapa", icon:"🗺️" }] : []),
    ...(isAdmin ? [{ id:"usuarios", label:"Usuários", icon:"👥" }] : []),
  ];
  useEffect(() => { if (isDashboard && tab === "checkin") setTab("historico"); }, [isDashboard]);

  const isMob = isMobile();
  if (!isMob && !isDashboard) return <MobileOnly onAdminLogin={handleLogin} />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={{ ...S.page, ...(theme === "light" ? { background:"#f0f4f8", color:"#0f1923" } : {}) }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#1e3050;border-radius:4px}
        .hvr:hover{opacity:.82;transform:translateY(-1px)} .hvr:active{transform:scale(.97)}
        .tab-btn{cursor:pointer;border:none;background:none;transition:all .2s;font-family:inherit}
        input:focus,select:focus,textarea:focus{border-color:#38bdf8!important;outline:none}
        .fade-in{animation:fi .35s ease} @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .sdot{width:7px;height:7px;border-radius:50%;background:#22c55e;animation:blink 2s infinite;display:inline-block}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        input[type=date]::-webkit-calendar-picker-indicator{filter:invert(.5)}
        body[data-theme="light"] { background:#f0f4f8; color:#0d1b2a; }
        body[data-theme="light"] td, body[data-theme="light"] th, body[data-theme="light"] p,
        body[data-theme="light"] span, body[data-theme="light"] div, body[data-theme="light"] label { color:#0d1b2a; }
        body[data-theme="light"] .tab-btn { color:#5a7190 !important; }
        body[data-theme="light"] input, body[data-theme="light"] select, body[data-theme="light"] textarea { background:#ffffff !important; color:#0d1b2a !important; border-color:#dde3ea !important; }
        body[data-theme="light"] [style*="color:#4a6080"], body[data-theme="light"] [style*="color: #4a6080"] { color:#2d3f55 !important; }
      `}</style>

      {showModal && <CheckInModal user={user} onConfirm={confirmarCheckIn} onCancel={()=>{setShowModal(false);setPendingPos(null);}} loading={loading} gpsEndereco={pendingPos?.endereco||""} gpsLat={pendingPos?.lat} gpsLng={pendingPos?.lng} />}
      {showFollowUp && <FollowUpModal user={user} checkin={lastCheckin} onSave={()=>{ setShowFollowUp(false); setStatus({ type:"success", msg:"🔔 Follow up agendado!" }); setTimeout(()=>setStatus(null),3000); }} onSkip={()=>setShowFollowUp(false)} />}
      {followupPopup.length > 0 && <FollowUpPopup followups={followupPopup} onConcluir={concluirFollowUp} onFechar={()=>setFollowupPopup([])} />}
      {user?.role === "user" && <SolicitacaoPopup user={user} onClose={() => {}} />}
      {showAnalise && <AnaliseModal checkins={filtered} onClose={() => setShowAnalise(false)} />}
      {retornoPopup.length > 0 && <RetornoPopup checkins={retornoPopup} onFechar={() => { localStorage.setItem(`hm_last_seen_${user.nome}`, new Date().toISOString()); setRetornoPopup([]); }} />}

      {/* Header */}
      <div style={{ ...(theme === "light" ? { background:"#ffffff", borderBottom:"1px solid #dde3ea" } : {}), padding:"15px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/logo.png" alt="HM Promotor" style={{ height:36, width:"auto", objectFit:"contain" }} />
          <div style={{ fontSize:11, color:"#4a6080", display:"flex", alignItems:"center", gap:5 }}><span className="sdot"></span> tempo real</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:13, fontWeight:600 }}>{user.nome}</div>
          {isGerenteLoja && user.loja?.length > 0 && (
            <span style={{ fontSize:11, fontWeight:600, background:"rgba(251,146,60,.15)", color:"#fb923c", padding:"3px 8px", borderRadius:6, whiteSpace:"nowrap" }}>
              🏪 {Array.isArray(user.loja) ? user.loja.join(", ") : user.loja}
            </span>
          )}
          {isDashboard && (
            <button
              className="hvr"
              onClick={() => setTheme(t => t === "dark" ? "light" : "dark")}
              style={{ background:"none", border:"1px solid rgba(255,255,255,.15)", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:16, color:"#fff" }}
              title="Alternar tema"
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </button>
          )}
          <button className="hvr" style={{ ...S.btn("ghost"), padding:"7px 12px", fontSize:12 }} onClick={handleLogout}>Sair</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", width:"100%", overflowX:"hidden", padding:"14px 8px 0", gap:2 }}>
        {tabs.map(t => (
          <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)} style={{
            flex:1, padding:"10px 4px", borderRadius:"10px 10px 0 0", fontWeight:600,
            color:tab===t.id?"#c0392b":"#4a6080",
            background:tab===t.id?"rgba(192,57,43,.08)":"transparent",
            borderBottom:tab===t.id?"2px solid #c0392b":"2px solid transparent",
            display:"flex", flexDirection:"column", alignItems:"center", gap:2,
          }}>
            <span style={{ fontSize:22 }}>{t.icon}</span>
            <span style={{ fontSize:12 }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ margin:"0 24px 28px", ...S.card, borderRadius:"0 12px 12px 12px", padding:24, minHeight:420, ...(theme === "light" ? { background:"#ffffff" } : {}) }}>

        {/* CHECK-IN */}
        {tab==="checkin" && (
          <div className="fade-in" style={{ maxWidth:440, margin:"0 auto" }}>
            {/* Contadores */}
            <div style={{ display:"flex", gap:12, marginBottom:24 }}>
              <div style={{ flex:1, background:"#0d1f35", borderRadius:14, padding:"16px 12px", textAlign:"center" }}>
                <div style={{ fontSize:32, fontWeight:700, color:"#fff", fontFamily:"'Space Mono',monospace" }}>{totalToday}</div>
                <div style={{ fontSize:11, color:"#4a6080", marginTop:4, letterSpacing:"0.08em" }}>HOJE</div>
              </div>
              <div style={{ flex:1, background:"#0d1f35", borderRadius:14, padding:"16px 12px", textAlign:"center" }}>
                <div style={{ fontSize:32, fontWeight:700, color:"#fff", fontFamily:"'Space Mono',monospace" }}>{totalMes}</div>
                <div style={{ fontSize:11, color:"#4a6080", marginTop:4, letterSpacing:"0.08em" }}>TOTAL DO MÊS</div>
              </div>
            </div>

            {/* Saudação */}
            <div style={{ marginBottom:24 }}>
              <div style={{ fontSize:18, fontWeight:600, color:"#fff", marginBottom:4 }}>Olá, {user.nome.split(" ")[0]}!</div>
              <div style={{ fontSize:13, color:"#4a6080" }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
            </div>

            {/* Botão */}
            <button className="hvr" style={{ width:"100%", height:56, fontSize:16, fontWeight:600, background:"#c0392b", color:"#fff", border:"none", borderRadius:14, cursor:"pointer", fontFamily:"inherit", transition:"all .2s", marginBottom:16 }} onClick={iniciarCheckIn} disabled={loading}>
              {loading ? "📡 Obtendo localização..." : "📍 Registrar Check-in"}
            </button>

            {/* Status */}
            {status && (
              <div className="fade-in" style={{ marginBottom:16, padding:"12px 15px", borderRadius:10,
                background:status.type==="success"?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",
                border:`1px solid ${status.type==="success"?"rgba(34,197,94,.25)":"rgba(239,68,68,.25)"}`,
                color:status.type==="success"?"#4ade80":"#f87171", fontSize:13, fontWeight:500, lineHeight:1.5 }}>
                {status.msg}
              </div>
            )}

            {/* Últimas visitas */}
            {checkins.length > 0 && (
              <div style={{ marginTop:8 }}>
                <div style={{ fontSize:12, color:"#4a6080", fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10 }}>Últimas visitas</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {checkins.slice(0,3).map(c => (
                    <div key={c.id} style={{ background:"#0d1f35", border:"1px solid #1a2d4a", borderRadius:12, padding:"12px 14px", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:600, color:"#fff", marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {c.codigo_cliente ? `${c.codigo_cliente} - ${c.nome_cliente || "—"}` : (c.nome_cliente || "—")}
                        </div>
                        <div style={{ fontSize:12, color:"#60a5fa" }}>{c.loja || "—"}</div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                        <div style={{ fontSize:11, color:"#4a6080" }}>{new Date(c.timestamp).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:"#22c55e" }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTÓRICO */}
        {tab==="historico" && (
          <div className="fade-in">
            {/* Filtros */}
            {(() => {
              const mob = window.innerWidth < 768;
              const filtrosAtivos = [filterUser!=="Todos", filterDe!==todayStr(), filterAte!==todayStr(), filterLoja!=="Todas", filterCliente.trim()!==""].filter(Boolean).length;
              const filtrosBody = (
                <div style={{ display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end" }}>
                  {isDashboard && (
                    <div style={{ flex:"1 1 140px" }}>
                      <label style={S.label}>Usuário</label>
                      <select style={{ ...S.input, appearance:"none" }} value={filterUser} onChange={e=>setFilterUser(e.target.value)}>
                        <option>Todos</option>
                        {allUsers.map(u=><option key={u}>{u}</option>)}
                      </select>
                    </div>
                  )}
                  <div style={{ flex:"1 1 130px" }}>
                    <label style={S.label}>De</label>
                    <input style={S.input} type="date" value={filterDe} onChange={e=>setFilterDe(e.target.value)} />
                  </div>
                  <div style={{ flex:"1 1 130px" }}>
                    <label style={S.label}>Até</label>
                    <input style={S.input} type="date" value={filterAte} onChange={e=>setFilterAte(e.target.value)} />
                  </div>
                  <div style={{ flex:"1 1 130px" }}>
                    <label style={S.label}>Loja</label>
                    <select style={{ ...S.input, appearance:"none" }} value={filterLoja} onChange={e=>setFilterLoja(e.target.value)}>
                      <option>Todas</option>
                      {LOJAS.map(l=><option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div style={{ flex:"1 1 130px" }}>
                    <label style={S.label}>Código Cliente</label>
                    <input style={S.input} placeholder="Buscar..." value={filterCliente} onChange={e=>setFilterCliente(e.target.value)} />
                  </div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button className="hvr" style={{ ...S.btn("ghost"), padding:"11px 13px", fontSize:12 }} onClick={fetchCheckins}>🔄</button>
                    {isDashboard && <button className="hvr" style={{ ...S.btn("success"), padding:"11px 15px", fontSize:12 }} onClick={()=>exportCSV(filtered)} disabled={!filtered.length}>⬇️ CSV</button>}
                    {isDashboard && <button className="hvr" style={{ ...S.btn("primary"), padding:"11px 15px", fontSize:12, background:"#c0392b", border:"none" }} onClick={()=>setShowAnalise(true)} disabled={!filtered.length}>🧠 Analisar Período</button>}
                  </div>
                </div>
              );
              if (!mob) return <div style={{ ...S.card, padding:16, marginBottom:18 }}>{filtrosBody}</div>;
              return (
                <div style={{ ...S.card, marginBottom:14, overflow:"hidden" }}>
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 16px" }} onClick={()=>setShowFiltros(v=>!v)}>
                    <span style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>
                      🔍 Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ""}
                    </span>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:12, color:"#4a6080" }}>{filtered.length} check-in{filtered.length!==1?"s":""}</span>
                      <span style={{ color:"#4a6080", fontSize:14 }}>{showFiltros ? "▲" : "▼"}</span>
                    </div>
                  </div>
                  <div style={{ maxHeight: showFiltros ? 600 : 0, overflow:"hidden", transition:"max-height .3s ease", padding: showFiltros ? "0 16px 16px" : "0 16px" }}>
                    {filtrosBody}
                  </div>
                </div>
              );
            })()}

            {/* Totalizador */}
            <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
              <div style={{ ...S.card, ...(theme === "light" ? { background:"#ffffff", border:"1px solid #dde3ea" } : {}), padding:"10px 18px", display:"flex", alignItems:"center", gap:10, flex:"1 1 auto" }}>
                <div style={{ fontSize:22, fontFamily:"'Space Mono',monospace", fontWeight:700, color:"#38bdf8" }}>{filtered.length}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:600 }}>Check-ins no período</div>
                  <div style={{ fontSize:11, color:"#4a6080", marginTop:1 }}>
                    {filterDe===filterAte ? filterDe : `${filterDe} → ${filterAte}`}
                    {isDashboard && filterUser!=="Todos" ? ` · ${filterUser}` : ""}
                  </div>
                </div>
              </div>
              {isDashboard && (
                <div style={{ ...S.card, ...(theme === "light" ? { background:"#ffffff", border:"1px solid #dde3ea" } : {}), padding:"10px 18px", display:"flex", alignItems:"center", gap:10, flex:"1 1 auto" }}>
                  <div style={{ fontSize:22, fontFamily:"'Space Mono',monospace", fontWeight:700, color:"#a78bfa" }}>
                    {[...new Set(filtered.map(c=>c.usuario))].length}
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600 }}>Usuários ativos</div>
                    <div style={{ fontSize:11, color:"#4a6080", marginTop:1 }}>no período filtrado</div>
                  </div>
                </div>
              )}
            </div>

            <HistoricoList checkins={filtered} onDelete={handleDeleteCheckin} isAdmin={isAdmin} isDashboard={isDashboard} loading={fetching} theme={theme} user={user} onUpdateCheckin={handleUpdateCheckin} />
          </div>
        )}

        {/* MAPA — reflete filtros */}
        {tab==="mapa" && isDashboard && (
          <div className="fade-in">
            <div style={{ ...S.card, padding:14, marginBottom:16, display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end" }}>
              <div style={{ flex:"1 1 140px" }}>
                <label style={S.label}>Usuário</label>
                <select style={{ ...S.input, appearance:"none" }} value={filterUser} onChange={e=>setFilterUser(e.target.value)}>
                  <option>Todos</option>
                  {allUsers.map(u=><option key={u}>{u}</option>)}
                </select>
              </div>
              <div style={{ flex:"1 1 120px" }}>
                <label style={S.label}>De</label>
                <input style={S.input} type="date" value={filterDe} onChange={e=>setFilterDe(e.target.value)} />
              </div>
              <div style={{ flex:"1 1 120px" }}>
                <label style={S.label}>Até</label>
                <input style={S.input} type="date" value={filterAte} onChange={e=>setFilterAte(e.target.value)} />
              </div>
              <div style={{ flex:"1 1 120px" }}>
                <label style={S.label}>Loja</label>
                <select style={{ ...S.input, appearance:"none" }} value={filterLoja} onChange={e=>setFilterLoja(e.target.value)}>
                  <option>Todas</option>
                  {LOJAS.map(l=><option key={l}>{l}</option>)}
                </select>
              </div>
              <div style={{ flex:"1 1 120px" }}>
                <label style={S.label}>Código Cliente</label>
                <input style={S.input} placeholder="Buscar..." value={filterCliente} onChange={e=>setFilterCliente(e.target.value)} />
              </div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <p style={{ color:"#4a6080", fontSize:13 }}>Mostrando check-ins do período filtrado</p>
              <span style={S.tag("purple")}>{filtered.length} pontos</span>
            </div>
            <div style={{ height:380, borderRadius:12, overflow:"hidden", border:"1px solid #1a2d4a" }}><MapView checkins={filtered} /></div>
          </div>
        )}

        {/* USUÁRIOS */}
        {tab==="usuarios" && isAdmin && (
          <div className="fade-in"><AdminUsers currentUser={user} /></div>
        )}

        {/* CLIENTES */}
        {tab==="clientes" && (
          <div className="fade-in"><ClienteSearch isDashboard={isDashboard} user={user} /></div>
        )}

        {/* FOLLOW UPS */}
        {tab==="followups" && (
          <div className="fade-in"><FollowUpsTab user={user} isAdmin={isDashboard} canDelete={isAdmin} theme={theme} userLoja={isGerenteLoja ? user.loja : null} /></div>
        )}

        {/* SOLICITAÇÕES */}
        {tab==="solicitacoes" && <SolicitacoesTab user={user} />}
      </div>
    </div>
  );
}
