#/bin/bash -i

function colorir {
    declare -A cores
    local cores=(
        [preto]="0;30"
        [vermelho]="0;31"
        [verde]="0;32"
        [amarelo]="0;33"
        [azul]="0;34"
        [magenta]="0;35"
        [ciano]="0;36"
        [branco]="0;37"
        [preto_claro]="1;30"
        [vermelho_claro]="1;31"
        [verde_claro]="1;32"
        [amarelo_claro]="1;33"
        [azul_claro]="1;34"
        [magenta_claro]="1;35"
        [ciano_claro]="1;36"
        [branco_claro]="1;37"
        [laranja]="38;5;208"
        [rosa]="38;5;206"
        [azul_celeste]="38;5;45"
        [verde_lima]="38;5;118"
    )

    local cor=$(echo "$1" | tr '[:upper:]' '[:lower:]')
    local texto=$2
    local string='${cores['"\"$cor\""']}'
    eval "local cor_ansi=$string"
    local cor_reset="\e[0m"

    if [[ -z "$cor_ansi" ]]; then
        cor_ansi=${cores["branco"]}  # Cor padrão, caso a cor seja inválida
    fi

    # Imprimir o texto com a cor selecionada
    echo -e "\e[${cor_ansi}m${texto}${cor_reset}"
}

# Encerra o programa caso não tenha sido executado como root.
function verificar_root {
    echo "$(colorir 'azul' 'Conferindo se foi executado como root')..."
    if [ "$EUID" -ne 0 ]; then
        echo "Este script precisa ser executado como root."
        exit 1
    fi
}

# Verifica se foi repassado argumentos. Retorna Verdadeiro/Falso
function tem_argumentos {
    echo "$(colorir 'azul' 'Conferindo se tem argumentos')..."
    [ "$#" -gt 0 ]
}

function verificar_argumentos_obrigatorios {
    # Se VAR estiver vazia, execute exibir_ajuda, se não, ignora.
    [ -z "$VERSION" ]  && exibir_ajuda || :
}

# Função para exibir mensagens de erro e sair
function exibir_erro {
    echo "Erro: $1"
    exit 1
}

# Função para executar comandos e lidar com erros
function run {
    if [[ $DRY ]]; then
        echo "$(colorir 'verde' 'Simulando comando'): $*"
    else
        "$@" || exibir_erro "Falha ao executar o comando: $*"
    fi
}

function instalar_wget {
    echo "$(colorir 'azul' 'Instalando wget')..."
    run sudo yum install -y wget
}

function preparar_nova_versao {
    echo "$(colorir 'azul' 'Preparando nova versão')..."
    DOWNLOAD_URL=$REPO_ARCHIVE/$VERSION.tar.gz
    PARENT_FOLDER=$(dirname $CURRDIR)
    TAR_OUTPUT_FOLDER=$PARENT_FOLDER/$REPO_NAME-$VERSION
    NEW_DIR=$TAR_OUTPUT_FOLDER
    OLD_DIR=$CURRDIR

    echo "- Repository Archive Source : $REPO_ARCHIVE"
    echo "- Version (TAG) to Download : $VERSION"
    echo "- Download URL              : $DOWNLOAD_URL"
    echo "- OUTPUT Folder             : $TAR_OUTPUT_FOLDER"

    [ -d $NEW_DIR ] && echo "$(colorir 'vermelho' 'Versão já-existente...')" && exit 1

    puxar_repo "$DOWNLOAD_URL"
    extrair_tar_repo "$NEW_DIR"
    copiar_dotenv
}

function puxar_repo {
    echo "$(colorir 'azul' 'Puxando repositório')..."
    echo "PR_DL_URL: $1"
    PR_DL_URL=$1
    run wget $PR_DL_URL
}

function extrair_tar_repo {
    echo "$(colorir 'azul' 'Extraindo TAR')..."
    ETR_OUT=$1
    
    run mkdir -p $ETR_OUT
    run tar -xvf $VERSION.tar.gz -C $ETR_OUT --strip-components 1 && rm -f $VERSION.tar.gz
}

function copiar_dotenv {
    echo "$(colorir 'azul' 'Copiando arquivo de configuração da versão atual')..."
    run cp -v $OLD_DIR/.env $NEW_DIR/.env
}

function inicializar_pm_two {
    echo "$(colorir 'azul' 'Inicializando o PM2')..."
    CONTRATO=$(grep -Po "(?<=CONTRATO=).+" $NEW_DIR/.env 2>/dev/null)
    [ -z "$CONTRATO" ] && echo "$(colorir 'vermelho' 'Não há valor em contrato para inicializar o PM2.')" && exit 1

    pm2 delete AB_$CONTRATO 2>/dev/null && echo "AB_$CONTRATO encerrado." || echo "$(colorir 'magenta' "AB_$CONTRATO não estava inicializado, OK.")"
    run pm2 start $NEW_DIR/app.js --name AB_$CONTRATO -f
    run pm2 save --force
    run pm2 startup
    run pm2 save --force
}

# Função para instalar o Node.js usando NVM
function instalar_node {
    echo 'Instalando Node.js...'
    run sudo yum install -y curl
    run $NEW_DIR/node_setup_16.x.sh # Script de instalação oficial do NodeJ.js, removido apenas o sleep60 do aviso de depreciação.
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

function exibir_ajuda {
    echo "Uso: $0 [OPÇÕES]"
    echo "Exemplo: $0 --tag v0.1.0"
    echo "Opções:"
    echo "  -t, --tag                 Para qual versão atualizar. (TAG do Github)"
    echo "  --dry                     Executa em modo seco (simulação), sem fazer alterações."
    exit 1
}

# Inicializa variáveis
CURRDIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_OWNER=adriankubinyete
REPO_NAME=autoblockerclient
REPO_ARCHIVE=https://github.com/$REPO_OWNER/$REPO_NAME/archive/refs/tags
VERSION=""

# Função para processar argumentos
function processar_argumentos {
    echo "$(colorir 'azul' 'Processando os argumentos')..."
    while [ "$#" -gt 0 ]; do
        case "$1" in
            -t|--tag)
                VERSION="$2"
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

# // RUNTIME

echo "$(colorir 'azul' 'Inicializando')..."
echo "RUNNING DIRECTORY: $CURRDIR"
verificar_root

#args
if ! tem_argumentos "$@"; then
    exibir_ajuda
    exit 1
fi
processar_argumentos "$@"
verificar_argumentos_obrigatorios

#install dependencies
[ -z "$(rpm -qa | grep wget)" ] && instalar_wget || echo '- wget já está instalado -'

#fixing
preparar_nova_versao
# parar_pmtwo_antigo # Não preciso disso, pois 'pm2 start <app> --name <nome> -f' já força a re-execução do app. Contanto que eu utilize o mesmo nome, acredito que fique tudo certo

#starting
run cd $NEW_DIR

#install
[ -z "$(rpm -qa | grep nodejs)" ] && instalar_node || echo '- Nodejs já está instalado -'

npm ls &> /dev/null && echo '- Os packages do NPM já estão instaladas. -' || instalar_npm

[ -z "$(npm list -g | grep pm2 )" ] && instalar_pm_two || echo '- PM2 já está instalado -'
[ -z "$(pm2 list | grep "AB_")" ] && : || echo '//!// Já existe um Daemon do PM2 rodando. Forçando a criação... //!//'

inicializar_pm_two
