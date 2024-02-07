const { Webhook, MessageBuilder } = require('discord-webhook-node');              // Enviar notificações pro DC

const hook = new Webhook(process.env.NOTIFY_ERROR_WEBHOOK);

function embedErro() {
    return new MessageBuilder()
    .setTitle('[DEBUG]')
    .setColor('#FF00FF')
    // .setURL('https://phonevox.com.br')
    .setTimestamp()
    // .setThumbnail('https://media.tenor.com/ybpLXCCzWVEAAAAi/lizard.gif') // lagarto dançando
    // .setThumbnail('https://media.tenor.com/2l4-h42qnmcAAAAi/toothless-dancing-toothless.gif') // banguela dançando
    .setThumbnail('https://media1.tenor.com/m/WQeOvF0ktN8AAAAd/toothless-scotland-forever.gif') // banguela dançando com fundo
}

module.exports = {
    hook,
    embedErro
};