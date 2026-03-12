import React, { useState, useEffect } from "react";
import S from "../utils/styles";
import { api } from "../utils/helpers";

function SolicitacaoPopup({ user, onClose }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [marcando, setMarcando] = useState(false);

  useEffect(() => {
    if (user?.role !== "user" || !user?.email) { setCarregando(false); return; }
    const fetchNaoVistas = async () => {
      try {
        const data = await api(`/solicitacoes_visita?promotor=eq.${encodeURIComponent(user.email)}&visto=eq.false`);
        setSolicitacoes(Array.isArray(data) ? data : []);
      } catch {
        setSolicitacoes([]);
      }
      setCarregando(false);
    };
    fetchNaoVistas();
  }, [user]);

  if (user?.role !== "user") return null;
  if (carregando) return null;
  if (solicitacoes.length === 0) return null;

  const handleEntendido = async () => {
    setMarcando(true);
    try {
      await api(
        `/solicitacoes_visita?promotor=eq.${encodeURIComponent(user.email)}&visto=eq.false`,
        {
          method: "PATCH",
          body: JSON.stringify({ visto: true }),
          headers: { "Prefer": "return=minimal" },
        }
      );
    } catch {
      /* silent */
    }
    setMarcando(false);
    setSolicitacoes([]);
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.78)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 3000, padding: 20, overflowY: "auto" }}>
      <div className="fade-in" style={{ ...S.card, background: "#0d1a2e", width: "100%", maxWidth: 460, padding: 28, borderRadius: 18, margin: "auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#0ea5e9,#6366f1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📋</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Novas Solicitações de Visita</div>
            <div style={{ fontSize: 12, color: "#4a6080", marginTop: 2 }}>
              {solicitacoes.length} {solicitacoes.length === 1 ? "nova solicitação" : "novas solicitações"} para você
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20, maxHeight: 340, overflowY: "auto" }}>
          {solicitacoes.map(s => (
            <div key={s.id} style={{ background: "rgba(56,189,248,.05)", border: "1px solid rgba(56,189,248,.12)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#e2e8f0", marginBottom: 4 }}>{s.nome_cliente || "—"}</div>
              {s.instrucoes && (
                <div style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5, marginBottom: 6 }}>{s.instrucoes}</div>
              )}
              <div style={{ fontSize: 11, color: "#4a6080" }}>
                Solicitado por: <span style={{ color: "#64748b" }}>{s.criado_por || "—"}</span>
              </div>
            </div>
          ))}
        </div>

        <button
          className="hvr"
          style={{ ...S.btn("primary"), width: "100%", padding: 13 }}
          onClick={handleEntendido}
          disabled={marcando}
        >
          {marcando ? "⏳ Processando..." : "✅ Entendido"}
        </button>

      </div>
    </div>
  );
}

export default SolicitacaoPopup;
