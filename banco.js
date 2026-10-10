/* Liga o app ao banco (Supabase). Só entra em ação se o config.js tiver url e chave;
   sem isso, window.BANCO fica null e o app segue como demonstração.
   Este arquivo traduz entre o jeito do app (sessoes, checkins…) e as tabelas do banco.
   Quem decide o que cada um vê é o banco (RLS): aqui não tem filtro de segurança nenhum,
   e nem precisa. Se alguém mexer neste código, continua sem ver o que não é dele. */
window.BANCO = (function(){
"use strict";
const C = window.CONFIG_BANCO || {};
if (!C.url || !C.chave) return null;

const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
const FILA = "jorge-personal:fila";   // o que não subiu por falta de internet
const DIA = 864e5;
let sb = null, eu = null;

const p2 = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const diasAtras = n => iso(new Date(Date.now() - n*DIA));
const num = v => v == null ? null : +v;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));

function carregarLib(){
  return new Promise((ok, erro) => {
    if (window.supabase) return ok();
    const s = document.createElement("script");
    s.src = LIB; s.onload = ok; s.onerror = () => erro(new Error("Sem internet pra abrir o app"));
    document.head.appendChild(s);
  });
}
function checar({data, error}){ if (error) throw error; return data; }
/* o Supabase devolve no máximo 1000 linhas por vez: busca de 1000 em 1000 */
async function tudo(consulta){
  const out = [];
  for (let de = 0; ; de += 1000){
    const parte = checar(await consulta().range(de, de + 999));
    out.push(...parte);
    if (parte.length < 1000) return out;
  }
}

/* ================= login ================= */
async function iniciar(){
  await carregarLib();
  sb = window.supabase.createClient(C.url, C.chave, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
  const {data:{session}} = await sb.auth.getSession();
  if (!session) return null;
  const email = session.user.email;
  const perfil = checar(await sb.from("perfis").select("id,papel,nome").maybeSingle());
  if (!perfil) return {semConvite:true, email};
  eu = {id:perfil.id, papel:perfil.papel, nome:perfil.nome, email};
  if (perfil.papel === "aluno"){
    const a = checar(await sb.from("alunos").select("id,treinador_id").eq("usuario_id", perfil.id).maybeSingle());
    if (!a) return {semConvite:true, desligado:true, email};
    eu.alunoId = a.id; eu.treinadorId = a.treinador_id;
  }
  esvaziarFila();
  window.addEventListener("online", esvaziarFila);
  return eu;
}

function telaLogin(el, M){
  el.innerHTML = `<div class="entrada-in">
    <div class="marca-g"><span class="logo">${esc(M.iniciais)}</span><div><h1>${esc(M.nome)}</h1><p class="muted">${esc(M.slogan)}</p></div></div>
    <form id="login" class="stack">
      <div class="campo"><label for="login-email">Seu e-mail</label>
        <input id="login-email" class="inp" type="email" autocomplete="email" inputmode="email" required placeholder="o mesmo que você passou pro ${esc(M.curto)}"></div>
      <button class="btn pri full" type="submit">Receber link de acesso</button>
    </form>
    <div class="demo" id="login-msg"><span>🔐</span><span>Sem senha: chega um link no seu e-mail, você toca e já entra. Só funciona com o e-mail que o ${esc(M.curto)} cadastrou.</span></div>
  </div>`;
  el.hidden = false;
  el.querySelector("#login").addEventListener("submit", async ev => {
    ev.preventDefault();
    const email = el.querySelector("#login-email").value.trim(), msg = el.querySelector("#login-msg");
    const b = el.querySelector("button[type=submit]"); b.disabled = true; b.textContent = "Enviando…";
    const {error} = await sb.auth.signInWithOtp({email, options:{emailRedirectTo: location.origin + location.pathname}});
    b.disabled = false; b.textContent = "Receber link de acesso";
    msg.innerHTML = error
      ? `<span>⚠️</span><span>Não deu pra mandar o link (${esc(error.message)}). Tenta de novo em 1 minuto.</span>`
      : `<span>📬</span><span>Link enviado pra <b>${esc(email)}</b>. Abre o e-mail neste celular e toca no link.</span>`;
  });
}

function telaSemConvite(el, M, r){
  el.innerHTML = `<div class="entrada-in">
    <div class="marca-g"><span class="logo">${esc(M.iniciais)}</span><div><h1>${esc(M.nome)}</h1></div></div>
    <div class="demo"><span>${r.desligado ? "👋" : "✉️"}</span><span>${r.desligado
      ? `Seu acesso foi encerrado. Se acha que é engano, fala com o ${esc(M.curto)}.`
      : `<b>${esc(r.email)}</b> ainda não tem convite. Pede pro ${esc(M.curto)} te cadastrar com esse e-mail e entra de novo.`}</span></div>
    <button type="button" class="btn full" id="sair-conta">Entrar com outro e-mail</button>
  </div>`;
  el.hidden = false;
  el.querySelector("#sair-conta").addEventListener("click", () => sair().then(() => location.reload()));
}

async function sair(){ await sb.auth.signOut(); }

/* ================= ler tudo ================= */
async function carregar(){
  const [alunos, notas, treinos, sessoes, checkins, habitos, pagamentos, recados, exs, fotos] = await Promise.all([
    tudo(() => sb.from("alunos").select("*").eq("ativo", true).order("nome")),
    tudo(() => sb.from("notas_treinador").select("*")),
    tudo(() => sb.from("treinos").select("*").order("ordem")),
    tudo(() => sb.from("sessoes").select("*").gte("data", diasAtras(200)).order("feito_em")),
    tudo(() => sb.from("checkins").select("*").gte("data", diasAtras(200)).order("enviado_em")),
    tudo(() => sb.from("habitos").select("*").gte("dia", diasAtras(60))),
    tudo(() => sb.from("pagamentos").select("*").order("pago_em")),
    tudo(() => sb.from("recados").select("*").order("publicado_em", {ascending:false}).limit(1)),
    tudo(() => sb.from("exercicios").select("*").not("treinador_id", "is", null)),
    eu.papel === "aluno" ? tudo(() => sb.from("fotos").select("*").order("tirada_em")) : []
  ]);

  const nota = Object.fromEntries(notas.map(n => [n.aluno_id, n.texto]));
  const ultimoPeso = {};
  checkins.forEach(c => { if (c.peso != null) ultimoPeso[c.aluno_id] = +c.peso; });
  const anos = d => d ? Math.floor((Date.now() - new Date(d + "T12:00")) / (365.25*DIA)) : null;
  const meses = d => Math.max(0, Math.round((Date.now() - new Date(d + "T12:00")) / (30.4*DIA)));

  const d = {
    alunos: alunos.map(a => ({id:a.id, nome:a.nome, email:a.email, idade:anos(a.nascimento), tipo:a.tipo, objetivo:a.objetivo,
      valor:+a.valor, meta:a.meta_semana, peso0:num(a.peso_inicial) ?? ultimoPeso[a.id] ?? null, peso:ultimoPeso[a.id] ?? num(a.peso_inicial),
      modelo:null, desde:meses(a.inicio), dor:null, restricao:a.restricao, nota:nota[a.id] || ""})),
    sessoes: sessoes.map(daSessao),
    checkins: checkins.map(doCheckin),
    treinos:{}, programa:{}, venc:{}, pagos:{}, habitos:{}, exExtra:{}, fotos:[],
    recado: recados[0] ? recados[0].texto : "",
    recadoData: recados[0] ? recados[0].publicado_em.slice(0,10) : iso(new Date())
  };
  alunos.forEach(a => { d.venc[a.id] = a.vencimento || iso(new Date()); if (a.programa) d.programa[a.id] = a.programa; });
  treinos.forEach(t => (d.treinos[t.aluno_id] = d.treinos[t.aluno_id] || []).push({letra:t.letra, nome:t.nome, local:t.local, circuito:t.circuito, exs:t.exercicios}));
  pagamentos.forEach(p => { d.pagos[p.aluno_id] = p.pago_em; });
  if (eu.papel === "aluno") habitos.filter(h => h.aluno_id === eu.alunoId).forEach(h => { (d.habitos[h.dia] = d.habitos[h.dia] || {})[h.habito] = true; });
  exs.forEach(x => { d.exExtra[x.id] = {nome:x.nome, grupo:x.grupo, local:x.local, dica:x.dica, alt:x.alternativas || []}; });
  if (fotos.length){
    const links = checar(await sb.storage.from("fotos").createSignedUrls(fotos.map(f => f.caminho), 3600));
    d.fotos = fotos.map((f, i) => ({src: links[i] && links[i].signedUrl, rot: f.tirada_em.slice(8,10) + "/" + f.tirada_em.slice(5,7)})).filter(f => f.src);
  }
  return d;
}

const daSessao = s => ({id:s.id, aluno:s.aluno_id, data:s.data, ts:Date.parse(s.feito_em), letra:s.letra, nome:s.nome, dur:s.duracao,
  series:s.series || [], volume:+s.volume, rpe:s.esforco, dor:s.dor, coment:s.comentario, prs:s.recordes || []});
const doCheckin = c => ({id:c.id, aluno:c.aluno_id, data:c.data, ts:Date.parse(c.enviado_em), peso:num(c.peso), cintura:num(c.cintura),
  sono:c.sono, energia:c.energia, estresse:c.estresse, dieta:c.dieta, dor:c.dor, coment:c.comentario,
  resposta:c.resposta, respData:c.respondido_em ? c.respondido_em.slice(0,10) : null});

/* ================= gravar =================
   Cada operação tem nome, pra poder ir pra fila se a internet cair no meio
   (academia com sinal ruim) e subir sozinha quando voltar. */
const OPS = {
  sessao: s => sb.from("sessoes").insert({id:s.id, aluno_id:s.aluno, data:s.data, feito_em:new Date(s.ts).toISOString(), letra:s.letra,
    nome:s.nome, duracao:s.dur, series:s.series, volume:s.volume, esforco:s.rpe, dor:s.dor, comentario:s.coment, recordes:s.prs}),
  checkin: c => sb.from("checkins").insert({id:c.id, aluno_id:c.aluno, data:c.data, enviado_em:new Date(c.ts).toISOString(), peso:c.peso,
    cintura:c.cintura, sono:c.sono, energia:c.energia, estresse:c.estresse, dieta:c.dieta, dor:c.dor, comentario:c.coment}),
  resposta: (id, texto) => sb.from("checkins").update({resposta:texto, respondido_em:new Date().toISOString()}).eq("id", id),
  habito: (alunoId, dia, habito, marcado) => marcado
    ? sb.from("habitos").upsert({aluno_id:alunoId, dia, habito}, {ignoreDuplicates:true})
    : sb.from("habitos").delete().match({aluno_id:alunoId, dia, habito}),
  async treinos(alunoId, treinos, programa){
    checar(await sb.from("treinos").delete().eq("aluno_id", alunoId));
    if (treinos.length) checar(await sb.from("treinos").insert(treinos.map((t, i) => ({aluno_id:alunoId, ordem:i, letra:t.letra, nome:t.nome,
      local:t.local || "academia", circuito:!!t.circuito, exercicios:t.exs}))));
    return sb.from("alunos").update({programa: programa || ""}).eq("id", alunoId);
  },
  exercicio: (id, x) => sb.from("exercicios").insert({id, treinador_id:eu.id, nome:x.nome, grupo:x.grupo, local:x.local, dica:x.dica, alternativas:x.alt || []}),
  async pago(alunoId, valor, referente, novoVenc){
    checar(await sb.from("pagamentos").insert({aluno_id:alunoId, valor, referente}));
    return sb.from("alunos").update({vencimento:novoVenc}).eq("id", alunoId);
  },
  recado: texto => sb.from("recados").insert({treinador_id:eu.id, texto})
};

const semInternet = e => !navigator.onLine || /fetch|network|load failed/i.test(String(e && (e.message || e)));
const jaGravado = e => e && e.code === "23505";  // mesma linha já tinha subido antes da internet cair

async function rodar(op, args){
  const r = await OPS[op](...args);
  if (r && r.error && !jaGravado(r.error)) throw r.error;
}
async function gravar(op, ...args){
  try { await rodar(op, args); }
  catch(e){
    if (!semInternet(e)) throw e;
    const f = lerFila(); f.push({op, args}); guardarFila(f);
    return "fila";
  }
}
function lerFila(){ try { return JSON.parse(localStorage.getItem(FILA)) || []; } catch(e){ return []; } }
function guardarFila(f){ try { f.length ? localStorage.setItem(FILA, JSON.stringify(f)) : localStorage.removeItem(FILA); } catch(e){} }
let esvaziando = false;
async function esvaziarFila(){
  if (esvaziando || !navigator.onLine) return;
  esvaziando = true;
  const f = lerFila();
  while (f.length){
    try { await rodar(f[0].op, f[0].args); f.shift(); guardarFila(f); }
    catch(e){ if (semInternet(e)) break; console.error("Descartado da fila:", f[0], e); f.shift(); guardarFila(f); }
  }
  esvaziando = false;
}

/* foto: vai direto pro bucket privado (não entra na fila: é arquivo grande) */
async function foto(blob){
  const hoje = iso(new Date()), caminho = `${eu.alunoId}/${hoje}-${Date.now().toString(36)}.jpg`;
  checar(await sb.storage.from("fotos").upload(caminho, blob, {contentType:"image/jpeg"}));
  checar(await sb.from("fotos").insert({aluno_id:eu.alunoId, caminho, tirada_em:hoje}));
  const {signedUrl} = checar(await sb.storage.from("fotos").createSignedUrl(caminho, 3600));
  return {src:signedUrl, rot:hoje.slice(8,10) + "/" + hoje.slice(5,7)};
}

/* Jorge cadastra o aluno. Quando o aluno entrar com esse e-mail, a conta se liga sozinha à ficha */
async function novoAluno(x){
  const venc = iso(new Date(Date.now() + 30*DIA));
  const a = checar(await sb.from("alunos").insert({treinador_id:eu.id, nome:x.nome, email:x.email.toLowerCase(), tipo:x.tipo, valor:x.valor,
    objetivo:x.objetivo || "", vencimento:venc}).select().single());
  return {id:a.id, nome:a.nome, email:a.email, idade:null, tipo:a.tipo, objetivo:a.objetivo, valor:+a.valor, meta:a.meta_semana,
    peso0:null, peso:null, modelo:null, desde:0, dor:null, restricao:"", nota:"", venc};
}

return {iniciar, telaLogin, telaSemConvite, sair, carregar, gravar, foto, novoAluno, eu: () => eu};
})();
