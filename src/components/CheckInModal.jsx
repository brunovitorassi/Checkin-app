import React, { useState, useRef } from "react";
import S from "../utils/styles";
import { LOJAS, MOTIVOS_VISITA, TRANSCRIPTION_URL, EDGE_FUNCTION_URL, SUPABASE_URL, SUPABASE_KEY } from "../utils/constants";

function CheckInModal({ user, onConfirm, onCancel, loading, gpsEndereco, gpsLat, gpsLng }) {
  const [etapa, setEtapa] = useState(1); // 1 = código, 2 = loja + resumo
  const [codigo, setCodigo] = useState("");
  const [resumo, setResumo] = useState("");
  const [loja, setLoja] = useState("");
  const [erro, setErro] = useState("");
  const [validando, setValidando] = useState(false);
  const [clienteInfo, setClienteInfo] = useState(null);
  const [motivos, setMotivos] = useState([]);
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [erroAudio, setErroAudio] = useState("");
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [uploadandoFoto, setUploadandoFoto] = useState(false);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const fotoInputRef = useRef(null);

  const toggleMotivo = (m) => setMotivos(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

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
      mr.start(100);
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

  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
    setErro("");
  };

  const handleConfirm = async () => {
    if (!loja) { setErro("Selecione a loja."); return; }
    if (motivos.length === 0) { setErro("Selecione ao menos um motivo da visita."); return; }
    if (!resumo.trim()) { setErro("Informe o resumo da visita."); return; }
    if (!fotoFile) { setErro("📷 Foto da fachada é obrigatória."); return; }

    setErro("");
    setUploadandoFoto(true);

    try {
      const timestamp = Date.now();
      const usuario = String(user?.id || user?.email || "unknown").replace(/[^a-zA-Z0-9_-]/g, "_");
      const filePath = `${usuario}/${timestamp}.jpg`;

      const arrayBuffer = await fotoFile.arrayBuffer();

      const uploadRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/fotos-checkin/${filePath}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
            "apikey": SUPABASE_KEY,
          },
          body: arrayBuffer,
        }
      );

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Upload falhou (${uploadRes.status}): ${errText}`);
      }

      const fotoUrl = `${SUPABASE_URL}/storage/v1/object/public/fotos-checkin/${filePath}`;

      onConfirm({
        codigo_cliente: codigo.trim(),
        nome_cliente: clienteInfo?.nome || null,
        resumo_visita: resumo.trim(),
        motivos_visita: motivos.join(", "),
        loja,
        endereco_status: clienteInfo?.status ?? "nao_verificado",
        foto_url: fotoUrl,
      });
    } catch(err) {
      setErro(err.message || "Falha ao enviar foto. Tente novamente.");
    }

    setUploadandoFoto(false);
  };

  const statusColors = {
    ok:            { bg:"rgba(34,197,94,.08)",   border:"rgba(34,197,94,.25)",   color:"#4ade80" },
    divergente:    { bg:"rgba(251,146,60,.08)",  border:"rgba(251,146,60,.25)",  color:"#fb923c" },
    nao_encontrado:{ bg:"rgba(239,68,68,.08)",   border:"rgba(239,68,68,.25)",   color:"#f87171" },
    erro_api:      { bg:"rgba(100,116,139,.08)", border:"rgba(100,116,139,.25)", color:"#94a3b8" },
    nao_verificado:{ bg:"rgba(100,116,139,.06)", border:"rgba(100,116,139,.2)",  color:"#94a3b8" },
  };
  const sc = clienteInfo ? (statusColors[clienteInfo.status] || statusColors["nao_verificado"]) : null;

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

        {/* ETAPA 2 — Loja + Foto + Resumo */}
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

            {/* Motivo da Visita */}
            <div>
              <label style={S.label}>Motivo da Visita</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                {MOTIVOS_VISITA.map(m => {
                  const sel = motivos.includes(m);
                  return (
                    <button key={m} onClick={()=>toggleMotivo(m)}
                      style={{ padding:"7px 13px", borderRadius:20, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all .15s",
                        background: sel ? "rgba(14,165,233,.2)" : "rgba(255,255,255,.04)",
                        border: sel ? "1px solid rgba(14,165,233,.5)" : "1px solid #1e3050",
                        color: sel ? "#38bdf8" : "#64748b" }}>
                      {sel ? "✓ " : ""}{m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Foto da Fachada */}
            <div>
              <label style={S.label}>Foto da Fachada</label>
              <input
                ref={fotoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display:"none" }}
                onChange={handleFotoChange}
              />
              {!fotoPreview ? (
                <button
                  className="hvr"
                  type="button"
                  style={{ ...S.btn("ghost"), width:"100%", padding:13, border:"1px dashed #1e3050" }}
                  onClick={() => fotoInputRef.current?.click()}
                >
                  📷 Tirar Foto da Fachada
                </button>
              ) : (
                <div>
                  <img
                    src={fotoPreview}
                    alt="Fachada"
                    style={{ width:"100%", maxHeight:200, objectFit:"cover", borderRadius:12, display:"block" }}
                  />
                  <button
                    className="hvr"
                    type="button"
                    style={{ ...S.btn("ghost"), width:"100%", padding:10, marginTop:8, fontSize:12 }}
                    onClick={() => fotoInputRef.current?.click()}
                  >
                    🔄 Tirar outra
                  </button>
                </div>
              )}
            </div>

            {/* Resumo */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:7 }}>
                <label style={{ ...S.label, margin:0 }}>Resumo da Visita</label>
                <button onClick={gravando ? pararGravacao : iniciarGravacao} disabled={transcrevendo}
                  style={{ display:"flex", alignItems:"center", gap:5, background: gravando ? "rgba(239,68,68,.15)" : "rgba(14,165,233,.1)", border: gravando ? "1px solid rgba(239,68,68,.4)" : "1px solid rgba(14,165,233,.3)", borderRadius:8, padding:"5px 11px", color: gravando ? "#f87171" : "#38bdf8", fontSize:12, fontWeight:600, cursor: transcrevendo ? "not-allowed" : "pointer", fontFamily:"inherit" }}>
                  {transcrevendo ? <>⏳ Transcrevendo...</> : gravando ? <><span style={{ width:8, height:8, borderRadius:"50%", background:"#f87171", display:"inline-block", animation:"pulse 1s infinite" }}></span>Parar</> : <>🎤 Gravar</>}
                </button>
              </div>
              {erroAudio && <div style={{ fontSize:11, color:"#f87171", marginBottom:6 }}>⚠️ {erroAudio}</div>}
              <div style={{ position:"relative" }}>
                <textarea style={{ ...S.textarea, paddingBottom:22, opacity: transcrevendo ? 0.6 : 1 }}
                  placeholder={transcrevendo ? "Transcrevendo áudio..." : "Descreva brevemente o que foi feito na visita..."}
                  value={resumo} maxLength={1000}
                  onChange={e=>setResumo(e.target.value)}></textarea>
                <div style={{ position:"absolute", bottom:8, right:12, fontSize:10, color: resumo.length > 900 ? "#fb923c" : "#4a6080" }}>
                  {resumo.length}/1000
                </div>
              </div>
            </div>

            {erro && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:9, padding:"9px 13px", color:"#f87171", fontSize:13 }}>⚠️ {erro}</div>}

            <div style={{ display:"flex", gap:10, marginTop:4 }}>
              <button className="hvr" style={{ ...S.btn("ghost"), flex:1, padding:13 }} onClick={()=>{ setEtapa(1); setErro(""); }} disabled={loading || uploadandoFoto}>← Voltar</button>
              <button className="hvr" style={{ ...S.btn("primary"), flex:2, padding:13 }} onClick={handleConfirm} disabled={loading || uploadandoFoto}>
                {uploadandoFoto ? "📤 Enviando foto..." : loading ? "📡 Registrando..." : "✅ Confirmar Check-in"}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default CheckInModal;
