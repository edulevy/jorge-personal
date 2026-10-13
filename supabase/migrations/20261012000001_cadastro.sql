-- =====================================================================
-- Cadastro com aprovação ("Quero ser aluno"). Roda depois do esquema.
--
-- Como funciona, em português:
--   1. a pessoa entra no app com o e-mail (recebe o link de acesso);
--   2. preenche dados, anamnese, PAR-Q e aceita o termo → vira um pedido "pendente";
--   3. enquanto isso ela NÃO vê nada do app: só o próprio pedido;
--   4. o Jorge vê os pedidos dele e aprova (vira aluno) ou recusa.
-- O convite feito pelo Jorge (esquema, parte 6) continua valendo junto.
-- =====================================================================

create table public.cadastros (
  id           uuid primary key default gen_random_uuid(),
  treinador_id uuid not null references public.perfis(id) on delete cascade,  -- pra quem é o pedido
  usuario_id   uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email        text not null default '',     -- preenchido pelo banco com o e-mail do login (não confia no que vem do app)
  nome         text not null check (length(trim(nome)) > 1),
  idade        int check (idade between 10 and 100),
  sexo         text not null default '',
  tipo         text not null default 'Online' check (tipo in ('Online', 'Presencial', 'Híbrido')),
  objetivo     text not null default '',
  whatsapp     text not null default '',
  -- anamnese e PAR-Q: dado de saúde (sensível, LGPD)
  lesoes       text not null default '',
  remedios     text not null default '',
  rotina       text not null default '',
  dias         text not null default '',
  parq         boolean[] not null check (array_length(parq, 1) = 7),  -- 7 perguntas, sim/não
  termo_aceito_em timestamptz not null default now(),
  status       text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado')),
  aluno_id     uuid references public.alunos(id) on delete set null,  -- a ficha criada na aprovação
  enviado_em   timestamptz not null default now(),
  decidido_em  timestamptz
);
-- um pedido pendente por pessoa (não dá pra encher o Jorge de pedidos)
create unique index cadastros_um_pendente on public.cadastros (usuario_id) where status = 'pendente';

alter table public.cadastros enable row level security;
revoke all on public.cadastros from anon;


-- ---------- funções que as regras usam ----------
-- esse id é de um treinador?
create function privado.e_treinador(pessoa uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.perfis where id = pessoa and papel = 'treinador');
$$;

-- quem está logado já é aluno de alguém (ativo)?
create function privado.ja_sou_aluno() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.alunos where usuario_id = (select auth.uid()) and ativo);
$$;

revoke all on function privado.e_treinador(uuid), privado.ja_sou_aluno() from public;
grant execute on function privado.e_treinador(uuid), privado.ja_sou_aluno() to authenticated;


-- ---------- regras ----------
-- ver: a pessoa vê o próprio pedido; o Jorge vê os pedidos feitos pra ele
create policy "ver cadastro" on public.cadastros for select to authenticated
  using (usuario_id = (select auth.uid()) or treinador_id = (select auth.uid()));

-- enviar: só em nome próprio, só pra um treinador, só como "pendente",
-- e não vale pra quem já é aluno ou é treinador
create policy "enviar cadastro" on public.cadastros for insert to authenticated
  with check (
    usuario_id = (select auth.uid())
    and status = 'pendente' and aluno_id is null and decidido_em is null
    and (select privado.e_treinador(treinador_id))
    and not (select privado.sou_treinador())
    and not (select privado.ja_sou_aluno())
  );
-- sem regra de update/delete: ninguém muda o pedido na mão. Aprovar e recusar é pelas funções abaixo.

-- o e-mail e a hora vêm do banco, não do app
create function privado.preencher_cadastro() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select email into new.email from auth.users where id = new.usuario_id;
  new.enviado_em := now();
  new.termo_aceito_em := now();
  return new;
end $$;

create trigger ao_enviar_cadastro before insert on public.cadastros
  for each row execute function privado.preencher_cadastro();


-- ---------- aprovar e recusar (o app chama como "rpc") ----------
-- aprovar: cria a ficha do aluno já ligada à conta dele e marca o pedido
create function public.aprovar_cadastro(pedido uuid, mensalidade numeric default 200)
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

  insert into public.alunos (treinador_id, usuario_id, email, nome, tipo, objetivo, restricao, valor, vencimento)
  values (c.treinador_id, c.usuario_id, c.email, c.nome, c.tipo, c.objetivo, c.lesoes, mensalidade, current_date + 30)
  returning id into novo;
  insert into public.perfis (id, papel, nome) values (c.usuario_id, 'aluno', c.nome)
    on conflict (id) do nothing;

  update public.cadastros set status = 'aprovado', aluno_id = novo, decidido_em = now() where id = pedido;
  return novo;
end $$;

create function public.recusar_cadastro(pedido uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.cadastros set status = 'recusado', decidido_em = now()
   where id = pedido and treinador_id = (select auth.uid()) and status = 'pendente';
  if not found then
    raise exception 'pedido não encontrado ou já decidido' using errcode = '42501';
  end if;
end $$;

revoke all on function public.aprovar_cadastro(uuid, numeric), public.recusar_cadastro(uuid) from public, anon;
grant execute on function public.aprovar_cadastro(uuid, numeric), public.recusar_cadastro(uuid) to authenticated;
