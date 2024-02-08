// Node.js v16.20.2

// Main:
// npm install node-schedul // Cron axios dotenv
// npm install axios        // Requests
// npm install dotenv       // .env config file
// npm install nodemon -g   // Development | OBS: Caso dê erro de permissão, executa "Set-ExecutionPolicy RemoteSigned -Scope CurrentUser" no Powershell.
// npm install pm2          // Production, o que vai "daemonizar" o serviço.

// Logging:
// npm install winston      // Log

// Discord-Webhook:
// npm install discord-webhook-node     // Webhook Handler

require('dotenv').config();
const schedule = require('node-schedule');
const { sendContractRequest } = require('./src/requests/get_contrato');
const { updateAsteriskStatus, getAsteriskStatus } = require('./src/asterisk');
const { generateLogger } = require('./src/configs/logging');
const { embedErro, hook } = require('./src/configs/webhook');
const { getHostIp } = require('./src/util');

let log = generateLogger('main-log', process.env.MAIN_LOG, process.env.VERBOSITY);

// Variáveis RUNTIME
let hashedContract = process.env.CONTRATO;
let bufferResponse; // Desnecessário

// (CRON) Configurações do heartbeat para atualizar a listagem de contratos.
const CRON = process.env.CRON;

const main = async () => {
    let asteriskStatus;

    // Obtendo o contrato
    response = await sendContractRequest(hashedContract);  
    if (!response || !response.hasOwnProperty('contract')) { // Falha para obter contrato
        log.critical('FAILING: As informações requisitadas do contrato não retornaram como esperado!');
        log.critical('FAILING: Response: ' + JSON.stringify(response));
        return;
    }

    // Obtendo o estado atual do Asterisk
    asteriskStatus = await getAsteriskStatus(log);
    if (!asteriskStatus) { // Falha para obter status do Asterisk: notificar
        contract = response.contract;
        contract_is_blocked = response.is_blocked;
        notifyWebhook('Não foi possível obter o status do Asterisk');
        return; // Encerro este heartbeat por aqui
    }

    contract = response.contract;
    contract_is_blocked = response.is_blocked;

    log.unit(`Status Req.     : ${response.status}`);
    log.unit(`is_blocked?     : ${contract_is_blocked}`);
    log.unit(`JSON Contrato   : ${JSON.stringify(contract)}`);
    log.unit(`ID_Cliente      : ${contract.id_cliente}`);
    log.unit(`ID_Contrato     : ${contract.id_contrato}`);
    log.unit(`Razao           : ${contract.razao}`);
    log.unit(`Fantasia        : ${contract.fantasia}`);
    log.unit(`CNPJ            : ${contract.cnpj_cpf}`);
    log.unit(`Contrato Ativo? : ${contract.ativo}`);
    log.unit(`Status Contrato : ${contract.status_contrato}`);

    // Estou com o Status do Asterisk, e as informações do Contrato.
    // Está tudo certo, logo, vou atualizar o Asterisk com base em ambos.
    if (await updateAsteriskStatus(asteriskStatus, contract_is_blocked, log) === null) {
        notifyWebhook('Não foi possível atualizar o Status do Asterisk')
    } else {
        log.info("Status do Asterisk: OK")
    }

    bufferResponse = response; // Desnecessário   
}

const heartbeat = schedule.scheduleJob(CRON, async function () {
    log.debug(' // beat // ');
    await main()
});

const notifyWebhook = async (error) => {
    let hostIp;
    hostIp = await getHostIp(log, 'public'); // Preferência por IP público
    log.unit(`Endereço de IP obtido: ${hostIp}`)

    log.unit('Gerando a embed...')
    let embed = embedErro(); // Gero a embed
    if (hostIp) {embed.setURL('https://' + hostIp)}; // Só seto URL se tiver obtido um IP
    if (error) {embed.description(`**${error}**`)};
    embed.setTitle(`${contract.id_cliente} - ${contract.razao}`);
    embed.addField(`ID Contrato`, `\`${contract.id_contrato}\``, true);
    embed.addField(` `, ` `, true); // Espaçamento
    embed.addField(`ID Cliente`, `\`${contract.id_cliente}\``, true);
    embed.addField(`Documento`, `\`${contract.cnpj_cpf}\``, false);
    embed.addField(`Status`, `\`${contract.status_contrato}\``, true);
    embed.addField(` `, ` `, true); // Espaçamento
    embed.addField(`Deve ser bloqueado?`, `\`${contract_is_blocked}\``, true);

    log.unit('Enviando a embed...');
    return await hook.send(embed);
}

log.info('Inicializando...')
log.info(`Verbosity Level: ${process.env.VERBOSITY}`)
log.unit(`ENV: ${JSON.stringify(process.env)}`)
main()