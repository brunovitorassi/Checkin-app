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
      const data = await api(`/app_users?email=eq.${encodeURIComponent(email)}&senha=eq.${encodeURIComponent(senha)}&select=*`);
      if (!data.length) { setErro("E-mail ou senha incorretos."); setLoading(false); return; }
      onLogin(data[0]);
    } catch { setErro("Erro de conexão. Tente novamente."); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'DM Sans','Segoe UI',sans-serif", ...(window.innerWidth >= 768 ? { backgroundImage:"url('/bg-login.png')", backgroundSize:"cover", backgroundPosition:"center", backgroundRepeat:"no-repeat" } : { background:"#0a1628" }) }}>
      {window.innerWidth >= 768 && <div style={{ position:"fixed", inset:0, background:"rgba(10,22,40,0.55)", zIndex:0 }} />}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input:focus,select:focus,textarea:focus{border-color:#c0392b!important;outline:none}
        .hvr:hover{opacity:.85;transform:translateY(-1px)} .hvr:active{transform:scale(.97)}
        .fade-in{animation:fi .4s ease} @keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <div className="fade-in" style={{ width:"100%", maxWidth:380, position:"relative", zIndex:1 }}>
        <div style={{ ...S.card, padding:32, display:"flex", flexDirection:"column", gap:18 }}>
          <div style={{ textAlign:"center", marginBottom:4 }}>
            <img src="/logo.png" alt="Heidermaq" width={180} style={{ display:"block", margin:"0 auto" }} onError={e=>{ e.target.style.display="none"; }} />
          </div>
          <div><label style={S.label}>E-mail</label><input style={S.input} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
          <div><label style={S.label}>Senha</label><input style={S.input} type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleLogin()} /></div>
          {erro && <div style={{ ...S.tag("red"), padding:"10px 14px", borderRadius:10, fontSize:13 }}>⚠️ {erro}</div>}
          <button className="hvr" style={{ ...S.btn("primary"), padding:14, fontSize:15, marginTop:4, background:"#c0392b", border:"none" }} onClick={handleLogin} disabled={loading}>{loading?"Entrando...":"Entrar →"}</button>
        </div>
      </div>
    </div>
  );
}

export default LoginScreen;
