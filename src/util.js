const axios = require('axios');
const util = require('util');
const { exec } = require('child_process');
const execAsync = util.promisify(exec);

const CMD_OBTAIN_PUBLIC_IP = 'curl -4 ifconfig.co';
const CMD_OBTAIN_LOCAL_IP = "ip -o route get to 8.8.8.8 | sed -n 's/.*src \\([0-9.]\\+\\).*/\\1/p'";

const getPublicIp = async (logger) => {
  try {
    const { stdout } = await execAsync(CMD_OBTAIN_PUBLIC_IP);
    const publicIp = stdout.trim();

    if (isValidIPv4(publicIp)) {
      return publicIp;
    } else {
      logger.error(`O IP obtido do comando público não é um endereço IPv4 válido: ${publicIp}`);
      return null;
    }
  } catch (error) {
    logger.error(`Erro ao obter o IP público: ${error.message}`);
    return null;
  }
};
  
const getLocalIp = async (logger) => {
  try {
    const { stdout } = await execAsync(CMD_OBTAIN_LOCAL_IP);
    const localIp = stdout.trim();

    if (isValidIPv4(localIp)) {
      return localIp;
    } else {
      logger.error(`O IP obtido do comando local não é um endereço IPv4 válido: ${localIp}`);
      return null;
    }
  } catch (error) {
    logger.error(`Erro ao obter o IP local: ${error.message}`);
    return null;
  }
};
  
const isValidIPv4 = (ip) => {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  return ipv4Regex.test(ip);
};

const getHostIp = async (logger, preference) => {
  const publicIp = await getPublicIp(logger);
  const localIp = await getLocalIp(logger);

  if (publicIp === null || localIp === null) {
    logger.error('Erro ao obter IPs. Pelo menos uma das funções retornou null.');
    return null;
  }

  if (publicIp === localIp) {
    return publicIp;
  }

  return preference === 'public' ? publicIp : localIp;
};

const handleErrorResponse = async (error, log) => {
  if (log === false) {
    return false;
  }
  
  if (axios.isAxiosError(error)) {
    log.error(`[ ${error.code} ] : Error message: ${error.message}`);
    log.error(`[ ${error.code} ] : Request: ${error.config.method.toUpperCase()}:${error.config.url} ${error.config.data}`)
    if (error.hasOwnProperty('response') && error.response.hasOwnProperty('data')) {
      log.error(`[ ${error.code} ] : Response: ${error.response.status} : ${error.response.statusText} ${JSON.stringify(error.response.data)}`);
    }       
  } else {
    log.error(`Algo deu errado, o erro não é um erro de AXIOS. ${error}`)
    // throw new Error(JSON.stringify(error));
  }
  return false;
}

module.exports = {
  handleErrorResponse,
  getLocalIp,
  getPublicIp,
  getHostIp
}