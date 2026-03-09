import { useState, useEffect, useCallback } from "react";

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

const USERS = ["Ana Silva", "Bruno Costa", "Carla Mendes", "Diego Ramos", "Elena Souza"];

const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`);
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
};

const exportCSV = (checkins) => {
  const header = "Usuário,Data/Hora,Endereço,Latitude,Longitude\n";
  const rows = checkins.map(c =>
    `"${c.usuario}","${formatDate(c.timestamp)}","${c.endereco}","${c.lat}","${c.lng}"`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `checkins_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const MapView = ({ checkins }) => {
  if (checkins.length === 0) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 8 }}>
      <span style={{ fontSize: 36 }}>📍</span>
      <p style={{ color: "#8a9ab5", fontSize: 13 }}>Nenhum check-in ainda</p>
    </div>
  );
  const lats = checkins.map(c => c.lat);
  const lngs = checkins.map(c => c.lng);
  const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${centerLng - 0.05},${centerLat - 0.05},${centerLng + 0.05},${centerLat + 0.05}&layer=mapnik&marker=${centerLat},${centerLng}`;
  return (
    <div style={{ width: "100%", height: "100%", borderRadius: 12, overflow: "hidden", position: "relative" }}>
      <iframe title="mapa" src={mapUrl} style={{ width: "100%", height: "100%", border: "none" }} />
      <div style={{
        position: "absolute", top: 8, right: 8, background: "rgba(15,22,36,0.85)",
        backdropFilter: "blur(8px)", borderRadius: 8, padding: "6px 12px",
        color: "#e2e8f0", fontSize: 12, border: "1px solid rgba(255,255,255,0.08)"
      }}>
        {checkins.length} ponto{checkins.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
};

export default function CheckInApp() {
  const [tab, setTab] = useState("checkin");
  const [selectedUser, setSelectedUser] = useState(USERS[0]);
  const [checkins, setCheckins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [status, setStatus] = useState(null);
  const [filterUser, setFilterUser] = useState("Todos");
  const [pulse, setPulse] = useState(false);
  const [newIds, setNewIds] = useState(new Set());

  const fetchCheckins = useCallback(async () => {
    try {
      const data = await api("/checkins?order=timestamp.desc&limit=100");
      setCheckins(data);
    } catch (e) {
      console.error("Erro ao buscar check-ins:", e);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    fetchCheckins();
    const interval = setInterval(fetchCheckins, 10000);
    return () => clearInterval(interval);
  }, [fetchCheckins]);

  const handleCheckIn = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setStatus(null);
    try {
      const pos = await new Promise((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, { timeout: 10000 })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      const endereco = await reverseGeocode(lat, lng);
      const [inserted] = await api("/checkins", {
        method: "POST",
        body: JSON.stringify({ usuario: selectedUser, endereco, lat, lng }),
      });
      setCheckins(prev => [inserted, ...prev]);
      setNewIds(prev => new Set([...prev, inserted.id]));
      setTimeout(() => setNewIds(prev => { const s = new Set(prev); s.delete(inserted.id); return s; }), 2000);
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
      setStatus({ type: "success", msg: `Check-in de ${selectedUser} registrado!` });
      setTimeout(() => setStatus(null), 3500);
    } catch (e) {
      const msg = e.code
        ? "Não foi possível obter localização. Verifique as permissões."
        : "Erro ao salvar. Verifique a conexão e tente novamente.";
      setStatus({ type: "error", msg });
      setTimeout(() => setStatus(null), 4000);
    }
    setLoading(false);
  }, [loading, selectedUser]);

  const filtered = filterUser === "Todos" ? checkins : checkins.filter(c => c.usuario === filterUser);
  const totalToday = checkins.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString()).length;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0a0f1e 0%, #0d1a2e 50%, #0a1628 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#e2e8f0",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a3a5c; border-radius: 4px; }
        .tab-btn { cursor: pointer; border: none; background: none; transition: all 0.2s; }
        .checkin-btn {
          cursor: pointer; border: none; width: 100%; padding: 16px;
          border-radius: 14px; font-size: 15px; font-weight: 600;
          font-family: inherit; letter-spacing: 0.04em; transition: all 0.2s;
        }
        .checkin-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 32px rgba(56,189,248,0.25); }
        .checkin-btn:active:not(:disabled) { transform: scale(0.98); }
        .checkin-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .ping { animation: ping 0.5s ease-out; }
        @keyframes ping { 0%{transform:scale(1)} 50%{transform:scale(1.04)} 100%{transform:scale(1)} }
        .fade-in { animation: fadeIn 0.35s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .new-entry { animation: highlight 2s ease; }
        @keyframes highlight { 0%{background:#0e3a2a;border-color:#22c55e} 100%{background:#0d1a2e;border-color:#1e2f4a} }
        .select-custom {
          appearance: none; background: #111c30; border: 1px solid #1e2f4a;
          color: #e2e8f0; border-radius: 10px; padding: 11px 16px; font-family: inherit;
          font-size: 14px; width: 100%; cursor: pointer; outline: none; transition: border-color 0.2s;
        }
        .select-custom:focus { border-color: #38bdf8; }
        .chip { display:inline-flex;align-items:center;gap:5px;padding:3px 10px;
          border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.03em; }
        .sync-dot { width:7px;height:7px;border-radius:50%;background:#22c55e;
          animation: blink 2s infinite; display:inline-block; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .action-btn {
          cursor: pointer; border: none; border-radius: 10px; padding: 9px 14px;
          font-size: 13px; font-weight: 600; font-family: inherit; transition: all 0.2s;
        }
        .action-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      <div style={{
        background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "18px 24px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>📍</div>
          <div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 15, fontWeight: 700, letterSpacing: "-0.02em" }}>CheckPoint</div>
            <div style={{ fontSize: 11, color: "#4a6080", marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
              <span className="sync-dot" /> sincronizado em tempo real
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: "#38bdf8" }}>{totalToday}</div>
            <div style={{ fontSize: 10, color: "#4a6080" }}>HOJE</div>
          </div>
          <div style={{ width: 1, height: 32, background: "#1e2f4a" }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 20, fontWeight: 700, color: "#a78bfa" }}>{checkins.length}</div>
            <div style={{ fontSize: 10, color: "#4a6080" }}>TOTAL</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", padding: "16px 24px 0", gap: 4 }}>
        {[
          { id: "checkin", label: "Check-in", icon: "✅" },
          { id: "history", label: "Histórico", icon: "📋" },
          { id: "map", label: "Mapa", icon: "🗺️" },
        ].map(t => (
          <button key={t.id} className="tab-btn" onClick={() => setTab(t.id)} style={{
            padding: "9px 18px", borderRadius: "10px 10px 0 0", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
            color: tab === t.id ? "#38bdf8" : "#4a6080",
            background: tab === t.id ? "rgba(56,189,248,0.08)" : "transparent",
            borderBottom: tab === t.id ? "2px solid #38bdf8" : "2px solid transparent",
          }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      <div style={{
        margin: "0 24px 24px",
        background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "0 12px 12px 12px", padding: 24, minHeight: 420,
      }}>
        {tab === "checkin" && (
          <div className="fade-in" style={{ maxWidth: 420, margin: "0 auto" }}>
            <p style={{ color: "#4a6080", fontSize: 13, marginBottom: 24 }}>
              Selecione o usuário e registre o check-in com sua localização GPS atual.
            </p>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#8a9ab5", letterSpacing: "0.08em", marginBottom: 8 }}>USUÁRIO</label>
            <select className="select-custom" value={selectedUser} onChange={e => setSelectedUser(e.target.value)} style={{ marginBottom: 24 }}>
              {USERS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <div style={{
              background: "rgba(56,189,248,0.05)", border: "1px solid rgba(56,189,248,0.12)",
              borderRadius: 12, padding: 16, marginBottom: 24, display: "flex", gap: 12, alignItems: "center"
            }}>
              <div style={{ fontSize: 24 }}>👤</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedUser}</div>
                <div style={{ fontSize: 12, color: "#4a6080", marginTop: 2 }}>
                  {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </div>
              </div>
            </div>
            <button className={`checkin-btn ${pulse ? "ping" : ""}`} onClick={handleCheckIn} disabled={loading}
              style={{ background: loading ? "#1e2f4a" : "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)", color: "#fff" }}>
              {loading ? "📡 Obtendo localização..." : "📍 Registrar Check-in"}
            </button>
            {status && (
              <div className="fade-in" style={{
                marginTop: 16, padding: "12px 16px", borderRadius: 10,
                background: status.type === "success" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                border: `1px solid ${status.type === "success" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
                color: status.type === "success" ? "#4ade80" : "#f87171",
                fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 8,
              }}>
                {status.type === "success" ? "✅" : "⚠️"} {status.msg}
              </div>
            )}
            {checkins.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#4a6080", letterSpacing: "0.08em", marginBottom: 12 }}>ÚLTIMO CHECK-IN</div>
                <div style={{ background: "#0d1a2e", border: "1px solid #1e2f4a", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{checkins[0].usuario}</div>
                  <div style={{ fontSize: 12, color: "#38bdf8", marginTop: 4 }}>{formatDate(checkins[0].timestamp)}</div>
                  <div style={{ fontSize: 12, color: "#8a9ab5", marginTop: 6, lineHeight: 1.5 }}>📍 {checkins[0].endereco}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "history" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <select className="select-custom" value={filterUser} onChange={e => setFilterUser(e.target.value)} style={{ width: "auto", minWidth: 160 }}>
                <option>Todos</option>
                {USERS.map(u => <option key={u}>{u}</option>)}
              </select>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="action-btn" onClick={fetchCheckins}
                  style={{ background: "rgba(56,189,248,0.08)", border: "1px solid rgba(56,189,248,0.2)", color: "#38bdf8" }}>
                  🔄 Atualizar
                </button>
                <button className="action-btn" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}
                  style={{
                    background: filtered.length === 0 ? "#0d1a2e" : "rgba(99,102,241,0.15)",
                    border: "1px solid rgba(99,102,241,0.3)", color: "#a78bfa",
                    opacity: filtered.length === 0 ? 0.5 : 1, cursor: filtered.length === 0 ? "not-allowed" : "pointer",
                  }}>
                  ⬇️ Exportar CSV
                </button>
              </div>
            </div>
            {fetching ? (
              <div style={{ textAlign: "center", padding: 48, color: "#4a6080" }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
                <div>Carregando dados...</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: 48, color: "#4a6080" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div>Nenhum check-in encontrado</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 420, overflowY: "auto" }}>
                {filtered.map((c, i) => (
                  <div key={c.id} className={`fade-in ${newIds.has(c.id) ? "new-entry" : ""}`} style={{
                    background: "#0d1a2e", border: "1px solid #1e2f4a", borderRadius: 12, padding: "14px 16px",
                    display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "start",
                    transition: "background 0.5s, border-color 0.5s",
                  }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: `hsl(${USERS.indexOf(c.usuario) * 67 + 200}, 70%, 35%)`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0,
                        }}>
                          {c.usuario?.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{c.usuario}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#38bdf8", marginBottom: 4 }}>🕐 {formatDate(c.timestamp)}</div>
                      <div style={{ fontSize: 12, color: "#8a9ab5", lineHeight: 1.5 }}>📍 {c.endereco}</div>
                    </div>
                    <span className="chip" style={{ background: "rgba(56,189,248,0.1)", color: "#38bdf8", border: "1px solid rgba(56,189,248,0.2)", flexShrink: 0 }}>
                      #{filtered.length - i}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "map" && (
          <div className="fade-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ color: "#4a6080", fontSize: 13 }}>Mapa dos check-ins registrados</p>
              <span className="chip" style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
                {checkins.length} check-in{checkins.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div style={{ height: 380, borderRadius: 12, overflow: "hidden", border: "1px solid #1e2f4a" }}>
              <MapView checkins={checkins} />
            </div>
            {checkins.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, maxHeight: 150, overflowY: "auto" }}>
                {checkins.slice(0, 5).map(c => (
                  <div key={c.id} style={{
                    display: "flex", gap: 10, alignItems: "center",
                    background: "#0d1a2e", borderRadius: 8, padding: "8px 12px", fontSize: 12,
                  }}>
                    <span style={{ color: "#f87171" }}>📍</span>
                    <span style={{ fontWeight: 600, color: "#e2e8f0", minWidth: 80 }}>{c.usuario?.split(" ")[0]}</span>
                    <span style={{ color: "#4a6080" }}>{formatDate(c.timestamp)}</span>
                    <span style={{ color: "#8a9ab5", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.endereco}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
