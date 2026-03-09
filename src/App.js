import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://gujatvpuowgjxbdbvnwd.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1amF0dnB1b3dnanhiZGJ2bndkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjMyMjYsImV4cCI6MjA4ODYzOTIyNn0.vZFEuWkNwyQRmxUYMsqBHLoqYkJsNQRXRjvjdObKMbA";

const api = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation",
      ...options.headers,
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const text = await res.text();
  return text ? JSON.parse(text) : [];
};

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`);
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
};

const exportCSV = (checkins) => {
  const header = "Usuário,Data/Hora,Endereço,Latitude,Longitude\n";
  const rows = checkins.map(c => `"${c.usuario}","${formatDate(c.timestamp)}","${c.endereco}","${c.lat}","${c.lng}"`).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `checkins_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const S = {
  page: { minHeight:"100vh", background:"linear-gradient(135deg,#07101f 0%,#0b1829 60%,#071220 100%)", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:"#e2e8f0" },
  card: { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16 },
  input: { width:"100%", background:"#0d1a2e", border:"1px solid #1e3050", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontFamily:"inherit", fontSize:14, outline:"none", transition:"border-color .2s" },
  btn: (v="primary") => ({
    cursor:"pointer", border:"none", borderRadius:11, padding:"12px 20px", fontFamily:"inherit", fontSize:14, fontWeight:600, transition:"all .2s",
    ...(v==="primary" ? { background:"linear-gradient(135deg,#0ea5e9,#6366f1)", color:"#fff" } : {}),
    ...(v==="danger"  ? { background:"rgba(239,68,68,.12)", color:"#f87171", border:"1px solid rgba(239,68,68,.25)" } : {}),
    ...(v==="ghost"   ? { background:"rgba(255,255,255,.05)", color:"#94a3b8", border:"1px solid rgba(255,255,255,.08)" } : {}),
    ...(v==="success" ? { background:"rgba(34,197,94,.12)", color:"#4ade80", border:"1px solid rgba(34,197,94,.25)" } : {}),
  }),
  label: { display:"block", fontSize:11, fontWeight:700, color:"#4a6080", letterSpacing:"0.09em", marginBottom:7, textTransform:"uppercase" },
  tag: (c) => ({ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
    ...(c==="blue"   ? { background:"rgba(56,189,248,.1)",  color:"#38bdf8", border:"1px solid rgba(56,189,248,.2)"  } : {}),
    ...(c==="purple" ? { background:"rgba(167,139,250,.1)", color:"#a78bfa", border:"1px solid rgba(167,139,250,.2)" } : {}),
    ...(c==="green"  ? { background:"rgba(34,197,94,.1)",   color:"#4ade80", border:"1px solid rgba(34,197,94,.2)"   } : {}),
    ...(c==="red"    ? { background:"rgba(239,68,68,.1)",   color:"#f87171", border:"1px solid rgba(239,68,68,.2)"   } : {}),
  }),
};

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleLogin = async () => {
    if (!email || !senha) { setErro("Preencha todos os campos."); return; }
    setLoading(true); setErro("");
    try {
      const data = await api(`/app_users?email=eq.${encodeURIComponent(email)}&senha=eq.${encodeURIComponent(senha)}&select=id,nome,email,role`);
      if (!data.length) { setErro("E-mail ou senha incorretos."); setLoading(false); return; }
      onLogin(data[0]);
    } catch { setErro("Erro de conexão. Tente novamente."); }
    setLoading(false);
  };

  return (
    <div style={{ ...S.page, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input:focus{border-color:#38bdf8!important;outline:none}
        .hvr:hover{opacity:.85;transform:translateY(-1px)} .hvr:active{transform:scale(.97)}
        .fade-in{animation:fi .4s ease} @keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div className="fade-in" style={{ width:"100%", maxWidth:400 }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:56, height:56, borderRadius:16, background:"linear-gradient(135deg,#0ea5e9,#6366f1)", display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:26, marginBottom:16 }}>📍</div>
          <h1 style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700 }}>CheckPoint</h1>
          <p style={{ color:"#4a6080", fontSize:13, marginTop:6 }}>Faça login para continuar</p>
        </div>
        <div style={{ ...S.card, padding:28, display:"flex", flexDirection:"column", gap:18 }}>
          <div>
            <label style={S.label}>E-mail</label>
            <input style={S.input} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
          </div>
          <div>
            <label style={S.label}>Senha</label>
            <input style={S.input} type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} />
          </div>
          {erro && <div style={{ ...S.tag("red"), padding:"10px 14px", borderRadius:10, fontSize:13 }}>⚠️ {erro}</div>}
          <button className="hvr" style={{ ...S.btn("primary"), padding:14, fontSize:15, marginTop:4 }} onClick={handleLogin} disabled={loading}>
            {loading?"Entrando...":"Entrar →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MapView({ checkins }) {
  if (!checkins.length) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:8 }}>
      <span style={{ fontSize:36 }}>📍</span><p style={{ color:"#8a9ab5", fontSize:13 }}>Nenhum check-in ainda</p>
    </div>
  );
  const lats=checkins.map(c=>c.lat), lngs=checkins.map(c=>c.lng);
  const cLat=(Math.min(...lats)+Math.max(...lats))/2, cLng=(Math.min(...lngs)+Math.max(...lngs))/2;
  const url=`https://www.openstreetmap.org/export/embed.html?bbox=${cLng-.05},${cLat-.05},${cLng+.05},${cLat+.05}&layer=mapnik&marker=${cLat},${cLng}`;
  return (
    <div style={{ width:"100%", height:"100%", borderRadius:12, overflow:"hidden", position:"relative" }}>
      <iframe title="mapa" src={url} style={{ width:"100%", height:"100%", border:"none" }} />
      <div style={{ position:"absolute", top:8, right:8, background:"rgba(10,16,30,.88)", backdropFilter:"blur(8px)", borderRadius:8, padding:"5px 12px", fontSize:12, border:"1px solid rgba(255,255,255,.08)" }}>
        {checkins.length} ponto{checkins.length!==1?"s":""}
      </div>
    </div>
  );
}

function HistoricoList({ checkins, onDelete, isAdmin, loading }) {
  if (loading) return <div style={{ textAlign:"center", padding:48, color:"#4a6080" }}><div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Carregando...</div>;
  if (!checkins.length) return <div style={{ textAlign:"center", padding:48, color:"#4a6080" }}><div style={{ fontSize:36, marginBottom:12 }}>📋</div>Nenhum check-in encontrado</div>;
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10, maxHeight:440, overflowY:"auto" }}>
      {checkins.map((c,i) => (
        <div key={c.id} style={{ background:"#0a1628", border:"1px solid #1a2d4a", borderRadius:12, padding:"13px 16px", display:"grid", gridTemplateColumns:"1fr auto", gap:8, alignItems:"start" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:5 }}>
              <div style={{ width:28, height:28, borderRadius:"50%", background:`hsl(${(c.usuario||"").charCodeAt(0)*7%360},55%,35%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color:"#fff", flexShrink:0 }}>
                {(c.usuario||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <span style={{ fontWeight:600, fontSize:14 }}>{c.usuario}</span>
            </div>
            <div style={{ fontSize:12, color:"#38bdf8", marginBottom:4 }}>🕐 {formatDate(c.timestamp)}</div>
            <div style={{ fontSize:12, color:"#8a9ab5", lineHeight:1.5 }}>📍 {c.endereco}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
            <span style={S.tag("blue")}>#{checkins.length-i}</span>
            {isAdmin && <button style={{ ...S.btn("danger"), padding:"4px 10px", fontSize:11 }} onClick={()=>onDelete(c.id)}>✕</button>}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminUsers({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome:"", email:"", senha:"", role:"user" });
  const [erro, setErro] = useState(""); const [ok, setOk] = useState("");

  const fetchUsers = async () => { setLoading(true); try { setUsers(await api("/app_users?order=created_at.asc&select=id,nome,email,role,created_at")); } catch{} setLoading(false); };
  useEffect(() => { fetchUsers(); }, []);

  const addUser = async () => {
    if (!form.nome||!form.email||!form.senha) { setErro("Preencha todos os campos."); return; }
    setErro("");
    try {
      await api("/app_users", { method:"POST", body:JSON.stringify(form) });
      setForm({ nome:"", email:"", senha:"", role:"user" });
      setOk("Usuário criado com sucesso!"); setTimeout(()=>setOk(""),3000); fetchUsers();
    } catch { setErro("Erro ao criar. E-mail já cadastrado?"); }
  };

  const deleteUser = async (id) => {
    if (id===currentUser.id) { setErro("Você não pode excluir a si mesmo."); return; }
    if (!window.confirm("Excluir este usuário?")) return;
    await api(`/app_users?id=eq.${id}`, { method:"DELETE" }); fetchUsers();
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div style={{ ...S.card, padding:20 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:16, color:"#38bdf8" }}>➕ Novo Usuário</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div><label style={S.label}>Nome</label><input style={S.input} placeholder="Nome completo" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} /></div>
          <div><label style={S.label}>E-mail</label><input style={S.input} type="email" placeholder="email@exemplo.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
          <div><label style={S.label}>Senha</label><input style={S.input} placeholder="Senha inicial" value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})} /></div>
          <div><label style={S.label}>Perfil</label>
            <select style={{ ...S.input, appearance:"none" }} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              <option value="user">Usuário comum</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
        {erro && <div style={{ ...S.tag("red"), padding:"8px 12px", borderRadius:8, fontSize:12, marginBottom:10 }}>⚠️ {erro}</div>}
        {ok   && <div style={{ ...S.tag("green"), padding:"8px 12px", borderRadius:8, fontSize:12, marginBottom:10 }}>✅ {ok}</div>}
        <button style={{ ...S.btn("primary"), padding:"11px 20px" }} onClick={addUser}>Criar Usuário</button>
      </div>

      <div>
        <div style={{ ...S.label, marginBottom:12 }}>Usuários cadastrados ({users.length})</div>
        {loading ? <div style={{ color:"#4a6080", fontSize:13 }}>Carregando...</div> : (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {users.map(u => (
              <div key={u.id} style={{ ...S.card, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:"50%", background:`hsl(${u.nome.charCodeAt(0)*7%360},55%,30%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0 }}>
                    {u.nome.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight:600, fontSize:14 }}>{u.nome} {u.id===currentUser.id&&<span style={{ fontSize:11, color:"#4a6080" }}>(você)</span>}</div>
                    <div style={{ fontSize:12, color:"#4a6080", marginTop:2 }}>{u.email}</div>
                  </div>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={S.tag(u.role==="admin"?"purple":"blue")}>{u.role==="admin"?"👑 Admin":"👤 Usuário"}</span>
                  {u.id!==currentUser.id && <button style={{ ...S.btn("danger"), padding:"5px 11px", fontSize:12 }} onClick={()=>deleteUser(u.id)}>Excluir</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("checkpoint_user")); } catch { return null; } });
  const [tab, setTab] = useState("checkin");
  const [checkins, setCheckins] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [filterUser, setFilterUser] = useState("Todos");
  const [allUsers, setAllUsers] = useState([]);

  const isAdmin = user?.role === "admin";

  const handleLogin = (u) => { localStorage.setItem("checkpoint_user", JSON.stringify(u)); setUser(u); };
  const handleLogout = () => { localStorage.removeItem("checkpoint_user"); setUser(null); setTab("checkin"); };

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    try {
      const path = isAdmin
        ? "/checkins?order=timestamp.desc&limit=200"
        : `/checkins?usuario=eq.${encodeURIComponent(user.nome)}&order=timestamp.desc&limit=100`;
      setCheckins(await api(path));
    } catch(e) { console.error(e); } finally { setFetching(false); }
  }, [user, isAdmin]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try { setAllUsers((await api("/app_users?select=nome&order=nome.asc")).map(u=>u.nome)); } catch{}
  }, [isAdmin]);

  useEffect(() => {
    fetchCheckins(); fetchUsers();
    const t = setInterval(fetchCheckins, 10000);
    return () => clearInterval(t);
  }, [fetchCheckins, fetchUsers]);

  const handleCheckIn = async () => {
    if (loading) return;
    setLoading(true); setStatus(null);
    try {
      const pos = await new Promise((res,rej) => navigator.geolocation.getCurrentPosition(res,rej,{timeout:10000}));
      const {latitude:lat, longitude:lng} = pos.coords;
      const endereco = await reverseGeocode(lat, lng);
      const [inserted] = await api("/checkins", { method:"POST", body:JSON.stringify({ usuario:user.nome, endereco, lat, lng }) });
      setCheckins(prev => [inserted, ...prev]);
      setStatus({ type:"success", msg:"Check-in registrado com sucesso!" });
      setTimeout(()=>setStatus(null), 3500);
    } catch(e) {
      setStatus({ type:"error", msg: e.code ? "Permissão de localização negada." : "Erro ao salvar. Tente novamente." });
      setTimeout(()=>setStatus(null), 4000);
    }
    setLoading(false);
  };

  const handleDeleteCheckin = async (id) => {
    if (!window.confirm("Excluir este check-in?")) return;
    await api(`/checkins?id=eq.${id}`, { method:"DELETE" });
    setCheckins(prev => prev.filter(c=>c.id!==id));
  };

  const filtered = (isAdmin && filterUser!=="Todos") ? checkins.filter(c=>c.usuario===filterUser) : checkins;
  const totalToday = checkins.filter(c=>new Date(c.timestamp).toDateString()===new Date().toDateString()).length;

  if (!user) return <LoginScreen onLogin={handleLogin} />;

  const tabs = [
    { id:"checkin",   label:"Check-in", icon:"✅" },
    { id:"historico", label:"Histórico", icon:"📋" },
    ...(isAdmin ? [
      { id:"mapa",     label:"Mapa",     icon:"🗺️" },
      { id:"usuarios", label:"Usuários", icon:"👥" },
    ] : []),
  ];

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#1e3050;border-radius:4px}
        .hvr:hover{opacity:.82;transform:translateY(-1px)} .hvr:active{transform:scale(.97)}
        .tab-btn{cursor:pointer;border:none;background:none;transition:all .2s;font-family:inherit}
        input:focus,select:focus{border-color:#38bdf8!important;outline:none}
        .fade-in{animation:fi .35s ease} @keyframes fi{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .sdot{width:7px;height:7px;border-radius:50%;background:#22c55e;animation:blink 2s infinite;display:inline-block}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
      `}</style>

      {/* Header */}
      <div style={{ background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.06)", padding:"15px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#0ea5e9,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>📍</div>
          <div>
            <div style={{ fontFamily:"'Space Mono',monospace", fontSize:14, fontWeight:700 }}>CheckPoint</div>
            <div style={{ fontSize:11, color:"#4a6080", display:"flex", alignItems:"center", gap:5, marginTop:1 }}><span className="sdot"/> tempo real</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:"#38bdf8" }}>{totalToday}</div><div style={{ fontSize:10, color:"#4a6080" }}>HOJE</div></div>
          <div style={{ width:1, height:28, background:"#1a2d4a" }}/>
          <div style={{ textAlign:"center" }}><div style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:"#a78bfa" }}>{checkins.length}</div><div style={{ fontSize:10, color:"#4a6080" }}>TOTAL</div></div>
          <div style={{ width:1, height:28, background:"#1a2d4a" }}/>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ textAlign:"right" }}>
              <div style={{ fontSize:13, fontWeight:600 }}>{user.nome}</div>
              <span style={S.tag(isAdmin?"purple":"blue")}>{isAdmin?"👑 Admin":"👤 Usuário"}</span>
            </div>
            <button className="hvr" style={{ ...S.btn("ghost"), padding:"7px 12px", fontSize:12 }} onClick={handleLogout}>Sair</button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", padding:"14px 24px 0", gap:4 }}>
        {tabs.map(t => (
          <button key={t.id} className="tab-btn" onClick={()=>setTab(t.id)} style={{
            padding:"8px 16px", borderRadius:"10px 10px 0 0", fontSize:13, fontWeight:600,
            color:tab===t.id?"#38bdf8":"#4a6080",
            background:tab===t.id?"rgba(56,189,248,.08)":"transparent",
            borderBottom:tab===t.id?"2px solid #38bdf8":"2px solid transparent",
          }}>{t.icon} {t.label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ margin:"0 24px 28px", ...S.card, borderRadius:"0 12px 12px 12px", padding:24, minHeight:420 }}>

        {tab==="checkin" && (
          <div className="fade-in" style={{ maxWidth:420, margin:"0 auto" }}>
            <p style={{ color:"#4a6080", fontSize:13, marginBottom:24 }}>Registre sua presença com localização GPS automática.</p>
            <div style={{ background:"rgba(56,189,248,.05)", border:"1px solid rgba(56,189,248,.12)", borderRadius:12, padding:16, marginBottom:24, display:"flex", gap:12, alignItems:"center" }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:`hsl(${user.nome.charCodeAt(0)*7%360},55%,30%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, fontWeight:700, flexShrink:0 }}>
                {user.nome.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:15 }}>{user.nome}</div>
                <div style={{ fontSize:12, color:"#4a6080", marginTop:2 }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</div>
              </div>
            </div>
            <button className="hvr" style={{ ...S.btn("primary"), width:"100%", padding:15, fontSize:15 }} onClick={handleCheckIn} disabled={loading}>
              {loading?"📡 Obtendo localização...":"📍 Registrar Check-in"}
            </button>
            {status && (
              <div className="fade-in" style={{ marginTop:14, padding:"11px 15px", borderRadius:10,
                background:status.type==="success"?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",
                border:`1px solid ${status.type==="success"?"rgba(34,197,94,.25)":"rgba(239,68,68,.25)"}`,
                color:status.type==="success"?"#4ade80":"#f87171", fontSize:13, fontWeight:500 }}>
                {status.type==="success"?"✅":"⚠️"} {status.msg}
              </div>
            )}
            {checkins.length>0 && (
              <div style={{ marginTop:28 }}>
                <div style={{ ...S.label, marginBottom:10 }}>Seu último check-in</div>
                <div style={{ background:"#0a1628", border:"1px solid #1a2d4a", borderRadius:12, padding:14 }}>
                  <div style={{ fontSize:12, color:"#38bdf8" }}>{formatDate(checkins[0].timestamp)}</div>
                  <div style={{ fontSize:12, color:"#8a9ab5", marginTop:5, lineHeight:1.5 }}>📍 {checkins[0].endereco}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab==="historico" && (
          <div className="fade-in">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18, flexWrap:"wrap", gap:10 }}>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {isAdmin && (
                  <select style={{ ...S.input, width:"auto", minWidth:160 }} value={filterUser} onChange={e=>setFilterUser(e.target.value)}>
                    <option>Todos</option>
                    {allUsers.map(u=><option key={u}>{u}</option>)}
                  </select>
                )}
                <button className="hvr" style={{ ...S.btn("ghost"), padding:"9px 13px", fontSize:12 }} onClick={fetchCheckins}>🔄 Atualizar</button>
              </div>
              {isAdmin && <button className="hvr" style={{ ...S.btn("success"), padding:"9px 15px", fontSize:12 }} onClick={()=>exportCSV(filtered)} disabled={!filtered.length}>⬇️ Exportar CSV</button>}
            </div>
            <HistoricoList checkins={filtered} onDelete={handleDeleteCheckin} isAdmin={isAdmin} loading={fetching} />
          </div>
        )}

        {tab==="mapa" && isAdmin && (
          <div className="fade-in">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <p style={{ color:"#4a6080", fontSize:13 }}>Localização de todos os check-ins</p>
              <span style={S.tag("purple")}>{checkins.length} registros</span>
            </div>
            <div style={{ height:390, borderRadius:12, overflow:"hidden", border:"1px solid #1a2d4a" }}><MapView checkins={checkins} /></div>
          </div>
        )}

        {tab==="usuarios" && isAdmin && (
          <div className="fade-in"><AdminUsers currentUser={user} /></div>
        )}
      </div>
    </div>
  );
}
