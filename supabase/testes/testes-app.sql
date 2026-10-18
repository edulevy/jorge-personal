-- =====================================================================
-- Testes do que o app novo precisa: aprovação com sexo e idade,
-- demonstração dos exercícios (GIF/vídeo) e modelos de treino.
-- Dados 100% fictícios. Tudo é desfeito no fim (rollback).
-- =====================================================================
begin;

-- ---------- elenco ----------
-- Jorge e Carla (treinadores) · Marina (aluna do Jorge) · Rita (aluna da Carla) · Ana (pediu cadastro)
insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'jorge@teste.dev', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'carla@teste.dev', 'authenticated', 'authenticated');
insert into public.perfis (id, papel, nome) values
  ('11111111-1111-1111-1111-111111111111', 'treinador', 'Jorge'),
  ('22222222-2222-2222-2222-222222222222', 'treinador', 'Carla');
insert into public.alunos (id, treinador_id, email, nome) values
  ('b0000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'marina@teste.dev', 'Marina Costa'),
  ('b0000000-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'rita@teste.dev', 'Rita (aluna da Carla)');
insert into auth.users (id, email, aud, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'marina@teste.dev', 'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-000000000003', 'rita@teste.dev',   'authenticated', 'authenticated'),
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'ana@teste.dev',    'authenticated', 'authenticated');


-- ===================== ANA pede, JORGE aprova =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-00000000000a"}', true);
insert into public.cadastros (id, treinador_id, nome, idade, sexo, tipo, objetivo, parq)
values ('cad00000-0000-0000-0000-00000000000a', '11111111-1111-1111-1111-111111111111', 'Ana Souza', 29, 'F', 'Híbrido', 'Hipertrofia', '{f,f,f,f,f,f,f}');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
do $$ declare novo uuid; a public.alunos; begin
  novo := public.aprovar_cadastro('cad00000-0000-0000-0000-00000000000a', 200);
  select * into a from public.alunos where id = novo;
  if a.sexo <> 'F' then raise exception 'FALHOU: o sexo da Ana não foi pra ficha'; end if;
  if extract(year from age(a.nascimento)) <> 29 then raise exception 'FALHOU: a idade da Ana não virou nascimento (deu %)', a.nascimento; end if;
  if a.vencimento <> current_date then raise exception 'FALHOU: a 1ª mensalidade deveria vencer hoje'; end if;
  if a.troca_em <> current_date + 15 then raise exception 'FALHOU: a 1ª troca de treino deveria ser em 15 dias'; end if;
  if a.tipo <> 'Híbrido' then raise exception 'FALHOU: o tipo não foi pra ficha'; end if;
  raise notice 'OK  aprovação: sexo, idade (29 anos), tipo, 1ª mensalidade hoje e troca em 15 dias vão pra ficha';
end $$;
reset role;


-- ===================== JORGE: demonstrações e modelos =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
do $$ begin
  insert into public.demonstracoes (treinador_id, exercicio_id, video, imagem) values
    ('11111111-1111-1111-1111-111111111111', 'agachamento', 'https://youtu.be/abcdefghijk', '11111111-1111-1111-1111-111111111111/agachamento.gif');
  insert into storage.objects (bucket_id, name) values ('demonstracoes', '11111111-1111-1111-1111-111111111111/agachamento.gif');
  raise notice 'OK  Jorge: põe vídeo e GIF no agachamento';
  begin
    insert into storage.objects (bucket_id, name) values ('demonstracoes', '22222222-2222-2222-2222-222222222222/x.gif');
    raise exception 'FALHOU: Jorge pôs GIF na pasta da Carla';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.demonstracoes (treinador_id, exercicio_id, video) values ('22222222-2222-2222-2222-222222222222', 'supino', 'x');
    raise exception 'FALHOU: Jorge mexeu na demonstração da Carla';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Jorge: não mexe na pasta nem nas demonstrações da Carla';

  insert into public.modelos (treinador_id, nome, treinos) values
    ('11111111-1111-1111-1111-111111111111', 'Glúteo foco · Jorge', '[{"letra":"A","nome":"Inferior","exs":[]}]');
  begin
    insert into public.modelos (treinador_id, nome, treinos) values ('11111111-1111-1111-1111-111111111111', 'Errado', '{}');
    raise exception 'FALHOU: modelo que não é lista foi aceito';
  exception when check_violation then null; end;
  raise notice 'OK  Jorge: salva modelo de treino (formato errado é recusado)';
end $$;
reset role;

-- Carla também tem a dela
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
insert into public.demonstracoes (treinador_id, exercicio_id, video) values ('22222222-2222-2222-2222-222222222222', 'agachamento', 'https://youtu.be/carlacarla1');
do $$ begin
  if (select count(*) from public.modelos) <> 0 then raise exception 'FALHOU: Carla vê os modelos do Jorge'; end if;
  if (select count(*) from public.demonstracoes) <> 1 then raise exception 'FALHOU: Carla vê as demonstrações do Jorge'; end if;
  raise notice 'OK  Carla: não vê os modelos nem as demonstrações do Jorge';
end $$;
reset role;


-- ===================== ALUNAS =====================
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000001"}', true);
do $$ declare n int; begin
  if (select video from public.demonstracoes where exercicio_id = 'agachamento') <> 'https://youtu.be/abcdefghijk'
    then raise exception 'FALHOU: Marina não vê o vídeo do Jorge (ou vê o da Carla)'; end if;
  if (select count(*) from public.modelos) <> 0 then raise exception 'FALHOU: Marina vê os modelos do Jorge'; end if;
  update public.demonstracoes set video = 'https://youtu.be/hackeado00';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FALHOU: Marina trocou o vídeo'; end if;
  begin
    insert into storage.objects (bucket_id, name) values ('demonstracoes', 'aaaaaaaa-0000-0000-0000-000000000001/meu.gif');
    raise exception 'FALHOU: aluna subiu GIF de demonstração';
  exception when insufficient_privilege then null; end;
  raise notice 'OK  Marina: vê o vídeo do Jorge (não o da Carla), não vê os modelos e não troca nada';
end $$;
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"aaaaaaaa-0000-0000-0000-000000000003"}', true);
do $$ begin
  if (select video from public.demonstracoes) <> 'https://youtu.be/carlacarla1' then raise exception 'FALHOU: Rita deveria ver só o vídeo da Carla'; end if;
  raise notice 'OK  Rita (aluna da Carla): vê o vídeo da Carla, não o do Jorge';
end $$;
reset role;

select 'TODOS OS TESTES DO APP PASSARAM' as resultado;
rollback;
