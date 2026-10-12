(function(){
"use strict";
const D = window.DADOS;
const {MARCA, EX, METODOS, PLANOS, PARQ, TERMO, MODELOS, ALUNOS, DORES} = D;

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
const semAcento = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const bate = (nome, q) => !q || q.split(/\s+/).every(w => semAcento(nome).includes(w));
const uid = () =>Math.random().toString(36).slice(2,9);
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
  ok:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  chat:'<path d="M4 5h16v11H9l-5 4z"/>',
  perfil:'<path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM4 21v-1a8 8 0 0 1 16 0v1"/>'
};
const svg = (k, cls="") => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true">${ICON[k]}</svg>`;

/* ================= estado ================= */
const CHAVE = "jorge-personal:v6";
let S;

function carregar(){
  try {
    const s = JSON.parse(store.get(CHAVE));
    /* demonstração "envelhecida" (aberta muitos dias depois): recomeça com datas novas */
    if (s && s.v === 6 && diasDesde(s.semente) < 5) return s;
  } catch(e){}
  return null;
}
function salvar(){ store.set(CHAVE, JSON.stringify(S)); }

const aluno = id => ALUNOS.find(a => a.id === id);
const ex = id => Object.assign({}, EX[id] || S.exExtra[id] || {nome:id, grupo:"", local:"academia", dica:"", alt:[]}, S.midia[id] || {});
const todosEx = () => Object.assign({}, EX, S.exExtra);
const ehCardio = id => ["Cardio","Corrida"].includes(ex(id).grupo);
const PLANO_B = [D.T_CASA, D.T_LIVRE];
const todosModelos = () => MODELOS.concat(S.modelosExtra);
const modeloDe = id => MODELOS.find(m => m.id === aluno(id).modelo) || MODELOS[0];
const diasAteTroca = id => -diasDesde(S.troca[id]);
/* exercícios ligados (🔗): 2 = bi-set, 3 = tri-set, 4 ou mais = circuito. Devolve, pra cada exercício, {pos, tam, nome} ou null */
function ligacoes(exs){
  const out = exs.map(() => null); let i = 0;
  while (i < exs.length){
    let j = i; while (j < exs.length - 1 && exs[j].jun) j++;
    const tam = j - i + 1;
    if (tam > 1) for (let k = i; k <= j; k++) out[k] = {pos:k - i + 1, tam, nome: tam === 2 ? "Bi-set" : tam === 3 ? "Tri-set" : "Circuito"};
    i = j + 1;
  }
  return out;
}
/* plano série a série do Jorge: [{reps, kg}]. Sem plano, todas as séries iguais (reps e carga do exercício).
   Faltando série no plano, repete a última (ex.: aumentou de 3 pra 4 séries) */
function planoSeries(e){
  const pl = e.plano || [], ult = pl[pl.length-1] || {reps:String(e.reps), kg:e.carga};
  return Array.from({length: e.series}, (_, k) => Object.assign({}, pl[k] || ult));
}
const planoVaria = e => { const p = planoSeries(e); return p.some(x => x.reps !== p[0].reps || x.kg !== p[0].kg); };
const txtSerie = x => `${esc(x.reps)}${x.kg != null ? `×${fmt(x.kg)}kg` : ""}`;
/* linha de detalhes do exercício: séries × reps · descanso · cadência · RIR · método */
function detalhes(e){
  const p = [planoVaria(e) ? `${e.series} séries: ${planoSeries(e).map(txtSerie).join(" · ")}` : `${e.series} × ${esc(e.reps)}`];
  if (e.desc && !e.jun) p.push(`descanso ${e.desc}s`);
  if (e.cad) p.push(`cadência ${esc(e.cad)}`);
  if (e.int) p.push(esc(e.int));
  return p.join(" · ");
}
const chipMetodo = e => e.met && e.met !== "Normal" ? `<span class="chip acc">${esc(e.met)}</span>` : "";
const chipLig = l => l ? `<span class="chip info">🔗 ${l.nome} ${l.pos}/${l.tam}</span>` : "";
/* link do YouTube → endereço do vídeo embutido (youtu.be, watch?v=, shorts) */
const ytId = u => { const m = String(u || "").match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/); return m ? m[1] : null; };
function midiaEx(id){
  const x = ex(id), y = ytId(x.yt);
  if (x.img) return `<img class="midia" src="${esc(x.img)}" alt="Demonstração: ${esc(x.nome)}">`;
  if (y) return `<div class="video yt"><iframe src="https://www.youtube-nocookie.com/embed/${y}" title="${esc(x.nome)}" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  return `<a class="video vazio-v" href="https://www.youtube.com/results?search_query=${encodeURIComponent(x.nome + " execução")}" target="_blank" rel="noopener"><span class="play"></span><span>O ${esc(MARCA.curto)} ainda não pôs GIF nem vídeo aqui · procurar no YouTube</span></a>`;
}
const treinosDe = id => S.treinos[id] || modeloDe(id).treinos;
const programaDe = id => S.programa[id] || modeloDe(id).nome;
const acharTreino = (id, letra) => treinosDe(id).find(t => t.letra === letra) || PLANO_B.find(t => t.letra === letra);
const sessoesDe = id => S.sessoes.filter(s => s.aluno === id).sort((a,b) => a.ts - b.ts);
const durEst = t => Math.max(15, Math.round((t.exs.reduce((m,e) => m + e.series*(/min/.test(e.reps) ? repsNum(e.reps)*60 : 50) + e.series*(e.jun ? 0 : e.desc||0), 0)/60 + (t.local === "academia" ? 8 : 0))/5)*5);
const gruposDe = t => [...new Set(t.exs.map(e => ex(e.id).grupo).filter(g => g && g !== "Core" && g !== "Cardio"))];

function semear(){
  const h = hoje0(), r = rng(20261009);
  const s = {v:6, semente: iso(h), papel:null, aba:{aluno:"hoje", jorge:"painel"}, sessoes:[], avals:{}, treinos:{}, programa:{},
    venc:{}, pagos:{}, exExtra:{}, midia:{}, modelosExtra:[], troca:{}, anteriores:{}, exec:null, recado:D.RECADO, recadoData: iso(addDias(h,-2)),
    /* cadastro: o aluno se inscreve e o Jorge aprova */
    pendentes: D.PENDENTES.map(p => Object.assign({}, p, {data: iso(addDias(h, -p.diasAtras)), termo: iso(addDias(h, -p.diasAtras))})),
    novos:[], suspensos:{}, exclusao:[], meuCadastro:null,
    termoAceito: iso(addDias(h, -240)),
    chat:{}, comprovantes:[], avisos:{treino:true, hora:"06:00", novo:true, venc:true, msg:true}, nutri:{}, planosAtivos:{mensal:true}};
  /* conversas de exemplo no chat do app */
  const ts = (dias, hh, mm) => { const d = addDias(h, -dias); d.setHours(hh, mm); return Math.min(d.getTime(), Date.now() - 6e4); };
  const conv = {
    marina:[["a","Jorge, o ombro deu uma incomodada na elevação lateral hoje",23,7,12],["j","Troca pela polia nas próximas semanas. Se doer na polia também, me avisa antes de continuar.",23,9,40],
      ["a","Fiz na polia, zero dor 🙌",21,7,5],["j","Perfeito! Segue assim.",21,8,0],["a","Agachamento saiu muito bem hoje!",9,7,30],["j","Isso! Semana que vem sobe 2,5 kg se as 4 séries saírem limpas 💪",9,12,10]],
    rafael:[["a","Campeonato daqui a 3 semanas, dá pra ajustar o treino?",1,19,22]],
    diego:[["a","Lombar travou no terra quinta. Tô evitando.",1,21,3]],
    aline:[["a","Primeira semana sem dor nas costas desde o parto! 🙌",2,10,15],["j","Que notícia boa, Aline! Mantém o ritmo.",2,11,0]],
    camila:[["a","Glúteo respondendo muito, já vejo diferença na calça.",4,20,0],["j","É o trabalho aparecendo! 🔥",4,20,30]]
  };
  Object.entries(conv).forEach(([id, ms]) => { s.chat[id] = ms.map(([de, txt, d, hh, mm], i) => ({de, txt, ts:ts(d, hh, mm), lido: !(id === "rafael" || id === "diego")})); });
  s.nutri.marina = {orient:D.ORIENT, nutri:"Dra. Ana Lima · CRN 4 00000 (fictícia)", pdf:{nome:"Plano alimentar · Marina.pdf", src:null}};
  /* troca quinzenal: cada aluno numa altura da quinzena (alguns já passaram da data) */
  ALUNOS.forEach((a, i) => { s.venc[a.id] = iso(addDias(h, a.venc)); s.troca[a.id] = iso(addDias(h, a.id === "marina" ? 9 : (i*5) % 17 - 2)); });

  const fakeSessao = (aid, d, t, prog, comSeries) => {
    const series = []; let vol = 0;
    if (comSeries) t.exs.forEach(e => {
      for (let k = 0; k < e.series; k++){
        const pl = planoSeries(e)[k];
        const kg = pl.kg == null ? null : arred(pl.kg * (0.8 + 0.2*prog));
        const reps = Math.max(1, repsNum(pl.reps) - (k === e.series-1 && r() < .4 ? 1 : 0));
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
  });
  semearAvals(s, h, r);
  return s;
}

/* ================= consultas ================= */
function ultimoTreinoDias(id){ const ss = sessoesDe(id); return ss.length ? diasDesde(ss[ss.length-1].data) : 99; }
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
  return null;
}
function sequenciaSemanas(id){
  const meta = aluno(id).meta; let n = 0;
  for (let w = 1; w < 20; w++){ if (sessoesSemana(id, w).length >= meta) n++; else break; }
  return n;
}
function msgCobranca(a, dias){
  const p = primeiro(a.nome);
  return dias < 0
    ? `Oi ${p}, tudo bem? Passando pra lembrar que a mensalidade (${reais(a.valor)}) venceu em ${ddmm(deIso(S.venc[a.id]))}. Dá pra pagar pelo app: Perfil → Pagar. Qualquer coisa me fala! 💪`
    : `Oi ${p}! Sua mensalidade (${reais(a.valor)}) vence ${dias === 0 ? "hoje" : "dia " + ddmm(deIso(S.venc[a.id]))}. O Pix tá no app, em Perfil → Pagar. Bora pra mais um mês! 💪`;
}
function alertas(){
  const out = [];
  ALUNOS.forEach(a => {
    const p = primeiro(a.nome), ult = ultimoTreinoDias(a.id), v = diasAteVenc(a.id);
    const dor = dorRecente(a.id), novo = !sessoesDe(a.id).length;
    if (dor) out.push({a, nivel:3, ic:"🩹", cls:"bad", t:`Relatou dor: ${dor}`,
      msg:`Oi ${p}! Vi que você sentiu dor (${dor.toLowerCase()}). Me conta melhor: dói em qual movimento? Até a gente conversar, pula o exercício que incomodou.`});
    if (S.suspensos[a.id]) return;
    if (ult >= 5 && !novo) out.push({a, nivel: ult >= 9 ? 3 : 2, ic:"💤", cls: ult >= 9 ? "bad" : "warn", t:`${ult} dias sem treinar`,
      msg:`Oi ${p}, tudo bem? Senti sua falta nos treinos esses dias. Aconteceu alguma coisa? Se a rotina apertou, te mando um treino mais curto pra encaixar. 💪`});
    const dr = diasAteReav(a.id);
    if (dr <= 7) out.push({a, nivel:1, ic:"📏", cls:"warn", t: dr === -999 ? "Sem avaliação física" : dr < 0 ? `Reavaliação atrasada ${plural(-dr,"dia")}` : `Reavaliação em ${plural(dr,"dia")}`,
      msg:`Oi ${p}! Tá chegando a hora da nossa reavaliação trimestral 📏 Qual dia e horário ficam bons pra você?`});
    if (v < 0) out.push({a, nivel:3, ic:"💸", cls:"bad", t:`Mensalidade atrasada há ${plural(-v,"dia")}`, msg:msgCobranca(a, v)});
    else if (v <= 3) out.push({a, nivel:1, ic:"📅", cls:"warn", t: v === 0 ? "Mensalidade vence hoje" : `Mensalidade vence em ${plural(v,"dia")}`, msg:msgCobranca(a, v)});
  });
  /* um cartão por aluno: o motivo mais grave na frente, os outros juntos */
  const porAluno = new Map();
  out.sort((x,y) => y.nivel - x.nivel).forEach(x => {
    const g = porAluno.get(x.a.id);
    if (g) g.t += " · " + x.t; else porAluno.set(x.a.id, Object.assign({}, x));
  });
  return [...porAluno.values()];
}

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
    <button type="button" class="papel" data-a="cadastro"><span class="ico">✍️</span><span><b>Quero ser aluno</b><span class="muted small">Cadastro, anamnese, PAR-Q e termo. O Jorge aprova antes de liberar o app</span></span><span class="seta">›</span></button>
    <button type="button" class="papel" data-a="papel" data-p="aluno"><span class="ico">🏋️‍♀️</span><span><b>Sou aluna</b><span class="muted small">Ver como a Marina vê: treino do dia com cadência, RIR e bi-set, cargas e Pix</span></span><span class="seta">›</span></button>
    <button type="button" class="papel" data-a="papel" data-p="jorge"><span class="ico">📋</span><span><b>Sou o Jorge</b><span class="muted small">Painel do treinador: aprovar cadastros, alertas, montar treino, avaliação e cobrança</span></span><span class="seta">›</span></button>
    <button type="button" class="papel destaque" data-a="dores"><span class="ico">💡</span><span><b>Por que um app só seu?</b><span class="muted small">As dores dos apps de consultoria que já existem, e o que este resolve</span></span><span class="seta">›</span></button>
    <div class="demo"><span>🎬</span><span><b>Roteiro de demonstração:</b> faça um cadastro em “Quero ser aluno”, depois entre como o Jorge e aprove. Ou entre como aluna, faça um treino e troque pro Jorge (botão no canto de cima) pra ver chegando no painel.</span></div>
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
  aluno: [["hoje","Hoje","casa"],["treinos","Treinos","peso"],["chat","Chat","chat"],["perfil","Perfil","perfil"]],
  jorge: [["painel","Painel","painel"],["alunos","Alunos","alunos"],["montar","Treinos","peso"],["chat","Chat","chat"],["financeiro","Financeiro","grana"]]
};
const sub = {};  // sub-abas (segmentos) de cada tela
const EU = "marina";
const filtro = {busca:"", tipo:"todos"};

function render(){
  if (!S.papel){ telaEntrada(); return; }
  $("entrada").hidden = true;
  const p = S.papel, aba = S.aba[p];
  $("top-logo").textContent = MARCA.iniciais;
  $("troca-txt").textContent = p === "aluno" ? "Marina" : "Jorge";
  const badge = {painel: (S.pendentes.length + S.exclusao.filter(x => !x.feito).length) || "",
    chat: (p === "aluno" ? naoLidas(EU, "a") : ALUNOS.reduce((m,a) => m + naoLidas(a.id, "j"), 0)) || "",
    financeiro: S.comprovantes.filter(c => !c.ok).length || ""};
  $("tabbar").innerHTML = ABAS[p].map(([id, nome, ic]) =>
    `<button type="button" data-a="aba" data-v="${id}"${id === aba ? ' aria-current="page"' : ""}>${svg(ic)}<span>${nome}</span>${badge[id] ? `<b class="dot">${badge[id]}</b>` : ""}</button>`).join("");
  const V = {hoje:vHoje, treinos:vTreinos, perfil:vPerfil, chat: p === "aluno" ? vChatAluno : vChatJorge, painel:vPainel, alunos:vAlunos, montar:vMontar, financeiro:vFinanceiro}[aba] || (S.aba[p] = ABAS[p][0][0], vHoje);
  const r = V();
  $("top-sub").textContent = r.sub; $("top-tit").textContent = r.tit;
  $("tela").innerHTML = r.html;
  if (S.exec) desenharExec();
}
function irAba(v){ S.aba[S.papel] = v; salvar(); render(); $("main").scrollTop = 0; }
const segm = (chave, opcoes, folha) => `<div class="seg" role="group">${opcoes.map(([v, n]) =>
  `<button type="button" data-a="${folha ? "segF" : "seg"}" data-k="${chave}" data-v="${v}" aria-pressed="${(sub[chave] || opcoes[0][0]) === v}">${n}</button>`).join("")}</div>`;
const segAtual = (chave, padrao) => sub[chave] || padrao;
const dataHoje = () => { const h = hoje0(); return `${SEM_L[dow(h)]}, ${h.getDate()} de ${MESES[h.getMonth()]}`; };

/* ================= ALUNO · Hoje ================= */

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
  const v = diasAteVenc(EU);
  const html = `${S.suspensos[EU] ? `<div class="demo" style="border-color:var(--bad);background:var(--bad-soft)"><span>⏸️</span><span><b>Acesso pausado pelo ${esc(MARCA.curto)}.</b> Regulariza a mensalidade em Perfil → Pagar, ou fala com ele no chat.</span></div>` : ""}
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
    <div class="card">
      <div class="row sb"><span class="eyebrow">Recado do ${esc(MARCA.curto)} · ${quando(S.recadoData)}</span></div>
      <div class="recado"><span class="logo sm">${esc(MARCA.iniciais)}</span><p class="bolha">${esc(S.recado)}</p></div>
      <button type="button" class="lnk small" data-a="aba" data-v="chat" style="align-self:flex-start">Responder no chat ›</button>
    </div>
    ${cardNutri(EU)}
    <div class="card row flat">
      <span class="ic ${v < 0 ? "bad" : v <= 7 ? "warn" : "ok"}">💳</span>
      <span class="grow"><b>Plano mensal · ${reais(a.valor)}</b><br><span class="small muted">${v < 0 ? `Venceu há ${plural(-v,"dia")}` : v === 0 ? "Vence hoje" : `Vence em ${plural(v,"dia")} (${ddmm(deIso(S.venc[EU]))})`}</span></span>
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
    <div class="trn">${(() => { const lg = ligacoes(t.exs); return t.exs.map((e,i) => {
      const u = seriesAnteriores(aid, e.id), kg = u && u.series[0].kg != null ? u.series[u.series.length-1].kg : e.carga;
      return `<div class="ex${lg[i] && lg[i].pos < lg[i].tam ? " lig" : ""}${lg[i] && lg[i].pos > 1 ? " lig2" : ""}"><span class="n">${i+1}</span><div class="grow stack" style="gap:2px"><b>${esc(ex(e.id).nome)}</b>
        <span class="small muted">${detalhes(e)}${kg != null && !planoVaria(e) ? ` · <b style="color:var(--ink)">${fmt(kg)} kg</b>` : ""}</span>
        ${lg[i] || chipMetodo(e) ? `<span class="chips">${chipLig(lg[i])}${chipMetodo(e)}</span>` : ""}
        ${e.obs ? `<span class="small" style="color:var(--warn)">${esc(e.obs)}</span>` : ""}</div></div>`;}).join(""); })()}
    </div>
    <button type="button" class="btn pri full" data-a="comecar" data-l="${esc(t.letra)}">Começar ${t.local === "academia" ? "treino " + esc(t.letra) : "este treino"}</button>
  </details>`;
}
function vTreinos(){
  const s = segAtual("treinos","meus");
  let html = segm("treinos", [["meus","Meus treinos"],["hist","Histórico"]]);
  if (s === "meus"){
    const prox = proximoTreino(EU);
    const dt = diasAteTroca(EU);
    html += `<p class="small muted">Programa <b style="color:var(--ink)">${esc(programaDe(EU))}</b>, montado pelo ${esc(MARCA.curto)}. O próximo da fila é o <b style="color:var(--ink)">${esc(prox.letra)}</b>.</p>
      <div class="card row flat"><span class="ic info">🔄</span><span class="grow"><b>${dt > 0 ? `Treino novo em ${plural(dt,"dia")}` : "Treino novo chegando"}</b><br><span class="small muted">O ${esc(MARCA.curto)} troca o treino a cada 15 dias${dt > 0 ? ` · próxima troca ${ddmm(deIso(S.troca[EU]))}` : ""}</span></span></div>
      <details class="card dt"><summary class="row"><span class="ic">📖</span><span class="grow"><b>Como ler o treino</b></span><span class="seta muted">›</span></summary>
        <div class="stack small" style="gap:6px;margin-top:10px">
          <span><b>Cadência 3-1-1-0:</b> 3 segundos descendo, 1 parado embaixo, 1 subindo, 0 parado em cima.</span>
          <span><b>RIR 2:</b> termina a série sentindo que ainda faria mais 2 repetições. RIR 0 = até a falha.</span>
          <span><b>RPE 8:</b> esforço 8 de 10 (o mesmo que RIR 2).</span>
          <span><b>🔗 Bi-set:</b> faz um exercício e já emenda no outro, sem descanso. Descansa só no fim da dupla.</span>
          <span><b>Drop-set:</b> chegou na falha, tira uns 30% da carga e continua.</span>
          <span><b>Rest-pause:</b> chegou na falha, descansa 10–15 segundos e faz mais o que der.</span>
        </div></details>`;
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

/* evolução completa de um aluno (só o Jorge vê) */
let EVO = EU;
function folhaEvolucao(id){
  EVO = id;
  abrirFolha(`Evolução · ${primeiro(aluno(id).nome)}`, () => {
    const s = segAtual("evo","desemp"), ss = sessoesDe(EVO);
    if (!ss.length) return `<div class="vazio">${esc(primeiro(aluno(EVO).nome))} ainda não registrou treino. A evolução aparece depois dos primeiros treinos.</div>`;
    return segm("evo", [["desemp","Desempenho"],["cargas","Cargas"],["freq","Frequência"]], true)
      + (s === "desemp" ? evoDesempenho(ss) : s === "cargas" ? evoCargas(ss) : evoFreq(ss));
  });
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
  const semAtual = sem[11], meta = aluno(EVO).meta;
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
    <div class="sec"><h2>Quem mais evoluiu</h2><button type="button" class="lnk" data-a="segF" data-k="evo" data-v="cargas">Ver todas ›</button></div>
    <div class="lista">${evol.slice(0,4).map((e,i) => `<div class="it"><span class="ic acc" style="font-weight:900">${i+1}º</span>
      <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(ex(e.id).nome)}</span><span class="s">${fmt(e.de)} → <b style="color:var(--ink)">${fmt(e.para)} kg</b></span></span>
      ${mini(historicoEx(ss, e.id).map(h => h.kg), 70, 28)}<span class="chip ok">${sinal(e.p)}%</span></div>`).join("")}</div>
    <button type="button" class="card row" data-a="verAvals" data-id="${EVO}" style="text-align:left"><span class="ic">📏</span><span class="grow"><b>Peso, medidas e % de gordura</b><br><span class="small muted">Na avaliação física trimestral</span></span><span class="seta muted">›</span></button>`;
}

function evoCargas(ss){
  const ts = treinosDe(EVO);
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
      ${s.coment ? `<div class="recado"><span class="av" style="--c:${corDe(EVO)}">${esc(iniciais(aluno(EVO).nome))}</span><p class="bolha">${esc(s.coment)}</p></div>` : ""}
      <button type="button" class="btn sm" data-a="verSessao" data-id="${s.id}" style="align-self:flex-start">Ver as séries</button>`).join("")
    : `<p class="muted">${dSel > h ? "Esse dia ainda não chegou." : "Dia sem treino. Descanso também faz parte 😴"}</p>`}</div>`;
  const m30 = ss.filter(x => diasDesde(x.data) < 30).length, meta = aluno(EVO).meta;
  const sem = semanasDe(ss).reverse();
  return `<div class="card"><div class="row sb"><span class="eyebrow">Últimas 12 semanas</span><span class="tiny muted">toque num dia</span></div>
      <div class="heat2">${grade}</div>
      <div class="row tiny muted" style="gap:14px"><span class="row" style="gap:5px"><i class="hc on" style="width:12px;display:inline-block"></i>treinou (letra do treino)</span><span class="row" style="gap:5px"><i class="hc" style="width:12px;display:inline-block"></i>descanso</span></div></div>
    ${detalhe}
    <div class="kpis"><div class="kpi"><b>${m30}</b><span>treinos em 30 dias</span></div><div class="kpi"><b>${fmt(m30/30*7,1)}</b><span>treinos por semana</span></div>
      <div class="kpi"><b>${sequenciaSemanas(EVO)}</b><span>semanas seguidas na meta</span></div><div class="kpi"><b>${Math.round(aderencia(EVO)*100)}%</b><span>aderência ao plano</span></div></div>
    <div class="sec"><h2>Semana a semana</h2></div>
    <div class="lista">${sem.map(s => `<details class="dt semdet"${s.w === 0 ? " open" : ""}><summary class="it">
        <span class="grow stack" style="gap:1px"><span class="t">${s.w === 0 ? "Esta semana" : s.w === 1 ? "Semana passada" : `${ddmm(s.ini)} a ${ddmm(addDias(s.ini,6))}`}</span><span class="s">${ton(s.vol)} · ${fmt(s.min/60,1)}h treinando</span></span>
        <span class="chip ${s.n >= meta ? "ok" : s.w === 0 ? "acc" : "warn"}">${s.n}/${meta}</span><span class="seta">›</span></summary>
      <div class="diasem">${SEM.map((n,i) => { const dd = addDias(s.ini, i), x = porDia.get(iso(dd)) || [];
        return x.length ? x.map(z => `<button type="button" class="dl" data-a="verSessao" data-id="${z.id}"><span class="muted">${n} ${ddmm(dd)}</span><span class="letra-b" style="width:26px;height:26px;font-size:.75rem;border-radius:8px">${esc(z.letra)}</span><span class="ellip">${esc(z.nome)}${z.prs.length ? " 🏆" : ""}</span><span class="muted mono">${z.dur}'</span></button>`).join("")
          : `<div class="dl vazio-d"><span class="muted">${n} ${ddmm(dd)}</span><span></span><span class="muted">${dd > hoje0() ? "" : iso(dd) === iso(hoje0()) ? "hoje" : "descanso"}</span><span></span></div>`; }).join("")}</div></details>`).join("")}</div>`;
}

/* ================= ALUNO · Perfil ================= */
function vPerfil(){
  const a = aluno(EU), v = diasAteVenc(EU), exc = S.exclusao.find(x => x.aluno === EU && !x.feito);
  const html = `<div class="card row">${avatar(a,"lg")}<div class="grow stack" style="gap:3px"><b style="font-size:1.1rem">${esc(a.nome)}</b>
      <span class="small muted">${esc(a.tipo)} · ${esc(a.objetivo)}</span></div></div>
    <div class="card row flat"><span class="ic ${v < 0 ? "bad" : v <= 7 ? "warn" : "ok"}">💳</span>
      <span class="grow"><b>Plano mensal · ${reais(a.valor)}</b><br><span class="small muted">${v < 0 ? `Venceu há ${plural(-v,"dia")}` : v === 0 ? "Vence hoje" : `Próximo vencimento ${ddmm(deIso(S.venc[EU]))}`}</span></span>
      <button type="button" class="btn sm" data-a="pix">Pagar</button></div>
    ${PLANOS.filter(pl => pl.id !== "mensal" && S.planosAtivos[pl.id]).map(pl => `<div class="card row flat"><span class="ic acc">⭐</span><span class="grow"><b>${pl.nome}: ${reais(pl.valor)}</b><br><span class="small muted">Sai ${reais(Math.round(pl.valor/pl.meses))} por mês. Fala com o ${esc(MARCA.curto)} pra trocar.</span></span></div>`).join("")}
    <div class="sec"><h2>Avisos no celular</h2></div>
    ${htmlAvisos()}
    <div class="sec"><h2>Meus documentos</h2></div>
    <div class="lista">
      <button type="button" class="it" data-a="verTermo"><span class="ic ok">✅</span><span class="grow stack" style="gap:1px"><span class="t">Termo de consentimento</span><span class="s">Aceito em ${ddmm(deIso(S.termoAceito))}/${deIso(S.termoAceito).getFullYear()}</span></span><span class="seta">›</span></button>
      <button type="button" class="it" data-a="verFicha" data-id="${EU}"><span class="ic">🩺</span><span class="grow stack" style="gap:1px"><span class="t">Anamnese e PAR-Q</span><span class="s">O que você contou no cadastro</span></span><span class="seta">›</span></button>
    </div>
    <div class="sec"><h2>Seus dados</h2></div>
    <p class="small muted">Seus dados de saúde, fotos e avaliações são vistos só pelo ${esc(MARCA.curto)}. Ficam guardados até você pedir pra apagar.</p>
    <div class="lista">
      <button type="button" class="it" data-a="baixarDados"><span class="ic info">⬇️</span><span class="grow stack" style="gap:1px"><span class="t">Baixar uma cópia dos meus dados</span><span class="s">Arquivo com cadastro, treinos e cargas</span></span></button>
      ${exc ? `<div class="it"><span class="ic warn">⏳</span><span class="grow stack" style="gap:1px"><span class="t">Pedido de exclusão enviado</span><span class="s">Em ${ddmm(deIso(exc.data))}. O ${esc(MARCA.curto)} confirma por aqui.</span></span></div>`
        : `<button type="button" class="it" data-a="pedirExclusao"><span class="ic bad">🗑️</span><span class="grow stack" style="gap:1px"><span class="t" style="color:var(--bad)">Pedir pra apagar meus dados</span><span class="s">Encerra a consultoria e apaga tudo</span></span></button>`}
    </div>
    <button type="button" class="lnk small" data-a="instalar" style="align-self:flex-start">Como instalar o app no celular</button>`;
  return {sub:"Sua conta", tit:"Perfil", html};
}
function folhaTermo(){
  abrirFolha("Termo de consentimento", () => `<ol class="small termo">${TERMO.map(t => `<li>${esc(t)}</li>`).join("")}</ol>
    <p class="tiny muted">Texto de exemplo do protótipo. O definitivo passa por um advogado antes do lançamento.</p>`, true);
}
/* ficha de cadastro (anamnese + PAR-Q) de um aluno ou de um cadastro pendente */
function htmlFicha(c){
  if (!c) return `<div class="vazio">Aluno de antes do app: a anamnese e o PAR-Q dele ficam no primeiro acesso.</div>`;
  const sims = c.parq.map((r,i) => r ? i : -1).filter(i => i >= 0);
  return `${sims.length ? `<div class="demo" style="border-color:var(--warn);background:var(--warn-soft)"><span>⚠️</span><span><b>PAR-Q com ${plural(sims.length,"“sim”")}:</b> pedir liberação médica antes de começar.</span></div>`
      : `<div class="demo" style="border-color:var(--ok);background:var(--ok-soft)"><span>✅</span><span><b>PAR-Q sem nenhum “sim”.</b> Liberado pra começar.</span></div>`}
    <div class="card flat"><span class="eyebrow">Dados</span>
      <span class="small">${c.idade} anos · ${c.sx === "F" ? "feminino" : "masculino"} · ${esc(c.tipo)}</span>
      <span class="small">Objetivo: <b>${esc(c.objetivo)}</b></span>
      <span class="small muted">${esc(c.whats || "")}${c.email ? " · " + esc(c.email) : ""}</span></div>
    <div class="card flat"><span class="eyebrow">Anamnese</span>
      <span class="small"><b>Lesões / cirurgias:</b> ${esc(c.lesoes || "Nenhuma")}</span>
      <span class="small"><b>Remédios:</b> ${esc(c.remedios || "Nenhum")}</span>
      <span class="small"><b>Já treina?</b> ${esc(c.rotina || "—")}</span>
      <span class="small"><b>Dias e horários:</b> ${esc(c.dias || "—")}</span></div>
    <div class="card flat"><span class="eyebrow">PAR-Q</span>${PARQ.map((q,i) => `<div class="row" style="align-items:flex-start"><span class="chip ${c.parq[i] ? "warn" : "ok"}" style="flex:none">${c.parq[i] ? "Sim" : "Não"}</span><span class="small">${esc(q)}</span></div>`).join("")}</div>
    <p class="tiny muted">Termo de consentimento aceito em ${ddmm(deIso(c.termo || S.termoAceito))}.</p>`;
}
function folhaFicha(id){
  const a = aluno(id);
  abrirFolha(`Ficha · ${primeiro(a.nome)}`, () => htmlFicha(a.cad), S.papel === "aluno");
}

/* ================= cadastro do aluno ================= */
const CAD = {parq: PARQ.map(() => null)};
function folhaCadastro(){
  abrirFolha("Cadastro", () => `<p class="small muted">Preenche tudo uma vez só. O ${esc(MARCA.curto)} recebe, confere e libera teu acesso.</p>
    <div class="card"><span class="eyebrow">1 · Seus dados</span>
      <div class="campo"><label for="cd-nome">Nome completo</label><input id="cd-nome" class="inp" data-in="cad" data-c="nome" value="${esc(CAD.nome || "")}" autocomplete="name"></div>
      <div class="row" style="gap:8px"><div class="campo grow"><label for="cd-idade">Idade</label><input id="cd-idade" class="inp" inputmode="numeric" data-in="cad" data-c="idade" value="${esc(CAD.idade || "")}"></div>
        <div class="campo grow"><span class="lbl">Sexo</span><div class="chips">${[["F","Fem."],["M","Masc."]].map(([v,n]) => `<button type="button" class="chip" data-a="cadOp" data-c="sx" data-v="${v}" aria-pressed="${CAD.sx === v}">${n}</button>`).join("")}</div></div></div>
      <div class="campo"><label for="cd-w">WhatsApp</label><input id="cd-w" class="inp" inputmode="tel" data-in="cad" data-c="whats" value="${esc(CAD.whats || "")}" autocomplete="tel"></div>
      <div class="campo"><label for="cd-e">E-mail (é o seu login)</label><input id="cd-e" class="inp" inputmode="email" data-in="cad" data-c="email" value="${esc(CAD.email || "")}" autocomplete="email"></div>
      <div class="campo"><span class="lbl">Como vai treinar?</span><div class="chips">${["Online","Presencial","Híbrido"].map(v => `<button type="button" class="chip" data-a="cadOp" data-c="tipo" data-v="${v}" aria-pressed="${CAD.tipo === v}">${v}</button>`).join("")}</div></div>
      <div class="campo"><label for="cd-obj">Objetivo</label><input id="cd-obj" class="inp" data-in="cad" data-c="objetivo" value="${esc(CAD.objetivo || "")}" placeholder="Ex.: ganhar massa, emagrecer, correr 10 km"></div></div>
    <div class="card"><span class="eyebrow">2 · Anamnese</span>
      <div class="campo"><label for="cd-l">Lesões, dores ou cirurgias</label><textarea id="cd-l" class="inp" data-in="cad" data-c="lesoes" placeholder="Ex.: dor no joelho direito ao agachar">${esc(CAD.lesoes || "")}</textarea></div>
      <div class="campo"><label for="cd-r">Toma algum remédio?</label><input id="cd-r" class="inp" data-in="cad" data-c="remedios" value="${esc(CAD.remedios || "")}"></div>
      <div class="campo"><label for="cd-t">Já treina? Há quanto tempo?</label><input id="cd-t" class="inp" data-in="cad" data-c="rotina" value="${esc(CAD.rotina || "")}"></div>
      <div class="campo"><label for="cd-d">Dias e horários que pode treinar</label><input id="cd-d" class="inp" data-in="cad" data-c="dias" value="${esc(CAD.dias || "")}"></div></div>
    <div class="card"><span class="eyebrow">3 · PAR-Q (prontidão pra atividade física)</span>
      ${PARQ.map((q,i) => `<div class="campo"><span class="small">${i+1}. ${esc(q)}</span><div class="chips"><button type="button" class="chip" data-a="cadParq" data-i="${i}" data-v="0" aria-pressed="${CAD.parq[i] === 0}">Não</button><button type="button" class="chip" data-a="cadParq" data-i="${i}" data-v="1" aria-pressed="${CAD.parq[i] === 1}">Sim</button></div></div>`).join("")}
      ${CAD.parq.includes(1) ? `<div class="demo" style="border-color:var(--warn);background:var(--warn-soft)"><span>🩺</span><span>Tudo bem responder “sim”. O ${esc(MARCA.curto)} só vai pedir uma liberação do seu médico antes de começar.</span></div>` : ""}</div>
    <div class="card"><span class="eyebrow">4 · Termo de consentimento</span>
      <ol class="small termo">${TERMO.map(t => `<li>${esc(t)}</li>`).join("")}</ol>
      <button type="button" class="aceite" data-a="cadOp" data-c="aceite" data-v="${CAD.aceite ? "" : "1"}" aria-pressed="${!!CAD.aceite}"><span class="cx">${CAD.aceite ? "✓" : ""}</span>Li e concordo com o termo</button></div>
    <button type="button" class="btn pri full" data-a="enviarCadastro">Enviar cadastro pro ${esc(MARCA.curto)}</button>
    <p class="tiny muted" style="text-align:center">Protótipo: nada sai do seu celular.</p>`, true);
}
function enviarCadastro(){
  const falta = [];
  if (!(CAD.nome || "").trim()) falta.push("nome");
  if (!parseInt(CAD.idade)) falta.push("idade");
  if (!CAD.sx) falta.push("sexo");
  if (!CAD.tipo) falta.push("como vai treinar");
  if (!(CAD.objetivo || "").trim()) falta.push("objetivo");
  if (CAD.parq.includes(null)) falta.push("PAR-Q");
  if (!CAD.aceite) falta.push("aceite do termo");
  if (falta.length){ toast("Falta: " + falta.join(", ")); return; }
  const id = "n_" + uid();
  S.pendentes.push({id, nome:CAD.nome.trim(), idade:parseInt(CAD.idade), sx:CAD.sx, tipo:CAD.tipo, objetivo:CAD.objetivo.trim(), whats:CAD.whats || "", email:CAD.email || "",
    parq:CAD.parq.slice(), lesoes:(CAD.lesoes || "").trim(), remedios:(CAD.remedios || "").trim(), rotina:(CAD.rotina || "").trim(), dias:(CAD.dias || "").trim(),
    data:iso(hoje0()), termo:iso(hoje0())});
  S.meuCadastro = id; salvar();
  Object.keys(CAD).forEach(k => delete CAD[k]); CAD.parq = PARQ.map(() => null);
  abrirFolha("Cadastro enviado", () => `<div class="festa"><span class="em">⏳</span><h2>Aguardando aprovação</h2><p class="muted">O ${esc(MARCA.curto)} recebeu teu cadastro. Quando ele aprovar, teu acesso é liberado e o primeiro treino aparece aqui.</p></div>
    <div class="demo"><span>🎬</span><span>Pra ver o outro lado: entre como o ${esc(MARCA.curto)}. O cadastro aparece no topo do painel, pra aprovar.</span></div>
    <button type="button" class="btn pri full" data-a="papel" data-p="jorge">Ver como o ${esc(MARCA.curto)} recebe</button>`, true);
}

/* ================= JORGE · aprovar cadastro ================= */
function folhaPendente(id){
  const c = S.pendentes.find(x => x.id === id); if (!c) return;
  if (!sub.modeloAprov) sub.modeloAprov = MODELOS[0].id;
  abrirFolha(`Cadastro · ${primeiro(c.nome)}`, () => `<div class="row">${avatar({id:c.id, nome:c.nome},"lg")}<div class="grow"><b style="font-size:1.1rem">${esc(c.nome)}</b><br><span class="small muted">Pediu acesso ${quando(c.data)}</span></div></div>
    ${htmlFicha(c)}
    <div class="campo"><span class="lbl">Começa com qual treino?</span><div class="chips">${todosModelos().map(m => `<button type="button" class="chip" data-a="modeloAprov" data-v="${m.id}" aria-pressed="${sub.modeloAprov === m.id}">${esc(m.nome)}</button>`).join("")}</div>
      <span class="ajuda">Depois você ajusta no editor. O primeiro pagamento (${reais(PLANOS[0].valor)}) já fica cobrando pra hoje.</span></div>
    <button type="button" class="btn pri full" data-a="aprovar" data-id="${c.id}">Aprovar e liberar o app</button>
    <button type="button" class="btn ghost full" data-a="recusar" data-id="${c.id}" style="color:var(--bad)">Recusar cadastro</button>`, true);
}
function aprovar(id){
  const c = S.pendentes.find(x => x.id === id), m = todosModelos().find(x => x.id === sub.modeloAprov) || MODELOS[0], h = hoje0();
  const a = {id:c.id, nome:c.nome, idade:c.idade, sx:c.sx, tipo:c.tipo, objetivo:c.objetivo, valor:PLANOS[0].valor, plano:"mensal", meta:3, desde:0,
    modelo: MODELOS.some(x => x.id === m.id) ? m.id : MODELOS[0].id, dor:null, nota:"", peso0:null, peso:null,
    restricao: [c.lesoes && !/^nenhum/i.test(c.lesoes) ? c.lesoes : "", c.parq.includes(1) ? "PAR-Q com “sim”: pedir liberação médica." : ""].filter(Boolean).join(" "),
    cad: c, novo:true};
  ALUNOS.push(a); S.novos.push(a);
  S.pendentes = S.pendentes.filter(x => x.id !== id);
  S.treinos[a.id] = clone(m.treinos); S.programa[a.id] = m.nome;
  S.venc[a.id] = iso(h); S.troca[a.id] = iso(addDias(h, 15));
  salvar(); fecharFolha(); render();
  const p = primeiro(a.nome);
  abrirFolha("Aluno aprovado", () => `<div class="festa"><span class="em">🎉</span><h2>${esc(p)} liberado!</h2><p class="muted">Programa ${esc(m.nome)} · troca em 15 dias</p></div>
    <p class="small muted">Na versão final ${esc(p)} recebe um aviso no celular na hora. Se quiser, manda também uma mensagem:</p>
    <a class="btn wa full" href="${wa(`Oi ${p}! Teu cadastro na consultoria foi aprovado 💪 Já pode abrir o app: o primeiro treino tá lá. Qualquer dúvida me chama.`)}" target="_blank" rel="noopener">Avisar no WhatsApp</a>
    <button type="button" class="btn full" data-a="editarTreino" data-id="${a.id}">Ajustar o treino agora</button>`, true);
}
function baixarDados(){
  const a = aluno(EU);
  const dados = {aluno:{nome:a.nome, idade:a.idade, tipo:a.tipo, objetivo:a.objetivo}, plano:{valor:a.valor, vencimento:S.venc[EU]},
    termoAceito:S.termoAceito, treinos:treinosDe(EU), historico:sessoesDe(EU).map(x => ({data:x.data, treino:x.letra, series:x.series, esforco:x.rpe, dor:x.dor, comentario:x.coment}))};
  const url = URL.createObjectURL(new Blob([JSON.stringify(dados, null, 2)], {type:"application/json"}));
  const l = document.createElement("a"); l.href = url; l.download = "meus-dados.json"; document.body.appendChild(l); l.click(); l.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Cópia dos seus dados baixada");
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
  const u = seriesAnteriores(EU, exId), pl = planoSeries(e), out = [];
  for (let k = 0; k < e.series; k++){
    const p = u ? (u.series[k] || u.series[u.series.length-1]) : null;
    out.push({kg: p && p.kg != null ? p.kg : (exId === e.id ? pl[k].kg : null), reps: p ? p.reps : repsNum(pl[k].reps), ok:false, pr:false});
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
  const unid = /s$/.test(e.reps) ? "SEG" : /min/.test(e.reps) ? "MIN" : /km/.test(e.reps) ? "KM" : "REPS";
  const lg = ligacoes(exsExec())[i];
  return `<div class="exc${feito ? " feito" : ""}${atual ? " atual" : ""}" id="exc-${i}">
    <div class="exc-h"><span class="num-ex">${feito ? "✓" : i+1}</span><div class="grow stack" style="gap:3px">
      <h3>${esc(info.nome)}</h3>
      <span class="small muted">${detalhes(e)}${e.trocadoDe ? ` · <span style="color:var(--info)">trocado</span>` : ""}</span>
      ${lg || chipMetodo(e) ? `<span class="chips">${chipLig(lg)}${chipMetodo(e)}</span>` : ""}
      <span class="ult">${ultTxt}</span>
      ${u ? `<span class="tiny muted">Os quadradinhos já vêm com o que você fez da última vez. Ajusta se mudou.</span>` : ""}</div></div>
    ${lg && lg.pos < lg.tam ? `<div class="dica"><span>🔗</span><span>Sem descanso: emenda direto no <b>${esc(ex(exsExec()[i+1].id).nome)}</b>.</span></div>` : ""}
    ${e.obs ? `<div class="obsj">📌 <b>${esc(MARCA.curto)}:</b> ${esc(e.obs)}</div>` : ""}
    ${E.dicas[i] === "dica" ? `<div class="dica"><span>💡</span><span><b>Como fazer:</b> ${esc(info.dica)}</span></div>` : ""}
    ${E.dicas[i] === "video" ? `<div style="margin:0 14px 10px">${midiaEx(e.id)}</div>` : ""}
    <div class="exc-acoes">
      <button type="button" data-a="dica" data-i="${i}" data-t="dica">💡 Como fazer</button>
      <button type="button" data-a="dica" data-i="${i}" data-t="video">▶ ${info.img ? "GIF" : "Vídeo"}</button>
      ${info.alt && info.alt.length ? `<button type="button" data-a="trocar" data-i="${i}">⇄ Trocar</button>` : ""}
    </div>
    <div class="series">
      <div class="sr cab"><span>Meta</span><span style="text-align:center">${temKg ? "KG" : ""}</span><span style="text-align:center">${unid}</span><span></span></div>
      ${sets.map((z,k) => { const m = e.trocadoDe ? null : planoSeries(e)[k]; return `<div class="sr${z.ok ? " feita" : ""}">
        <span class="sn">${k+1}${m ? `<small class="meta" title="Meta do ${esc(MARCA.curto)}">${txtSerie(m)}</small>` : ""}</span>
        ${temKg ? `<input inputmode="decimal" data-in="set" data-i="${i}" data-k="${k}" data-c="kg" value="${z.kg != null ? fmt(z.kg) : ""}" aria-label="Carga da série ${k+1}">` : `<span class="muted" style="text-align:center">—</span>`}
        <input inputmode="numeric" data-in="set" data-i="${i}" data-k="${k}" data-c="reps" value="${z.reps ?? ""}" aria-label="Repetições da série ${k+1}">
        <button type="button" class="ok-b" data-a="serie" data-i="${i}" data-k="${k}" aria-label="Marcar série ${k+1} como feita" aria-pressed="${z.ok}">${svg("ok")}</button>
        ${z.pr ? `<span class="pr">🏆 Recorde pessoal!</span>` : ""}
      </div>`; }).join("")}
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
    const lg = ligacoes(exs)[i];
    if (lg && lg.pos < lg.tam){ pararDescanso(); toast(`🔗 Agora: ${ex(exs[i+1].id).nome}, sem descanso`); }
    else {
      /* fim da volta do bi-set: descansa e volta pro primeiro da dupla */
      const prox = lg ? (E.sets[i - lg.pos + 1].some(q => !q.ok) ? `Próxima volta: ${ex(exs[i - lg.pos + 1].id).nome}` : proximaSerie(i, k)) : proximaSerie(i, k);
      if (prox) descansar(e.desc || 0, prox);
    }
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
  S.sessoes.push(ses); S.exec = null; salvar();
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
    <button type="button" class="btn full" data-a="irChat">Mandar recado pro ${esc(MARCA.curto)} no chat</button>
    <button type="button" class="btn full" data-a="fechar">Fechar</button>`, true);
}

/* ================= JORGE · Painel ================= */
function vPainel(){
  const h = new Date().getHours(), oi = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const treinaram = ALUNOS.filter(a => sessoesSemana(a.id).length > 0).length;
  const ad = Math.round(ALUNOS.reduce((m,a) => m + aderencia(a.id), 0)/ALUNOS.length*100);
  const fin = financeiro();
  const al = alertas(), pend = S.pendentes, exc = S.exclusao.filter(x => !x.feito);
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
      <button type="button" class="btn sm" data-a="msgAlerta" data-id="${x.a.id}">Mensagem</button></div>`).join("")}</div>
      ${al.length > 6 && !sub.verTodosAl ? `<button type="button" class="lnk small" data-a="verTodosAl" style="align-self:flex-start">Ver todos (${al.length})</button>` : ""}` : `<div class="vazio">Tudo em ordem por aqui 👌</div>`}
    ${pend.length ? `<div class="sec"><h2>Cadastros pra aprovar</h2><span class="chip acc">${pend.length}</span></div>
    <div class="lista">${pend.map(c => `<button type="button" class="it" data-a="verPendente" data-id="${c.id}">${avatar({id:c.id, nome:c.nome})}
      <span class="grow stack" style="gap:1px"><span class="t">${esc(c.nome)}</span><span class="s ellip">${esc(c.tipo)} · ${esc(c.objetivo)}${c.parq.includes(1) ? " · ⚠️ PAR-Q" : ""}</span></span>
      <span class="r"><span class="tiny muted">${quando(c.data)}</span></span><span class="seta">›</span></button>`).join("")}</div>` : ""}
    ${exc.length ? `<div class="sec"><h2>Pedidos pra apagar dados</h2><span class="chip bad">${exc.length}</span></div>
    <div class="lista">${exc.map(x => { const a = aluno(x.aluno); return `<div class="it">${avatar(a)}<span class="grow stack" style="gap:1px"><span class="t">${esc(a.nome)}</span><span class="s">Pediu ${quando(x.data)} · LGPD</span></span>
      <button type="button" class="btn sm" data-a="confirmarExclusao" data-id="${x.aluno}">Confirmar</button></div>`; }).join("")}</div>` : ""}
    <div class="sec"><h2>Atividade recente</h2></div>
    <div class="lista">${feed.map(x => { const a = aluno(x.aluno);
      return `<button type="button" class="it" data-a="verSessao" data-id="${x.id}">${avatar(a)}
      <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(primeiro(a.nome))} fez o treino ${esc(x.letra)}${x.prs.length ? " 🏆" : ""}</span>
      <span class="s ellip">${x.dor ? `<span style="color:var(--bad);font-weight:700">🩹 ${esc(x.dor)}</span> · ` : ""}${x.coment ? "“" + esc(x.coment) + "”" : `esforço ${x.rpe}/10 · ${x.dur} min`}</span></span>
      <span class="r"><span class="tiny muted">${quando(x.data)}<br>${hora(x.ts)}</span></span></button>`; }).join("")}</div>
    <button type="button" class="card row" data-a="recado" style="text-align:left"><span class="ic acc">📣</span><span class="grow"><b>Recado da semana</b><br><span class="small muted ellip" style="display:block">${esc(S.recado)}</span></span><span class="seta muted">›</span></button>
    <button type="button" class="card row" data-a="verMarca" style="text-align:left"><span class="logo sm">${esc(MARCA.iniciais)}</span><span class="grow"><b>Marca do app</b><br><span class="small muted">${esc(MARCA.nome)} · 3 opções de nome e cor, tema escuro ou claro</span></span><span class="seta muted">›</span></button>
    <button type="button" class="card row" data-a="dores" style="text-align:left"><span class="ic">💡</span><span class="grow"><b>Por que um app só seu?</b><br><span class="small muted">As dores dos apps que já existem</span></span><span class="seta muted">›</span></button>`;
  return {sub: dataHoje(), tit: `${oi}, ${MARCA.curto}`, html};
}
/* ================= JORGE · Alunos ================= */
function statusAluno(a){
  const ult = ultimoTreinoDias(a.id);
  if (S.suspensos[a.id]) return ["bad","suspenso"];
  if (!sessoesDe(a.id).length) return ["info","começando"];
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
    <button type="button" class="btn full" data-a="novoAluno">+ Aluno novo (link de cadastro)</button>`;
  return {sub:`${ALUNOS.length} alunos · ${ALUNOS.filter(a => a.tipo !== "Presencial").length} online`, tit:"Alunos", html};
}
function folhaAluno(id){
  const a = aluno(id);
  abrirFolha(a.nome, () => {
    const v = diasAteVenc(id), [c, t] = statusAluno(a);
    const semanas = [3,2,1,0].map(w => ({w, n: sessoesSemana(id, w).length}));
    const al = alertas().filter(x => x.a.id === id);
    return `<div class="row">${avatar(a,"lg")}<div class="grow stack" style="gap:3px"><span class="small muted">${a.idade} anos · aluno há ${plural(a.desde,"mês","meses")}</span>
        <div class="chips"><span class="chip info">${esc(a.tipo)}</span><span class="chip ${c}">treino ${t}</span></div></div></div>
      ${al.map(x => `<div class="demo" style="border-color:var(--${x.cls === "bad" ? "bad" : "warn"});background:var(--${x.cls === "bad" ? "bad" : "warn"}-soft)"><span>${x.ic}</span><span>${esc(x.t)}</span></div>`).join("")}
      <div class="btns"><button type="button" class="btn" data-a="abrirChat" data-id="${id}">💬 Mensagem</button><button type="button" class="btn" data-a="editarTreino" data-id="${id}">Editar treino</button></div>
      <div class="card flat"><span class="eyebrow">Objetivo</span><b>${esc(a.objetivo)}</b>
        ${a.restricao ? `<p class="small" style="color:var(--warn)">📌 ${esc(a.restricao)}</p>` : ""}${a.nota ? `<p class="small muted">📝 ${esc(a.nota)}</p>` : ""}
        <p class="small muted">Programa: <b style="color:var(--ink)">${esc(programaDe(id))}</b> · meta ${a.meta}x por semana</p></div>
      <div class="card flat"><span class="eyebrow">Frequência · últimas 4 semanas</span>
        ${semanas.map(s => `<div class="row"><span class="small" style="width:92px">${s.w === 0 ? "Esta semana" : s.w === 1 ? "Semana passada" : `Há ${s.w} semanas`}</span><span class="bar grow"><i style="width:${Math.min(100, s.n/a.meta*100)}%;--c:${s.n >= a.meta ? "var(--ok)" : s.w === 0 ? "var(--accent)" : "var(--warn)"}"></i></span><span class="small mono" style="width:30px;text-align:right">${s.n}/${a.meta}</span></div>`).join("")}</div>
      <div class="btns"><button type="button" class="btn" data-a="verEvolucao" data-id="${id}">📈 Evolução</button><button type="button" class="btn" data-a="verFicha" data-id="${id}">🩺 Ficha</button><button type="button" class="btn" data-a="verNutri" data-id="${id}">🥗</button></div>
      ${cardAval(id)}
      <div class="sec"><h2>Últimos treinos</h2></div>
      <div class="lista">${sessoesDe(id).slice(-5).reverse().map(x => `<button type="button" class="it" data-a="verSessao" data-id="${x.id}"><span class="letra-b" style="width:34px;height:34px;font-size:.85rem">${esc(x.letra)}</span>
        <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(x.nome)}</span><span class="s ellip">${x.coment ? "“" + esc(x.coment) + "”" : `esforço ${x.rpe}/10 · ${x.dur} min`}</span></span><span class="r"><span class="tiny muted">${quando(x.data)}</span>${x.dor ? `<span class="chip bad">dor</span>` : ""}</span></button>`).join("")}</div>
      <div class="card row flat"><span class="ic ${v < 0 ? "bad" : v <= 7 ? "warn" : "ok"}">💳</span><span class="grow"><b>${reais(a.valor)}/mês</b><br><span class="small muted">${v < 0 ? `Atrasado há ${plural(-v,"dia")}` : `Vence ${ddmm(deIso(S.venc[id]))}`}</span></span>
        ${v <= 7 ? `<button type="button" class="btn sm" data-a="cobrar" data-id="${id}">Cobrar</button>` : ""}</div>
      <button type="button" class="lnk small" data-a="suspender" data-id="${id}" style="align-self:center;color:var(--${S.suspensos[id] ? "ok" : "bad"})">${S.suspensos[id] ? "Reativar acesso" : "Suspender acesso (falta de pagamento)"}</button>`;
  }, true);
}

/* ================= Chat (no lugar do WhatsApp) ================= */
const conversa = id => S.chat[id] || (S.chat[id] = []);
const naoLidas = (id, quem) => conversa(id).filter(m => m.de !== quem && !m.lido).length;
function htmlConversa(id, eu){
  const c = conversa(id), a = aluno(id);
  if (!c.length) return `<div class="vazio">Nenhuma mensagem ainda. Manda a primeira 👋</div>`;
  let dia = "";
  return `<div class="chat">${c.map(m => { const d = new Date(m.ts), k = iso(d), sep = k !== dia ? (dia = k, `<span class="chat-dia">${quando(k)}</span>`) : "";
    return sep + `<div class="msg ${m.de === eu ? "eu" : "ele"}"><div class="b">${esc(m.txt)}</div><span class="q">${hora(m.ts)}${m.de === eu && m.lido ? " · lida" : ""}</span></div>`; }).join("")}</div>`;
}
function caixaChat(id, rascunho = ""){
  return `<div class="chat-in"><textarea class="inp" id="chat-txt" rows="1" placeholder="Mensagem…">${esc(rascunho)}</textarea>
    <button type="button" class="btn pri" data-a="enviarChat" data-id="${id}" aria-label="Enviar">➤</button></div>`;
}
function lerConversa(id, quem){ conversa(id).forEach(m => { if (m.de !== quem) m.lido = true; }); salvar(); }
function rolarChat(){
  const ir = () => { const c = pilha.length ? $("folha-c") : $("main"); if (c) c.scrollTop = c.scrollHeight; };
  requestAnimationFrame(ir); setTimeout(ir, 120);
}
function vChatAluno(){
  lerConversa(EU, "a");
  rolarChat();
  return {sub:`Fala direto com o ${MARCA.curto}`, tit:"Chat", html: htmlConversa(EU, "a") + caixaChat(EU)};
}
function vChatJorge(){
  const ids = ALUNOS.map(a => a.id).filter(id => conversa(id).length)
    .sort((x,y) => conversa(y)[conversa(y).length-1].ts - conversa(x)[conversa(x).length-1].ts);
  const html = `<div class="lista">${ids.map(id => { const a = aluno(id), u = conversa(id)[conversa(id).length-1], n = naoLidas(id, "j");
    return `<button type="button" class="it" data-a="abrirChat" data-id="${id}">${avatar(a)}
      <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(a.nome)}</span><span class="s ellip"${n ? ' style="color:var(--ink);font-weight:700"' : ""}>${u.de === "j" ? "Você: " : ""}${esc(u.txt)}</span></span>
      <span class="r"><span class="tiny muted">${quando(iso(new Date(u.ts)))}</span>${n ? `<b class="dot" style="position:static">${n}</b>` : ""}</span></button>`; }).join("") || `<div class="vazio">Nenhuma conversa ainda.</div>`}</div>
    <button type="button" class="btn full" data-a="novaConversa">+ Nova mensagem</button>`;
  return {sub:"Mensagens dos alunos", tit:"Chat", html};
}
function folhaChat(id, rascunho){
  lerConversa(id, "j");
  abrirFolha(aluno(id).nome, () => htmlConversa(id, "j") + caixaChat(id, folhaChat.rasc || ""), !pilha.length);
  folhaChat.rasc = ""; rolarChat();
  if (rascunho){ const t = $("chat-txt"); t.value = rascunho; t.focus(); }
}

/* ================= Pix com comprovante ================= */
/* QR desenhado só pra ilustrar: na versão final vem do banco/gateway (Pix com valor certo) */
function qrFake(txt){
  const n = 25; let h = 7; for (const c of txt) h = (h*33 + c.charCodeAt(0)) >>> 0;
  const r = rng(h), q = []; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++){
    const canto = (a, b) => x >= a && x < a + 7 && y >= b && y < b + 7;
    const fin = canto(0,0) || canto(n-7,0) || canto(0,n-7);
    const on = fin ? (() => { const a = x < 7 ? 0 : n-7, b = y < 7 ? 0 : n-7, dx = x - a, dy = y - b; return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx > 1 && dx < 5 && dy > 1 && dy < 5); })() : r() > .5;
    if (on) q.push(`<rect x="${x}" y="${y}" width="1" height="1"/>`);
  }
  return `<svg class="qr" viewBox="-2 -2 ${n+4} ${n+4}" role="img" aria-label="QR code do Pix">${q.join("")}</svg>`;
}
const copiaCola = a => `00020126580014BR.GOV.BCB.PIX0136${MARCA.pix}5204000053039865406${a.valor.toFixed(2)}5802BR5913JORGE BUNN6014RIO DE JANEIRO62070503***6304ABCD`;
function folhaPix(){
  const a = aluno(EU);
  abrirFolha("Pagar mensalidade", () => { const comp = S.comprovantes.find(c => c.aluno === EU && !c.ok); return comp
    ? `<div class="festa"><span class="em">⏳</span><h2>Comprovante enviado</h2><p class="muted">Em ${ddmm(deIso(comp.data))}. O ${esc(MARCA.curto)} confere e confirma por aqui.</p></div>
       ${comp.img ? `<img class="midia" src="${comp.img}" alt="Comprovante enviado">` : ""}`
    : `<div class="festa"><span class="em">💳</span><h2>${reais(a.valor)}</h2><p class="muted">Plano mensal · vence ${ddmm(deIso(S.venc[EU]))}</p></div>
    <div class="qr-box">${qrFake(EU + S.venc[EU])}<span class="tiny muted">Abre o app do banco → Pix → Ler QR code</span></div>
    <div class="campo"><span class="lbl">Ou Pix copia e cola</span><div class="row"><input class="inp grow mono" readonly value="${esc(copiaCola(a))}"><button type="button" class="btn" data-a="copiar" data-t="${esc(copiaCola(a))}" data-msg="Código Pix copiado">Copiar</button></div></div>
    <div class="campo"><span class="lbl">Já pagou?</span><label class="btn pri full">Enviar comprovante<input type="file" accept="image/*,application/pdf" data-in="comprovante" hidden></label>
      <button type="button" class="lnk small" data-a="semComprovante" style="align-self:center">Paguei, mas sem print</button></div>
    <div class="demo"><span>🧪</span><span>QR e código ilustrativos. Depois do lançamento dá pra ligar a cobrança automática (Pix com baixa sozinha, cartão recorrente), como o ${esc(MARCA.curto)} pediu.</span></div>`; }, true);
}
function enviarComprovante(img){
  S.comprovantes.push({id:uid(), aluno:EU, data:iso(hoje0()), valor:aluno(EU).valor, img: img || null, ok:false});
  try { salvar(); } catch(e){ S.comprovantes[S.comprovantes.length-1].img = null; salvar(); }
  desenharFolha(); render(); toast("Comprovante enviado pro " + MARCA.curto);
}
function confirmarPagamento(id){
  const c = S.comprovantes.find(x => x.id === id); c.ok = true;
  const v = deIso(S.venc[c.aluno]); S.venc[c.aluno] = iso(addDias(v, 30)); S.pagos[c.aluno] = iso(hoje0());
  delete S.suspensos[c.aluno];
  conversa(c.aluno).push({de:"j", txt:`Pagamento de ${reais(c.valor)} confirmado ✅ Obrigado! Próximo vencimento ${ddmm(addDias(v,30))}.`, ts:Date.now(), lido:false});
  salvar(); pilha.length ? voltarFolha() : null; render(); toast(`${primeiro(aluno(c.aluno).nome)}: pagamento confirmado`);
}
function folhaComprovante(id){
  const c = S.comprovantes.find(x => x.id === id), a = aluno(c.aluno);
  abrirFolha(`Comprovante · ${primeiro(a.nome)}`, () => `<p class="small muted">${reais(c.valor)} · enviado ${quando(c.data)}</p>
    ${c.img ? (c.img.startsWith("data:application/pdf") ? `<div class="vazio">PDF enviado</div>` : `<img class="midia" src="${c.img}" alt="Comprovante">`) : `<div class="vazio">${esc(primeiro(a.nome))} avisou que pagou, sem print. Confere no extrato.</div>`}
    <button type="button" class="btn pri full" data-a="confirmarPag" data-id="${c.id}">Confirmar pagamento</button>
    <button type="button" class="btn ghost full" data-a="recusarPag" data-id="${c.id}" style="color:var(--bad)">Não caiu na conta</button>`);
}

/* ================= Avisos no celular ================= */
const AVISOS = [["treino","Lembrete de treino","Nos dias de treino, no horário que você escolher"],["novo","Treino novo disponível","Quando o Jorge troca teu treino"],
  ["venc","Vencimento do plano","3 dias antes e no dia"],["msg","Mensagens do Jorge","Quando chega mensagem no chat"]];
function htmlAvisos(){
  const av = S.avisos;
  return `<div class="lista">${AVISOS.map(([k,n,d]) => `<button type="button" class="it" data-a="aviso" data-k="${k}" aria-pressed="${!!av[k]}">
      <span class="grow stack" style="gap:1px"><span class="t">${n}</span><span class="s">${d}${k === "treino" && av.treino ? ` · ${av.hora}` : ""}</span></span><span class="sw${av[k] ? " on" : ""}"><i></i></span></button>`).join("")}</div>
    ${av.treino ? `<div class="campo"><span class="lbl">Horário do lembrete</span><div class="chips">${["06:00","12:00","18:00","20:00"].map(h => `<button type="button" class="chip" data-a="avisoHora" data-v="${h}" aria-pressed="${av.hora === h}">${h}</button>`).join("")}</div></div>` : ""}
    <button type="button" class="btn sm" data-a="testarAviso" style="align-self:flex-start">Ver um aviso de exemplo</button>
    <p class="tiny muted">No iPhone, os avisos só chegam com o app instalado na tela de início (iOS 16.4 ou mais novo). No Android funciona direto.</p>`;
}
function notificar(tit, txt){
  const el = $("notif"); el.innerHTML = `<span class="logo sm">${esc(MARCA.iniciais)}</span><span class="grow stack" style="gap:0"><b>${esc(tit)}</b><span class="small">${esc(txt)}</span></span><span class="tiny muted">agora</span>`;
  el.classList.add("on"); vibrar(80); clearTimeout(notificar.t); notificar.t = setTimeout(() => el.classList.remove("on"), 4200);
}

/* ================= Alimentação ================= */
const nutriDe = id => S.nutri[id] || {orient:D.ORIENT, pdf:null, nutri:null};
function cardNutri(id){
  const n = nutriDe(id);
  return `<details class="card dt"><summary class="row"><span class="ic ok">🥗</span><span class="grow"><b>Alimentação</b><br><span class="small muted">Orientações do ${esc(MARCA.curto)}${n.pdf ? " e plano do nutricionista" : ""}</span></span><span class="seta muted">›</span></summary>
    <ul class="small orient">${n.orient.split("\n").filter(Boolean).map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    ${n.pdf ? `<button type="button" class="btn full" data-a="abrirPdf" data-id="${id}">📄 ${esc(n.pdf.nome)}</button><span class="tiny muted">Plano feito por ${esc(n.nutri || "nutricionista parceiro")}. Dúvida sobre a dieta é com ele(a).</span>` : ""}</details>`;
}
function folhaNutri(id){
  const a = aluno(id), n = nutriDe(id);
  abrirFolha(`Alimentação · ${primeiro(a.nome)}`, () => `<p class="small muted">Orientações gerais aparecem na tela inicial do aluno. Dieta individual (cardápio, quantidades) é atribuição do nutricionista: anexa o plano dele aqui.</p>
    <div class="campo"><label for="nt-o">Orientações gerais (uma por linha)</label><textarea id="nt-o" class="inp" style="min-height:150px">${esc(n.orient)}</textarea></div>
    <div class="campo"><label for="nt-n">Nutricionista parceiro</label><input id="nt-n" class="inp" value="${esc(n.nutri || "")}" placeholder="Nome e CRN"></div>
    <div class="campo"><span class="lbl">Plano alimentar (PDF)</span>${n.pdf ? `<span class="small">📄 ${esc(n.pdf.nome)}</span>` : ""}<label class="btn sm" style="align-self:flex-start">${n.pdf ? "Trocar PDF" : "Anexar PDF"}<input type="file" accept="application/pdf,image/*" data-in="nutriPdf" data-id="${id}" hidden></label></div>
    <button type="button" class="btn pri full" data-a="salvarNutri" data-id="${id}">Salvar</button>`);
}

/* ================= Marca e tema ================= */
const marcaAtual = () => D.MARCAS.find(m => m.id === S.marca) || D.MARCAS[0];
const escuroAgora = () => S.tema === "escuro" || (S.tema === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
function aplicarMarca(){
  const m = marcaAtual(), r = document.documentElement;
  Object.assign(MARCA, {nome:m.nome, iniciais:m.iniciais, slogan:m.slogan});
  r.dataset.tema = S.tema;
  const v = c => `--accent:${c.accent};--accent-ink:${c.ink};--accent-soft:${c.soft}`;
  let st = $("marca-css"); if (!st){ st = document.createElement("style"); st.id = "marca-css"; document.head.appendChild(st); }
  st.textContent = `:root{${v(m.claro)}}@media (prefers-color-scheme: dark){:root:not([data-tema="claro"]){${v(m.escuro)}}}:root[data-tema="escuro"]{${v(m.escuro)}}`;
  document.title = m.nome;
  document.querySelectorAll('meta[name="theme-color"]').forEach(x => x.content = escuroAgora() ? "#0e0f11" : "#f3f2ee");
}
function folhaMarca(){
  abrirFolha("Marca do app", () => { const esc_ = escuroAgora();
    return `<p class="small muted">Nome, iniciais e cor que o aluno vê no celular. Toca numa opção pra ver o app inteiro com ela. O logo de verdade vem de um designer depois: aqui é pra escolher a direção.</p>
    <div class="campo"><span class="lbl">Tema</span><div class="chips">${[["escuro","🌙 Escuro"],["claro","☀️ Claro"],["auto","📱 Segue o celular"]].map(([v,n]) => `<button type="button" class="chip" data-a="tema" data-v="${v}" aria-pressed="${S.tema === v}">${n}</button>`).join("")}</div></div>
    ${D.MARCAS.map(m => { const c = esc_ ? m.escuro : m.claro, on = S.marca === m.id;
      return `<button type="button" class="card marca-op${on ? " on" : ""}" data-a="marca" data-id="${m.id}" style="text-align:left;--c:${c.accent}">
        <div class="row"><span class="logo" style="background:${c.accent};color:${c.ink}">${esc(m.iniciais)}</span>
          <span class="grow stack" style="gap:2px"><b style="font-size:1.1rem">${esc(m.nome)}</b><span class="small muted">${esc(m.slogan)}</span></span>${on ? `<span class="chip ok">em uso</span>` : ""}</div>
        <div class="row" style="gap:8px"><span class="amostra" style="background:${c.accent};color:${c.ink}">Começar treino</span><span class="chip" style="background:${c.soft};color:${c.accent}">${esc(m.cor)}</span></div>
        <span class="tiny muted">🌐 ${esc(m.dominio)}</span></button>`; }).join("")}
    <div class="demo"><span>📝</span><span>Antes de fechar o nome: conferir se está livre no INPI (marca) e no registro.br (domínio, uns R$ 40 por ano).</span></div>`; }, true);
}

/* ================= JORGE · Avaliação física (só ele vê) ================= */
const CIRC = [["peito","Peito"],["braco","Braço"],["cintura","Cintura"],["abdomen","Abdômen"],["quadril","Quadril"],["coxa","Coxa"],["panturrilha","Panturrilha"]];
const DOBRAS = [["peitoral","Peitoral"],["axilar","Axilar média"],["triceps","Tríceps"],["subescapular","Subescapular"],["abdominal","Abdominal"],["suprailiaca","Suprailíaca"],["coxa","Coxa"]];
const BIO = [["gordura","Gordura (%)"],["musculo","Massa muscular (kg)"],["agua","Água (%)"],["visceral","Gordura visceral"]];
const FORCA = [["supino","Supino 1RM est. (kg)"],["agacha","Agachamento 1RM est. (kg)"],["flexoes","Flexões (máx.)"],["prancha","Prancha (s)"]];
const FOTOS = [["frente","Frente"],["lado","Lado"],["costas","Costas"]];
const REAV = 90;  // reavaliação trimestral

/* % de gordura pelas 7 dobras (Jackson & Pollock) + fórmula de Siri */
function pctGordura(av, a){
  const d = av.dobras || {}, vals = DOBRAS.map(([k]) => d[k]);
  if (vals.some(v => v == null || isNaN(v))) return av.bio && av.bio.gordura != null ? av.bio.gordura : null;
  const S7 = vals.reduce((m,v) => m + v, 0), id = a.idade;
  const dens = a.sx === "F" ? 1.097 - 0.00046971*S7 + 0.00000056*S7*S7 - 0.00012828*id
                            : 1.112 - 0.00043499*S7 + 0.00000055*S7*S7 - 0.00028826*id;
  return Math.round((495/dens - 450)*10)/10;
}
const avalsDe = id => (S.avals[id] || []).slice().sort((x,y) => x.data < y.data ? -1 : 1);
const ultAval = id => { const l = avalsDe(id); return l[l.length-1] || null; };
const diasAteReav = id => { const u = ultAval(id); return u ? REAV - diasDesde(u.data) : -999; };
const massaMagra = (av, a) => { const g = pctGordura(av, a); return g == null || !av.peso ? null : Math.round(av.peso*(1 - g/100)*10)/10; };

/* avaliações fictícias: a Marina tem 3 (trimestrais), os outros 1 ou 2 */
function semearAvals(s, h, r){
  const gerar = (a, data, k) => {
    const f = a.sx === "F", peso = Math.round((a.peso0 + (a.peso - a.peso0)*k)*10)/10, redu = 1 - .18*k*(/emagre|defini/i.test(a.objetivo) ? 1.4 : .6);
    const base = f ? {peitoral:12, axilar:14, triceps:20, subescapular:16, abdominal:24, suprailiaca:20, coxa:28} : {peitoral:12, axilar:15, triceps:12, subescapular:17, abdominal:24, suprailiaca:20, coxa:16};
    const fat = (peso / (f ? 64 : 80));
    const dobras = {}; DOBRAS.forEach(([d]) => dobras[d] = Math.round(base[d]*fat*redu*(0.95 + r()*.1)*10)/10);
    const circ = f ? {peito:90, braco:28, cintura:74, abdomen:82, quadril:100, coxa:58, panturrilha:36} : {peito:100, braco:34, cintura:86, abdomen:90, quadril:100, coxa:58, panturrilha:38};
    const c = {}; CIRC.forEach(([x]) => c[x] = Math.round(circ[x]*Math.sqrt(fat)*(x === "cintura" || x === "abdomen" ? redu*1.04 : x === "braco" || x === "coxa" ? 1 + .04*k : 1)*2)/2);
    const av = {id:uid(), data:iso(data), peso, altura: f ? 165 : 177, circ:c, dobras, fotos:{}, obs:""};
    const g = pctGordura(av, a);
    av.bio = {gordura: Math.round((g + 1.2)*10)/10, musculo: Math.round(peso*(1 - (g + 1.2)/100)*.52*10)/10, agua: Math.round((f ? 50 : 55) + k*2), visceral: Math.max(2, Math.round((f ? 5 : 8) - k*2))};
    av.forca = {supino: Math.round((f ? 28 : 60)*(1 + .15*k)), agacha: Math.round((f ? 50 : 85)*(1 + .2*k)), flexoes: Math.round((f ? 8 : 22)*(1 + .3*k)), prancha: Math.round(45 + 40*k)};
    return av;
  };
  ALUNOS.forEach((a, i) => {
    if (a.peso0 == null) return;
    if (a.id === "marina"){ s.avals.marina = [gerar(a, addDias(h,-175), 0), gerar(a, addDias(h,-86), .55), gerar(a, addDias(h,-2), 1)]; return; }
    const dias = 20 + (i*23) % 95;  /* alguns já passaram dos 90 dias */
    s.avals[a.id] = a.desde >= 6 ? [gerar(a, addDias(h, -dias - 90), .4), gerar(a, addDias(h, -dias), 1)] : [gerar(a, addDias(h, -dias), 1)];
  });
}

function cardAval(id){
  const a = aluno(id), u = ultAval(id), dr = diasAteReav(id);
  if (!u) return `<div class="card row flat"><span class="ic warn">📏</span><span class="grow"><b>Sem avaliação física</b><br><span class="small muted">Faz a primeira pra ter o ponto de partida.</span></span>
    <button type="button" class="btn sm pri" data-a="novaAval" data-id="${id}">Avaliar</button></div>`;
  const l = avalsDe(id), p = l.length > 1 ? l[l.length-2] : null, g = pctGordura(u, a), gp = p ? pctGordura(p, a) : null;
  return `<div class="card flat"><div class="row sb"><span class="eyebrow">Avaliação física · ${ddmm(deIso(u.data))}</span>
      <span class="chip ${dr < 0 ? "bad" : dr <= 7 ? "warn" : ""}">${dr < 0 ? `reavaliar (${-dr}d atrasada)` : `próxima em ${dr}d`}</span></div>
    <div class="res3"><div><b>${fmt(u.peso)}</b><span>kg${p ? ` (${sinal(Math.round((u.peso - p.peso)*10)/10)})` : ""}</span></div>
      <div><b>${fmt(g)}%</b><span>gordura${gp != null ? ` (${sinal(Math.round((g - gp)*10)/10)})` : ""}</span></div>
      <div><b>${fmt(massaMagra(u, a))}</b><span>kg massa magra</span></div></div>
    <div class="btns"><button type="button" class="btn sm" data-a="verAvals" data-id="${id}">Ver e comparar${l.length > 1 ? ` (${l.length})` : ""}</button><button type="button" class="btn sm pri" data-a="novaAval" data-id="${id}">Nova avaliação</button></div></div>`;
}

function folhaAvals(id){
  const a = aluno(id);
  abrirFolha(`Avaliações · ${primeiro(a.nome)}`, () => {
    const l = avalsDe(id); if (!l.length) return `<div class="vazio">Nenhuma avaliação ainda.</div>`;
    const u = l[l.length-1], p0 = l[0], cols = l.length > 2 ? [p0, l[l.length-2], u] : l;
    const linha = (rot, f, casas = 1, menorMelhor = true) => {
      const vs = cols.map(av => f(av)), d = vs[0] != null && vs[vs.length-1] != null ? Math.round((vs[vs.length-1] - vs[0])*10)/10 : null;
      const bom = d == null || d === 0 ? "" : (d < 0) === menorMelhor ? "ok" : "bad";
      return `<tr><th>${rot}</th>${vs.map(v => `<td>${fmt(v, casas)}</td>`).join("")}<td class="${bom}">${d == null || cols.length < 2 ? "" : sinal(d)}</td></tr>`;
    };
    const pts = l.map(av => ({x:ddmm(deIso(av.data)), y:pctGordura(av, a)})).filter(x => x.y != null);
    return `<p class="small muted">Só você vê. Comparando ${cols.length > 1 ? `a primeira (${ddmm(deIso(p0.data))}) com a última (${ddmm(deIso(u.data))})` : "a avaliação de " + ddmm(deIso(u.data))}.</p>
      ${pts.length > 1 ? `<div class="card flat"><span class="eyebrow">% de gordura</span>${grafico(pts, {h:110, unid:"%"})}</div>` : ""}
      <div class="tab-wrap"><table class="tab-av"><thead><tr><th></th>${cols.map(av => `<th>${ddmm(deIso(av.data))}</th>`).join("")}<th>Δ</th></tr></thead><tbody>
        <tr class="grp"><th colspan="${cols.length + 2}">Composição</th></tr>
        ${linha("Peso (kg)", av => av.peso)}
        ${linha("% gordura (7 dobras)", av => pctGordura(av, a))}
        ${linha("Massa magra (kg)", av => massaMagra(av, a), 1, false)}
        <tr class="grp"><th colspan="${cols.length + 2}">Circunferências (cm)</th></tr>
        ${CIRC.map(([k, n]) => linha(n, av => av.circ && av.circ[k], 1, !["braco","coxa","peito","panturrilha"].includes(k))).join("")}
        <tr class="grp"><th colspan="${cols.length + 2}">Dobras (mm)</th></tr>
        ${DOBRAS.map(([k, n]) => linha(n, av => av.dobras && av.dobras[k])).join("")}
        <tr class="grp"><th colspan="${cols.length + 2}">Bioimpedância</th></tr>
        ${BIO.map(([k, n]) => linha(n, av => av.bio && av.bio[k], 1, k !== "musculo" && k !== "agua")).join("")}
        <tr class="grp"><th colspan="${cols.length + 2}">Força</th></tr>
        ${FORCA.map(([k, n]) => linha(n, av => av.forca && av.forca[k], 0, false)).join("")}
      </tbody></table></div>
      <div class="sec"><h2>Fotos</h2></div>
      <div class="fotos-av">${FOTOS.map(([k, n]) => `<div class="par"><span class="eyebrow">${n}</span><div class="row" style="gap:6px">${[p0, u].filter((x,i,arr) => arr.indexOf(x) === i).map(av => fotoAv(av, k)).join("")}</div></div>`).join("")}</div>
      <p class="tiny muted">Fotos ficam numa pasta privada, com link que expira. Nunca aparecem pro aluno nem pra mais ninguém.</p>`;
  });
}
const SILH = `<svg viewBox="0 0 40 80" aria-hidden="true"><circle cx="20" cy="9" r="7"/><path d="M9 20h22l-2 26h-4l-1 30h-8l-1-30h-4z"/></svg>`;
const fotoAv = (av, k) => `<div class="foto"${av.fotos && av.fotos[k] ? ` style="background-image:url(${av.fotos[k]})"` : ""}>${av.fotos && av.fotos[k] ? "" : SILH}<span>${ddmm(deIso(av.data))}</span></div>`;

/* nova avaliação: já vem com os números da última, o Jorge só troca o que mudou */
let AV = null;
function folhaNovaAval(id){
  const a = aluno(id), u = ultAval(id);
  AV = {aluno:id, data:iso(hoje0()), peso: u ? u.peso : null, altura: u ? u.altura : null, circ: Object.assign({}, u && u.circ), dobras: Object.assign({}, u && u.dobras),
    bio: Object.assign({}, u && u.bio), forca: Object.assign({}, u && u.forca), fotos:{}, obs:""};
  abrirFolha(`Avaliar · ${primeiro(a.nome)}`, () => {
    const campo = (grupo, k, n) => `<label>${n}<input inputmode="decimal" data-in="av" data-g="${grupo}" data-c="${k}" value="${AV[grupo][k] != null ? fmt(AV[grupo][k]) : ""}"></label>`;
    const g = pctGordura(AV, a);
    return `<p class="small muted">${u ? `Já veio preenchido com a avaliação de ${ddmm(deIso(u.data))}. Troca só o que mudou.` : "Primeira avaliação: vira o ponto de partida."}</p>
      <div class="card"><span class="eyebrow">Peso e altura</span><div class="ed-campos" style="grid-template-columns:repeat(2,1fr)">
        <label>Peso (kg)<input inputmode="decimal" data-in="av" data-c="peso" value="${AV.peso != null ? fmt(AV.peso) : ""}"></label>
        <label>Altura (cm)<input inputmode="decimal" data-in="av" data-c="altura" value="${AV.altura != null ? fmt(AV.altura) : ""}"></label></div></div>
      <div class="card"><span class="eyebrow">Circunferências (cm)</span><div class="ed-campos">${CIRC.map(([k,n]) => campo("circ", k, n)).join("")}</div></div>
      <div class="card"><div class="row sb"><span class="eyebrow">Dobras cutâneas (mm) · 7 dobras</span><span class="chip acc" id="av-g">${g != null ? fmt(g) + "% gordura" : "—"}</span></div>
        <div class="ed-campos">${DOBRAS.map(([k,n]) => campo("dobras", k, n)).join("")}</div>
        <span class="tiny muted">% de gordura por Jackson & Pollock (7 dobras) + Siri, com idade e sexo do aluno.</span></div>
      <div class="card"><span class="eyebrow">Bioimpedância</span><div class="ed-campos">${BIO.map(([k,n]) => campo("bio", k, n)).join("")}</div></div>
      <div class="card"><span class="eyebrow">Testes de força</span><div class="ed-campos" style="grid-template-columns:repeat(2,1fr)">${FORCA.map(([k,n]) => campo("forca", k, n)).join("")}</div></div>
      <div class="card"><span class="eyebrow">Fotos</span><div class="fotos">${FOTOS.map(([k,n]) => `<label class="foto add"${AV.fotos[k] ? ` style="background-image:url(${AV.fotos[k]})"` : ""}>${AV.fotos[k] ? "" : `<b>+</b>`}${n}<input type="file" accept="image/*" capture="environment" data-in="avFoto" data-c="${k}" hidden></label>`).join("")}</div>
        <span class="tiny muted">Mesma luz, mesmo lugar, mesma roupa: a comparação fica justa.</span></div>
      <div class="campo"><label for="av-obs">Observações</label><textarea id="av-obs" class="inp" data-in="av" data-c="obs" placeholder="Postura, queixas, metas pro próximo trimestre…">${esc(AV.obs)}</textarea></div>
      <button type="button" class="btn pri full" data-a="salvarAval">Salvar avaliação</button>`;
  });
}
function salvarAval(){
  if (!AV.peso){ toast("Coloca pelo menos o peso"); return; }
  const id = AV.aluno, a = aluno(id);
  (S.avals[id] = S.avals[id] || []).push({id:uid(), data:AV.data, peso:AV.peso, altura:AV.altura, circ:AV.circ, dobras:AV.dobras, bio:AV.bio, forca:AV.forca, fotos:AV.fotos, obs:AV.obs});
  try { salvar(); } catch(e){ S.avals[id][S.avals[id].length-1].fotos = {}; salvar(); toast("Fotos grandes demais pro protótipo: salvei sem elas"); }
  const g = pctGordura(AV, a); AV = null;
  fecharFolha(); render(); toast(`Avaliação salva${g != null ? ` · ${fmt(g)}% de gordura` : ""} ✅`);
  setTimeout(() => folhaAluno(id), 50);
}

/* ================= JORGE · Treinos (montar) ================= */
let ED = null;   // treino em edição
function vMontar(){
  const s = segAtual("montar","alunos");
  let html = segm("montar", [["alunos","Por aluno"],["modelos","Modelos"],["exs","Exercícios"]]);
  if (s === "alunos"){
    const ord = ALUNOS.slice().sort((a,b) => diasAteTroca(a.id) - diasAteTroca(b.id));
    const vencidas = ord.filter(a => diasAteTroca(a.id) <= 3).length;
    html += `<div class="card row flat"><span class="ic ${vencidas ? "warn" : "ok"}">🔄</span><span class="grow"><b>${vencidas ? `${plural(vencidas,"treino")} pra trocar nos próximos 3 dias` : "Nenhuma troca nos próximos dias"}</b><br>
        <span class="small muted">Troca a cada 15 dias. Abre o aluno e toca em <b>Próxima quinzena</b>: o app copia o treino atual já com a progressão, e você só ajusta.</span></span></div>
      <div class="lista">${ord.map(a => { const d = diasAteTroca(a.id);
        return `<button type="button" class="it" data-a="editarTreino" data-id="${a.id}">${avatar(a)}
        <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(a.nome)}</span><span class="s ellip">${esc(programaDe(a.id))} · ${treinosDe(a.id).map(t => t.letra).join(" ")}</span></span>
        <span class="chip ${d < 0 ? "bad" : d <= 3 ? "warn" : ""}">${d < 0 ? `troca atrasada ${plural(-d,"dia")}` : d === 0 ? "trocar hoje" : `troca em ${d}d`}</span><span class="seta">›</span></button>`; }).join("")}</div>`;
  } else if (s === "modelos"){
    html += `<p class="small muted">Monta uma vez e aplica em vários alunos de uma vez. Depois ajusta só a carga de cada um. Também dá pra salvar o treino de um aluno como modelo, lá no editor.</p>
      ${todosModelos().map(m => { const n = ALUNOS.filter(a => programaDe(a.id) === m.nome).length;
        return `<button type="button" class="card row" data-a="verModelo" data-id="${m.id}" style="text-align:left"><span class="letra-b">${m.treinos.length > 1 ? m.treinos.map(t => t.letra).join("") : "🏠"}</span>
        <span class="grow"><b>${esc(m.nome)}</b><br><span class="small muted">${esc(m.desc)} · ${plural(n,"aluno")}</span></span><span class="seta muted">›</span></button>`; }).join("")}`;
  } else {
    const q = semAcento(sub.buscaEx || ""), g = sub.grupoEx || "Todos";
    const todos = todosEx();
    const grupos = ["Todos", ...new Set(Object.values(todos).map(x => x.grupo))];
    const lst = Object.entries(todos).filter(([,x]) => (g === "Todos" || x.grupo === g) && bate(x.nome, q));
    const comMidia = Object.keys(todos).filter(id => ex(id).img || ex(id).yt).length;
    html += `<p class="small muted">${plural(Object.keys(todos).length,"exercício")} · ${comMidia} com GIF ou vídeo. Busca sem acento funciona (“supino incl”).</p>
      <input class="inp" type="search" data-in="buscaEx" placeholder="Buscar exercício…" value="${esc(sub.buscaEx || "")}">
      <div class="chips scroll">${grupos.map(x => `<button type="button" class="chip" data-a="grupoEx" data-v="${esc(x)}" aria-pressed="${x === g}">${esc(x)}</button>`).join("")}</div>
      <div class="lista">${lst.map(([id,x]) => { const m = ex(id); return `<button type="button" class="it" data-a="verEx" data-id="${id}"><span class="ic">${m.img ? `<img src="${esc(m.img)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">` : x.local === "casa" ? "🏠" : x.local === "livre" ? "🌳" : "🏋️"}</span>
        <span class="grow stack" style="gap:1px"><span class="t ellip">${esc(x.nome)}</span><span class="s">${esc(x.grupo)}${S.exExtra[id] ? " · seu" : ""}${m.yt ? " · ▶ vídeo" : ""}${m.img ? " · GIF" : ""}</span></span><span class="seta">›</span></button>`; }).join("") || `<div class="vazio">Nenhum exercício com esse nome.</div>`}</div>
      <button type="button" class="btn full" data-a="novoEx">+ Cadastrar exercício</button>
      <div class="demo"><span>📥</span><span>Na versão final, sua lista de 300+ exercícios entra de uma vez por planilha (nome, grupo, link do vídeo). Não precisa cadastrar um por um.</span></div>`;
  }
  return {sub:"Montar e ajustar", tit:"Treinos", html};
}
function editarTreino(id){
  ED = {aluno:id, treinos:clone(treinosDe(id)), programa:programaDe(id), troca:S.troca[id], aba:0, novaQ:false};
  abrirFolha(`Treino · ${primeiro(aluno(id).nome)}`, folhaEditor, true);
}
function campoEd(i, c, rot, v, extra = ""){
  return `<label>${rot}<input data-in="ed" data-i="${i}" data-c="${c}" value="${esc(v ?? "")}" ${extra}></label>`;
}
function folhaEditor(){
  const a = aluno(ED.aluno), t = ED.treinos[ED.aba], dt = -diasDesde(ED.troca);
  const lg = t ? ligacoes(t.exs) : [];
  return `<div class="row"><span class="small muted grow">Programa: <b style="color:var(--ink)">${esc(ED.programa)}</b></span><button type="button" class="btn sm" data-a="aplicarModelo">Trocar modelo</button></div>
    <div class="card row flat" style="padding:10px 12px"><span class="ic ${dt < 0 ? "bad" : dt <= 3 ? "warn" : "info"}">🔄</span>
      <span class="grow"><b>${ED.novaQ ? "Quinzena nova montada" : dt < 0 ? `Troca atrasada ${plural(-dt,"dia")}` : `Troca em ${plural(dt,"dia")}`}</b><br><span class="small muted">${ED.novaQ ? "Vale" : "Treino vale"} até ${ddmm(deIso(ED.troca))}</span></span>
      ${ED.novaQ ? "" : `<button type="button" class="btn sm pri" data-a="edQuinzena">Próxima quinzena</button>`}</div>
    ${a.restricao ? `<div class="demo" style="border-color:var(--warn);background:var(--warn-soft)"><span>📌</span><span>${esc(a.restricao)}</span></div>` : ""}
    <div class="seg">${ED.treinos.map((x,i) => `<button type="button" data-a="edAba" data-i="${i}" aria-pressed="${i === ED.aba}">${esc(x.letra)}</button>`).join("")}<button type="button" data-a="edNovo">+ Novo</button></div>
    ${t ? `<input class="inp" data-in="edNome" value="${esc(t.nome)}" aria-label="Nome do treino" style="font-weight:800">
    <div class="lista">${t.exs.map((e,i) => { const cardio = ehCardio(e.id), mob = ex(e.id).grupo === "Mobilidade";
      return `<div class="ed-ex${lg[i] && lg[i].pos < lg[i].tam ? " lig" : ""}">
      <div class="row"><span class="n" style="flex:none;width:22px;height:22px;border-radius:50%;background:var(--sunk);display:grid;place-items:center;font-size:.7rem;font-weight:800">${i+1}</span><b class="grow">${esc(ex(e.id).nome)}</b>
        <span class="mini"><button type="button" data-a="edMover" data-i="${i}" data-d="-1" aria-label="Subir">↑</button><button type="button" data-a="edMover" data-i="${i}" data-d="1" aria-label="Descer">↓</button><button type="button" class="x" data-a="edTirar" data-i="${i}" aria-label="Remover">✕</button></span></div>
      ${lg[i] || chipMetodo(e) ? `<div class="chips">${chipLig(lg[i])}${chipMetodo(e)}</div>` : ""}
      ${cardio || mob ? `<div class="ed-campos">
        ${campoEd(i,"series","Séries",e.series,'inputmode="numeric"')}
        ${campoEd(i,"reps",cardio ? "Volume" : "Reps",e.reps,cardio ? 'placeholder="20 min"' : "")}
        ${campoEd(i,"desc","Desc. (s)",e.desc,'inputmode="numeric"')}
        ${campoEd(i,"int",cardio ? "Zona/ritmo" : "Lado",e.int,cardio ? 'placeholder="Zona 2"' : 'placeholder="cada"')}
      </div>` : `<div class="ed-campos">
        ${campoEd(i,"series","Séries",e.series,'inputmode="numeric"')}
        ${campoEd(i,"desc","Desc. (s)",e.desc,'inputmode="numeric"')}
        ${campoEd(i,"cad","Cadência",e.cad,'placeholder="3-0-1-0"')}
        ${campoEd(i,"int","RIR/RPE",e.int,'placeholder="RIR 2"')}
      </div>
      <div class="ed-sr">
        <span class="lbl">Série</span><span class="lbl">Reps</span><span class="lbl">Carga (kg)</span>
        ${planoSeries(e).map((x,k) => `<span class="sn">${k+1}</span>
          <input data-in="edS" data-i="${i}" data-k="${k}" data-c="reps" value="${esc(x.reps)}" aria-label="Repetições da série ${k+1}">
          <input inputmode="decimal" data-in="edS" data-i="${i}" data-k="${k}" data-c="kg" value="${x.kg != null ? fmt(x.kg) : ""}" placeholder="—" aria-label="Carga da série ${k+1}">`).join("")}
      </div>
      <div class="row" style="gap:6px;flex-wrap:wrap">
        ${planoVaria(e) ? `<button type="button" class="btn sm" data-a="edIguais" data-i="${i}">Igualar à série 1</button>` : ""}
        <label class="metodo-sel">Método<select data-in="ed" data-i="${i}" data-c="met">${METODOS.map(m => `<option${m === (e.met || "Normal") ? " selected" : ""}>${m}</option>`).join("")}</select></label>
      </div>`}
      <input class="ed-obs" data-in="ed" data-i="${i}" data-c="obs" value="${esc(e.obs)}" placeholder="Observação pro aluno (opcional)">
      ${i < t.exs.length - 1 ? `<button type="button" class="lig-b" data-a="edLigar" data-i="${i}" aria-pressed="${!!e.jun}">🔗 ${e.jun ? "Ligado ao próximo (sem descanso entre eles)" : "Juntar com o próximo (bi-set)"}</button>` : ""}
    </div>`; }).join("") || `<div class="vazio" style="border:0">Nenhum exercício ainda.</div>`}</div>
    <button type="button" class="btn full" data-a="edAdd">+ Adicionar exercício</button>
    <div class="btns"><button type="button" class="btn sm" data-a="edDuplicar">Duplicar ${esc(t.letra)}</button><button type="button" class="btn sm" data-a="edComoModelo">Salvar como modelo</button></div>
    ${ED.treinos.length > 1 ? `<button type="button" class="lnk small" data-a="edApagar" style="color:var(--bad);align-self:center">Apagar treino ${esc(t.letra)}</button>` : ""}` : ""}
    <button type="button" class="btn pri full" data-a="edSalvar">Salvar e enviar pro aluno</button>`;
}
/* próxima quinzena: copia o programa atual com a progressão escolhida */
const PROG = [
  ["manter","Manter tudo","Mesmo treino, só renova a data"],
  ["reps","+1 repetição","Ex.: 10 vira 11, 8–10 vira 9–11"],
  ["carga","+2,5 kg","Nos exercícios com carga (halter: +1 kg)"],
  ["serie","+1 série","Nos 2 primeiros exercícios de cada treino"]
];
function folhaQuinzena(){
  const a = aluno(ED.aluno), dt = -diasDesde(ED.troca);
  abrirFolha("Próxima quinzena", () => `<p class="small muted">O app copia o treino atual de ${esc(primeiro(a.nome))} e aplica a progressão. Depois você troca um exercício ou outro e salva. O treino antigo fica guardado no histórico.</p>
    <div class="lista">${PROG.map(([id, n, d]) => `<button type="button" class="it" data-a="edProg" data-v="${id}"><span class="grow stack" style="gap:1px"><span class="t">${n}</span><span class="s">${d}</span></span><span class="chip acc">Usar</span></button>`).join("")}</div>
    <p class="tiny muted">Começa ${dt > 0 ? `quando o atual vencer (${ddmm(deIso(ED.troca))})` : "hoje"} e vale 15 dias.</p>`);
}
const somaReps = (r, n) => String(r).replace(/\d+/g, x => +x + n);
function aplicarProg(tipo){
  const ini = -diasDesde(ED.troca) > 0 ? deIso(ED.troca) : hoje0();
  (S.anteriores[ED.aluno] = S.anteriores[ED.aluno] || []).push({ate: iso(ini), programa: ED.programa, treinos: clone(ED.treinos)});
  ED.treinos.forEach(t => t.exs.forEach((e, i) => {
    if (tipo === "reps" && !ehCardio(e.id) && !/s$/.test(e.reps)){ e.reps = somaReps(e.reps, 1); if (e.plano) e.plano.forEach(x => x.reps = somaReps(x.reps, 1)); }
    const inc = /halter/i.test(ex(e.id).nome) ? 1 : 2.5;
    if (tipo === "carga" && e.carga != null) e.carga = Math.round((e.carga + inc)*10)/10;
    if (tipo === "carga" && e.plano) e.plano.forEach(x => { if (x.kg != null) x.kg = Math.round((x.kg + inc)*10)/10; });
    if (tipo === "serie" && i < 2 && !ehCardio(e.id)) e.series += 1;
  }));
  ED.troca = iso(addDias(ini, 15)); ED.novaQ = true;
}
function folhaAddEx(){
  abrirFolha("Adicionar exercício", () => {
    const q = semAcento(sub.buscaAdd || ""), g = sub.grupoAdd || "Todos";
    const todos = todosEx(), grupos = ["Todos", ...new Set(Object.values(todos).map(x => x.grupo))];
    const lst = Object.entries(todos).filter(([,x]) => (g === "Todos" || x.grupo === g) && bate(x.nome, q));
    return `<input class="inp" type="search" data-in="buscaAdd" placeholder="Buscar… (ex.: “remada”)" value="${esc(sub.buscaAdd || "")}">
      <div class="chips scroll">${grupos.map(x => `<button type="button" class="chip" data-a="grupoAdd" data-v="${esc(x)}" aria-pressed="${x === g}">${esc(x)}</button>`).join("")}</div>
      <div class="lista">${lst.map(([id,x]) => `<button type="button" class="it" data-a="edEscolher" data-id="${id}"><span class="grow stack" style="gap:1px"><span class="t">${esc(x.nome)}</span><span class="s">${esc(x.grupo)}</span></span><span class="chip acc">+</span></button>`).join("") || `<div class="vazio">Nada com esse nome. Cadastra na aba Exercícios.</div>`}</div>`;
  });
}
function folhaModelos(){
  abrirFolha("Escolher modelo", () => `<p class="small muted">O treino atual do aluno é substituído pelo modelo. Depois é só ajustar.</p>
    ${todosModelos().map(m => `<button type="button" class="card row" data-a="edModelo" data-id="${m.id}" style="text-align:left"><span class="grow"><b>${esc(m.nome)}</b><br><span class="small muted">${esc(m.desc)}</span></span><span class="chip acc">Usar</span></button>`).join("")}`);
}
const selModelo = new Set();
function folhaModelo(id){
  const m = todosModelos().find(x => x.id === id);
  selModelo.clear();
  abrirFolha(m.nome, () => `<p class="small muted">${esc(m.desc)}</p>${m.treinos.map(t => { const lg = ligacoes(t.exs); return `<div class="card flat"><b>${esc(t.letra)} · ${esc(t.nome)}</b>
    <div class="trn">${t.exs.map((e,i) => `<div class="ex"><span class="n">${i+1}</span><div class="grow stack" style="gap:2px"><b>${esc(ex(e.id).nome)}</b><span class="small muted">${detalhes(e)}</span>${lg[i] || chipMetodo(e) ? `<span class="chips">${chipLig(lg[i])}${chipMetodo(e)}</span>` : ""}</div></div>`).join("")}</div></div>`; }).join("")}
    <div class="campo"><span class="lbl">Aplicar pra quem? (pode marcar vários)</span><div class="chips">${ALUNOS.map(a => `<button type="button" class="chip" data-a="selModelo" data-id="${a.id}" aria-pressed="${selModelo.has(a.id)}">${esc(primeiro(a.nome))}</button>`).join("")}</div></div>
    <button type="button" class="btn pri full" data-a="modeloPara" data-m="${id}"${selModelo.size ? "" : " disabled"}>${selModelo.size ? `Aplicar pra ${plural(selModelo.size,"aluno")}` : "Marque os alunos"}</button>
    <p class="tiny muted">Cada um recebe o modelo com 15 dias de validade. Depois você ajusta a carga de cada um no editor.</p>`, true);
}
function folhaEx(id){
  const x = ex(id);
  abrirFolha(x.nome, () => { const m = ex(id); return `<div class="chips"><span class="chip info">${esc(m.grupo)}</span><span class="chip">${m.local === "casa" ? "Em casa" : m.local === "livre" ? "Ao ar livre" : "Academia"}</span></div>
    ${midiaEx(id)}
    <div class="dica" style="margin:0"><span>💡</span><span><b>Dica pro aluno:</b> ${esc(m.dica || "—")}</span></div>
    <div class="card flat"><span class="eyebrow">Demonstração</span>
      <div class="campo"><label for="ex-yt">Link do YouTube</label><input id="ex-yt" class="inp" inputmode="url" placeholder="https://youtu.be/…" value="${esc(m.yt || "")}"></div>
      <div class="campo"><span class="lbl">GIF ou imagem</span><label class="btn sm" style="align-self:flex-start">${m.img ? "Trocar GIF/imagem" : "Escolher GIF/imagem"}<input type="file" accept="image/*" data-in="exImg" data-id="${id}" hidden></label></div>
      <button type="button" class="btn pri" data-a="salvarMidia" data-id="${id}">Salvar demonstração</button>
      ${m.img || m.yt ? `<button type="button" class="lnk small" data-a="tirarMidia" data-id="${id}" style="color:var(--bad);align-self:flex-start">Tirar GIF e vídeo</button>` : ""}</div>
    ${m.alt && m.alt.length ? `<div class="campo"><span class="lbl">Trocas aprovadas (aparelho ocupado)</span><div class="chips">${m.alt.map(a => `<span class="chip">${esc(ex(a).nome)}</span>`).join("")}</div></div>` : ""}`; }, true);
}
function folhaNovoEx(){
  abrirFolha("Cadastrar exercício", () => `<div class="campo"><label for="nx-nome">Nome</label><input id="nx-nome" class="inp" placeholder="Ex.: Remada cavalinho"></div>
    <div class="campo"><label for="nx-grupo">Grupo muscular</label><select id="nx-grupo" class="inp">${[...new Set(Object.values(EX).map(x => x.grupo))].map(g => `<option>${esc(g)}</option>`).join("")}</select></div>
    <div class="campo"><label for="nx-local">Onde</label><select id="nx-local" class="inp"><option value="academia">Academia</option><option value="casa">Em casa</option><option value="livre">Ao ar livre</option></select></div>
    <div class="campo"><label for="nx-dica">Dica de execução</label><textarea id="nx-dica" class="inp" placeholder="Como você explica pro aluno"></textarea></div>
    <div class="campo"><label for="nx-yt">Link do YouTube (opcional)</label><input id="nx-yt" class="inp" inputmode="url" placeholder="https://youtu.be/…"></div>
    <div class="campo"><span class="lbl">GIF ou imagem (opcional)</span><label class="btn sm" style="align-self:flex-start">Escolher arquivo<input type="file" accept="image/*" data-in="exImg" data-id="novo" hidden></label><span class="ajuda" id="nx-img-ok">${MIDIA_TMP.img ? "✓ imagem escolhida" : ""}</span></div>
    <button type="button" class="btn pri full" data-a="salvarEx">Salvar exercício</button>`, true);
}
const MIDIA_TMP = {};

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
  const comps = S.comprovantes.filter(c => !c.ok);
  const html = `${comps.length ? `<div class="sec"><h2>Comprovantes pra confirmar</h2><span class="chip acc">${comps.length}</span></div>
    <div class="lista">${comps.map(c => { const a = aluno(c.aluno); return `<button type="button" class="it" data-a="verComprovante" data-id="${c.id}">${avatar(a)}
      <span class="grow stack" style="gap:1px"><span class="t">${esc(a.nome)}</span><span class="s">${reais(c.valor)} · ${c.img ? "com comprovante" : "sem print"} · ${quando(c.data)}</span></span><span class="seta">›</span></button>`; }).join("")}</div>` : ""}
    <div class="card hero" style="gap:6px"><span class="eyebrow">Receita mensal recorrente</span><h2 style="max-width:none">${reais(f.previsto)}</h2>
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
      ${v <= 7 ? `<button type="button" class="btn sm" data-a="cobrar" data-id="${a.id}">Cobrar</button>` : ""}
      <button type="button" class="btn sm quad ${v <= 7 ? "pri" : ""}" data-a="pago" data-id="${a.id}" aria-label="Marcar ${esc(primeiro(a.nome))} como pago" title="Marcar como pago">✓</button></div>`).join("")}</div>
    <p class="tiny muted">✓ marca como pago (Pix que caiu sem comprovante) e joga o vencimento pro mês seguinte.</p>
    <div class="sec"><h2>Planos</h2></div>
    <div class="lista">${PLANOS.map(pl => { const on = !!S.planosAtivos[pl.id]; return `<button type="button" class="it" data-a="plano" data-id="${pl.id}" aria-pressed="${on}">
      <span class="grow stack" style="gap:1px"><span class="t">${pl.nome} · ${reais(pl.valor)}</span><span class="s">${pl.meses > 1 ? `${reais(Math.round(pl.valor/pl.meses))}/mês · ${Math.round((1 - pl.valor/(PLANOS[0].valor*pl.meses))*100)}% de desconto` : "o que você cobra hoje"} · ${on ? "aparece pro aluno" : "desligado"}</span></span><span class="sw${on ? " on" : ""}"><i></i></span></button>`; }).join("")}</div>
    <div class="demo"><span>💡</span><span>Hoje: Pix com comprovante, você confirma. Fase 2: cobrança automática (Pix ou cartão recorrente) que dá baixa sozinha, como você pediu.</span></div>`;
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
function folhaRecado(){
  abrirFolha("Recado da semana", () => `<p class="small muted">Aparece na tela inicial de todos os alunos.</p>
    <textarea class="inp" id="recado-txt" style="min-height:140px">${esc(S.recado)}</textarea>
    <button type="button" class="btn pri full" data-a="salvarRecado">Publicar pra todos</button>`, true);
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
  pix: folhaPix,
  copiar(el){ try { navigator.clipboard.writeText(el.dataset.t); toast(el.dataset.msg || "Copiado"); } catch(e){ toast("Não deu pra copiar"); } },
  exEvo(el){ sub.exEvo = el.dataset.id; render(); },
  dia(el){ sub.diaSel = el.dataset.d; pilha.length ? desenharFolha() : render(); const d = $("dia-det"); if (d) d.scrollIntoView({behavior:"smooth", block:"nearest"}); },
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
  segF(el){ sub[el.dataset.k] = el.dataset.v; desenharFolha(); },
  cadastro(){ folhaCadastro(); },
  cadOp(el){ CAD[el.dataset.c] = el.dataset.v || null; desenharFolha(); },
  cadParq(el){ CAD.parq[+el.dataset.i] = +el.dataset.v; desenharFolha(); },
  enviarCadastro,
  verTermo: folhaTermo,
  verFicha(el){ folhaFicha(el.dataset.id); },
  baixarDados,
  pedirExclusao(){
    if (!confirm("Pedir pra apagar todos os seus dados? Isso encerra a consultoria quando o Jorge confirmar.")) return;
    S.exclusao.push({aluno:EU, data:iso(hoje0()), feito:false}); salvar(); render(); toast("Pedido enviado pro Jorge");
  },
  /* Jorge */
  verPendente(el){ sub.modeloAprov = null; folhaPendente(el.dataset.id); },
  modeloAprov(el){ sub.modeloAprov = el.dataset.v; desenharFolha(); },
  aprovar(el){ aprovar(el.dataset.id); },
  recusar(el){ if (!confirm("Recusar esse cadastro? Ele é apagado.")) return; S.pendentes = S.pendentes.filter(x => x.id !== el.dataset.id); salvar(); fecharFolha(); render(); toast("Cadastro recusado"); },
  confirmarExclusao(el){
    const a = aluno(el.dataset.id);
    if (!confirm(`Apagar os dados de ${a.nome}? No protótipo só marca como feito.`)) return;
    S.exclusao.forEach(x => { if (x.aluno === a.id) x.feito = true; }); salvar(); render(); toast("Dados apagados e pedido concluído");
  },
  novaAval(el){ folhaNovaAval(el.dataset.id); },
  verAvals(el){ folhaAvals(el.dataset.id); },
  salvarAval,
  enviarChat(el){
    const t = $("chat-txt"), txt = t.value.trim(); if (!txt) return;
    const id = el.dataset.id, de = S.papel === "aluno" ? "a" : "j";
    conversa(id).push({de, txt, ts:Date.now(), lido:false}); salvar();
    if (pilha.length) desenharFolha(); else render();
    rolarChat();
  },
  abrirChat(el){ folhaChat(el.dataset.id); },
  irChat(){ fecharFolha(); irAba("chat"); },
  novaConversa(){ abrirFolha("Nova mensagem", () => `<div class="lista">${ALUNOS.map(a => `<button type="button" class="it" data-a="abrirChat" data-id="${a.id}">${avatar(a)}<span class="grow t">${esc(a.nome)}</span><span class="seta">›</span></button>`).join("")}</div>`, true); },
  msgAlerta(el){ const x = alertas().find(z => z.a.id === el.dataset.id); folhaChat(el.dataset.id, x ? x.msg : ""); },
  cobrar(el){ const a = aluno(el.dataset.id); folhaChat(a.id, msgCobranca(a, diasAteVenc(a.id))); },
  semComprovante(){ enviarComprovante(null); },
  verComprovante(el){ folhaComprovante(el.dataset.id); },
  confirmarPag(el){ confirmarPagamento(el.dataset.id); },
  recusarPag(el){ const c = S.comprovantes.find(x => x.id === el.dataset.id); S.comprovantes = S.comprovantes.filter(x => x !== c);
    conversa(c.aluno).push({de:"j", txt:"Oi! O Pix não apareceu aqui na conta ainda. Confere pra mim se saiu certinho?", ts:Date.now(), lido:false});
    salvar(); voltarFolha(); render(); toast("Avisei no chat"); },
  plano(el){ const id = el.dataset.id; if (id === "mensal"){ toast("O mensal fica sempre ligado"); return; } S.planosAtivos[id] = !S.planosAtivos[id]; salvar(); render(); },
  suspender(el){ const id = el.dataset.id, a = aluno(id);
    if (S.suspensos[id]){ delete S.suspensos[id]; toast(`${primeiro(a.nome)} reativado`); }
    else { if (!confirm(`Pausar o acesso de ${a.nome}? Ele vê um aviso pra regularizar.`)) return; S.suspensos[id] = iso(hoje0()); toast(`Acesso de ${primeiro(a.nome)} pausado`); }
    salvar(); desenharFolha(); render(); },
  aviso(el){ const k = el.dataset.k; S.avisos[k] = !S.avisos[k]; salvar(); render(); },
  avisoHora(el){ S.avisos.hora = el.dataset.v; salvar(); render(); },
  testarAviso(){ const t = proximoTreino(EU); notificar(MARCA.nome, `Hoje tem treino ${t.letra}: ${t.nome}. Bora? 💪`); },
  abrirPdf(el){ const n = nutriDe(el.dataset.id);
    if (n.pdf && n.pdf.src){ const w = window.open(); if (w) w.document.write(`<iframe src="${n.pdf.src}" style="border:0;width:100%;height:100vh"></iframe>`); }
    else abrirFolha(n.pdf.nome, () => `<div class="vazio">📄 Aqui abre o PDF do plano alimentar que o nutricionista parceiro mandou. No protótipo é só um exemplo.</div>`, true); },
  verNutri(el){ folhaNutri(el.dataset.id); },
  salvarNutri(el){ const id = el.dataset.id, n = Object.assign({}, nutriDe(id));
    n.orient = $("nt-o").value.trim() || D.ORIENT; n.nutri = $("nt-n").value.trim(); S.nutri[id] = n; salvar(); voltarFolha(); toast("Alimentação salva"); },
  verMarca: folhaMarca,
  marca(el){ S.marca = el.dataset.id; salvar(); aplicarMarca(); desenharFolha(); render(); toast(`Marca: ${MARCA.nome}`); },
  tema(el){ S.tema = el.dataset.v; salvar(); aplicarMarca(); desenharFolha(); },
  verEvolucao(el){ sub.evo = "desemp"; folhaEvolucao(el.dataset.id); },
  verTodosAl(){ sub.verTodosAl = true; render(); },
  verAluno(el){ folhaAluno(el.dataset.id); },
  filtro(el){ filtro.tipo = el.dataset.v; render(); },
  novoAluno(){ const link = location.origin + location.pathname + "?cadastro=1";
    abrirFolha("Aluno novo", () => `<p class="small muted">Manda o link de cadastro. A pessoa preenche dados, anamnese, PAR-Q e aceita o termo. O cadastro chega no topo do seu painel pra você aprovar.</p>
      <div class="campo"><span class="lbl">Link de cadastro</span><div class="row"><input class="inp grow" readonly value="${esc(link)}"><button type="button" class="btn" data-a="copiar" data-t="${esc(link)}" data-msg="Link copiado">Copiar</button></div></div>
      <a class="btn wa full" href="${wa(`Oi! Pra entrar na consultoria ${MARCA.nome} 💪 faz teu cadastro por aqui: ${link} . Assim que eu aprovar, teu treino aparece no app.`)}" target="_blank" rel="noopener">Mandar link no WhatsApp</a>`, true); },
  editarTreino(el){ editarTreino(el.dataset.id); },
  edAba(el){ ED.aba = +el.dataset.i; desenharFolha(true); },
  edNovo(){ const letras = "ABCDEFGH", l = letras.split("").find(x => !ED.treinos.some(t => t.letra === x)) || "X";
    ED.treinos.push({letra:l, nome:`Treino ${l}`, local:"academia", exs:[]}); ED.aba = ED.treinos.length - 1; desenharFolha(true); },
  edApagar(){ if (!confirm(`Apagar o treino ${ED.treinos[ED.aba].letra}?`)) return; ED.treinos.splice(ED.aba,1); ED.aba = 0; desenharFolha(true); },
  edMover(el){ const i = +el.dataset.i, j = i + +el.dataset.d, x = ED.treinos[ED.aba].exs; if (j < 0 || j >= x.length) return; [x[i], x[j]] = [x[j], x[i]]; desenharFolha(); },
  edTirar(el){ ED.treinos[ED.aba].exs.splice(+el.dataset.i,1); desenharFolha(); },
  edAdd: folhaAddEx,
  grupoAdd(el){ sub.grupoAdd = el.dataset.v; desenharFolha(); },
  edEscolher(el){ const id = el.dataset.id, c = ehCardio(id), m = ex(id).grupo === "Mobilidade";
    ED.treinos[ED.aba].exs.push({id, series: c ? 1 : 3, reps: c ? "20 min" : m ? "30s" : "12", desc: c ? 0 : m ? 15 : 60, carga:null, plano:null, obs:"", cad:"", int:"", met:"Normal", jun:false});
    voltarFolha(); toast(`${ex(id).nome} adicionado`);
    setTimeout(() => { const c = $("folha-c"); c.scrollTop = c.scrollHeight; }, 50); },
  aplicarModelo: folhaModelos,
  edModelo(el){ const m = todosModelos().find(x => x.id === el.dataset.id); ED.treinos = clone(m.treinos); ED.programa = m.nome; ED.aba = 0; voltarFolha(); toast(`Modelo “${m.nome}” aplicado`); },
  edIguais(el){ const x = ED.treinos[ED.aba].exs[+el.dataset.i], p = planoSeries(x)[0]; x.plano = null; x.reps = p.reps; x.carga = p.kg; desenharFolha(); },
  edLigar(el){ const e = ED.treinos[ED.aba].exs[+el.dataset.i]; e.jun = !e.jun; desenharFolha(); },
  edQuinzena: folhaQuinzena,
  edProg(el){ aplicarProg(el.dataset.v); voltarFolha(); toast(`Quinzena nova até ${ddmm(deIso(ED.troca))}. Ajusta o que quiser e salva.`); },
  edDuplicar(){ const t = ED.treinos[ED.aba], l = "ABCDEFGH".split("").find(x => !ED.treinos.some(z => z.letra === x)) || "X";
    ED.treinos.push(Object.assign(clone(t), {letra:l, nome:t.nome + " (cópia)"})); ED.aba = ED.treinos.length - 1; desenharFolha(true); toast(`Treino ${t.letra} copiado como ${l}`); },
  edComoModelo(){
    const nome = prompt("Nome do modelo:", ED.programa + " · " + primeiro(aluno(ED.aluno).nome)); if (!nome) return;
    S.modelosExtra.push({id:"m_" + uid(), nome:nome.trim(), desc:`${ED.treinos.length} treinos · criado a partir de ${primeiro(aluno(ED.aluno).nome)}`, treinos:clone(ED.treinos)});
    salvar(); toast(`Modelo “${nome.trim()}” salvo. Está na aba Modelos.`); },
  edSalvar(){
    if (ED.treinos.some(t => !t.exs.length)){ toast("Tem treino sem exercício. Adiciona ou apaga ele."); return; }
    S.treinos[ED.aluno] = ED.treinos; S.programa[ED.aluno] = ED.programa; S.troca[ED.aluno] = ED.troca; salvar();
    toast(`Treino de ${primeiro(aluno(ED.aluno).nome)} atualizado. Aviso de treino novo enviado 🔔`); fecharFolha(); render();
  },
  verModelo(el){ folhaModelo(el.dataset.id); },
  selModelo(el){ const id = el.dataset.id; selModelo.has(id) ? selModelo.delete(id) : selModelo.add(id); desenharFolha(); },
  modeloPara(el){ if (!selModelo.size) return; const m = todosModelos().find(x => x.id === el.dataset.m), n = selModelo.size;
    selModelo.forEach(id => { S.treinos[id] = clone(m.treinos); S.programa[id] = m.nome; S.troca[id] = iso(addDias(hoje0(), 15)); });
    selModelo.clear(); salvar(); fecharFolha(); render(); toast(`${m.nome} aplicado pra ${plural(n,"aluno")}`); },
  grupoEx(el){ sub.grupoEx = el.dataset.v; render(); },
  verEx(el){ folhaEx(el.dataset.id); },
  novoEx(){ delete MIDIA_TMP.img; folhaNovoEx(); },
  salvarEx(){
    const nome = $("nx-nome").value.trim(); if (!nome){ toast("Dá um nome pro exercício"); return; }
    const yt = $("nx-yt").value.trim();
    if (yt && !ytId(yt)){ toast("Esse link não parece do YouTube"); return; }
    S.exExtra["x_" + uid()] = Object.assign({nome, grupo:$("nx-grupo").value, local:$("nx-local").value, dica:$("nx-dica").value.trim(), alt:[]}, yt ? {yt} : {}, MIDIA_TMP.img ? {img:MIDIA_TMP.img} : {});
    delete MIDIA_TMP.img; salvar(); fecharFolha(); render(); toast("Exercício cadastrado ✅");
  },
  salvarMidia(el){ const id = el.dataset.id, yt = $("ex-yt").value.trim();
    if (yt && !ytId(yt)){ toast("Esse link não parece do YouTube"); return; }
    S.midia[id] = Object.assign({}, S.midia[id], {yt}); salvar(); desenharFolha(); render(); toast("Demonstração salva ✅"); },
  tirarMidia(el){ delete S.midia[el.dataset.id]; const x = S.exExtra[el.dataset.id]; if (x){ delete x.img; delete x.yt; } salvar(); desenharFolha(); render(); },
  pago(el){ const id = el.dataset.id, v = deIso(S.venc[id]); S.venc[id] = iso(addDias(v, 30)); S.pagos[id] = iso(hoje0()); salvar(); render();
    toast(`${primeiro(aluno(id).nome)}: pago! Próximo vencimento ${ddmm(addDias(v,30))}`); },
  recado: folhaRecado,
  salvarRecado(){ S.recado = $("recado-txt").value.trim() || S.recado; S.recadoData = iso(hoje0()); salvar(); fecharFolha(); render(); toast("Recado publicado pra todos os alunos"); }
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-a]"); if (!el) return;
  const f = A[el.dataset.a]; if (!f) return;
  e.preventDefault(); f(el, e);
});
$("veu").addEventListener("click", fecharFolha);
$("troca").addEventListener("click", () => { S.papel = null; salvar(); $("exec").hidden = true; pararDescanso(); fecharFolha(); telaEntrada(); });

document.addEventListener("input", e => {
  const el = e.target, t = el.dataset && el.dataset.in; if (!t) return;
  if (t === "set"){ const z = S.exec.sets[el.dataset.i][el.dataset.k]; z[el.dataset.c] = numIn(el.value); salvar(); }
  else if (t === "cad"){ CAD[el.dataset.c] = el.value; }
  else if (t === "av" && AV){
    const c = el.dataset.c, g = el.dataset.g;
    if (g) AV[g][c] = numIn(el.value); else AV[c] = c === "obs" ? el.value : numIn(el.value);
    const gd = pctGordura(AV, aluno(AV.aluno)), x = $("av-g"); if (x) x.textContent = gd != null ? fmt(gd) + "% gordura" : "—";
  }
  else if (t === "fim"){ FIM[el.dataset.c] = el.value; }
  else if (t === "busca"){ filtro.busca = el.value; const p = el.selectionStart; render(); const n = document.querySelector('[data-in="busca"]'); n.focus(); n.setSelectionRange(p,p); }
  else if (t === "buscaEx"){ sub.buscaEx = el.value; const p = el.selectionStart; render(); const n = document.querySelector('[data-in="buscaEx"]'); n.focus(); n.setSelectionRange(p,p); }
  else if (t === "buscaAdd"){ sub.buscaAdd = el.value; const p = el.selectionStart; desenharFolha(); const n = document.querySelector('[data-in="buscaAdd"]'); n.focus(); n.setSelectionRange(p,p); }
  else if (t === "edS"){
    const x = ED.treinos[ED.aba].exs[+el.dataset.i], k = +el.dataset.k, c = el.dataset.c;
    x.plano = planoSeries(x);
    x.plano[k][c] = c === "kg" ? numIn(el.value) : el.value;
    x.reps = x.plano[0].reps; x.carga = x.plano[0].kg;   /* o resumo do exercício segue a 1ª série */
  }
  else if (t === "edNome"){ ED.treinos[ED.aba].nome = el.value; }
  else if (t === "ed"){
    const x = ED.treinos[ED.aba].exs[+el.dataset.i], c = el.dataset.c;
    x[c] = ["reps","obs","cad","int","met"].includes(c) ? el.value : c === "carga" ? numIn(el.value) : (parseInt(el.value) || 0);
    if (c === "met") desenharFolha();
  }
});
document.addEventListener("change", e => {
  const el = e.target;
  /* mudou o número de séries (ou uma série do plano): redesenha e devolve o foco pro campo que a pessoa tocou */
  if (el.dataset && ED && ((el.dataset.in === "ed" && el.dataset.c === "series") || el.dataset.in === "edS")){
    setTimeout(() => {
      const f = document.activeElement, d = f && f.dataset ? Object.assign({}, f.dataset) : null;
      desenharFolha();
      if (d && d.in){ const sel = Object.entries(d).map(([k,v]) => `[data-${k.replace(/[A-Z]/g, c => "-" + c.toLowerCase())}="${v}"]`).join(""); const n = document.querySelector("#folha-c " + sel); if (n) n.focus(); }
    }, 0);
    return;
  }
  /* GIF/imagem do exercício: guarda o arquivo como está (GIF continua animado) */
  if (el.dataset && el.dataset.in === "exImg" && el.files && el.files[0]){
    const f = el.files[0];
    if (f.size > 1.5e6){ toast("Arquivo grande demais pro protótipo (máx. 1,5 MB)"); return; }
    const fr = new FileReader();
    fr.onload = () => {
      const id = el.dataset.id;
      if (id === "novo"){ MIDIA_TMP.img = fr.result; const o = $("nx-img-ok"); if (o) o.textContent = "✓ imagem escolhida"; return; }
      if (S.exExtra[id]) S.exExtra[id].img = fr.result; else S.midia[id] = Object.assign({}, S.midia[id], {img: fr.result});
      try { salvar(); } catch(err){}
      desenharFolha(); render(); toast("GIF/imagem salvo ✅");
    };
    fr.readAsDataURL(f);
    return;
  }
  if (el.dataset && (el.dataset.in === "comprovante" || el.dataset.in === "nutriPdf") && el.files && el.files[0]){
    const f = el.files[0], fr = new FileReader();
    fr.onload = () => {
      const src = f.size > 1.5e6 ? null : fr.result;
      if (el.dataset.in === "comprovante") enviarComprovante(src);
      else { const id = el.dataset.id; S.nutri[id] = Object.assign({}, nutriDe(id), {pdf:{nome:f.name, src}}); salvar(); desenharFolha(); toast("PDF anexado"); }
    };
    fr.readAsDataURL(f);
    return;
  }
  /* foto da avaliação: reduz pra caber no celular */
  if (el.dataset && el.dataset.in === "avFoto" && el.files && el.files[0] && AV){
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const c = document.createElement("canvas"), k = Math.min(1, 360/img.width);
        c.width = img.width*k; c.height = img.height*k; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        AV.fotos[el.dataset.c] = c.toDataURL("image/jpeg", .7); desenharFolha(); toast("Foto pronta 📸");
      };
      img.src = fr.result;
    };
    fr.readAsDataURL(el.files[0]);
  }
});
/* o input de quantidade sai do foco: seleciona tudo ao tocar (mais fácil de trocar a carga) */
document.addEventListener("focusin", e => { if (e.target.matches && e.target.matches(".sr input, .ed-campos input, .ed-sr input")) setTimeout(() => e.target.select(), 0); });

/* ================= início ================= */
S = carregar() || semear();
S.novos.forEach(a => { if (!ALUNOS.some(x => x.id === a.id)) ALUNOS.push(a); });
/* o Jorge gostou do tema escuro: vem escuro de saída (dá pra trocar em Painel → Marca do app) */
S.marca = S.marca || "bunn"; S.tema = S.tema || "escuro";
aplicarMarca();
/* link direto: ?ver=jorge ou ?ver=aluno (pra mandar o link já na visão certa) */
const qs = new URLSearchParams(location.search);
if (qs.get("ver") === "jorge" || qs.get("ver") === "aluno"){ S.papel = qs.get("ver"); if (qs.get("aba")) S.aba[S.papel] = qs.get("aba"); history.replaceState(null, "", location.pathname); }
if (qs.get("cadastro")){ S.papel = null; history.replaceState(null, "", location.pathname); }
salvar();
render();
if (qs.get("cadastro")) folhaCadastro();
if (S.exec && S.papel === "aluno") abrirExec();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
