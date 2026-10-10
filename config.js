/* Endereço do banco (Supabase → Project Settings → API).
   Vazio = o app roda como demonstração, com dados fictícios no navegador.
   A "chave" aqui é a anon / publishable: ela é pública de propósito (vai pro navegador
   de todo mundo). Quem protege os dados são as regras (RLS) do banco.
   NUNCA coloque aqui a service_role / secret key. */
window.CONFIG_BANCO = {
  url: "",
  chave: ""
};
