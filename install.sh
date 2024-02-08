#/bin/bash -i

# Encerra o programa caso não tenha sido executado como root.
function verificar_root {
    echo 'Conferindo se foi executado como root...'
    if [ "$EUID" -ne 0 ]; then
        echo "Este script precisa ser executado como root."
        exit 1
    fi
}

# Verifica se foi repassado argumentos. Retorna Verdadeiro/Falso
function tem_argumentos {
    echo 'Conferindo se tem argumentos...'
    [ "$#" -gt 0 ]
}

# Função para exibir mensagens de erro e sair
function exibir_erro {
    echo "Erro: $1"
    exit 1
}

# Função para executar comandos e lidar com erros
function run {
    if [[ $DRY ]]; then
        echo "Simulando comando: $*"
    else
        "$@" || exibir_erro "Falha ao executar o comando: $*"
    fi
}

# Função para instalar o Node.js usando NVM
function instalar_node {
    echo 'Instalando Node.js...'
    run sudo yum install -y curl
    run $CURRDIR/node_setup_16.x.sh # Script de instalação oficial do NodeJ.js, removido apenas o sleep60 do aviso de depreciação.
    run sudo yum install -y nodejs
    validar_node
}

# Função para validar se o Node.js foi instalado corretamente
function validar_node {
    echo 'Validando a versão do Node.js...'
    if [ "$(node --version)" != "v16.20.2" ]; then 
        echo "O node não foi instalado com êxito."
        exit 1
    fi
}

function instalar_npm {
    echo 'Instalando dependências do NPM...'
    run echo "DEBUG: Current DIR for NPM INSTALL: $(pwd)"
    run npm install
}

function instalar_pm_two {
    echo 'Instalando pm2...'
    run npm install -g pm2
}

function editar_env {
    echo 'Editando configurações do ".env"'

    # Geral
    run sed -i "s/CONTRATO=.*/CONTRATO=$CONTRATO/" "$CURRDIR/.env"
    run sed -i "s/VERBOSITY=.*/VERBOSITY=$LOG_VERBOSITY/" "$CURRDIR/.env"
    run sed -i "s/LOGFILE_VERBOSITY=.*/LOGFILE_VERBOSITY=$LOGFILE_VERBOSITY/" "$CURRDIR/.env"

    # Buffer
    run sed -i "s/REQ_PROTOCOL=.*/REQ_PROTOCOL=$BUFFER_PROTOCOL/" "$CURRDIR/.env"
    run sed -i "s/REQ_URL=.*/REQ_URL=$BUFFER_URL/" "$CURRDIR/.env"
    run sed -i "s/REQ_PORT=.*/REQ_PORT=$BUFFER_PORT/" "$CURRDIR/.env"

    # JWT
    run sed -i "s/JWT_USER=.*/JWT_USER=$JWT_USER/" "$CURRDIR/.env"
    run sed -i "s/JWT_PASSWORD=.*/JWT_PASSWORD=$JWT_PASSWORD/" "$CURRDIR/.env"

    # Hook
    run sed -i "s,NOTIFY_ERROR_WEBHOOK=.*,NOTIFY_ERROR_WEBHOOK=$WEBHOOK_URL," "$CURRDIR/.env"
}

function inicializar_pm_two {
    echo 'Inicializando o PM2...'
    run pm2 start $CURRDIR/app.js --name AB_$CONTRATO -f
    run pm2 save --force
    run pm2 startup
    run pm2 save --force
}

function exibir_ajuda {
    echo "Uso: $0 -c <CONTRATO> [OPÇÕES]"
    echo "Exemplo: $0 -h"
    echo "Opções:"
    echo "  -c, --contrato            Especifica o contrato."
    echo "  --dry                     Executa em modo seco (simulação), sem fazer alterações."
    echo "  -h, --help                Mostra esta mensagem de ajuda."
    echo "  --logfile-verbosity       Seta o nível de verbosidade dos arquivos de log para a aplicação que será instalada."
    echo "  --log-verbosity           Seta o nível de verbosidade dos logs em runtime para a aplicação que será instalada."
    echo "  --buffer-protocol         Seta o protocolo do Buffer (Servidor que acumula as informações do IXC)."
    echo "  --buffer-url              Seta a URL do Buffer (Servidor que acumula as informações do IXC)."
    echo "  --buffer-port             Seta a Porta do Buffer (Servidor que acumula as informações do IXC)."
    echo "  --jwt-user                Seta o usuário do JWT para a etapa de autenticação."
    echo "  --jwt-password            Seta a senha do JWT para a etapa de autenticação."
}

# Inicializa variáveis
CURRDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRATO=""
LOGFILE_VERBOSITY="6"
LOG_VERBOSITY="6"
WEBHOOK_URL=""
BUFFER_PROTOCOL=""
BUFFER_URL=""
BUFFER_PORT=""
JWT_USER=""
JWT_PASSWORD=""
DRY=""

# Função para processar argumentos
function processar_argumentos {
    echo 'Processando os argumentos...'
    while [ "$#" -gt 0 ]; do
        case "$1" in
            -c|--contrato)
                CONTRATO="$2"
                shift 2
                ;;
            --logfile-verbosity)
                LOGFILE_VERBOSITY="$2"
                shift 2
                ;;
            --log-verbosity)
                LOG_VERBOSITY="$2"
                shift 2
                ;;
            --webhook-url)
                WEBHOOK_URL="$2"
                shift 2
                ;;
            --buffer-protocol)
                BUFFER_PROTOCOL="$2"
                shift 2
                ;;
            --buffer-url)
                BUFFER_URL="$2"
                shift 2
                ;;
            --buffer-port)
                BUFFER_PORT="$2"
                shift 2
                ;;
            --jwt-user)
                JWT_USER="$2"
                shift 2
                ;;
            --jwt-password)
                JWT_PASSWORD="$2"
                shift 2
                ;;
            --dry|--dryrun|--dry-run)
                DRY=true
                shift
                ;;
            *)
                exibir_ajuda
                exit 1
                ;;
        esac
    done
}

function verificar_argumentos_obrigatorios {
    # Se VAR estiver vazia, execute exibir_ajuda, se não, ignora.
    [ -z "$CONTRATO" ]  && exibir_ajuda || :
    [ -z "$WEBHOOK_URL" ]  && exibir_ajuda || :
    [ -z "$BUFFER_PROTOCOL" ]  && exibir_ajuda || :
    [ -z "$BUFFER_URL" ]  && exibir_ajuda || :
    [ -z "$BUFFER_PORT" ]  && exibir_ajuda || :
    [ -z "$JWT_USER" ]  && exibir_ajuda || :
    [ -z "$JWT_PASSWORD" ]  && exibir_ajuda || :
}


# // RUNTIME

echo "Inicializando..."
echo "RUNNING DIRECTORY: $CURRDIR"
verificar_root

#args
if ! tem_argumentos "$@"; then
    exibir_ajuda
    exit 1
fi
processar_argumentos "$@"
verificar_argumentos_obrigatorios

#install
[ -z "$(rpm -qa | grep nodejs)" ] && instalar_node || echo '- Nodejs já está instalado -'
npm ls &> /dev/null && echo '- Os packages do NPM já estão instaladas. -' || instalar_npm

#init
editar_env
[ -z "$(npm list -g | grep pm2 )" ] && instalar_pm_two || echo '- PM2 já está instalado -'
[ -z "$(pm2 list | grep "AB_")" ] && : || echo '//!// Já existe um Daemon do PM2 rodando. Forçando a criação... //!//'
inicializar_pm_two

echo "Finalizado!"
