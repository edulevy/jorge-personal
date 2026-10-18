-- =====================================================================
-- Testes das rodadas: avaliação, chat, Pix com comprovante, planos,
-- suspensão, alimentação, avisos, série a série e exclusão (LGPD).
-- Dados 100% fictícios. Tudo é desfeito no fim (rollback).
-- Se uma regra estiver furada, PARA com "FALHOU: ...".
-- =====================================================================
begin;

-- ---------- elenco ----------
-- Jorge e Carla (treinadores) · Marina e Pedro (alunos do Jorge) · Rita (aluna da Carla) · Intruso
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'jorge@teste.dev', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'carla@teste.dev', 'authenticated', 'authenticated');
insert into public.perfis (id, papel, nome) values
  ('11111111-1111-1111-1111-111111111111', 'treinador', 'Jorge'),
  ('22222222-2222-2222-2222-222222222222', 'treinador', 'Carla');
insert into public.alunos (id, treinador_id, email, nome, valor, vencimento, plano) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'marina@teste.dev', 'Marina Costa', 200, current_date + 5, 'mensal'),
  ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'pedro@teste.dev',  'Pedro Almeida', 540, current_date - 10, 'trimestral'),
  ('b0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'rita@teste.dev',   'Rita (aluna da Carla)', 300, current_date + 3, 'mensal');
insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'marina@teste.dev', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'pedro@teste.dev',  'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'rita@teste.dev',   'authenticated', 'authenticated'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'intruso@teste.dev','authenticated', 'authenticated');
insert into public.treinos (aluno_id, letra, nome) values
  ('b0000000-0000-0000-0000-000000000001', 'A', 'Superior'),
  ('b0000000-0000-0000-0000-000000000002', 'A', 'Inferior');
insert into public.sessoes (aluno_id, letra, nome, volume) values ('b0000000-0000-0000-0000-000000000002', 'A', 'Inferior', 4000);
insert into public.planos (treinador_id, id, nome, meses, valor) values
  ('11111111-1111-1111-1111-111111111111', 'mensal', 'Mensal', 1, 200),
  ('22222222-2222-2222-2222-222222222222', 'mensal', 'Mensal da Carla', 1, 300);


-- ===================== JORGE prepara tudo =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
do $$ declare n int; begin
  insert into public.avaliacoes (aluno_id, peso, altura, dobras, gordura, fotos) values
    ('b0000000-0000-0000-0000-000000000001', 64.9, 165, '{"triceps":14,"abdominal":18}', 22.4, '{"frente":"b0000000-0000-0000-0000-000000000001/av1/frente.jpg"}');
  insert into storage.objects (bucket_id, name) values ('avaliacoes', 'b0000000-0000-0000-0000-000000000001/av1/frente.jpg');
  raise notice 'OK  Jorge: registra avaliação com dobras, %% de gordura e foto';
  begin
    insert into public.avaliacoes (aluno_id, peso) values ('b0000000-0000-0000-0000-000000000003', 60);
    raise exception 'FALHOU: Jorge registrou avaliação na aluna da Carla';
  exception when insufficient_privilege then raise notice 'OK  Jorge: não registra avaliação em aluno da Carla'; end;

  insert into public.alimentacao (aluno_id, orientacoes, nutricionista, pdf) values
    ('b0000000-0000-0000-0000-000000000001', 'Proteína em toda refeição.', 'Dra. Ana Lima · CRN fictício', 'b0000000-0000-0000-0000-000000000001/plano.pdf');
  insert into storage.objects (bucket_id, name) values ('alimentacao', 'b0000000-0000-0000-0000-000000000001/plano.pdf');
  raise notice 'OK  Jorge: escreve as orientações e anexa o PDF do nutricionista';

  insert into public.mensagens (aluno_id, de, texto) values ('b0000000-0000-0000-0000-000000000001', 'treinador', 'Bom dia, Marina! Bora treinar?');
  begin
    insert into public.mensagens (aluno_id, de, texto) values ('b0000000-0000-0000-0000-000000000001', 'aluno', 'mensagem falsa da Marina');
    raise exception 'FALHOU: Jorge mandou mensagem fingindo ser a Marina';
  exception when insufficient_privilege then raise notice 'OK  Jorge: manda mensagem, mas não finge ser o aluno'; end;

  insert into public.planos (treinador_id, id, nome, meses, valor, ativo) values
    ('11111111-1111-1111-1111-111111111111', 'trimestral', 'Trimestral', 3, 540, true),
    ('11111111-1111-1111-1111-111111111111', 'semestral',  'Semestral',  6, 1020, false);
  raise notice 'OK  Jorge: liga o trimestral e deixa o semestral desligado';

  update public.treinos set exercicios =
    '[{"id":"supino","series":3,"reps":"10","carga":40,"desc":90,"cad":"3-0-1","int":"RIR 2","met":"Pirâmide","plano":[{"reps":"12","kg":35},{"reps":"10","kg":40},{"reps":"8","kg":45}]}]'
   where aluno_id = 'b0000000-0000-0000-0000-000000000001';
  begin
    update public.treinos set exercicios = '{"isso":"não é lista"}' where aluno_id = 'b0000000-0000-0000-0000-000000000001';
    raise exception 'FALHOU: o banco aceitou treino que não é lista de exercícios';
  exception when check_violation then raise notice 'OK  Jorge: salva o treino série a série (pirâmide 35/40/45 kg); formato errado é recusado'; end;

  update public.alunos set suspenso_em = current_date where id = 'b0000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: Jorge não conseguiu suspender o Pedro'; end if;
  raise notice 'OK  Jorge: suspende o Pedro (mensalidade atrasada)';
end $$;
reset role;


-- ===================== MARINA (aluna em dia) =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
do $$ declare n int; begin
  -- avaliação: só o Jorge vê
  if (select count(*) from public.avaliacoes) <> 0 then raise exception 'FALHOU: Marina vê a avaliação física'; end if;
  if (select count(*) from storage.objects where bucket_id = 'avaliacoes') <> 0 then raise exception 'FALHOU: Marina vê a foto da avaliação'; end if;
  begin
    insert into public.avaliacoes (aluno_id, peso) values ('b0000000-0000-0000-0000-000000000001', 50);
    raise exception 'FALHOU: Marina escreveu a própria avaliação';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Marina: não vê nem escreve avaliação física (nem a foto)';

  -- alimentação: lê, não edita
  if (select count(*) from public.alimentacao) <> 1 then raise exception 'FALHOU: Marina não vê a própria alimentação'; end if;
  if (select count(*) from storage.objects where bucket_id = 'alimentacao') <> 1 then raise exception 'FALHOU: Marina não abre o PDF dela'; end if;
  update public.alimentacao set orientacoes = 'Pizza liberada' where aluno_id = 'b0000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Marina editou as orientações do Jorge'; end if;
  raise notice 'OK  Marina: lê as orientações e o PDF, não edita';

  -- chat
  if (select count(*) from public.mensagens) <> 1 then raise exception 'FALHOU: Marina não vê a conversa dela'; end if;
  insert into public.mensagens (aluno_id, de, texto) values ('b0000000-0000-0000-0000-000000000001', 'aluno', 'Bora! Ombro tá ok.');
  begin
    insert into public.mensagens (aluno_id, de, texto) values ('b0000000-0000-0000-0000-000000000001', 'treinador', 'Pode pular o treino');
    raise exception 'FALHOU: Marina mandou mensagem fingindo ser o Jorge';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.mensagens (aluno_id, de, texto) values ('b0000000-0000-0000-0000-000000000002', 'aluno', 'oi Pedro');
    raise exception 'FALHOU: Marina escreveu na conversa do Pedro';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Marina: conversa com o Jorge; não finge ser ele nem escreve na conversa do Pedro';

  update public.mensagens set lida_em = now() where de = 'treinador';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: Marina não conseguiu marcar como lida'; end if;
  begin
    update public.mensagens set texto = 'mensagem alterada' where de = 'treinador';
    raise exception 'FALHOU: Marina alterou o texto do Jorge';
  exception when insufficient_privilege then null; end;
  delete from public.mensagens;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Marina apagou mensagens'; end if;
  raise notice 'OK  Marina: marca como lida, mas não altera nem apaga mensagem';

  -- planos
  if (select count(*) from public.planos) <> 2 or exists (select 1 from public.planos where id = 'semestral')
    then raise exception 'FALHOU: Marina deveria ver só os planos ligados do Jorge (mensal e trimestral)'; end if;
  update public.planos set valor = 1;
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Marina mudou o preço do plano'; end if;
  raise notice 'OK  Marina: vê só os planos ligados do Jorge e não muda preço';

  -- série a série
  if (select exercicios->0->'plano'->2->>'kg' from public.treinos) <> '45' then raise exception 'FALHOU: Marina não vê a carga da 3ª série'; end if;
  raise notice 'OK  Marina: vê o treino série a série (3ª série: 45 kg)';

  -- comprovante de Pix
  insert into public.comprovantes (id, aluno_id, valor, arquivo) values
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 200, 'b0000000-0000-0000-0000-000000000001/pix-outubro.jpg');
  insert into storage.objects (bucket_id, name) values ('comprovantes', 'b0000000-0000-0000-0000-000000000001/pix-outubro.jpg');
  raise notice 'OK  Marina: manda o comprovante do Pix (com a imagem)';
  begin
    insert into public.comprovantes (aluno_id, valor, status) values ('b0000000-0000-0000-0000-000000000001', 200, 'confirmado');
    raise exception 'FALHOU: Marina mandou comprovante já confirmado';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.comprovantes (aluno_id, valor, arquivo) values ('b0000000-0000-0000-0000-000000000001', 200, 'b0000000-0000-0000-0000-000000000002/x.jpg');
    raise exception 'FALHOU: Marina apontou o comprovante pra pasta do Pedro';
  exception when insufficient_privilege then null; end;
  begin
    insert into storage.objects (bucket_id, name) values ('comprovantes', 'b0000000-0000-0000-0000-000000000002/x.jpg');
    raise exception 'FALHOU: Marina pôs arquivo na pasta de comprovantes do Pedro';
  exception when insufficient_privilege then null; end;
  begin
    perform public.confirmar_comprovante('c0000000-0000-0000-0000-000000000001');
    raise exception 'FALHOU: Marina confirmou o próprio pagamento';
  exception when insufficient_privilege then null; end;
  update public.comprovantes set status = 'confirmado';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Marina mudou o status do comprovante'; end if;
  raise notice 'OK  Marina: não manda "já confirmado", não usa a pasta do Pedro e não confirma o próprio pagamento';

  -- avisos
  insert into public.avisos (aluno_id, hora, novo) values ('b0000000-0000-0000-0000-000000000001', '05:30', false);
  begin
    insert into public.avisos (aluno_id) values ('b0000000-0000-0000-0000-000000000002');
    raise exception 'FALHOU: Marina mexeu nos avisos do Pedro';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Marina: escolhe os próprios avisos (05:30), não os do Pedro';

  -- exclusão em nome de outro
  begin
    insert into public.pedidos_exclusao (aluno_id) values ('b0000000-0000-0000-0000-000000000002');
    raise exception 'FALHOU: Marina pediu exclusão dos dados do Pedro';
  exception when insufficient_privilege then raise notice 'OK  Marina: não pede exclusão dos dados de outro aluno'; end;
end $$;
reset role;


-- ===================== PEDRO (suspenso) =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002"}', true);
do $$ declare n int; begin
  if (select count(*) from public.treinos) <> 0 then raise exception 'FALHOU: Pedro suspenso vê o treino'; end if;
  begin
    insert into public.sessoes (aluno_id, letra, nome) values ('b0000000-0000-0000-0000-000000000002', 'A', 'Treino escondido');
    raise exception 'FALHOU: Pedro suspenso registrou treino';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Pedro suspenso: não vê o treino nem registra treino';

  if (select count(*) from public.alunos) <> 1 then raise exception 'FALHOU: Pedro suspenso não vê a própria ficha'; end if;
  insert into public.mensagens (aluno_id, de, texto) values ('b0000000-0000-0000-0000-000000000002', 'aluno', 'Jorge, vou pagar hoje');
  insert into public.comprovantes (id, aluno_id, valor, arquivo) values
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 540, 'b0000000-0000-0000-0000-000000000002/pix.jpg');
  insert into storage.objects (bucket_id, name) values ('comprovantes', 'b0000000-0000-0000-0000-000000000002/pix.jpg');
  raise notice 'OK  Pedro suspenso: vê a ficha, fala no chat e manda comprovante pra regularizar';

  if (select count(*) from public.mensagens) <> 1 then raise exception 'FALHOU: Pedro vê a conversa da Marina'; end if;
  if (select count(*) from public.comprovantes) <> 1 then raise exception 'FALHOU: Pedro vê comprovante da Marina'; end if;
  if (select count(*) from public.avisos) <> 0 then raise exception 'FALHOU: Pedro vê os avisos da Marina'; end if;
  if (select count(*) from storage.objects where bucket_id = 'comprovantes') <> 1 then raise exception 'FALHOU: Pedro vê arquivo de comprovante da Marina'; end if;
  raise notice 'OK  Pedro: não vê conversa, comprovante nem avisos da Marina';

  update public.alunos set suspenso_em = null where id = 'b0000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Pedro tirou a própria suspensão'; end if;
  raise notice 'OK  Pedro: não tira a própria suspensão';
end $$;
reset role;


-- ===================== CARLA, RITA E INTRUSO =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
do $$ begin
  if (select count(*) from public.avaliacoes) + (select count(*) from public.mensagens) + (select count(*) from public.comprovantes)
     + (select count(*) from public.alimentacao) + (select count(*) from public.avisos) <> 0
    then raise exception 'FALHOU: Carla vê dados dos alunos do Jorge'; end if;
  if exists (select 1 from public.planos where treinador_id = '11111111-1111-1111-1111-111111111111') then raise exception 'FALHOU: Carla vê os planos do Jorge'; end if;
  if (select count(*) from storage.objects where bucket_id in ('avaliacoes', 'comprovantes', 'alimentacao')) <> 0 then raise exception 'FALHOU: Carla vê arquivos dos alunos do Jorge'; end if;
  begin
    perform public.confirmar_comprovante('c0000000-0000-0000-0000-000000000001');
    raise exception 'FALHOU: Carla confirmou pagamento de aluna do Jorge';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Carla: não vê avaliação, chat, comprovante, alimentação, avisos, planos nem arquivos dos alunos do Jorge, e não confirma pagamento deles';
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003"}', true);
do $$ begin
  if exists (select 1 from public.planos where treinador_id = '11111111-1111-1111-1111-111111111111') then raise exception 'FALHOU: Rita vê os planos do Jorge'; end if;
  if (select count(*) from public.planos) <> 1 then raise exception 'FALHOU: Rita não vê o plano da Carla'; end if;
  raise notice 'OK  Rita (aluna da Carla): vê o plano da Carla, não os do Jorge';
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff"}', true);
do $$ begin
  if (select count(*) from public.avaliacoes) + (select count(*) from public.mensagens) + (select count(*) from public.comprovantes)
     + (select count(*) from public.planos) + (select count(*) from public.alimentacao) + (select count(*) from public.pedidos_exclusao)
     + (select count(*) from storage.objects) <> 0
    then raise exception 'FALHOU: intruso vê alguma coisa'; end if;
  begin
    insert into public.mensagens (aluno_id, de, texto) values ('b0000000-0000-0000-0000-000000000001', 'aluno', 'spam');
    raise exception 'FALHOU: intruso mandou mensagem pra Marina';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  intruso: vê zero de tudo e não manda mensagem';
end $$;
reset role;

set local role anon;
select set_config('request.jwt.claims', '', true);
do $$ begin
  if public.ping() <> 'ok' then raise exception 'FALHOU: o cutucão não respondeu'; end if;
  begin
    perform 1 from public.mensagens;
    raise exception 'FALHOU: visitante sem login leu o chat';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  sem login: o cutucão responde "ok", mas o chat continua fechado';
end $$;
reset role;


-- ===================== JORGE confere os pagamentos =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
do $$ declare v date; begin
  if (select count(*) from public.comprovantes where status = 'pendente') <> 2 then raise exception 'FALHOU: Jorge deveria ver 2 comprovantes pendentes'; end if;
  if (select count(*) from storage.objects where bucket_id = 'comprovantes') <> 2 then raise exception 'FALHOU: Jorge não vê as imagens dos comprovantes'; end if;
  if (select count(*) from public.avisos) <> 1 then raise exception 'FALHOU: Jorge não vê os avisos da Marina'; end if;

  v := public.confirmar_comprovante('c0000000-0000-0000-0000-000000000001');
  if v <> current_date + 35 then raise exception 'FALHOU: vencimento da Marina deveria andar 30 dias (foi pra %)', v; end if;
  if (select count(*) from public.pagamentos where aluno_id = 'b0000000-0000-0000-0000-000000000001') <> 1 then raise exception 'FALHOU: pagamento da Marina não registrado'; end if;
  raise notice 'OK  Jorge: confirma o Pix da Marina (entra o pagamento e o vencimento anda 30 dias)';

  begin
    perform public.confirmar_comprovante('c0000000-0000-0000-0000-000000000001');
    raise exception 'FALHOU: o mesmo comprovante foi confirmado duas vezes';
  exception when insufficient_privilege then raise notice 'OK  Jorge: o mesmo comprovante não vale duas vezes'; end;

  v := public.confirmar_comprovante('c0000000-0000-0000-0000-000000000002');
  if v <> current_date - 10 + 90 then raise exception 'FALHOU: Pedro é trimestral, o vencimento deveria andar 90 dias (foi pra %)', v; end if;
  if (select suspenso_em from public.alunos where id = 'b0000000-0000-0000-0000-000000000002') is not null then raise exception 'FALHOU: Pedro continuou suspenso depois de pagar'; end if;
  raise notice 'OK  Jorge: confirma o Pix do Pedro (trimestral: vencimento anda 90 dias e o acesso volta)';
end $$;
reset role;

-- comprovante recusado
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
insert into public.comprovantes (id, aluno_id, valor) values ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 20);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
do $$ begin
  perform public.recusar_comprovante('c0000000-0000-0000-0000-000000000003');
  if (select status from public.comprovantes where id = 'c0000000-0000-0000-0000-000000000003') <> 'recusado' then raise exception 'FALHOU: comprovante não ficou recusado'; end if;
  if (select vencimento from public.alunos where id = 'b0000000-0000-0000-0000-000000000001') <> current_date + 35 then raise exception 'FALHOU: comprovante recusado mexeu no vencimento'; end if;
  raise notice 'OK  Jorge: recusa um comprovante errado (R$ 20) e o vencimento não muda';
end $$;
reset role;


-- ===================== PEDRO depois de pagar =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002"}', true);
do $$ begin
  if (select count(*) from public.treinos) <> 1 then raise exception 'FALHOU: Pedro pagou e continua sem ver o treino'; end if;
  raise notice 'OK  Pedro: pagou, o Jorge confirmou, e o treino voltou a aparecer';

  -- e agora ele pede pra apagar os dados (LGPD)
  insert into public.pedidos_exclusao (id, aluno_id) values ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002');
  if (select nome from public.pedidos_exclusao) <> 'Pedro Almeida' then raise exception 'FALHOU: o pedido não pegou o nome da ficha'; end if;
  begin
    insert into public.pedidos_exclusao (aluno_id) values ('b0000000-0000-0000-0000-000000000002');
    raise exception 'FALHOU: Pedro abriu dois pedidos de exclusão';
  exception when unique_violation then null; end;
  raise notice 'OK  Pedro: pede a exclusão dos dados (um pedido aberto por vez)';
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
do $$ begin
  if (select count(*) from public.pedidos_exclusao) <> 0 then raise exception 'FALHOU: Marina vê o pedido de exclusão do Pedro'; end if;
  raise notice 'OK  Marina: não vê o pedido de exclusão do Pedro';
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
do $$ begin
  begin
    perform public.concluir_exclusao('e0000000-0000-0000-0000-000000000001');
    raise exception 'FALHOU: Carla apagou o aluno do Jorge';
  exception when insufficient_privilege then raise notice 'OK  Carla: não conclui a exclusão de aluno do Jorge'; end;
end $$;
reset role;


-- ===================== JORGE conclui a exclusão =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
do $$ begin
  begin
    perform public.concluir_exclusao('e0000000-0000-0000-0000-000000000001');
    raise exception 'FALHOU: apagou a ficha deixando arquivo do Pedro guardado';
  exception when insufficient_privilege then raise notice 'OK  Jorge: o banco não deixa concluir enquanto sobrar arquivo do Pedro'; end;

  delete from storage.objects where name like 'b0000000-0000-0000-0000-000000000002/%';
  perform public.concluir_exclusao('e0000000-0000-0000-0000-000000000001');
  if exists (select 1 from public.alunos where id = 'b0000000-0000-0000-0000-000000000002') then raise exception 'FALHOU: a ficha do Pedro continua lá'; end if;
  if (select concluido_em from public.pedidos_exclusao) is null then raise exception 'FALHOU: o pedido não ficou concluído'; end if;
  raise notice 'OK  Jorge: apaga os arquivos, conclui a exclusão e a ficha some (o pedido fica como prova)';
end $$;
reset role;

-- conferência sem regra nenhuma (como dono do banco): não sobrou nada do Pedro
do $$ begin
  if (select count(*) from public.sessoes where aluno_id = 'b0000000-0000-0000-0000-000000000002')
     + (select count(*) from public.mensagens where aluno_id = 'b0000000-0000-0000-0000-000000000002')
     + (select count(*) from public.comprovantes where aluno_id = 'b0000000-0000-0000-0000-000000000002')
     + (select count(*) from public.pagamentos where aluno_id = 'b0000000-0000-0000-0000-000000000002')
     + (select count(*) from public.treinos where aluno_id = 'b0000000-0000-0000-0000-000000000002')
     + (select count(*) from public.perfis where id = 'aaaaaaaa-0000-0000-0000-000000000002') <> 0
    then raise exception 'FALHOU: sobrou dado do Pedro depois da exclusão'; end if;
  if (select count(*) from public.alunos where id = 'b0000000-0000-0000-0000-000000000001') <> 1 then raise exception 'FALHOU: a exclusão do Pedro levou a Marina junto'; end if;
  raise notice 'OK  conferência: não sobrou treino, cargas, chat, pagamento nem comprovante do Pedro, e a Marina está intacta';
end $$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002"}', true);
do $$ begin
  if (select count(*) from public.alunos) <> 0 then raise exception 'FALHOU: Pedro ainda vê ficha depois de apagado'; end if;
  if (select count(*) from public.pedidos_exclusao where concluido_em is not null) <> 1 then raise exception 'FALHOU: Pedro não vê que o pedido foi concluído'; end if;
  raise notice 'OK  Pedro: não vê mais nada, só o aviso de que o pedido foi concluído';
end $$;
reset role;

select 'TODOS OS TESTES DAS RODADAS PASSARAM' as resultado;
rollback;
