-- =====================================================================
-- Testes do cadastro com aprovação. Dados 100% fictícios.
-- Roda depois do esquema e da migração do cadastro.
-- Tudo é desfeito no fim (rollback). Se uma regra estiver furada, PARA com "FALHOU: ...".
-- =====================================================================
begin;

-- ---------- elenco ----------
-- Jorge e Carla (treinadores) · Marina (já é aluna do Jorge)
-- Ana (quer ser aluna, faz tudo certo) · Bruno (quer ser aluno e tenta trapacear)
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'jorge@teste.dev', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'carla@teste.dev', 'authenticated', 'authenticated');
insert into public.perfis (id, papel, nome) values
  ('11111111-1111-1111-1111-111111111111', 'treinador', 'Jorge'),
  ('22222222-2222-2222-2222-222222222222', 'treinador', 'Carla');
insert into public.alunos (id, treinador_id, email, nome) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'marina@teste.dev', 'Marina Costa');
insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'marina@teste.dev', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'ana@teste.dev',    'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-00000000000b', 'bruno@teste.dev',  'authenticated', 'authenticated');
insert into public.treinos (aluno_id, letra, nome) values ('b0000000-0000-0000-0000-000000000001', 'A', 'Inferior');


-- ===================== SEM LOGIN =====================
set local role anon;
select set_config('request.jwt.claims', '', true);
do $$ begin
  begin
    insert into public.cadastros (treinador_id, nome, parq)
      values ('11111111-1111-1111-1111-111111111111', 'Robô', '{f,f,f,f,f,f,f}');
    raise exception 'FALHOU: visitante sem login mandou cadastro';
  exception when insufficient_privilege then raise notice 'OK  sem login: não manda cadastro'; end;
  begin
    perform 1 from public.cadastros;
    raise exception 'FALHOU: visitante sem login leu cadastros';
  exception when insufficient_privilege then raise notice 'OK  sem login: não lê cadastro de ninguém'; end;
end $$;
reset role;


-- ===================== ANA (faz tudo certo) =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a"}', true);
do $$ begin
  -- ela digita um e-mail diferente do login: o banco grava o do login
  insert into public.cadastros (id, treinador_id, nome, idade, sexo, tipo, objetivo, email, lesoes, parq)
  values ('cad00000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111',
          'Ana Souza', 29, 'F', 'Online', 'Hipertrofia', 'outro@email.dev', 'Joelho esquerdo operado em 2023',
          '{f,f,f,f,t,f,f}');
  if (select email from public.cadastros) <> 'ana@teste.dev' then raise exception 'FALHOU: o e-mail gravado não é o do login'; end if;
  raise notice 'OK  Ana: manda o cadastro (e o e-mail gravado é o do login, não o digitado)';

  if (select count(*) from public.cadastros) <> 1 then raise exception 'FALHOU: Ana vê cadastro de outros'; end if;
  raise notice 'OK  Ana: vê só o próprio pedido';

  if (select count(*) from public.alunos) + (select count(*) from public.treinos) <> 0
    then raise exception 'FALHOU: Ana vê dados do app antes de ser aprovada'; end if;
  raise notice 'OK  Ana: antes da aprovação não vê nada do app (0 alunos, 0 treinos)';

  begin
    insert into public.cadastros (treinador_id, nome, parq) values ('11111111-1111-1111-1111-111111111111', 'Ana de novo', '{f,f,f,f,f,f,f}');
    raise exception 'FALHOU: Ana mandou dois pedidos pendentes';
  exception when unique_violation then raise notice 'OK  Ana: não manda um segundo pedido enquanto o primeiro está pendente'; end;
end $$;
reset role;


-- ===================== BRUNO (tenta trapacear) =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000b"}', true);
do $$ declare n int; begin
  begin
    insert into public.cadastros (treinador_id, nome, parq, status)
      values ('11111111-1111-1111-1111-111111111111', 'Bruno', '{f,f,f,f,f,f,f}', 'aprovado');
    raise exception 'FALHOU: Bruno mandou o pedido já como aprovado';
  exception when insufficient_privilege then raise notice 'OK  Bruno: não manda o pedido já "aprovado"'; end;

  begin
    insert into public.cadastros (treinador_id, usuario_id, nome, parq)
      values ('11111111-1111-1111-1111-111111111111', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Ana (falsa)', '{f,f,f,f,f,f,f}');
    raise exception 'FALHOU: Bruno mandou pedido em nome da Ana';
  exception when insufficient_privilege then raise notice 'OK  Bruno: não manda pedido em nome de outra pessoa'; end;

  begin
    insert into public.cadastros (treinador_id, nome, parq)
      values ('aaaaaaaa-0000-0000-0000-00000000000a', 'Bruno', '{f,f,f,f,f,f,f}');
    raise exception 'FALHOU: Bruno mandou pedido pra quem não é treinador';
  exception when insufficient_privilege then raise notice 'OK  Bruno: não manda pedido pra quem não é treinador'; end;

  -- agora o pedido certo
  insert into public.cadastros (id, treinador_id, nome, parq)
    values ('cad00000-0000-0000-0000-00000000000b', '11111111-1111-1111-1111-111111111111', 'Bruno Lima', '{f,f,f,f,f,f,f}');

  if exists (select 1 from public.cadastros where nome = 'Ana Souza') then raise exception 'FALHOU: Bruno lê o cadastro (e a anamnese) da Ana'; end if;
  raise notice 'OK  Bruno: não lê o cadastro nem a anamnese da Ana';

  update public.cadastros set status = 'aprovado' where id = 'cad00000-0000-0000-0000-00000000000b';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Bruno aprovou o próprio pedido mudando a linha'; end if;
  begin
    perform public.aprovar_cadastro('cad00000-0000-0000-0000-00000000000b');
    raise exception 'FALHOU: Bruno se aprovou pela função';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Bruno: não se aprova sozinho (nem mexendo na linha, nem pela função)';

  delete from public.cadastros where id = 'cad00000-0000-0000-0000-00000000000a';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Bruno apagou o pedido da Ana'; end if;
  raise notice 'OK  Bruno: não apaga pedido de ninguém';
end $$;
reset role;


-- ===================== MARINA (já é aluna) =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
do $$ begin
  if (select count(*) from public.cadastros) <> 0 then raise exception 'FALHOU: Marina vê pedidos de cadastro'; end if;
  begin
    insert into public.cadastros (treinador_id, nome, parq) values ('22222222-2222-2222-2222-222222222222', 'Marina', '{f,f,f,f,f,f,f}');
    raise exception 'FALHOU: quem já é aluna mandou outro cadastro';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Marina (aluna): não vê os pedidos dos outros e não manda cadastro de novo';
end $$;
reset role;


-- ===================== CARLA (outra treinadora) =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
do $$ begin
  if (select count(*) from public.cadastros) <> 0 then raise exception 'FALHOU: Carla vê pedidos feitos pro Jorge'; end if;
  begin
    perform public.aprovar_cadastro('cad00000-0000-0000-0000-00000000000a');
    raise exception 'FALHOU: Carla aprovou pedido do Jorge';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Carla: não vê nem aprova os pedidos feitos pro Jorge';
end $$;
reset role;


-- ===================== JORGE =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
do $$ declare novo uuid; begin
  if (select count(*) from public.cadastros) <> 2 then raise exception 'FALHOU: Jorge deveria ver 2 pedidos (Ana e Bruno)'; end if;
  if (select parq[5] from public.cadastros where nome = 'Ana Souza') is not true then raise exception 'FALHOU: Jorge não vê o PAR-Q da Ana'; end if;
  raise notice 'OK  Jorge: vê os 2 pedidos, com anamnese e PAR-Q';

  begin
    insert into public.cadastros (treinador_id, nome, parq) values ('11111111-1111-1111-1111-111111111111', 'Jorge', '{f,f,f,f,f,f,f}');
    raise exception 'FALHOU: treinador mandou cadastro de aluno';
  exception when insufficient_privilege then raise notice 'OK  Jorge: treinador não manda cadastro de aluno'; end;

  novo := public.aprovar_cadastro('cad00000-0000-0000-0000-00000000000a', 200);
  if (select usuario_id from public.alunos where id = novo) <> 'aaaaaaaa-0000-0000-0000-00000000000a'
    then raise exception 'FALHOU: a ficha da Ana não ficou ligada à conta dela'; end if;
  if (select restricao from public.alunos where id = novo) not like 'Joelho%' then raise exception 'FALHOU: a lesão da Ana não foi pra ficha'; end if;
  if (select status from public.cadastros where id = 'cad00000-0000-0000-0000-00000000000a') <> 'aprovado' then raise exception 'FALHOU: o pedido não ficou aprovado'; end if;
  raise notice 'OK  Jorge: aprova a Ana (vira aluna, ficha ligada à conta, lesão e mensalidade de R$ 200 na ficha)';

  begin
    perform public.aprovar_cadastro('cad00000-0000-0000-0000-00000000000a');
    raise exception 'FALHOU: aprovou o mesmo pedido duas vezes';
  exception when insufficient_privilege then raise notice 'OK  Jorge: não aprova o mesmo pedido duas vezes'; end;

  perform public.recusar_cadastro('cad00000-0000-0000-0000-00000000000b');
  raise notice 'OK  Jorge: recusa o Bruno';
end $$;
reset role;


-- ===================== DEPOIS DA DECISÃO =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a"}', true);
do $$ begin
  if (select count(*) from public.alunos) <> 1 then raise exception 'FALHOU: Ana aprovada não vê a própria ficha'; end if;
  if exists (select 1 from public.alunos where nome = 'Marina Costa') then raise exception 'FALHOU: Ana vê a ficha da Marina'; end if;
  raise notice 'OK  Ana aprovada: entra no app e vê só a ficha dela (a da Marina não)';
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000b"}', true);
do $$ begin
  if (select count(*) from public.alunos) <> 0 then raise exception 'FALHOU: Bruno recusado vê dados do app'; end if;
  if (select status from public.cadastros) <> 'recusado' then raise exception 'FALHOU: Bruno não vê que foi recusado'; end if;
  raise notice 'OK  Bruno recusado: continua sem ver nada (só o próprio pedido, marcado como recusado)';
end $$;
reset role;

select 'TODOS OS TESTES DO CADASTRO PASSARAM' as resultado;
rollback;
