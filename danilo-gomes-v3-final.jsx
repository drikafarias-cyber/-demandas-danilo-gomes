import { useState, useEffect, useRef } from "react";

/* ══════════════════════════════════════════════════
   SUPABASE CONFIG
══════════════════════════════════════════════════ */
const SUPABASE_URL = "https://sktvmxgflhlxbthssfrl.supabase.co";
const SUPABASE_KEY = "sb_publishable_5qseHMTluNbpBrK64yKlrg_WUbYkehZ";

const hdrs = {
  "Content-Type": "application/json",
  "apikey": SUPABASE_KEY,
  "Authorization": `Bearer ${SUPABASE_KEY}`,
  "Prefer": "return=representation",
};

const api = {
  async get(table, query = "") {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: hdrs });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async post(table, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: hdrs, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async patch(table, id, body) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: hdrs, body: JSON.stringify(body) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async delete(table, id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: hdrs });
    if (!r.ok) throw new Error(await r.text());
  },
  async uploadFoto(file) {
    const ext = file.name.split(".").pop();
    const nome = `${Date.now()}.${ext}`;
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/fotos-demandas/${nome}`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type },
      body: file
    });
    if (!r.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/fotos-demandas/${nome}`;
  },
  async uploadOficio(file) {
    const nome = `oficios/${Date.now()}_${file.name.replace(/\s/g,"_")}`;
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/fotos-demandas/${nome}`, {
      method: "POST",
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}`, "Content-Type": file.type },
      body: file
    });
    if (!r.ok) return null;
    return `${SUPABASE_URL}/storage/v1/object/public/fotos-demandas/${nome}`;
  }
};

const auth = {
  async signIn(email, senha) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password: senha })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error_description || data.msg || "Credenciais inválidas");
    return data;
  },
  async signUp(email, senha, nome) {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
      body: JSON.stringify({ email, password: senha, data: { nome } })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.msg || "Erro ao criar usuário");
    return data;
  },
  async signOut(token) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST", headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${token}` }
    });
  }
};

/* ══════════════════════════════════════════════════
   CATEGORIAS HIERÁRQUICAS
══════════════════════════════════════════════════ */
const GRUPOS = [
  {
    id: "areas_lazer", label: "Manutenção de Áreas de Lazer", icon: "🏟️", cor: "#10b981",
    subs: ["Manutenção de Quadras Esportivas","Manutenção de Praças","Manutenção de Parques","Instalação de Equipamentos de Lazer"]
  },
  {
    id: "vias_publicas", label: "Manutenção de Vias Públicas", icon: "🛣️", cor: "#ef4444",
    subs: ["Buraco na Via","Recapeamento","Pavimentação","Nivelamento de Rua","Guia e Sarjeta","Tapa Buraco"]
  },
  {
    id: "iluminacao", label: "Manutenção de Iluminação Pública", icon: "💡", cor: "#f59e0b",
    subs: ["Lâmpada Apagada","Poste Apagado","Manutenção de Iluminação","Instalação de Iluminação"]
  },
  {
    id: "limpeza_urbana", label: "Manutenção de Limpeza Urbana", icon: "🧹", cor: "#06b6d4",
    subs: ["Limpeza de Rua","Retirada de Entulho","Limpeza de Terreno","Varrição","Coleta de Lixo"]
  },
  {
    id: "areas_verdes", label: "Manutenção de Áreas Verdes", icon: "🌳", cor: "#22c55e",
    subs: ["Poda de Árvore","Corte de Árvore","Retirada de Árvore","Plantio de Árvore"]
  },
  {
    id: "drenagem", label: "Manutenção de Drenagem", icon: "🚧", cor: "#8b5cf6",
    subs: ["Bueiro Entupido","Boca de Lobo","Galeria de Água","Enchente / Alagamento"]
  },
  {
    id: "sinalizacao", label: "Manutenção de Sinalização Viária", icon: "🚦", cor: "#f97316",
    subs: ["Sinalização Horizontal","Sinalização Vertical","Faixa de Pedestre","Semáforo"]
  },
  {
    id: "mobilidade", label: "Serviços de Mobilidade Urbana", icon: "🚌", cor: "#3b82f6",
    subs: ["Alteração de Itinerário de Linha de Ônibus","Alteração de Programação de Linha de Ônibus","Apoio ao Trânsito e Transporte","Autorização para Intervenção na Via","Criação de Linha de Ônibus"]
  },
  {
    id: "calcadas", label: "Manutenção de Calçadas", icon: "🧱", cor: "#a16207",
    subs: ["Calçada Danificada","Acessibilidade","Obstrução de Calçada"]
  },
  {
    id: "equipamentos", label: "Manutenção de Equipamentos Públicos", icon: "🏫", cor: "#0891b2",
    subs: ["Manutenção de Escola","Manutenção de UBS","Manutenção de Prédio Público"]
  },
  {
    id: "seguranca", label: "Segurança Pública", icon: "🛡️", cor: "#dc2626",
    subs: ["Iluminação de Segurança","Apoio à Guarda Civil","Ocorrências Urbanas"]
  },
  {
    id: "outros", label: "Outros", icon: "📋", cor: "#6b7280",
    subs: ["Outros"]
  },
];

const STATUS_ZELA = ["Aguardando Abertura","Aberto no ZELA","Em Análise","Em Execução","Concluído no ZELA","Cancelado"];

const STATUS_MAP = {
  pendente:  { label: "Pendente",     cor: "#d97706", bg: "#fef3c7" },
  andamento: { label: "Em Andamento", cor: "#2563eb", bg: "#dbeafe" },
  concluido: { label: "Concluído",    cor: "#16a34a", bg: "#dcfce7" },
  cancelado: { label: "Cancelado",    cor: "#dc2626", bg: "#fee2e2" },
};

/* ══════════════════════════════════════════════════
   EXPORTAÇÕES
══════════════════════════════════════════════════ */
function exportarPDF(demandas) {
  const data = new Date().toLocaleDateString("pt-BR");
  const rows = demandas.map(d => {
    const grupo = GRUPOS.find(g => g.id === d.categoria);
    const st = STATUS_MAP[d.status];
    return `<tr>
      <td>${grupo?.icon||""} ${d.subcategoria||grupo?.label||d.categoria}</td>
      <td><strong>${d.titulo}</strong></td>
      <td>${d.bairro||"—"}</td>
      <td><span style="background:${st?.bg};color:${st?.cor};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700">${st?.label}</span></td>
      <td>${d.numero_oficio||"—"}</td>
      <td>${d.numero_zela||"—"}</td>
      <td>${d.status_zela||"—"}</td>
      <td>${new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
    </tr>`;
  }).join("");
  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Demandas</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;padding:28px;font-size:12px;color:#1e293b}
.h{display:flex;align-items:center;gap:14px;padding-bottom:16px;border-bottom:3px solid #0f172a;margin-bottom:20px}
.logo{width:48px;height:48px;background:linear-gradient(135deg,#1d4ed8,#10b981);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:24px}
h1{font-size:18px;font-weight:800}p{color:#64748b;font-size:12px}
.meta{display:flex;gap:12px;margin-bottom:18px}.mc{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:8px 14px}
.mc .n{font-size:20px;font-weight:800}.mc .l{font-size:10px;color:#94a3b8;text-transform:uppercase}
table{width:100%;border-collapse:collapse}th{background:#0f172a;color:#fff;padding:8px 10px;text-align:left;font-size:10px;text-transform:uppercase}
td{padding:8px 10px;border-bottom:1px solid #f1f5f9;vertical-align:middle}tr:nth-child(even)td{background:#f8fafc}
</style></head><body>
<div class="h"><div class="logo">🏛️</div><div><h1>Vereador Danilo Gomes</h1><p>Relatório de Demandas — ${data}</p></div></div>
<div class="meta">
  <div class="mc"><div class="n">${demandas.length}</div><div class="l">Total</div></div>
  <div class="mc"><div class="n" style="color:#d97706">${demandas.filter(d=>d.status==="pendente").length}</div><div class="l">Pendentes</div></div>
  <div class="mc"><div class="n" style="color:#2563eb">${demandas.filter(d=>d.status==="andamento").length}</div><div class="l">Andamento</div></div>
  <div class="mc"><div class="n" style="color:#16a34a">${demandas.filter(d=>d.status==="concluido").length}</div><div class="l">Concluídos</div></div>
  <div class="mc"><div class="n" style="color:#7c3aed">${demandas.filter(d=>d.numero_oficio).length}</div><div class="l">Com Ofício</div></div>
  <div class="mc"><div class="n" style="color:#0891b2">${demandas.filter(d=>d.numero_zela).length}</div><div class="l">No ZELA</div></div>
</div>
<table><thead><tr><th>Categoria</th><th>Título</th><th>Bairro</th><th>Status</th><th>Ofício</th><th>ZELA</th><th>Status ZELA</th><th>Data</th></tr></thead>
<tbody>${rows}</tbody></table>
<script>window.onload=()=>window.print()<\/script></body></html>`;
  const w = window.open("","_blank"); w.document.write(html); w.document.close();
}

function exportarExcel(demandas) {
  const h = ["ID","Título","Grupo","Subcategoria","Bairro","Endereço","CEP","Status","Nº Ofício","Nº ZELA","Status ZELA","Cadastrado Por","Data","Latitude","Longitude"];
  const rows = demandas.map(d => {
    const grupo = GRUPOS.find(g => g.id === d.categoria);
    return [d.id,`"${d.titulo}"`,`"${grupo?.label||d.categoria}"`,`"${d.subcategoria||""}"`,
      `"${d.bairro||""}"`,`"${d.endereco||""}"`,`"${d.cep||""}"`,
      `"${STATUS_MAP[d.status]?.label||d.status}"`,`"${d.numero_oficio||""}"`,
      `"${d.numero_zela||""}"`,`"${d.status_zela||""}"`,
      `"${d.criado_por||""}"`,new Date(d.created_at).toLocaleDateString("pt-BR"),
      d.latitude||"",d.longitude||""].join(";");
  });
  const csv = "\uFEFF" + [h.join(";"), ...rows].join("\n");
  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url;
  a.download=`demandas_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════
   CSS
══════════════════════════════════════════════════ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body,#root{font-family:'DM Sans',sans-serif;background:#eef2f7;min-height:100vh;color:#1e293b}
::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:99px}
.fade{animation:fadeUp .4s cubic-bezier(.22,.68,0,1.1) both}
.fade2{animation:fadeUp .4s .08s cubic-bezier(.22,.68,0,1.1) both}
.fade3{animation:fadeUp .4s .16s cubic-bezier(.22,.68,0,1.1) both}
.fade4{animation:fadeUp .4s .24s cubic-bezier(.22,.68,0,1.1) both}
@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.pop{animation:pop .32s cubic-bezier(.22,.68,0,1.3) both}
@keyframes pop{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
input:focus,select:focus,textarea:focus{outline:2px solid #3b82f6;outline-offset:1px}
input,select,textarea,button{font-family:inherit}
@media(max-width:768px){
  .sidebar{position:fixed;left:-240px;z-index:200;transition:left .28s ease;height:100vh}
  .sidebar.open{left:0}.main{margin-left:0!important}
  .sgrid{grid-template-columns:repeat(2,1fr)!important}
  .topbar{display:flex!important}
  .hide-mobile{display:none!important}
}
`;

/* ══════════════════════════════════════════════════
   APP
══════════════════════════════════════════════════ */
export default function App() {
  const [session, setSession]   = useState(null);
  const [tela, setTela]         = useState("login");
  const [demandas, setDemandas] = useState([]);
  const [loadingDB, setLoadingDB] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modal, setModal]       = useState(null);
  const [toast, setToast]       = useState(null);
  const [demandaEdicao, setDemandaEdicao] = useState(null);

  useEffect(() => {
    const s = document.createElement("style"); s.textContent = CSS;
    document.head.appendChild(s); return () => document.head.removeChild(s);
  }, []);

  useEffect(() => { if (session) carregarDemandas(); }, [session]);

  const showToast = (msg, tipo = "ok") => {
    setToast({ msg, tipo }); setTimeout(() => setToast(null), 3500);
  };

  const carregarDemandas = async () => {
    setLoadingDB(true);
    try {
      const data = await api.get("demandas", "order=created_at.desc");
      setDemandas(data);
    } catch(e) { showToast("Erro ao carregar: " + e.message, "erro"); }
    finally { setLoadingDB(false); }
  };

  const handleLogin = async (email, senha) => {
    try {
      const data = await auth.signIn(email, senha);
      setSession({ token: data.access_token, user: data.user });
      setTela("dashboard"); showToast("Bem-vindo! 👋"); return { ok: true };
    } catch(e) { return { ok: false, erro: e.message }; }
  };

  const handleLogout = async () => {
    if (session?.token) await auth.signOut(session.token);
    setSession(null); setDemandas([]); setTela("login");
  };

  const addDemanda = async (form, fotoFile, oficioFile) => {
    try {
      let foto_url = null, oficio_url = null;
      if (fotoFile)   foto_url   = await api.uploadFoto(fotoFile);
      if (oficioFile) oficio_url = await api.uploadOficio(oficioFile);
      const nova = {
        titulo: form.titulo, categoria: form.categoria,
        subcategoria: form.subcategoria || null,
        descricao: form.descricao || null,
        cep: form.cep || null, bairro: form.bairro || null,
        endereco: form.endereco || null,
        latitude: form.latitude || null, longitude: form.longitude || null,
        foto_url, status: "pendente",
        numero_oficio: form.numero_oficio || null,
        oficio_url,
        numero_zela: form.numero_zela || null,
        status_zela: form.status_zela || null,
        criado_por: session.user.user_metadata?.nome || session.user.email,
        criado_por_id: session.user.id,
      };
      const [criada] = await api.post("demandas", nova);
      setDemandas(p => [criada, ...p]);
      setModal(null); showToast("Demanda cadastrada! ✅");
    } catch(e) { showToast("Erro ao salvar: " + e.message, "erro"); }
  };

  const updateDemanda = async (id, changes) => {
    try {
      await api.patch("demandas", id, changes);
      setDemandas(p => p.map(d => d.id === id ? { ...d, ...changes } : d));
      if (changes.status) showToast(`Status: ${STATUS_MAP[changes.status]?.label} ✓`);
      else showToast("Atualizado! ✓");
    } catch(e) { showToast("Erro: " + e.message, "erro"); }
  };

  const deleteDemanda = async (id) => {
    try {
      await api.delete("demandas", id);
      setDemandas(p => p.filter(d => d.id !== id));
      showToast("Demanda removida.", "info");
    } catch(e) { showToast("Erro: " + e.message, "erro"); }
  };

  if (tela === "login") return <TelaLogin onLogin={handleLogin} />;

  const nomeUsuario = session?.user?.user_metadata?.nome || session?.user?.email || "Usuário";
  const isAdmin = session?.user?.email?.includes("danilo");

  return (
    <div style={{ display:"flex", minHeight:"100vh" }}>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:199 }} />}
      <Sidebar tela={tela} setTela={t => { setTela(t); setSidebarOpen(false); }}
        onLogout={handleLogout} nome={nomeUsuario} isAdmin={isAdmin}
        className={`sidebar${sidebarOpen?" open":""}`} />
      <div className="main" style={{ flex:1, marginLeft:240, overflow:"auto" }}>
        <div className="topbar" style={{ display:"none", padding:"12px 16px", background:"#0a1628", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:100 }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background:"none", border:"none", color:"#fff", fontSize:22, cursor:"pointer" }}>☰</button>
          <span style={{ fontFamily:"Sora", fontWeight:700, color:"#fff", fontSize:15 }}>Danilo Gomes</span>
          {loadingDB && <span style={{ marginLeft:"auto", fontSize:12, color:"rgba(255,255,255,.4)" }}>⏳</span>}
        </div>
        <div style={{ padding:"28px 24px" }}>
          {tela === "dashboard"  && <Dashboard demandas={demandas} nome={nomeUsuario} setTela={setTela} setModal={setModal} />}
          {tela === "demandas"   && <TelaDemandas demandas={demandas} setModal={setModal} onUpdate={updateDemanda} onDelete={deleteDemanda} onReload={carregarDemandas} setDemandaEdicao={setDemandaEdicao} />}
          {tela === "usuarios"   && isAdmin && <TelaUsuarios showToast={showToast} />}
          {tela === "relatorios" && <TelaRelatorios demandas={demandas} showToast={showToast} />}
        </div>
      </div>

      {modal === "nova-demanda" && (
        <ModalDemanda onSalvar={addDemanda} onFechar={() => setModal(null)} />
      )}
      {demandaEdicao && (
        <ModalDetalhe demanda={demandaEdicao} onFechar={() => setDemandaEdicao(null)}
          onStatus={s => updateDemanda(demandaEdicao.id, { status: s })}
          onSalvarOficio={(id, dados) => { updateDemanda(id, dados); setDemandaEdicao(p => ({...p, ...dados})); }} />
      )}

      {toast && (
        <div className="pop" style={{ position:"fixed", bottom:24, left:"50%", transform:"translateX(-50%)", background: toast.tipo==="erro"?"#7f1d1d":"#0f172a", borderLeft:`4px solid ${toast.tipo==="erro"?"#ef4444":toast.tipo==="info"?"#3b82f6":"#10b981"}`, color:"#fff", padding:"12px 20px", borderRadius:12, zIndex:9999, boxShadow:"0 8px 32px rgba(0,0,0,.3)", fontSize:14, fontWeight:500, whiteSpace:"nowrap" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   LOGIN
══════════════════════════════════════════════════ */
function TelaLogin({ onLogin }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro]   = useState("");
  const [loading, setLoading] = useState(false);
  const go = async () => {
    if (!email||!senha) return;
    setLoading(true); setErro("");
    const r = await onLogin(email, senha);
    if (!r.ok) { setErro(r.erro); setLoading(false); }
  };
  return (
    <div style={{ minHeight:"100vh", display:"flex", background:"#080f1a", overflow:"hidden" }}>
      <div style={{ flex:1, background:"linear-gradient(145deg,#0f1f3d,#0d2a4a)", display:"flex", alignItems:"center", justifyContent:"center", padding:48, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", width:500, height:500, borderRadius:"50%", background:"radial-gradient(circle,rgba(59,130,246,.12) 0%,transparent 70%)", top:"5%", left:"15%", pointerEvents:"none" }} />
        <svg style={{ position:"absolute", inset:0, opacity:.04, pointerEvents:"none" }} width="100%" height="100%">
          <defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0L0 0 0 40" fill="none" stroke="#60a5fa" strokeWidth="1"/></pattern></defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
        </svg>
        <div className="fade" style={{ zIndex:1, maxWidth:360, textAlign:"center" }}>
          <div style={{ width:88, height:88, borderRadius:24, background:"linear-gradient(135deg,#1d4ed8,#10b981)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, margin:"0 auto 24px", boxShadow:"0 16px 48px rgba(29,78,216,.4)" }}>🏛️</div>
          <h1 style={{ fontFamily:"Sora", fontWeight:800, fontSize:28, color:"#fff", letterSpacing:"-1px", lineHeight:1.2 }}>
            Gabinete Digital<br/>
            <span style={{ background:"linear-gradient(90deg,#60a5fa,#34d399)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>Danilo Gomes</span>
          </h1>
          <p style={{ color:"rgba(255,255,255,.4)", marginTop:14, fontSize:14, lineHeight:1.7 }}>Sistema oficial de gestão<br/>de demandas do mandato</p>
        </div>
      </div>
      <div style={{ width:420, display:"flex", alignItems:"center", justifyContent:"center", padding:40, background:"#080f1a" }}>
        <div className="fade2" style={{ width:"100%" }}>
          <h2 style={{ fontFamily:"Sora", fontWeight:800, fontSize:24, color:"#fff", marginBottom:6 }}>Entrar no sistema</h2>
          <p style={{ color:"rgba(255,255,255,.35)", marginBottom:32, fontSize:14 }}>Acesso para assessores autorizados</p>
          <div style={{ marginBottom:14 }}>
            <label style={lbS}>E-mail</label>
            <input type="email" value={email} onChange={e=>{setEmail(e.target.value);setErro("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="seu@email.com" style={liS} />
          </div>
          <div style={{ marginBottom:24 }}>
            <label style={lbS}>Senha</label>
            <input type="password" value={senha} onChange={e=>{setSenha(e.target.value);setErro("");}} onKeyDown={e=>e.key==="Enter"&&go()} placeholder="••••••••" style={liS} />
          </div>
          {erro && <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.25)", borderRadius:10, padding:"10px 14px", color:"#fca5a5", fontSize:13, marginBottom:18 }}>⚠️ {erro}</div>}
          <button onClick={go} disabled={loading||!email||!senha} style={{ width:"100%", padding:14, borderRadius:12, border:"none", background:(!email||!senha)?"rgba(255,255,255,.05)":"linear-gradient(135deg,#1d4ed8,#10b981)", color:(!email||!senha)?"rgba(255,255,255,.2)":"#fff", fontWeight:700, fontSize:15, cursor:(!email||!senha)?"not-allowed":"pointer", transition:"all .2s" }}>
            {loading?"⏳ Verificando...":"Acessar o sistema →"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════ */
function Sidebar({ tela, setTela, onLogout, nome, isAdmin, className }) {
  const menus = [
    { id:"dashboard",  icon:"◉", label:"Dashboard" },
    { id:"demandas",   icon:"≡", label:"Demandas" },
    ...(isAdmin?[{ id:"usuarios", icon:"⊕", label:"Usuários" }]:[]),
    { id:"relatorios", icon:"▦", label:"Relatórios" },
  ];
  return (
    <aside className={className} style={{ width:240, background:"#0a1628", borderRight:"1px solid rgba(255,255,255,.05)", display:"flex", flexDirection:"column", minHeight:"100vh", position:"fixed", top:0, left:0, zIndex:100 }}>
      <div style={{ padding:"22px 18px 16px", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:11, background:"linear-gradient(135deg,#1d4ed8,#10b981)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>🏛️</div>
          <div>
            <div style={{ fontFamily:"Sora", fontWeight:700, fontSize:13, color:"#fff" }}>Danilo Gomes</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", textTransform:"uppercase", letterSpacing:".5px" }}>Vereador · Gabinete</div>
          </div>
        </div>
      </div>
      <nav style={{ flex:1, padding:"12px 10px" }}>
        {menus.map(m => {
          const a = tela===m.id;
          return <button key={m.id} onClick={()=>setTela(m.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:9, border:"none", marginBottom:2, background:a?"rgba(59,130,246,.12)":"transparent", color:a?"#60a5fa":"rgba(255,255,255,.4)", fontSize:14, fontWeight:a?600:400, textAlign:"left", cursor:"pointer", transition:"all .15s", borderLeft:`3px solid ${a?"#3b82f6":"transparent"}` }}>
            <span style={{ fontSize:16, width:20, textAlign:"center" }}>{m.icon}</span>{m.label}
          </button>;
        })}
      </nav>
      <div style={{ padding:"12px 10px 16px", borderTop:"1px solid rgba(255,255,255,.05)" }}>
        <div style={{ padding:"10px 12px", borderRadius:10, background:"rgba(255,255,255,.03)", marginBottom:8 }}>
          <div style={{ color:"#e2e8f0", fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{nome}</div>
          <div style={{ color:"rgba(255,255,255,.3)", fontSize:11, marginTop:2 }}>{isAdmin?"🔑 Administrador":"👤 Assessor"}</div>
        </div>
        <button onClick={onLogout} style={{ width:"100%", padding:8, borderRadius:9, border:"1px solid rgba(239,68,68,.15)", background:"rgba(239,68,68,.05)", color:"rgba(239,68,68,.65)", fontSize:13, cursor:"pointer" }}>↩ Sair</button>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════
   DASHBOARD
══════════════════════════════════════════════════ */
function Dashboard({ demandas, nome, setTela, setModal }) {
  const total = demandas.length;
  const stats = [
    { label:"Total",        valor:total, cor:"#3b82f6", bg:"#eff6ff", icon:"📋" },
    { label:"Pendentes",    valor:demandas.filter(d=>d.status==="pendente").length,  cor:"#d97706", bg:"#fffbeb", icon:"⏳" },
    { label:"Em Andamento", valor:demandas.filter(d=>d.status==="andamento").length, cor:"#7c3aed", bg:"#f5f3ff", icon:"🔄" },
    { label:"Concluídos",   valor:demandas.filter(d=>d.status==="concluido").length, cor:"#16a34a", bg:"#f0fdf4", icon:"✅" },
  ];
  const recentes = demandas.slice(0,6);
  const comOficio = demandas.filter(d=>d.numero_oficio).length;
  const comZela   = demandas.filter(d=>d.numero_zela).length;
  return (
    <div>
      <div className="fade" style={{ marginBottom:22 }}>
        <h1 style={{ fontFamily:"Sora", fontWeight:800, fontSize:26, color:"#0f172a", letterSpacing:"-.5px" }}>Olá, {nome.split(" ")[0]}! 👋</h1>
        <p style={{ color:"#64748b", marginTop:4, fontSize:14 }}>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}</p>
      </div>
      <div className="fade2 sgrid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:16 }}>
        {stats.map(s=>(
          <div key={s.label} style={{ background:"#fff", borderRadius:14, padding:"18px 20px", boxShadow:"0 1px 8px rgba(0,0,0,.05)", border:"1px solid #f1f5f9" }}>
            <div style={{ display:"flex", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontSize:11, fontWeight:700, color:"#94a3b8", textTransform:"uppercase", letterSpacing:".5px", marginBottom:8 }}>{s.label}</div>
                <div style={{ fontFamily:"Sora", fontWeight:800, fontSize:34, color:s.cor, lineHeight:1 }}>{s.valor}</div>
              </div>
              <div style={{ width:42, height:42, borderRadius:11, background:s.bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>
      {/* Cards ofício e ZELA */}
      <div className="fade3" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:16 }}>
        <div style={{ background:"linear-gradient(135deg,#1e3a5f,#0f172a)", borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(59,130,246,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>📄</div>
          <div>
            <div style={{ fontFamily:"Sora", fontWeight:800, fontSize:26, color:"#60a5fa" }}>{comOficio}</div>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:13 }}>Demandas com Ofício</div>
          </div>
        </div>
        <div style={{ background:"linear-gradient(135deg,#1e3a5f,#0f172a)", borderRadius:14, padding:"16px 20px", display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:"rgba(16,185,129,.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🏛️</div>
          <div>
            <div style={{ fontFamily:"Sora", fontWeight:800, fontSize:26, color:"#34d399" }}>{comZela}</div>
            <div style={{ color:"rgba(255,255,255,.5)", fontSize:13 }}>Abertas no ZELA</div>
          </div>
        </div>
      </div>
      <div className="fade4" style={{ display:"grid", gridTemplateColumns:"1.6fr 1fr", gap:16 }}>
        <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1px solid #f1f5f9", boxShadow:"0 1px 8px rgba(0,0,0,.05)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h3 style={{ fontFamily:"Sora", fontWeight:700, fontSize:15, color:"#0f172a" }}>Demandas Recentes</h3>
            <button onClick={()=>setTela("demandas")} style={{ background:"none", border:"none", color:"#3b82f6", fontSize:13, fontWeight:600, cursor:"pointer" }}>Ver todas →</button>
          </div>
          {recentes.length===0
            ? <div style={{ textAlign:"center", padding:"32px 0", color:"#94a3b8" }}><div style={{fontSize:40,marginBottom:8}}>📭</div><p style={{fontSize:14}}>Nenhuma demanda ainda</p></div>
            : recentes.map(d=>{
              const grupo = GRUPOS.find(g=>g.id===d.categoria);
              const st = STATUS_MAP[d.status];
              return (
                <div key={d.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"9px 0", borderBottom:"1px solid #f8fafc" }}>
                  <div style={{ width:34, height:34, borderRadius:9, background:(grupo?.cor||"#6b7280")+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:17, flexShrink:0 }}>{grupo?.icon||"📋"}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, fontWeight:600, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.titulo}</div>
                    <div style={{ fontSize:11, color:"#94a3b8" }}>{d.subcategoria||grupo?.label} · {d.bairro||"Sem bairro"}</div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:3 }}>
                    <span style={{ padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:700, background:st?.bg, color:st?.cor }}>{st?.label}</span>
                    {d.numero_oficio && <span style={{ fontSize:10, color:"#3b82f6" }}>📄 {d.numero_oficio}</span>}
                    {d.numero_zela   && <span style={{ fontSize:10, color:"#10b981" }}>ZELA {d.numero_zela}</span>}
                  </div>
                </div>
              );
            })}
        </div>
        <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1px solid #f1f5f9", boxShadow:"0 1px 8px rgba(0,0,0,.05)" }}>
          <h3 style={{ fontFamily:"Sora", fontWeight:700, fontSize:15, color:"#0f172a", marginBottom:18 }}>Por Grupo</h3>
          {GRUPOS.filter(g=>g.id!=="outros").map(g=>{
            const qtd = demandas.filter(d=>d.categoria===g.id).length;
            if (!qtd) return null;
            return (
              <div key={g.id} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ fontSize:12, color:"#374151" }}>{g.icon} {g.label.replace("Manutenção de ","")}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:g.cor }}>{qtd}</span>
                </div>
                <div style={{ height:5, borderRadius:3, background:"#f1f5f9" }}>
                  <div style={{ height:"100%", borderRadius:3, background:g.cor, width:`${total>0?(qtd/total)*100:0}%`, transition:"width .8s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TELA DEMANDAS
══════════════════════════════════════════════════ */
function TelaDemandas({ demandas, setModal, onUpdate, onDelete, onReload, setDemandaEdicao }) {
  const [filtro, setFiltro] = useState({ busca:"", grupo:"", status:"" });

  const filtradas = demandas.filter(d => {
    const q = filtro.busca.toLowerCase();
    return (
      (!q || d.titulo?.toLowerCase().includes(q) || d.bairro?.toLowerCase().includes(q) || d.subcategoria?.toLowerCase().includes(q)) &&
      (!filtro.grupo   || d.categoria === filtro.grupo) &&
      (!filtro.status  || d.status    === filtro.status)
    );
  });

  return (
    <div>
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Sora", fontWeight:800, fontSize:26, color:"#0f172a" }}>Demandas</h1>
          <p style={{ color:"#64748b", fontSize:14, marginTop:2 }}>{filtradas.length} de {demandas.length}</p>
        </div>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={onReload}                        style={btnSec}>🔄</button>
          <button onClick={()=>exportarPDF(filtradas)}      style={btnSec}>⬇ PDF</button>
          <button onClick={()=>exportarExcel(filtradas)}    style={btnSec}>⬇ Excel</button>
          <button onClick={()=>setModal("nova-demanda")}    style={btnPri}>＋ Nova Demanda</button>
        </div>
      </div>
      <div className="fade2" style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
        <input placeholder="🔍 Buscar..." value={filtro.busca} onChange={e=>setFiltro({...filtro,busca:e.target.value})} style={{ flex:1, minWidth:180, ...iBase }} />
        <select value={filtro.grupo} onChange={e=>setFiltro({...filtro,grupo:e.target.value})} style={iBase}>
          <option value="">Todos os Grupos</option>
          {GRUPOS.map(g=><option key={g.id} value={g.id}>{g.icon} {g.label}</option>)}
        </select>
        <select value={filtro.status} onChange={e=>setFiltro({...filtro,status:e.target.value})} style={iBase}>
          <option value="">Todos Status</option>
          {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        {(filtro.busca||filtro.grupo||filtro.status) && (
          <button onClick={()=>setFiltro({busca:"",grupo:"",status:""})} style={{...iBase,cursor:"pointer",color:"#ef4444",background:"#fff5f5",border:"1px solid #fecaca"}}>✕</button>
        )}
      </div>
      <div className="fade3" style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {filtradas.length===0
          ? <div style={{ textAlign:"center", padding:"60px 0", background:"#fff", borderRadius:16, border:"1px solid #f1f5f9" }}>
              <div style={{fontSize:52,marginBottom:12}}>📭</div>
              <h3 style={{ fontFamily:"Sora", fontWeight:700, color:"#0f172a" }}>Nenhuma demanda encontrada</h3>
            </div>
          : filtradas.map(d=>(
            <CardDemanda key={d.id} demanda={d}
              onVer={()=>setDemandaEdicao(d)}
              onStatus={s=>onUpdate(d.id,{status:s})}
              onDelete={()=>{ if(window.confirm("Remover esta demanda?")) onDelete(d.id); }} />
          ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   CARD DEMANDA
══════════════════════════════════════════════════ */
function CardDemanda({ demanda:d, onVer, onStatus, onDelete }) {
  const grupo = GRUPOS.find(g=>g.id===d.categoria);
  const st = STATUS_MAP[d.status];
  return (
    <div style={{ background:"#fff", borderRadius:14, padding:"14px 18px", border:"1px solid #f1f5f9", boxShadow:"0 1px 6px rgba(0,0,0,.04)", display:"flex", alignItems:"center", gap:14, cursor:"pointer", transition:"all .15s" }}
      onClick={onVer}
      onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,.09)";e.currentTarget.style.transform="translateY(-1px)"}}
      onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 6px rgba(0,0,0,.04)";e.currentTarget.style.transform="none"}}>
      <div style={{ width:44, height:44, borderRadius:12, background:(grupo?.cor||"#6b7280")+"15", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, flexShrink:0 }}>{grupo?.icon||"📋"}</div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3, flexWrap:"wrap" }}>
          <span style={{ fontWeight:700, fontSize:14, color:"#1e293b" }}>{d.titulo}</span>
          <span style={{ padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:700, background:st?.bg, color:st?.cor }}>{st?.label}</span>
          {d.numero_oficio && <span style={{ padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:600, background:"#eff6ff", color:"#1d4ed8" }}>📄 {d.numero_oficio}</span>}
          {d.numero_zela   && <span style={{ padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:600, background:"#f0fdf4", color:"#15803d" }}>ZELA {d.numero_zela}</span>}
        </div>
        <div style={{ display:"flex", gap:12, color:"#94a3b8", fontSize:12, flexWrap:"wrap" }}>
          <span>{grupo?.icon} {d.subcategoria||grupo?.label}</span>
          {d.bairro  && <span>📍 {d.bairro}</span>}
          <span>📅 {new Date(d.created_at).toLocaleDateString("pt-BR")}</span>
          <span>👤 {d.criado_por}</span>
          {d.foto_url    && <span>📷</span>}
          {d.latitude    && <span>🗺️</span>}
        </div>
      </div>
      <div style={{ display:"flex", gap:6, flexShrink:0 }} onClick={e=>e.stopPropagation()}>
        {Object.entries(STATUS_MAP).filter(([k])=>k!==d.status).slice(0,2).map(([k,v])=>(
          <button key={k} onClick={()=>onStatus(k)} style={{ padding:"5px 10px", borderRadius:7, border:`1px solid ${v.cor}40`, background:v.bg, color:v.cor, fontSize:11, fontWeight:700, cursor:"pointer" }}>{v.label}</button>
        ))}
        <button onClick={onDelete} style={{ padding:"5px 9px", borderRadius:7, border:"1px solid #fecaca", background:"#fff5f5", color:"#ef4444", fontSize:12, cursor:"pointer" }}>🗑</button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MODAL NOVA DEMANDA
══════════════════════════════════════════════════ */
function ModalDemanda({ onSalvar, onFechar }) {
  const [form, setForm]     = useState({ titulo:"", categoria:"", subcategoria:"", descricao:"", cep:"", bairro:"", endereco:"", latitude:"", longitude:"", numero_oficio:"", numero_zela:"", status_zela:"" });
  const [fotoFile, setFotoFile]   = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [oficioFile, setOficioFile]   = useState(null);
  const [geoLoad, setGeoLoad] = useState(false);
  const [geoErro, setGeoErro] = useState("");
  const [cepLoad, setCepLoad] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [step, setStep]     = useState(1); // 1=info, 2=localização, 3=ofício/zela
  const fotoRef   = useRef();
  const oficioRef = useRef();
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const buscarCEP = async (cep) => {
    const c = cep.replace(/\D/g,"");
    if (c.length!==8) return;
    setCepLoad(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const d = await r.json();
      if (!d.erro) {
        set("bairro", d.bairro||"");
        set("endereco", `${d.logradouro||""}`);
      }
    } catch{} finally { setCepLoad(false); }
  };

  const pegarGPS = () => {
    if (!navigator.geolocation) { setGeoErro("GPS não suportado."); return; }
    setGeoLoad(true); setGeoErro("");
    navigator.geolocation.getCurrentPosition(
      p=>{ set("latitude",p.coords.latitude.toFixed(6)); set("longitude",p.coords.longitude.toFixed(6)); setGeoLoad(false); },
      ()=>{ setGeoErro("Não foi possível obter o GPS."); setGeoLoad(false); }
    );
  };

  const handleFoto = e => {
    const f=e.target.files[0]; if(!f) return;
    setFotoFile(f);
    const r=new FileReader(); r.onload=ev=>setFotoPreview(ev.target.result); r.readAsDataURL(f);
  };

  const grupoSelecionado = GRUPOS.find(g=>g.id===form.categoria);
  const valido = form.titulo.trim() && form.categoria;

  const salvar = async () => {
    if (!valido) return;
    setSalvando(true);
    await onSalvar(form, fotoFile, oficioFile);
    setSalvando(false);
  };

  const steps = ["📋 Informações","📍 Localização","📄 Ofício & ZELA"];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:600, maxHeight:"92vh", overflow:"auto", boxShadow:"0 32px 80px rgba(0,0,0,.25)" }}>
        {/* Header */}
        <div style={{ padding:"20px 26px 0", position:"sticky", top:0, background:"#fff", zIndex:2 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div>
              <h2 style={{ fontFamily:"Sora", fontWeight:800, fontSize:20, color:"#0f172a" }}>Nova Demanda</h2>
              <p style={{ color:"#94a3b8", fontSize:13, marginTop:2 }}>Salvo direto no banco de dados ☁️</p>
            </div>
            <button onClick={onFechar} style={{ width:34, height:34, borderRadius:9, border:"1px solid #e2e8f0", background:"#f8fafc", fontSize:18, cursor:"pointer" }}>×</button>
          </div>
          {/* Steps */}
          <div style={{ display:"flex", gap:0, marginBottom:0 }}>
            {steps.map((s,i)=>(
              <button key={i} onClick={()=>setStep(i+1)} style={{ flex:1, padding:"10px 6px", border:"none", borderBottom:`3px solid ${step===i+1?"#1d4ed8":"#f1f5f9"}`, background:"#fff", color:step===i+1?"#1d4ed8":step>i+1?"#10b981":"#94a3b8", fontSize:12, fontWeight:step===i+1?700:500, cursor:"pointer", transition:"all .15s" }}>
                {step>i+1?"✓ ":""}{s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding:"20px 26px" }}>
          {/* STEP 1 */}
          {step===1 && <>
            <Campo label="Título *">
              <input value={form.titulo} onChange={e=>set("titulo",e.target.value)} placeholder="Descreva brevemente a demanda" style={{...iBase,width:"100%"}} />
            </Campo>
            <Campo label="Grupo / Categoria *">
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                {GRUPOS.map(g=>(
                  <button key={g.id} onClick={()=>{ set("categoria",g.id); set("subcategoria",""); }} style={{ padding:"10px 8px", borderRadius:10, cursor:"pointer", border:`2px solid ${form.categoria===g.id?g.cor:"#e2e8f0"}`, background:form.categoria===g.id?g.cor+"12":"#fafafa", color:form.categoria===g.id?g.cor:"#64748b", fontSize:11, fontWeight:600, display:"flex", flexDirection:"column", alignItems:"center", gap:4, transition:"all .15s" }}>
                    <span style={{fontSize:22}}>{g.icon}</span>
                    <span style={{textAlign:"center",lineHeight:1.2,fontSize:10}}>{g.label.replace("Manutenção de ","").replace("Serviços de ","")}</span>
                  </button>
                ))}
              </div>
            </Campo>
            {grupoSelecionado && grupoSelecionado.subs.length>1 && (
              <Campo label="Subcategoria">
                <select value={form.subcategoria} onChange={e=>set("subcategoria",e.target.value)} style={{...iBase,width:"100%"}}>
                  <option value="">Selecione a subcategoria</option>
                  {grupoSelecionado.subs.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </Campo>
            )}
            <Campo label="Descrição">
              <textarea value={form.descricao} onChange={e=>set("descricao",e.target.value)} placeholder="Detalhe o problema..." rows={3} style={{...iBase,width:"100%",resize:"vertical"}} />
            </Campo>
            <Campo label="📷 Foto do Problema">
              <div onClick={()=>fotoRef.current?.click()} style={{ border:"2px dashed #e2e8f0", borderRadius:12, padding:fotoPreview?8:24, textAlign:"center", cursor:"pointer", background:"#fafafa" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor="#3b82f6"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}>
                {fotoPreview
                  ? <div><img src={fotoPreview} alt="" style={{maxWidth:"100%",maxHeight:180,borderRadius:8,objectFit:"cover"}}/><p style={{color:"#94a3b8",fontSize:11,marginTop:6}}>Clique para trocar</p></div>
                  : <div><div style={{fontSize:36,marginBottom:6}}>📷</div><p style={{fontWeight:600,color:"#475569",fontSize:14}}>Adicionar foto</p><p style={{color:"#94a3b8",fontSize:12,marginTop:2}}>Câmera ou galeria</p></div>}
              </div>
              <input ref={fotoRef} type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{display:"none"}} />
            </Campo>
          </>}

          {/* STEP 2 */}
          {step===2 && <>
            <Campo label="CEP">
              <div style={{ display:"flex", gap:8 }}>
                <input value={form.cep} onChange={e=>{ const v=e.target.value.replace(/\D/g,"").slice(0,8); set("cep",v); if(v.length===8) buscarCEP(v); }} placeholder="00000000" maxLength={8} style={{...iBase,flex:1}} />
                {cepLoad && <span style={{padding:"9px 12px",fontSize:13,color:"#64748b"}}>⏳ Buscando...</span>}
              </div>
              <p style={{color:"#94a3b8",fontSize:11,marginTop:4}}>Digite o CEP para preencher bairro e endereço automaticamente</p>
            </Campo>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Campo label="Bairro"><input value={form.bairro} onChange={e=>set("bairro",e.target.value)} placeholder="Nome do bairro" style={{...iBase,width:"100%"}} /></Campo>
              <Campo label="Endereço"><input value={form.endereco} onChange={e=>set("endereco",e.target.value)} placeholder="Rua, nº" style={{...iBase,width:"100%"}} /></Campo>
            </div>
            <Campo label="📍 Localização GPS">
              <div style={{ display:"flex", gap:8 }}>
                <div style={{ flex:1, display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <input value={form.latitude}  onChange={e=>set("latitude", e.target.value)} placeholder="Latitude"  style={{...iBase,width:"100%"}} />
                  <input value={form.longitude} onChange={e=>set("longitude",e.target.value)} placeholder="Longitude" style={{...iBase,width:"100%"}} />
                </div>
                <button onClick={pegarGPS} disabled={geoLoad} style={{...btnPri, height:42, padding:"0 14px", fontSize:13, whiteSpace:"nowrap", background:geoLoad?"#e2e8f0":"linear-gradient(135deg,#3b82f6,#10b981)", color:geoLoad?"#94a3b8":"#fff", flexShrink:0}}>
                  {geoLoad?"⏳":"📍 GPS"}
                </button>
              </div>
              {geoErro && <p style={{color:"#ef4444",fontSize:12,marginTop:6}}>{geoErro}</p>}
              {form.latitude && <p style={{color:"#16a34a",fontSize:12,marginTop:6}}>✅ {form.latitude}, {form.longitude}</p>}
            </Campo>
          </>}

          {/* STEP 3 */}
          {step===3 && <>
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:12, padding:"14px 18px", marginBottom:20 }}>
              <div style={{ fontWeight:700, color:"#1e40af", fontSize:14, marginBottom:4 }}>📄 Ofício</div>
              <p style={{ color:"#1e40af", fontSize:13 }}>Preencha após a elaboração do ofício pela assessoria</p>
            </div>
            <Campo label="Número do Ofício">
              <input value={form.numero_oficio} onChange={e=>set("numero_oficio",e.target.value)} placeholder="Ex: 0234/2024" style={{...iBase,width:"100%"}} />
            </Campo>
            <Campo label="Anexar PDF do Ofício">
              <div onClick={()=>oficioRef.current?.click()} style={{ border:"2px dashed #e2e8f0", borderRadius:12, padding:18, textAlign:"center", cursor:"pointer", background:"#fafafa" }}
                onMouseEnter={e=>e.currentTarget.style.borderColor="#3b82f6"}
                onMouseLeave={e=>e.currentTarget.style.borderColor="#e2e8f0"}>
                {oficioFile
                  ? <div><div style={{fontSize:32,marginBottom:4}}>📄</div><p style={{fontWeight:600,color:"#1d4ed8",fontSize:13}}>{oficioFile.name}</p><p style={{color:"#94a3b8",fontSize:11,marginTop:4}}>Clique para trocar</p></div>
                  : <div><div style={{fontSize:32,marginBottom:6}}>📎</div><p style={{fontWeight:600,color:"#475569",fontSize:14}}>Anexar PDF do ofício</p><p style={{color:"#94a3b8",fontSize:12,marginTop:2}}>Clique para selecionar</p></div>}
              </div>
              <input ref={oficioRef} type="file" accept=".pdf" onChange={e=>{const f=e.target.files[0];if(f)setOficioFile(f);}} style={{display:"none"}} />
            </Campo>

            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:12, padding:"14px 18px", marginBottom:20, marginTop:8 }}>
              <div style={{ fontWeight:700, color:"#15803d", fontSize:14, marginBottom:4 }}>🏛️ ZELA — Prefeitura de Guarulhos</div>
              <p style={{ color:"#15803d", fontSize:13 }}>Número do protocolo no sistema da prefeitura</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              <Campo label="Número do Protocolo ZELA">
                <input value={form.numero_zela} onChange={e=>set("numero_zela",e.target.value)} placeholder="Ex: 2024/123456" style={{...iBase,width:"100%"}} />
              </Campo>
              <Campo label="Status no ZELA">
                <select value={form.status_zela} onChange={e=>set("status_zela",e.target.value)} style={{...iBase,width:"100%"}}>
                  <option value="">Selecione o status</option>
                  {STATUS_ZELA.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </Campo>
            </div>
          </>}
        </div>

        {/* Footer */}
        <div style={{ padding:"14px 26px 22px", borderTop:"1px solid #f1f5f9", display:"flex", gap:10, justifyContent:"space-between", position:"sticky", bottom:0, background:"#fff" }}>
          <div style={{ display:"flex", gap:8 }}>
            {step>1 && <button onClick={()=>setStep(s=>s-1)} style={btnCancel}>← Voltar</button>}
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={onFechar} style={btnCancel}>Cancelar</button>
            {step<3
              ? <button onClick={()=>setStep(s=>s+1)} disabled={step===1&&!valido} style={{...btnPri, opacity:step===1&&!valido?.5:1}}>Próximo →</button>
              : <button onClick={salvar} disabled={!valido||salvando} style={{...btnPri, opacity:(!valido||salvando)?.5:1}}>
                  {salvando?"⏳ Salvando...":"Cadastrar Demanda ✓"}
                </button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MODAL DETALHE (com edição de ofício e ZELA)
══════════════════════════════════════════════════ */
function ModalDetalhe({ demanda:d, onFechar, onStatus, onSalvarOficio }) {
  const grupo = GRUPOS.find(g=>g.id===d.categoria);
  const st = STATUS_MAP[d.status];
  const [editOficio, setEditOficio] = useState(false);
  const [oficio, setOficio]   = useState({ numero_oficio:d.numero_oficio||"", numero_zela:d.numero_zela||"", status_zela:d.status_zela||"" });
  const [oficioFile, setOficioFile] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const oficioRef = useRef();
  const [tab, setTab] = useState("info");

  const salvarOficio = async () => {
    setSalvando(true);
    let oficio_url = d.oficio_url;
    if (oficioFile) oficio_url = await api.uploadOficio(oficioFile);
    onSalvarOficio(d.id, { ...oficio, oficio_url });
    setEditOficio(false); setSalvando(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.6)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:16 }}>
      <div className="pop" style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:540, maxHeight:"92vh", overflow:"auto", boxShadow:"0 32px 80px rgba(0,0,0,.25)" }}>
        <div style={{ padding:"18px 24px 0", position:"sticky", top:0, background:"#fff", zIndex:2 }}>
          <div style={{ display:"flex", gap:12, alignItems:"center", marginBottom:16 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:(grupo?.cor||"#6b7280")+"15", display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, flexShrink:0 }}>{grupo?.icon||"📋"}</div>
            <div style={{ flex:1 }}>
              <h2 style={{ fontFamily:"Sora", fontWeight:800, fontSize:17, color:"#0f172a" }}>{d.titulo}</h2>
              <div style={{ display:"flex", gap:6, marginTop:3, flexWrap:"wrap" }}>
                <span style={{ padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:700, background:st?.bg, color:st?.cor }}>{st?.label}</span>
                {d.numero_oficio && <span style={{ padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:600, background:"#eff6ff", color:"#1d4ed8" }}>📄 {d.numero_oficio}</span>}
                {d.numero_zela   && <span style={{ padding:"2px 8px", borderRadius:5, fontSize:11, fontWeight:600, background:"#f0fdf4", color:"#15803d" }}>ZELA {d.numero_zela}</span>}
              </div>
            </div>
            <button onClick={onFechar} style={{ width:34, height:34, borderRadius:9, border:"1px solid #e2e8f0", background:"#f8fafc", fontSize:18, cursor:"pointer", flexShrink:0 }}>×</button>
          </div>
          {/* Tabs */}
          <div style={{ display:"flex", borderBottom:"2px solid #f1f5f9" }}>
            {[["info","📋 Detalhes"],["oficio","📄 Ofício & ZELA"]].map(([id,label])=>(
              <button key={id} onClick={()=>setTab(id)} style={{ padding:"8px 16px", border:"none", borderBottom:`3px solid ${tab===id?"#1d4ed8":"transparent"}`, marginBottom:-2, background:"#fff", color:tab===id?"#1d4ed8":"#94a3b8", fontSize:13, fontWeight:tab===id?700:500, cursor:"pointer" }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ padding:"18px 24px" }}>
          {tab==="info" && <>
            {d.foto_url && <img src={d.foto_url} alt="" style={{ width:"100%", borderRadius:12, marginBottom:18, maxHeight:240, objectFit:"cover" }} />}
            <IR icon={grupo?.icon||"📁"} label="Categoria"     valor={`${grupo?.label} ${d.subcategoria?"→ "+d.subcategoria:""}`} />
            {d.descricao  && <IR icon="📝" label="Descrição"    valor={d.descricao} />}
            {d.cep        && <IR icon="🔢" label="CEP"          valor={d.cep} />}
            {d.bairro     && <IR icon="🏘️" label="Bairro"       valor={d.bairro} />}
            {d.endereco   && <IR icon="📍" label="Endereço"     valor={d.endereco} />}
            {d.latitude   && <IR icon="🗺️" label="GPS"          valor={`${d.latitude}, ${d.longitude}`} />}
            <IR icon="👤" label="Cadastrado por" valor={d.criado_por} />
            <IR icon="📅" label="Data"           valor={new Date(d.created_at).toLocaleString("pt-BR")} />
            <div style={{ marginTop:18, padding:14, background:"#f8fafc", borderRadius:12 }}>
              <p style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:10, textTransform:"uppercase", letterSpacing:".5px" }}>Alterar Status</p>
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                {Object.entries(STATUS_MAP).map(([k,v])=>(
                  <button key={k} onClick={()=>onStatus(k)} style={{ padding:"7px 14px", borderRadius:8, cursor:"pointer", border:`2px solid ${d.status===k?v.cor:"#e2e8f0"}`, background:d.status===k?v.bg:"#fff", color:d.status===k?v.cor:"#64748b", fontSize:12, fontWeight:700 }}>{v.label}</button>
                ))}
              </div>
            </div>
            {d.latitude && (
              <a href={`https://maps.google.com/?q=${d.latitude},${d.longitude}`} target="_blank" rel="noreferrer"
                style={{ display:"block", marginTop:12, padding:"11px", borderRadius:10, background:"linear-gradient(135deg,#3b82f6,#10b981)", color:"#fff", textAlign:"center", fontSize:13, fontWeight:700, textDecoration:"none" }}>
                🗺️ Abrir no Google Maps
              </a>
            )}
          </>}

          {tab==="oficio" && <>
            {/* Ofício */}
            <div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:12, padding:"14px 18px", marginBottom:18 }}>
              <div style={{ fontWeight:700, color:"#1e40af", fontSize:14, marginBottom:2 }}>📄 Dados do Ofício</div>
            </div>
            {!editOficio ? <>
              <IR icon="📄" label="Número do Ofício" valor={d.numero_oficio||<span style={{color:"#94a3b8",fontStyle:"italic"}}>Não informado</span>} />
              {d.oficio_url && (
                <a href={d.oficio_url} target="_blank" rel="noreferrer" style={{ display:"flex", alignItems:"center", gap:8, marginTop:10, padding:"10px 14px", borderRadius:10, background:"#eff6ff", border:"1px solid #bfdbfe", color:"#1d4ed8", textDecoration:"none", fontSize:13, fontWeight:600 }}>
                  📎 Visualizar PDF do Ofício
                </a>
              )}
            </> : <>
              <Campo label="Número do Ofício">
                <input value={oficio.numero_oficio} onChange={e=>setOficio(o=>({...o,numero_oficio:e.target.value}))} placeholder="Ex: 0234/2024" style={{...iBase,width:"100%"}} />
              </Campo>
              <Campo label="Anexar PDF">
                <div onClick={()=>oficioRef.current?.click()} style={{ border:"2px dashed #bfdbfe", borderRadius:12, padding:16, textAlign:"center", cursor:"pointer", background:"#eff6ff" }}>
                  {oficioFile
                    ? <p style={{fontWeight:600,color:"#1d4ed8",fontSize:13}}>📄 {oficioFile.name}</p>
                    : <p style={{color:"#60a5fa",fontSize:13}}>📎 {d.oficio_url?"Trocar PDF":"Selecionar PDF"}</p>}
                </div>
                <input ref={oficioRef} type="file" accept=".pdf" onChange={e=>{const f=e.target.files[0];if(f)setOficioFile(f);}} style={{display:"none"}} />
              </Campo>
            </>}

            {/* ZELA */}
            <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:12, padding:"14px 18px", margin:"18px 0" }}>
              <div style={{ fontWeight:700, color:"#15803d", fontSize:14, marginBottom:2 }}>🏛️ ZELA — Prefeitura de Guarulhos</div>
            </div>
            {!editOficio ? <>
              <IR icon="🔢" label="Protocolo ZELA" valor={d.numero_zela||<span style={{color:"#94a3b8",fontStyle:"italic"}}>Não informado</span>} />
              <IR icon="📊" label="Status no ZELA" valor={d.status_zela||<span style={{color:"#94a3b8",fontStyle:"italic"}}>Não informado</span>} />
            </> : <>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <Campo label="Protocolo ZELA">
                  <input value={oficio.numero_zela} onChange={e=>setOficio(o=>({...o,numero_zela:e.target.value}))} placeholder="2024/123456" style={{...iBase,width:"100%"}} />
                </Campo>
                <Campo label="Status no ZELA">
                  <select value={oficio.status_zela} onChange={e=>setOficio(o=>({...o,status_zela:e.target.value}))} style={{...iBase,width:"100%"}}>
                    <option value="">Selecione</option>
                    {STATUS_ZELA.map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </Campo>
              </div>
            </>}

            <div style={{ marginTop:16, display:"flex", gap:10 }}>
              {!editOficio
                ? <button onClick={()=>setEditOficio(true)} style={{...btnPri, width:"100%", justifyContent:"center"}}>✏️ Editar Ofício & ZELA</button>
                : <>
                  <button onClick={()=>setEditOficio(false)} style={{...btnCancel,flex:1}}>Cancelar</button>
                  <button onClick={salvarOficio} disabled={salvando} style={{...btnPri,flex:1,justifyContent:"center"}}>
                    {salvando?"⏳ Salvando...":"Salvar ✓"}
                  </button>
                </>}
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   USUÁRIOS
══════════════════════════════════════════════════ */
function TelaUsuarios({ showToast }) {
  const [form, setForm] = useState({ nome:"", email:"", senha:"" });
  const [salvando, setSalvando] = useState(false);
  const criar = async () => {
    if (!form.nome||!form.email||!form.senha) return;
    setSalvando(true);
    try {
      await auth.signUp(form.email, form.senha, form.nome);
      showToast(`Usuário ${form.nome} criado! ✅`);
      setForm({ nome:"", email:"", senha:"" });
    } catch(e) { showToast("Erro: "+e.message,"erro"); }
    finally { setSalvando(false); }
  };
  return (
    <div>
      <div className="fade" style={{ marginBottom:24 }}>
        <h1 style={{ fontFamily:"Sora", fontWeight:800, fontSize:26, color:"#0f172a" }}>Usuários</h1>
        <p style={{ color:"#64748b", fontSize:14, marginTop:2 }}>Crie contas para os assessores</p>
      </div>
      <div className="fade2" style={{ background:"#fff", borderRadius:16, padding:28, border:"1px solid #f1f5f9", maxWidth:480 }}>
        <h3 style={{ fontFamily:"Sora", fontWeight:700, fontSize:17, color:"#0f172a", marginBottom:20 }}>Criar novo usuário</h3>
        <Campo label="Nome Completo"><input value={form.nome} onChange={e=>setForm({...form,nome:e.target.value})} style={{...iBase,width:"100%"}} placeholder="Nome do assessor" /></Campo>
        <Campo label="E-mail"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} style={{...iBase,width:"100%"}} placeholder="email@exemplo.com" /></Campo>
        <Campo label="Senha Provisória"><input type="password" value={form.senha} onChange={e=>setForm({...form,senha:e.target.value})} style={{...iBase,width:"100%"}} placeholder="Mínimo 6 caracteres" /></Campo>
        <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", marginBottom:16, fontSize:13, color:"#92400e" }}>
          ⚠️ O usuário precisa confirmar o e-mail antes de entrar. Desative a confirmação em Supabase → Auth → Settings se necessário.
        </div>
        <button onClick={criar} disabled={salvando||!form.nome||!form.email||!form.senha} style={{...btnPri,width:"100%",justifyContent:"center",opacity:(!form.nome||!form.email||!form.senha)?.5:1}}>
          {salvando?"⏳ Criando...":"Criar Usuário ✓"}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   RELATÓRIOS
══════════════════════════════════════════════════ */
function TelaRelatorios({ demandas, showToast }) {
  const [filtro, setFiltro] = useState({ grupo:"", status:"", bairro:"" });
  const total = demandas.length;
  const filtradas = demandas.filter(d=>
    (!filtro.grupo   || d.categoria===filtro.grupo) &&
    (!filtro.status  || d.status===filtro.status) &&
    (!filtro.bairro  || (d.bairro||"").toLowerCase().includes(filtro.bairro.toLowerCase()))
  );
  const porBairro = Object.entries(demandas.reduce((a,d)=>{ const b=d.bairro||"Sem bairro"; a[b]=(a[b]||0)+1; return a; },{})).sort((a,b)=>b[1]-a[1]);
  const porStatus = Object.entries(STATUS_MAP).map(([k,v])=>({...v,key:k,qtd:demandas.filter(d=>d.status===k).length}));
  const taxaConclusao = total>0?Math.round((demandas.filter(d=>d.status==="concluido").length/total)*100):0;

  return (
    <div>
      <div className="fade" style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:22, flexWrap:"wrap", gap:12 }}>
        <div>
          <h1 style={{ fontFamily:"Sora", fontWeight:800, fontSize:26, color:"#0f172a" }}>Relatórios</h1>
          <p style={{ color:"#64748b", marginTop:2, fontSize:14 }}>Análise completa do mandato</p>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={()=>{ exportarPDF(filtradas); showToast("Abrindo PDF... 🖨"); }} style={btnSec}>🖨 PDF</button>
          <button onClick={()=>{ exportarExcel(filtradas); showToast("Excel exportado! ✅"); }} style={btnPri}>📊 Exportar Excel</button>
        </div>
      </div>
      <div className="fade2 sgrid" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:22 }}>
        {[
          { titulo:"Taxa de Conclusão", valor:`${taxaConclusao}%`, cor:"#16a34a", icon:"✅" },
          { titulo:"Total",             valor:total,               cor:"#1d4ed8", icon:"📋" },
          { titulo:"Com Ofício",        valor:demandas.filter(d=>d.numero_oficio).length, cor:"#7c3aed", icon:"📄" },
          { titulo:"No ZELA",           valor:demandas.filter(d=>d.numero_zela).length,   cor:"#0891b2", icon:"🏛️" },
        ].map(m=>(
          <div key={m.titulo} style={{ background:"#fff", borderRadius:14, padding:"18px 20px", border:"1px solid #f1f5f9", boxShadow:"0 1px 8px rgba(0,0,0,.05)" }}>
            <div style={{ fontSize:26, marginBottom:8 }}>{m.icon}</div>
            <div style={{ fontFamily:"Sora", fontWeight:800, fontSize:28, color:m.cor, lineHeight:1 }}>{m.valor}</div>
            <div style={{ fontSize:12, color:"#64748b", marginTop:6 }}>{m.titulo}</div>
          </div>
        ))}
      </div>
      <div className="fade3" style={{ background:"#fff", borderRadius:14, padding:"14px 20px", marginBottom:18, border:"1px solid #f1f5f9", display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <span style={{ fontSize:13, fontWeight:700, color:"#374151" }}>Filtrar:</span>
        <input placeholder="Bairro..." value={filtro.bairro} onChange={e=>setFiltro({...filtro,bairro:e.target.value})} style={{...iBase,width:160}} />
        <select value={filtro.grupo} onChange={e=>setFiltro({...filtro,grupo:e.target.value})} style={iBase}>
          <option value="">Todos os Grupos</option>
          {GRUPOS.map(g=><option key={g.id} value={g.id}>{g.icon} {g.label}</option>)}
        </select>
        <select value={filtro.status} onChange={e=>setFiltro({...filtro,status:e.target.value})} style={iBase}>
          <option value="">Todos Status</option>
          {Object.entries(STATUS_MAP).map(([k,v])=><option key={k} value={k}>{v.label}</option>)}
        </select>
        <span style={{ color:"#94a3b8", fontSize:12 }}>{filtradas.length} demanda(s)</span>
      </div>
      <div className="fade4" style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
        <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1px solid #f1f5f9" }}>
          <h3 style={{ fontFamily:"Sora", fontWeight:700, fontSize:15, color:"#0f172a", marginBottom:18 }}>📍 Por Bairro</h3>
          {porBairro.length===0?<p style={{color:"#94a3b8",fontSize:13}}>Sem dados</p>
            :porBairro.map(([b,q])=>(
              <div key={b} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{fontSize:13,color:"#374151"}}>{b}</span>
                  <span style={{fontSize:13,fontWeight:700}}>{q} ({total>0?Math.round(q/total*100):0}%)</span>
                </div>
                <div style={{ height:6, borderRadius:3, background:"#f1f5f9" }}>
                  <div style={{ height:"100%", borderRadius:3, background:"linear-gradient(90deg,#1d4ed8,#06b6d4)", width:`${total>0?(q/total)*100:0}%`, transition:"width .8s" }} />
                </div>
              </div>
            ))}
        </div>
        <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1px solid #f1f5f9" }}>
          <h3 style={{ fontFamily:"Sora", fontWeight:700, fontSize:15, color:"#0f172a", marginBottom:18 }}>🗂 Por Grupo</h3>
          {GRUPOS.map(g=>{
            const qtd=demandas.filter(d=>d.categoria===g.id).length;
            if(!qtd) return null;
            return (
              <div key={g.id} style={{ marginBottom:12 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{fontSize:12,color:"#374151"}}>{g.icon} {g.label.replace("Manutenção de ","").replace("Serviços de ","")}</span>
                  <span style={{fontSize:12,fontWeight:700,color:g.cor}}>{qtd}</span>
                </div>
                <div style={{ height:5, borderRadius:3, background:"#f1f5f9" }}>
                  <div style={{ height:"100%", borderRadius:3, background:g.cor, width:`${total>0?(qtd/total)*100:0}%`, transition:"width .8s" }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:16, padding:22, border:"1px solid #f1f5f9" }}>
        <h3 style={{ fontFamily:"Sora", fontWeight:700, fontSize:15, color:"#0f172a", marginBottom:18 }}>🔁 Por Status</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
          {porStatus.map(s=>(
            <div key={s.key} style={{ background:s.bg, borderRadius:12, padding:"16px 18px", border:`1px solid ${s.cor}30` }}>
              <div style={{ fontFamily:"Sora", fontWeight:800, fontSize:28, color:s.cor }}>{s.qtd}</div>
              <div style={{ fontSize:12, color:s.cor, fontWeight:600, marginTop:4 }}>{s.label}</div>
              <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{total>0?Math.round(s.qtd/total*100):0}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════ */
const iBase    = { padding:"9px 13px", borderRadius:9, border:"1px solid #e2e8f0", background:"#fff", fontSize:13, color:"#1e293b", outline:"none" };
const lbS      = { display:"block", fontSize:11, fontWeight:700, color:"rgba(255,255,255,.4)", marginBottom:6, textTransform:"uppercase", letterSpacing:".7px" };
const liS      = { width:"100%", padding:"13px 16px", borderRadius:11, border:"1px solid rgba(255,255,255,.1)", background:"rgba(255,255,255,.06)", color:"#fff", fontSize:14, outline:"none" };
const btnPri   = { padding:"10px 18px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#1d4ed8,#10b981)", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:6 };
const btnSec   = { padding:"10px 14px", borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#374151", fontWeight:600, fontSize:13, cursor:"pointer" };
const btnCancel= { padding:"10px 16px", borderRadius:10, border:"1px solid #e2e8f0", background:"#fff", color:"#64748b", fontWeight:600, fontSize:13, cursor:"pointer" };

function Campo({ label, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#374151", marginBottom:6, textTransform:"uppercase", letterSpacing:".5px" }}>{label}</label>
      {children}
    </div>
  );
}
function IR({ icon, label, valor }) {
  return (
    <div style={{ display:"flex", gap:12, padding:"8px 0", borderBottom:"1px solid #f8fafc" }}>
      <span style={{ fontSize:17, width:24, flexShrink:0 }}>{icon}</span>
      <div>
        <div style={{ fontSize:10, color:"#94a3b8", fontWeight:700, textTransform:"uppercase", letterSpacing:".5px" }}>{label}</div>
        <div style={{ fontSize:13, color:"#1e293b", marginTop:2 }}>{valor}</div>
      </div>
    </div>
  );
}
