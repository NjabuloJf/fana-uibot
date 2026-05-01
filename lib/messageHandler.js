const axios = require('axios');
const fs = require('fs-extra');
const yts = require('yt-search');

function handleMessage(socket, config) {
  socket.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg?.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = isGroup ? msg.key.participant : from;
    const pushName = msg.pushName || 'User';

    // Extract text
    const body = msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption || '';

    if (!body.startsWith(config.PREFIX)) return;

    const command = body.slice(config.PREFIX.length).trim().split(' ')[0].toLowerCase();
    const args = body.slice(config.PREFIX.length + command.length).trim();

    // Auto recording presence
    if (config.AUTO_RECORDING) {
      await socket.sendPresenceUpdate('recording', from);
    }

    console.log(`📩 Command: ${command} | From: ${pushName} | Args: ${args}`);

    try {
      switch (command) {
        case 'alive':
        case 'ping': {
          const uptime = formatUptime(process.uptime());
          await socket.sendMessage(from, {
            text: `*${config.BOT_NAME} is Online!* ✅\n\n` +
                  `⏱️ Uptime: ${uptime}\n` +
                  `🤖 Version: ${config.BOT_VERSION}\n` +
                  `👤 Owner: ${config.OWNER_NAME}\n` +
                  `📡 Status: Running\n\n` +
                  `${config.BOT_FOOTER}`
          });
          break;
        }

        case 'menu':
        case 'help': {
          const menu = generateMenu(config);
          await socket.sendMessage(from, { text: menu });
          break;
        }

        case 'owner': {
          await socket.sendMessage(from, {
            text: `*👤 Bot Owner Info*\n\n` +
                  `Name: ${config.OWNER_NAME}\n` +
                  `Number: wa.me/${config.OWNER_NUMBER}\n\n` +
                  `${config.BOT_FOOTER}`
          });
          break;
        }

        case 'runtime': {
          const uptime = formatUptime(process.uptime());
          await socket.sendMessage(from, {
            text: `*⏱️ Bot Runtime*\n\n${uptime}\n\n${config.BOT_FOOTER}`
          });
          break;
        }

        case 'song': {
          if (!args) return socket.sendMessage(from, { text: '❗ Usage: .song <song name>' });
          await socket.sendMessage(from, { text: '🔍 Searching...' });
          const results = await yts(args);
          if (!results?.videos?.length) return socket.sendMessage(from, { text: '❌ No results found.' });
          const video = results.videos[0];
          await socket.sendMessage(from, {
            text: `🎵 *${video.title}*\n\n⏱️ Duration: ${video.timestamp}\n👤 Channel: ${video.author.name}\n🔗 ${video.url}\n\n_Downloading..._\n\n${config.BOT_FOOTER}`
          });
          break;
        }

        case 'video': {
          if (!args) return socket.sendMessage(from, { text: '❗ Usage: .video <video name>' });
          await socket.sendMessage(from, { text: '🔍 Searching...' });
          const vResults = await yts(args);
          if (!vResults?.videos?.length) return socket.sendMessage(from, { text: '❌ No results found.' });
          const vid = vResults.videos[0];
          await socket.sendMessage(from, {
            text: `🎬 *${vid.title}*\n\n⏱️ Duration: ${vid.timestamp}\n👤 Channel: ${vid.author.name}\n🔗 ${vid.url}\n\n${config.BOT_FOOTER}`
          });
          break;
        }

        case 'sticker': {
          const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
          if (!quoted?.imageMessage && !msg.message?.imageMessage) {
            return socket.sendMessage(from, { text: '❗ Reply to an image with .sticker' });
          }
          await socket.sendMessage(from, { text: '🎨 Creating sticker...' });
          // Sticker creation logic would go here with sharp/jimp
          break;
        }

        case 'joke': {
          try {
            const { data } = await axios.get('https://official-joke-api.appspot.com/random_joke');
            await socket.sendMessage(from, {
              text: `😂 *Random Joke*\n\n${data.setup}\n\n${data.punchline}\n\n${config.BOT_FOOTER}`
            });
          } catch {
            await socket.sendMessage(from, { text: '❌ Failed to fetch joke.' });
          }
          break;
        }

        case 'quote': {
          try {
            const { data } = await axios.get('https://api.quotable.io/random');
            await socket.sendMessage(from, {
              text: `💬 *Quote*\n\n"${data.content}"\n\n— _${data.author}_\n\n${config.BOT_FOOTER}`
            });
          } catch {
            await socket.sendMessage(from, { text: '❌ Failed to fetch quote.' });
          }
          break;
        }

        case 'weather': {
          if (!args) return socket.sendMessage(from, { text: '❗ Usage: .weather <city>' });
          try {
            const { data } = await axios.get(`https://wttr.in/${encodeURIComponent(args)}?format=j1`);
            const current = data.current_condition[0];
            await socket.sendMessage(from, {
              text: `🌤️ *Weather: ${args}*\n\n` +
                    `🌡️ Temp: ${current.temp_C}°C\n` +
                    `💧 Humidity: ${current.humidity}%\n` +
                    `🌬️ Wind: ${current.windspeedKmph} km/h\n` +
                    `☁️ ${current.weatherDesc[0].value}\n\n` +
                    `${config.BOT_FOOTER}`
            });
          } catch {
            await socket.sendMessage(from, { text: '❌ Failed to fetch weather.' });
          }
          break;
        }

        // Group commands
        case 'kick': {
          if (!isGroup) return socket.sendMessage(from, { text: '❗ Group only command.' });
          const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
          if (!mentioned?.length) return socket.sendMessage(from, { text: '❗ Tag a user to kick.' });
          try {
            await socket.groupParticipantsUpdate(from, mentioned, 'remove');
            await socket.sendMessage(from, { text: `✅ Removed @${mentioned[0].split('@')[0]}`, mentions: mentioned });
          } catch {
            await socket.sendMessage(from, { text: '❌ Failed. Am I admin?' });
          }
          break;
        }

        case 'promote': {
          if (!isGroup) return socket.sendMessage(from, { text: '❗ Group only command.' });
          const pMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
          if (!pMentioned?.length) return socket.sendMessage(from, { text: '❗ Tag a user.' });
          try {
            await socket.groupParticipantsUpdate(from, pMentioned, 'promote');
            await socket.sendMessage(from, { text: `✅ Promoted @${pMentioned[0].split('@')[0]}`, mentions: pMentioned });
          } catch {
            await socket.sendMessage(from, { text: '❌ Failed.' });
          }
          break;
        }

        case 'demote': {
          if (!isGroup) return socket.sendMessage(from, { text: '❗ Group only command.' });
          const dMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
          if (!dMentioned?.length) return socket.sendMessage(from, { text: '❗ Tag a user.' });
          try {
            await socket.groupParticipantsUpdate(from, dMentioned, 'demote');
            await socket.sendMessage(from, { text: `✅ Demoted @${dMentioned[0].split('@')[0]}`, mentions: dMentioned });
          } catch {
            await socket.sendMessage(from, { text: '❌ Failed.' });
          }
          break;
        }

        case 'mute': {
          if (!isGroup) return socket.sendMessage(from, { text: '❗ Group only.' });
          await socket.groupSettingUpdate(from, 'announcement');
          await socket.sendMessage(from, { text: '🔇 Group muted. Only admins can send messages.' });
          break;
        }

        case 'unmute': {
          if (!isGroup) return socket.sendMessage(from, { text: '❗ Group only.' });
          await socket.groupSettingUpdate(from, 'not_announcement');
          await socket.sendMessage(from, { text: '🔊 Group unmuted.' });
          break;
        }

        case 'tts': {
          if (!args) return socket.sendMessage(from, { text: '❗ Usage: .tts <text>' });
          await socket.sendMessage(from, { text: `🗣️ TTS: ${args}\n\n${config.BOT_FOOTER}` });
          break;
        }

        case 'fact': {
          try {
            const { data } = await axios.get('https://uselessfacts.jsph.pl/random.json?language=en');
            await socket.sendMessage(from, { text: `🧠 *Random Fact*\n\n${data.text}\n\n${config.BOT_FOOTER}` });
          } catch {
            await socket.sendMessage(from, { text: '❌ Failed to fetch fact.' });
          }
          break;
        }

        case 'dare': {
          const dares = [
            'Send a voice note singing your favorite song!',
            'Change your profile picture to something funny for 1 hour.',
            'Send "I love you" to the 5th person in your contacts.',
            'Post a story saying "I am the best dancer in the world".',
            'Send a 1-minute voice note talking in a different accent.',
          ];
          const dare = dares[Math.floor(Math.random() * dares.length)];
          await socket.sendMessage(from, { text: `🎯 *Dare*\n\n${dare}\n\n${config.BOT_FOOTER}` });
          break;
        }

        case 'truth': {
          const truths = [
            'What is your biggest fear?',
            'What is the most embarrassing thing you have done?',
            'Who is your secret crush?',
            'What is the last lie you told?',
            'What is your most annoying habit?',
          ];
          const truth = truths[Math.floor(Math.random() * truths.length)];
          await socket.sendMessage(from, { text: `🤔 *Truth*\n\n${truth}\n\n${config.BOT_FOOTER}` });
          break;
        }

        default:
          await socket.sendMessage(from, {
            text: `❓ Unknown command: *${config.PREFIX}${command}*\n\nType *${config.PREFIX}menu* for all commands.\n\n${config.BOT_FOOTER}`
          });
      }
    } catch (err) {
      console.error(`Command error [${command}]:`, err);
      await socket.sendMessage(from, { text: '❌ An error occurred processing your command.' });
    }
  });
}

function generateMenu(config) {
  return `╔══════════════════╗
║  *${config.BOT_NAME}*  ${config.BOT_VERSION}
╚══════════════════╝

*📋 GENERAL*
${config.PREFIX}alive - Check bot status
${config.PREFIX}menu - Show this menu
${config.PREFIX}ping - Check response time
${config.PREFIX}owner - Owner info
${config.PREFIX}runtime - Bot uptime

*📥 DOWNLOAD*
${config.PREFIX}song <name> - Download song
${config.PREFIX}video <name> - Download video

*🛠️ TOOLS*
${config.PREFIX}sticker - Image to sticker
${config.PREFIX}tts <text> - Text to speech
${config.PREFIX}weather <city> - Weather info

*👥 GROUP*
${config.PREFIX}kick @user - Remove user
${config.PREFIX}promote @user - Make admin
${config.PREFIX}demote @user - Remove admin
${config.PREFIX}mute - Mute group
${config.PREFIX}unmute - Unmute group

*🎮 FUN*
${config.PREFIX}joke - Random joke
${config.PREFIX}quote - Inspirational quote
${config.PREFIX}fact - Random fact
${config.PREFIX}dare - Dare challenge
${config.PREFIX}truth - Truth question

${config.BOT_FOOTER}`;
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
}

module.exports = { handleMessage };
