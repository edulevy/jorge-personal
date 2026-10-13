-- =====================================================================
-- O que o protótipo ganhou nas rodadas 1 a 5 e ainda não existia no banco.
-- Roda depois do esquema, do cadastro e do ping.
--
--   1. ficha do aluno: suspender acesso, plano, troca quinzenal, altura
--   2. plano série a série (formato do treino)
--   3. avaliação física (só o Jorge vê) + fotos da avaliação
--   4. chat no app
--   5. Pix com comprovante (o aluno manda, o Jorge confirma)
--   6. planos (mensal, trimestral, semestral)
--   7. alimentação (orientações + PDF do nutricionista)
--   8. avisos no celular (preferências do aluno)
--   9. pedido de exclusão dos dados (LGPD)
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. FICHA DO ALUNO
-- ---------------------------------------------------------------------
alter table public.alunos
  add column suspenso_em date,                              -- preenchido = acesso pausado (falta de pagamento)
  add column plano       text not null default 'mensal',
  add column troca_em    date,                              -- próxima troca de treino (quinzenal)
  add column altura      numeric(4,2);                      -- em metros

-- aluno liberado = é o aluno, está ativo e não está suspenso.
-- Suspenso: continua vendo a ficha, os pagamentos e o chat, e consegue mandar comprovante,
-- mas não vê o treino nem registra treino até o Jorge reativar.
create function privado.sou_o_aluno_liberado(aluno uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.alunos
                 where id = aluno and usuario_id = (select auth.uid()) and ativo and suspenso_em is null);
$$;

-- a pasta (= id do aluno) é de um aluno meu? (pros arquivos que só o Jorge mexe)
create function privado.pasta_de_aluno_meu(pasta text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.alunos
                 where id::text = pasta and treinador_id = (select auth.uid()));
$$;

revoke all on function privado.sou_o_aluno_liberado(uuid), privado.pasta_de_aluno_meu(text) from public;
grant execute on function privado.sou_o_aluno_liberado(uuid), privado.pasta_de_aluno_meu(text) to authenticated;

-- treino montado e treino feito passam a exigir aluno liberado
alter policy "ver treinos" on public.treinos
  using ((select privado.sou_o_aluno_liberado(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
alter policy "registrar sessão" on public.sessoes
  with check ((select privado.sou_o_aluno_liberado(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
alter policy "corrigir sessão" on public.sessoes
  using ((select privado.sou_o_aluno_liberado(aluno_id)) or (select privado.sou_treinador_de(aluno_id)))
  with check ((select privado.sou_o_aluno_liberado(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));


-- ---------------------------------------------------------------------
-- 2. PLANO SÉRIE A SÉRIE
-- Continua no campo JSON do treino. Cada exercício pode ter "plano", uma lista
-- com reps e carga de cada série (pirâmide, carga subindo):
--   {"id":"supino","series":3,"reps":"10","carga":40,"desc":90,
--    "cad":"3-0-1","int":"RIR 2","met":"Normal","jun":null,
--    "plano":[{"reps":"12","kg":35},{"reps":"10","kg":40},{"reps":"8","kg":45}]}
-- O banco só garante que é uma lista.
-- ---------------------------------------------------------------------
alter table public.treinos add constraint treino_e_lista check (jsonb_typeof(exercicios) = 'array');


-- ---------------------------------------------------------------------
-- 3. AVALIAÇÃO FÍSICA · só o Jorge vê e escreve
-- ---------------------------------------------------------------------
create table public.avaliacoes (
  id        uuid primary key default gen_random_uuid(),
  aluno_id  uuid not null references public.alunos(id) on delete cascade,
  data      date not null default current_date,
  peso      numeric(5,1),
  altura    numeric(4,2),
  circ      jsonb not null default '{}',   -- {"peito":98,"braco":34,"cintura":80,...} em cm
  dobras    jsonb not null default '{}',   -- {"peitoral":8,"triceps":12,...} em mm (7 dobras)
  gordura   numeric(4,1),                  -- % calculado (Jackson & Pollock + Siri)
  bio       jsonb not null default '{}',   -- bioimpedância: {"gordura":22,"musculo":30,...}
  forca     jsonb not null default '{}',   -- {"supino":60,"agacha":80,"flexoes":20,"prancha":90}
  fotos     jsonb not null default '{}',   -- {"frente":"<aluno>/<avaliação>/frente.jpg",...} no bucket "avaliacoes"
  obs       text not null default '',
  criado_em timestamptz not null default now()
);
create index on public.avaliacoes (aluno_id, data);
alter table public.avaliacoes enable row level security;
revoke all on public.avaliacoes from anon;

create policy "só o treinador" on public.avaliacoes for all to authenticated
  using ((select privado.sou_treinador_de(aluno_id)))
  with check ((select privado.sou_treinador_de(aluno_id)));

-- fotos da avaliação: bucket separado das fotos de evolução, porque o aluno NÃO vê
insert into storage.buckets (id, name, public) values ('avaliacoes', 'avaliacoes', false)
  on conflict (id) do nothing;
create policy "avaliacoes: só o treinador vê" on storage.objects for select to authenticated
  using (bucket_id = 'avaliacoes' and privado.pasta_de_aluno_meu((storage.foldername(name))[1]));
create policy "avaliacoes: só o treinador envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'avaliacoes' and privado.pasta_de_aluno_meu((storage.foldername(name))[1]));
create policy "avaliacoes: só o treinador apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'avaliacoes' and privado.pasta_de_aluno_meu((storage.foldername(name))[1]));


-- ---------------------------------------------------------------------
-- 4. CHAT · uma conversa por aluno, entre ele e o Jorge
-- ---------------------------------------------------------------------
create table public.mensagens (
  id         uuid primary key default gen_random_uuid(),
  aluno_id   uuid not null references public.alunos(id) on delete cascade,
  de         text not null check (de in ('aluno', 'treinador')),
  texto      text not null check (length(trim(texto)) between 1 and 2000),
  enviada_em timestamptz not null default now(),
  lida_em    timestamptz
);
create index on public.mensagens (aluno_id, enviada_em);
alter table public.mensagens enable row level security;
revoke all on public.mensagens from anon;

create policy "ver conversa" on public.mensagens for select to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
-- cada um só fala como ele mesmo
create policy "mandar mensagem" on public.mensagens for insert to authenticated
  with check (lida_em is null and (
    (de = 'aluno' and (select privado.sou_o_aluno(aluno_id)))
    or (de = 'treinador' and (select privado.sou_treinador_de(aluno_id)))));
-- marcar como lida: só a coluna lida_em; ninguém edita o texto nem apaga
create policy "marcar como lida" on public.mensagens for update to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)))
  with check ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
revoke update on public.mensagens from authenticated;
grant update (lida_em) on public.mensagens to authenticated;


-- ---------------------------------------------------------------------
-- 5. PIX COM COMPROVANTE
-- O aluno paga no app do banco e manda o comprovante. O Jorge confere e confirma:
-- aí entra o pagamento, o vencimento anda e o acesso volta (se estava suspenso).
-- ---------------------------------------------------------------------
create table public.comprovantes (
  id          uuid primary key default gen_random_uuid(),
  aluno_id    uuid not null references public.alunos(id) on delete cascade,
  valor       numeric(10,2) not null check (valor > 0),
  arquivo     text,                         -- "<aluno>/<arquivo>" no bucket "comprovantes"
  status      text not null default 'pendente' check (status in ('pendente', 'confirmado', 'recusado')),
  enviado_em  timestamptz not null default now(),
  decidido_em timestamptz
);
alter table public.comprovantes enable row level security;
revoke all on public.comprovantes from anon;

create policy "ver comprovantes" on public.comprovantes for select to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "aluno manda comprovante" on public.comprovantes for insert to authenticated
  with check ((select privado.sou_o_aluno(aluno_id)) and status = 'pendente' and decidido_em is null
              and (arquivo is null or arquivo like aluno_id::text || '/%'));
-- sem update/delete: confirmar e recusar é pelas funções abaixo

insert into storage.buckets (id, name, public) values ('comprovantes', 'comprovantes', false)
  on conflict (id) do nothing;
create policy "comprovantes: ver os meus ou dos meus alunos" on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and privado.posso_ver_pasta((storage.foldername(name))[1]));
create policy "comprovantes: aluno envia na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and privado.pasta_e_minha((storage.foldername(name))[1]));
create policy "comprovantes: treinador apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and privado.pasta_de_aluno_meu((storage.foldername(name))[1]));


-- ---------------------------------------------------------------------
-- 6. PLANOS · o Jorge liga e desliga; o aluno vê os ligados
-- ---------------------------------------------------------------------
create table public.planos (
  treinador_id uuid not null references public.perfis(id) on delete cascade,
  id           text not null,               -- 'mensal', 'trimestral', 'semestral'
  nome         text not null,
  meses        int not null check (meses between 1 and 12),
  valor        numeric(10,2) not null check (valor >= 0),
  ativo        boolean not null default true,
  primary key (treinador_id, id)
);
alter table public.planos enable row level security;
revoke all on public.planos from anon;

create policy "ver planos" on public.planos for select to authenticated
  using (treinador_id = (select auth.uid())
         or (ativo and treinador_id = (select privado.meu_treinador())));
create policy "treinador cuida dos planos" on public.planos for all to authenticated
  using (treinador_id = (select auth.uid()))
  with check (treinador_id = (select auth.uid()) and (select privado.sou_treinador()));


-- confirmar o comprovante: registra o pagamento, anda o vencimento pelo plano do aluno
-- (mensal = 30 dias, trimestral = 90...) e tira a suspensão
create function public.confirmar_comprovante(comprovante uuid)
returns date
language plpgsql security definer set search_path = '' as $$
declare c public.comprovantes; a public.alunos; m int; novo date;
begin
  select * into c from public.comprovantes where id = comprovante for update;
  if not found or not exists (select 1 from public.alunos where id = c.aluno_id and treinador_id = (select auth.uid())) then
    raise exception 'comprovante não encontrado' using errcode = '42501';
  end if;
  if c.status <> 'pendente' then
    raise exception 'esse comprovante já foi decidido' using errcode = '42501';
  end if;
  select * into a from public.alunos where id = c.aluno_id for update;
  select meses into m from public.planos where treinador_id = a.treinador_id and id = a.plano;
  novo := coalesce(a.vencimento, current_date) + 30 * coalesce(m, 1);

  insert into public.pagamentos (aluno_id, valor, referente) values (a.id, c.valor, a.vencimento);
  update public.alunos set vencimento = novo, suspenso_em = null where id = a.id;
  update public.comprovantes set status = 'confirmado', decidido_em = now() where id = comprovante;
  return novo;
end $$;

create function public.recusar_comprovante(comprovante uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.comprovantes c set status = 'recusado', decidido_em = now()
   where c.id = comprovante and c.status = 'pendente'
     and exists (select 1 from public.alunos a where a.id = c.aluno_id and a.treinador_id = (select auth.uid()));
  if not found then
    raise exception 'comprovante não encontrado ou já decidido' using errcode = '42501';
  end if;
end $$;

revoke all on function public.confirmar_comprovante(uuid), public.recusar_comprovante(uuid) from public, anon;
grant execute on function public.confirmar_comprovante(uuid), public.recusar_comprovante(uuid) to authenticated;


-- ---------------------------------------------------------------------
-- 7. ALIMENTAÇÃO · orientações gerais do Jorge + PDF do nutricionista
-- (dieta individual é atribuição de nutricionista: o Jorge só anexa o PDF)
-- ---------------------------------------------------------------------
create table public.alimentacao (
  aluno_id      uuid primary key references public.alunos(id) on delete cascade,
  orientacoes   text not null default '',
  nutricionista text not null default '',   -- nome e CRN
  pdf           text,                       -- "<aluno>/<arquivo>.pdf" no bucket "alimentacao"
  atualizado_em timestamptz not null default now()
);
alter table public.alimentacao enable row level security;
revoke all on public.alimentacao from anon;

create policy "ver alimentação" on public.alimentacao for select to authenticated
  using ((select privado.sou_o_aluno_liberado(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "treinador escreve alimentação" on public.alimentacao for all to authenticated
  using ((select privado.sou_treinador_de(aluno_id)))
  with check ((select privado.sou_treinador_de(aluno_id)) and (pdf is null or pdf like aluno_id::text || '/%'));

insert into storage.buckets (id, name, public) values ('alimentacao', 'alimentacao', false)
  on conflict (id) do nothing;
create policy "alimentacao: ver o meu ou dos meus alunos" on storage.objects for select to authenticated
  using (bucket_id = 'alimentacao' and privado.posso_ver_pasta((storage.foldername(name))[1]));
create policy "alimentacao: treinador envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'alimentacao' and privado.pasta_de_aluno_meu((storage.foldername(name))[1]));
create policy "alimentacao: treinador apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'alimentacao' and privado.pasta_de_aluno_meu((storage.foldername(name))[1]));

-- o Jorge também apaga as fotos de evolução dos alunos dele (precisa pra exclusão LGPD)
create policy "fotos: treinador apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and privado.pasta_de_aluno_meu((storage.foldername(name))[1]));


-- ---------------------------------------------------------------------
-- 8. AVISOS NO CELULAR · cada aluno escolhe os dele
-- ---------------------------------------------------------------------
create table public.avisos (
  aluno_id   uuid primary key references public.alunos(id) on delete cascade,
  treino     boolean not null default true,      -- lembrete de treino
  hora       time not null default '06:00',
  novo       boolean not null default true,      -- treino novo disponível
  vencimento boolean not null default true,
  mensagem   boolean not null default true
);
alter table public.avisos enable row level security;
revoke all on public.avisos from anon;

create policy "ver avisos" on public.avisos for select to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "aluno escolhe avisos" on public.avisos for insert to authenticated
  with check ((select privado.sou_o_aluno(aluno_id)));
create policy "aluno muda avisos" on public.avisos for update to authenticated
  using ((select privado.sou_o_aluno(aluno_id)))
  with check ((select privado.sou_o_aluno(aluno_id)));


-- ---------------------------------------------------------------------
-- 9. PEDIDO DE EXCLUSÃO (LGPD)
-- O aluno pede pelo app; o Jorge confirma. Antes de confirmar, o app apaga os
-- arquivos (fotos, comprovantes, PDF) pela API de arquivos do Supabase; a função
-- confere que não sobrou nenhum e apaga a ficha (que leva junto treinos, cargas,
-- avaliações, chat, pagamentos...). O pedido fica guardado como prova de que foi feito.
-- ---------------------------------------------------------------------
create table public.pedidos_exclusao (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid not null,               -- sem ligação: a ficha some, o pedido fica
  usuario_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  treinador_id uuid not null default '00000000-0000-0000-0000-000000000000',  -- o banco preenche
  nome         text not null default '',                                      -- o banco preenche
  pedido_em    timestamptz not null default now(),
  concluido_em timestamptz
);
create unique index pedidos_exclusao_um_aberto on public.pedidos_exclusao (aluno_id) where concluido_em is null;
alter table public.pedidos_exclusao enable row level security;
revoke all on public.pedidos_exclusao from anon;

create policy "ver pedido de exclusão" on public.pedidos_exclusao for select to authenticated
  using (usuario_id = (select auth.uid()) or treinador_id = (select auth.uid()));
create policy "aluno pede exclusão" on public.pedidos_exclusao for insert to authenticated
  with check (usuario_id = (select auth.uid()) and concluido_em is null and (select privado.sou_o_aluno(aluno_id)));

create function privado.preencher_pedido_exclusao() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select treinador_id, nome into new.treinador_id, new.nome from public.alunos where id = new.aluno_id;
  new.pedido_em := now();
  return new;
end $$;
create trigger ao_pedir_exclusao before insert on public.pedidos_exclusao
  for each row execute function privado.preencher_pedido_exclusao();

create function public.concluir_exclusao(pedido uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare p public.pedidos_exclusao;
begin
  select * into p from public.pedidos_exclusao where id = pedido for update;
  if not found or p.treinador_id <> (select auth.uid()) then
    raise exception 'pedido não encontrado' using errcode = '42501';
  end if;
  if p.concluido_em is not null then
    raise exception 'esse pedido já foi concluído' using errcode = '42501';
  end if;
  if exists (select 1 from storage.objects
             where bucket_id in ('fotos', 'avaliacoes', 'comprovantes', 'alimentacao')
               and name like p.aluno_id::text || '/%') then
    raise exception 'ainda tem arquivo desse aluno guardado: apague os arquivos antes' using errcode = '42501';
  end if;

  delete from public.alunos where id = p.aluno_id;           -- leva junto tudo que é do aluno
  delete from public.cadastros where usuario_id = p.usuario_id;
  delete from public.perfis where id = p.usuario_id and papel = 'aluno';
  update public.pedidos_exclusao set concluido_em = now() where id = pedido;
end $$;

revoke all on function public.concluir_exclusao(uuid) from public, anon;
grant execute on function public.concluir_exclusao(uuid) to authenticated;
