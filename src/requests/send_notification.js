const axios = require('axios');
const { handleErrorResponse } = require('../util');
const { generateJWT } = require('./get_jwt');

const { generateLogger } = require('../configs/logging');
const log = generateLogger('send-notification', process.env.MAIN_LOG, process.env.VERBOSITY);

const NOTIFICATION_REQUEST_PROTOCOL = "http";
const NOTIFICATION_REQUEST_URL = process.env.REQ_URL;
const NOTIFICATION_REQUEST_PORT = process.env.REQ_PORT;
const NOTIFICATION_REQUEST_ENDPOINT = "contract/notify";
const NOTIFICATION_REQUEST_TIMEOUT = 5000; // ms
const NOTIFICATION_REQUEST_HEADERS = {
    'Content-Type': 'application/json'
};
const NOTIFICATION_REQUEST_BODY = {};

const handleResponse = async (response) => {
    log.unit('handling response')
    // Trata a resposta
    if (!response && !response.hasOwnProperty('data')) {
        log.critical('Erro na requisição!')
        return;
    }
    const body = response.data;

    if (!body.hasOwnProperty('status') || body.status !== "success") {
        log.error('BUFFER: Resposta inválida!');
        log.error(JSON.stringify(body));
        return;
    }

    return body;
};

const sendRequest = async (contract, generateNewJwt) => {
    if (!global.jwtToken | generateNewJwt === true) {
        log.test('inside generate new token (send notification)')
        await generateJWT();
    }

    NOTIFICATION_REQUEST_BODY.contract = contract;
    NOTIFICATION_REQUEST_HEADERS.Authorization = global.jwtToken
    
    response = await axios.post(
        `${NOTIFICATION_REQUEST_PROTOCOL}://${NOTIFICATION_REQUEST_URL}:${NOTIFICATION_REQUEST_PORT}/${NOTIFICATION_REQUEST_ENDPOINT}`,
        NOTIFICATION_REQUEST_BODY,
        {
            headers: NOTIFICATION_REQUEST_HEADERS,
            timeout: NOTIFICATION_REQUEST_TIMEOUT
        }
    );

    if (!response) {
        log.critical('Não houve resposta!')
        return;
    } else {
        return response;
    }
}

const sendNotificationRequest = async (contract) => {
    try {
        log.unit('sending request')
        return await handleResponse(await sendRequest(contract));
    } catch (error) {
        if (error !== undefined && error.hasOwnProperty('response') && error.response.hasOwnProperty('data') && error.response.data.message == "Token inválido") {
            // Se o erro foi JWT, gero um novo e tento enviar a requisição novamente
            try {
                log.test('sending second request (regenerated JWT)...')
                return await handleResponse(await sendRequest(contract, true));
            } catch (error) { log.unit('second request failed') }
        }
        console.log('error: ' + error);
        await handleErrorResponse(error, log);
    }
};

module.exports = {
    sendNotificationRequest
}