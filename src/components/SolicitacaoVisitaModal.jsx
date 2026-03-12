import React, { useState } from "react";
import S from "../utils/styles";
import { api } from "../utils/helpers";

function SolicitacaoVisitaModal({ clienteInfo, usuarios, user, onClose, onSalvo }) {
  const promotores = (usuarios || []).filter(u => u.role === "user");
  const [selectedPromotor, setSelectedPromotor] = useState(promotores[0]?.email || "");
  const [instrucoes, setInstrucoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const handleSalvar = async () => {
    if (!selectedPromotor) { setErro("Selecione um promotor."); return; }
    if (!instrucoes.trim()) { setErro("Informe as instruções da visita."); return; }
    setErro(""); setSalvando(true);
    try {
      const payload = {
        criado_por: user?.email,
        promotor: selectedPromotor,
        codigo_cliente: clienteInfo?.codigo,
        nome_cliente: clienteInfo?.nome,
        loja: clienteInfo?.loja,
        instrucoes: instrucoes.trim(),
        status: "pendente",
        visto: false,
      };
      await api("/solicitacoes_visita", { method: "POST", body: JSON.stringify(payload) });
      onSalvo();
      onClose();
    } catch (e) {
      setErro("Erro ao salvar solicitação. Tente novamente.");
    }
    setSalvando(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: 20, overflowY: "auto" }}>
      <div className="fade-in" style={{ ...S.card, background: "#0d1a2e", width: "100%", maxWidth: 460, padding: 28, borderRadius: 18, margin: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📋</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Solicitar Visita</div>
            <div style={{ fontSize: 12, color: "#4a6080", marginTop: 2 }}>Atribua uma visita a um promotor</div>
          </div>
          <button className="hvr" style={{ ...S.btn("ghost"), padding: "6px 10px", fontSize: 16 }} onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Cliente — read-only */}
          <div>
            <label style={S.label}>Cliente</label>
            <div style={{ ...S.input, color: "#94a3b8", cursor: "default", opacity: 0.8 }}>
              {clienteInfo?.nome || "—"}
              {clienteInfo?.loja && <span style={{ ...S.tag("purple"), marginLeft: 10, fontSize: 11 }}>🏪 {clienteInfo.loja}</span>}
            </div>
          </div>

          {/* Código — read-only */}
          <div>
            <label style={S.label}>Código</label>
            <div style={{ ...S.input, color: "#94a3b8", cursor: "default", opacity: 0.8 }}>{clienteInfo?.codigo || "—"}</div>
          </div>

          {/* Promotor */}
          <div>
            <label style={S.label}>Promotor</label>
            {promotores.length === 0 ? (
              <div style={{ color: "#f87171", fontSize: 13 }}>Nenhum promotor disponível.</div>
            ) : (
              <select
                style={{ ...S.input, appearance: "none" }}
                value={selectedPromotor}
                onChange={e => setSelectedPromotor(e.target.value)}
              >
                {promotores.map(u => (
                  <option key={u.email} value={u.email}>{u.nome} — {u.email}</option>
                ))}
              </select>
            )}
          </div>

          {/* Instruções */}
          <div>
            <label style={S.label}>Instruções <span style={{ color: "#f87171" }}>*</span></label>
            <textarea
              style={{ ...S.textarea, minHeight: 110 }}
              placeholder="Descreva o objetivo e instruções da visita..."
              value={instrucoes}
              onChange={e => { setInstrucoes(e.target.value); setErro(""); }}
            ></textarea>
          </div>

          {erro && (
            <div style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.25)", borderRadius: 9, padding: "9px 13px", color: "#f87171", fontSize: 13 }}>
              ⚠️ {erro}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="hvr" style={{ ...S.btn("ghost"), flex: 1, padding: 13 }} onClick={onClose} disabled={salvando}>Cancelar</button>
            <button className="hvr" style={{ ...S.btn("primary"), flex: 2, padding: 13 }} onClick={handleSalvar} disabled={salvando || promotores.length === 0}>
              {salvando ? "💾 Salvando..." : "📋 Solicitar Visita"}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

export default SolicitacaoVisitaModal;
