const axios = require('axios');
const { handleErrorResponse } = require('../util')

const { generateLogger } = require('../configs/logging');
const log = generateLogger('get-jwt', process.env.MAIN_LOG, process.env.VERBOSITY);
const JWT_USER=process.env.JWT_USER
const JWT_PASSWORD=process.env.JWT_PASSWORD

const JWT_REQUEST_PROTOCOL = "http";
const JWT_REQUEST_URL = process.env.REQ_URL;
const JWT_REQUEST_PORT = process.env.REQ_PORT;
const JWT_REQUEST_ENDPOINT = "auth";
const JWT_REQUEST_TIMEOUT = 5000; // ms
const JWT_REQUEST_BODY = {
    'user': JWT_USER,
    'password': JWT_PASSWORD
}

const handleResponse = async (response) => {
    console.log('teste3')
    log.unit('handling response')
    // Trata a resposta
    const body = response.data;

    if (!body.hasOwnProperty('status') || body.status !== "success") {
        log.error('Resposta inválida!');
        log.error(JSON.stringify(body))
        return false;
    }

    log.debug(`Token JWT: ${body.token}`)
    global.jwtToken = body.token
    return true;
}

const sendJWTRequest = async () => {
    log.unit('sending request')

    response = await axios.post(`${JWT_REQUEST_PROTOCOL}://${JWT_REQUEST_URL}:${JWT_REQUEST_PORT}/${JWT_REQUEST_ENDPOINT}`, JWT_REQUEST_BODY, {
        headers: {
            'Content-Type': 'application/json'
        },
        timeout: JWT_REQUEST_TIMEOUT // 5 segundos de timeout (ajuste conforme necessário)
    });
    console.log('wtf')

    if (!response) {
        log.critical('Não houve resposta!')
        return;
    } else {
        return response;
    }

}

const generateJWT = async () => {
    try {  
        return await handleResponse(await sendJWTRequest());
    } catch (error) {
        return await handleErrorResponse(error, log);
    }
}

module.exports = {
    generateJWT
}