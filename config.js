/* Endereço do banco (Supabase → Project Settings → API).
   Vazio = o app roda como demonstração, com dados fictícios no navegador.
   A "chave" aqui é a anon / publishable: ela é pública de propósito (vai pro navegador
   de todo mundo). Quem protege os dados são as regras (RLS) do banco.
   NUNCA coloque aqui a service_role / secret key.
   "treinador" é o id da conta do Jorge (passo 5 do supabase/LEIA-ME.md): é pra ele
   que vão os cadastros do "Quero ser aluno". */
window.CONFIG_BANCO = {
  url: "",
  chave: "",
  treinador: ""
};
