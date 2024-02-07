const axios = require('axios');
const { handleErrorResponse } = require('../util');
let { generateJWT } = require('./get_jwt');

const { generateLogger } = require('../configs/logging');
const log = generateLogger('get-clientes', process.env.MAIN_LOG, process.env.VERBOSITY);

const CONTRACT_REQUEST_PROTOCOL = "http";
const CONTRACT_REQUEST_URL = process.env.REQ_URL;
const CONTRACT_REQUEST_PORT = process.env.REQ_PORT;
const CONTRACT_REQUEST_ENDPOINT = "contract/check";
const CONTRACT_REQUEST_TIMEOUT = 5000; // ms
const CONTRACT_REQUEST_HEADERS = {
    'Content-Type': 'application/json'
};
const CONTRACT_REQUEST_BODY = {};

const handleResponse = async (response) => {
    log.unit('handling response')
    // Trata a resposta
    if (!response && !response.hasOwnProperty('data')) {
        log.critical('FAILING: noData: Erro na requisição!')
        log.critical('FAILING: noData: ' + JSON.stringify(response))
        return;
    }
    const body = response.data;

    if (!body.hasOwnProperty('status') || body.status !== "success") {
        log.critical('FAILING: wrongStatus: Resposta inválida!');
        log.critical('FAILING: wrongStatus: Resposta: ' +JSON.stringify(body));
        return;
    }

    return body;
};

const sendRequest = async (contract, generateNewJwt) => {
    if (!global.jwtToken | generateNewJwt === true) {
        log.debug('Solicitando token JWT...')
        await generateJWT();
    }

    CONTRACT_REQUEST_BODY.contract = contract;
    CONTRACT_REQUEST_HEADERS.Authorization = global.jwtToken
    
    response = await axios.post(
        `${CONTRACT_REQUEST_PROTOCOL}://${CONTRACT_REQUEST_URL}:${CONTRACT_REQUEST_PORT}/${CONTRACT_REQUEST_ENDPOINT}`,
        CONTRACT_REQUEST_BODY,
        {
            headers: CONTRACT_REQUEST_HEADERS,
            timeout: CONTRACT_REQUEST_TIMEOUT
        }
    );

    if (!response) {
        log.critical('Não houve resposta!')
        return;
    } else {
        return response;
    }
}

const sendContractRequest = async (contract) => {
    try {
        log.unit('Enviando requisição...')
        return await handleResponse(await sendRequest(contract));
    } catch (error) {
        if (error.hasOwnProperty('response') && error.response.hasOwnProperty('data')) {
            // Se o erro foi JWT, gero um novo e tento enviar a requisição novamente
            if (error.response.data.message == "Token inválido") {
                try {
                    log.test('INVALID_JWT: Enviando segunda requisição (regenerando JWT)...')
                    return await handleResponse(await sendRequest(contract, true));
                } catch (error) { 
                    log.unit('INVALID_JWT: Segunda requisição falhou! (O erro provavelmente não foi o JWT Inválido)') 
                }
            }

        }
        log.unit('Algum erro ocorreu, analisando...')
        await handleErrorResponse(error, log);
    }
};

module.exports = {
    sendContractRequest
};
