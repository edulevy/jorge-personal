# Banco de dados do app do Jorge

Tudo aqui foi feito na branch `banco-de-dados`. A `main` (o protótipo publicado) não mudou.

## As peças, em uma frase cada

| Peça | O que é |
|---|---|
| **Supabase** | Serviço que dá o banco (PostgreSQL), o login e a pasta de fotos. |
| **Tabela** | Uma planilha com colunas fixas. Ex.: `checkins` tem uma linha por check-in. |
| **RLS** (Row Level Security) | Regra que o banco checa **em toda leitura e escrita**: "esta pessoa pode ver/mexer nesta linha?". |
| **Policy** | Cada regra do RLS. Ex.: "aluno vê só os próprios check-ins". |
| **anon key** | Chave pública, vai no `config.js`. Sozinha não abre nada: quem decide é o RLS. |
| **service_role key** | Chave mestra, **passa por cima do RLS**. Nunca vai no app nem no git. |

A ideia mais importante: **a proteção mora no banco, não no app**. Mesmo que alguém abra o código do
app no navegador e mande pedidos "na mão", o banco responde só o que aquela pessoa pode ver.

## Arquivos

| Arquivo | Pra que serve |
|---|---|
| `migrations/20261010000001_esquema.sql` | Cria as 11 tabelas, liga o RLS e escreve todas as regras. Roda **uma vez**. |
| `testes/testes-protecao.sql` | 27 testes: entra como Jorge, aluna, outra treinadora, intruso e visitante e tenta furar as regras. Não deixa nada gravado. |
| `teste-local/imitar-supabase.sql` | Só pra testar num PostgreSQL comum no computador. **Não rodar no Supabase.** |
| `../config.js` | Endereço e chave pública. Vazio = modo demonstração. |
| `../banco.js` | Faz o app conversar com o banco: login, leitura, gravação e fila sem internet. |

## Quem vê o quê (o que os testes conferem)

| | Jorge | Aluno (o próprio) | Outro aluno | Conta sem convite | Sem login |
|---|---|---|---|---|---|
| Ficha (nome, objetivo, restrição, mensalidade) | vê e edita | **só vê** | nada | nada | nada |
| Anotações do Jorge sobre o aluno | vê e edita | **nada** | nada | nada | nada |
| Treino montado | monta | vê | nada | nada | nada |
| Treino feito | vê, registra, apaga | registra e corrige | nada | nada | nada |
| Check-in | **só escreve a resposta** | manda (não responde) | nada | nada | nada |
| Pagamentos | registra | só vê | nada | nada | nada |
| Fotos | vê | põe e apaga, **só na pasta dele** | nada | nada | nada |

Ainda conferido pelos testes:
- Aluno desligado (`ativo = false`) perde o acesso, e o histórico fica com o Jorge.
- Uma treinadora não enxerga nada dos alunos da outra.
- Ninguém se promove a treinador sozinho.

## Cadastro só por convite (como funciona)

1. O Jorge cadastra o aluno no app, com nome e e-mail.
2. Manda o link do app pelo WhatsApp (o app já monta a mensagem).
3. O aluno abre, digita o e-mail e recebe um **link de acesso**. Não tem senha.
4. Quando a conta nasce, um gatilho no banco procura uma ficha com aquele e-mail e liga as duas.
5. Se alguém cria conta com um e-mail que o Jorge não cadastrou, a conta existe mas **não enxerga nada**.

## Passo a passo pra ligar de verdade

1. Criar conta em supabase.com → **New project**, região **South America (São Paulo)**. Guarde a senha do banco num gerenciador de senhas.
2. **SQL Editor** → colar `migrations/20261010000001_esquema.sql` → **Run**.
3. **SQL Editor** → colar `testes/testes-protecao.sql` → **Run**. Tem que aparecer `TODOS OS TESTES PASSARAM`.
4. **Authentication → URL Configuration**:
   - em **Site URL**, o endereço do app;
   - em **Redirect URLs**, `http://localhost:8000/**` (pra testar no PC) e o endereço publicado.
5. Entrar no app com o e-mail do Jorge (a conta é criada). Depois, no SQL Editor, transformar essa conta em treinador:
   ```sql
   insert into public.perfis (id, papel, nome)
   select id, 'treinador', 'Jorge' from auth.users where email = 'EMAIL-DO-JORGE';
   ```
6. **Project Settings → API**: copiar a **Project URL** e a **anon / publishable key** pro `config.js`.
7. Testar no PC: na pasta `prototipo`, rodar `python -m http.server 8000` e abrir `http://localhost:8000`.

## Antes de entrar aluno de verdade

- [ ] Repositório do GitHub **privado** (hoje é público).
- [ ] Testes rodados no projeto real (passo 3).
- [ ] E-mail próprio pra mandar os links (Authentication → SMTP; ex.: Resend). O e-mail grátis do Supabase manda poucos por hora.
- [ ] Termo de uso dos dados (LGPD) no primeiro acesso: o app guarda dados de saúde (lesões, peso, fotos).
- [ ] Plano Pro (~US$ 25/mês) quando tiver aluno pagante, por causa do backup diário.

## O que ficou de fora (de propósito, por enquanto)

- **Biblioteca de exercícios e modelos de treino** continuam no `dados.js`. Só os exercícios que o Jorge cria vão pro banco.
- **Aluno sem treino montado** vê o modelo "Hipertrofia ABC" até o Jorge montar o dele.
- **Anamnese e termo LGPD**: falta criar as tabelas e as telas.
- **Fotos** sobem pro banco, mas a fila sem internet não vale pra elas (arquivo grande).
