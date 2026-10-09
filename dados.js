/* Dados do protótipo. TUDO FICTÍCIO: nenhum aluno aqui existe.
   Na versão de verdade isso vem do banco (Supabase). */
window.DADOS = (function(){
"use strict";

const MARCA = {
  nome: "Jorge Personal",
  curto: "Jorge",
  iniciais: "JP",
  slogan: "Treino de academia com acompanhamento de perto",
  whats: "5521900000000",          // número fictício
  pix: "jorge.personal@pix.com.br" // chave fictícia
};

/* local: onde dá pra fazer · alt: trocas quando o aparelho está ocupado */
const EX = {
  supino_reto:        {nome:"Supino reto com barra", grupo:"Peito", local:"academia", dica:"Escápulas encaixadas no banco, pés firmes. Desce a barra até o meio do peito, sem quicar.", alt:["supino_halter","supino_maquina","flexao"]},
  supino_halter:      {nome:"Supino reto com halteres", grupo:"Peito", local:"academia", dica:"Halteres descem até a linha do peito, cotovelos a uns 45° do corpo.", alt:["supino_reto","supino_maquina"]},
  supino_inclinado:   {nome:"Supino inclinado com halteres", grupo:"Peito", local:"academia", dica:"Banco a 30°. Não deixa o ombro ir pra frente no fim do movimento.", alt:["supino_maquina","crossover"]},
  supino_maquina:     {nome:"Supino na máquina", grupo:"Peito", local:"academia", dica:"Ajusta o banco pra pegada ficar na linha do peito.", alt:["supino_halter","supino_reto"]},
  crossover:          {nome:"Crossover na polia", grupo:"Peito", local:"academia", dica:"Braços levemente flexionados o tempo todo. Aperta o peito no encontro das mãos.", alt:["peck_deck"]},
  peck_deck:          {nome:"Voador (peck deck)", grupo:"Peito", local:"academia", dica:"Movimento controlado, sem bater os pesos.", alt:["crossover"]},
  flexao:             {nome:"Flexão de braço", grupo:"Peito", local:"casa", dica:"Corpo em prancha do começo ao fim. Se precisar, apoia os joelhos.", alt:["supino_halter"]},

  puxada_frente:      {nome:"Puxada frente", grupo:"Costas", local:"academia", dica:"Puxa com os cotovelos em direção ao bolso da calça. Peito pra cima.", alt:["puxada_neutra","barra_fixa"]},
  puxada_neutra:      {nome:"Puxada com pegada neutra", grupo:"Costas", local:"academia", dica:"Triângulo na polia, desce até o queixo passar a pegada.", alt:["puxada_frente"]},
  remada_baixa:       {nome:"Remada baixa", grupo:"Costas", local:"academia", dica:"Coluna neutra, puxa até a barriga e segura 1 segundo.", alt:["remada_halter","remada_maquina"]},
  remada_halter:      {nome:"Remada unilateral com halter", grupo:"Costas", local:"academia", dica:"Joelho e mão no banco, puxa o halter em direção ao quadril.", alt:["remada_baixa"]},
  remada_maquina:     {nome:"Remada articulada", grupo:"Costas", local:"academia", dica:"Peito apoiado, sem jogar o tronco.", alt:["remada_baixa"]},
  barra_fixa:         {nome:"Barra fixa", grupo:"Costas", local:"livre", dica:"Começa com o corpo estendido. Se não sair, usa o elástico de apoio.", alt:["puxada_frente"]},
  remada_elastico:    {nome:"Remada com elástico", grupo:"Costas", local:"casa", dica:"Prende o elástico na porta, puxa até a costela.", alt:["remada_halter"]},

  desenvolvimento:    {nome:"Desenvolvimento com halteres", grupo:"Ombro", local:"academia", dica:"Sentado, sobe os halteres sem travar o cotovelo lá em cima.", alt:["desenv_maquina"]},
  desenv_maquina:     {nome:"Desenvolvimento na máquina", grupo:"Ombro", local:"academia", dica:"Banco na altura em que a pegada fica na linha da orelha.", alt:["desenvolvimento"]},
  elevacao_lateral:   {nome:"Elevação lateral", grupo:"Ombro", local:"academia", dica:"Sobe até a linha do ombro, cotovelo levemente dobrado. Peso leve, execução limpa.", alt:["lateral_polia","lateral_elastico"]},
  lateral_polia:      {nome:"Elevação lateral na polia", grupo:"Ombro", local:"academia", dica:"Polia baixa, cabo passando pela frente do corpo.", alt:["elevacao_lateral"]},
  lateral_elastico:   {nome:"Elevação lateral com elástico", grupo:"Ombro", local:"casa", dica:"Pisa no elástico e sobe até a linha do ombro.", alt:["elevacao_lateral"]},
  face_pull:          {nome:"Face pull", grupo:"Ombro", local:"academia", dica:"Corda na altura do rosto, puxa abrindo as mãos. Ótimo pra saúde do ombro.", alt:["crucifixo_inv"]},
  crucifixo_inv:      {nome:"Crucifixo invertido", grupo:"Ombro", local:"academia", dica:"Tronco inclinado, abre os braços levando as escápulas pra trás.", alt:["face_pull"]},

  rosca_direta:       {nome:"Rosca direta com barra W", grupo:"Bíceps", local:"academia", dica:"Cotovelo parado ao lado do corpo. Sem balançar o tronco.", alt:["rosca_alternada","rosca_martelo"]},
  rosca_alternada:    {nome:"Rosca alternada", grupo:"Bíceps", local:"academia", dica:"Gira o punho na subida, desce devagar.", alt:["rosca_direta"]},
  rosca_martelo:      {nome:"Rosca martelo", grupo:"Bíceps", local:"academia", dica:"Pegada neutra, como se segurasse um martelo.", alt:["rosca_alternada"]},
  triceps_corda:      {nome:"Tríceps na corda", grupo:"Tríceps", local:"academia", dica:"Cotovelos colados no corpo, abre a corda no final.", alt:["triceps_barra","triceps_frances"]},
  triceps_barra:      {nome:"Tríceps na polia com barra", grupo:"Tríceps", local:"academia", dica:"Só o antebraço se mexe.", alt:["triceps_corda"]},
  triceps_frances:    {nome:"Tríceps francês com halter", grupo:"Tríceps", local:"academia", dica:"Cotovelos apontando pro teto, desce o halter atrás da cabeça.", alt:["triceps_corda"]},
  mergulho_banco:     {nome:"Mergulho no banco", grupo:"Tríceps", local:"casa", dica:"Mãos na beira de uma cadeira firme, desce até 90° no cotovelo.", alt:["triceps_corda"]},

  agachamento:        {nome:"Agachamento livre", grupo:"Pernas", local:"academia", dica:"Pés na largura do ombro, joelho acompanha a ponta do pé. Desce até onde a coluna fica neutra.", alt:["agach_smith","leg_press","agach_goblet"]},
  agach_smith:        {nome:"Agachamento no smith", grupo:"Pernas", local:"academia", dica:"Pés um pouco à frente da barra.", alt:["agachamento","leg_press"]},
  agach_goblet:       {nome:"Agachamento goblet", grupo:"Pernas", local:"academia", dica:"Halter colado no peito, cotovelos por dentro dos joelhos.", alt:["agachamento"]},
  leg_press:          {nome:"Leg press 45°", grupo:"Pernas", local:"academia", dica:"Lombar sempre encostada. Não trava o joelho em cima.", alt:["agach_smith","hack"]},
  hack:               {nome:"Agachamento hack", grupo:"Pernas", local:"academia", dica:"Costas inteiras na almofada, desce controlado.", alt:["leg_press"]},
  extensora:          {nome:"Cadeira extensora", grupo:"Pernas", local:"academia", dica:"Segura 1 segundo lá em cima e desce em 3.", alt:["afundo"]},
  afundo:             {nome:"Afundo com halteres", grupo:"Pernas", local:"academia", dica:"Passo longo, tronco reto, joelho de trás quase encosta no chão.", alt:["bulgaro","afundo_livre"]},
  bulgaro:            {nome:"Agachamento búlgaro", grupo:"Pernas", local:"academia", dica:"Pé de trás no banco. O peso fica na perna da frente.", alt:["afundo"]},
  mesa_flexora:       {nome:"Mesa flexora", grupo:"Posterior", local:"academia", dica:"Quadril colado no banco o tempo todo.", alt:["flexora_sentada","stiff"]},
  flexora_sentada:    {nome:"Cadeira flexora", grupo:"Posterior", local:"academia", dica:"Trava bem a coxa no apoio.", alt:["mesa_flexora"]},
  stiff:              {nome:"Stiff com halteres", grupo:"Posterior", local:"academia", dica:"Joelho levemente dobrado, leva o quadril pra trás. Sente o alongamento atrás da coxa.", alt:["mesa_flexora"]},
  elevacao_pelvica:   {nome:"Elevação pélvica", grupo:"Glúteo", local:"academia", dica:"Costas no banco, sobe o quadril e contrai o glúteo 1 segundo.", alt:["ponte_gluteo","gluteo_maquina"]},
  gluteo_maquina:     {nome:"Glúteo na máquina (coice)", grupo:"Glúteo", local:"academia", dica:"Empurra com o calcanhar, sem arquear a lombar.", alt:["elevacao_pelvica"]},
  abdutora:           {nome:"Cadeira abdutora", grupo:"Glúteo", local:"academia", dica:"Tronco levemente inclinado à frente pega mais glúteo.", alt:["abdutor_elastico"]},
  panturrilha:        {nome:"Panturrilha em pé", grupo:"Panturrilha", local:"academia", dica:"Amplitude total: desce bem e sobe na ponta.", alt:["panturrilha_sentado"]},
  panturrilha_sentado:{nome:"Panturrilha sentado", grupo:"Panturrilha", local:"academia", dica:"Pausa de 1 segundo embaixo.", alt:["panturrilha"]},

  agach_livre:        {nome:"Agachamento sem peso", grupo:"Pernas", local:"casa", dica:"Ritmo constante, desce bem.", alt:["agach_goblet"]},
  afundo_livre:       {nome:"Afundo alternado sem peso", grupo:"Pernas", local:"casa", dica:"Alterna as pernas, tronco reto.", alt:["afundo"]},
  ponte_gluteo:       {nome:"Ponte de glúteo no chão", grupo:"Glúteo", local:"casa", dica:"Deitado, sobe o quadril e segura em cima.", alt:["elevacao_pelvica"]},
  abdutor_elastico:   {nome:"Abdução com miniband", grupo:"Glúteo", local:"casa", dica:"Elástico acima do joelho, passos laterais agachado.", alt:["abdutora"]},
  polichinelo:        {nome:"Polichinelo", grupo:"Cardio", local:"casa", dica:"Ritmo que dê pra manter o tempo todo.", alt:["burpee"]},
  burpee:             {nome:"Burpee", grupo:"Cardio", local:"livre", dica:"Pode tirar a flexão se estiver pesado.", alt:["polichinelo"]},
  corrida_leve:       {nome:"Trote leve", grupo:"Cardio", local:"livre", dica:"Dá pra conversar correndo.", alt:["polichinelo"]},
  tiros:              {nome:"Tiros: 1' forte + 1' leve", grupo:"Cardio", local:"livre", dica:"O forte é forte de verdade: 8 de 10 de esforço.", alt:["burpee"]},
  esteira:            {nome:"Esteira inclinada", grupo:"Cardio", local:"academia", dica:"Inclinação 8–10%, caminhada rápida sem segurar no apoio.", alt:["bike"]},
  bike:               {nome:"Bicicleta ergométrica", grupo:"Cardio", local:"academia", dica:"Carga moderada, cadência constante.", alt:["esteira"]},

  prancha:            {nome:"Prancha", grupo:"Core", local:"casa", dica:"Glúteo contraído, não deixa o quadril cair.", alt:["dead_bug"]},
  dead_bug:           {nome:"Dead bug", grupo:"Core", local:"casa", dica:"Lombar colada no chão enquanto estica braço e perna opostos.", alt:["prancha"]},
  abd_infra:          {nome:"Abdominal infra", grupo:"Core", local:"casa", dica:"Sobe o quadril do chão, sem embalo.", alt:["dead_bug"]}
};

/* exercício do treino: [id, séries, reps, descanso (s), carga sugerida (kg) ou null, observação] */
const e = (id, series, reps, desc, carga, obs) => ({id, series, reps, desc, carga: carga ?? null, obs: obs || ""});

const T_MARINA = [
  {letra:"A", nome:"Inferior · quadríceps", local:"academia", exs:[
    e("agachamento",4,"8–10",90,40,"Aquecimento: 2 séries leves antes."),
    e("leg_press",3,"12",90,120),
    e("afundo",3,"10 cada",75,10,"Carga em cada mão."),
    e("extensora",3,"12–15",60,35),
    e("panturrilha",4,"15",45,30),
    e("prancha",3,"40s",45,null)]},
  {letra:"B", nome:"Superior · peito, costas e braços", local:"academia", exs:[
    e("supino_inclinado",4,"10",90,14,"Carga em cada mão."),
    e("puxada_frente",4,"10",90,40),
    e("remada_baixa",3,"12",75,35),
    e("elevacao_lateral",3,"15",45,6,"Ombro direito: para se doer. Se doer, troca pela polia."),
    e("face_pull",3,"15",45,15),
    e("triceps_corda",3,"12",45,20),
    e("rosca_direta",3,"12",45,16)]},
  {letra:"C", nome:"Inferior · posterior e glúteo", local:"academia", exs:[
    e("stiff",4,"10",90,14,"Carga em cada mão."),
    e("elevacao_pelvica",4,"10",90,60),
    e("mesa_flexora",3,"12",60,30),
    e("bulgaro",3,"10 cada",75,8),
    e("abdutora",3,"15",45,45),
    e("dead_bug",3,"10 cada",45,null)]}
];

const T_CASA = {letra:"Casa", nome:"Em casa · sem equipamento", local:"casa", circuito:true, exs:[
  e("polichinelo",3,"40s",20,null,"Aquecimento."),
  e("agach_livre",3,"20",20,null),
  e("flexao",3,"10",20,null,"Joelho no chão se precisar."),
  e("afundo_livre",3,"12 cada",20,null),
  e("ponte_gluteo",3,"15",20,null),
  e("prancha",3,"30s",60,null,"No fim da volta, 1 minuto de descanso.")]};

const T_LIVRE = {letra:"Rua", nome:"Ao ar livre · praça ou praia", local:"livre", circuito:false, exs:[
  e("corrida_leve",1,"10 min",60,null,"Aquecimento."),
  e("tiros",6,"1' + 1'",0,null),
  e("afundo_livre",3,"12 cada",45,null),
  e("flexao",3,"12",45,null),
  e("burpee",3,"10",60,null)]};

const MODELOS = [
  {id:"hiper_abc", nome:"Hipertrofia ABC", desc:"3 a 5x por semana · intermediário", treinos: T_MARINA},
  {id:"fullbody", nome:"Emagrecimento · full body", desc:"3x por semana · com cardio no fim", treinos:[
    {letra:"A", nome:"Full body 1", local:"academia", exs:[
      e("agach_goblet",3,"12",60,16), e("supino_maquina",3,"12",60,30), e("puxada_frente",3,"12",60,35),
      e("stiff",3,"12",60,12), e("elevacao_lateral",3,"15",45,5), e("esteira",1,"15 min",0,null,"Inclinação 8%.")]},
    {letra:"B", nome:"Full body 2", local:"academia", exs:[
      e("leg_press",3,"15",60,100), e("remada_baixa",3,"12",60,30), e("supino_halter",3,"12",60,12),
      e("elevacao_pelvica",3,"12",60,40), e("prancha",3,"30s",45,null), e("bike",1,"15 min",0,null)]}]},
  {id:"iniciante", nome:"Iniciante · adaptação", desc:"4 semanas · máquinas e técnica", treinos:[
    {letra:"A", nome:"Adaptação A", local:"academia", exs:[
      e("leg_press",2,"15",60,60), e("supino_maquina",2,"15",60,20), e("puxada_frente",2,"15",60,25),
      e("extensora",2,"15",45,20), e("mesa_flexora",2,"15",45,15), e("prancha",2,"20s",45,null)]},
    {letra:"B", nome:"Adaptação B", local:"academia", exs:[
      e("hack",2,"15",60,20), e("remada_maquina",2,"15",60,20), e("desenv_maquina",2,"15",60,10),
      e("abdutora",2,"15",45,25), e("triceps_corda",2,"15",45,10), e("rosca_alternada",2,"15",45,5)]}]},
  {id:"casa", nome:"Em casa · sem equipamento", desc:"Circuito de 25 minutos", treinos:[T_CASA]}
];

/* alunos fictícios. ult: dias desde o último treino · sem/meta: treinos na semana · ck: dias desde o último check-in
   venc: dias até o vencimento (negativo = atrasado) · desde: meses de consultoria */
const A = (id, nome, idade, tipo, objetivo, valor, venc, ult, sem, meta, ck, peso0, peso, modelo, desde, extra) =>
  Object.assign({id, nome, idade, tipo, objetivo, valor, venc, ult, sem, meta, ck, peso0, peso, modelo, desde, dor:null, restricao:"", nota:""}, extra||{});

const ALUNOS = [
  A("marina","Marina Costa",29,"Online","Hipertrofia e definição",250,6,1,2,4,7,66.8,64.9,"hiper_abc",8,
    {restricao:"Dor leve no ombro direito (2025). Nada de desenvolvimento atrás da nuca.", nota:"Treina às 6h antes do trabalho. Responde melhor a áudio."}),
  A("pedro","Pedro Almeida",34,"Presencial","Ganhar massa",800,12,0,3,3,4,72.0,75.4,"hiper_abc",14),
  A("juliana","Juliana Rocha",41,"Online","Emagrecer 8 kg",250,3,2,2,3,6,84.0,79.1,"fullbody",5,{nota:"Viaja muito a trabalho: usar treino em casa."}),
  A("rafael","Rafael Souza",27,"Híbrido","Força e performance no jiu-jítsu",450,18,1,3,4,2,81.0,82.2,"hiper_abc",10),
  A("camila","Camila Ferreira",31,"Online","Glúteo e pernas",250,21,0,4,4,1,58.5,59.8,"hiper_abc",6),
  A("bruno","Bruno Lima",38,"Online","Emagrecer",250,9,9,0,3,16,98.0,94.6,"fullbody",4,{nota:"Sumiu depois das férias."}),
  A("fernanda","Fernanda Dias",45,"Presencial","Saúde e postura",800,15,1,2,2,5,63.0,61.7,"iniciante",3,{restricao:"Hérnia de disco L4-L5 controlada. Sem carga axial pesada."}),
  A("lucas","Lucas Martins",22,"Online","Hipertrofia",200,25,6,0,4,9,68.0,70.5,"hiper_abc",7,{nota:"Época de prova na faculdade."}),
  A("patricia","Patrícia Gomes",52,"Online","Emagrecer e ganhar disposição",250,1,1,3,3,3,79.5,74.0,"fullbody",9),
  A("thiago","Thiago Ribeiro",30,"Online","Hipertrofia",250,-3,2,2,4,6,77.0,79.0,"hiper_abc",11),
  A("aline","Aline Barbosa",36,"Híbrido","Voltar a treinar depois da gestação",450,2,0,3,3,1,70.0,67.2,"iniciante",2,{restricao:"Pós-parto (8 meses). Liberada pela médica; cuidado com diástase."}),
  A("gustavo","Gustavo Pereira",43,"Online","Emagrecer e baixar a pressão",250,14,3,1,3,8,104.0,99.3,"fullbody",6,{restricao:"Hipertenso, toma remédio. Evitar apneia (prender a respiração)."}),
  A("beatriz","Beatriz Cardoso",25,"Online","Definição pro casamento",250,28,0,4,5,2,61.0,58.6,"hiper_abc",4,{nota:"Casamento em março."}),
  A("diego","Diego Nunes",33,"Online","Hipertrofia",250,11,2,2,4,1,74.0,76.1,"hiper_abc",8,{dor:"Lombar travou no levantamento terra."}),
  A("larissa","Larissa Teixeira",28,"Online","Condicionamento",200,19,4,1,3,15,64.0,63.2,"fullbody",3),
  A("ricardo","Ricardo Moura",47,"Presencial","Saúde e força",800,-1,12,0,2,20,88.0,86.5,"iniciante",12,{nota:"Cirurgia no joelho em agosto; liberado pelo ortopedista."}),
  A("vanessa","Vanessa Pinto",39,"Online","Emagrecer",250,7,1,3,4,4,76.0,71.8,"fullbody",7),
  A("andre","André Castro",29,"Online","Hipertrofia",250,23,2,3,5,5,80.0,83.4,"hiper_abc",15),
  A("carla","Carla Mendes",57,"Presencial","Osteopenia: fortalecer ossos",800,5,1,2,2,3,60.0,60.4,"iniciante",9,{restricao:"Osteopenia. Priorizar força com carga progressiva e equilíbrio."}),
  A("felipe","Felipe Araújo",24,"Online","Hipertrofia",200,16,5,1,4,10,66.0,68.9,"hiper_abc",2,{dor:"Dor no punho no supino."})
];

/* hábitos combinados com o Jorge (não é dieta: dieta é com nutricionista) */
const HABITOS = [
  {id:"agua", nome:"Água", meta:"2,5 L", icone:"💧"},
  {id:"prot", nome:"Proteína em todas as refeições", meta:"4x", icone:"🍳"},
  {id:"passos", nome:"Passos", meta:"8 mil", icone:"👟"},
  {id:"sono", nome:"Sono", meta:"7 h", icone:"🌙"}
];

const RECADO = "Semana de subir carga no agachamento! Se as 4 séries saírem limpas, sobe 2,5 kg na próxima. Qualquer dor no ombro, me avisa antes de continuar.";

/* dores do mercado (base da tela "Por que um app só seu") */
const DORES = [
  {dor:"O aluno abre o app e vê a marca dos outros", porque:"Nos apps de plataforma (MFIT, Tecnofit, Trainerize…), o aluno baixa o app da plataforma. Ter app com a marca do próprio personal costuma ser um plano à parte, mais caro.", aqui:"Nome, cor e ícone do Jorge na tela do celular do aluno."},
  {dor:"Esquece a carga da última vez", porque:"Sem histórico à mão, o aluno repete carga, perde progressão e anota no bloco de notas ou nem anota.", aqui:"Cada série já vem preenchida com a carga da última vez, e o app comemora o recorde."},
  {dor:"Check-in no Google Forms ou no WhatsApp", porque:"Nos fóruns do Trainerize, coaches pedem há anos um check-in dentro do app; muitos usam formulário externo e o aluno esquece o dia.", aqui:"Check-in semanal no próprio app, com lembrete, e a resposta do Jorge volta pra lá."},
  {dor:"O personal só percebe que o aluno sumiu quando ele cancela", porque:"Com 20 alunos no WhatsApp, quem para de treinar desaparece da conversa sem ninguém notar.", aqui:"O painel avisa quem está há 5 dias sem treinar, com check-in atrasado ou com dor, e já tem a mensagem pronta."},
  {dor:"Cobrança na mão e no constrangimento", porque:"Planilha, lembrete no celular, mensagem de cobrança escrita do zero todo mês.", aqui:"Lista de vencimentos e cobrança com Pix em um toque, num tom educado."},
  {dor:"Aparelho ocupado, academia lotada", porque:"O aluno improvisa a troca e às vezes troca por algo que nem trabalha o mesmo músculo.", aqui:"Botão “Trocar” com as substituições que o próprio Jorge aprovou."},
  {dor:"Não deu pra ir à academia, o treino foi pro lixo", porque:"Viagem, chuva, filho doente: o treino da academia não serve, e a semana se perde.", aqui:"Plano B pronto: treino em casa sem equipamento e treino ao ar livre."},
  {dor:"App pesado, lento e cheio de função", porque:"Avaliações de apps grandes citam travamento, lentidão e perda de dados; quanto mais função, mais o aluno se perde.", aqui:"Uma tela principal: o treino de hoje e um botão de começar."},
  {dor:"Paga por aluno, todo mês", porque:"Plataformas cobram mensalidade que cresce com o número de alunos, e os dados ficam nelas.", aqui:"Custo fixo de infraestrutura, e os dados dos alunos são do Jorge."}
];

return {MARCA, EX, T_MARINA, T_CASA, T_LIVRE, MODELOS, ALUNOS, HABITOS, RECADO, DORES};
})();
