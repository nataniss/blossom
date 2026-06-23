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
const { select, input } = require('@inquirer/prompts');
const fsp = require('node:fs/promises');
const chalk = require('chalk');

async function makeConfig() {
    let languages_input;
    const lang_files = fs.readdirSync("./langs", 'utf-8');

    const lang_filesJson = lang_files.filter(f => path.extname(f).toLowerCase() === '.json');

    languages_input = await Promise.all(lang_filesJson.map(async (lang_file) => {
        const full_path = path.join("./langs", lang_file);
        const name = path.parse(lang_file).name;

        const raw = fs.readFileSync(full_path, 'utf-8');
        const json = JSON.parse(raw);

        return {
            name: `${name} - ${json.language}`,
            value: name
        };
    }));

    const language_chosen = await select({
        message: 'BlossomBot supports multiple languages. Which one do you want to use?',
        choices: languages_input
    });

    const config = {
        language: language_chosen
    }

    fs.writeFileSync(
        'bot_config.json',
        JSON.stringify(config, null, 2),
        'utf8'
    );

    return config;
}

async function blossom() {

    let configuration;

    try {
        const data = await fsp.readFile(
            './bot_config.json',
            'utf8'
        );

        configuration = JSON.parse(data);

    } catch (error) {

        if (error.code === 'ENOENT') {
            configuration = await makeConfig();
        } else {
            throw error;
        }
    }

    const language_index = configuration.language;

    const language = JSON.parse(
        await fsp.readFile(
            `./langs/${language_index}.json`,
            'utf8'
        )
    );

    let preferred_connection;

    if (!fs.existsSync("./blossom_auth_info")) {
        (async () => {
            preferred_connection = await select({
                message: 'What connection method do you want to use?',
                choices: [
                    {
                        name: language.qr,
                        value: 'qr',
                        description: language.qr_setup_info,
                    },
                    {
                        name: language.pairing,
                        value: 'pairing-code',
                        description: language.pairing_setup_info,
                    }
                ],
            });
        })();
    }

    const { state, saveCreds } = await useMultiFileAuthState('blossom_auth_info');

    const { version } = await fetchLatestBaileysVersion();


    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' })
    });

    if (
        preferred_connection === 'pairing-code' && !state.creds.registered
    ) {
        (async () => {
            const phone_number = await input({
                message: language.pairing_code_needs_number,

                validate: (value) => {
                    return /^\d+$/.test(value)
                        || language.pairing_code_notice;
                }
            });

            const code = await sock.requestPairingCode(phone_number);


            console.log(language.pair, chalk.bold(code.slice(0, 4) + "-" + code.slice(4)));
        })();
    }

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
                (async () => {
                    await sock.end();
                    return blossom();
                })();
            } else {
                console.log(language.closed);
                (async () => {
                    await fsp.rm("./blossom_auth_info", { recursive: true, force: true });
                })();
                blossom();
            }
        }

        if (preferred_connection === "qr") {
            if (qr) {
                console.log(language.scan_qr);
                (async () => {
                    await qrcode.generate(qr, { small: true });
                })();
            }
        }
    });


    sock.ev.on('messages.upsert', ({ messages }) => {
        console.log('Received message object:', JSON.stringify(messages, null, 2));
    });
}

blossom();