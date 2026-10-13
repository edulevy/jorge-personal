#!/usr/bin/env bash
# Monta o banco do zero num PostgreSQL do computador e roda todos os testes.
# SÓ PRA TESTE LOCAL. No Supabase, siga o passo a passo do LEIA-ME.
#
# Uso:   bash supabase/teste-local/rodar-testes.sh <pasta do bin do PostgreSQL> [porta]
# Ex.:   bash supabase/teste-local/rodar-testes.sh "C:/pg/pgserver/pginstall/bin" 54329
# O PostgreSQL precisa estar rodando nessa porta, com o usuário "postgres" sem senha.
# Sem PostgreSQL instalado: ver como baixar um no LEIA-ME, "Testar no computador".
set -u
BIN="${1:?informe a pasta do bin do PostgreSQL}"
PORTA="${2:-54329}"
AQUI="$(cd "$(dirname "$0")/.." && pwd)"
export PGCLIENTENCODING=UTF8
PSQL=("$BIN/psql" -p "$PORTA" -U postgres -q -v ON_ERROR_STOP=1)

"${PSQL[@]}" -c "drop database if exists jorge_teste" -c "create database jorge_teste" >/dev/null || exit 1

for f in "$AQUI/teste-local/imitar-supabase.sql" "$AQUI"/migrations/*.sql; do
  if ! "${PSQL[@]}" -d jorge_teste -f "$f" >/dev/null 2>"$AQUI/teste-local/.erro.txt"; then
    echo "ERRO ao montar o banco em $(basename "$f"):"; cat "$AQUI/teste-local/.erro.txt"; exit 1
  fi
done
rm -f "$AQUI/teste-local/.erro.txt"
echo "Banco montado: $(ls "$AQUI"/migrations/*.sql | wc -l) migrações."

falhou=0
for t in "$AQUI"/testes/*.sql; do
  echo; echo "=== $(basename "$t")"
  saida="$("${PSQL[@]}" -d jorge_teste -f "$t" 2>&1)"
  echo "$saida" | grep -E "NOTICE:  OK|FALHOU|PASSARAM" | sed 's/^.*NOTICE:  //; s/^.*ERROR:  //'
  echo "$saida" | grep -q "PASSARAM" || falhou=1
done

"${PSQL[@]}" -c "drop database jorge_teste" >/dev/null
echo
if [ "$falhou" = 0 ]; then echo "RESULTADO: tudo passou."; else echo "RESULTADO: ALGUM TESTE FALHOU (veja acima)."; exit 1; fi
