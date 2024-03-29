const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const generateLogger = (logName, logfileLocation, logLevelFilter = 'debug') => {
    const levels = { critical: 0, error: 1, warn: 2, info: 3, debug: 4, unit: 5, test: 6 };
    const colors = { critical: 'bold red blackBG', error: 'red', warn: 'yellow', info: 'green', debug: 'blue', unit: 'cyan', test: 'cyan whiteBG' };

    winston.addColors(colors);

    // Função para validar se uma string representa um nível de log válido
    const isValidLogLevelString = (str) => {
        const lowercaseStr = str.toLowerCase();
        return levels.hasOwnProperty(lowercaseStr);
    };

    // Se a string for válida, converte para número usando o objeto levels, caso contrário, usa como está
    const numericLogLevel = isValidLogLevelString(logLevelFilter) ? levels[logLevelFilter.toLowerCase()] : parseInt(logLevelFilter, 10);
    const numericLogfileLevel =  isValidLogLevelString(process.env.LOGFILE_VERBOSITY) ? levels[process.env.LOGFILE_VERBOSITY.toLowerCase()] : parseInt(process.env.LOGFILE_VERBOSITY, 10);

    // Filtra os níveis com base no logLevelFilter
    const filteredLevels = Object.keys(levels).filter(level => levels[level] <= numericLogLevel);
    const transports = [];

    if (filteredLevels.length > 0) {
        const consoleTransport = new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({ all: true }),
                winston.format.label({ label: logName }),
                winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss.SSSSSS' }),
                winston.format.printf(({ level, message, label, timestamp }) => {
                    return `[${timestamp}] [${level}] ${label}: ${message}`;
                }),
            ),
        });

        // Configuração de níveis para o transporte do console
        consoleTransport.level = filteredLevels[filteredLevels.length - 1];

        transports.push(consoleTransport);
    }

    if (numericLogLevel >= numericLogfileLevel) {
        const fileTransport = new DailyRotateFile({
            filename: `${logfileLocation}-%DATE%.log`,
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m', // tamanho máximo de cada arquivo de log
            maxFiles: '14d', // número máximo de dias que os arquivos de log serão mantidos
            format: winston.format.combine(
                winston.format.label({ label: logName }),
                winston.format.timestamp({ format: 'DD/MM/YYYY HH:mm:ss.SSSSSS' }),
                winston.format.printf(({ level, message, label, timestamp }) => {
                    return `[${timestamp}] [${level}] ${label}: ${message}`;
                }),
            ),
        });

        // Configuração de níveis para o transporte do arquivo
        fileTransport.level = filteredLevels[numericLogfileLevel];

        transports.push(fileTransport);
    }

    return winston.createLogger({
        levels: levels,
        transports: transports,
    });
}

module.exports = {
    generateLogger
}