# autoblockerclient

O "autoblockerclient" (a partir daqui referido como Bloqueador) é um serviço projetado para automatizar o processo de bloqueio de clientes em violação de contrato ou com problemas de serviço. Ele é executado no servidor do cliente e requer o ID de um contrato, criptografado, como parâmetro essencial.

## Intenção do Projeto:

A intenção do Bloqueador é fornecer uma solução eficiente e automatizada para garantir o cumprimento de contratos e manter a integridade dos serviços oferecidos. Ao enviar solicitações regulares para o servidor de informações "IXC-Buffer" (a partir daqui referido como IXCBS), o Bloqueador verifica o status do contrato e, se necessário, toma medidas para interromper o serviço "Asterisk", impedindo assim o uso não autorizado dos recursos.

## Modo de funcionamento simplificado:

* A cada X:05 (todo minuto 5, de toda hora), o Bloqueador envia uma requisição para o servidor IXCBS, utilizando o contrato criptografado como parâmetro da requisição. 
* O servidor recebe essa requisição com o contrato criptografado e retorna diversas informações do contrato, incluindo se está bloqueado ou não. 
* Com base no retorno recebido do servidor IXCBS, o Bloqueador decide se deve ou não parar o serviço "Asterisk".
* Se o contrato estiver bloqueado, o Bloqueador interrompe o serviço Asterisk, e envia uma requisição de notificação. Da mesma forma, se um cliente estiver bloqueado e for desbloqueado no sistema, o Bloqueador coleta essa informação, e ativa automaticamente o serviço Asterisk, enviando uma requisição de notificação.

### Quickstart:

* `yum install -y wget` 
* `wget https://github.com/adriankubinyete/autoblockerclient/archive/refs/tags/<TAG_A_INSTALAR>.tar.gz`
* `mkdir -p ./.autoblockerclient`
* `tar -xvf <TAG_A_INSTALAR>.tar.gz -C ./.autoblockerclient --strip-components 1`
* `rm -f <TAG_A_INSTALAR>.tar.gz` (opcional)
* `chmod +x ./.autoblockerclient/*.sh`
* `mv .env.example .env`
A partir daqui, há 2 opções:
* Instalação/configuração "automática"
    * `./.autoblockerclient/install.sh --help`
    * `./.autoblockerclient/install.sh --webhook-url "Webhook para notificar erros no Bloqueador" --buffer-protocol "http/https" --buffer-url "url do IXCBS" --buffer-port "port do IXCBS" --jwt-user "usuario JWT IXCBS" --jwt-password "senha JWT IXCBS" -c "contrato encriptografado com a mesma salt do IXCBS"`
        * **EXEMPLO**: `./.autoblockerclient/install.sh --webhook-url "https://discord.com/api/webhooks/1/1" --buffer-protocol "http" --buffer-url "server.ixcbs.com.br" --buffer-port "9090" --jwt-user "jwtuser" --jwt-password "jwtpasswordauth" -c "sha256(meuContrato)"`
          *Observação importante: "sha256()" não é uma função padrão em bash. Estou apenas explicitando que o ideal é ser uma informação encriptografada.*
* Instalação manual
    * Acesse o arquivo ".env" e **edite manualmente cada campo** com as informações adequadas.
    * Rode o app.js com o pm2: "`pm2 start ./.autoblockerclient/app.js --name NOME_PRO_SERVICO_DO_PM2"`
    * Recomendo que salve o estado do pm2 `pm2 save` e adicione-o para iniciar no startup do sistema `pm2 startup`
 
### Atualizando o bloqueador:

Há um shell script utilitário no repositório, para facilitar a atualização do Bloqueador para novas versões, movendo automaticamente o seu arquivo ".env" e re-inicializando o pm2.
É importante notar que o script de atualização vai criar uma pasta nova para a nova versão: **/parent/block-antigo/update.sh** vai criar o diretório **/parent/block-novo**. Também é interessante notar que, ao inicializar o pm2, o nome do serviço do pm2 será "AB_<CONTRATO QUE ESTIVER NO .env>"
**Modo de uso**:
   * `./update.sh --help`
   * `./update.sh -t <NOVA_TAG_A_INSTALAR>`

Também há um utilitário para a atualização em lote de diversas centrais diferentes, para caso utilize o programa Termius, pode utilizá-lo para facilitar a tarefa de atualizar várias máquinas diferentes. É importante notar que esse utilitário assume diversas coisas específicas para o MEU uso, então recomendo que leia e adapte antes.

<details><summary>Utilitário aqui</summary>
   Em suma, você atualiza "PATTERN", e "NOVA_VERSAO", e caso queira que o arquivo .env seja editado também, seta os parâmetros no array CONFIGURATIONS, onde "CONFIGURAÇÃO/string VALOR/string OVERWRITE/boolean"
   <br><br>
   Exemplo: Quero que, usando esse utilitário em diversas centrais, sete o novo parâmetro FOO para o valor BAR, e se já tiver esse parâmetro, substitua o valor, independente de qual seja, a linha que coloco no CONFIGURATIONS deve ser: "FOO BAR true", onde "FOO" é o campo que quero conferir se existe ou não, "BAR" é o valor que quero setar àquele campo, e "true" significando que quero substituir o valor, caso tenha algum valor previamente
   <br><br>
   Para utilizar no serviço Termius, é só colar o código inteiro à baixo, em um Snippet.
   <br><br>
   
   ```
# Definindo as variáveis globais
PATTERN="autoblockerclient"
NOVA_VERSAO="0.2.2"

# Lista de configurações a serem modificadas (opcional)
CONFIGURATIONS=(
    "LOGFILE_SPAN 30 false"
)

# ERROR CODES:
# 10 : Não localizou a pasta baseada na PATTERN
# 11 : Encontrou várias pastas no filtro: esperava APENAS 1.
# 12 : A versão que está instalando, já está instalada no host.
# 13 : Erro ao instalar a update através do './update.sh'
#  0 : Sucesso, a versão que está no servidor É a versão que está tentando instalar.

# Função para adicionar ou modificar uma configuração no arquivo .env
# Uso: modifyEnv ENV_PATH CONFIGURACAO VALOR [OVERWRITE]
# OVERWRITE (opcional): Defina como "true" para sobrescrever se a configuração já existir
modifyEnv() {
    local ENV_PATH="$1"
    local CONFIG="$2"
    local VALUE="$3"
    local OVERWRITE="$4"

    # Verifica se o arquivo .env existe
    if [ ! -f "$ENV_PATH" ]; then
        echo "Arquivo .env não encontrado em '$ENV_PATH'"
        return 1
    fi

    # Verifica se a configuração já existe no arquivo .env
    if grep -q "^$CONFIG=" "$ENV_PATH"; then
        if [ "$OVERWRITE" = "true" ]; then
            # Sobrescreve o valor da configuração se a opção de sobrescrever estiver definida
            sudo sed -i "s|^$CONFIG=.*|$CONFIG=$VALUE|" "$ENV_PATH" && \
            echo "Configuração '$CONFIG' sobrescrita com valor '$VALUE'" || \
            echo "Erro ao sobrescrever a configuração '$CONFIG'"
        else
            echo "Configuração '$CONFIG' já existe no arquivo .env. Não foi feita nenhuma alteração."
        fi
    else
        # Adiciona a configuração ao arquivo .env
        echo "$CONFIG=$VALUE" | sudo tee -a "$ENV_PATH" > /dev/null && \
        echo "Configuração '$CONFIG' adicionada com valor '$VALUE'" || \
        echo "Erro ao adicionar a configuração '$CONFIG'"
    fi
}

# Função principal
main() {
    # Conferindo se há algum resultado para esta pattern
    RES=$(find . -maxdepth 1 -name "*$PATTERN*" -printf "%f\n");
    [ -z "$RES" ] && { echo "Não há resultados para a pattern '$PATTERN'. Não é possível prosseguir."; exit 10; }

    # Conferindo se é EXATAMENTE 1 resultado
    QTD_RES=$(echo "$RES" | wc -l); 
    echo "Resultados localizados pelo padrão '$PATTERN': $QTD_RES"; 
    [ "$QTD_RES" -ne 1 ] && { echo "Há mais resultados do que o esperado para a pattern '$PATTERN'! Não é possível prosseguir."; exit 11; }

    # Conferindo se a versão que encontrou é a que está tentando instalar:
    # Verifica se a versão que encontrou é a mesma que está tentando instalar
    if [[ "$RES" =~ ([0-9]+\.[0-9]+\.[0-9]+) ]]; then
        FOUND_VERSION="${BASH_REMATCH[1]}"
        if [ "$FOUND_VERSION" = "$NOVA_VERSAO" ]; then
            echo "A versão encontrada ('$FOUND_VERSION') é a mesma que está tentando instalar ('$NOVA_VERSAO')."
            exit 12  # Código de saída para "Not Modified"
        fi
    fi

    # A partir daqui, já sei qual o caminho até o bloqueador: anoto
    BLOCKER_PATH="$(pwd)/$RES";
    echo "BLOCKER PATH: '$BLOCKER_PATH'";

    # Aplicando as configurações definidas na lista, se houver alguma
    if [ ${#CONFIGURATIONS[@]} -gt 0 ]; then
        for CONFIGURATION in "${CONFIGURATIONS[@]}"; do
            IFS=' ' read -r CONFIG VALUE OVERWRITE <<< "$CONFIGURATION"
            modifyEnv "$BLOCKER_PATH/.env" "$CONFIG" "$VALUE" "$OVERWRITE"
        done
    else
        echo "Nenhuma configuração especificada para modificar."
    fi

    # Atualizando para a nova versão
    sudo "$BLOCKER_PATH/update.sh" -t "$NOVA_VERSAO" && { echo -e "\n\nReinstalação bem sucedida"; sudo rm -rf "$BLOCKER_PATH"; exit 0; } || { echo -e "\n\nDeu errado..."; exit 13; }
}

# Chamada da função principal
main
   ```
</details>
