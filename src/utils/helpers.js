import { SUPABASE_URL, SUPABASE_KEY } from "./constants";

export const api = async (path, options = {}) => {
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

export const formatDate = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR") + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

export const reverseGeocode = async (lat, lng) => {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt-BR`);
    const data = await res.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch { return `${lat.toFixed(5)}, ${lng.toFixed(5)}`; }
};

export const exportCSV = (checkins) => {
  const header = "Usuário,Data/Hora,Loja,Endereço,Código Cliente,Resumo da Visita,Latitude,Longitude\n";
  const rows = checkins.map(c =>
    `"${c.usuario}","${formatDate(c.timestamp)}","${c.loja||""}","${c.endereco}","${c.codigo_cliente||""}","${c.resumo_visita||""}","${c.lat}","${c.lng}"`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url;
  a.download = `checkins_${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
};

export const resumirEndereco = (end) => {
  if (!end) return "-";
  const parts = end.split(",").map((p) => p.trim());
  const rua = parts[0] || "";
  const numero = parts[1] || "";
  const cidade = parts.length >= 4
    ? parts.find((p, i) => i >= 2 && i <= parts.length - 4 && p.length > 2 && !/^\d/.test(p) && !p.includes("Região")) || ""
    : "";
  const ruaNum = numero && /^\d/.test(numero) ? `${rua}, ${numero}` : rua;
  return cidade ? `${ruaNum} — ${cidade}` : ruaNum || end.slice(0, 50);
};

export const formatCurrency = (v) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);
};

export const ENDERECO_STATUS_STYLE = {
  ok:             { color:"#4ade80", icon:"✅", title:"Endereço confere com o CRM" },
  divergente:     { color:"#fb923c", icon:"⚠️", title:"Endereço diverge do CRM" },
  nao_encontrado: { color:"#f87171", icon:"❌", title:"Cliente não encontrado no CRM" },
  nao_verificado: { color:"#64748b", icon:"—",  title:"Não verificado" },
  erro_api:       { color:"#94a3b8", icon:"⚡", title:"CRM indisponível na verificação" },
};
