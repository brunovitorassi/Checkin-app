import React, { useState, useEffect, useCallback, useRef } from "react";

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
  const header = "Usuário,Data/Hora,Loja,Endereço,Código Cliente,Resumo da Visita,Latitude,Longitude\n";
  const rows = checkins.map(c =>
    `"${c.usuario}","${formatDate(c.timestamp)}","${c.loja||""}","${c.endereco}","${c.codigo_cliente||""}","${c.resumo_visita||""}","${c.lat}","${c.lng}"`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `checkins_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
};

const LOJAS = ["Matriz","Campinas","Palhoça","Tubarão","Ingleses","Rio Tavares","Forquilinhas"];

const todayStr = () => new Date().toISOString().slice(0,10);

const S = {
  page: { minHeight:"100vh", background:"linear-gradient(135deg,#07101f 0%,#0b1829 60%,#071220 100%)", fontFamily:"'DM Sans','Segoe UI',sans-serif", color:"#e2e8f0" },
  card: { background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16 },
  input: { width:"100%", background:"#0d1a2e", border:"1px solid #1e3050", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontFamily:"inherit", fontSize:14, outline:"none", transition:"border-color .2s" },
  textarea: { width:"100%", background:"#0d1a2e", border:"1px solid #1e3050", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontFamily:"inherit", fontSize:14, outline:"none", transition:"border-color .2s", resize:"vertical", minHeight:90 },
  btn: (v="primary") => ({
    cursor:"pointer", border:"none", borderRadius:11, padding:"12px 20px", fontFamily:"inherit", fontSize:14, fontWeight:600, transition:"all .2s",
    ...(v==="primary" ? { background:"linear-gradient(135deg,#0ea5e9,#6366f1)", color:"#fff" } : {}),
    ...(v==="danger"  ? { background:"rgba(239,68,68,.12)", color:"#f87171", border:"1px solid rgba(239,68,68,.25)" } : {}),
    ...(v==="ghost"   ? { background:"rgba(255,255,255,.05)", color:"#94a3b8", border:"1px solid rgba(255,255,255,.08)" } : {}),
    ...(v==="success" ? { background:"rgba(34,197,94,.12)", color:"#4ade80", border:"1px solid rgba(34,197,94,.25)" } : {}),
    ...(v==="outline" ? { background:"transparent", color:"#38bdf8", border:"1px solid rgba(56,189,248,.3)" } : {}),
  }),
  label: { display:"block", fontSize:11, fontWeight:700, color:"#4a6080", letterSpacing:"0.09em", marginBottom:7, textTransform:"uppercase" },
  tag: (c) => ({ display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:20, fontSize:11, fontWeight:700,
    ...(c==="blue"   ? { background:"rgba(56,189,248,.1)",  color:"#38bdf8", border:"1px solid rgba(56,189,248,.2)"  } : {}),
    ...(c==="purple" ? { background:"rgba(167,139,250,.1)", color:"#a78bfa", border:"1px solid rgba(167,139,250,.2)" } : {}),
    ...(c==="green"  ? { background:"rgba(34,197,94,.1)",   color:"#4ade80", border:"1px solid rgba(34,197,94,.2)"   } : {}),
    ...(c==="red"    ? { background:"rgba(239,68,68,.1)",   color:"#f87171", border:"1px solid rgba(239,68,68,.2)"   } : {}),
    ...(c==="orange" ? { background:"rgba(251,146,60,.1)",  color:"#fb923c", border:"1px solid rgba(251,146,60,.2)"  } : {}),
  }),
};


// ─── MOBILE GUARD ─────────────────────────────────────────────────────────────
const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
};

function MobileOnly({ onAdminLogin }) {
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const handleAdminLogin = async () => {
    if (!email || !senha) { setErro("Preencha e-mail e senha."); return; }
    setLoading(true); setErro("");
    try {
      const data = await api(`/app_users?email=eq.${encodeURIComponent(email)}&senha=eq.${encodeURIComponent(senha)}&select=id,nome,email,role`);
      if (!data.length) { setErro("E-mail ou senha incorretos."); setLoading(false); return; }
      if (data[0].role !== "admin") { setErro("Acesso restrito a administradores."); setLoading(false); return; }
      onAdminLogin(data[0]);
    } catch { setErro("Erro de conexão. Tente novamente."); }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
      background:"linear-gradient(135deg,#07101f 0%,#0b1829 60%,#071220 100%)",
      fontFamily:"'DM Sans','Segoe UI',sans-serif", color:"#e2e8f0", padding:32, textAlign:"center",
      flexDirection:"column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Space+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input:focus{border-color:#38bdf8!important;outline:none} .hvr-row:hover td{background:rgba(56,189,248,.04)!important}
        .hvr:hover{opacity:.85;transform:translateY(-1px)}
      `}</style>

      {!showForm ? (
        <div>
          <div style={{ fontSize:72, marginBottom:24 }}>📱</div>
          <h1 style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, marginBottom:12 }}>
            Acesso apenas pelo celular
          </h1>
          <p style={{ color:"#4a6080", fontSize:15, lineHeight:1.7, maxWidth:320, margin:"0 auto" }}>
            O CheckPoint foi desenvolvido para uso em dispositivos móveis.<br/><br/>
            Por favor, acesse pelo seu <strong style={{color:"#38bdf8"}}>smartphone</strong>.
          </p>
          <div style={{ marginTop:32, display:"inline-flex", alignItems:"center", gap:10,
            background:"rgba(56,189,248,.08)", border:"1px solid rgba(56,189,248,.2)",
            borderRadius:12, padding:"12px 20px" }}>
            <span style={{ fontSize:20 }}>🔒</span>
            <span style={{ fontSize:13, color:"#38bdf8", fontWeight:600 }}>Restrito a dispositivos móveis</span>
          </div>
          <div style={{ marginTop:52 }}>
            <button onClick={() => setShowForm(true)}
              style={{ background:"none", border:"none", color:"#1e3050", fontSize:12,
                cursor:"pointer", fontFamily:"inherit", textDecoration:"underline" }}>
              Acesso administrador
            </button>
          </div>
        </div>
      ) : (
        <div style={{ width:"100%", maxWidth:380 }}>
          <div style={{ marginBottom:24 }}>
            <div style={{ fontSize:36, marginBottom:12 }}>👑</div>
            <h2 style={{ fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, marginBottom:6 }}>Acesso Administrador</h2>
            <p style={{ color:"#4a6080", fontSize:13 }}>Somente administradores podem acessar pelo computador.</p>
          </div>
          <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:24, display:"flex", flexDirection:"column", gap:14, textAlign:"left" }}>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#4a6080", letterSpacing:"0.09em", marginBottom:7, textTransform:"uppercase" }}>E-mail</label>
              <input style={{ width:"100%", background:"#0d1a2e", border:"1px solid #1e3050", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontFamily:"inherit", fontSize:14, outline:"none" }}
                type="email" placeholder="admin@empresa.com" value={email}
                onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdminLogin()} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#4a6080", letterSpacing:"0.09em", marginBottom:7, textTransform:"uppercase" }}>Senha</label>
              <input style={{ width:"100%", background:"#0d1a2e", border:"1px solid #1e3050", borderRadius:10, padding:"12px 14px", color:"#e2e8f0", fontFamily:"inherit", fontSize:14, outline:"none" }}
                type="password" placeholder="••••••••" value={senha}
                onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleAdminLogin()} />
            </div>
            {erro && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:9, padding:"9px 13px", color:"#f87171", fontSize:13 }}>⚠️ {erro}</div>}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button className="hvr" onClick={() => { setShowForm(false); setErro(""); setEmail(""); setSenha(""); }}
                style={{ flex:1, background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", borderRadius:11, padding:12, color:"#94a3b8", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                Voltar
              </button>
              <button className="hvr" onClick={handleAdminLogin} disabled={loading}
                style={{ flex:2, background:"linear-gradient(135deg,#0ea5e9,#6366f1)", border:"none", borderRadius:11, padding:12, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                {loading ? "Verificando..." : "Entrar →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState(""); const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false); const [erro, setErro] = useState("");
  const handleLogin = async () => {
    if (!email||!senha) { setErro("Preencha todos os campos."); return; }
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
        input:focus,select:focus,textarea:focus{border-color:#38bdf8!important;outline:none}
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
          <div><label style={S.label}>E-mail</label><input style={S.input} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
          <div><label style={S.label}>Senha</label><input style={S.input} type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
          {erro && <div style={{ ...S.tag("red"), padding:"10px 14px", borderRadius:10, fontSize:13 }}>⚠️ {erro}</div>}
          <button className="hvr" style={{ ...S.btn("primary"), padding:14, fontSize:15, marginTop:4 }} onClick={handleLogin} disabled={loading}>{loading?"Entrando...":"Entrar →"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL DE CHECK-IN ─────────────────────────────────────────────────────────
const EDGE_FUNCTION_URL = "https://gujatvpuowgjxbdbvnwd.supabase.co/functions/v1/buscar-cliente";
const TRANSCRIPTION_URL = "https://gujatvpuowgjxbdbvnwd.supabase.co/functions/v1/transcrever-audio";

function CheckInModal({ user, onConfirm, onCancel, loading, gpsEndereco, gpsLat, gpsLng }) {
  const [etapa, setEtapa] = useState(1); // 1 = código, 2 = loja + resumo
  const [codigo, setCodigo] = useState("");
  const [resumo, setResumo] = useState("");
  const [loja, setLoja] = useState("");
  const [erro, setErro] = useState("");
  const [validando, setValidando] = useState(false);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [erroAudio, setErroAudio] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const iniciarGravacao = async () => {
    setErroAudio("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4" });
      chunksRef.current = [];
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        if (chunksRef.current.length === 0) {
          setErroAudio("Nenhum áudio gravado. Tente novamente.");
          setTranscrevendo(false);
          return;
        }
        const mimeType = chunksRef.current[0]?.type || mr.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        await transcreverAudio(blob, mimeType);
      };
      mr.start(100); // collect chunks every 100ms
      mediaRecorderRef.current = mr;
      setGravando(true);
    } catch {
      setErroAudio("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const pararGravacao = () => {
    if (mediaRecorderRef.current && gravando) {
      mediaRecorderRef.current.stop();
      setGravando(false);
    }
  };

  const transcreverAudio = async (blob, mimeType) => {
    setTranscrevendo(true);
    try {
      const ext = mimeType.includes("mp4") || mimeType.includes("m4a") ? "audio.mp4" : "audio.webm";
      const fd = new FormData();
      fd.append("audio", new File([blob], ext, { type: mimeType }), ext);
      const res = await fetch(TRANSCRIPTION_URL, { method: "POST", body: fd });
      const data = await res.json();
      if (data.texto) {
        setResumo(prev => prev ? `${prev} ${data.texto}` : data.texto);
      } else {
        setErroAudio("Não foi possível transcrever. Tente novamente.");
      }
    } catch {
      setErroAudio("Erro na transcrição. Tente novamente.");
    }
    setTranscrevendo(false);
  };

  const buscarCliente = async () => {
    if (!codigo.trim()) { setErro("Informe o código do cliente."); return; }
    setErro(""); setValidando(true); setClienteInfo(null);
    try {
      // Send GPS coordinates so edge function can calculate real distance
      let url = `${EDGE_FUNCTION_URL}?clienteId=${encodeURIComponent(codigo.trim())}`;
      if (gpsLat && gpsLng) url += `&lat=${gpsLat}&lng=${gpsLng}`;
      const res = await fetch(url);
      let data = {};
      try { data = await res.json(); } catch { data = {}; }

      if (res.status === 404 || !res.ok || !data.nome) {
        setClienteInfo({ status: "nao_encontrado" });
        setValidando(false); setEtapa(2); return;
      }

      if (data.loja) setLoja(data.loja);
      const endCRM = data.endereco;
      setClienteInfo({
        status: data.endereco_status || "nao_verificado",
        nome: data.nome || null,
        loja: data.loja,
        enderecoCRM: endCRM?.enderecoCompleto || "",
        distancia: data.distancia_metros,
      });
      setEtapa(2);
    } catch { setClienteInfo({ status: "erro_api" }); setEtapa(2); }
    setValidando(false);
  };

  const handleConfirm = () => {
    if (!loja) { setErro("Selecione a loja."); return; }
    if (!resumo.trim()) { setErro("Informe o resumo da visita."); return; }
    setErro(""); onConfirm({ codigo_cliente: codigo.trim(), nome_cliente: clienteInfo?.nome || null, resumo_visita: resumo.trim(), loja, endereco_status: clienteInfo?.status ?? "nao_verificado" });
  };

  const statusColors = {
    ok:            { bg:"rgba(34,197,94,.08)",   border:"rgba(34,197,94,.25)",   color:"#4ade80" },
    divergente:    { bg:"rgba(251,146,60,.08)",  border:"rgba(251,146,60,.25)",  color:"#fb923c" },
    nao_encontrado:{ bg:"rgba(239,68,68,.08)",   border:"rgba(239,68,68,.25)",   color:"#f87171" },
    erro_api:      { bg:"rgba(100,116,139,.08)", border:"rgba(100,116,139,.25)", color:"#94a3b8" },
  };
  const sc = clienteInfo ? statusColors[clienteInfo.status] : null;

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", backdropFilter:"blur(6px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20, overflowY:"auto" }}>
      <div className="fade-in" style={{ ...S.card, background:"#0d1a2e", width:"100%", maxWidth:440, padding:28, borderRadius:18, margin:"auto" }}>

        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:"linear-gradient(135deg,#0ea5e9,#6366f1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📋</div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15 }}>Detalhes da Visita</div>
            <div style={{ fontSize:12, color:"#4a6080", marginTop:2 }}>{etapa === 1 ? "Informe o código do cliente" : "Confirme a loja e descreva a visita"}</div>
          </div>
          {/* Step indicator */}
          <div style={{ display:"flex", gap:5 }}>
            {[1,2].map(n => (
              <div key={n} style={{ width:8, height:8, borderRadius:"50%", background: etapa >= n ? "#0ea5e9" : "#1e3050" }} />
            ))}
          </div>
        </div>

        {/* ETAPA 1 — Código do cliente */}
        {etapa === 1 && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            <div>
              <label style={S.label}>Código do Cliente</label>
              <input style={S.input} placeholder="Ex: 549" value={codigo} autoFocus
                onChange={e=>{ setCodigo(e.target.value); setErro(""); }}
                onKeyDown={e=>e.key==="Enter" && buscarCliente()} />
            </div>
            {erro && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:9, padding:"9px 13px", color:"#f87171", fontSize:13 }}>⚠️ {erro}</div>}
            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button className="hvr" style={{ ...S.btn("ghost"), flex:1, padding:13 }} onClick={onCancel} disabled={validando}>Cancelar</button>
              <button className="hvr" style={{ ...S.btn("primary"), flex:2, padding:13 }} onClick={buscarCliente} disabled={validando}>
                {validando ? "🔍 Buscando..." : "Buscar cliente →"}
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 2 — Loja + Resumo */}
        {etapa === 2 && (
          <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
            {/* Client info card */}
            {clienteInfo && sc && (
              <div style={{ padding:"11px 14px", borderRadius:11, fontSize:13, background:sc.bg, border:`1px solid ${sc.border}`, color:sc.color }}>
                {clienteInfo.status === "ok" && (
                  <><strong>{clienteInfo.nome}</strong>{clienteInfo.loja && <span style={{ marginLeft:6, fontSize:11, background:"rgba(99,102,241,.2)", color:"#a5b4fc", padding:"2px 8px", borderRadius:5 }}>🏪 {clienteInfo.loja}</span>}<br/>
                  <span style={{ fontSize:11, color:"#86efac" }}>✅ Endereço confere com o cadastro</span></>
                )}
                {clienteInfo.status === "divergente" && (
                  <><strong>{clienteInfo.nome || codigo}</strong>{clienteInfo.loja && <span style={{ marginLeft:6, fontSize:11, background:"rgba(99,102,241,.2)", color:"#a5b4fc", padding:"2px 8px", borderRadius:5 }}>🏪 {clienteInfo.loja}</span>}<br/>
                  <span style={{ fontSize:11 }}>📍 CRM: {clienteInfo.enderecoCRM}</span><br/>
                  <span style={{ fontSize:11, color:"#fcd34d" }}>⚠️ Endereço pode não corresponder ao cadastro</span></>
                )}
                {clienteInfo.status === "nao_encontrado" && <>❌ Cliente não encontrado no CRM — verifique o código</>}
                {clienteInfo.status === "erro_api" && <>⚡ CRM indisponível no momento</>}
              </div>
            )}

            {/* Loja */}
            <div>
              <label style={S.label}>
                Loja
                {!loja && (
                  <span style={{ marginLeft:6, fontSize:10, color:"#fb923c", fontWeight:600 }}>⚠️ Selecione manualmente</span>
                )}
                {loja && clienteInfo?.loja === loja && (
                  <span style={{ marginLeft:6, fontSize:10, color:"#4ade80" }}>✓ Pré-selecionada pelo CRM</span>
                )}
                {loja && clienteInfo?.loja !== loja && (
                  <span style={{ marginLeft:6, fontSize:10, color:"#94a3b8" }}>✓ Selecionada manualmente</span>
                )}
              </label>
              <select
                disabled={!!(clienteInfo?.loja)}
                style={{ ...S.input, appearance:"none", color: loja ? "#e2e8f0" : "#4a6080",
                  borderColor: !loja && clienteInfo ? "rgba(251,146,60,.5)" : undefined,
                  opacity: clienteInfo?.loja ? 0.7 : 1,
                  cursor: clienteInfo?.loja ? "not-allowed" : "pointer" }}
                value={loja} onChange={e=>setLoja(e.target.value)}>
                <option value="" disabled>Selecione uma loja...</option>
                {LOJAS.map(l=><option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Resumo */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                <label style={{ ...S.label, margin:0 }}>Resumo da Visita</label>
                <button onClick={gravando ? pararGravacao : iniciarGravacao} disabled={transcrevendo}
                  style={{ display:"flex", alignItems:"center", gap:5, background: gravando ? "rgba(239,68,68,.15)" : "rgba(14,165,233,.1)", border: gravando ? "1px solid rgba(239,68,68,.4)" : "1px solid rgba(14,165,233,.3)", borderRadius:8, padding:"5px 11px", color: gravando ? "#f87171" : "#38bdf8", fontSize:12, fontWeight:600, cursor: transcrevendo ? "not-allowed" : "pointer", fontFamily:"inherit" }}>
                  {transcrevendo ? <>⏳ Transcrevendo...</> : gravando ? <><span style={{ width:8, height:8, borderRadius:"50%", background:"#f87171", display:"inline-block", animation:"pulse 1s infinite" }} />Parar</> : <>🎤 Gravar</>}
                </button>
              </div>
              {erroAudio && <div style={{ fontSize:11, color:"#f87171", marginBottom:6 }}>⚠️ {erroAudio}</div>}
              <div style={{ position:"relative" }}>
                <textarea style={{ ...S.textarea, paddingBottom:22, opacity: transcrevendo ? 0.6 : 1 }}
                  placeholder={transcrevendo ? "Transcrevendo áudio..." : "Descreva brevemente o que foi feito na visita..."}
                  value={resumo} maxLength={1000}
                  onChange={e=>setResumo(e.target.value)} />
                <div style={{ position:"absolute", bottom:8, right:12, fontSize:10, color: resumo.length > 900 ? "#fb923c" : "#4a6080" }}>
                  {resumo.length}/1000
                </div>
              </div>
            </div>

            {erro && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:9, padding:"9px 13px", color:"#f87171", fontSize:13 }}>⚠️ {erro}</div>}

            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button className="hvr" style={{ ...S.btn("ghost"), flex:1, padding:13 }} onClick={()=>{ setEtapa(1); setErro(""); }} disabled={loading}>← Voltar</button>
              <button className="hvr" style={{ ...S.btn("primary"), flex:2, padding:13 }} onClick={handleConfirm} disabled={loading}>
                {loading ? "📡 Registrando..." : "✅ Confirmar Check-in"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── MAPA ──────────────────────────────────────────────────────────────────────
function MapView({ checkins }) {
  if (!checkins.length) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", flexDirection:"column", gap:8 }}>
      <span style={{ fontSize:36 }}>📍</span><p style={{ color:"#8a9ab5", fontSize:13 }}>Nenhum check-in para exibir</p>
    </div>
  );
  const lats=checkins.map(c=>c.lat), lngs=checkins.map(c=>c.lng);
  const cLat=(Math.min(...lats)+Math.max(...lats))/2, cLng=(Math.min(...lngs)+Math.max(...lngs))/2;
  const url=`https://www.openstreetmap.org/export/embed.html?bbox=${cLng-.05},${cLat-.05},${cLng+.05},${cLat+.05}&layer=mapnik&marker=${cLat},${cLng}`;
  return (
    <div style={{ width:"100%", height:"100%", borderRadius:12, overflow:"hidden", position:"relative" }}>
      <iframe key={url} title="mapa" src={url} style={{ width:"100%", height:"100%", border:"none" }} />
      <div style={{ position:"absolute", top:8, right:8, background:"rgba(10,16,30,.9)", backdropFilter:"blur(8px)", borderRadius:8, padding:"5px 12px", fontSize:12, border:"1px solid rgba(255,255,255,.08)" }}>
        {checkins.length} ponto{checkins.length!==1?"s":""}
      </div>
    </div>
  );
}

// ─── HISTÓRICO ─────────────────────────────────────────────────────────────────
function resumirEndereco(end) {
  if (!end) return "-";
  // Nominatim format: "Street, Number, Neighbourhood, City, Region, State, CEP, Country"
  const parts = end.split(",").map((p) => p.trim());
  const rua = parts[0] || "";
  const numero = parts[1] || "";
  // City is usually 3rd or 4th from end (before state/region/CEP/country)
  const cidade = parts.length >= 4
    ? parts.find((p, i) => i >= 2 && i <= parts.length - 4 && p.length > 2 && !/^\d/.test(p) && !p.includes("Região")) || ""
    : "";
  const ruaNum = numero && /^\d/.test(numero) ? `${rua}, ${numero}` : rua;
  return cidade ? `${ruaNum} — ${cidade}` : ruaNum || end.slice(0, 50);
}

const ENDERECO_STATUS_STYLE = {
  ok:             { color:"#4ade80", icon:"✅", title:"Endereço confere com o CRM" },
  divergente:     { color:"#fb923c", icon:"⚠️", title:"Endereço diverge do CRM" },
  nao_encontrado: { color:"#f87171", icon:"❌", title:"Cliente não encontrado no CRM" },
  nao_verificado: { color:"#64748b", icon:"—",  title:"Não verificado" },
  erro_api:       { color:"#94a3b8", icon:"⚡", title:"CRM indisponível na verificação" },
};

function HistoricoList({ checkins, onDelete, isAdmin, loading }) {
  if (loading) return <div style={{ textAlign:"center", padding:48, color:"#4a6080" }}><div style={{ fontSize:32, marginBottom:12 }}>⏳</div>Carregando...</div>;
  if (!checkins.length) return <div style={{ textAlign:"center", padding:48, color:"#4a6080" }}><div style={{ fontSize:36, marginBottom:12 }}>📋</div>Nenhum check-in encontrado</div>;

  const cols = isAdmin
    ? ["#", "Usuário", "Data/Hora", "Loja", "Cliente", "Endereço", "Resumo", ""]
    : ["#", "Data/Hora", "Loja", "Cliente", "Endereço", "Resumo"];

  const thStyle = { padding:"9px 12px", fontSize:10, fontWeight:700, color:"#4a6080", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap", borderBottom:"1px solid #1a2d4a", textAlign:"left" };
  const tdStyle = { padding:"10px 12px", fontSize:12, color:"#cbd5e1", verticalAlign:"middle", borderBottom:"1px solid #0f1e33" };

  return (
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
                <td style={{ ...tdStyle, maxWidth:220 }}>
                  {c.resumo_visita
                    ? <span style={{ color:"#94a3b8", overflow:"hidden", textOverflow:"ellipsis", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{c.resumo_visita}</span>
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
  );
}

// ─── ADMIN USUÁRIOS ────────────────────────────────────────────────────────────
function AdminUsers({ currentUser }) {
  const [users, setUsers] = useState([]); const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome:"", email:"", senha:"", role:"user" });
  const [erro, setErro] = useState(""); const [ok, setOk] = useState("");
  const fetchUsers = async () => { setLoading(true); try { setUsers(await api("/app_users?order=created_at.asc&select=id,nome,email,role,created_at")); } catch{} setLoading(false); };
  useEffect(()=>{ fetchUsers(); },[]);
  const addUser = async () => {
    if (!form.nome||!form.email||!form.senha) { setErro("Preencha todos os campos."); return; }
    setErro("");
    try {
      await api("/app_users", { method:"POST", body:JSON.stringify(form) });
      setForm({ nome:"", email:"", senha:"", role:"user" });
      setOk("Usuário criado!"); setTimeout(()=>setOk(""),3000); fetchUsers();
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
              <option value="user">Usuário comum</option><option value="admin">Administrador</option>
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

// ─── APP PRINCIPAL ─────────────────────────────────────────────────────────────


// ─── FOLLOW UP MODAL ──────────────────────────────────────────────────────────
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
          />
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

// ─── FOLLOW UP POPUP ──────────────────────────────────────────────────────────
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

// ─── PESQUISA DE CLIENTE ───────────────────────────────────────────────────────
const EMPRESA_LOJA_MAP = {1:"Matriz",2:"Campinas",3:"Palhoça",4:"Tubarão",6:"Ingleses",8:"Rio Tavares",9:"Forquilhinhas"};

function formatCurrency(v) {
  return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
}

function ClienteSearch() {
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [cliente, setCliente] = useState(null);
  const [financeiro, setFinanceiro] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [erro, setErro] = useState("");
  const [abaCliente, setAbaCliente] = useState("cadastro");

  const buscar = async () => {
    if (!codigo.trim()) { setErro("Informe o código do cliente."); return; }
    setErro(""); setBuscando(true); setCliente(null); setFinanceiro(null); setHistorico(null);
    try {
      // Fetch all 3 in parallel
      const hoje = new Date();
      const doisMesesAtras = new Date(hoje); doisMesesAtras.setMonth(doisMesesAtras.getMonth()-2);
      const dataInicial = doisMesesAtras.toISOString().split("T")[0];

      const [resCliente, resFin, resHist] = await Promise.all([
        fetch(`${EDGE_FUNCTION_URL}?clienteId=${encodeURIComponent(codigo.trim())}`),
        fetch(`https://portal.heidermaq.com.br/api/Clientes/FinanceiroEmAberto?clienteId=${encodeURIComponent(codigo.trim())}&registrosPorPagina=100&pagina=1`, {
          headers: { "Authorization": "3dfdlJsW4yM3ltEuhevqCizMnRvkr5Lc9gyT27O4dx+TclfFHZE5n0rH07PrdS+WST6yGI8bc7p26jLWU80ZNQ==", "Accept": "application/json" }
        }),
        fetch(`https://portal.heidermaq.com.br/api/Venda/ListarFaturamento?clienteId=${encodeURIComponent(codigo.trim())}&dataEmissao=${dataInicial}&registrosPorPagina=200&pagina=1`, {
          headers: { "Authorization": "3dfdlJsW4yM3ltEuhevqCizMnRvkr5Lc9gyT27O4dx+TclfFHZE5n0rH07PrdS+WST6yGI8bc7p26jLWU80ZNQ==", "Accept": "application/json" }
        }),
      ]);

      const cData = await resCliente.json();
      if (!cData.nome) { setErro("Cliente não encontrado."); setBuscando(false); return; }
      console.log("🔍 RAW CLIENTE:", JSON.stringify(cData._raw || cData, null, 2));
      setCliente(cData);

      if (resFin.ok) {
        const fData = await resFin.json();
        const itens = Array.isArray(fData) ? fData : (fData.itens || []);
        const agora = new Date();
        const vencidas = itens.filter(p => new Date(p.dataVencimento) < agora);
        const aVencer = itens.filter(p => new Date(p.dataVencimento) >= agora);
        const totalAberto = itens.reduce((s,p) => s + (p.valorParcela||0), 0);
        const totalVencido = vencidas.reduce((s,p) => s + (p.valorParcela||0), 0);
        setFinanceiro({ itens, vencidas, aVencer, totalAberto, totalVencido });
      }

      if (resHist.ok) {
        const hData = await resHist.json();
        const itens = Array.isArray(hData) ? hData : (hData.itens || []);
        // Group by week
        const semanas = {};
        itens.forEach(v => {
          const d = new Date(v.horaEmissao);
          // Get Monday of the week
          const day = d.getDay();
          const monday = new Date(d);
          monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
          monday.setHours(0,0,0,0);
          const key = monday.toISOString();
          if (!semanas[key]) semanas[key] = { inicio: new Date(monday), compras: 0, total: 0, lojas: new Set() };
          if (!v.cancelada) {
            semanas[key].compras++;
            semanas[key].total += v.valorTotal || 0;
            if (v.empresaId && EMPRESA_LOJA_MAP[v.empresaId]) semanas[key].lojas.add(EMPRESA_LOJA_MAP[v.empresaId]);
          }
        });
        const semanasArr = Object.values(semanas)
          .sort((a,b) => b.inicio - a.inicio)
          .map(s => ({
            ...s,
            lojas: Array.from(s.lojas),
            fim: new Date(s.inicio.getTime() + 6*24*60*60*1000)
          }));
        setHistorico(semanasArr);
      }
    } catch(e) { setErro("Erro ao buscar. Tente novamente."); }
    setBuscando(false);
  };

  const fmtDate = d => new Date(d).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});

  const subTabStyle = (id) => ({
    padding:"8px 14px", fontSize:12, fontWeight:600, borderRadius:"8px 8px 0 0",
    border:"none", cursor:"pointer", fontFamily:"inherit",
    background: abaCliente===id ? "#0d1a2e" : "transparent",
    color: abaCliente===id ? "#38bdf8" : "#4a6080",
    borderBottom: abaCliente===id ? "2px solid #38bdf8" : "2px solid transparent",
  });

  return (
    <div className="fade-in" style={{ maxWidth:600, margin:"0 auto" }}>
      {/* Search bar */}
      <div style={{ display:"flex", gap:10, marginBottom:24 }}>
        <input style={{ ...S.input, flex:1 }} placeholder="Código do cliente (ex: 549)"
          value={codigo} onChange={e=>{ setCodigo(e.target.value); setErro(""); }}
          onKeyDown={e=>e.key==="Enter"&&buscar()} />
        <button className="hvr" style={{ ...S.btn("primary"), padding:"0 20px", whiteSpace:"nowrap" }}
          onClick={buscar} disabled={buscando}>
          {buscando ? "🔍 Buscando..." : "🔍 Buscar"}
        </button>
      </div>
      {erro && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:10, padding:"10px 14px", color:"#f87171", fontSize:13, marginBottom:16 }}>⚠️ {erro}</div>}

      {/* Results */}
      {cliente && (
        <div>
          {/* Client name header */}
          <div style={{ background:"linear-gradient(135deg,rgba(14,165,233,.1),rgba(99,102,241,.1))", border:"1px solid rgba(14,165,233,.2)", borderRadius:14, padding:"16px 20px", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:`hsl(${(cliente.nome||"").charCodeAt(0)*7%360},55%,30%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:"#fff", flexShrink:0 }}>
              {(cliente.nome||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:17 }}>{cliente.nome}</div>
              <div style={{ fontSize:12, color:"#4a6080", marginTop:3 }}>Código: {codigo} {cliente.loja && <span style={{ ...S.tag("purple"), fontSize:11, marginLeft:6 }}>🏪 {cliente.loja}</span>}</div>
            </div>
          </div>

          {/* Sub tabs */}
          <div style={{ display:"flex", gap:2, borderBottom:"1px solid #1a2d4a", marginBottom:0 }}>
            <button style={subTabStyle("cadastro")} onClick={()=>setAbaCliente("cadastro")}>📋 Cadastro</button>
            <button style={subTabStyle("financeiro")} onClick={()=>setAbaCliente("financeiro")}>💰 Financeiro</button>
            <button style={subTabStyle("historico")} onClick={()=>setAbaCliente("historico")}>📦 Histórico</button>
          </div>

          <div style={{ background:"#0a1628", border:"1px solid #1a2d4a", borderTop:"none", borderRadius:"0 0 12px 12px", padding:20 }}>

            {/* ABA CADASTRO */}
            {abaCliente === "cadastro" && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {(() => {
                  const raw = cliente._raw || {};
                  const tabela = cliente.tabelaVenda
                    || raw.tabelaPreco?.nome || raw.tabela?.nome || raw.tabelaVenda?.nome
                    || raw.tabelaPrecoNome || raw.tabelaVendaNome || raw.tabela
                    || (typeof raw.tabelaPreco === "string" ? raw.tabelaPreco : null)
                    || null;
                  const fields = [
                    ["👤 Nome",                  cliente.nome,          false],
                    ["🪪 CPF/CNPJ",              cliente.cpfCnpj,       false],
                    ["📍 Endereço",              cliente.endereco?.enderecoCompleto, false],
                    ["📞 Telefone",              [cliente.telefone, cliente.celular].filter(Boolean).join(" / ") || null, false],
                    ["📧 E-mail",                cliente.email,         true],
                    ["📊 Tabela de Venda",       tabela,                false],
                    ["💳 Forma de Pagamento",    cliente.formaPagamento, false],
                    ["📅 Condição de Pagamento", cliente.condicaoPagamento, false],
                    ["👔 Vendedor",              cliente.vendedor,      false],
                    ["🗺️ Rota",                 cliente.rota,          false],
                    ["🗓️ Última Compra",         cliente.ultimaCompra ? new Date(cliente.ultimaCompra).toLocaleDateString("pt-BR") : null, false],
                  ];
                  return fields.map(([label, value, isEmail]) => {
                    if (!value) return null;
                    return (
                      <div key={label} style={{ display:"flex", gap:10, alignItems:"flex-start", paddingBottom:12, borderBottom:"1px solid #0f1e33" }}>
                        <div style={{ fontSize:12, color:"#4a6080", minWidth:160, flexShrink:0 }}>{label}</div>
                        <div style={{ fontSize:13, color:"#e2e8f0", fontWeight:500, lineHeight:1.5, wordBreak: isEmail ? "break-all" : "normal" }}>{value}</div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}

            {/* ABA FINANCEIRO */}
            {abaCliente === "financeiro" && (
              <div>
                {!financeiro ? (
                  <div style={{ textAlign:"center", padding:32, color:"#4a6080" }}>Sem dados financeiros disponíveis</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    {/* Totals */}
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {[
                        { label:"Total em Aberto", value: formatCurrency(financeiro.totalAberto), color:"#38bdf8" },
                        { label:"Total Vencido",   value: formatCurrency(financeiro.totalVencido), color:"#f87171" },
                        { label:"A Vencer",        value: formatCurrency(financeiro.totalAberto - financeiro.totalVencido), color:"#4ade80" },
                      ].map(c => (
                        <div key={c.label} style={{ background:"rgba(255,255,255,.03)", border:"1px solid #1a2d4a", borderRadius:10, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ fontSize:13, color:"#94a3b8" }}>{c.label}</div>
                          <div style={{ fontSize:16, fontWeight:700, color:c.color }}>{c.value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Parcelas vencidas */}
                    {financeiro.vencidas.length > 0 && (
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:"#f87171", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>⚠️ Vencidas ({financeiro.vencidas.length})</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {financeiro.vencidas.map((p,i) => (
                            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(239,68,68,.05)", border:"1px solid rgba(239,68,68,.15)", borderRadius:8, padding:"9px 13px" }}>
                              <div style={{ fontSize:12, color:"#f87171" }}>Venc. {fmtDate(p.dataVencimento)}</div>
                              <div style={{ fontSize:13, fontWeight:600, color:"#f87171" }}>{formatCurrency(p.valorParcela)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Parcelas a vencer */}
                    {financeiro.aVencer.length > 0 && (
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:"#4ade80", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>✅ A Vencer ({financeiro.aVencer.length})</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {financeiro.aVencer.map((p,i) => (
                            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(34,197,94,.05)", border:"1px solid rgba(34,197,94,.15)", borderRadius:8, padding:"9px 13px" }}>
                              <div style={{ fontSize:12, color:"#4ade80" }}>Venc. {fmtDate(p.dataVencimento)}</div>
                              <div style={{ fontSize:13, fontWeight:600, color:"#4ade80" }}>{formatCurrency(p.valorParcela)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {financeiro.itens.length === 0 && (
                      <div style={{ textAlign:"center", padding:24, color:"#4a6080", fontSize:13 }}>✅ Nenhum débito em aberto</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ABA HISTÓRICO */}
            {abaCliente === "historico" && (
              <div>
                {!historico || historico.length === 0 ? (
                  <div style={{ textAlign:"center", padding:32, color:"#4a6080" }}>Nenhuma compra nos últimos 2 meses</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <div style={{ fontSize:11, color:"#4a6080", marginBottom:4 }}>Últimos 2 meses — compras não canceladas</div>
                    {historico.map((s,i) => (
                      <div key={i} style={{ background:"rgba(255,255,255,.03)", border:"1px solid #1a2d4a", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>
                            {fmtDate(s.inicio)} – {fmtDate(s.fim)}
                          </div>
                          {s.lojas.length > 0 && (
                            <div style={{ display:"flex", gap:4, marginTop:5, flexWrap:"wrap" }}>
                              {s.lojas.map(l => <span key={l} style={{ ...S.tag("purple"), fontSize:10 }}>🏪 {l}</span>)}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontSize:15, fontWeight:700, color:"#38bdf8" }}>{formatCurrency(s.total)}</div>
                          <div style={{ fontSize:11, color:"#4a6080", marginTop:2 }}>{s.compras} {s.compras===1?"compra":"compras"}</div>
                        </div>
                      </div>
                    ))}
                    {/* Total */}
                    <div style={{ borderTop:"1px solid #1a2d4a", paddingTop:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontSize:12, color:"#4a6080" }}>Total no período</div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#4ade80" }}>
                        {formatCurrency(historico.reduce((s,w)=>s+w.total,0))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {!cliente && !buscando && !erro && (
        <div style={{ textAlign:"center", padding:48, color:"#4a6080" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Pesquisa de Cliente</div>
          <div style={{ fontSize:13 }}>Digite o código do cliente para ver seus dados, financeiro e histórico de compras</div>
        </div>
      )}
    </div>
  );
}


// ─── FOLLOW UPS TAB ───────────────────────────────────────────────────────────
function FollowUpsTab({ user, isAdmin }) {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState("pendentes");
  const [filtroDe, setFiltroDe] = useState("");
  const [filtroAte, setFiltroAte] = useState("");

  const fetchFollowups = async () => {
    setLoading(true);
    try {
      const path = isAdmin
        ? `/followups?order=data_followup.asc`
        : `/followups?usuario=eq.${encodeURIComponent(user.nome)}&order=data_followup.asc`;
      const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
        headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
      });
      if (res.ok) setFollowups(await res.json());
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
    return true;
  });

  const labelStyle = { fontSize:11, fontWeight:700, color:"#4a6080", letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:6 };
  const thStyle = { padding:"9px 12px", fontSize:10, fontWeight:700, color:"#4a6080", textTransform:"uppercase", letterSpacing:"0.08em", whiteSpace:"nowrap", borderBottom:"1px solid #1a2d4a", textAlign:"left" };
  const tdStyle = { padding:"10px 12px", fontSize:12, color:"#cbd5e1", verticalAlign:"middle", borderBottom:"1px solid #0f1e33" };

  const statusBadge = (f) => {
    if (f.concluido) return <span style={{ fontSize:10, background:"rgba(34,197,94,.15)", color:"#4ade80", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap" }}>✅ Concluído</span>;
    if (f.data_followup < hoje) return <span style={{ fontSize:10, background:"rgba(239,68,68,.15)", color:"#f87171", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap" }}>⚠️ Atrasado</span>;
    if (f.data_followup === hoje) return <span style={{ fontSize:10, background:"rgba(251,146,60,.15)", color:"#fb923c", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap" }}>🔔 Hoje</span>;
    return <span style={{ fontSize:10, background:"rgba(56,189,248,.1)", color:"#38bdf8", padding:"2px 7px", borderRadius:5, whiteSpace:"nowrap" }}>🕐 Pendente</span>;
  };

  return (
    <div className="fade-in">
      {/* Filters */}
      <div style={{ ...S.card, padding:"12px 14px", marginBottom:16 }}>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"flex-end" }}>
          <div style={{ flex:"1 1 100px", minWidth:90 }}>
            <label style={labelStyle}>Status</label>
            <select style={{ ...S.input, appearance:"none", padding:"8px 10px", fontSize:12 }} value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="pendentes">Pendentes</option>
              <option value="concluidos">Concluídos</option>
            </select>
          </div>
          <div style={{ flex:"1 1 90px", minWidth:80 }}>
            <label style={labelStyle}>De</label>
            <input type="date" style={{ ...S.input, padding:"8px 10px", fontSize:12 }} value={filtroDe} onChange={e=>setFiltroDe(e.target.value)} />
          </div>
          <div style={{ flex:"1 1 90px", minWidth:80 }}>
            <label style={labelStyle}>Até</label>
            <input type="date" style={{ ...S.input, padding:"8px 10px", fontSize:12 }} value={filtroAte} onChange={e=>setFiltroAte(e.target.value)} />
          </div>
          <button onClick={()=>{ setFiltroStatus("pendentes"); setFiltroDe(""); setFiltroAte(""); }}
            style={{ padding:"8px 12px", background:"rgba(255,255,255,.04)", border:"1px solid #1e3050", borderRadius:8, color:"#94a3b8", fontSize:12, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>Limpar</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:"#4a6080" }}>Carregando...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:"center", padding:40, color:"#4a6080" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔔</div>
          <div>Nenhum follow up encontrado</div>
        </div>
      ) : isAdmin ? (
        /* ── ADMIN: table layout ── */
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead>
              <tr style={{ background:"rgba(255,255,255,.02)" }}>
                <th style={thStyle}>Usuário</th>
                <th style={thStyle}>Data</th>
                <th style={thStyle}>Cliente</th>
                <th style={thStyle}>Observação</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(f => (
                <tr key={f.id} className="hvr-row">
                  <td style={tdStyle}>{f.usuario}</td>
                  <td style={{ ...tdStyle, whiteSpace:"nowrap" }}>{new Date(f.data_followup + "T12:00:00").toLocaleDateString("pt-BR")}</td>
                  <td style={{ ...tdStyle, whiteSpace:"nowrap" }}>
                    {f.codigo_cliente ? <><span style={{ color:"#fb923c", fontWeight:600 }}>{f.codigo_cliente}</span>{f.nome_cliente ? <span style={{ color:"#94a3b8" }}> · {f.nome_cliente}</span> : ""}</> : "—"}
                  </td>
                  <td style={{ ...tdStyle, maxWidth:280 }}>{f.observacao}</td>
                  <td style={tdStyle}>{statusBadge(f)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* ── USER: card layout with conclude button ── */
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
                <div style={{ fontSize:13, color:"#e2e8f0", lineHeight:1.5, marginBottom:6 }}>{f.observacao}</div>
                <div style={{ fontSize:11, color:"#4a6080", marginBottom: f.concluido ? 0 : 10 }}>
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

export default function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("checkpoint_user"));
      // On desktop, only restore session if user is admin
      if (stored && !isMobile() && stored.role !== "admin") {
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

  // Follow Up
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [lastCheckin, setLastCheckin] = useState(null);
  const [followupPopup, setFollowupPopup] = useState([]);

  const isAdmin = user?.role === "admin";

  const handleLogin = (u) => { localStorage.setItem("checkpoint_user", JSON.stringify(u)); setUser(u); };
  const handleLogout = () => {
    localStorage.removeItem("checkpoint_user");
    setUser(null);
    setTab("checkin");
  };

  const fetchCheckins = useCallback(async () => {
    if (!user) return;
    try {
      const path = isAdmin
        ? "/checkins?order=timestamp.desc&limit=500"
        : `/checkins?usuario=eq.${encodeURIComponent(user.nome)}&order=timestamp.desc&limit=200`;
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

  // Check for due follow ups on load (users only, not admin)
  useEffect(() => {
    if (!user || isAdmin) return;
    const checkFollowUps = async () => {
      try {
        const hoje = new Date().toISOString().split("T")[0];
        const path = `/followups?concluido=eq.false&data_followup=lte.${hoje}&usuario=eq.${encodeURIComponent(user.nome)}&order=data_followup.asc`;
        const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
          headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) setFollowupPopup(data);
        }
      } catch {}
    };
    checkFollowUps();
  }, [user, isAdmin]);

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
  const confirmarCheckIn = async ({ codigo_cliente, nome_cliente, resumo_visita, loja, endereco_status }) => {
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
      const payload = { usuario: user.nome, endereco: pendingPos.endereco, lat: pendingPos.lat, lng: pendingPos.lng, codigo_cliente, nome_cliente, resumo_visita: resumo_visita_truncado, loja, endereco_status };

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

  // Aplicar filtros
  const applyFilters = (list) => {
    let r = list;
    if (isAdmin && filterUser !== "Todos") r = r.filter(c => c.usuario === filterUser);
    if (filterDe)  r = r.filter(c => c.timestamp.slice(0,10) >= filterDe);
    if (filterAte) r = r.filter(c => c.timestamp.slice(0,10) <= filterAte);
    if (filterLoja !== "Todas") r = r.filter(c => c.loja === filterLoja);
    if (filterCliente.trim()) r = r.filter(c => (c.codigo_cliente||"").toLowerCase().includes(filterCliente.trim().toLowerCase()));
    return r;
  };

  const filtered = applyFilters(checkins);
  const totalToday = checkins.filter(c=>new Date(c.timestamp).toDateString()===new Date().toDateString()).length;

  const tabs = [
    ...(!isAdmin ? [{ id:"checkin", label:"Check-in", icon:"✅" }] : []),
    { id:"historico",  label:"Histórico",  icon:"📋" },
    { id:"clientes",   label:"Clientes",   icon:"🔍" },
    { id:"followups",  label:"Follow Ups", icon:"🔔" },
    ...(isAdmin ? [
      { id:"mapa",     label:"Mapa",       icon:"🗺️" },
      { id:"usuarios", label:"Usuários",   icon:"👥" },
    ] : []),
  ];
  useEffect(() => { if (isAdmin && tab === "checkin") setTab("historico"); }, [isAdmin]);

  const isMob = isMobile();
  if (!isMob && user?.role !== "admin") return <MobileOnly onAdminLogin={handleLogin} />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div style={S.page}>
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
      `}</style>

      {showModal && <CheckInModal user={user} onConfirm={confirmarCheckIn} onCancel={()=>{setShowModal(false);setPendingPos(null);}} loading={loading} gpsEndereco={pendingPos?.endereco||""} gpsLat={pendingPos?.lat} gpsLng={pendingPos?.lng} />}
      {showFollowUp && <FollowUpModal user={user} checkin={lastCheckin} onSave={()=>{ setShowFollowUp(false); setStatus({ type:"success", msg:"🔔 Follow up agendado!" }); setTimeout(()=>setStatus(null),3000); }} onSkip={()=>setShowFollowUp(false)} />}
      {followupPopup.length > 0 && <FollowUpPopup followups={followupPopup} onConcluir={concluirFollowUp} onFechar={()=>setFollowupPopup([])} />}

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

        {/* CHECK-IN */}
        {tab==="checkin" && (
          <div className="fade-in" style={{ maxWidth:440, margin:"0 auto" }}>
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
            <button className="hvr" style={{ ...S.btn("primary"), width:"100%", padding:15, fontSize:15 }} onClick={iniciarCheckIn} disabled={loading}>
              {loading?"📡 Obtendo localização...":"📍 Registrar Check-in"}
            </button>
            {status && (
              <div className="fade-in" style={{ marginTop:14, padding:"12px 15px", borderRadius:10,
                background:status.type==="success"?"rgba(34,197,94,.1)":"rgba(239,68,68,.1)",
                border:`1px solid ${status.type==="success"?"rgba(34,197,94,.25)":"rgba(239,68,68,.25)"}`,
                color:status.type==="success"?"#4ade80":"#f87171", fontSize:13, fontWeight:500, lineHeight:1.5 }}>
                {status.msg}
              </div>
            )}
            {checkins.length>0 && (
              <div style={{ marginTop:28 }}>
                <div style={{ ...S.label, marginBottom:10 }}>Últimos check-ins</div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {checkins.slice(0,5).map(c => (
                    <div key={c.id} style={{ background:"#0a1628", border:"1px solid #1a2d4a", borderRadius:12, padding:"11px 14px", display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:11, color:"#38bdf8", marginBottom:4 }}>{formatDate(c.timestamp)}</div>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {c.loja && <span style={S.tag("purple")}>🏪 {c.loja}</span>}
                          {c.codigo_cliente && <span style={S.tag("orange")}>🏷️ {c.codigo_cliente}{c.nome_cliente ? ` · ${c.nome_cliente}` : ""}</span>}
                        </div>
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
            <div style={{ ...S.card, padding:16, marginBottom:18, display:"flex", flexWrap:"wrap", gap:12, alignItems:"flex-end" }}>
              {isAdmin && (
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
                {isAdmin && <button className="hvr" style={{ ...S.btn("success"), padding:"11px 15px", fontSize:12 }} onClick={()=>exportCSV(filtered)} disabled={!filtered.length}>⬇️ CSV</button>}
              </div>
            </div>

            {/* Totalizador */}
            <div style={{ display:"flex", gap:12, marginBottom:16, flexWrap:"wrap" }}>
              <div style={{ ...S.card, padding:"10px 18px", display:"flex", alignItems:"center", gap:10, flex:"1 1 auto" }}>
                <div style={{ fontSize:22, fontFamily:"'Space Mono',monospace", fontWeight:700, color:"#38bdf8" }}>{filtered.length}</div>
                <div>
                  <div style={{ fontSize:12, fontWeight:600 }}>Check-ins no período</div>
                  <div style={{ fontSize:11, color:"#4a6080", marginTop:1 }}>
                    {filterDe===filterAte ? filterDe : `${filterDe} → ${filterAte}`}
                    {isAdmin && filterUser!=="Todos" ? ` · ${filterUser}` : ""}
                  </div>
                </div>
              </div>
              {isAdmin && (
                <div style={{ ...S.card, padding:"10px 18px", display:"flex", alignItems:"center", gap:10, flex:"1 1 auto" }}>
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

            <HistoricoList checkins={filtered} onDelete={handleDeleteCheckin} isAdmin={isAdmin} loading={fetching} />
          </div>
        )}

        {/* MAPA — reflete filtros */}
        {tab==="mapa" && isAdmin && (
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
          <div className="fade-in"><ClienteSearch /></div>
        )}

        {/* FOLLOW UPS */}
        {tab==="followups" && (
          <div className="fade-in"><FollowUpsTab user={user} isAdmin={isAdmin} /></div>
        )}
      </div>
    </div>
  );
}
