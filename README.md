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
* `mkdir -p ./.bloqueador`
* `tar -xvf <TAG_A_INSTALAR>.tar.gz -C ./.bloqueador --strip-components 1`
* `(opcional) rm -f <TAG_A_INSTALAR>.tar.gz`
* `chmod +x ./.bloqueador/*.sh`
* `mv .env.example .env`
A partir daqui, há 2 opções:
* Instalação/configuração "automática"
    * `./install.sh --help`
    * `./install.sh --webhook-url "Webhook para notificar erros no Bloqueador" --buffer-protocol "http/https" --buffer-url "url do IXCBS" --buffer-port "port do IXCBS" --jwt-user "usuario JWT IXCBS" --jwt-password "senha JWT IXCBS" -c "contrato encriptografado com a mesma salt do IXCBS"`
        * **EXEMPLO**: `./install.sh --webhook-url "https://discord.com/api/webhooks/1/1" --buffer-protocol "http" --buffer-url "server.ixcbs.com.br" --buffer-port "9090" --jwt-user "jwtuser" --jwt-password "jwtpasswordauth" -c "sha256(meuContrato)"`
          *Observação importante: "sha256()" não é uma função padrão em bash. Estou apenas explicitando que o ideal é ser uma informação encriptografada.*
* Instalação manual
    * Acesse o arquivo ".env" e **edite manualmente cada campo** com as informações adequadas.
    * Rode o app.js com o pm2: "`pm2 start ./.bloqueador/app.js --name NOME_PRO_SERVICO_DO_PM2"`
    * Recomendo que salve o estado do pm2 `pm2 save` e adicione-o para iniciar no startup do sistema `pm2 startup`
