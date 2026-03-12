import React, { useState, useEffect } from "react";
import S from "../utils/styles";
import { api } from "../utils/helpers";

function AdminUsers({ currentUser }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ nome:"", email:"", senha:"", role:"user" });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState("");

  const fetchUsers = async () => {
    setLoading(true);
    try { setUsers(await api("/app_users?order=created_at.asc&select=id,nome,email,role,created_at")); } catch {}
    setLoading(false);
  };
  useEffect(() => { fetchUsers(); }, []);

  const addUser = async () => {
    if (!form.nome||!form.email||!form.senha) { setErro("Preencha todos os campos."); return; }
    setErro("");
    try {
      await api("/app_users", { method:"POST", body:JSON.stringify(form) });
      setForm({ nome:"", email:"", senha:"", role:"user" });
      setOk("Usuário criado!"); setTimeout(()=>setOk(""),3000); fetchUsers();
    } catch { setErro("Erro ao criar. E-mail já cadastrado?"); }
  };

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditForm({ nome:u.nome, email:u.email, senha:"", role:u.role });
    setErro(""); setOk("");
  };

  const saveEdit = async () => {
    if (!editForm.nome||!editForm.email) { setErro("Nome e e-mail são obrigatórios."); return; }
    setErro("");
    const payload = { nome:editForm.nome, email:editForm.email, role:editForm.role };
    if (editForm.senha.trim()) payload.senha = editForm.senha.trim();
    try {
      await api(`/app_users?id=eq.${editingId}`, { method:"PATCH", body:JSON.stringify(payload) });
      setEditingId(null);
      setOk("Usuário atualizado!"); setTimeout(()=>setOk(""),3000); fetchUsers();
    } catch { setErro("Erro ao salvar. E-mail já em uso?"); }
  };

  const deleteUser = async (id) => {
    if (id===currentUser.id) { setErro("Você não pode excluir a si mesmo."); return; }
    if (!window.confirm("Excluir este usuário?")) return;
    await api(`/app_users?id=eq.${id}`, { method:"DELETE" }); fetchUsers();
  };

  const labelStyle = { fontSize:11, fontWeight:700, color:"#4a6080", letterSpacing:"0.08em", textTransform:"uppercase", display:"block", marginBottom:6 };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

      {/* CREATE FORM */}
      <div style={{ ...S.card, padding:20 }}>
        <div style={{ fontWeight:700, fontSize:14, marginBottom:16, color:"#38bdf8" }}>➕ Novo Usuário</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
          <div><label style={S.label}>Nome</label><input style={S.input} placeholder="Nome completo" value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} /></div>
          <div><label style={S.label}>E-mail</label><input style={S.input} type="email" placeholder="email@exemplo.com" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
          <div><label style={S.label}>Senha</label><input style={S.input} placeholder="Senha inicial" value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})} /></div>
          <div><label style={S.label}>Perfil</label>
            <select style={{ ...S.input, appearance:"none" }} value={form.role} onChange={e=>setForm({...form,role:e.target.value})}>
              <option value="user">Usuário comum</option>
              <option value="gerente">Gerente</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>
        {erro && !editingId && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#f87171", marginBottom:10 }}>⚠️ {erro}</div>}
        {ok && <div style={{ background:"rgba(34,197,94,.08)", border:"1px solid rgba(34,197,94,.2)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#4ade80", marginBottom:10 }}>✅ {ok}</div>}
        <button style={{ ...S.btn("primary"), padding:"11px 20px" }} onClick={addUser}>Criar Usuário</button>
      </div>

      {/* USER LIST */}
      <div>
        <div style={{ ...S.label, marginBottom:12 }}>Usuários cadastrados ({users.length})</div>
        {loading ? <div style={{ color:"#4a6080", fontSize:13 }}>Carregando...</div> : (
          <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
            {users.map(u => (
              <div key={u.id} style={{ ...S.card, padding:"14px 18px" }}>

                {editingId === u.id ? (
                  /* ── EDIT MODE ── */
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:"#38bdf8", marginBottom:14 }}>✏️ Editando: {u.nome}</div>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
                      <div>
                        <label style={labelStyle}>Nome</label>
                        <input style={S.input} value={editForm.nome} onChange={e=>setEditForm({...editForm,nome:e.target.value})} />
                      </div>
                      <div>
                        <label style={labelStyle}>E-mail</label>
                        <input style={S.input} type="email" value={editForm.email} onChange={e=>setEditForm({...editForm,email:e.target.value})} />
                      </div>
                      <div>
                        <label style={labelStyle}>Nova Senha <span style={{ fontWeight:400, color:"#4a6080" }}>(deixe vazio para não alterar)</span></label>
                        <input style={S.input} type="password" placeholder="••••••••" value={editForm.senha} onChange={e=>setEditForm({...editForm,senha:e.target.value})} />
                      </div>
                      <div>
                        <label style={labelStyle}>Perfil</label>
                        <select style={{ ...S.input, appearance:"none" }} value={editForm.role} onChange={e=>setEditForm({...editForm,role:e.target.value})}>
                          <option value="user">Usuário comum</option>
                          <option value="gerente">Gerente</option>
                          <option value="admin">Administrador</option>
                        </select>
                      </div>
                    </div>
                    {erro && editingId === u.id && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:8, padding:"8px 12px", fontSize:12, color:"#f87171", marginBottom:10 }}>⚠️ {erro}</div>}
                    <div style={{ display:"flex", gap:10 }}>
                      <button style={{ ...S.btn("primary"), padding:"9px 18px", fontSize:13 }} onClick={saveEdit}>💾 Salvar</button>
                      <button style={{ ...S.btn("ghost"), padding:"9px 18px", fontSize:13 }} onClick={()=>{ setEditingId(null); setErro(""); }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  /* ── VIEW MODE ── */
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:12 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:38, height:38, borderRadius:"50%", background:`hsl(${u.nome.charCodeAt(0)*7%360},55%,30%)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, fontWeight:700, flexShrink:0 }}>
                        {u.nome.split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight:600, fontSize:14 }}>{u.nome} {u.id===currentUser.id && <span style={{ fontSize:11, color:"#4a6080" }}>(você)</span>}</div>
                        <div style={{ fontSize:12, color:"#4a6080", marginTop:2 }}>{u.email}</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                      <span style={S.tag(u.role==="admin"?"purple":u.role==="gerente"?"orange":"blue")}>
                        {u.role==="admin"?"👑 Admin":u.role==="gerente"?"🏢 Gerente":"👤 Usuário"}
                      </span>
                      <button style={{ ...S.btn("ghost"), padding:"5px 12px", fontSize:12, color:"#38bdf8", borderColor:"rgba(56,189,248,.3)" }} onClick={()=>startEdit(u)}>✏️ Editar</button>
                      {u.id!==currentUser.id && <button style={{ ...S.btn("danger"), padding:"5px 11px", fontSize:12 }} onClick={()=>deleteUser(u.id)}>Excluir</button>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;
