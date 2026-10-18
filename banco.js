/* Liga o app ao banco (Supabase). Só entra em ação se o config.js tiver url e chave;
   sem isso, window.BANCO fica null e o app segue como demonstração.
   Este arquivo traduz entre o jeito do app (sessoes, avals, chat…) e as tabelas do banco.
   Quem decide o que cada um vê é o banco (RLS): aqui não tem filtro de segurança nenhum,
   e nem precisa. Se alguém mexer neste código, continua sem ver o que não é dele. */
window.BANCO = (function(){
"use strict";
const C = window.CONFIG_BANCO || {};
if (!C.url || !C.chave) return null;

const LIB = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.js";
const FILA = "jorge-personal:fila";   // o que não subiu por falta de internet
const DIA = 864e5;
const LINK = 3600;                     // links de arquivo privado valem 1 hora
let sb = null, eu = null;

const p2 = n => String(n).padStart(2, "0");
const iso = d => `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const diasAtras = n => iso(new Date(Date.now() - n*DIA));
const num = v => v == null ? null : +v;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const extensao = f => (f.name && f.name.includes(".") ? f.name.split(".").pop() : (f.type || "").split("/").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");

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
/* arquivo privado → link que expira */
async function assinar(bucket, caminhos){
  const lista = [...new Set(caminhos.filter(Boolean))];
  if (!lista.length) return {};
  const links = checar(await sb.storage.from(bucket).createSignedUrls(lista, LINK));
  return Object.fromEntries(links.filter(l => l.signedUrl).map(l => [l.path, l.signedUrl]));
}
const publico = (bucket, caminho) => caminho ? sb.storage.from(bucket).getPublicUrl(caminho).data.publicUrl : null;

/* ================= login ================= */
async function iniciar(){
  await carregarLib();
  sb = window.supabase.createClient(C.url, C.chave, {auth:{persistSession:true, autoRefreshToken:true, detectSessionInUrl:true}});
  const {data:{session}} = await sb.auth.getSession();
  if (!session) return null;
  const email = session.user.email;
  const perfil = checar(await sb.from("perfis").select("id,papel,nome").maybeSingle());
  /* sem perfil: ainda não é aluno. Vê se já mandou o cadastro */
  if (!perfil){
    const cad = checar(await sb.from("cadastros").select("status,enviado_em").order("enviado_em", {ascending:false}).limit(1));
    return {semConvite:true, email, cadastro: cad[0] || null};
  }
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
        <input id="login-email" class="inp" type="email" autocomplete="email" inputmode="email" required placeholder="seu@email.com"></div>
      <button class="btn pri full" type="submit">Receber link de acesso</button>
    </form>
    <div class="demo" id="login-msg"><span>🔐</span><span>Sem senha: chega um link no seu e-mail, você toca e já entra. Primeira vez? Entra com o seu e-mail e faz o cadastro pro ${esc(M.curto)} aprovar.</span></div>
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

/* logado, mas ainda não é aluno: faz o cadastro, espera aprovação ou foi recusado/desligado */
function telaSemConvite(el, M, r){
  const st = r.desligado ? "desligado" : r.cadastro ? r.cadastro.status : "novo";
  const txt = {
    novo: `Oi! Pra entrar na consultoria, preenche teu cadastro (dados, anamnese, PAR-Q e termo). O ${esc(M.curto)} confere e libera teu acesso.`,
    pendente: `<b>Cadastro enviado.</b> O ${esc(M.curto)} vai conferir e liberar teu acesso. Quando ele aprovar, é só abrir o app de novo.`,
    recusado: `O ${esc(M.curto)} não aprovou esse cadastro. Se acha que é engano, fala com ele.`,
    aprovado: `Teu cadastro foi aprovado. Toca em "Abrir de novo".`,
    desligado: `Seu acesso foi encerrado. Se acha que é engano, fala com o ${esc(M.curto)}.`
  }[st];
  el.innerHTML = `<div class="entrada-in">
    <div class="marca-g"><span class="logo">${esc(M.iniciais)}</span><div><h1>${esc(M.nome)}</h1><p class="muted">${esc(r.email)}</p></div></div>
    <div class="demo"><span>${{novo:"✍️", pendente:"⏳", recusado:"✋", aprovado:"🎉", desligado:"👋"}[st]}</span><span>${txt}</span></div>
    ${st === "novo" ? `<button type="button" class="btn pri full" data-a="cadastro">Fazer meu cadastro</button>` : ""}
    ${st === "pendente" || st === "aprovado" ? `<button type="button" class="btn pri full" onclick="location.reload()">Abrir de novo</button>` : ""}
    <button type="button" class="btn full" id="sair-conta">Entrar com outro e-mail</button>
  </div>`;
  el.hidden = false;
  el.querySelector("#sair-conta").addEventListener("click", () => sair().then(() => location.reload()));
}

async function sair(){ await sb.auth.signOut(); }

/* ================= ler tudo ================= */
async function carregar(){
  const treinador = eu.papel === "treinador", aluno = !treinador;
  const [alunos, notas, treinos, sessoes, pagamentos, recados, exs, avals, cads, pedidos, msgs, comps, avisos, nutri, planos, demos, modelos] = await Promise.all([
    tudo(() => sb.from("alunos").select("*").eq("ativo", true).order("nome")),
    treinador ? tudo(() => sb.from("notas_treinador").select("*")) : [],
    tudo(() => sb.from("treinos").select("*").order("ordem")),
    tudo(() => sb.from("sessoes").select("*").gte("data", diasAtras(400)).order("feito_em")),
    tudo(() => sb.from("pagamentos").select("*").order("pago_em")),
    tudo(() => sb.from("recados").select("*").order("publicado_em", {ascending:false}).limit(1)),
    tudo(() => sb.from("exercicios").select("*").not("treinador_id", "is", null)),
    treinador ? tudo(() => sb.from("avaliacoes").select("*").order("data")) : [],
    tudo(() => sb.from("cadastros").select("*").in("status", ["pendente", "aprovado"]).order("enviado_em")),
    tudo(() => sb.from("pedidos_exclusao").select("*").order("pedido_em")),
    tudo(() => sb.from("mensagens").select("*").order("enviada_em")),
    tudo(() => sb.from("comprovantes").select("*").eq("status", "pendente").order("enviado_em")),
    aluno ? tudo(() => sb.from("avisos").select("*").eq("aluno_id", eu.alunoId)) : [],
    tudo(() => sb.from("alimentacao").select("*")),
    tudo(() => sb.from("planos").select("*").order("meses")),
    tudo(() => sb.from("demonstracoes").select("*")),
    treinador ? tudo(() => sb.from("modelos").select("*").order("criado_em")) : []
  ]);

  /* links dos arquivos privados (fotos da avaliação, comprovantes, PDFs) */
  const caminhosFotos = avals.flatMap(av => Object.values(av.fotos || {}));
  const [lFotos, lComps, lPdfs] = await Promise.all([
    assinar("avaliacoes", caminhosFotos),
    assinar("comprovantes", comps.map(c => c.arquivo)),
    assinar("alimentacao", nutri.map(n => n.pdf))
  ]);

  const nota = Object.fromEntries(notas.map(n => [n.aluno_id, n.texto]));
  const anos = d => d ? Math.floor((Date.now() - new Date(d + "T12:00")) / (365.25*DIA)) : null;
  const meses = d => Math.max(0, Math.round((Date.now() - new Date(d + "T12:00")) / (30.4*DIA)));
  const daCad = c => ({id:c.id, nome:c.nome, idade:c.idade, sx:c.sexo, tipo:c.tipo, objetivo:c.objetivo, whats:c.whatsapp, email:c.email,
    parq:(c.parq || []).map(x => x ? 1 : 0), lesoes:c.lesoes, remedios:c.remedios, rotina:c.rotina, dias:c.dias,
    data:c.enviado_em.slice(0,10), termo:c.termo_aceito_em.slice(0,10)});
  const cadDe = {};
  cads.filter(c => c.status === "aprovado" && c.aluno_id).forEach(c => { cadDe[c.aluno_id] = daCad(c); });

  const avalsDe = {};
  avals.forEach(av => (avalsDe[av.aluno_id] = avalsDe[av.aluno_id] || []).push({id:av.id, data:av.data, peso:num(av.peso), altura:num(av.altura),
    circ:av.circ || {}, dobras:av.dobras || {}, bio:av.bio || {}, forca:av.forca || {}, obs:av.obs || "",
    fotos: Object.fromEntries(Object.entries(av.fotos || {}).map(([k, c]) => [k, lFotos[c]]).filter(([, u]) => u)),
    caminhos: av.fotos || {}}));
  const pesoDe = id => { const l = avalsDe[id] || []; return {ini: l.length ? l[0].peso : null, ult: l.length ? l[l.length-1].peso : null}; };

  const d = {
    alunos: alunos.map(a => ({id:a.id, nome:a.nome, email:a.email, idade:anos(a.nascimento), sx:a.sexo || null, tipo:a.tipo, objetivo:a.objetivo,
      valor:+a.valor, plano:a.plano, meta:a.meta_semana, peso0: pesoDe(a.id).ini ?? num(a.peso_inicial), peso: pesoDe(a.id).ult ?? num(a.peso_inicial),
      modelo:null, desde:meses(a.inicio), dor:null, restricao:a.restricao, nota:nota[a.id] || "", cad:cadDe[a.id] || null})),
    sessoes: sessoes.map(daSessao),
    avals: avalsDe,
    treinos:{}, programa:{}, venc:{}, pagos:{}, troca:{}, suspensos:{}, exExtra:{}, midia:{}, chat:{}, nutri:{},
    pendentes: cads.filter(c => c.status === "pendente").map(daCad),
    exclusao: pedidos.map(p => ({id:p.id, aluno:p.aluno_id, nome:p.nome, data:p.pedido_em.slice(0,10), feito:!!p.concluido_em})),
    comprovantes: comps.map(c => ({id:c.id, aluno:c.aluno_id, data:c.enviado_em.slice(0,10), valor:+c.valor,
      img: c.arquivo ? lComps[c.arquivo] || null : null, pdf: /\.pdf$/i.test(c.arquivo || ""), ok:false})),
    avisos: avisos[0] ? {treino:avisos[0].treino, hora:String(avisos[0].hora).slice(0,5), novo:avisos[0].novo, venc:avisos[0].vencimento, msg:avisos[0].mensagem}
                      : {treino:true, hora:"06:00", novo:true, venc:true, msg:true},
    planos: planos.map(p => ({id:p.id, nome:p.nome, meses:p.meses, valor:+p.valor, ativo:p.ativo})),
    modelosExtra: modelos.map(m => ({id:m.id, nome:m.nome, desc:m.descricao, treinos:m.treinos})),
    termoAceito: aluno && cads.find(c => c.aluno_id === eu.alunoId) ? cads.find(c => c.aluno_id === eu.alunoId).termo_aceito_em.slice(0,10) : null,
    recado: recados[0] ? recados[0].texto : "",
    recadoData: recados[0] ? recados[0].publicado_em.slice(0,10) : iso(new Date())
  };
  alunos.forEach(a => {
    d.venc[a.id] = a.vencimento || iso(new Date());
    d.troca[a.id] = a.troca_em || iso(new Date());
    if (a.programa) d.programa[a.id] = a.programa;
    if (a.suspenso_em) d.suspensos[a.id] = a.suspenso_em;
  });
  treinos.forEach(t => (d.treinos[t.aluno_id] = d.treinos[t.aluno_id] || []).push({letra:t.letra, nome:t.nome, local:t.local, circuito:t.circuito, exs:t.exercicios}));
  pagamentos.forEach(p => { d.pagos[p.aluno_id] = p.pago_em; });
  exs.forEach(x => { d.exExtra[x.id] = {nome:x.nome, grupo:x.grupo, local:x.local, dica:x.dica, alt:x.alternativas || []}; });
  demos.forEach(m => { d.midia[m.exercicio_id] = Object.assign({}, m.video ? {yt:m.video} : {}, m.imagem ? {img:publico("demonstracoes", m.imagem), imgCaminho:m.imagem} : {}); });
  msgs.forEach(m => (d.chat[m.aluno_id] = d.chat[m.aluno_id] || []).push(daMsg(m)));
  nutri.forEach(n => { d.nutri[n.aluno_id] = {orient:n.orientacoes || (window.DADOS && window.DADOS.ORIENT) || "", nutri:n.nutricionista, pdf: n.pdf ? {nome:n.pdf.split("/").pop(), src:lPdfs[n.pdf] || null} : null}; });
  return d;
}

const daSessao = s => ({id:s.id, aluno:s.aluno_id, data:s.data, ts:Date.parse(s.feito_em), letra:s.letra, nome:s.nome, dur:s.duracao,
  series:s.series || [], volume:+s.volume, rpe:s.esforco, dor:s.dor, coment:s.comentario, prs:s.recordes || []});
const daMsg = m => ({id:m.id, de: m.de === "aluno" ? "a" : "j", txt:m.texto, ts:Date.parse(m.enviada_em), lido:!!m.lida_em});

/* ================= gravar =================
   Cada operação tem nome, pra poder ir pra fila se a internet cair no meio
   (academia com sinal ruim) e subir sozinha quando voltar. */
const OPS = {
  sessao: s => sb.from("sessoes").insert({id:s.id, aluno_id:s.aluno, data:s.data, feito_em:new Date(s.ts).toISOString(), letra:s.letra,
    nome:s.nome, duracao:s.dur, series:s.series, volume:s.volume, esforco:s.rpe, dor:s.dor, comentario:s.coment, recordes:s.prs}),
  async treinos(alunoId, treinos, programa, troca){
    checar(await sb.from("treinos").delete().eq("aluno_id", alunoId));
    if (treinos.length) checar(await sb.from("treinos").insert(treinos.map((t, i) => ({aluno_id:alunoId, ordem:i, letra:t.letra, nome:t.nome,
      local:t.local || "academia", circuito:!!t.circuito, exercicios:t.exs}))));
    return sb.from("alunos").update(Object.assign({programa: programa || ""}, troca ? {troca_em:troca} : {})).eq("id", alunoId);
  },
  exercicio: (id, x) => sb.from("exercicios").insert({id, treinador_id:eu.id, nome:x.nome, grupo:x.grupo, local:x.local, dica:x.dica, alternativas:x.alt || []}),
  async pago(alunoId, valor, referente, novoVenc){
    checar(await sb.from("pagamentos").insert({aluno_id:alunoId, valor, referente}));
    return sb.from("alunos").update({vencimento:novoVenc}).eq("id", alunoId);
  },
  recado: texto => sb.from("recados").insert({treinador_id:eu.id, texto}),
  mensagem: (id, alunoId, de, texto) => sb.from("mensagens").insert({id, aluno_id:alunoId, de: de === "a" ? "aluno" : "treinador", texto}),
  /* marca como lidas as mensagens do outro lado */
  lidas: (alunoId, quem) => sb.from("mensagens").update({lida_em:new Date().toISOString()})
    .eq("aluno_id", alunoId).eq("de", quem === "a" ? "treinador" : "aluno").is("lida_em", null),
  avisos: (alunoId, a) => sb.from("avisos").upsert({aluno_id:alunoId, treino:a.treino, hora:a.hora, novo:a.novo, vencimento:a.venc, mensagem:a.msg}),
  nutri: (alunoId, orient, nutri) => sb.from("alimentacao").upsert({aluno_id:alunoId, orientacoes:orient, nutricionista:nutri || "", atualizado_em:new Date().toISOString()}),
  plano: p => sb.from("planos").upsert({treinador_id:eu.id, id:p.id, nome:p.nome, meses:p.meses, valor:p.valor, ativo:p.ativo}),
  suspender: (alunoId, data) => sb.from("alunos").update({suspenso_em:data}).eq("id", alunoId),
  pedirExclusao: (id, alunoId) => sb.from("pedidos_exclusao").insert({id, aluno_id:alunoId}),
  modelo: m => sb.from("modelos").insert({id:m.id, treinador_id:eu.id, nome:m.nome, descricao:m.desc || "", treinos:m.treinos}),
  video: (exId, video) => sb.from("demonstracoes").upsert({treinador_id:eu.id, exercicio_id:exId, video: video || null}),
  tirarDemo: exId => sb.from("demonstracoes").delete().match({treinador_id:eu.id, exercicio_id:exId}),
  aval: (id, alunoId, av, caminhos) => sb.from("avaliacoes").insert({id, aluno_id:alunoId, data:av.data, peso:av.peso, altura:av.altura,
    circ:av.circ, dobras:av.dobras, gordura:av.gordura, bio:av.bio, forca:av.forca, fotos:caminhos || {}, obs:av.obs || ""})
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

/* ================= o que precisa de internet na hora =================
   Arquivos (grandes demais pra fila) e decisões do Jorge (aprovar, confirmar Pix, apagar dados). */
async function subir(bucket, caminho, arquivo, tipo){
  checar(await sb.storage.from(bucket).upload(caminho, arquivo, {contentType: tipo || arquivo.type || "application/octet-stream", upsert:true}));
  return caminho;
}

/* cadastro "Quero ser aluno" */
async function enviarCadastro(c){
  if (!C.treinador) throw new Error("Falta o id do treinador no config.js");
  checar(await sb.from("cadastros").insert({treinador_id:C.treinador, nome:c.nome, idade:c.idade, sexo:c.sx, tipo:c.tipo, objetivo:c.objetivo,
    whatsapp:c.whats || "", lesoes:c.lesoes || "", remedios:c.remedios || "", rotina:c.rotina || "", dias:c.dias || "", parq:c.parq.map(x => x === 1)}));
}
const aprovar = (pedido, valor) => sb.rpc("aprovar_cadastro", {pedido, mensalidade:valor}).then(checar);
const recusarCadastro = pedido => sb.rpc("recusar_cadastro", {pedido}).then(checar);

/* Jorge cadastra direto pelo e-mail (convite). Quando o aluno entrar com esse e-mail, a conta se liga sozinha */
async function novoAluno(x){
  const hoje = iso(new Date());
  const a = checar(await sb.from("alunos").insert({treinador_id:eu.id, nome:x.nome, email:x.email.toLowerCase(), tipo:x.tipo, valor:x.valor,
    objetivo:x.objetivo || "", vencimento:hoje, troca_em:iso(new Date(Date.now() + 15*DIA))}).select().single());
  return {id:a.id, nome:a.nome, email:a.email, idade:null, sx:null, tipo:a.tipo, objetivo:a.objetivo, valor:+a.valor, plano:a.plano, meta:a.meta_semana,
    peso0:null, peso:null, modelo:null, desde:0, dor:null, restricao:"", nota:"", cad:null, venc:hoje, troca:a.troca_em};
}

/* comprovante do Pix (arquivo opcional: "paguei, mas sem print") */
async function comprovante(arquivo, valor){
  const id = crypto.randomUUID();
  let caminho = null, img = null;
  if (arquivo){
    caminho = await subir("comprovantes", `${eu.alunoId}/${id}.${extensao(arquivo)}`, arquivo);
    img = (await assinar("comprovantes", [caminho]))[caminho] || null;
  }
  checar(await sb.from("comprovantes").insert({id, aluno_id:eu.alunoId, valor, arquivo:caminho}));
  return {id, aluno:eu.alunoId, data:iso(new Date()), valor, img, pdf:/\.pdf$/i.test(caminho || ""), ok:false};
}
const confirmarComprovante = id => sb.rpc("confirmar_comprovante", {comprovante:id}).then(checar);
const recusarComprovante = id => sb.rpc("recusar_comprovante", {comprovante:id}).then(checar);

/* foto da avaliação: sobe já, o caminho vai junto com a avaliação */
async function fotoAval(alunoId, avId, lado, blob){
  return subir("avaliacoes", `${alunoId}/${avId}/${lado}.jpg`, blob, "image/jpeg");
}

/* PDF do nutricionista */
async function nutriPdf(alunoId, arquivo){
  const caminho = await subir("alimentacao", `${alunoId}/${Date.now().toString(36)}-${(arquivo.name || "plano.pdf").replace(/[^\w.\-]/g, "_")}`, arquivo);
  checar(await sb.from("alimentacao").upsert({aluno_id:alunoId, pdf:caminho, atualizado_em:new Date().toISOString()}));
  return {nome:caminho.split("/").pop(), src:(await assinar("alimentacao", [caminho]))[caminho] || null};
}

/* GIF/imagem de demonstração (bucket público: é vídeo de exercício, não dado de aluno) */
async function demoImagem(exId, arquivo){
  const caminho = await subir("demonstracoes", `${eu.id}/${exId.replace(/[^\w\-]/g, "_")}-${Date.now().toString(36)}.${extensao(arquivo)}`, arquivo);
  checar(await sb.from("demonstracoes").upsert({treinador_id:eu.id, exercicio_id:exId, imagem:caminho}));
  return publico("demonstracoes", caminho);
}

/* exclusão LGPD: apaga os arquivos do aluno em cada pasta e depois a ficha (o banco confere que não sobrou arquivo) */
async function concluirExclusao(pedido, alunoId){
  for (const bucket of ["fotos", "avaliacoes", "comprovantes", "alimentacao"]){
    const caminhos = await listarPasta(bucket, alunoId);
    if (caminhos.length) checar(await sb.storage.from(bucket).remove(caminhos));
  }
  return checar(await sb.rpc("concluir_exclusao", {pedido}));
}
async function listarPasta(bucket, pasta){
  const out = [], itens = checar(await sb.storage.from(bucket).list(pasta, {limit:1000}));
  for (const it of itens){
    if (it.id) out.push(`${pasta}/${it.name}`);
    else out.push(...await listarPasta(bucket, `${pasta}/${it.name}`));   // subpasta (ex.: uma por avaliação)
  }
  return out;
}

/* chat em tempo real: avisa quando chega mensagem (o banco só entrega o que a pessoa pode ver) */
function ouvirChat(aoChegar){
  sb.channel("chat").on("postgres_changes", {event:"INSERT", schema:"public", table:"mensagens"}, ev => aoChegar(ev.new.aluno_id, daMsg(ev.new))).subscribe();
}

return {iniciar, telaLogin, telaSemConvite, sair, carregar, gravar, enviarCadastro, aprovar, recusarCadastro, novoAluno,
  comprovante, confirmarComprovante, recusarComprovante, fotoAval, nutriPdf, demoImagem, concluirExclusao, ouvirChat,
  treinador: () => C.treinador || null, eu: () => eu};
})();
