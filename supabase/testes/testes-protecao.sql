-- =====================================================================
-- Testes da proteção (RLS). Dados 100% fictícios.
-- Roda no SQL Editor do Supabase (ou no banco de teste local).
-- Tudo acontece dentro de uma transação que é desfeita no fim (rollback):
-- não sobra nada no banco.
-- Se alguma regra estiver furada, o script PARA com "FALHOU: ...".
-- Se chegar no fim, aparece "TODOS OS TESTES PASSARAM".
-- =====================================================================
begin;

-- ---------- elenco ----------
-- Jorge (treinador) · Carla (outra treinadora) · Marina e Pedro (alunos do Jorge)
-- Rita (aluna da Carla) · Intruso (criou conta sem convite) · João (já tinha conta)
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'jorge@teste.dev', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'carla@teste.dev', 'authenticated', 'authenticated');
insert into public.perfis (id, papel, nome) values
  ('11111111-1111-1111-1111-111111111111', 'treinador', 'Jorge'),
  ('22222222-2222-2222-2222-222222222222', 'treinador', 'Carla');

insert into public.alunos (id, treinador_id, email, nome, valor, vencimento, restricao) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'marina@teste.dev', 'Marina Costa', 250, current_date + 6, 'Dor leve no ombro direito'),
  ('b0000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'pedro@teste.dev',  'Pedro Almeida', 800, current_date + 12, ''),
  ('b0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'rita@teste.dev',   'Rita (aluna da Carla)', 300, current_date + 3, 'Hérnia L5');

-- os alunos aceitam o convite (a conta nasce e o gatilho liga à ficha)
insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'MARINA@teste.dev', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000002', 'pedro@teste.dev',  'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'rita@teste.dev',   'authenticated', 'authenticated'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'intruso@teste.dev','authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000004', 'joao@teste.dev',   'authenticated', 'authenticated');

insert into public.notas_treinador (aluno_id, texto) values
  ('b0000000-0000-0000-0000-000000000001', 'Responde melhor a áudio.'),
  ('b0000000-0000-0000-0000-000000000002', 'Sumiu depois das férias.');
insert into public.treinos (aluno_id, letra, nome, exercicios) values
  ('b0000000-0000-0000-0000-000000000001', 'A', 'Inferior', '[{"id":"agachamento","series":4,"reps":"8–10","desc":90,"carga":40}]'),
  ('b0000000-0000-0000-0000-000000000002', 'A', 'Superior', '[]');
insert into public.sessoes (aluno_id, letra, nome, volume) values
  ('b0000000-0000-0000-0000-000000000001', 'A', 'Inferior', 3200),
  ('b0000000-0000-0000-0000-000000000002', 'A', 'Superior', 5000),
  ('b0000000-0000-0000-0000-000000000003', 'A', 'Treino da Rita', 1000);
insert into public.checkins (id, aluno_id, peso, comentario) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 64.9, 'Ombro melhorou'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 75.4, '');
insert into public.recados (treinador_id, texto) values
  ('11111111-1111-1111-1111-111111111111', 'Semana de subir carga!'),
  ('22222222-2222-2222-2222-222222222222', 'Recado da Carla');
insert into public.exercicios (id, treinador_id, nome) values
  ('agachamento', null, 'Agachamento livre'),
  ('x_jorge', '11111111-1111-1111-1111-111111111111', 'Exercício do Jorge'),
  ('x_carla', '22222222-2222-2222-2222-222222222222', 'Exercício da Carla');
insert into storage.objects (bucket_id, name) values
  ('fotos', 'b0000000-0000-0000-0000-000000000001/2026-10-01.jpg'),
  ('fotos', 'b0000000-0000-0000-0000-000000000003/2026-10-01.jpg');


-- ---------- 0. convites ----------
do $$ begin
  if (select usuario_id from public.alunos where email = 'marina@teste.dev') <> 'aaaaaaaa-0000-0000-0000-000000000001'
    then raise exception 'FALHOU: a conta da Marina não se ligou à ficha (e-mail com maiúscula)'; end if;
  if exists (select 1 from public.perfis where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff')
    then raise exception 'FALHOU: o intruso ganhou perfil sem convite'; end if;
  raise notice 'OK  convites: conta com convite se liga sozinha; sem convite fica sem perfil';
end $$;

-- o Jorge cadastra a ficha de quem já tinha conta (João) → liga sozinho
insert into public.alunos (id, treinador_id, email, nome) values
  ('b0000000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'joao@teste.dev', 'João');
do $$ begin
  if (select usuario_id from public.alunos where id = 'b0000000-0000-0000-0000-000000000004') is distinct from 'aaaaaaaa-0000-0000-0000-000000000004'
    then raise exception 'FALHOU: ficha nova não se ligou à conta que já existia'; end if;
  raise notice 'OK  convites: ficha nova se liga à conta que já existia';
end $$;


-- ===================== QUEM NÃO ESTÁ LOGADO =====================
set local role anon;
select set_config('request.jwt.claims', '', true);
do $$ begin
  begin
    perform 1 from public.alunos;
    raise exception 'FALHOU: visitante sem login conseguiu ler alunos';
  exception when insufficient_privilege then
    raise notice 'OK  sem login: não lê nada (acesso negado)';
  end;
end $$;
reset role;


-- ===================== INTRUSO (conta sem convite) =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"ffffffff-ffff-ffff-ffff-ffffffffffff"}', true);
do $$ begin
  if (select count(*) from public.alunos) <> 0       then raise exception 'FALHOU: intruso vê alunos'; end if;
  if (select count(*) from public.sessoes) <> 0      then raise exception 'FALHOU: intruso vê sessões'; end if;
  if (select count(*) from public.checkins) <> 0     then raise exception 'FALHOU: intruso vê check-ins'; end if;
  if (select count(*) from public.recados) <> 0      then raise exception 'FALHOU: intruso vê recados'; end if;
  if (select count(*) from storage.objects) <> 0     then raise exception 'FALHOU: intruso vê fotos'; end if;
  raise notice 'OK  intruso: vê 0 alunos, 0 treinos, 0 check-ins, 0 recados, 0 fotos';
  begin
    insert into public.alunos (treinador_id, email, nome)
      values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'x@x.com', 'Aluno falso');
    raise exception 'FALHOU: intruso conseguiu se cadastrar como treinador';
  exception when insufficient_privilege then
    raise notice 'OK  intruso: não consegue virar "treinador" cadastrando aluno';
  end;
  begin
    insert into public.perfis (id, papel, nome) values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'treinador', 'Eu');
    raise exception 'FALHOU: intruso criou o próprio perfil de treinador';
  exception when insufficient_privilege then
    raise notice 'OK  intruso: não consegue criar perfil de treinador';
  end;
end $$;
reset role;


-- ===================== MARINA (aluna do Jorge) =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
do $$
declare n int;
begin
  if (select count(*) from public.alunos) <> 1 then raise exception 'FALHOU: Marina vê ficha de outros alunos'; end if;
  if (select count(*) from public.sessoes) <> 1 then raise exception 'FALHOU: Marina vê treino de outros'; end if;
  if (select count(*) from public.checkins) <> 1 then raise exception 'FALHOU: Marina vê check-in de outros'; end if;
  if (select count(*) from public.treinos) <> 1 then raise exception 'FALHOU: Marina vê treino montado de outros'; end if;
  raise notice 'OK  Marina: vê só a própria ficha, os próprios treinos e check-ins';

  if (select count(*) from public.notas_treinador) <> 0 then raise exception 'FALHOU: Marina lê as anotações do Jorge'; end if;
  raise notice 'OK  Marina: não lê as anotações privadas do Jorge';

  if (select count(*) from public.recados) <> 1 or exists (select 1 from public.recados where texto = 'Recado da Carla')
    then raise exception 'FALHOU: Marina vê recado errado'; end if;
  if exists (select 1 from public.exercicios where id = 'x_carla') or not exists (select 1 from public.exercicios where id = 'x_jorge')
    then raise exception 'FALHOU: Marina vê exercícios errados'; end if;
  raise notice 'OK  Marina: lê o recado e os exercícios do Jorge, não os da Carla';

  if (select count(*) from storage.objects) <> 1 then raise exception 'FALHOU: Marina vê foto de outra pessoa'; end if;
  raise notice 'OK  Marina: vê só a própria foto';

  -- registrar o próprio treino: pode
  insert into public.sessoes (aluno_id, letra, nome) values ('b0000000-0000-0000-0000-000000000001', 'B', 'Superior');
  insert into public.checkins (aluno_id, peso) values ('b0000000-0000-0000-0000-000000000001', 64.5);
  insert into public.habitos (aluno_id, habito) values ('b0000000-0000-0000-0000-000000000001', 'agua');
  insert into storage.objects (bucket_id, name) values ('fotos', 'b0000000-0000-0000-0000-000000000001/nova.jpg');
  raise notice 'OK  Marina: registra treino, check-in, hábito e foto dela';

  -- registrar treino em nome do Pedro: não pode
  begin
    insert into public.sessoes (aluno_id, letra, nome) values ('b0000000-0000-0000-0000-000000000002', 'A', 'Falso');
    raise exception 'FALHOU: Marina registrou treino no nome do Pedro';
  exception when insufficient_privilege then raise notice 'OK  Marina: não registra treino no nome de outro aluno'; end;

  begin
    insert into storage.objects (bucket_id, name) values ('fotos', 'b0000000-0000-0000-0000-000000000002/x.jpg');
    raise exception 'FALHOU: Marina pôs foto na pasta do Pedro';
  exception when insufficient_privilege then raise notice 'OK  Marina: não põe foto na pasta de outro aluno'; end;

  begin
    insert into public.checkins (aluno_id, peso, resposta) values ('b0000000-0000-0000-0000-000000000001', 64, 'Tá ótimo (fui eu)');
    raise exception 'FALHOU: Marina respondeu o próprio check-in';
  exception when insufficient_privilege then raise notice 'OK  Marina: não escreve a resposta do Jorge'; end;

  -- mexer na própria ficha (mensalidade, vencimento): não pode
  update public.alunos set valor = 1, vencimento = current_date + 365 where id = 'b0000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Marina mudou a própria mensalidade'; end if;
  raise notice 'OK  Marina: não muda a própria mensalidade nem o vencimento';

  begin
    insert into public.pagamentos (aluno_id, valor) values ('b0000000-0000-0000-0000-000000000001', 250);
    raise exception 'FALHOU: Marina marcou a própria mensalidade como paga';
  exception when insufficient_privilege then raise notice 'OK  Marina: não marca a própria mensalidade como paga'; end;

  update public.treinos set exercicios = '[]' where aluno_id = 'b0000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Marina editou o treino montado pelo Jorge'; end if;
  raise notice 'OK  Marina: não edita o treino que o Jorge montou';

  delete from public.sessoes where aluno_id = 'b0000000-0000-0000-0000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Marina apagou treino do Pedro'; end if;
  raise notice 'OK  Marina: não apaga nada de ninguém';
end $$;
reset role;


-- ===================== JORGE (treinador) =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
do $$
declare n int;
begin
  if (select count(*) from public.alunos) <> 3 then raise exception 'FALHOU: Jorge deveria ver 3 alunos (Marina, Pedro, João), viu %', (select count(*) from public.alunos); end if;
  if exists (select 1 from public.alunos where nome like 'Rita%') then raise exception 'FALHOU: Jorge vê aluna da Carla'; end if;
  if exists (select 1 from public.sessoes where nome = 'Treino da Rita') then raise exception 'FALHOU: Jorge vê treino da aluna da Carla'; end if;
  if (select count(*) from storage.objects) <> 2 then raise exception 'FALHOU: Jorge deveria ver só as 2 fotos da Marina'; end if;
  raise notice 'OK  Jorge: vê os alunos dele (e as fotos deles), nenhum da Carla';

  if (select count(*) from public.notas_treinador) <> 2 then raise exception 'FALHOU: Jorge não vê as próprias anotações'; end if;
  raise notice 'OK  Jorge: lê as próprias anotações';

  update public.checkins set resposta = 'Boa semana!', respondido_em = now() where id = 'c0000000-0000-0000-0000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FALHOU: Jorge não conseguiu responder check-in'; end if;
  raise notice 'OK  Jorge: responde check-in';

  begin
    update public.checkins set peso = 50 where id = 'c0000000-0000-0000-0000-000000000001';
    raise exception 'FALHOU: Jorge alterou o peso que a aluna informou';
  exception when insufficient_privilege then raise notice 'OK  Jorge: não altera o que o aluno escreveu no check-in'; end;

  insert into public.pagamentos (aluno_id, valor) values ('b0000000-0000-0000-0000-000000000001', 250);
  update public.treinos set nome = 'Inferior · quadríceps' where aluno_id = 'b0000000-0000-0000-0000-000000000001';
  insert into public.exercicios (id, treinador_id, nome) values ('x_novo', '11111111-1111-1111-1111-111111111111', 'Novo');
  raise notice 'OK  Jorge: registra pagamento, edita treino e cria exercício';

  begin
    insert into public.alunos (treinador_id, email, nome) values ('22222222-2222-2222-2222-222222222222', 'y@y.com', 'Aluno na conta da Carla');
    raise exception 'FALHOU: Jorge cadastrou aluno na conta da Carla';
  exception when insufficient_privilege then raise notice 'OK  Jorge: não cadastra aluno na conta de outra treinadora'; end;

  begin
    update public.alunos set usuario_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' where id = 'b0000000-0000-0000-0000-000000000002';
    raise exception 'FALHOU: Jorge trocou a conta ligada à ficha do Pedro';
  exception when raise_exception then
    if sqlerrm like 'FALHOU%' then raise; end if;
    raise notice 'OK  Jorge: não liga a ficha a outra conta na mão (só pelo convite)';
  end;

  update public.sessoes set comentario = 'mexi' where nome = 'Treino da Rita';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Jorge mexeu em treino da aluna da Carla'; end if;
  raise notice 'OK  Jorge: não mexe em nada dos alunos da Carla';

  -- desligar o Pedro
  update public.alunos set ativo = false where id = 'b0000000-0000-0000-0000-000000000002';
end $$;
reset role;


-- ===================== PEDRO (depois de desligado) =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000002"}', true);
do $$ begin
  if (select count(*) from public.alunos) <> 0 or (select count(*) from public.sessoes) <> 0
    then raise exception 'FALHOU: aluno desligado continua vendo os dados'; end if;
  begin
    insert into public.sessoes (aluno_id, letra, nome) values ('b0000000-0000-0000-0000-000000000002', 'A', 'Depois de sair');
    raise exception 'FALHOU: aluno desligado continua registrando treino';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Pedro desligado: perde o acesso (o histórico fica com o Jorge)';
end $$;
reset role;

select 'TODOS OS TESTES PASSARAM' as resultado;
rollback;
