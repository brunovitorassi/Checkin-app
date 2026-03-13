import React, { useState } from "react";
import { api } from "../utils/helpers";

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
      const data = await api(`/app_users?email=eq.${encodeURIComponent(email)}&senha=eq.${encodeURIComponent(senha)}&select=*`);
      if (!data.length) { setErro("E-mail ou senha incorretos."); setLoading(false); return; }
      if (!["admin","gerente","gerente_loja"].includes(data[0].role)) { setErro("Acesso restrito a administradores e gerentes."); setLoading(false); return; }
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

export default MobileOnly;
