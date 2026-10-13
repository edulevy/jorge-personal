-- "Cutucão" pra manter o projeto acordado no plano grátis do Supabase
-- (ele pausa depois de 7 dias sem uso). O GitHub chama isso a cada 3 dias:
-- supabase/automacao/manter-supabase-acordado.yml (vai pra .github/workflows/ quando ligar)
-- Não lê nem devolve dado nenhum: só responde "ok".
create function public.ping() returns text
language sql stable set search_path = '' as $$ select 'ok'::text $$;

revoke all on function public.ping() from public;
grant execute on function public.ping() to anon, authenticated;
