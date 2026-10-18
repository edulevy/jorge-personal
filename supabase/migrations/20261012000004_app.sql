-- =====================================================================
-- O que o app novo (rodadas 1 a 5) precisa pra funcionar ligado no banco.
-- Roda depois das outras.
--
--   1. sexo do aluno (entra no cálculo de % de gordura)
--   2. aprovar cadastro: leva sexo e idade pra ficha; 1ª mensalidade vence no dia
--   3. GIF / vídeo de demonstração dos exercícios
--   4. modelos de treino do Jorge
--   5. chat em tempo real
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. SEXO DO ALUNO
-- ---------------------------------------------------------------------
alter table public.alunos
  add column sexo text not null default '' check (sexo in ('', 'F', 'M'));


-- ---------------------------------------------------------------------
-- 2. APROVAR CADASTRO (versão nova; substitui a da migração do cadastro)
-- A idade vira uma data de nascimento aproximada, pro cálculo de gordura
-- continuar certo nos anos seguintes.
-- ---------------------------------------------------------------------
create or replace function public.aprovar_cadastro(pedido uuid, mensalidade numeric default 200)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare c public.cadastros; novo uuid;
begin
  select * into c from public.cadastros where id = pedido for update;
  if not found or c.treinador_id is distinct from (select auth.uid()) then
    raise exception 'pedido não encontrado' using errcode = '42501';
  end if;
  if c.status <> 'pendente' then
    raise exception 'esse pedido já foi decidido' using errcode = '42501';
  end if;
  if exists (select 1 from public.alunos where usuario_id = c.usuario_id) then
    raise exception 'essa conta já é aluno' using errcode = '42501';
  end if;

  insert into public.alunos (treinador_id, usuario_id, email, nome, tipo, objetivo, restricao, valor, vencimento,
                             sexo, nascimento, troca_em)
  values (c.treinador_id, c.usuario_id, c.email, c.nome, c.tipo, c.objetivo, c.lesoes, mensalidade, current_date,
          case when c.sexo in ('F', 'M') then c.sexo else '' end,
          case when c.idade is not null then (current_date - make_interval(years => c.idade))::date end,
          current_date + 15)
  returning id into novo;
  insert into public.perfis (id, papel, nome) values (c.usuario_id, 'aluno', c.nome)
    on conflict (id) do nothing;

  update public.cadastros set status = 'aprovado', aluno_id = novo, decidido_em = now() where id = pedido;
  return novo;
end $$;


-- ---------------------------------------------------------------------
-- 3. DEMONSTRAÇÃO DOS EXERCÍCIOS (link do YouTube e/ou GIF)
-- Vale pra exercício da biblioteca base e pros que o Jorge criou.
-- O GIF fica num bucket PÚBLICO ("demonstracoes"): é vídeo de exercício,
-- não é dado de aluno. Só o treinador envia e apaga, na pasta dele.
-- ---------------------------------------------------------------------
create table public.demonstracoes (
  treinador_id uuid not null references public.perfis(id) on delete cascade,
  exercicio_id text not null,               -- id da biblioteca (ex.: "agachamento") ou "x_..." criado pelo Jorge
  video        text,                        -- link do YouTube
  imagem       text,                        -- "<treinador>/<arquivo>.gif" no bucket "demonstracoes"
  primary key (treinador_id, exercicio_id)
);
alter table public.demonstracoes enable row level security;
revoke all on public.demonstracoes from anon;

create policy "ver demonstrações" on public.demonstracoes for select to authenticated
  using (treinador_id = (select auth.uid()) or treinador_id = (select privado.meu_treinador()));
create policy "treinador cuida das demonstrações" on public.demonstracoes for all to authenticated
  using (treinador_id = (select auth.uid()))
  with check (treinador_id = (select auth.uid()) and (select privado.sou_treinador())
              and (imagem is null or imagem like treinador_id::text || '/%'));

insert into storage.buckets (id, name, public) values ('demonstracoes', 'demonstracoes', true)
  on conflict (id) do nothing;
create policy "demonstracoes: treinador envia na pasta dele" on storage.objects for insert to authenticated
  with check (bucket_id = 'demonstracoes' and (storage.foldername(name))[1] = (select auth.uid())::text
              and (select privado.sou_treinador()));
create policy "demonstracoes: treinador apaga as dele" on storage.objects for delete to authenticated
  using (bucket_id = 'demonstracoes' and (storage.foldername(name))[1] = (select auth.uid())::text);


-- ---------------------------------------------------------------------
-- 4. MODELOS DE TREINO DO JORGE (os da biblioteca base ficam no app)
-- ---------------------------------------------------------------------
create table public.modelos (
  id           uuid primary key default gen_random_uuid(),
  treinador_id uuid not null references public.perfis(id) on delete cascade,
  nome         text not null check (length(trim(nome)) > 0),
  descricao    text not null default '',
  treinos      jsonb not null default '[]' check (jsonb_typeof(treinos) = 'array'),  -- mesmo formato do editor
  criado_em    timestamptz not null default now()
);
alter table public.modelos enable row level security;
revoke all on public.modelos from anon;

create policy "só o treinador" on public.modelos for all to authenticated
  using (treinador_id = (select auth.uid()))
  with check (treinador_id = (select auth.uid()) and (select privado.sou_treinador()));


-- ---------------------------------------------------------------------
-- 5. CHAT EM TEMPO REAL
-- O Supabase avisa o app quando chega mensagem nova (respeitando as regras:
-- cada um só recebe o que pode ver). Só existe no Supabase; no teste local é pulado.
-- ---------------------------------------------------------------------
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.mensagens;
  end if;
end $$;
