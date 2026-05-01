const { delay } = require('baileys');

function setupStatusHandlers(socket, config) {
  socket.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.key?.remoteJid?.endsWith('@broadcast')) return;
    if (msg.key.fromMe) return;

    try {
      // Auto view status
      if (config.AUTO_VIEW_STATUS) {
        await socket.readMessages([msg.key]);
        console.log(`👁️ Viewed status from ${msg.key.participant || msg.key.remoteJid}`);
      }

      // Auto like status
      if (config.AUTO_LIKE_STATUS) {
        await delay(1000 + Math.random() * 2000);
        const emoji = config.AUTO_LIKE_EMOJI[Math.floor(Math.random() * config.AUTO_LIKE_EMOJI.length)];
        await socket.sendMessage(msg.key.remoteJid, {
          react: { text: emoji, key: msg.key }
        });
        console.log(`💜 Reacted to status with ${emoji}`);
      }
    } catch (err) {
      console.error('Status handler error:', err.message);
    }
  });
}

module.exports = { setupStatusHandlers };
