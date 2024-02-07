const util = require('util');
const { exec } = require('child_process');
const execAsync = util.promisify(require('child_process').exec);
const { sendNotificationRequest } = require('./requests/send_notification');

const { generateLogger } = require('./configs/logging');
let log = generateLogger('asterisk', process.env.MAIN_LOG, process.env.VERBOSITY);

const CMD_GET_ASTERISK_STATUS='systemctl status asterisk  | grep -io "Active: .*)" | awk -F": " \'{print $2}\' | awk \'{print $1}\''
const CMD_START_ASTERISK="systemctl start asterisk && echo 'ok'"
const CMD_STOP_ASTERISK="systemctl stop asterisk && echo 'ok'"

let LAST_ACTION // d - desbloqueio | b - bloqueio

const desbloquear = async (logger) => {
    if (LAST_ACTION === 'd' | await startAsterisk(logger) === null) {
        // Comando não deu certo, ou é a segunda vez seguida executando-o. Notificar no discord (app.js)
        return null;
    } else {
        r = await sendNotificationRequest(process.env.CONTRATO);
        LAST_ACTION = 'd';
        return true;
    }
    
}

const bloquear = async (logger) => {
    if (LAST_ACTION === 'b' | await stopAsterisk(logger) === null) {
        // Comando não deu certo, ou é a segunda vez seguida executando-o. Notificar no discord (app.js)
        return null;
    } else {
        r = await sendNotificationRequest(process.env.CONTRATO);
        LAST_ACTION = 'b';
        return true;
    }
}

const updateAsteriskStatus = async (asteriskStatus, contract_is_blocked, logger) => {
    log.unit('updating Asterisk status');
    if (contract_is_blocked) {

        if (asteriskStatus == 'active') {
            logger.debug('Contrato: BLOQUEADO | Asterisk: ATIVO');
            return await bloquear(logger);

        } else if (asteriskStatus == 'inactive') {
            log.unit('no changes: c:blocked, a:inactive')
            logger.debug('Contrato: BLOQUEADO | Asterisk: INATIVO');
            return true;

        } else { // redundante, mas por via das duvidas vou deixar aqui tbm
            log.critical('O status do Asterisk não foi detectado. Não será feito ação nenhuma sobre o Asterisk do cliente.')
            logger.error('Contrato: BLOQUEADO | Asterisk: -ERRO-');
            return null;
        }
    } else {

        if (asteriskStatus == 'active') {
            log.unit('no changes: c:active, a:active')
            logger.debug('Contrato: ATIVO | Asterisk: ATIVO');
            return true;

        } else if (asteriskStatus == 'inactive') {
            logger.debug('Contrato: ATIVO | Asterisk: INATIVO');
            return await desbloquear(logger);

        } else { // redundante, mas por via das duvidas vou deixar aqui tbm
            log.critical('O status do Asterisk não foi detectado. Não será feito ação nenhuma sobre o Asterisk do cliente.')
            logger.error('Contrato: BLOQUEADO | Asterisk: -ERRO-');
            return null;
        }
    }

}

const getAsteriskStatus = async (logger) => {
    log.unit('obtaining Asterisk status');
    try {
        const { stdout, stderr } = await execAsync(CMD_GET_ASTERISK_STATUS);
        stdoutTrimmed = stdout.trim();
        log.unit(`getAsteriskStatus : stdout -> "${stdoutTrimmed}"`);

        if (stdoutTrimmed !== "active" && stdoutTrimmed !== "inactive") {
            log.critical('Houve algum problema, o status do Asterisk não retornou ativo nem inativo.')
            log.critical("Comando: " + CMD_GET_ASTERISK_STATUS)
            return;
        }
        return stdoutTrimmed;
    } catch (error) {
        log.critical('Houve algum problema ao executar o comando para obter o status do Asterisk');
        log.critical(error.stderr);
        return;
    }
}

const startAsterisk = async (logger) => {
    log.unit('starting Asterisk');
    exec(CMD_START_ASTERISK, (err, stdout, stderr) => {
        if (err) {
          logger.critical('Houve algum problema ao executar o comando para inicializar o Asterisk');
          logger.critical(stderr);
          return null;
        }
        return stdout;
    });
}

const stopAsterisk = async (logger) => {
    log.unit('stopping Asterisk');
    exec(CMD_STOP_ASTERISK, (err, stdout, stderr) => {
        if (err) {
          logger.error('Houve algum problema ao executar o comando para parar o Asterisk');
          logger.error(stderr);
          return null;
        }
        return stdout;
    });
}

module.exports = {
    updateAsteriskStatus,
    getAsteriskStatus,
}