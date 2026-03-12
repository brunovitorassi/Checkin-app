import React, { useState } from "react";
import S from "../utils/styles";
import { api } from "../utils/helpers";

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

export default LoginScreen;
