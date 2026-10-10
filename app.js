(function(){
"use strict";
const D = window.DADOS;
/* modo nuvem: config.js preenchido → login e dados no banco. Sem config, é a demonstração de sempre */
const NUVEM = window.BANCO;
const {MARCA, EX, MODELOS, ALUNOS, HABITOS, DORES} = D;

/* ================= utilidades ================= */
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
const store = {
  get(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
  set(k,v){ try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k,v); } catch(e){} }
};
const clone = o => JSON.parse(JSON.stringify(o));
const DIA = 864e5;
const p2 = n => String(n).padStart(2,"0");
const hoje0 = () => { const d = new Date(); d.setHours(0,0,0,0); return d; };
const addDias = (d,n) => { const x = new Date(d); x.setDate(x.getDate()+n); return x; };
const iso = d => `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
const deIso = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y,m-1,d); };
const diasDesde = s => Math.round((hoje0() - deIso(s))/DIA);
const dow = d => (d.getDay()+6)%7; // segunda = 0
const SEM = ["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"];
const SEM_L = ["segunda","terça","quarta","quinta","sexta","sábado","domingo"];
const MESES = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const ddmm = d => `${p2(d.getDate())}/${p2(d.getMonth()+1)}`;
const quando = s => { const n = diasDesde(s); return n <= 0 ? "hoje" : n === 1 ? "ontem" : n < 7 ? `há ${n} dias` : ddmm(deIso(s)); };
const hora = ts => { const d = new Date(ts); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
const fmt = (n, c=1) => n == null || isNaN(n) ? "—" : Number(n).toLocaleString("pt-BR",{maximumFractionDigits:c});
const reais = n => "R$ " + Number(n).toLocaleString("pt-BR");
const primeiro = nome => nome.split(" ")[0];
const iniciais = nome => nome.split(" ").filter(Boolean).slice(0,2).map(p=>p[0]).join("").toUpperCase();
const corDe = s => { let h = 7; for (const c of s) h = (h*31 + c.charCodeAt(0)) % 360; return `hsl(${h} 42% 46%)`; };
const avatar = (a, cls="") => `<span class="av ${cls}" style="--c:${corDe(a.id)}">${esc(iniciais(a.nome))}</span>`;
/* protótipo: sem número, o WhatsApp abre pra escolher o contato. Na versão final vai o número do aluno / do Jorge */
const wa = txt => `https://wa.me/?text=${encodeURIComponent(txt)}`;
const repsNum = r => { const m = String(r).match(/\d+/g); return m ? +m[m.length-1] : 0; };
const numIn = v => { const n = parseFloat(String(v).replace(",",".")); return isNaN(n) ? null : n; };
const arred = x => x < 20 ? Math.round(x*2)/2 : Math.round(x/2.5)*2.5;
const uid = () => NUVEM ? crypto.randomUUID() : Math.random().toString(36).slice(2,9);
const plural = (n, s, p) => `${n} ${n === 1 ? s : (p || s + "s")}`;
function rng(seed){ let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const ICON = {
  casa:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  peso:'<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
  graf:'<path d="M4 4v16h16M8 15l3-4 3 2 5-6"/>',
  check:'<path d="M9 3h6v3H9zM8 4.5H5.5v16h13v-16H16M9 13.5l2 2 4-4"/>',
  painel:'<path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z"/>',
  alunos:'<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M16 3.5a4 4 0 0 1 0 7.5M22 21v-1a6 6 0 0 0-4-5.6"/>',
  grana:'<path d="M12 2.5v19M16.5 6.5c-.9-1.3-2.5-2-4.5-2-2.8 0-4.5 1.4-4.5 3.4 0 4.6 9.5 2.6 9.5 7.6 0 2-1.9 3.5-5 3.5-2.3 0-4.2-.8-5.1-2.4"/>',
  ok:'<path d="M5 12.5l4.5 4.5L19 7.5"/>'
};
const svg = (k, cls="") => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${ICON[k]}</svg>`;

/* ================= estado ================= */
const CHAVE = "jorge-personal:v2";
let S;

function carregar(){
  try {
    const s = JSON.parse(store.get(CHAVE));
    /* demonstração "envelhecida" (aberta muitos dias depois): recomeça com datas novas */
    if (s && s.v === 2 && diasDesde(s.semente) < 5) return s;
  } catch(e){}
  return null;
}
const CHAVE_NUVEM = "jorge-personal:nuvem";
/* na nuvem o celular só guarda a aba aberta e o treino em andamento; o resto mora no banco */
function salvar(){ NUVEM ? store.set(CHAVE_NUVEM, JSON.stringify({aba:S.aba, exec:S.exec})) : store.set(CHAVE, JSON.stringify(S)); }
/* manda pro banco sem travar a tela; se der erro de permissão, avisa */
function nuvem(op, ...args){
  if (!NUVEM) return;
  NUVEM.gravar(op, ...args)
    .then(r => { if (r === "fila") toast("Sem internet: salvo no celular, sobe quando voltar o sinal"); })
    .catch(e => { console.error(e); toast("Não salvou no banco: " + (e.message || e)); });
}

const aluno = id => ALUNOS.find(a => a.id === id);
const ex = id => EX[id] || S.exExtra[id] || {nome:id, grupo:"", local:"academia", dica:"", alt:[]};
const PLANO_B = [D.T_CASA, D.T_LIVRE];
const modeloDe = id => MODELOS.find(m => m.id === aluno(id).modelo) || MODELOS[0];
const treinosDe = id => S.treinos[id] || modeloDe(id).treinos;
const programaDe = id => S.programa[id] || modeloDe(id).nome;
const acharTreino = (id, letra) => treinosDe(id).find(t => t.letra === letra) || PLANO_B.find(t => t.letra === letra);
const sessoesDe = id => S.sessoes.filter(s => s.aluno === id).sort((a,b) => a.ts - b.ts);
const checkinsDe = id => S.checkins.filter(c => c.aluno === id).sort((a,b) => a.ts - b.ts);
const durEst = t => Math.max(15, Math.round((t.exs.reduce((m,e) => m + e.series*(50 + (e.desc||0)), 0)/60 + (t.local === "academia" ? 8 : 0))/5)*5);
const gruposDe = t => [...new Set(t.exs.map(e => ex(e.id).grupo).filter(g => g && g !== "Core" && g !== "Cardio"))];

function semear(){
  const h = hoje0(), r = rng(20261009);
  const s = {v:2, semente: iso(h), papel:null, aba:{aluno:"hoje", jorge:"painel"}, sessoes:[], checkins:[], treinos:{}, programa:{},
    venc:{}, pagos:{}, habitos:{}, fotos:[], exExtra:{}, exec:null, recado:D.RECADO, recadoData: iso(addDias(h,-2))};
  ALUNOS.forEach(a => { s.venc[a.id] = iso(addDias(h, a.venc)); });

  const fakeSessao = (aid, d, t, prog, comSeries) => {
    const series = []; let vol = 0;
    if (comSeries) t.exs.forEach(e => {
      for (let k = 0; k < e.series; k++){
        const kg = e.carga == null ? null : arred(e.carga * (0.8 + 0.2*prog));
        const reps = Math.max(1, repsNum(e.reps) - (k === e.series-1 && r() < .4 ? 1 : 0));
        series.push({ex:e.id, kg, reps});
        if (kg) vol += kg*reps;
      }
    });
    const ts = new Date(d);
    const hMax = iso(d) === iso(h) ? Math.max(6, new Date().getHours()-1) : 21;
    ts.setHours(Math.min(hMax, aid === "marina" ? 6 : 6 + Math.floor(r()*15)), Math.floor(r()*55));
    return {id:uid(), aluno:aid, data:iso(d), ts:ts.getTime(), letra:t.letra, nome:t.nome, dur:46 + Math.floor(r()*20),
      series, volume:Math.round(vol), rpe:7 + Math.floor(r()*2.5), dor:null, coment:"", prs:[]};
  };

  /* Marina: 12 semanas de histórico completo, seg/ter/qui/sex, ontem foi o último.
     A carga sobe em degraus a cada 3 semanas (como numa periodização de verdade) */
  const tm = D.T_MARINA; let k = 0;
  for (let n = 84; n >= 1; n--){
    const d = addDias(h,-n);
    if (n !== 1 && !([0,1,3,4].includes(dow(d)) && r() > .07)) continue;
    const ses = fakeSessao("marina", d, tm[k++ % tm.length], Math.floor((1 - n/84)*4 + .25)/4, true);
    if (n === 23){ ses.dor = "Ombro direito"; ses.coment = "Ombro incomodou um pouco na elevação lateral, troquei pela polia."; }
    if (n === 9) ses.coment = "Agachamento saiu muito bem hoje!";
    s.sessoes.push(ses);
  }
  /* recordes do histórico */
  const melhor = {};
  s.sessoes.forEach(ses => { ses.series.forEach(x => { if (x.kg != null && x.kg > (melhor[x.ex] || 0)){ if (melhor[x.ex]) ses.prs.includes(x.ex) || ses.prs.push(x.ex); melhor[x.ex] = x.kg; } }); });

  /* check-ins semanais da Marina (o da semana está pendente) */
  const resp = ["Boa semana! Peso descendo no ritmo certo. Mantém tudo.","Vi que o sono caiu: tenta deitar 30 min mais cedo essa semana.",
    "Excelente constância. Semana que vem a gente sobe a carga do agachamento.","Ótimo! A cintura caiu 1 cm e a carga subiu: é recomposição corporal.",
    "Semana mais puxada no trabalho, normal. O importante foi não zerar.","Mandou bem! Mantém a proteína em todas as refeições.",
    "Muito bom. Se o ombro incomodar de novo, faz a elevação na polia.","Semana top! Bora manter."];
  for (let i = 12; i >= 1; i--){
    const d = addDias(h, -7*i), j = 12 - i;
    s.checkins.push({id:uid(), aluno:"marina", data:iso(d), ts:d.getTime() + 9*36e5,
      peso: Math.round((66.8 - j*0.17 + (r()-.5)*.3)*10)/10, cintura: Math.round((74.5 - j*0.3)*2)/2,
      sono: 3 + Math.floor(r()*2.2), energia: 3 + Math.floor(r()*2.3), estresse: 2 + Math.floor(r()*2), dieta: 3 + Math.floor(r()*2.2),
      dor: i === 4 ? "Ombro direito, leve" : null, coment: i === 4 ? "Ombro deu sinal de novo, mas melhorou com a polia." : j % 3 === 0 ? "Semana tranquila." : "",
      resposta: resp[j % resp.length], respData: iso(addDias(d,1))});
  }

  /* outros alunos: últimos 28 dias com a frequência de cada um */
  const comentarios = {camila:"Treino pesado, amei! 🔥", pedro:"Bati 100 kg no agachamento!", beatriz:"Cansada, mas fiz tudo."};
  ALUNOS.filter(a => a.id !== "marina").forEach(a => {
    const adh = Math.max(.15, Math.min(1, (a.sem/a.meta)*.6 + .4 - (a.ult >= 5 ? .35 : 0)));
    const ts = modeloDe(a.id).treinos; let kk = 0;
    for (let n = 27; n >= a.ult; n--){
      const d = addDias(h,-n);
      if (n !== a.ult && r() > (a.meta/7)*adh*1.15) continue;
      const ses = fakeSessao(a.id, d, ts[kk++ % ts.length], 1, false);
      if (n === a.ult){
        if (a.dor){ ses.dor = a.dor; ses.coment = a.dor; }
        else if (comentarios[a.id]) ses.coment = comentarios[a.id];
      }
      s.sessoes.push(ses);
    }
    const dc = addDias(h, -a.ck);
    s.checkins.push({id:uid(), aluno:a.id, data:iso(dc), ts:dc.getTime() + (7 + Math.floor(r()*12))*36e5,
      peso:a.peso, cintura:null, sono:2 + Math.floor(r()*3), energia:2 + Math.floor(r()*3), estresse:2 + Math.floor(r()*3), dieta:2 + Math.floor(r()*3),
      dor:a.ck <= 2 && a.dor ? a.dor : null,
      coment: a.id === "aline" ? "Primeira semana sem dor nas costas desde o parto! 🙌" : a.id === "rafael" ? "Campeonato daqui a 3 semanas, dá pra ajustar o treino?" : a.id === "camila" ? "Glúteo respondendo muito, já vejo diferença na calça." : a.id === "diego" ? "Lombar travou no terra quinta. Tô evitando." : "",
      resposta: a.ck <= 2 ? null : "Valeu pelo check-in! Seguimos no plano.", respData: a.ck <= 2 ? null : iso(addDias(dc,1))});
  });
  return s;
}

/* ================= consultas ================= */
function ultimoTreinoDias(id){ const ss = sessoesDe(id); return ss.length ? diasDesde(ss[ss.length-1].data) : 99; }
function ultimoCheckin(id){ const cs = checkinsDe(id); return cs[cs.length-1] || null; }
function diasAteVenc(id){ return -diasDesde(S.venc[id]); }
function inicioSemana(){ const h = hoje0(); return addDias(h, -dow(h)); }
function sessoesSemana(id, semanasAtras = 0){
  const ini = addDias(inicioSemana(), -7*semanasAtras), fim = addDias(ini, 7);
  return sessoesDe(id).filter(s => { const d = deIso(s.data); return d >= ini && d < fim; });
}
function aderencia(id){
  const a = aluno(id), lim = addDias(hoje0(), -27);
  const n = sessoesDe(id).filter(s => deIso(s.data) >= lim).length;
  return Math.min(1, n / (a.meta*4));
}
function proximoTreino(id){
  const ts = treinosDe(id), ss = sessoesDe(id).filter(s => ts.some(t => t.letra === s.letra));
  if (!ss.length) return ts[0];
  const i = ts.findIndex(t => t.letra === ss[ss.length-1].letra);
  return ts[(i + 1) % ts.length];
}
function seriesAnteriores(id, exId){
  const ss = sessoesDe(id);
  for (let i = ss.length-1; i >= 0; i--){
    const x = ss[i].series.filter(z => z.ex === exId);
    if (x.length) return {data: ss[i].data, series: x};
  }
  return null;
}
function melhorCarga(id, exId){
  let m = 0;
  sessoesDe(id).forEach(s => s.series.forEach(z => { if (z.ex === exId && z.kg != null && z.kg > m) m = z.kg; }));
  return m;
}
function dorRecente(id){
  const ss = sessoesDe(id).filter(s => s.dor && diasDesde(s.data) <= 7);
  if (ss.length) return ss[ss.length-1].dor;
  const c = ultimoCheckin(id);
  return c && c.dor && diasDesde(c.data) <= 10 && !c.resposta ? c.dor : null;
}
function sequenciaSemanas(id){
  const meta = aluno(id).meta; let n = 0;
  for (let w = 1; w < 20; w++){ if (sessoesSemana(id, w).length >= meta) n++; else break; }
  return n;
}
function msgCobranca(a, dias){
  const p = primeiro(a.nome);
  return dias < 0
    ? `Oi ${p}, tudo bem? Passando pra lembrar que a mensalidade da consultoria (${reais(a.valor)}) venceu em ${ddmm(deIso(S.venc[a.id]))}. Segue a chave Pix: ${MARCA.pix}. Qualquer coisa me fala! 💪`
    : `Oi ${p}! Sua mensalidade (${reais(a.valor)}) vence ${dias === 0 ? "hoje" : "dia " + ddmm(deIso(S.venc[a.id]))}. Chave Pix: ${MARCA.pix}. Obrigado pela confiança, bora pra mais um mês! 💪`;
}
function alertas(){
  const out = [];
  ALUNOS.forEach(a => {
    const p = primeiro(a.nome), ult = ultimoTreinoDias(a.id), v = diasAteVenc(a.id);
    const c = ultimoCheckin(a.id), ck = c ? diasDesde(c.data) : 99, dor = dorRecente(a.id);
    if (dor) out.push({a, nivel:3, ic:"🩹", cls:"bad", t:`Relatou dor: ${dor}`,
      msg:`Oi ${p}! Vi que você sentiu dor (${dor.toLowerCase()}). Me conta melhor: dói em qual movimento? Até a gente conversar, pula o exercício que incomodou.`});
    if (ult >= 5) out.push({a, nivel: ult >= 9 ? 3 : 2, ic:"💤", cls: ult >= 9 ? "bad" : "warn", t:`${ult} dias sem treinar`,
      msg:`Oi ${p}, tudo bem? Senti sua falta nos treinos esses dias. Aconteceu alguma coisa? Se a rotina apertou, te mando um treino mais curto pra encaixar. 💪`});
    if (v < 0) out.push({a, nivel:3, ic:"💸", cls:"bad", t:`Mensalidade atrasada há ${plural(-v,"dia")}`, msg:msgCobranca(a, v)});
    else if (v <= 3) out.push({a, nivel:1, ic:"📅", cls:"warn", t: v === 0 ? "Mensalidade vence hoje" : `Mensalidade vence em ${plural(v,"dia")}`, msg:msgCobranca(a, v)});
    if (ck >= 10) out.push({a, nivel:1, ic:"📝", cls:"warn", t:`Check-in atrasado (${ck} dias)`,
      msg:`Oi ${p}! Bora fazer o check-in da semana? Leva 1 minuto no app e me ajuda a ajustar teu treino.`});
  });
  /* um cartão por aluno: o motivo mais grave na frente, os outros juntos */
  const porAluno = new Map();
  out.sort((x,y) => y.nivel - x.nivel).forEach(x => {
    const g = porAluno.get(x.a.id);
    if (g) g.t += " · " + x.t; else porAluno.set(x.a.id, Object.assign({}, x));
  });
  return [...porAluno.values()];
}
const checkinsPendentes = () => S.checkins.filter(c => !c.resposta).sort((a,b) => b.ts - a.ts);

/* ================= gráfico ================= */
function grafico(pts, {h = 150, casas = 1, unid = ""} = {}){
  if (pts.length < 2) return `<div class="vazio">Ainda poucos registros pra desenhar o gráfico.</div>`;
  const W = 320, H = h, pl = 4, pr = 40, pt = 14, pb = 22;
  const ys = pts.map(p => p.y), mn = Math.min(...ys), mx = Math.max(...ys), pad = (mx - mn)*.18 || 1;
  const lo = mn - pad, hi = mx + pad;
  const X = i => pl + (W - pl - pr)*i/(pts.length - 1), Y = v => pt + (H - pt - pb)*(1 - (v - lo)/(hi - lo));
  const d = pts.map((p,i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join("");
  const area = `${d}L${X(pts.length-1).toFixed(1)},${H-pb}L${X(0)},${H-pb}Z`;
  const grid = [mx, mn].map(v => `<line class="eixo" x1="${pl}" x2="${W-pr}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke-dasharray="3 4"/><text x="${W-pr+5}" y="${(Y(v)+3.5).toFixed(1)}">${fmt(v,casas)}${unid}</text>`).join("");
  const idx = [...new Set([0, Math.floor((pts.length-1)/2), pts.length-1])];
  const xl = idx.map(i => `<text x="${X(i).toFixed(1)}" y="${H-5}" text-anchor="${i === 0 ? "start" : i === pts.length-1 ? "end" : "middle"}">${esc(pts[i].x)}</text>`).join("");
  const dots = pts.map((p,i) => (pts.length <= 16 || i === pts.length-1) ? `<circle class="pt${i === pts.length-1 ? " ult" : ""}" cx="${X(i).toFixed(1)}" cy="${Y(p.y).toFixed(1)}" r="${i === pts.length-1 ? 4.5 : 3}"/>` : "").join("");
  return `<svg class="graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de ${fmt(pts[0].y,casas)} a ${fmt(pts[pts.length-1].y,casas)}">${grid}<path class="area" d="${area}"/><path class="lin" d="${d}"/>${dots}${xl}</svg>`;
}

/* ================= interface: toast, folha ================= */
let toastT;
function toast(msg){ const t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }

const pilha = [];
function abrirFolha(tit, render, substituir){
  if (substituir) pilha.length = 0;
  pilha.push({tit, render});
  desenharFolha(true);
  const f = $("folha"), v = $("veu");
  if (f.hidden){ f.hidden = false; v.hidden = false; requestAnimationFrame(() => { f.classList.add("on"); v.classList.add("on"); }); }
}
function desenharFolha(topo){
  const top = pilha[pilha.length-1]; if (!top) return;
  const c = $("folha-c"), y = c.scrollTop;
  $("folha-tit").innerHTML = (pilha.length > 1 ? `<button type="button" class="fechar" data-a="voltar" aria-label="Voltar" style="margin-right:8px;vertical-align:middle">‹</button>` : "") + esc(top.tit);
  c.innerHTML = top.render();
  c.scrollTop = topo ? 0 : y;
}
function voltarFolha(){ pilha.pop(); pilha.length ? desenharFolha(true) : fecharFolha(); }
function fecharFolha(){
  const f = $("folha"), v = $("veu");
  pilha.length = 0;
  f.classList.remove("on"); v.classList.remove("on");
  setTimeout(() => { if (!pilha.length){ f.hidden = true; v.hidden = true; } }, 260);
}

/* ================= entrada ================= */
function telaEntrada(){
  const e = $("entrada");
  e.innerHTML = `<div class="entrada-in">
    <div class="marca-g"><span class="logo">${esc(MARCA.iniciais)}</span><div><h1>${esc(MARCA.nome)}</h1><p class="muted">${esc(MARCA.slogan)}</p></div></div>
    <p class="lead">Protótipo pra mostrar a ideia. Escolha como quer ver o app:</p>
    <button type="button" class="papel" data-a="papel" data-p="aluno"><span class="ico">🏋️‍♀️</span><span><b>Sou aluna</b><span class="muted small">Ver como a Marina vê: treino do dia, cargas, check-in e evolução</span></span><span class="seta">›</span></button>
    <button type="button" class="papel" data-a="papel" data-p="jorge"><span class="ico">📋</span><span><b>Sou o Jorge</b><span class="muted small">Painel do treinador: 20 alunos, alertas, montar treino e cobrança</span></span><span class="seta">›</span></button>
    <button type="button" class="papel destaque" data-a="dores"><span class="ico">💡</span><span><b>Por que um app só seu?</b><span class="muted small">As dores dos apps de consultoria que já existem, e o que este resolve</span></span><span class="seta">›</span></button>
    <div class="demo"><span>🎬</span><span><b>Roteiro de demonstração:</b> entre como aluna, faça um treino e mande o check-in. Depois troque pro Jorge (botão no canto de cima) e veja tudo chegando no painel.</span></div>
    <div class="rodape stack">
      <button type="button" class="lnk" data-a="instalar">Como instalar no celular</button>
      <span class="tiny muted">Dados fictícios · nada aqui é de aluno real</span>
      <button type="button" class="lnk tiny" data-a="reiniciar" style="color:var(--muted)">Reiniciar demonstração</button>
    </div>
  </div>`;
  e.hidden = false;
}

/* ================= abas ================= */
const ABAS = {
  aluno: [["hoje","Hoje","casa"],["treinos","Treinos","peso"],["evolucao","Evolução","graf"],["checkin","Check-in","check"]],
  jorge: [["painel","Painel","painel"],["alunos","Alunos","alunos"],["montar","Treinos","peso"],["financeiro","Financeiro","grana"]]
};
const sub = {};  // sub-abas (segmentos) de cada tela
const filtro = {busca:"", tipo:"todos"};

function render(){
  if (!S.papel){ telaEntrada(); return; }
  $("entrada").hidden = true;
  const p = S.papel, aba = S.aba[p];
  $("top-logo").textContent = MARCA.iniciais;
  $("troca-txt").textContent = NUVEM ? "Sair" : p === "aluno" ? "Marina" : "Jorge";
  const badge = {checkin: checkinDevido() ? "1" : "", painel: checkinsPendentes().length || ""};
  $("tabbar").innerHTML = ABAS[p].map(([id, nome, ic]) =>
    `<button type="button" data-a="aba" data-v="${id}"${id === aba ? ' aria-current="page"' : ""}>${svg(ic)}<span>${nome}</span>${badge[id] ? `<b class="dot">${badge[id]}</b>` : ""}</button>`).join("");
  const V = {hoje:vHoje, treinos:vTreinos, evolucao:vEvolucao, checkin:vCheckin, painel:vPainel, alunos:vAlunos, montar:vMontar, financeiro:vFinanceiro}[aba];
  const r = V();
  $("top-sub").textContent = r.sub; $("top-tit").textContent = r.tit;
  $("tela").innerHTML = r.html;
  if (S.exec) desenharExec();
}
function irAba(v){ S.aba[S.papel] = v; salvar(); render(); $("main").scrollTop = 0; }
const segm = (chave, opcoes) => `<div class="seg" role="group">${opcoes.map(([v, n]) =>
  `<button type="button" data-a="seg" data-k="${chave}" data-v="${v}" aria-pressed="${(sub[chave] || opcoes[0][0]) === v}">${n}</button>`).join("")}</div>`;
const segAtual = (chave, padrao) => sub[chave] || padrao;
const dataHoje = () => { const h = hoje0(); return `${SEM_L[dow(h)]}, ${h.getDate()} de ${MESES[h.getMonth()]}`; };

/* ================= ALUNO · Hoje ================= */
let EU = "marina";  // na nuvem vira o id do aluno logado
function checkinDevido(){ const c = ultimoCheckin(EU); return !c || diasDesde(c.data) >= 7; }

function vHoje(){
  const a = aluno(EU), h = hoje0(), ses = sessoesSemana(EU);
  const feitos = new Set(ses.map(s => dow(deIso(s.data))));
  const seq = sequenciaSemanas(EU);
  const hojeFeito = sessoesDe(EU).filter(s => s.data === iso(h)).pop();
  const prox = proximoTreino(EU);
  let hero;
  if (S.exec){
    const t = acharTreino(EU, S.exec.letra), [ok, tot] = contaSeries();
    hero = `<div class="card hero"><span class="letra">${esc(t.letra)}</span><span class="eyebrow">Treino em andamento</span><h2>${esc(t.nome)}</h2>
      <div class="meta"><span>${ok} de ${tot} séries feitas</span></div>
      <button type="button" class="btn pri full" data-a="abrirExec">Continuar treino</button></div>`;
  } else if (hojeFeito){
    hero = `<div class="card hero"><span class="letra">✓</span><span class="eyebrow">Treino de hoje feito</span><h2>${esc(hojeFeito.letra)} · ${esc(hojeFeito.nome)}</h2>
      <div class="meta"><span>⏱ ${hojeFeito.dur} min</span><span>${hojeFeito.series.length} séries</span><span>Esforço ${hojeFeito.rpe}/10</span>${hojeFeito.prs.length ? `<span>🏆 ${plural(hojeFeito.prs.length,"recorde")}</span>` : ""}</div>
      <div class="btns"><button type="button" class="btn inv" data-a="verSessao" data-id="${hojeFeito.id}">Ver resumo</button><button type="button" class="btn ghost" style="color:inherit;border-color:color-mix(in srgb,var(--bg) 30%,transparent)" data-a="comecar" data-l="${esc(prox.letra)}">Fazer o ${esc(prox.letra)}</button></div></div>`;
  } else {
    const ult = sessoesDe(EU).filter(s => s.letra === prox.letra).pop();
    hero = `<div class="card hero"><span class="letra">${esc(prox.letra)}</span><span class="eyebrow">Seu próximo treino</span><h2>${esc(prox.nome)}</h2>
      <div class="meta"><span>${plural(prox.exs.length,"exercício")}</span><span>~${durEst(prox)} min</span>${ult ? `<span>último: ${quando(ult.data)}</span>` : ""}</div>
      <div class="btns"><button type="button" class="btn pri" data-a="comecar" data-l="${esc(prox.letra)}">Começar treino</button><button type="button" class="btn inv" data-a="verTreino" data-l="${esc(prox.letra)}" style="flex:0 0 auto">Ver</button></div></div>`;
  }
  const dots = SEM.map((n,i) => `<span class="d${feitos.has(i) ? " feito" : ""}${i === dow(h) ? " hoje" : ""}"><i>${feitos.has(i) ? svg("ok").replace('viewBox','style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:3" viewBox') : n[0]}</i>${n}</span>`).join("");
  const habH = S.habitos[iso(h)] || {};
  const v = diasAteVenc(EU);
  const html = `
    <div class="card">
      <div class="row sb"><b>Sua semana</b><span class="chip ${ses.length >= a.meta ? "ok" : "acc"}">${ses.length} de ${a.meta} treinos</span></div>
      <div class="semana">${dots}</div>
      ${seq ? `<p class="small muted">🔥 ${plural(seq,"semana")} seguida${seq > 1 ? "s" : ""} batendo a meta. Não quebra a sequência!</p>` : ""}
    </div>
    ${hero}
    <div class="sec"><h2>Sem academia hoje?</h2></div>
    <div class="planob">
      <button type="button" data-a="comecar" data-l="Casa"><span class="e">🏠</span><b>Treino em casa</b><span class="small muted">Sem equipamento · ${durEst(D.T_CASA)} min</span></button>
      <button type="button" data-a="comecar" data-l="Rua"><span class="e">🌳</span><b>Ao ar livre</b><span class="small muted">Praça ou praia · ${durEst(D.T_LIVRE)} min</span></button>
    </div>
    ${checkinDevido() ? `<button type="button" class="card row" data-a="aba" data-v="checkin" style="text-align:left;border-color:var(--accent)">
      <span class="ic acc">📝</span><span class="grow"><b>Check-in da semana</b><br><span class="small muted">Leva 1 minuto. O Jorge responde até amanhã.</span></span><span class="seta muted">›</span></button>` : ""}
    <div class="card">
      <div class="row sb"><span class="eyebrow">Recado do ${esc(MARCA.curto)} · ${quando(S.recadoData)}</span></div>
      <div class="recado"><span class="logo sm">${esc(MARCA.iniciais)}</span><p class="bolha">${esc(S.recado)}</p></div>
      <a class="lnk small" href="${wa("Oi Jorge! Sobre o recado: ")}" target="_blank" rel="noopener">Responder no WhatsApp ›</a>
    </div>
    <div class="sec"><h2>Hábitos de hoje</h2><span class="small muted">${Object.values(habH).filter(Boolean).length} de ${HABITOS.length}</span></div>
    <div class="habitos">${HABITOS.map(x => `<button type="button" class="hab" data-a="habito" data-id="${x.id}" aria-pressed="${!!habH[x.id]}"><span class="e">${x.icone}</span>${esc(x.nome.split(" ")[0])}<span class="tiny">${esc(x.meta)}</span></button>`).join("")}</div>
    <div class="card row flat">
      <span class="ic ${v < 0 ? "bad" : v <= 7 ? "warn" : "ok"}">💳</span>
      <span class="grow"><b>Plano ${esc(a.tipo)}</b><br><span class="small muted">${v < 0 ? `Venceu há ${plural(-v,"dia")}` : v === 0 ? "Vence hoje" : `Vence em ${plural(v,"dia")} (${ddmm(deIso(S.venc[EU]))})`}</span></span>
      <button type="button" class="btn sm" data-a="pix">Pagar com Pix</button>
    </div>`;
  return {sub: dataHoje(), tit: `Oi, ${primeiro(a.nome)}`, html};
}

/* ================= ALUNO · Treinos ================= */
function cardTreino(t, aid, aberto){
  const ultimo = sessoesDe(aid).filter(s => s.letra === t.letra).pop();
  const cls = t.local === "academia" ? "" : t.local === "casa" ? "casa" : "livre";
  return `<details class="card dt"${aberto ? " open" : ""}><summary class="row">
      <span class="letra-b ${cls}">${t.local === "casa" ? "🏠" : t.local === "livre" ? "🌳" : esc(t.letra)}</span>
      <span class="grow"><b>${esc(t.nome)}</b><br><span class="small muted">${plural(t.exs.length,"exercício")} · ~${durEst(t)} min${ultimo ? ` · feito ${quando(ultimo.data)}` : ""}</span></span>
      <span class="seta muted">›</span></summary>
    <div class="trn">${t.exs.map((e,i) => {
      const u = seriesAnteriores(aid, e.id), kg = u && u.series[0].kg != null ? u.series[u.series.length-1].kg : e.carga;
      return `<div class="ex"><span class="n">${i+1}</span><div class="grow stack" style="gap:2px"><b>${esc(ex(e.id).nome)}</b>
        <span class="small muted">${e.series} × ${esc(e.reps)}${e.desc ? ` · descanso ${e.desc}s` : ""}${kg != null ? ` · <b style="color:var(--ink)">${fmt(kg)} kg</b>` : ""}</span>
        ${e.obs ? `<span class="small" style="color:var(--warn)">${esc(e.obs)}</span>` : ""}</div></div>`;}).join("")}
    </div>
    <button type="button" class="btn pri full" data-a="comecar" data-l="${esc(t.letra)}">Começar ${t.local === "academia" ? "treino " + esc(t.letra) : "este treino"}</button>
  </details>`;
}
function vTreinos(){
  const s = segAtual("treinos","meus");
  let html = segm("treinos", [["meus","Meus treinos"],["hist","Histórico"]]);
  if (s === "meus"){
    const prox = proximoTreino(EU);
    html += `<p class="small muted">Programa <b style="color:var(--ink)">${esc(programaDe(EU))}</b>, montado pelo ${esc(MARCA.curto)}. O próximo da fila é o <b style="color:var(--ink)">${esc(prox.letra)}</b>.</p>`;
    html += treinosDe(EU).map(t => cardTreino(t, EU, t.letra === sub.abrirTreino)).join("");
    html += `<div class="sec"><h2>Plano B</h2></div>` + PLANO_B.map(t => cardTreino(t, EU, t.letra === sub.abrirTreino)).join("");
    sub.abrirTreino = null;
  } else {
    const ss = sessoesDe(EU).slice().reverse();
    const mes = ss.filter(x => diasDesde(x.data) < 30);
    html += `<div class="kpis"><div class="kpi"><b>${mes.length}</b><span>treinos em 30 dias</span></div>
      <div class="kpi"><b>${fmt(mes.reduce((m,x) => m + x.volume, 0)/1000,1)} t</b><span>levantadas em 30 dias</span></div></div>`;
    html += `<div class="lista">${ss.slice(0,25).map(x => `<button type="button" class="it" data-a="verSessao" data-id="${x.id}">
      <span class="letra-b" style="width:36px;height:36px;font-size:.9rem">${esc(x.letra)}</span>
      <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(x.nome)}</span><span class="s">${esc(SEM_L[dow(deIso(x.data))])}, ${ddmm(deIso(x.data))} · ${x.dur} min · esforço ${x.rpe}/10</span></span>
      <span class="r">${x.prs.length ? `<span class="chip acc">🏆 ${x.prs.length}</span>` : ""}${x.dor ? `<span class="chip bad">dor</span>` : ""}</span></button>`).join("")}</div>`;
  }
  return {sub: `Programa · ${programaDe(EU)}`, tit: "Treinos", html};
}
function folhaSessao(id){
  const x = S.sessoes.find(s => s.id === id); if (!x) return;
  abrirFolha(`Treino ${x.letra} · ${ddmm(deIso(x.data))}`, () => {
    const porEx = [];
    x.series.forEach(z => { let g = porEx.find(p => p.ex === z.ex); if (!g) porEx.push(g = {ex:z.ex, s:[]}); g.s.push(z); });
    return `<div class="res3"><div><b>${x.dur}'</b><span>duração</span></div><div><b>${x.series.length}</b><span>séries</span></div><div><b>${x.volume >= 1000 ? fmt(x.volume/1000,1) + " t" : fmt(x.volume,0) + " kg"}</b><span>volume</span></div></div>
      <div class="row"><span class="chip">Esforço ${x.rpe}/10</span>${x.dor ? `<span class="chip bad">Dor: ${esc(x.dor)}</span>` : ""}</div>
      ${x.coment ? `<div class="recado"><span class="av" style="--c:${corDe(x.aluno)}">${esc(iniciais(aluno(x.aluno).nome))}</span><p class="bolha">${esc(x.coment)}</p></div>` : ""}
      ${porEx.length ? `<div class="lista">${porEx.map(g => `<div class="it"><span class="grow stack" style="gap:2px"><span class="t">${esc(ex(g.ex).nome)}${x.prs.includes(g.ex) ? " 🏆" : ""}</span>
        <span class="s mono">${g.s.map(z => (z.kg != null ? fmt(z.kg) + "kg×" : "") + z.reps).join("  ·  ")}</span></span></div>`).join("")}</div>` : `<div class="vazio">Treino registrado sem detalhe das séries.</div>`}`;
  });
}

/* ================= ALUNO · Evolução ================= */
const ton = kg => kg >= 1000 ? `${fmt(kg/1000,1)} t` : `${fmt(kg,0)} kg`;
const pct = (a, b) => b ? Math.round((a/b - 1)*100) : 0;
const sinal = n => n > 0 ? `+${n}` : `${n}`;
const MES_C = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

/* linha pequena, sem eixo (pra caber ao lado do nome) */
function mini(ys, w = 96, h = 32){
  if (ys.length < 2) return "";
  const mn = Math.min(...ys), mx = Math.max(...ys), r = (mx - mn) || 1;
  const X = i => 3 + (w - 6)*i/(ys.length - 1), Y = v => h - 4 - (h - 8)*(v - mn)/r;
  return `<svg class="mini-g" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><path d="${ys.map((v,i) => (i ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1)).join("")}"/><circle cx="${X(ys.length-1).toFixed(1)}" cy="${Y(ys[ys.length-1]).toFixed(1)}" r="3"/></svg>`;
}
/* barras por semana (a semana atual fica mais clara: ainda não acabou) */
function barras(sem){
  const W = 320, H = 150, pt = 18, pb = 22, n = sem.length, gap = 5, bw = (W - gap*(n - 1))/n;
  const mx = Math.max(...sem.map(s => s.vol), 1);
  return `<svg class="graf" viewBox="0 0 ${W} ${H}" role="img" aria-label="Volume por semana">${sem.map((s,i) => {
    const h = (H - pt - pb)*s.vol/mx, x = i*(bw + gap), y = H - pb - h;
    return `<rect class="barra${s.w === 0 ? " atual" : ""}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, s.vol ? 2 : 0).toFixed(1)}" rx="3"/>`
      + (s.vol === mx || s.w === 0 ? `<text class="val" x="${(x + bw/2).toFixed(1)}" y="${(y - 5).toFixed(1)}" text-anchor="middle">${fmt(s.vol/1000,1)}</text>` : "")
      + (i % 3 === 2 || i === 0 ? `<text x="${(x + bw/2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${ddmm(s.ini)}</text>` : "");
  }).join("")}</svg>`;
}
function semanasDe(ss, n = 12){
  const ini = inicioSemana();
  return Array.from({length:n}, (_, i) => {
    const w = n - 1 - i, a = addDias(ini, -7*w), b = addDias(a, 7);
    const x = ss.filter(s => { const d = deIso(s.data); return d >= a && d < b; });
    return {w, ini:a, ses:x, n:x.length, vol:x.reduce((m,s) => m + s.volume, 0), min:x.reduce((m,s) => m + s.dur, 0)};
  });
}
/* melhor carga de um exercício em cada sessão em que ele apareceu */
function historicoEx(ss, exId){
  return ss.map(s => { const k = s.series.filter(z => z.ex === exId && z.kg != null); return k.length ? {s, kg:Math.max(...k.map(z => z.kg)), series:s.series.filter(z => z.ex === exId)} : null; }).filter(Boolean);
}

function vEvolucao(){
  const s = segAtual("evo","desemp");
  let html = segm("evo", [["desemp","Desempenho"],["cargas","Cargas"],["freq","Frequência"],["fotos","Fotos"]]);
  const ss = sessoesDe(EU);
  html += s === "desemp" ? evoDesempenho(ss) : s === "cargas" ? evoCargas(ss) : s === "freq" ? evoFreq(ss) : evoFotos();
  return {sub:"Seu progresso", tit:"Evolução", html};
}

function evoDesempenho(ss){
  const sem = semanasDe(ss);
  const ult4 = sem.slice(7, 11).reduce((m,s) => m + s.vol, 0), ant4 = sem.slice(3, 7).reduce((m,s) => m + s.vol, 0);
  const dv = pct(ult4, ant4);
  const m30 = ss.filter(x => diasDesde(x.data) < 30);
  const prs30 = m30.reduce((m,x) => m + x.prs.length, 0);
  const rpe = m30.length ? m30.reduce((m,x) => m + x.rpe, 0)/m30.length : 0;
  const horas = m30.reduce((m,x) => m + x.dur, 0)/60;
  /* força: quanto a melhor carga de cada exercício subiu do começo até agora */
  const evol = [...new Set(ss.flatMap(x => x.series.filter(z => z.kg != null).map(z => z.ex)))].map(id => {
    const h = historicoEx(ss, id); if (h.length < 2) return null;
    return {id, de:h[0].kg, para:h[h.length-1].kg, p:pct(h[h.length-1].kg, h[0].kg)};
  }).filter(Boolean).sort((a,b) => b.p - a.p);
  const forca = evol.length ? Math.round(evol.reduce((m,e) => m + e.p, 0)/evol.length) : 0;
  const semAtual = sem[11], meta = aluno(EU).meta;
  const cs = checkinsDe(EU);
  const pts = cs.filter(c => c.peso).map(c => ({x:ddmm(deIso(c.data)), y:c.peso}));
  const cin = cs.filter(c => c.cintura).map(c => ({x:ddmm(deIso(c.data)), y:c.cintura}));
  const dp = pts.length > 1 ? pts[pts.length-1].y - pts[0].y : 0;
  return `
    <div class="card hero" style="gap:8px"><span class="eyebrow">Últimas 4 semanas</span>
      <h2 style="max-width:none">${ton(ult4)} levantadas</h2>
      <div class="meta"><span>${dv >= 0 ? "▲" : "▼"} ${sinal(dv)}% de volume vs. as 4 semanas anteriores</span></div></div>
    <div class="card"><div class="row sb"><span class="eyebrow">Volume por semana (toneladas)</span><span class="tiny muted">esta semana: ${semAtual.n}/${meta} treinos</span></div>${barras(sem)}
      <p class="tiny muted">Volume = carga × repetições de todas as séries. Subindo devagar, semana a semana, é sinal de progresso.</p></div>
    <div class="kpis">
      <div class="kpi"><b style="color:var(--ok)">${sinal(forca)}%</b><span>força média (cargas em 12 semanas)</span></div>
      <div class="kpi"><b>${prs30}</b><span>recordes em 30 dias</span></div>
      <div class="kpi"><b>${fmt(rpe,1)}<small class="muted" style="font-size:.9rem">/10</small></b><span>esforço médio dos treinos</span></div>
      <div class="kpi"><b>${fmt(horas,0)}h</b><span>treinando em 30 dias</span></div>
    </div>
    <div class="sec"><h2>Quem mais evoluiu</h2><button type="button" class="lnk" data-a="seg" data-k="evo" data-v="cargas">Ver todas ›</button></div>
    <div class="lista">${evol.slice(0,4).map((e,i) => `<div class="it"><span class="ic acc" style="font-weight:900">${i+1}º</span>
      <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(ex(e.id).nome)}</span><span class="s">${fmt(e.de)} → <b style="color:var(--ink)">${fmt(e.para)} kg</b></span></span>
      ${mini(historicoEx(ss, e.id).map(h => h.kg), 70, 28)}<span class="chip ok">${sinal(e.p)}%</span></div>`).join("")}</div>
    <details class="card dt"><summary class="row"><span class="ic">⚖️</span><span class="grow"><b>Balança e medidas</b><br><span class="small muted">${fmt(pts.length ? pts[pts.length-1].y : null)} kg · ${fmt(cin.length ? cin[cin.length-1].y : null)} cm de cintura · dos check-ins</span></span><span class="seta muted">›</span></summary>
      <span class="eyebrow">Peso</span><div class="big"><b>${fmt(pts.length ? pts[pts.length-1].y : null)} kg</b>${pts.length > 1 ? `<span class="delta ${dp <= 0 ? "ok" : "bad"}">${dp > 0 ? "+" : ""}${fmt(dp)} kg desde ${pts[0].x}</span>` : ""}</div>${grafico(pts, {h:120})}
      <span class="eyebrow">Cintura</span>${grafico(cin, {h:110})}
      <p class="small muted">A balança sozinha engana: peso parado com carga subindo e cintura caindo é ganho de músculo e perda de gordura.</p></details>`;
}

function evoCargas(ss){
  const ts = treinosDe(EU);
  return `<p class="small muted">Toque num treino pra ver a carga de cada exercício.</p>` + ts.map(t => {
    const sess = ss.filter(s => s.letra === t.letra);
    const vols = sess.map(s => s.volume), dv = vols.length > 1 ? pct(vols[vols.length-1], vols[0]) : 0;
    const prs = sess.reduce((m,s) => m + s.prs.length, 0);
    const aberto = sub.treinoEvo === t.letra;
    return `<details class="card dt" data-fold="${t.letra}"${aberto ? " open" : ""}><summary class="row">
        <span class="letra-b">${esc(t.letra)}</span>
        <span class="grow stack" style="gap:2px"><b>${esc(t.nome)}</b><span class="small muted">${plural(sess.length,"treino")} · ${prs} recorde${prs === 1 ? "" : "s"}</span></span>
        <span class="stack" style="align-items:flex-end;gap:2px">${mini(vols, 70, 26)}<span class="chip ${dv >= 0 ? "ok" : "bad"}">${sinal(dv)}%</span></span></summary>
      <div class="stack" style="gap:10px;margin-top:12px">
        <div class="card flat" style="background:var(--bg)"><span class="eyebrow">Volume do treino ${esc(t.letra)} (kg)</span>
          <div class="big"><b>${ton(vols[vols.length-1] || 0)}</b><span class="delta ${dv >= 0 ? "ok" : "bad"}">${sinal(dv)}% desde o 1º</span></div>
          ${grafico(sess.map(s => ({x:ddmm(deIso(s.data)), y:s.volume})), {h:110, casas:0})}</div>
        ${t.exs.map(e => cardCargaEx(sess, e)).join("")}
      </div></details>`;
  }).join("") + `<div class="card row flat"><span class="ic acc">🏆</span><span class="grow"><b>${ss.reduce((m,x) => m + x.prs.length, 0)} recordes</b><br><span class="small muted">batidos nas últimas 12 semanas</span></span></div>`;
}
function cardCargaEx(sess, e){
  const info = ex(e.id), h = historicoEx(sess, e.id);
  if (!h.length){
    const u = sess.slice().reverse().find(s => s.series.some(z => z.ex === e.id));
    const sr = u ? u.series.filter(z => z.ex === e.id) : [];
    return `<div class="excarga"><div class="row sb"><b class="ellip">${esc(info.nome)}</b><span class="chip">peso corporal</span></div>
      <span class="small muted">${sr.length ? `Última: ${sr.map(z => z.reps).join(", ")} ${/s$/.test(e.reps) ? "seg" : "reps"}` : "Sem registro ainda"}</span></div>`;
  }
  const ult = h[h.length-1], rec = Math.max(...h.map(x => x.kg)), d = pct(ult.kg, h[0].kg);
  return `<div class="excarga">
    <div class="row sb"><b class="ellip">${esc(info.nome)}</b><span class="chip ${d > 0 ? "ok" : ""}">${d > 0 ? sinal(d) + "%" : "mantendo"}</span></div>
    <div class="row"><span class="grow stack" style="gap:1px"><span class="kg">${fmt(ult.kg)} <small>kg</small></span>
      <span class="tiny muted">começou com ${fmt(h[0].kg)} kg · recorde ${fmt(rec)} kg</span></span>${mini(h.map(x => x.kg), 110, 38)}</div>
    <span class="small muted">Última (${quando(ult.s.data)}): ${ult.series.map(z => z.reps).join(", ")} reps · ${plural(ult.series.length,"série")}</span>
  </div>`;
}

function evoFreq(ss){
  const h = hoje0(), ini = addDias(inicioSemana(), -77);
  const porDia = new Map(); ss.forEach(s => { (porDia.get(s.data) || porDia.set(s.data, []).get(s.data)).push(s); });
  const sel = sub.diaSel || (ss.length ? ss[ss.length-1].data : iso(h));
  /* cabeçalho com o mês em cima da primeira semana de cada mês */
  let grade = `<span></span>` + Array.from({length:12}, (_,w) => { const d = addDias(ini, w*7), ant = addDias(d, -7);
    return `<span class="mes">${w === 0 || d.getMonth() !== ant.getMonth() ? MES_C[d.getMonth()] : ""}</span>`; }).join("");
  for (let d = 0; d < 7; d++){
    grade += `<span class="lb">${SEM[d][0]}</span>`;
    for (let w = 0; w < 12; w++){
      const dd = addDias(ini, w*7 + d), k = iso(dd), x = porDia.get(k);
      grade += dd > h ? `<span class="hc fut"></span>`
        : `<button type="button" class="hc${x ? " on" : ""}${k === iso(h) ? " hj" : ""}${k === sel ? " sel" : ""}" data-a="dia" data-d="${k}" aria-label="${ddmm(dd)}${x ? ": treino " + x.map(s => s.letra).join(" e ") : ""}">${x ? esc(x[0].letra.slice(0,1)) : ""}</button>`;
    }
  }
  const dSel = deIso(sel), xs = porDia.get(sel) || [];
  const detalhe = `<div class="card" id="dia-det"><span class="eyebrow">${SEM_L[dow(dSel)]}, ${ddmm(dSel)}${sel === iso(h) ? " · hoje" : ""}</span>
    ${xs.length ? xs.map(s => `<div class="row"><span class="letra-b">${esc(s.letra)}</span><span class="grow stack" style="gap:1px"><b>${esc(s.nome)}</b>
        <span class="small muted">${s.dur} min · ${s.series.length} séries · ${ton(s.volume)} · esforço ${s.rpe}/10</span></span></div>
      ${s.prs.length ? `<div class="chips">${s.prs.map(id => `<span class="chip acc">🏆 ${esc(ex(id).nome)}</span>`).join("")}</div>` : ""}
      ${s.dor ? `<span class="chip bad" style="align-self:flex-start">🩹 ${esc(s.dor)}</span>` : ""}
      ${s.coment ? `<div class="recado"><span class="av" style="--c:${corDe(EU)}">${esc(iniciais(aluno(EU).nome))}</span><p class="bolha">${esc(s.coment)}</p></div>` : ""}
      <button type="button" class="btn sm" data-a="verSessao" data-id="${s.id}" style="align-self:flex-start">Ver as séries</button>`).join("")
    : `<p class="muted">${dSel > h ? "Esse dia ainda não chegou." : "Dia sem treino. Descanso também faz parte 😴"}</p>`}</div>`;
  const m30 = ss.filter(x => diasDesde(x.data) < 30).length, meta = aluno(EU).meta;
  const sem = semanasDe(ss).reverse();
  return `<div class="card"><div class="row sb"><span class="eyebrow">Últimas 12 semanas</span><span class="tiny muted">toque num dia</span></div>
      <div class="heat2">${grade}</div>
      <div class="row tiny muted" style="gap:14px"><span class="row" style="gap:5px"><i class="hc on" style="width:12px;display:inline-block"></i>treinou (letra do treino)</span><span class="row" style="gap:5px"><i class="hc" style="width:12px;display:inline-block"></i>descanso</span></div></div>
    ${detalhe}
    <div class="kpis"><div class="kpi"><b>${m30}</b><span>treinos em 30 dias</span></div><div class="kpi"><b>${fmt(m30/30*7,1)}</b><span>treinos por semana</span></div>
      <div class="kpi"><b>${sequenciaSemanas(EU)}</b><span>semanas seguidas na meta</span></div><div class="kpi"><b>${Math.round(aderencia(EU)*100)}%</b><span>aderência ao plano</span></div></div>
    <div class="sec"><h2>Semana a semana</h2></div>
    <div class="lista">${sem.map(s => `<details class="dt semdet"${s.w === 0 ? " open" : ""}><summary class="it">
        <span class="grow stack" style="gap:1px"><span class="t">${s.w === 0 ? "Esta semana" : s.w === 1 ? "Semana passada" : `${ddmm(s.ini)} a ${ddmm(addDias(s.ini,6))}`}</span><span class="s">${ton(s.vol)} · ${fmt(s.min/60,1)}h treinando</span></span>
        <span class="chip ${s.n >= meta ? "ok" : s.w === 0 ? "acc" : "warn"}">${s.n}/${meta}</span><span class="seta">›</span></summary>
      <div class="diasem">${SEM.map((n,i) => { const dd = addDias(s.ini, i), x = porDia.get(iso(dd)) || [];
        return x.length ? x.map(z => `<button type="button" class="dl" data-a="verSessao" data-id="${z.id}"><span class="muted">${n} ${ddmm(dd)}</span><span class="letra-b" style="width:26px;height:26px;font-size:.75rem;border-radius:8px">${esc(z.letra)}</span><span class="ellip">${esc(z.nome)}${z.prs.length ? " 🏆" : ""}</span><span class="muted mono">${z.dur}'</span></button>`).join("")
          : `<div class="dl vazio-d"><span class="muted">${n} ${ddmm(dd)}</span><span></span><span class="muted">${dd > hoje0() ? "" : iso(dd) === iso(hoje0()) ? "hoje" : "descanso"}</span><span></span></div>`; }).join("")}</div></details>`).join("")}</div>`;
}

function evoFotos(){
  const silh = `<svg viewBox="0 0 40 80"><circle cx="20" cy="9" r="7"/><path d="M9 20h22l-2 26h-4l-1 30h-8l-1-30h-4z"/></svg>`;
  return `<p class="small muted">Fotos ficam só entre você e o ${esc(MARCA.curto)}, nunca públicas. Mesma luz, mesmo lugar, mesma roupa: a comparação fica justa.</p>
    <div class="fotos">
      ${NUVEM ? "" : `<div class="foto">${silh}<span>Fev · início</span></div>
      <div class="foto">${silh}<span>Jun</span></div>`}
      ${S.fotos.map(f => `<div class="foto" style="background-image:url(${f.src})"><span>${esc(f.rot)}</span></div>`).join("")}
      <label class="foto add"><b>+</b>Nova foto<input type="file" accept="image/*" data-in="foto" hidden></label>
    </div>
    ${NUVEM ? "" : `<div class="demo"><span>🔒</span><span>Na versão final as fotos vão pra uma pasta privada do banco, com link que expira. Aqui no protótipo elas ficam só no seu celular.</span></div>`}`;
}

/* ================= ALUNO · Check-in ================= */
const CK = {};  // rascunho do check-in
const ESC5 = {sono:["😫","😪","😐","🙂","😴"], energia:["🪫","😮‍💨","😐","💪","⚡"], estresse:["😌","🙂","😐","😣","🤯"], dieta:["🍔","😬","😐","🥗","🏆"]};
const ROT5 = {sono:["Péssimo","Ruim","Ok","Bom","Ótimo"], energia:["Zerada","Baixa","Ok","Boa","Voando"], estresse:["Zen","Baixo","Médio","Alto","No limite"], dieta:["Ruim","Fraca","Ok","Boa","Perfeita"]};
function escala(campo, titulo){
  return `<div class="campo"><span class="lbl">${titulo}</span><div class="escala">${ESC5[campo].map((e,i) =>
    `<button type="button" data-a="ck" data-c="${campo}" data-v="${i+1}" aria-pressed="${CK[campo] === i+1}" aria-label="${ROT5[campo][i]}">${e}<small>${ROT5[campo][i]}</small></button>`).join("")}</div></div>`;
}
function vCheckin(){
  const cs = checkinsDe(EU), ult = cs[cs.length-1], devido = checkinDevido();
  if (CK.peso == null){ CK.peso = ult ? ult.peso : 65; CK.cintura = ult && ult.cintura ? ult.cintura : 72; }
  const nSem = sessoesDe(EU).filter(s => diasDesde(s.data) < 7).length;
  let html = "";
  if (devido || sub.ckForcar){
    html += `<div class="card"><span class="eyebrow">Check-in da semana ${cs.length + 1}</span>
      <p class="small muted">Responde com sinceridade: é isso que faz o ${esc(MARCA.curto)} ajustar teu treino. Leva 1 minuto.</p></div>
      <div class="card">
        <div class="campo"><span class="lbl">Peso (em jejum)</span><div class="passo"><button type="button" data-a="passo" data-c="peso" data-d="-0.1">−</button><input inputmode="decimal" data-in="ck" data-c="peso" value="${fmt(CK.peso)}"><button type="button" data-a="passo" data-c="peso" data-d="0.1">+</button></div></div>
        <div class="campo"><span class="lbl">Cintura (na altura do umbigo)</span><div class="passo"><button type="button" data-a="passo" data-c="cintura" data-d="-0.5">−</button><input inputmode="decimal" data-in="ck" data-c="cintura" value="${fmt(CK.cintura)}"><button type="button" data-a="passo" data-c="cintura" data-d="0.5">+</button></div></div>
      </div>
      <div class="card">${escala("sono","Como foi o sono?")}${escala("energia","Energia nos treinos")}${escala("estresse","Estresse da semana")}${escala("dieta","Alimentação")}</div>
      <div class="card">
        <div class="campo"><span class="lbl">Treinos</span><p class="small">O app já contou: <b>${plural(nSem,"treino")}</b> nos últimos 7 dias.</p></div>
        <div class="campo"><span class="lbl">Sentiu alguma dor?</span>
          <div class="chips"><button type="button" class="chip" data-a="ck" data-c="temDor" data-v="0" aria-pressed="${CK.temDor === 0}">Não</button><button type="button" class="chip" data-a="ck" data-c="temDor" data-v="1" aria-pressed="${CK.temDor === 1}">Sim</button></div>
          ${CK.temDor === 1 ? `<input class="inp" data-in="ck" data-c="dor" placeholder="Onde? Ex.: joelho esquerdo no agachamento" value="${esc(CK.dor || "")}">` : ""}</div>
        <div class="campo"><label for="ck-c">Como foi a semana?</label><textarea id="ck-c" class="inp" data-in="ck" data-c="coment" placeholder="O que foi bem, o que travou, alguma dúvida pro ${esc(MARCA.curto)}…">${esc(CK.coment || "")}</textarea></div>
      </div>
      <button type="button" class="btn pri full" data-a="enviarCk">Enviar check-in pro ${esc(MARCA.curto)}</button>`;
  } else {
    const prox = 7 - diasDesde(ult.data);
    html += `<div class="card row"><span class="ic ok">✅</span><span class="grow"><b>Check-in em dia</b><br><span class="small muted">Próximo em ${plural(prox,"dia")} (${SEM_L[dow(addDias(deIso(ult.data),7))]}).</span></span></div>
      <button type="button" class="lnk small" data-a="ckForcar" style="align-self:flex-start">Fazer um check-in extra agora</button>`;
  }
  html += `<div class="sec"><h2>Conversa dos check-ins</h2></div>`;
  html += cs.slice().reverse().slice(0,6).map(c => blocoCheckin(c, "aluno")).join("");
  return {sub:"Toda semana, 1 minuto", tit:"Check-in", html};
}
function blocoCheckin(c, visao){
  const a = aluno(c.aluno), eu = visao === "aluno";
  return `<div class="stack" style="gap:8px">
    <div class="msg ${eu ? "eu" : "ele"}"><span class="q">${eu ? "Você" : esc(primeiro(a.nome))} · ${quando(c.data)}</span>
      <div class="b"><b>${fmt(c.peso)} kg</b>${c.cintura ? ` · ${fmt(c.cintura)} cm` : ""} · sono ${ESC5.sono[c.sono-1]} · energia ${ESC5.energia[c.energia-1]} · comida ${ESC5.dieta[c.dieta-1]}${c.dor ? `<br>🩹 ${esc(c.dor)}` : ""}${c.coment ? `<br>${esc(c.coment)}` : ""}</div></div>
    ${c.resposta ? `<div class="msg ${eu ? "ele" : "eu"}"><span class="q">${esc(MARCA.curto)} · ${quando(c.respData)}</span><div class="b">${esc(c.resposta)}</div></div>`
      : eu ? `<div class="msg ele"><span class="q">${esc(MARCA.curto)}</span><div class="b muted">Vai responder em breve…</div></div>` : ""}
  </div>`;
}

/* ================= treino em andamento ================= */
function comecar(letra){
  if (S.exec && S.exec.letra !== letra){
    if (!confirm("Tem um treino em andamento. Descartar e começar outro?")) { abrirExec(); return; }
  }
  if (!S.exec){
    const t = acharTreino(EU, letra);
    S.exec = {letra, inicio: Date.now(), trocas:{}, sets:{}, dicas:{}};
    t.exs.forEach((e,i) => { S.exec.sets[i] = preencher(e, e.id); });
    salvar();
  }
  abrirExec();
}
function preencher(e, exId){
  const u = seriesAnteriores(EU, exId), out = [];
  for (let k = 0; k < e.series; k++){
    const p = u ? (u.series[k] || u.series[u.series.length-1]) : null;
    out.push({kg: p && p.kg != null ? p.kg : (exId === e.id ? e.carga : null), reps: p ? p.reps : repsNum(e.reps), ok:false, pr:false});
  }
  return out;
}
function exsExec(){
  const t = acharTreino(EU, S.exec.letra);
  return t.exs.map((e,i) => S.exec.trocas[i] ? Object.assign({}, e, {id:S.exec.trocas[i], trocadoDe:e.id}) : e);
}
function contaSeries(){
  let ok = 0, tot = 0;
  Object.values(S.exec.sets).forEach(a => a.forEach(z => { tot++; if (z.ok) ok++; }));
  return [ok, tot];
}
function abrirExec(){ $("exec").hidden = false; desenharExec(); }
function cardExec(e, i, atual){
  const E = S.exec, sets = E.sets[i], info = ex(e.id), u = seriesAnteriores(EU, e.id);
  const feito = sets.every(z => z.ok), temKg = e.carga != null || (u && u.series[0].kg != null);
  const kgs = u ? [...new Set(u.series.map(z => z.kg))] : [];
  const ultTxt = !u ? "Primeira vez nesse exercício"
    : `Última vez (${quando(u.data)}): <b>${kgs.length === 1 && kgs[0] != null ? fmt(kgs[0]) + " kg · " + u.series.map(z => z.reps).join(", ") + " reps"
      : u.series.map(z => (z.kg != null ? fmt(z.kg) + "×" : "") + z.reps).join(" · ")}</b>`;
  const unid = /s$/.test(e.reps) ? "SEG" : /min/.test(e.reps) ? "MIN" : "REPS";
  return `<div class="exc${feito ? " feito" : ""}${atual ? " atual" : ""}" id="exc-${i}">
    <div class="exc-h"><span class="num-ex">${feito ? "✓" : i+1}</span><div class="grow stack" style="gap:3px">
      <h3>${esc(info.nome)}</h3>
      <span class="small muted">${e.series} × ${esc(e.reps)}${e.desc ? ` · descanso ${e.desc}s` : ""}${e.trocadoDe ? ` · <span style="color:var(--info)">trocado</span>` : ""}</span>
      <span class="ult">${ultTxt}</span></div></div>
    ${e.obs ? `<div class="obsj">📌 <b>${esc(MARCA.curto)}:</b> ${esc(e.obs)}</div>` : ""}
    ${E.dicas[i] === "dica" ? `<div class="dica"><span>💡</span><span><b>Como fazer:</b> ${esc(info.dica)}</span></div>` : ""}
    ${E.dicas[i] === "video" ? `<div class="video"><span class="play"></span><span>Vídeo do ${esc(MARCA.curto)} demonstrando · entra na versão final</span></div>` : ""}
    <div class="exc-acoes">
      <button type="button" data-a="dica" data-i="${i}" data-t="dica">💡 Como fazer</button>
      <button type="button" data-a="dica" data-i="${i}" data-t="video">▶ Vídeo</button>
      ${info.alt && info.alt.length ? `<button type="button" data-a="trocar" data-i="${i}">⇄ Trocar</button>` : ""}
    </div>
    <div class="series">
      <div class="sr cab"><span>Série</span><span style="text-align:center">${temKg ? "KG" : ""}</span><span style="text-align:center">${unid}</span><span></span></div>
      ${sets.map((z,k) => `<div class="sr${z.ok ? " feita" : ""}">
        <span class="sn">${k+1}</span>
        ${temKg ? `<input inputmode="decimal" data-in="set" data-i="${i}" data-k="${k}" data-c="kg" value="${z.kg != null ? fmt(z.kg) : ""}" aria-label="Carga da série ${k+1}">` : `<span class="muted" style="text-align:center">—</span>`}
        <input inputmode="numeric" data-in="set" data-i="${i}" data-k="${k}" data-c="reps" value="${z.reps ?? ""}" aria-label="Repetições da série ${k+1}">
        <button type="button" class="ok-b" data-a="serie" data-i="${i}" data-k="${k}" aria-label="Marcar série ${k+1} como feita" aria-pressed="${z.ok}">${svg("ok")}</button>
        ${z.pr ? `<span class="pr">🏆 Recorde pessoal!</span>` : ""}
      </div>`).join("")}
    </div></div>`;
}
function desenharExec(){
  const el = $("exec"); if (el.hidden || !S.exec) return;
  const t = acharTreino(EU, S.exec.letra), exs = exsExec(), [ok, tot] = contaSeries();
  const atual = exs.findIndex((e,i) => S.exec.sets[i].some(z => !z.ok));
  const corpo = el.querySelector(".exec-body"), y = corpo ? corpo.scrollTop : 0;
  el.innerHTML = `<div class="exec-top"><div class="row"><button type="button" class="fechar" data-a="sairExec" aria-label="Minimizar">⌄</button>
      <div class="grow stack" style="gap:0"><span class="eyebrow">Treino ${esc(t.letra)}</span><h2 class="ellip">${esc(t.nome)}</h2></div>
      <span class="relogio" id="relogio">00:00</span></div>
      <div class="prog"><i style="width:${tot ? ok/tot*100 : 0}%"></i></div></div>
    <div class="exec-body"><div class="view">${t.circuito ? `<div class="demo"><span>🔁</span><span><b>Circuito:</b> faz um exercício atrás do outro e descansa no fim da volta.</span></div>` : ""}
      ${exs.map((e,i) => cardExec(e, i, i === atual)).join("")}</div></div>
    <div class="exec-pe"><div class="row"><span class="grow small"><b>${ok} de ${tot}</b> séries</span><button type="button" class="btn pri" data-a="finalizar">Finalizar treino</button></div></div>`;
  el.querySelector(".exec-body").scrollTop = y;
  relogio();
}
function relogio(){
  const r = $("relogio"); if (!r || !S.exec) return;
  const s = Math.floor((Date.now() - S.exec.inicio)/1000);
  r.textContent = s >= 3600 ? `${Math.floor(s/3600)}:${p2(Math.floor(s/60)%60)}:${p2(s%60)}` : `${p2(Math.floor(s/60))}:${p2(s%60)}`;
}
setInterval(relogio, 1000);

function marcarSerie(i, k){
  const E = S.exec, z = E.sets[i][k], exs = exsExec(), e = exs[i];
  z.ok = !z.ok;
  z.pr = false;
  if (z.ok && z.kg != null){
    const antes = melhorCarga(EU, e.id), nesta = Math.max(0, ...Object.entries(E.sets).filter(([j]) => exs[j].id === e.id).flatMap(([j,a]) => a.filter((q,qi) => q.ok && q.pr && !(+j === i && qi === k)).map(q => q.kg)));
    if (antes && z.kg > antes && z.kg > nesta){ z.pr = true; toast(`🏆 Recorde no ${ex(e.id).nome}: ${fmt(z.kg)} kg!`); vibrar([60,40,60]); }
  }
  salvar();
  const cel = $("exc-" + i);
  if (z.ok){
    const prox = proximaSerie(i, k);
    if (prox) descansar(e.desc || 0, prox);
  }
  /* redesenha só o necessário, sem perder a rolagem */
  const atual = exs.findIndex((x,j) => E.sets[j].some(q => !q.ok));
  exs.forEach((x,j) => { const c = $("exc-" + j); if (c) c.outerHTML = cardExec(x, j, j === atual); });
  const [ok, tot] = contaSeries();
  $("exec").querySelector(".prog i").style.width = (ok/tot*100) + "%";
  $("exec").querySelector(".exec-pe b").textContent = `${ok} de ${tot}`;
  if (z.ok && E.sets[i].every(q => q.ok) && cel){
    const prox = $("exc-" + atual);
    if (prox) setTimeout(() => prox.scrollIntoView({behavior:"smooth", block:"start"}), 350);
  }
  if (ok === tot){ toast("Tudo feito! Bora finalizar 💪"); pararDescanso(); }
}
function proximaSerie(i, k){
  const E = S.exec, exs = exsExec();
  if (k + 1 < E.sets[i].length && !E.sets[i][k+1].ok) return `Próxima: série ${k+2}`;
  for (let j = 0; j < exs.length; j++){ if (E.sets[j].some(q => !q.ok)) return `Próximo: ${ex(exs[j].id).nome}`; }
  return null;
}

/* descanso */
const R = {iv:null, fim:0, total:0};
function descansar(seg, prox){
  if (!seg) return;
  const el = $("descanso");
  clearInterval(R.iv);
  R.fim = Date.now() + seg*1000; R.total = seg;
  el.className = "descanso on";
  el.innerHTML = `<div class="anel"><svg viewBox="0 0 52 52"><circle class="fundo" cx="26" cy="26" r="22"/><circle class="frente" cx="26" cy="26" r="22" stroke-dasharray="138.2" stroke-dashoffset="0"/></svg></div>
    <div class="grow stack" style="gap:0"><span class="tempo" id="r-tempo"></span><span class="sub ellip" id="r-sub">${esc(prox)}</span></div>
    <button type="button" data-a="rmais" data-d="-15">−15</button><button type="button" data-a="rmais" data-d="15">+15</button><button type="button" data-a="rpular">Pular</button>`;
  tickDescanso();
  R.iv = setInterval(tickDescanso, 250);
}
function tickDescanso(){
  const resto = Math.max(0, Math.ceil((R.fim - Date.now())/1000)), t = $("r-tempo"); if (!t) return;
  t.textContent = `${Math.floor(resto/60)}:${p2(resto%60)}`;
  const c = $("descanso").querySelector(".frente"); if (c) c.style.strokeDashoffset = 138.2*(1 - resto/R.total);
  if (resto <= 0){
    clearInterval(R.iv);
    const el = $("descanso"); el.classList.add("fim");
    $("r-sub").textContent = "Bora! Próxima série 💪"; vibrar([250,120,250]); bip();
    R.iv = setTimeout(pararDescanso, 3500);
  }
}
function pararDescanso(){ clearInterval(R.iv); clearTimeout(R.iv); $("descanso").className = "descanso"; }
function vibrar(p){ try { navigator.vibrate && navigator.vibrate(p); } catch(e){} }
let audio;
function bip(){
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    [0, .18].forEach(d => { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = 880; g.gain.setValueAtTime(.18, audio.currentTime + d);
      g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + d + .15); o.connect(g).connect(audio.destination); o.start(audio.currentTime + d); o.stop(audio.currentTime + d + .16); });
  } catch(e){}
}

function folhaTrocar(i){
  const e = exsExec()[i], orig = acharTreino(EU, S.exec.letra).exs[i], base = ex(orig.id);
  const ops = [orig.id, ...base.alt].filter(id => id !== e.id);
  abrirFolha("Trocar exercício", () => `<p class="small muted">Aparelho ocupado? Essas trocas o ${esc(MARCA.curto)} já aprovou pra <b style="color:var(--ink)">${esc(ex(e.id).nome)}</b>:</p>
    <div class="lista">${ops.map(id => `<button type="button" class="it" data-a="escolherTroca" data-i="${i}" data-id="${id}">
      <span class="ic info">⇄</span><span class="grow stack" style="gap:2px"><span class="t">${esc(ex(id).nome)}${id === orig.id ? " (original)" : ""}</span><span class="s">${esc(ex(id).dica)}</span></span></button>`).join("")}</div>`, true);
}

/* finalizar */
const FIM = {};
const RPE = ["Muito leve","Leve","Leve","Moderado","Moderado","Puxado","Puxado","Difícil","Muito difícil","No limite"];
function folhaFinalizar(){
  const [ok, tot] = contaSeries();
  if (FIM.rpe == null) FIM.rpe = 8;
  abrirFolha("Finalizar treino", () => `
    ${ok < tot ? `<div class="demo"><span>⚠️</span><span>Ficaram ${plural(tot-ok,"série")} sem marcar. Tudo bem: o ${esc(MARCA.curto)} vê o que foi feito de verdade.</span></div>` : ""}
    <div class="campo"><span class="lbl">Esforço do treino: <span style="color:var(--accent)">${FIM.rpe}/10 · ${RPE[FIM.rpe-1]}</span></span>
      <div class="escala num">${[1,2,3,4,5,6,7,8,9,10].map(n => `<button type="button" data-a="fim" data-c="rpe" data-v="${n}" aria-pressed="${FIM.rpe === n}">${n}</button>`).join("")}</div></div>
    <div class="campo"><span class="lbl">Sentiu alguma dor?</span>
      <div class="chips"><button type="button" class="chip" data-a="fim" data-c="temDor" data-v="0" aria-pressed="${FIM.temDor !== 1}">Não</button><button type="button" class="chip" data-a="fim" data-c="temDor" data-v="1" aria-pressed="${FIM.temDor === 1}">Sim</button></div>
      ${FIM.temDor === 1 ? `<input class="inp" data-in="fim" data-c="dor" placeholder="Onde e em qual exercício?" value="${esc(FIM.dor || "")}">` : ""}</div>
    <div class="campo"><label for="fim-c">Recado pro ${esc(MARCA.curto)} (opcional)</label><textarea id="fim-c" class="inp" data-in="fim" data-c="coment" placeholder="Ex.: o búlgaro tá fácil, posso subir?">${esc(FIM.coment || "")}</textarea></div>
    <button type="button" class="btn pri full" data-a="salvarTreino">Salvar treino</button>
    <button type="button" class="btn ghost full" data-a="descartarTreino" style="color:var(--bad)">Descartar treino</button>`, true);
}
function salvarTreino(){
  const E = S.exec, t = acharTreino(EU, E.letra), exs = exsExec();
  const series = [], prs = [];
  exs.forEach((e,i) => E.sets[i].forEach(z => { if (z.ok){ series.push({ex:e.id, kg:z.kg, reps:z.reps}); if (z.pr && !prs.includes(e.id)) prs.push(e.id); } }));
  const vol = series.reduce((m,z) => m + (z.kg || 0)*(z.reps || 0), 0);
  const ses = {id:uid(), aluno:EU, data:iso(hoje0()), ts:Date.now(), letra:E.letra, nome:t.nome, dur:Math.max(1, Math.round((Date.now() - E.inicio)/60000)),
    series, volume:Math.round(vol), rpe:FIM.rpe || 8, dor: FIM.temDor === 1 ? (FIM.dor || "Sem detalhe") : null, coment:(FIM.coment || "").trim(), prs};
  S.sessoes.push(ses); S.exec = null; salvar(); nuvem("sessao", ses);
  Object.keys(FIM).forEach(k => delete FIM[k]);
  pararDescanso();
  $("exec").hidden = true;
  render();
  folhaResumo(ses);
}
function folhaResumo(x){
  const nSem = sessoesSemana(EU).length, meta = aluno(EU).meta;
  const txt = `${MARCA.curto}, treino ${x.letra} feito! ✅\n⏱ ${x.dur} min · ${x.series.length} séries · ${fmt(x.volume,0)} kg levantados\nEsforço: ${x.rpe}/10${x.prs.length ? `\n🏆 Recorde: ${x.prs.map(id => ex(id).nome).join(", ")}` : ""}${x.dor ? `\n🩹 Dor: ${x.dor}` : ""}${x.coment ? `\n💬 ${x.coment}` : ""}`;
  abrirFolha("Treino salvo", () => `<div class="festa"><span class="em">${x.prs.length ? "🏆" : "🔥"}</span><h2>Treino ${esc(x.letra)} concluído!</h2><p class="muted">${esc(x.nome)}</p></div>
    <div class="res3"><div><b>${x.dur}'</b><span>duração</span></div><div><b>${x.series.length}</b><span>séries</span></div><div><b>${x.volume >= 1000 ? fmt(x.volume/1000,1) + " t" : fmt(x.volume,0) + " kg"}</b><span>volume</span></div></div>
    ${x.prs.map(id => `<div class="recorde"><span>🏆</span><span>Recorde pessoal no <b>${esc(ex(id).nome)}</b></span></div>`).join("")}
    <div class="card row flat"><span class="ic ${nSem >= meta ? "ok" : "acc"}">📅</span><span class="grow"><b>${nSem} de ${meta} treinos na semana</b><br><span class="small muted">${nSem >= meta ? "Meta da semana batida! 🎉" : `Faltam ${meta - nSem} pra bater a meta.`}</span></span></div>
    <div class="demo"><span>📲</span><span>O ${esc(MARCA.curto)} já recebeu esse treino no painel dele${x.dor ? ", com o alerta de dor" : ""}. Troque pro perfil dele (lá em cima) pra ver.</span></div>
    <a class="btn wa full" href="${wa(txt)}" target="_blank" rel="noopener">Mandar resumo no WhatsApp</a>
    <button type="button" class="btn full" data-a="fechar">Fechar</button>`, true);
}

/* ================= JORGE · Painel ================= */
function vPainel(){
  const h = new Date().getHours(), oi = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const treinaram = ALUNOS.filter(a => sessoesSemana(a.id).length > 0).length;
  const ad = Math.round(ALUNOS.reduce((m,a) => m + aderencia(a.id), 0)/ALUNOS.length*100);
  const fin = financeiro();
  const al = alertas(), pend = checkinsPendentes();
  const feed = S.sessoes.slice().sort((a,b) => b.ts - a.ts).slice(0,8);
  const html = `
    <div class="kpis">
      <div class="kpi"><b>${ALUNOS.length}</b><span>alunos ativos</span></div>
      <div class="kpi"><b>${treinaram}<small class="muted" style="font-size:.9rem">/${ALUNOS.length}</small></b><span>treinaram nesta semana</span></div>
      <div class="kpi"><b>${ad}%</b><span>aderência média (4 sem.)</span></div>
      <div class="kpi"><b>${reais(fin.previsto)}</b><span>receita por mês</span></div>
    </div>
    <div class="sec"><h2>Precisa de atenção</h2><span class="chip ${al.length ? "bad" : "ok"}">${al.length}</span></div>
    ${al.length ? `<div class="lista">${al.slice(0, sub.verTodosAl ? 99 : 6).map(x => `<div class="it">
      <button type="button" class="row grow" data-a="verAluno" data-id="${x.a.id}" style="border:0;background:none;padding:0;text-align:left">
        <span class="ic ${x.cls}">${x.ic}</span><span class="grow stack" style="gap:1px"><span class="t ellip">${esc(x.a.nome)}</span><span class="s">${esc(x.t)}</span></span></button>
      <a class="btn wa sm" href="${wa(x.msg)}" target="_blank" rel="noopener" aria-label="Mandar mensagem no WhatsApp">WhatsApp</a></div>`).join("")}</div>
      ${al.length > 6 && !sub.verTodosAl ? `<button type="button" class="lnk small" data-a="verTodosAl" style="align-self:flex-start">Ver todos (${al.length})</button>` : ""}` : `<div class="vazio">Tudo em ordem por aqui 👌</div>`}
    <div class="sec"><h2>Check-ins pra responder</h2><span class="chip ${pend.length ? "acc" : "ok"}">${pend.length}</span></div>
    ${pend.length ? `<div class="lista">${pend.map(c => { const a = aluno(c.aluno), ant = checkinsDe(a.id).filter(z => z.ts < c.ts).pop(), dp = ant ? c.peso - ant.peso : null;
      return `<button type="button" class="it" data-a="responderCk" data-id="${c.id}">${avatar(a)}
      <span class="grow stack" style="gap:1px"><span class="t">${esc(a.nome)}</span><span class="s ellip">${fmt(c.peso)} kg${dp ? ` (${dp > 0 ? "+" : ""}${fmt(dp)})` : ""} · ${c.dor ? "🩹 " + esc(c.dor) : esc(c.coment || "sem comentário")}</span></span>
      <span class="r"><span class="tiny muted">${quando(c.data)}</span></span><span class="seta">›</span></button>`; }).join("")}</div>` : `<div class="vazio">Nenhum check-in esperando resposta ✅</div>`}
    <div class="sec"><h2>Atividade recente</h2></div>
    <div class="lista">${feed.map(x => { const a = aluno(x.aluno);
      return `<button type="button" class="it" data-a="verSessao" data-id="${x.id}">${avatar(a)}
      <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(primeiro(a.nome))} fez o treino ${esc(x.letra)}${x.prs.length ? " 🏆" : ""}</span>
      <span class="s ellip">${x.dor ? `<span style="color:var(--bad);font-weight:700">🩹 ${esc(x.dor)}</span> · ` : ""}${x.coment ? "“" + esc(x.coment) + "”" : `esforço ${x.rpe}/10 · ${x.dur} min`}</span></span>
      <span class="r"><span class="tiny muted">${quando(x.data)}<br>${hora(x.ts)}</span></span></button>`; }).join("")}</div>
    <button type="button" class="card row" data-a="recado" style="text-align:left"><span class="ic acc">📣</span><span class="grow"><b>Recado da semana</b><br><span class="small muted ellip" style="display:block">${esc(S.recado)}</span></span><span class="seta muted">›</span></button>
    <button type="button" class="card row" data-a="dores" style="text-align:left"><span class="ic">💡</span><span class="grow"><b>Por que um app só seu?</b><br><span class="small muted">As dores dos apps que já existem</span></span><span class="seta muted">›</span></button>`;
  return {sub: dataHoje(), tit: `${oi}, ${MARCA.curto}`, html};
}
function folhaResponder(id){
  const c = S.checkins.find(z => z.id === id); if (!c) return;
  const a = aluno(c.aluno);
  const rapidas = ["Mandou muito bem! Mantém o ritmo 💪","Boa! Semana que vem a gente sobe a carga.","Vamos cuidar do sono: tenta deitar 30 min mais cedo.","Pula o exercício que doeu até a gente conversar. Te chamo no WhatsApp."];
  abrirFolha(`Check-in · ${primeiro(a.nome)}`, () => {
    const ant = checkinsDe(a.id).filter(z => z.ts < c.ts).pop();
    return `<div class="row">${avatar(a,"lg")}<div class="grow"><b style="font-size:1.1rem">${esc(a.nome)}</b><br><span class="small muted">${esc(a.tipo)} · ${esc(a.objetivo)}</span></div></div>
      <div class="ck-res"><div><b>${fmt(c.peso)}</b>kg${ant ? ` (${c.peso - ant.peso > 0 ? "+" : ""}${fmt(c.peso - ant.peso)})` : ""}</div><div><b>${ESC5.sono[c.sono-1]}</b>sono</div><div><b>${ESC5.energia[c.energia-1]}</b>energia</div>
        <div><b>${ESC5.estresse[c.estresse-1]}</b>estresse</div><div><b>${ESC5.dieta[c.dieta-1]}</b>comida</div><div><b>${sessoesDe(a.id).filter(s => diasDesde(s.data) < 7).length}/${a.meta}</b>treinos</div></div>
      ${c.dor ? `<div class="demo" style="border-color:var(--bad);background:var(--bad-soft)"><span>🩹</span><span><b style="color:var(--bad)">Dor:</b> ${esc(c.dor)}</span></div>` : ""}
      ${c.coment ? `<div class="recado">${avatar(a)}<p class="bolha">${esc(c.coment)}</p></div>` : ""}
      ${a.restricao ? `<p class="small muted">📌 ${esc(a.restricao)}</p>` : ""}
      <div class="campo"><span class="lbl">Sua resposta</span>
        <div class="chips">${rapidas.map((r,i) => `<button type="button" class="chip" data-a="rapida" data-i="${i}">${esc(r.slice(0,26))}…</button>`).join("")}</div>
        <textarea class="inp" id="resp-txt" placeholder="Escreve pro ${esc(primeiro(a.nome))}…"></textarea></div>
      <button type="button" class="btn pri full" data-a="enviarResp" data-id="${c.id}">Responder no app</button>
      <a class="btn wa full" href="${wa(`Oi ${primeiro(a.nome)}! Vi teu check-in. `)}" target="_blank" rel="noopener">Prefiro chamar no WhatsApp</a>`;
  });
  folhaResponder.rapidas = rapidas;
}

/* ================= JORGE · Alunos ================= */
function statusAluno(a){
  const ult = ultimoTreinoDias(a.id);
  return ult === 0 ? ["ok","treinou hoje"] : ult === 1 ? ["ok","ontem"] : ult < 5 ? ["", `há ${ult} dias`] : [ult >= 9 ? "bad" : "warn", `há ${ult} dias`];
}
function vAlunos(){
  const atencao = new Set(alertas().map(x => x.a.id));
  const q = filtro.busca.trim().toLowerCase();
  const lista = ALUNOS.filter(a => (!q || a.nome.toLowerCase().includes(q) || a.objetivo.toLowerCase().includes(q))
    && (filtro.tipo === "todos" || (filtro.tipo === "atencao" ? atencao.has(a.id) : a.tipo === filtro.tipo)))
    .sort((a,b) => (atencao.has(b.id) - atencao.has(a.id)) || a.nome.localeCompare(b.nome));
  const cont = t => t === "todos" ? ALUNOS.length : t === "atencao" ? atencao.size : ALUNOS.filter(a => a.tipo === t).length;
  const html = `<input class="inp" type="search" data-in="busca" placeholder="Buscar aluno ou objetivo…" value="${esc(filtro.busca)}" aria-label="Buscar aluno">
    <div class="chips scroll">${[["todos","Todos"],["atencao","⚠️ Atenção"],["Online","Online"],["Presencial","Presencial"],["Híbrido","Híbrido"]].map(([v,n]) =>
      `<button type="button" class="chip" data-a="filtro" data-v="${v}" aria-pressed="${filtro.tipo === v}">${n} · ${cont(v)}</button>`).join("")}</div>
    <div class="lista" id="lista-alunos">${lista.map(a => { const [c, t] = statusAluno(a), ad = aderencia(a.id);
      return `<button type="button" class="it" data-a="verAluno" data-id="${a.id}">${avatar(a)}
        <span class="grow stack" style="gap:3px"><span class="t ellip">${esc(a.nome)}${atencao.has(a.id) ? " ⚠️" : ""}</span><span class="s ellip">${esc(a.tipo)} · ${esc(a.objetivo)}</span>
        <span class="bar" style="max-width:140px"><i style="width:${Math.round(ad*100)}%;--c:${ad >= .75 ? "var(--ok)" : ad >= .45 ? "var(--warn)" : "var(--bad)"}"></i></span></span>
        <span class="r"><span class="chip ${c}">${t}</span><span class="tiny muted">${Math.round(ad*100)}% aderência</span></span></button>`; }).join("") || `<div class="vazio">Ninguém com esse filtro.</div>`}</div>
    <button type="button" class="btn full" data-a="novoAluno">+ Convidar aluno novo</button>`;
  return {sub:`${ALUNOS.length} alunos · ${ALUNOS.filter(a => a.tipo !== "Presencial").length} online`, tit:"Alunos", html};
}
function folhaAluno(id){
  const a = aluno(id);
  abrirFolha(a.nome, () => {
    const v = diasAteVenc(id), [c, t] = statusAluno(a), cs = checkinsDe(id), uc = cs[cs.length-1];
    let pts = cs.filter(z => z.peso).map(z => ({x:ddmm(deIso(z.data)), y:z.peso}));
    const semPeso = NUVEM && pts.length < 2;
    if (pts.length < 3 && !NUVEM){ const n = 8; pts = Array.from({length:n}, (_,i) => ({x: i === 0 ? `há ${a.desde}m` : i === n-1 ? "agora" : "", y: Math.round((a.peso0 + (a.peso - a.peso0)*(i/(n-1)) + (i && i < n-1 ? Math.sin(i*1.7)*.35 : 0))*10)/10})); }
    const dp = semPeso ? 0 : pts[pts.length-1].y - pts[0].y;
    const semanas = [3,2,1,0].map(w => ({w, n: sessoesSemana(id, w).length}));
    const al = alertas().filter(x => x.a.id === id);
    return `<div class="row">${avatar(a,"lg")}<div class="grow stack" style="gap:3px"><span class="small muted">${a.idade ? a.idade + " anos · " : ""}aluno há ${plural(a.desde,"mês","meses")}</span>
        <div class="chips"><span class="chip info">${esc(a.tipo)}</span><span class="chip ${c}">treino ${t}</span></div></div></div>
      ${al.map(x => `<div class="demo" style="border-color:var(--${x.cls === "bad" ? "bad" : "warn"});background:var(--${x.cls === "bad" ? "bad" : "warn"}-soft)"><span>${x.ic}</span><span>${esc(x.t)}</span></div>`).join("")}
      <div class="btns"><a class="btn wa" href="${wa(`Oi ${primeiro(a.nome)}! `)}" target="_blank" rel="noopener">WhatsApp</a><button type="button" class="btn" data-a="editarTreino" data-id="${id}">Editar treino</button></div>
      <div class="card flat"><span class="eyebrow">Objetivo</span><b>${esc(a.objetivo)}</b>
        ${a.restricao ? `<p class="small" style="color:var(--warn)">📌 ${esc(a.restricao)}</p>` : ""}${a.nota ? `<p class="small muted">📝 ${esc(a.nota)}</p>` : ""}
        <p class="small muted">Programa: <b style="color:var(--ink)">${esc(programaDe(id))}</b> · meta ${a.meta}x por semana</p></div>
      <div class="card flat"><span class="eyebrow">Frequência · últimas 4 semanas</span>
        ${semanas.map(s => `<div class="row"><span class="small" style="width:92px">${s.w === 0 ? "Esta semana" : s.w === 1 ? "Semana passada" : `Há ${s.w} semanas`}</span><span class="bar grow"><i style="width:${Math.min(100, s.n/a.meta*100)}%;--c:${s.n >= a.meta ? "var(--ok)" : s.w === 0 ? "var(--accent)" : "var(--warn)"}"></i></span><span class="small mono" style="width:30px;text-align:right">${s.n}/${a.meta}</span></div>`).join("")}</div>
      ${semPeso ? `<div class="card flat"><span class="eyebrow">Peso</span><p class="small muted">O gráfico aparece depois de 2 check-ins com peso.</p></div>` : `<div class="card flat"><span class="eyebrow">Peso</span><div class="big"><b>${fmt(pts[pts.length-1].y)} kg</b><span class="delta ${(/emagre|defini/i.test(a.objetivo) ? dp <= 0 : dp >= 0) ? "ok" : "bad"}">${dp > 0 ? "+" : ""}${fmt(dp)} kg desde o início</span></div>${grafico(pts, {h:120})}</div>`}
      ${uc ? `<div class="sec"><h2>Último check-in</h2></div>${blocoCheckin(uc, "jorge")}${!uc.resposta ? `<button type="button" class="btn pri full" data-a="responderCk" data-id="${uc.id}">Responder check-in</button>` : ""}` : ""}
      <div class="sec"><h2>Últimos treinos</h2></div>
      <div class="lista">${sessoesDe(id).slice(-5).reverse().map(x => `<button type="button" class="it" data-a="verSessao" data-id="${x.id}"><span class="letra-b" style="width:34px;height:34px;font-size:.85rem">${esc(x.letra)}</span>
        <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(x.nome)}</span><span class="s ellip">${x.coment ? "“" + esc(x.coment) + "”" : `esforço ${x.rpe}/10 · ${x.dur} min`}</span></span><span class="r"><span class="tiny muted">${quando(x.data)}</span>${x.dor ? `<span class="chip bad">dor</span>` : ""}</span></button>`).join("")}</div>
      <div class="card row flat"><span class="ic ${v < 0 ? "bad" : v <= 7 ? "warn" : "ok"}">💳</span><span class="grow"><b>${reais(a.valor)}/mês</b><br><span class="small muted">${v < 0 ? `Atrasado há ${plural(-v,"dia")}` : `Vence ${ddmm(deIso(S.venc[id]))}`}</span></span>
        ${v <= 7 ? `<a class="btn sm" href="${wa(msgCobranca(a, v))}" target="_blank" rel="noopener">Cobrar</a>` : ""}</div>`;
  }, true);
}

/* ================= JORGE · Treinos (montar) ================= */
let ED = null;   // treino em edição
function vMontar(){
  const s = segAtual("montar","alunos");
  let html = segm("montar", [["alunos","Por aluno"],["modelos","Modelos"],["exs","Exercícios"]]);
  if (s === "alunos"){
    html += `<p class="small muted">Toque num aluno pra ajustar o treino. O aluno vê a mudança na hora, no app dele.</p>
      <div class="lista">${ALUNOS.map(a => `<button type="button" class="it" data-a="editarTreino" data-id="${a.id}">${avatar(a)}
        <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(a.nome)}</span><span class="s ellip">${esc(programaDe(a.id))} · ${treinosDe(a.id).map(t => t.letra).join(" ")}</span></span>
        ${S.treinos[a.id] ? `<span class="chip acc">editado</span>` : ""}<span class="seta">›</span></button>`).join("")}</div>`;
  } else if (s === "modelos"){
    html += `<p class="small muted">Modelos prontos: monta uma vez e aplica em vários alunos, ajustando só a carga.</p>
      ${MODELOS.map(m => { const n = ALUNOS.filter(a => programaDe(a.id) === m.nome).length;
        return `<button type="button" class="card row" data-a="verModelo" data-id="${m.id}" style="text-align:left"><span class="letra-b">${m.treinos.length > 1 ? m.treinos.map(t => t.letra).join("") : "🏠"}</span>
        <span class="grow"><b>${esc(m.nome)}</b><br><span class="small muted">${esc(m.desc)} · ${plural(n,"aluno")}</span></span><span class="seta muted">›</span></button>`; }).join("")}`;
  } else {
    const q = (sub.buscaEx || "").toLowerCase(), g = sub.grupoEx || "Todos";
    const todos = Object.assign({}, EX, S.exExtra);
    const grupos = ["Todos", ...new Set(Object.values(todos).map(x => x.grupo))];
    const lst = Object.entries(todos).filter(([,x]) => (g === "Todos" || x.grupo === g) && (!q || x.nome.toLowerCase().includes(q)));
    html += `<input class="inp" type="search" data-in="buscaEx" placeholder="Buscar exercício…" value="${esc(sub.buscaEx || "")}">
      <div class="chips scroll">${grupos.map(x => `<button type="button" class="chip" data-a="grupoEx" data-v="${esc(x)}" aria-pressed="${x === g}">${esc(x)}</button>`).join("")}</div>
      <div class="lista">${lst.map(([id,x]) => `<button type="button" class="it" data-a="verEx" data-id="${id}"><span class="ic">${x.local === "casa" ? "🏠" : x.local === "livre" ? "🌳" : "🏋️"}</span>
        <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(x.nome)}</span><span class="s">${esc(x.grupo)}${S.exExtra[id] ? " · seu" : ""}</span></span><span class="seta">›</span></button>`).join("")}</div>
      <button type="button" class="btn full" data-a="novoEx">+ Cadastrar exercício</button>`;
  }
  return {sub:"Montar e ajustar", tit:"Treinos", html};
}
function editarTreino(id){
  ED = {aluno:id, treinos:clone(treinosDe(id)), programa:programaDe(id), aba:0};
  abrirFolha(`Treino · ${primeiro(aluno(id).nome)}`, folhaEditor, true);
}
function folhaEditor(){
  const a = aluno(ED.aluno), t = ED.treinos[ED.aba];
  return `<div class="row"><span class="small muted grow">Programa: <b style="color:var(--ink)">${esc(ED.programa)}</b></span><button type="button" class="btn sm" data-a="aplicarModelo">Trocar modelo</button></div>
    ${a.restricao ? `<div class="demo" style="border-color:var(--warn);background:var(--warn-soft)"><span>📌</span><span>${esc(a.restricao)}</span></div>` : ""}
    <div class="seg">${ED.treinos.map((x,i) => `<button type="button" data-a="edAba" data-i="${i}" aria-pressed="${i === ED.aba}">${esc(x.letra)}</button>`).join("")}<button type="button" data-a="edNovo">+ Novo</button></div>
    ${t ? `<input class="inp" data-in="edNome" value="${esc(t.nome)}" aria-label="Nome do treino" style="font-weight:800">
    <div class="lista">${t.exs.map((e,i) => `<div class="ed-ex">
      <div class="row"><span class="n" style="flex:none;width:22px;height:22px;border-radius:50%;background:var(--sunk);display:grid;place-items:center;font-size:.7rem;font-weight:800">${i+1}</span><b class="grow">${esc(ex(e.id).nome)}</b>
        <span class="mini"><button type="button" data-a="edMover" data-i="${i}" data-d="-1" aria-label="Subir">↑</button><button type="button" data-a="edMover" data-i="${i}" data-d="1" aria-label="Descer">↓</button><button type="button" class="x" data-a="edTirar" data-i="${i}" aria-label="Remover">✕</button></span></div>
      <div class="ed-campos">
        <label>Séries<input inputmode="numeric" data-in="ed" data-i="${i}" data-c="series" value="${e.series}"></label>
        <label>Reps<input data-in="ed" data-i="${i}" data-c="reps" value="${esc(e.reps)}"></label>
        <label>Desc. (s)<input inputmode="numeric" data-in="ed" data-i="${i}" data-c="desc" value="${e.desc}"></label>
        <label>Carga<input inputmode="decimal" data-in="ed" data-i="${i}" data-c="carga" value="${e.carga != null ? fmt(e.carga) : ""}" placeholder="—"></label>
      </div>
      <input class="ed-obs" data-in="ed" data-i="${i}" data-c="obs" value="${esc(e.obs)}" placeholder="Observação pro aluno (opcional)">
    </div>`).join("") || `<div class="vazio" style="border:0">Nenhum exercício ainda.</div>`}</div>
    <button type="button" class="btn full" data-a="edAdd">+ Adicionar exercício</button>
    ${ED.treinos.length > 1 ? `<button type="button" class="lnk small" data-a="edApagar" style="color:var(--bad);align-self:center">Apagar treino ${esc(t.letra)}</button>` : ""}` : ""}
    <button type="button" class="btn pri full" data-a="edSalvar">Salvar e enviar pro aluno</button>`;
}
function folhaAddEx(){
  abrirFolha("Adicionar exercício", () => {
    const q = (sub.buscaAdd || "").toLowerCase(), g = sub.grupoAdd || "Todos";
    const todos = Object.assign({}, EX, S.exExtra), grupos = ["Todos", ...new Set(Object.values(todos).map(x => x.grupo))];
    const lst = Object.entries(todos).filter(([,x]) => (g === "Todos" || x.grupo === g) && (!q || x.nome.toLowerCase().includes(q)));
    return `<input class="inp" type="search" data-in="buscaAdd" placeholder="Buscar…" value="${esc(sub.buscaAdd || "")}">
      <div class="chips scroll">${grupos.map(x => `<button type="button" class="chip" data-a="grupoAdd" data-v="${esc(x)}" aria-pressed="${x === g}">${esc(x)}</button>`).join("")}</div>
      <div class="lista">${lst.map(([id,x]) => `<button type="button" class="it" data-a="edEscolher" data-id="${id}"><span class="grow stack" style="gap:1px"><span class="t">${esc(x.nome)}</span><span class="s">${esc(x.grupo)}</span></span><span class="chip acc">+</span></button>`).join("")}</div>`;
  });
}
function folhaModelos(){
  abrirFolha("Escolher modelo", () => `<p class="small muted">O treino atual do aluno é substituído pelo modelo. Depois é só ajustar.</p>
    ${MODELOS.map(m => `<button type="button" class="card row" data-a="edModelo" data-id="${m.id}" style="text-align:left"><span class="grow"><b>${esc(m.nome)}</b><br><span class="small muted">${esc(m.desc)}</span></span><span class="chip acc">Usar</span></button>`).join("")}`);
}
function folhaModelo(id){
  const m = MODELOS.find(x => x.id === id);
  abrirFolha(m.nome, () => `<p class="small muted">${esc(m.desc)}</p>${m.treinos.map(t => `<div class="card flat"><b>${esc(t.letra)} · ${esc(t.nome)}</b>
    <div class="trn">${t.exs.map((e,i) => `<div class="ex"><span class="n">${i+1}</span><div class="grow"><b>${esc(ex(e.id).nome)}</b><br><span class="small muted">${e.series} × ${esc(e.reps)}</span></div></div>`).join("")}</div></div>`).join("")}
    <div class="campo"><span class="lbl">Aplicar a um aluno</span><div class="chips">${ALUNOS.map(a => `<button type="button" class="chip" data-a="modeloPara" data-m="${id}" data-id="${a.id}">${esc(primeiro(a.nome))}</button>`).join("")}</div></div>`, true);
}
function folhaEx(id){
  const x = ex(id);
  abrirFolha(x.nome, () => `<div class="chips"><span class="chip info">${esc(x.grupo)}</span><span class="chip">${x.local === "casa" ? "Em casa" : x.local === "livre" ? "Ao ar livre" : "Academia"}</span></div>
    <div class="video" style="margin:0"><span class="play"></span><span>Seu vídeo gravado na academia entra aqui</span></div>
    <div class="dica" style="margin:0"><span>💡</span><span><b>Dica pro aluno:</b> ${esc(x.dica || "—")}</span></div>
    ${x.alt && x.alt.length ? `<div class="campo"><span class="lbl">Trocas aprovadas (aparelho ocupado)</span><div class="chips">${x.alt.map(a => `<span class="chip">${esc(ex(a).nome)}</span>`).join("")}</div></div>` : ""}`, true);
}
function folhaNovoEx(){
  abrirFolha("Cadastrar exercício", () => `<div class="campo"><label for="nx-nome">Nome</label><input id="nx-nome" class="inp" placeholder="Ex.: Remada cavalinho"></div>
    <div class="campo"><label for="nx-grupo">Grupo muscular</label><select id="nx-grupo" class="inp">${[...new Set(Object.values(EX).map(x => x.grupo))].map(g => `<option>${esc(g)}</option>`).join("")}</select></div>
    <div class="campo"><label for="nx-local">Onde</label><select id="nx-local" class="inp"><option value="academia">Academia</option><option value="casa">Em casa</option><option value="livre">Ao ar livre</option></select></div>
    <div class="campo"><label for="nx-dica">Dica de execução</label><textarea id="nx-dica" class="inp" placeholder="Como você explica pro aluno"></textarea></div>
    <div class="campo"><span class="lbl">Vídeo</span><span class="ajuda">Na versão final: grava no celular e sobe direto daqui.</span></div>
    <button type="button" class="btn pri full" data-a="salvarEx">Salvar exercício</button>`, true);
}

/* ================= JORGE · Financeiro ================= */
function financeiro(){
  const h = hoje0(), m = h.getMonth(), y = h.getFullYear();
  const noMes = d => d.getMonth() === m && d.getFullYear() === y;
  let recebido = 0, aReceber = 0, atrasado = 0;
  const linhas = ALUNOS.map(a => {
    const venc = deIso(S.venc[a.id]), v = diasAteVenc(a.id);
    const pago = S.pagos[a.id] ? deIso(S.pagos[a.id]) : addDias(venc, -30);
    if (noMes(pago) && pago <= h) recebido += a.valor;
    if (v < 0) atrasado += a.valor; else if (noMes(venc)) aReceber += a.valor;
    return {a, v, venc};
  }).sort((x,y) => x.v - y.v);
  return {recebido, aReceber, atrasado, linhas, previsto: ALUNOS.reduce((s,a) => s + a.valor, 0)};
}
function vFinanceiro(){
  const f = financeiro(), h = hoje0();
  const tipos = ["Online","Híbrido","Presencial"].map(t => { const l = ALUNOS.filter(a => a.tipo === t); return {t, n:l.length, v:l.reduce((s,a) => s + a.valor, 0)}; });
  const html = `<div class="card hero" style="gap:6px"><span class="eyebrow">Receita mensal recorrente</span><h2 style="max-width:none">${reais(f.previsto)}</h2>
      <div class="meta"><span>${ALUNOS.length} alunos</span><span>ticket médio ${reais(Math.round(f.previsto/ALUNOS.length))}</span></div></div>
    <div class="kpis">
      <div class="kpi"><b style="color:var(--ok)">${reais(f.recebido)}</b><span>recebido em ${MESES[h.getMonth()]}</span></div>
      <div class="kpi"><b>${reais(f.aReceber)}</b><span>a receber no mês</span></div>
      <div class="kpi"><b style="color:var(--bad)">${reais(f.atrasado)}</b><span>em atraso</span></div>
      <div class="kpi"><b>${f.linhas.filter(l => l.v >= 0 && l.v <= 7).length}</b><span>vencem em 7 dias</span></div>
    </div>
    <div class="card flat"><span class="eyebrow">Por tipo de plano</span>${tipos.map(t => `<div class="row"><span class="small" style="width:84px">${t.t}</span>
      <span class="bar grow"><i style="width:${t.v/f.previsto*100}%"></i></span><span class="small mono" style="min-width:96px;text-align:right">${t.n} · ${reais(t.v)}</span></div>`).join("")}</div>
    <div class="sec"><h2>Vencimentos</h2></div>
    <div class="lista">${f.linhas.map(({a, v, venc}) => `<div class="it">${avatar(a)}
      <button type="button" class="grow stack" data-a="verAluno" data-id="${a.id}" style="gap:1px;border:0;background:none;padding:0;text-align:left;min-width:0"><span class="t ellip">${esc(a.nome)}</span>
        <span class="s">${reais(a.valor)} · ${v < 0 ? `<b style="color:var(--bad)">atrasado ${plural(-v,"dia")}</b>` : v === 0 ? `<b style="color:var(--warn)">vence hoje</b>` : v <= 7 ? `<b style="color:var(--warn)">vence ${ddmm(venc)}</b>` : `vence ${ddmm(venc)}`}</span></button>
      ${v <= 7 ? `<a class="btn sm" href="${wa(msgCobranca(a, v))}" target="_blank" rel="noopener">Cobrar</a>` : ""}
      <button type="button" class="btn sm quad ${v <= 7 ? "pri" : ""}" data-a="pago" data-id="${a.id}" aria-label="Marcar ${esc(primeiro(a.nome))} como pago" title="Marcar como pago">✓</button></div>`).join("")}</div>
    <p class="tiny muted">✓ marca como pago e joga o vencimento pro mês seguinte.</p>
    <div class="demo"><span>💡</span><span>Na versão final dá pra ligar um link de pagamento (Pix ou cartão recorrente) que dá baixa sozinho, sem o ${esc(MARCA.curto)} precisar marcar.</span></div>`;
  return {sub:"Mensalidades", tit:"Financeiro", html};
}

/* ================= folhas gerais ================= */
function folhaDores(){
  abrirFolha("Por que um app só seu?", () => `<p>Os apps de consultoria que existem (MFIT Personal, Tecnofit, Trainerize e outros) resolvem muita coisa, mas são feitos pra <b>milhares de personais ao mesmo tempo</b>. Essas são as dores que mais aparecem em reclamações, avaliações e fóruns:</p>
    ${DORES.map((d,i) => `<div class="card dor"><h3><span class="n">${i+1}</span>${esc(d.dor)}</h3><p class="small muted">${esc(d.porque)}</p><div class="aqui"><span>✓</span><span><b>Aqui:</b> ${esc(d.aqui)}</span></div></div>`).join("")}
    <div class="card flat"><b>Não é pra competir com eles</b><p class="small muted">É um app enxuto, com a cara do ${esc(MARCA.curto)} e do jeito que ele já trabalha. Começa com 3 funções, testa com 3 a 5 alunos e cresce conforme o uso.</p></div>
    <p class="tiny muted">Fontes: Reclame Aqui (MFIT Personal, 2026), avaliações no Capterra e fórum de ideias do ABC Trainerize. Os preços e funções desses apps mudam: vale conferir antes de apresentar números.</p>`, true);
}
function folhaInstalar(){
  abrirFolha("Instalar no celular", () => `<div class="card flat"><b>iPhone (Safari)</b><ol class="small" style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:4px">
      <li>Abra o link no <b>Safari</b></li><li>Toque em <b>Compartilhar</b> (quadrado com a seta pra cima)</li><li>Escolha <b>Adicionar à Tela de Início</b></li></ol></div>
    <div class="card flat"><b>Android (Chrome)</b><ol class="small" style="margin:0;padding-left:1.2em;display:flex;flex-direction:column;gap:4px">
      <li>Abra o link no <b>Chrome</b></li><li>Toque nos <b>3 pontinhos</b> lá em cima</li><li>Escolha <b>Instalar app</b> ou <b>Adicionar à tela inicial</b></li></ol></div>
    <p class="small muted">Vira um ícone com a logo do ${esc(MARCA.curto)}, abre em tela cheia como app e funciona até sem internet na academia. Não precisa de loja.</p>`, true);
}
function folhaPix(){
  const a = aluno(EU);
  abrirFolha("Pagar mensalidade", () => `<div class="festa"><span class="em">💳</span><h2>${reais(a.valor)}</h2><p class="muted">Plano ${esc(a.tipo)} · vence ${ddmm(deIso(S.venc[EU]))}</p></div>
    <div class="campo"><span class="lbl">Chave Pix</span><div class="row"><input class="inp grow" readonly value="${esc(MARCA.pix)}"><button type="button" class="btn" data-a="copiar" data-t="${esc(MARCA.pix)}">Copiar</button></div></div>
    <div class="demo"><span>🧪</span><span>Chave fictícia. Na versão final dá pra gerar um Pix com valor certo, ou cartão recorrente, com baixa automática.</span></div>
    <a class="btn wa full" href="${wa("Jorge, paguei a mensalidade! Segue o comprovante:")}" target="_blank" rel="noopener">Mandar comprovante no WhatsApp</a>`, true);
}
function folhaRecado(){
  abrirFolha("Recado da semana", () => `<p class="small muted">Aparece na tela inicial de todos os alunos.</p>
    <textarea class="inp" id="recado-txt" style="min-height:140px">${esc(S.recado)}</textarea>
    <button type="button" class="btn pri full" data-a="salvarRecado">Publicar pra todos</button>`, true);
}

function folhaCadastrarAluno(){
  abrirFolha("Cadastrar aluno", () => `<div class="campo"><label for="na-n">Nome</label><input id="na-n" class="inp" placeholder="Nome do aluno"></div>
    <div class="campo"><label for="na-e">E-mail do aluno</label><input id="na-e" class="inp" type="email" inputmode="email" placeholder="É com ele que o aluno vai entrar"></div>
    <div class="campo"><span class="lbl">Plano</span><div class="chips">${["Online","Presencial","Híbrido"].map((t,i) => `<button type="button" class="chip" data-a="naTipo" data-v="${t}" aria-pressed="${i === 0}">${t}</button>`).join("")}</div></div>
    <div class="campo"><label for="na-v">Mensalidade (R$)</label><input id="na-v" class="inp" inputmode="decimal" placeholder="250"></div>
    <div class="demo"><span>🔐</span><span>Só entra no app quem estiver cadastrado aqui. O aluno vê os próprios dados; as suas anotações sobre ele ficam só com você.</span></div>
    <button type="button" class="btn pri full" data-a="cadastrarAluno">Cadastrar</button>`, true);
}

/* ================= eventos ================= */
const A = {
  papel(el){ S.papel = el.dataset.p; salvar(); $("entrada").hidden = true; render(); $("main").scrollTop = 0; },
  dores: folhaDores, instalar: folhaInstalar,
  reiniciar(){ if (confirm("Apagar tudo que foi feito na demonstração e começar de novo?")){ store.set(CHAVE, null); location.reload(); } },
  aba(el){ irAba(el.dataset.v); },
  seg(el){ sub[el.dataset.k] = el.dataset.v; render(); },
  fechar: fecharFolha, voltar: voltarFolha,
  comecar(el){ fecharFolha(); comecar(el.dataset.l); },
  abrirExec, verTreino(el){ sub.treinos = "meus"; sub.abrirTreino = el.dataset.l; irAba("treinos"); },
  verSessao(el){ folhaSessao(el.dataset.id); },
  habito(el){ const k = iso(hoje0()), h = S.habitos[k] = S.habitos[k] || {}; h[el.dataset.id] = !h[el.dataset.id]; salvar(); nuvem("habito", EU, k, el.dataset.id, h[el.dataset.id]); render();
    if (HABITOS.every(x => h[x.id])) toast("Todos os hábitos de hoje feitos! 🎯"); },
  pix: folhaPix,
  copiar(el){ try { navigator.clipboard.writeText(el.dataset.t); toast("Chave Pix copiada"); } catch(e){ toast("Não deu pra copiar"); } },
  exEvo(el){ sub.exEvo = el.dataset.id; render(); },
  dia(el){ sub.diaSel = el.dataset.d; render(); const d = $("dia-det"); if (d) d.scrollIntoView({behavior:"smooth", block:"nearest"}); },
  ck(el){ const c = el.dataset.c, v = +el.dataset.v; CK[c] = v; render(); },
  passo(el){ const c = el.dataset.c; CK[c] = Math.round(((CK[c] || 0) + +el.dataset.d)*10)/10; render(); },
  ckForcar(){ sub.ckForcar = true; render(); },
  enviarCk(){
    if (!CK.sono || !CK.energia || !CK.estresse || !CK.dieta){ toast("Responde as 4 carinhas antes de enviar 🙂"); return; }
    const ck = {id:uid(), aluno:EU, data:iso(hoje0()), ts:Date.now(), peso:CK.peso, cintura:CK.cintura, sono:CK.sono, energia:CK.energia,
      estresse:CK.estresse, dieta:CK.dieta, dor: CK.temDor === 1 ? (CK.dor || "Sem detalhe") : null, coment:(CK.coment || "").trim(), resposta:null, respData:null};
    S.checkins.push(ck); nuvem("checkin", ck);
    Object.keys(CK).forEach(k => delete CK[k]); sub.ckForcar = false;
    salvar(); render(); $("main").scrollTop = 0; toast("Check-in enviado pro Jorge ✅");
  },
  sairExec(){ $("exec").hidden = true; pararDescanso(); render(); },
  serie(el){ marcarSerie(+el.dataset.i, +el.dataset.k); },
  dica(el){ const i = el.dataset.i, t = el.dataset.t; S.exec.dicas[i] = S.exec.dicas[i] === t ? null : t; salvar();
    const c = $("exc-" + i), exs = exsExec(); const atual = exs.findIndex((x,j) => S.exec.sets[j].some(q => !q.ok)); c.outerHTML = cardExec(exs[i], +i, +i === atual); },
  trocar(el){ folhaTrocar(+el.dataset.i); },
  escolherTroca(el){
    const i = +el.dataset.i, id = el.dataset.id, orig = acharTreino(EU, S.exec.letra).exs[i];
    S.exec.trocas[i] = id === orig.id ? null : id;
    S.exec.sets[i] = preencher(orig, id); salvar(); fecharFolha(); desenharExec(); toast(`Trocado por ${ex(id).nome}`);
  },
  rmais(el){ R.fim += +el.dataset.d*1000; R.total = Math.max(R.total, Math.ceil((R.fim - Date.now())/1000)); tickDescanso(); },
  rpular: pararDescanso,
  finalizar: folhaFinalizar,
  fim(el){ FIM[el.dataset.c] = +el.dataset.v; desenharFolha(); },
  salvarTreino,
  descartarTreino(){ if (confirm("Descartar esse treino? As séries marcadas serão perdidas.")){ S.exec = null; salvar(); pararDescanso(); fecharFolha(); $("exec").hidden = true; render(); } },
  /* Jorge */
  verTodosAl(){ sub.verTodosAl = true; render(); },
  verAluno(el){ folhaAluno(el.dataset.id); },
  responderCk(el){ folhaResponder(el.dataset.id); },
  rapida(el){ const t = $("resp-txt"); t.value = folhaResponder.rapidas[+el.dataset.i]; t.focus(); },
  enviarResp(el){
    const t = $("resp-txt").value.trim(); if (!t){ toast("Escreve a resposta ou toca numa pronta"); return; }
    const c = S.checkins.find(z => z.id === el.dataset.id); c.resposta = t; c.respData = iso(hoje0()); salvar(); nuvem("resposta", c.id, t); fecharFolha(); render();
    toast(`Resposta enviada pro ${primeiro(aluno(c.aluno).nome)} ✅`);
  },
  filtro(el){ filtro.tipo = el.dataset.v; render(); },
  naTipo(el){ document.querySelectorAll('[data-a="naTipo"]').forEach(b => b.setAttribute("aria-pressed", b === el)); },
  async cadastrarAluno(el){
    const nome = $("na-n").value.trim(), email = $("na-e").value.trim(), valor = numIn($("na-v").value) || 0;
    const sel = document.querySelector('[data-a="naTipo"][aria-pressed="true"]'), tipo = sel ? sel.dataset.v : "Online";
    if (!nome || !/^\S+@\S+\.\S+$/.test(email)){ toast("Preenche o nome e um e-mail válido"); return; }
    el.disabled = true;
    try {
      const a = await NUVEM.novoAluno({nome, email, tipo, valor});
      ALUNOS.push(a); ALUNOS.sort((x,y) => x.nome.localeCompare(y.nome)); S.venc[a.id] = a.venc;
      const link = location.origin + location.pathname;
      abrirFolha("Convite pronto", () => `<div class="demo"><span>✅</span><span><b>${esc(nome)}</b> cadastrado. Quando ele entrar no app com <b>${esc(email)}</b>, a conta se liga sozinha à ficha.</span></div>
        <a class="btn wa full" href="${wa(`Oi ${primeiro(nome)}! Bem-vindo(a) à consultoria ${MARCA.nome} 💪 Teu app: ${link} · Entra com o e-mail ${email}, toca no link que chegar e depois adiciona na tela inicial.`)}" target="_blank" rel="noopener">Mandar convite no WhatsApp</a>`, true);
      render();
    } catch(e){ el.disabled = false; toast(e.code === "23505" ? "Esse e-mail já está cadastrado" : "Não deu pra cadastrar: " + (e.message || e)); }
  },
  novoAluno(){ if (NUVEM) return folhaCadastrarAluno(); abrirFolha("Convidar aluno", () => `<div class="campo"><label for="na-n">Nome</label><input id="na-n" class="inp" placeholder="Nome do aluno"></div>
      <div class="campo"><label for="na-e">E-mail ou WhatsApp</label><input id="na-e" class="inp" placeholder="Pra onde vai o convite"></div>
      <div class="campo"><span class="lbl">Plano</span><div class="chips"><span class="chip info">Online</span><span class="chip">Presencial</span><span class="chip">Híbrido</span></div></div>
      <div class="demo"><span>🔐</span><span>O aluno recebe um link, cria a senha e instala o app. Só entra quem o ${esc(MARCA.curto)} convidar. No primeiro acesso ele preenche a anamnese e aceita o termo de uso dos dados (LGPD).</span></div>
      <a class="btn wa full" href="${wa(`Oi! Bem-vindo(a) à consultoria ${MARCA.nome} 💪 Teu acesso ao app: (link do convite). Abre, cria tua senha e adiciona na tela inicial.`)}" target="_blank" rel="noopener">Mandar convite no WhatsApp</a>`, true); },
  editarTreino(el){ editarTreino(el.dataset.id); },
  edAba(el){ ED.aba = +el.dataset.i; desenharFolha(true); },
  edNovo(){ const letras = "ABCDEFGH", l = letras.split("").find(x => !ED.treinos.some(t => t.letra === x)) || "X";
    ED.treinos.push({letra:l, nome:`Treino ${l}`, local:"academia", exs:[]}); ED.aba = ED.treinos.length - 1; desenharFolha(true); },
  edApagar(){ if (!confirm(`Apagar o treino ${ED.treinos[ED.aba].letra}?`)) return; ED.treinos.splice(ED.aba,1); ED.aba = 0; desenharFolha(true); },
  edMover(el){ const i = +el.dataset.i, j = i + +el.dataset.d, x = ED.treinos[ED.aba].exs; if (j < 0 || j >= x.length) return; [x[i], x[j]] = [x[j], x[i]]; desenharFolha(); },
  edTirar(el){ ED.treinos[ED.aba].exs.splice(+el.dataset.i,1); desenharFolha(); },
  edAdd: folhaAddEx,
  grupoAdd(el){ sub.grupoAdd = el.dataset.v; desenharFolha(); },
  edEscolher(el){ ED.treinos[ED.aba].exs.push({id:el.dataset.id, series:3, reps:"12", desc:60, carga:null, obs:""}); voltarFolha(); toast(`${ex(el.dataset.id).nome} adicionado`);
    setTimeout(() => { const c = $("folha-c"); c.scrollTop = c.scrollHeight; }, 50); },
  aplicarModelo: folhaModelos,
  edModelo(el){ const m = MODELOS.find(x => x.id === el.dataset.id); ED.treinos = clone(m.treinos); ED.programa = m.nome; ED.aba = 0; voltarFolha(); toast(`Modelo “${m.nome}” aplicado`); },
  edSalvar(){
    if (ED.treinos.some(t => !t.exs.length)){ toast("Tem treino sem exercício. Adiciona ou apaga ele."); return; }
    S.treinos[ED.aluno] = ED.treinos; S.programa[ED.aluno] = ED.programa; salvar(); nuvem("treinos", ED.aluno, ED.treinos, ED.programa);
    toast(`Treino de ${primeiro(aluno(ED.aluno).nome)} atualizado. Já aparece no app.`); fecharFolha(); render();
  },
  verModelo(el){ folhaModelo(el.dataset.id); },
  modeloPara(el){ const m = MODELOS.find(x => x.id === el.dataset.m); S.treinos[el.dataset.id] = clone(m.treinos); S.programa[el.dataset.id] = m.nome; salvar(); nuvem("treinos", el.dataset.id, S.treinos[el.dataset.id], m.nome); fecharFolha(); render();
    toast(`${m.nome} aplicado pra ${primeiro(aluno(el.dataset.id).nome)}`); },
  grupoEx(el){ sub.grupoEx = el.dataset.v; render(); },
  verEx(el){ folhaEx(el.dataset.id); },
  novoEx: folhaNovoEx,
  salvarEx(){
    const nome = $("nx-nome").value.trim(); if (!nome){ toast("Dá um nome pro exercício"); return; }
    const xid = "x_" + uid(), x = S.exExtra[xid] = {nome, grupo:$("nx-grupo").value, local:$("nx-local").value, dica:$("nx-dica").value.trim(), alt:[]};
    salvar(); nuvem("exercicio", xid, x); fecharFolha(); render(); toast("Exercício cadastrado ✅");
  },
  pago(el){ const id = el.dataset.id, v = deIso(S.venc[id]); S.venc[id] = iso(addDias(v, 30)); S.pagos[id] = iso(hoje0()); salvar(); nuvem("pago", id, aluno(id).valor, iso(v), S.venc[id]); render();
    toast(`${primeiro(aluno(id).nome)}: pago! Próximo vencimento ${ddmm(addDias(v,30))}`); },
  recado: folhaRecado,
  salvarRecado(){ const t = $("recado-txt").value.trim(); S.recado = t || S.recado; S.recadoData = iso(hoje0()); salvar(); if (t) nuvem("recado", t); fecharFolha(); render(); toast("Recado publicado pra todos os alunos"); }
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-a]"); if (!el) return;
  const f = A[el.dataset.a]; if (!f) return;
  e.preventDefault(); f(el, e);
});
$("veu").addEventListener("click", fecharFolha);
$("troca").addEventListener("click", () => {
  if (NUVEM){ if (confirm("Sair da sua conta neste celular?")) NUVEM.sair().then(() => { store.set(CHAVE_NUVEM, null); location.reload(); }); return; }
  S.papel = null; salvar(); $("exec").hidden = true; pararDescanso(); fecharFolha(); telaEntrada(); });

document.addEventListener("input", e => {
  const el = e.target, t = el.dataset && el.dataset.in; if (!t) return;
  if (t === "set"){ const z = S.exec.sets[el.dataset.i][el.dataset.k]; z[el.dataset.c] = numIn(el.value); salvar(); }
  else if (t === "ck"){ const c = el.dataset.c; CK[c] = c === "peso" || c === "cintura" ? numIn(el.value) : el.value; }
  else if (t === "fim"){ FIM[el.dataset.c] = el.value; }
  else if (t === "busca"){ filtro.busca = el.value; const p = el.selectionStart; render(); const n = document.querySelector('[data-in="busca"]'); n.focus(); n.setSelectionRange(p,p); }
  else if (t === "buscaEx"){ sub.buscaEx = el.value; const p = el.selectionStart; render(); const n = document.querySelector('[data-in="buscaEx"]'); n.focus(); n.setSelectionRange(p,p); }
  else if (t === "buscaAdd"){ sub.buscaAdd = el.value; const p = el.selectionStart; desenharFolha(); const n = document.querySelector('[data-in="buscaAdd"]'); n.focus(); n.setSelectionRange(p,p); }
  else if (t === "edNome"){ ED.treinos[ED.aba].nome = el.value; }
  else if (t === "ed"){
    const x = ED.treinos[ED.aba].exs[+el.dataset.i], c = el.dataset.c;
    x[c] = c === "reps" || c === "obs" ? el.value : c === "carga" ? numIn(el.value) : (parseInt(el.value) || 0);
  }
});
document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset && el.dataset.in === "foto" && el.files && el.files[0]){
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"), k = Math.min(1, (NUVEM ? 1080 : 360)/img.width);
        c.width = img.width*k; c.height = img.height*k; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        if (NUVEM){
          toast("Enviando foto…");
          c.toBlob(b => NUVEM.foto(b).then(f => { S.fotos.push(f); render(); toast("Foto salva 📸"); })
            .catch(e => toast("A foto não subiu: " + (e.message || e))), "image/jpeg", .8);
          return;
        }
        S.fotos.push({src:c.toDataURL("image/jpeg", .7), rot:ddmm(hoje0())}); if (S.fotos.length > 4) S.fotos.shift();
        salvar(); render(); toast("Foto salva 📸");
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(el.files[0]);
  }
});
/* o input de quantidade sai do foco: seleciona tudo ao tocar (mais fácil de trocar a carga) */
document.addEventListener("focusin", e => { if (e.target.matches && e.target.matches(".sr input, .ed-campos input")) setTimeout(() => e.target.select(), 0); });

/* ================= início ================= */
async function iniciarNuvem(){
  const e = $("entrada");
  e.innerHTML = `<div class="entrada-in"><p class="muted">Abrindo…</p></div>`; e.hidden = false;
  try {
    const eu = await NUVEM.iniciar();
    if (!eu){ NUVEM.telaLogin(e, MARCA); return; }
    if (eu.semConvite){ NUVEM.telaSemConvite(e, MARCA, eu); return; }
    const d = await NUVEM.carregar();
    ALUNOS.splice(0, ALUNOS.length, ...d.alunos);
    let ui = {}; try { ui = JSON.parse(store.get(CHAVE_NUVEM)) || {}; } catch(x){}
    const papel = eu.papel === "treinador" ? "jorge" : "aluno";
    if (papel === "aluno") EU = eu.alunoId;
    S = {v:2, semente: iso(hoje0()), papel, aba: Object.assign({aluno:"hoje", jorge:"painel"}, ui.aba), sessoes:d.sessoes, checkins:d.checkins,
      treinos:d.treinos, programa:d.programa, venc:d.venc, pagos:d.pagos, habitos:d.habitos, fotos:d.fotos, exExtra:d.exExtra,
      exec: papel === "aluno" ? ui.exec || null : null, recado:d.recado, recadoData:d.recadoData};
    render();
    if (S.exec) abrirExec();
  } catch(x){
    console.error(x);
    e.innerHTML = `<div class="entrada-in"><div class="demo"><span>⚠️</span><span>Não deu pra abrir: ${esc(x.message || x)}</span></div>
      <button type="button" class="btn pri full" onclick="location.reload()">Tentar de novo</button></div>`;
  }
}
if (NUVEM){
  iniciarNuvem();
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  return;
}
S = carregar() || semear();
/* link direto: ?ver=jorge ou ?ver=aluno (pra mandar o link já na visão certa) */
const qs = new URLSearchParams(location.search);
if (qs.get("ver") === "jorge" || qs.get("ver") === "aluno"){ S.papel = qs.get("ver"); if (qs.get("aba")) S.aba[S.papel] = qs.get("aba"); history.replaceState(null, "", location.pathname); }
salvar();
render();
if (S.exec && S.papel === "aluno") abrirExec();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
