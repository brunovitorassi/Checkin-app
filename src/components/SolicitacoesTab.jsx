import React, { useState, useEffect } from "react";
import S from "../utils/styles";
import { api, formatDate } from "../utils/helpers";

function SolicitacoesTab({ user }) {
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("todas");

  useEffect(() => {
    const fetchSolicitacoes = async () => {
      if (!user?.email) { setCarregando(false); return; }
      try {
        const data = await api(`/solicitacoes_visita?promotor=eq.${encodeURIComponent(user.email)}&order=created_at.desc`);
        setSolicitacoes(Array.isArray(data) ? data : []);
      } catch {
        setSolicitacoes([]);
      }
      setCarregando(false);
    };
    fetchSolicitacoes();
  }, [user]);

  const filtradas = solicitacoes.filter(s => {
    if (filtro === "pendentes") return s.status === "pendente";
    if (filtro === "concluidas") return s.status === "concluida";
    return true;
  });

  const filterBtnStyle = (id) => ({
    ...S.btn(filtro === id ? "primary" : "ghost"),
    padding: "7px 16px",
    fontSize: 12,
  });

  if (carregando) {
    return (
      <div style={{ textAlign: "center", padding: 48, color: "#4a6080" }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>⏳</div>
        <div style={{ fontSize: 14 }}>Carregando solicitações...</div>
      </div>
    );
  }

  return (
    <div className="fade-in" style={{ maxWidth: 640, margin: "0 auto" }}>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <button className="hvr" style={filterBtnStyle("todas")} onClick={() => setFiltro("todas")}>Todas ({solicitacoes.length})</button>
        <button className="hvr" style={filterBtnStyle("pendentes")} onClick={() => setFiltro("pendentes")}>
          🟡 Pendentes ({solicitacoes.filter(s => s.status === "pendente").length})
        </button>
        <button className="hvr" style={filterBtnStyle("concluidas")} onClick={() => setFiltro("concluidas")}>
          ✅ Concluídas ({solicitacoes.filter(s => s.status === "concluida").length})
        </button>
      </div>

      {filtradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#4a6080" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Nenhuma solicitação encontrada</div>
          <div style={{ fontSize: 13 }}>
            {filtro === "todas"
              ? "Você não possui solicitações de visita atribuídas."
              : `Nenhuma solicitação ${filtro === "pendentes" ? "pendente" : "concluída"} no momento.`}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtradas.map(s => (
            <div key={s.id} style={{ ...S.card, padding: "16px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#e2e8f0", marginBottom: 3 }}>{s.nome_cliente || "—"}</div>
                  {s.loja && <span style={{ ...S.tag("purple"), fontSize: 11 }}>🏪 {s.loja}</span>}
                </div>
                <div>
                  {s.status === "pendente"
                    ? <span style={{ ...S.tag("orange") }}>🟡 Pendente</span>
                    : <span style={{ ...S.tag("green") }}>✅ Concluída</span>}
                </div>
              </div>

              {s.instrucoes && (
                <div style={{ background: "rgba(56,189,248,.05)", border: "1px solid rgba(56,189,248,.1)", borderRadius: 8, padding: "10px 14px", marginBottom: 10 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#4a6080", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4 }}>Instruções</div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>{s.instrucoes}</div>
                </div>
              )}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 11, color: "#4a6080" }}>
                <div>👤 Solicitado por: <span style={{ color: "#94a3b8" }}>{s.criado_por || "—"}</span></div>
                {s.created_at && (
                  <div>🗓️ <span style={{ color: "#94a3b8" }}>{formatDate(s.created_at)}</span></div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SolicitacoesTab;
