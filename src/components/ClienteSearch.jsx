import React, { useState } from "react";
import S from "../utils/styles";
import { EDGE_FUNCTION_URL, TABELAS_PRECO, SUPABASE_KEY, SUPABASE_URL } from "../utils/constants";
import { formatCurrency, api } from "../utils/helpers";
import SolicitacaoVisitaModal from "./SolicitacaoVisitaModal";

const EMPRESA_LOJA_MAP = {1:"Matriz",2:"Campinas",3:"Palhoça",4:"Tubarão",6:"Ingleses",8:"Rio Tavares",9:"Forquilhinhas"};

function ClienteSearch({ isDashboard, user }) {
  const [codigo, setCodigo] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [cliente, setCliente] = useState(null);
  const [financeiro, setFinanceiro] = useState(null);
  const [historico, setHistorico] = useState(null);
  const [erro, setErro] = useState("");
  const [abaCliente, setAbaCliente] = useState("cadastro");
  const [showSolicitacao, setShowSolicitacao] = useState(false);
  const [usuarios, setUsuarios] = useState([]);
  const [codigoAtual, setCodigoAtual] = useState("");

  const buscar = async () => {
    if (!codigo.trim()) { setErro("Informe o código ou CPF/CNPJ do cliente."); return; }
    setErro(""); setBuscando(true); setCliente(null); setFinanceiro(null); setHistorico(null);
    try {
      // Detect if input is CPF/CNPJ (contains dots, dashes, slashes or is long numeric)
      const raw = codigo.trim();
      setCodigoAtual(raw);
      const digitsOnly = raw.replace(/[^0-9]/g, "");
      const isCpfCnpj = digitsOnly.length === 11 || digitsOnly.length === 14 || raw.includes(".") || raw.includes("/");
      const paramKey = isCpfCnpj ? "cpfCnpj" : "clienteId";
      const paramVal = encodeURIComponent(isCpfCnpj ? digitsOnly : raw);

      // Fetch all 3 in parallel
      const hoje = new Date();
      const doisMesesAtras = new Date(hoje); doisMesesAtras.setMonth(doisMesesAtras.getMonth()-2);
      const dataInicial = doisMesesAtras.toISOString().split("T")[0];

      const authHeaders = { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };
      const [settledCliente, settledFin, settledHist] = await Promise.allSettled([
        fetch(`${EDGE_FUNCTION_URL}?${paramKey}=${paramVal}`, { headers: authHeaders }),
        fetch(`${SUPABASE_URL}/functions/v1/buscar-financeiro?${paramKey}=${paramVal}`, { headers: authHeaders }),
        fetch(`${SUPABASE_URL}/functions/v1/buscar-historico?${paramKey}=${paramVal}&dataInicial=${dataInicial}`, { headers: authHeaders }),
      ]);

      if (settledCliente.status === "rejected") { setErro("Erro ao conectar com o servidor. Tente novamente."); setBuscando(false); return; }
      const resCliente = settledCliente.value;
      const cData = await resCliente.json();
      if (!cData.nome) { setErro("Cliente não encontrado."); setBuscando(false); return; }
      console.log("🔍 RAW CLIENTE:", JSON.stringify(cData._raw || cData, null, 2));
      setCliente(cData);

      if (isDashboard) {
        try {
          const uData = await api("/app_users?select=id,nome,email,role&order=nome.asc");
          setUsuarios(uData);
        } catch { /* silent */ }
      }

      if (settledFin.status === "fulfilled" && settledFin.value.ok) {
        try {
          const fData = await settledFin.value.json();
          const itens = Array.isArray(fData) ? fData : (fData.itens || []);
          const agora = new Date();
          const vencidas = itens.filter(p => new Date(p.dataVencimento) < agora);
          const aVencer = itens.filter(p => new Date(p.dataVencimento) >= agora);
          const totalAberto = itens.reduce((s,p) => s + (p.valorParcela||0), 0);
          const totalVencido = vencidas.reduce((s,p) => s + (p.valorParcela||0), 0);
          setFinanceiro({ itens, vencidas, aVencer, totalAberto, totalVencido });
        } catch { /* silent */ }
      }

      if (settledHist.status === "fulfilled" && settledHist.value.ok) {
        try {
        const hData = await settledHist.value.json();
        const itens = Array.isArray(hData) ? hData : (hData.itens || []);
        // Group by week
        const semanas = {};
        itens.forEach(v => {
          const d = new Date(v.horaEmissao);
          // Get Monday of the week
          const day = d.getDay();
          const monday = new Date(d);
          monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
          monday.setHours(0,0,0,0);
          const key = monday.toISOString();
          if (!semanas[key]) semanas[key] = { inicio: new Date(monday), compras: 0, total: 0, lojas: new Set() };
          if (!v.cancelada) {
            semanas[key].compras++;
            semanas[key].total += v.valorTotal || 0;
            if (v.empresaId && EMPRESA_LOJA_MAP[v.empresaId]) semanas[key].lojas.add(EMPRESA_LOJA_MAP[v.empresaId]);
          }
        });
        const semanasArr = Object.values(semanas)
          .sort((a,b) => b.inicio - a.inicio)
          .map(s => ({
            ...s,
            lojas: Array.from(s.lojas),
            fim: new Date(s.inicio.getTime() + 6*24*60*60*1000)
          }));
        setHistorico(semanasArr);
        } catch { /* silent */ }
      }
    } catch(e) { setErro("Erro ao buscar. Tente novamente."); }
    setBuscando(false);
  };

  const fmtDate = d => new Date(d).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"});

  const subTabStyle = (id) => ({
    padding:"8px 14px", fontSize:12, fontWeight:600, borderRadius:"8px 8px 0 0",
    border:"none", cursor:"pointer", fontFamily:"inherit",
    background: abaCliente===id ? "#0d1a2e" : "transparent",
    color: abaCliente===id ? "#38bdf8" : "#4a6080",
    borderBottom: abaCliente===id ? "2px solid #38bdf8" : "2px solid transparent",
  });

  return (
    <div className="fade-in" style={{ maxWidth:600, margin:"0 auto" }}>
      {/* Search bar */}
      <div style={{ display:"flex", gap:10, marginBottom:24 }}>
        <input style={{ ...S.input, flex:1 }} placeholder="Código do cliente (ex: 549) ou CPF/CNPJ"
          value={codigo} onChange={e=>{ setCodigo(e.target.value); setErro(""); }}
          onKeyDown={e=>e.key==="Enter"&&buscar()} />
        <button className="hvr" style={{ ...S.btn("primary"), padding:"0 20px", whiteSpace:"nowrap" }}
          onClick={buscar} disabled={buscando}>
          {buscando ? "🔍 Buscando..." : "🔍 Buscar"}
        </button>
      </div>
      {erro && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:10, padding:"10px 14px", color:"#f87171", fontSize:13, marginBottom:16 }}>⚠️ {erro}</div>}

      {/* Results */}
      {cliente && (
        <div>
          {/* Client name header */}
          <div style={{ background:"linear-gradient(135deg,rgba(14,165,233,.1),rgba(99,102,241,.1))", border:"1px solid rgba(14,165,233,.2)", borderRadius:14, padding:"16px 20px", marginBottom:16, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48, height:48, borderRadius:"50%", background:`hsl(${(cliente.nome||"").charCodeAt(0)*7%360},55%,30%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, fontWeight:700, color:"#fff", flexShrink:0 }}>
              {(cliente.nome||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight:700, fontSize:17 }}>{cliente.nome}</div>
              <div style={{ fontSize:12, color:"#4a6080", marginTop:3 }}>Código: {codigo} {cliente.loja && <span style={{ ...S.tag("purple"), fontSize:11, marginLeft:6 }}>🏪 {cliente.loja}</span>}</div>
              <div style={{ display:"flex", gap:6, marginTop:8, flexWrap:"wrap" }}>
                {(() => {
                  const ativo     = cliente.ativo     ?? cliente._raw?.ativo;
                  const bloqueado = cliente.bloqueado ?? cliente._raw?.bloqueado;
                  const badgeBase = { display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600 };
                  return (<>
                    {ativo === true  && <span style={{ ...badgeBase, background:"rgba(34,197,94,0.15)",  color:"#22c55e", border:"1px solid rgba(34,197,94,0.3)"  }}>● Ativo</span>}
                    {ativo === false && <span style={{ ...badgeBase, background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)" }}>● Inativo</span>}
                    {bloqueado === true && <span style={{ ...badgeBase, background:"rgba(239,68,68,0.15)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.3)" }}>🔒 Bloqueado</span>}
                  </>);
                })()}
              </div>
            </div>
          </div>

          {/* Sub tabs */}
          <div style={{ display:"flex", gap:2, borderBottom:"1px solid #1a2d4a", marginBottom:0 }}>
            <button style={subTabStyle("cadastro")} onClick={()=>setAbaCliente("cadastro")}>📋 Cadastro</button>
            <button style={subTabStyle("financeiro")} onClick={()=>setAbaCliente("financeiro")}>💰 Financeiro</button>
            <button style={subTabStyle("historico")} onClick={()=>setAbaCliente("historico")}>📦 Histórico</button>
          </div>

          <div style={{ background:"#0a1628", border:"1px solid #1a2d4a", borderTop:"none", borderRadius:"0 0 12px 12px", padding:20 }}>

            {/* ABA CADASTRO */}
            {abaCliente === "cadastro" && (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {(() => {
                  const fields = [
                    ["👤 Nome",                  cliente.nome,          false],
                    ["🔢 Código",                cliente.clienteId ? String(cliente.clienteId) : null, false],
                    ["🪪 CPF/CNPJ",              cliente.cpfCnpj,       false],
                    ["📍 Endereço",              cliente.endereco?.enderecoCompleto, false],
                    ["📞 Telefone",              [cliente.telefone, cliente.celular].filter(Boolean).join(" / ") || null, false],
                    ["📧 E-mail",                cliente.email,         true],
                    ["💳 Forma de Pagamento",    cliente.formaPagamento, false],
                    ["🏷️ Tabela de Preço",       cliente.tabelaPrecoId ? TABELAS_PRECO[cliente.tabelaPrecoId] || `Tabela ${cliente.tabelaPrecoId}` : null, false],
                    ["👔 Vendedor",              cliente.vendedor,      false],
                    ["🗺️ Rota",                 cliente.rota,          false],
                    ["🗓️ Última Compra",         cliente.ultimaCompra ? new Date(cliente.ultimaCompra).toLocaleDateString("pt-BR") : null, false],
                  ];
                  return fields.map(([label, value, isEmail]) => {
                    if (!value) return null;
                    return (
                      <div key={label} style={{ display:"flex", gap:10, alignItems:"flex-start", paddingBottom:12, borderBottom:"1px solid #0f1e33" }}>
                        <div style={{ fontSize:12, color:"#4a6080", minWidth:160, flexShrink:0 }}>{label}</div>
                        <div style={{ fontSize:13, color:"#e2e8f0", fontWeight:500, lineHeight:1.5, wordBreak: isEmail ? "break-all" : "normal" }}>{value}</div>
                      </div>
                    );
                  });
                })()}
                {isDashboard && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      className="hvr"
                      style={{ ...S.btn("outline"), width: "100%", padding: 12 }}
                      onClick={() => setShowSolicitacao(true)}
                    >
                      📋 Solicitar Visita
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ABA FINANCEIRO */}
            {abaCliente === "financeiro" && (
              <div>
                {!financeiro ? (
                  <div style={{ textAlign:"center", padding:32, color:"#4a6080" }}>Sem dados financeiros disponíveis</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                    {/* Totals */}
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {[
                        { label:"Total em Aberto", value: formatCurrency(financeiro.totalAberto), color:"#38bdf8" },
                        { label:"Total Vencido",   value: formatCurrency(financeiro.totalVencido), color:"#f87171" },
                        { label:"A Vencer",        value: formatCurrency(financeiro.totalAberto - financeiro.totalVencido), color:"#4ade80" },
                      ].map(c => (
                        <div key={c.label} style={{ background:"rgba(255,255,255,.03)", border:"1px solid #1a2d4a", borderRadius:10, padding:"12px 16px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <div style={{ fontSize:13, color:"#94a3b8" }}>{c.label}</div>
                          <div style={{ fontSize:16, fontWeight:700, color:c.color }}>{c.value}</div>
                        </div>
                      ))}
                    </div>
                    {/* Parcelas vencidas */}
                    {financeiro.vencidas.length > 0 && (
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:"#f87171", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>⚠️ Vencidas ({financeiro.vencidas.length})</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {financeiro.vencidas.map((p,i) => (
                            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(239,68,68,.05)", border:"1px solid rgba(239,68,68,.15)", borderRadius:8, padding:"9px 13px" }}>
                              <div style={{ fontSize:12, color:"#f87171" }}>Venc. {fmtDate(p.dataVencimento)}</div>
                              <div style={{ fontSize:13, fontWeight:600, color:"#f87171" }}>{formatCurrency(p.valorParcela)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Parcelas a vencer */}
                    {financeiro.aVencer.length > 0 && (
                      <div>
                        <div style={{ fontSize:11, fontWeight:700, color:"#4ade80", letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:8 }}>✅ A Vencer ({financeiro.aVencer.length})</div>
                        <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                          {financeiro.aVencer.map((p,i) => (
                            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(34,197,94,.05)", border:"1px solid rgba(34,197,94,.15)", borderRadius:8, padding:"9px 13px" }}>
                              <div style={{ fontSize:12, color:"#4ade80" }}>Venc. {fmtDate(p.dataVencimento)}</div>
                              <div style={{ fontSize:13, fontWeight:600, color:"#4ade80" }}>{formatCurrency(p.valorParcela)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {financeiro.itens.length === 0 && (
                      <div style={{ textAlign:"center", padding:24, color:"#4a6080", fontSize:13 }}>✅ Nenhum débito em aberto</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ABA HISTÓRICO */}
            {abaCliente === "historico" && (
              <div>
                {!historico || historico.length === 0 ? (
                  <div style={{ textAlign:"center", padding:32, color:"#4a6080" }}>Nenhuma compra nos últimos 2 meses</div>
                ) : (
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    <div style={{ fontSize:11, color:"#4a6080", marginBottom:4 }}>Últimos 2 meses — compras não canceladas</div>
                    {historico.map((s,i) => (
                      <div key={i} style={{ background:"rgba(255,255,255,.03)", border:"1px solid #1a2d4a", borderRadius:10, padding:"12px 16px", display:"flex", alignItems:"center", gap:12 }}>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:13, fontWeight:600, color:"#e2e8f0" }}>
                            {fmtDate(s.inicio)} – {fmtDate(s.fim)}
                          </div>
                          {s.lojas.length > 0 && (
                            <div style={{ display:"flex", gap:4, marginTop:5, flexWrap:"wrap" }}>
                              {s.lojas.map(l => <span key={l} style={{ ...S.tag("purple"), fontSize:10 }}>🏪 {l}</span>)}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign:"right", flexShrink:0 }}>
                          <div style={{ fontSize:15, fontWeight:700, color:"#38bdf8" }}>{formatCurrency(s.total)}</div>
                          <div style={{ fontSize:11, color:"#4a6080", marginTop:2 }}>{s.compras} {s.compras===1?"compra":"compras"}</div>
                        </div>
                      </div>
                    ))}
                    {/* Total */}
                    <div style={{ borderTop:"1px solid #1a2d4a", paddingTop:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div style={{ fontSize:12, color:"#4a6080" }}>Total no período</div>
                      <div style={{ fontSize:15, fontWeight:700, color:"#4ade80" }}>
                        {formatCurrency(historico.reduce((s,w)=>s+w.total,0))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {!cliente && !buscando && !erro && (
        <div style={{ textAlign:"center", padding:48, color:"#4a6080" }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🔍</div>
          <div style={{ fontSize:14, fontWeight:600, marginBottom:6 }}>Pesquisa de Cliente</div>
          <div style={{ fontSize:13 }}>Digite o código do cliente para ver seus dados, financeiro e histórico de compras</div>
        </div>
      )}

      {showSolicitacao && cliente && (
        <SolicitacaoVisitaModal
          clienteInfo={{ codigo: codigoAtual, nome: cliente.nome, loja: cliente.loja }}
          usuarios={usuarios}
          user={user}
          onClose={() => setShowSolicitacao(false)}
          onSalvo={() => setShowSolicitacao(false)}
        />
      )}
    </div>
  );
}

export default ClienteSearch;
