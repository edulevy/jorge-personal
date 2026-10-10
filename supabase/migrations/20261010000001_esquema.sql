-- =====================================================================
-- Banco do app do Jorge · tabelas + proteção (RLS)
-- Roda uma vez no Supabase: SQL Editor → cola tudo → Run.
--
-- A regra do app inteiro, em português:
--   • o Jorge (treinador) vê e mexe nos alunos DELE;
--   • o aluno vê só os PRÓPRIOS dados e só escreve o que é dele
--     (treino feito, check-in, hábitos, fotos);
--   • quem não está logado não vê nada;
--   • conta nova sem convite não vê nada.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. TABELAS
-- ---------------------------------------------------------------------

-- quem é quem: cada login (auth.users) vira um perfil, treinador ou aluno
create table public.perfis (
  id        uuid primary key references auth.users(id) on delete cascade,
  papel     text not null check (papel in ('treinador', 'aluno')),
  nome      text not null,
  criado_em timestamptz not null default now()
);

-- ficha do aluno. O aluno lê a própria ficha, mas quem escreve é o Jorge
create table public.alunos (
  id           uuid primary key default gen_random_uuid(),
  treinador_id uuid not null references public.perfis(id),
  usuario_id   uuid unique references auth.users(id) on delete set null, -- preenchido quando o aluno aceita o convite
  email        text not null,
  nome         text not null,
  nascimento   date,
  tipo         text not null default 'Online' check (tipo in ('Online', 'Presencial', 'Híbrido')),
  objetivo     text not null default '',
  restricao    text not null default '',          -- lesão / condição de saúde (dado sensível, LGPD)
  valor        numeric(10,2) not null default 0,  -- mensalidade
  vencimento   date,
  meta_semana  int not null default 3 check (meta_semana between 1 and 7),
  peso_inicial numeric(5,1),
  programa     text not null default '',
  inicio       date not null default current_date,
  ativo        boolean not null default true,     -- desligou o aluno: ele perde o acesso, o histórico fica
  criado_em    timestamptz not null default now(),
  unique (treinador_id, email)
);

-- anotações do Jorge sobre o aluno. Separado da ficha porque o aluno NÃO pode ler
create table public.notas_treinador (
  aluno_id      uuid primary key references public.alunos(id) on delete cascade,
  texto         text not null default '',
  atualizado_em timestamptz not null default now()
);

-- biblioteca de exercícios. treinador_id vazio = biblioteca base; preenchido = exercício criado pelo Jorge
create table public.exercicios (
  id           text primary key,
  treinador_id uuid references public.perfis(id) on delete cascade,
  nome         text not null,
  grupo        text not null default '',
  local        text not null default 'academia' check (local in ('academia', 'casa', 'livre')),
  dica         text not null default '',
  alternativas text[] not null default '{}'
);

-- treinos A/B/C de cada aluno. A lista de exercícios vai inteira num campo JSON:
-- [{"id":"agachamento","series":4,"reps":"8–10","desc":90,"carga":40,"obs":"..."}]
create table public.treinos (
  id         uuid primary key default gen_random_uuid(),
  aluno_id   uuid not null references public.alunos(id) on delete cascade,
  ordem      int not null default 0,
  letra      text not null,
  nome       text not null,
  local      text not null default 'academia' check (local in ('academia', 'casa', 'livre')),
  circuito   boolean not null default false,
  exercicios jsonb not null default '[]',
  unique (aluno_id, letra)
);

-- treino feito. series = [{"ex":"agachamento","kg":40,"reps":10}, ...]
create table public.sessoes (
  id         uuid primary key default gen_random_uuid(),
  aluno_id   uuid not null references public.alunos(id) on delete cascade,
  data       date not null default current_date,
  feito_em   timestamptz not null default now(),
  letra      text not null,
  nome       text not null,
  duracao    int,                                   -- minutos
  series     jsonb not null default '[]',
  volume     numeric not null default 0,            -- soma de kg × reps
  esforco    int check (esforco between 1 and 10),  -- RPE
  dor        text,
  comentario text not null default '',
  recordes   text[] not null default '{}'
);
create index on public.sessoes (aluno_id, data);

-- check-in semanal. O aluno escreve; o Jorge só pode preencher a resposta
create table public.checkins (
  id           uuid primary key default gen_random_uuid(),
  aluno_id     uuid not null references public.alunos(id) on delete cascade,
  data         date not null default current_date,
  enviado_em   timestamptz not null default now(),
  peso         numeric(5,1),
  cintura      numeric(5,1),
  sono         int check (sono between 1 and 5),
  energia      int check (energia between 1 and 5),
  estresse     int check (estresse between 1 and 5),
  dieta        int check (dieta between 1 and 5),
  dor          text,
  comentario   text not null default '',
  resposta     text,
  respondido_em timestamptz
);
create index on public.checkins (aluno_id, data);

-- hábitos marcados no dia (água, proteína, passos, sono)
create table public.habitos (
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  dia      date not null default current_date,
  habito   text not null,
  primary key (aluno_id, dia, habito)
);

-- mensalidades pagas. Só o Jorge registra; o aluno vê as dele
create table public.pagamentos (
  id        uuid primary key default gen_random_uuid(),
  aluno_id  uuid not null references public.alunos(id) on delete cascade,
  pago_em   date not null default current_date,
  valor     numeric(10,2) not null,
  referente date                                   -- vencimento que esse pagamento quitou
);

-- recado da semana do Jorge pra todos os alunos dele
create table public.recados (
  id           uuid primary key default gen_random_uuid(),
  treinador_id uuid not null references public.perfis(id) on delete cascade,
  texto        text not null,
  publicado_em timestamptz not null default now()
);

-- fotos de evolução. O arquivo fica no bucket privado "fotos", na pasta <id do aluno>/
create table public.fotos (
  id       uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  caminho  text not null unique,                   -- ex.: 7f3c.../2026-10-10.jpg
  tirada_em date not null default current_date
);


-- ---------------------------------------------------------------------
-- 2. FUNÇÕES QUE AS REGRAS USAM
-- Ficam num schema "privado", que o app não enxerga pela internet.
-- "security definer" = a função consulta a tabela alunos sem esbarrar
-- na própria regra de alunos (senão a regra chamaria a si mesma).
-- ---------------------------------------------------------------------
create schema if not exists privado;
grant usage on schema privado to authenticated;

-- quem está logado é treinador?
create function privado.sou_treinador() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfis
                 where id = (select auth.uid()) and papel = 'treinador');
$$;

-- esse aluno é meu aluno? (pra quem é treinador)
create function privado.sou_treinador_de(aluno uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.alunos
                 where id = aluno and treinador_id = (select auth.uid()));
$$;

-- esse aluno sou eu? (aluno desligado perde o acesso)
create function privado.sou_o_aluno(aluno uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.alunos
                 where id = aluno and usuario_id = (select auth.uid()) and ativo);
$$;

-- o treinador de quem está logado (pro aluno ler recados e exercícios do Jorge)
create function privado.meu_treinador() returns uuid
language sql stable security definer set search_path = '' as $$
  select treinador_id from public.alunos
  where usuario_id = (select auth.uid()) and ativo limit 1;
$$;

-- pasta da foto: "7f3c.../foto.jpg" → é minha ou do meu aluno?
create function privado.posso_ver_pasta(pasta text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.alunos
                 where id::text = pasta
                   and (treinador_id = (select auth.uid())
                        or (usuario_id = (select auth.uid()) and ativo)));
$$;

create function privado.pasta_e_minha(pasta text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.alunos
                 where id::text = pasta and usuario_id = (select auth.uid()) and ativo);
$$;

revoke all on all functions in schema privado from public;
grant execute on all functions in schema privado to authenticated;


-- ---------------------------------------------------------------------
-- 3. LIGA O RLS EM TODAS AS TABELAS
-- Com RLS ligado e sem regra, ninguém vê nada. Cada regra abaixo abre
-- só o necessário.
-- ---------------------------------------------------------------------
alter table public.perfis          enable row level security;
alter table public.alunos          enable row level security;
alter table public.notas_treinador enable row level security;
alter table public.exercicios      enable row level security;
alter table public.treinos         enable row level security;
alter table public.sessoes         enable row level security;
alter table public.checkins        enable row level security;
alter table public.habitos         enable row level security;
alter table public.pagamentos      enable row level security;
alter table public.recados         enable row level security;
alter table public.fotos           enable row level security;

-- quem não está logado (anon) não toca em nada
revoke all on all tables in schema public from anon;


-- ---------------------------------------------------------------------
-- 4. AS REGRAS (policies)
-- "using"      = quais linhas a pessoa consegue ver / alterar / apagar
-- "with check" = o que a pessoa pode gravar
-- ---------------------------------------------------------------------

-- perfis: cada um vê o seu. Ninguém troca o próprio papel (não tem regra de update)
create policy "ver o próprio perfil" on public.perfis for select to authenticated
  using (id = (select auth.uid()));

-- alunos: o Jorge cuida da ficha; o aluno só lê a dele
create policy "treinador vê seus alunos" on public.alunos for select to authenticated
  using (treinador_id = (select auth.uid()));
create policy "aluno vê a própria ficha" on public.alunos for select to authenticated
  using (usuario_id = (select auth.uid()) and ativo);
create policy "treinador cadastra aluno" on public.alunos for insert to authenticated
  with check (treinador_id = (select auth.uid()) and (select privado.sou_treinador()));
create policy "treinador edita seus alunos" on public.alunos for update to authenticated
  using (treinador_id = (select auth.uid()))
  with check (treinador_id = (select auth.uid()));
create policy "treinador apaga seus alunos" on public.alunos for delete to authenticated
  using (treinador_id = (select auth.uid()));

-- notas do treinador: só o Jorge
create policy "só o treinador" on public.notas_treinador for all to authenticated
  using ((select privado.sou_treinador_de(aluno_id)))
  with check ((select privado.sou_treinador_de(aluno_id)));

-- exercícios: todo mundo logado lê a base; o aluno lê também os do Jorge dele
create policy "ler biblioteca" on public.exercicios for select to authenticated
  using (treinador_id is null
         or treinador_id = (select auth.uid())
         or treinador_id = (select privado.meu_treinador()));
create policy "treinador cria exercício" on public.exercicios for insert to authenticated
  with check (treinador_id = (select auth.uid()) and (select privado.sou_treinador()));
create policy "treinador edita exercício" on public.exercicios for update to authenticated
  using (treinador_id = (select auth.uid()))
  with check (treinador_id = (select auth.uid()));
create policy "treinador apaga exercício" on public.exercicios for delete to authenticated
  using (treinador_id = (select auth.uid()));

-- treinos: o aluno lê os dele; quem monta é o Jorge
create policy "ver treinos" on public.treinos for select to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "treinador monta treino" on public.treinos for all to authenticated
  using ((select privado.sou_treinador_de(aluno_id)))
  with check ((select privado.sou_treinador_de(aluno_id)));

-- sessões (treino feito): o aluno registra e corrige; o Jorge vê, e também registra
-- (aluno presencial) e apaga
create policy "ver sessões" on public.sessoes for select to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "registrar sessão" on public.sessoes for insert to authenticated
  with check ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "corrigir sessão" on public.sessoes for update to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)))
  with check ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "treinador apaga sessão" on public.sessoes for delete to authenticated
  using ((select privado.sou_treinador_de(aluno_id)));

-- check-in: o aluno manda; o Jorge responde
create policy "ver check-ins" on public.checkins for select to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "aluno manda check-in" on public.checkins for insert to authenticated
  with check ((select privado.sou_o_aluno(aluno_id)) and resposta is null);
create policy "treinador responde check-in" on public.checkins for update to authenticated
  using ((select privado.sou_treinador_de(aluno_id)))
  with check ((select privado.sou_treinador_de(aluno_id)));
-- o Jorge só consegue mexer na resposta, nunca no que o aluno escreveu (peso, comentário...)
revoke update on public.checkins from authenticated;
grant update (resposta, respondido_em) on public.checkins to authenticated;

-- hábitos: o aluno marca e desmarca; o Jorge vê
create policy "ver hábitos" on public.habitos for select to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "aluno marca hábito" on public.habitos for insert to authenticated
  with check ((select privado.sou_o_aluno(aluno_id)));
create policy "aluno desmarca hábito" on public.habitos for delete to authenticated
  using ((select privado.sou_o_aluno(aluno_id)));

-- pagamentos: o Jorge registra; o aluno só lê os dele
create policy "ver pagamentos" on public.pagamentos for select to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "treinador registra pagamento" on public.pagamentos for all to authenticated
  using ((select privado.sou_treinador_de(aluno_id)))
  with check ((select privado.sou_treinador_de(aluno_id)));

-- recados: o Jorge publica; os alunos dele leem
create policy "ver recados" on public.recados for select to authenticated
  using (treinador_id = (select auth.uid()) or treinador_id = (select privado.meu_treinador()));
create policy "treinador publica recado" on public.recados for all to authenticated
  using (treinador_id = (select auth.uid()))
  with check (treinador_id = (select auth.uid()) and (select privado.sou_treinador()));

-- fotos (a lista): o aluno põe e tira as dele; o Jorge só vê
create policy "ver fotos" on public.fotos for select to authenticated
  using ((select privado.sou_o_aluno(aluno_id)) or (select privado.sou_treinador_de(aluno_id)));
create policy "aluno adiciona foto" on public.fotos for insert to authenticated
  with check ((select privado.sou_o_aluno(aluno_id)) and caminho like aluno_id::text || '/%');
create policy "aluno apaga foto" on public.fotos for delete to authenticated
  using ((select privado.sou_o_aluno(aluno_id)));


-- ---------------------------------------------------------------------
-- 5. FOTOS (os arquivos): bucket privado, uma pasta por aluno
-- Sem link público: o app pede um link que expira em poucos minutos.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('fotos', 'fotos', false)
  on conflict (id) do nothing;

create policy "fotos: ver as minhas ou dos meus alunos" on storage.objects for select to authenticated
  using (bucket_id = 'fotos' and privado.posso_ver_pasta((storage.foldername(name))[1]));
create policy "fotos: aluno envia na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and privado.pasta_e_minha((storage.foldername(name))[1]));
create policy "fotos: aluno apaga as próprias" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and privado.pasta_e_minha((storage.foldername(name))[1]));


-- ---------------------------------------------------------------------
-- 6. CADASTRO SÓ POR CONVITE
-- O Jorge cadastra o aluno com o e-mail e manda o convite pelo Supabase.
-- Quando a conta é criada com esse e-mail, ela se liga sozinha à ficha.
-- Conta criada com e-mail que não está em nenhuma ficha não vira nada:
-- sem perfil, as regras acima não deixam ver nenhuma linha.
-- ---------------------------------------------------------------------
create function privado.ligar_conta_nova() returns trigger
language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  select id, nome into a from public.alunos
   where lower(email) = lower(new.email) and usuario_id is null and ativo
   order by criado_em limit 1;
  if found then
    update public.alunos set usuario_id = new.id where id = a.id;
    insert into public.perfis (id, papel, nome) values (new.id, 'aluno', a.nome)
      on conflict (id) do nothing;
  end if;
  return new;
end $$;

create trigger ao_criar_conta after insert on auth.users
  for each row execute function privado.ligar_conta_nova();

-- e o contrário: o Jorge cadastra a ficha de alguém que já tem conta
create function privado.ligar_ficha_nova() returns trigger
language plpgsql security definer set search_path = '' as $$
declare u uuid;
begin
  if new.usuario_id is null then
    select id into u from auth.users where lower(email) = lower(new.email);
    if u is not null and not exists (select 1 from public.perfis where id = u and papel = 'treinador')
       and not exists (select 1 from public.alunos where usuario_id = u) then
      new.usuario_id := u;
      insert into public.perfis (id, papel, nome) values (u, 'aluno', new.nome)
        on conflict (id) do nothing;
    end if;
  end if;
  return new;
end $$;

create trigger ao_cadastrar_aluno before insert on public.alunos
  for each row execute function privado.ligar_ficha_nova();

-- o aluno não pode ser "trocado de dono" nem ter a conta trocada por update
create function privado.travar_campos_do_aluno() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.treinador_id <> old.treinador_id then
    raise exception 'não dá pra trocar o treinador do aluno';
  end if;
  if new.usuario_id is distinct from old.usuario_id and current_user = 'authenticated' then
    raise exception 'a conta do aluno é ligada pelo convite, não à mão';
  end if;
  return new;
end $$;

create trigger travar_campos before update on public.alunos
  for each row execute function privado.travar_campos_do_aluno();
