# Jorge Personal · protótipo

Protótipo do app de consultoria online do Jorge (personal trainer), pra apresentar a ideia.
**Todos os dados são fictícios.** Com o `config.js` vazio, o app roda como demonstração e tudo fica só no navegador de quem está usando.

**Banco de dados (branch `banco-de-dados`):** com o `config.js` preenchido, o app pede login e lê/grava no Supabase. Tabelas, regras de proteção (RLS), testes e passo a passo em [`supabase/LEIA-ME.md`](supabase/LEIA-ME.md).

- `?ver=aluno` abre direto na visão da aluna; `?ver=jorge` abre no painel do treinador.
- PWA: abre no celular e instala na tela inicial (Safari → Compartilhar → Adicionar à Tela de Início; Chrome → Instalar app).

| Quero mudar | Arquivo |
|---|---|
| Nome, cor, alunos, exercícios, treinos, modelos, dores do mercado | `dados.js` |
| Telas e comportamento | `app.js` |
| Cores e tamanhos | `app.css` |
| Ligar no banco | `config.js` (endereço e chave pública) |
| Conversa com o banco | `banco.js` |
| Tabelas e proteção | `supabase/` |
| Publicar versão nova no celular | subir `VERSAO` no `sw.js` |
