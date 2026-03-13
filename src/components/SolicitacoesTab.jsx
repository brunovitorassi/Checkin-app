import React, { useState, useEffect } from "react";
import { api, formatDate } from "../utils/helpers";

const FILTROS = [
  { id: "todas",     label: "Todas" },
  { id: "pendentes", label: "Pendentes" },
  { id: "concluidas",label: "Concluídas" },
];

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
    if (filtro === "pendentes")  return s.status === "pendente";
    if (filtro === "concluidas") return s.status === "concluida";
    return true;
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

      {/* Filtros */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {FILTROS.map(f => (
          <button
            key={f.id}
            onClick={() => setFiltro(f.id)}
            style={{
              padding: "5px 14px",
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              border: filtro === f.id ? "1px solid #c0392b" : "1px solid #1e3050",
              background: filtro === f.id ? "#c0392b" : "rgba(255,255,255,.04)",
              color: filtro === f.id ? "#fff" : "#64748b",
              transition: "all .15s",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Estado vazio */}
      {filtradas.length === 0 ? (
        <div style={{ textAlign: "center", padding: 48, color: "#4a6080" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma solicitação</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtradas.map(s => (
            <div key={s.id} style={{ background: "#0d1f35", border: "1px solid #1a2d4a", borderRadius: 12, padding: 16 }}>

              {/* Cabeçalho: nome + badges */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 6 }}>
                    {s.nome_cliente || "—"}
                  </div>
                  {s.loja && (
                    <span style={{ background: "#1a2d4a", color: "#60a5fa", fontSize: 11, borderRadius: 20, padding: "2px 10px", fontWeight: 600 }}>
                      🏪 {s.loja}
                    </span>
                  )}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {s.status === "pendente" ? (
                    <span style={{ background: "#78350f", color: "#fbbf24", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 10px" }}>
                      🟡 Pendente
                    </span>
                  ) : (
                    <span style={{ background: "#14532d", color: "#4ade80", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 10px" }}>
                      ✅ Concluída
                    </span>
                  )}
                </div>
              </div>

              {/* Instruções */}
              {s.instrucoes && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: "#4a6080", letterSpacing: "0.09em", textTransform: "uppercase", marginBottom: 4 }}>
                    Instruções
                  </div>
                  <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>{s.instrucoes}</div>
                </div>
              )}

              {/* Rodapé */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 11, color: "#4a6080" }}>
                <span>Solicitado por: {s.criado_por || "—"}</span>
                {s.created_at && <span>{formatDate(s.created_at)}</span>}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SolicitacoesTab;
