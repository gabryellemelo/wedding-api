#!/bin/bash

# Script para matar processos em portas específicas
# Uso: ./kill-port.sh 3000
#      ./kill-port.sh 3000 5000 8000

if [ $# -eq 0 ]; then
    echo "Uso: ./kill-port.sh [porta1] [porta2] ..."
    echo "Exemplo: ./kill-port.sh 3000 5000"
    exit 1
fi

for port in "$@"; do
    PID=$(lsof -ti:$port 2>/dev/null)
    if [ -z "$PID" ]; then
        echo "Porta $port está livre"
    else
        kill -9 $PID 2>/dev/null
        echo "Processo na porta $port foi encerrado (PID: $PID)"
    fi
done
