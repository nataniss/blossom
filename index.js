const {
    makeWASocket, 
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('node:path');
const fs = require('node:fs');
const qrcode = require('qrcode-terminal');

async function blossom() {

    const language_index = "en";

    const language = JSON.parse(fs.readFileSync("./langs/" + language_index + ".json"))

    const { state, saveCreds } = await useMultiFileAuthState('blossom_auth_info');

    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === 'open') {
            console.log(language.connected_to_wa);
        }

        else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if ((lastDisconnect?.error)?.output?.statusCode == 515) {
                console.log(language.success_restart)
            } else {
            console.log(language.failed_to_connect, lastDisconnect?.error, (shouldReconnect) ? language.reconnecting : "");
            }

            if (shouldReconnect) {
                blossom();
            } else {
            console.log(language.closed);
            }
        }

        if (qr) {
            console.log(language.scan_qr);
            (async () => {
                await qrcode.generate(qr, { small: true });
            })();

        }
    });

    sock.ev.on('messages.upsert', ({ messages }) => {
        console.log('Received message object:', JSON.stringify(messages, null, 2));
    });
}

blossom();