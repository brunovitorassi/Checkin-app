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

export default S;
