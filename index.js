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

async function loadCommands() {
    const command_folder = path.resolve(__dirname, 'commands');
    const command_map = {};

    try {
        const items = await fsp.readdir(command_folder, { withFileTypes: true });

        const subs = items.filter(item => item.isDirectory());

        for (const sub of subs) {
            const manifest_path = path.join(command_folder, sub.name, 'manifest.json');

            try {
                const manifest_data = await fsp.readFile(manifest_path, 'utf8');
                const manifest = JSON.parse(manifest_data);

                if (manifest && Array.isArray(manifest.commands)) {
                    for (const cmd of manifest.commands) {
                        const js_path = path.resolve(command_folder, sub.name, cmd.file);

                        if (Array.isArray(cmd.aliases)) {
                            for (const alias of cmd.aliases) {
                                command_map[alias.toLowerCase()] = js_path;
                            }
                        }
                    }
                }
            } catch (manifest_error) {
                console.warn(`${manifest_path} failed:`, manifest_error.message);
            }
        }
    } catch (dir_error) {
        console.error(dir_error.message);
    }

    return command_map;
}


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
        language: language_chosen,
        default_prefix: "!"
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

    let commands = await loadCommands();

    console.log(commands)

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
        preferred_connection = await select({
            message: 'What connection method do you want to use?',
            choices: [
                {
                    name: language.qr,
                    value: 'qr',
                    description: language.qr_setup_info
                },
                {
                    name: language.pairing,
                    value: 'pairing-code',
                    description: language.pairing_setup_info
                }
            ]
        });
    }

    const { state, saveCreds } = await useMultiFileAuthState('blossom_auth_info');

    const { version } = await fetchLatestBaileysVersion();


    const sock = makeWASocket({
        version,
        auth: state,
        logger: pino({ level: 'silent' })
    });

    if (
        preferred_connection === 'pairing-code'
        && !state.creds.registered
    ) {
        const phone_number = await input({
            message: language.pairing_code_needs_number,

            validate: value =>
                /^\d+$/.test(value)
                || language.pairing_code_notice
        });

        const code = await sock.requestPairingCode(phone_number);

        console.log(
            language.pair,
            chalk.bold(
                code.slice(0, 4) + "-" + code.slice(4)
            )
        );
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === 'open') {
            console.log(language.connected_to_wa);
        }

        else if (connection === 'close') {
            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if ((lastDisconnect?.error)?.output?.statusCode == 515) {
                console.log(chalk.bold(language.success_restart))
            } else {
                console.log(language.failed_to_connect, lastDisconnect?.error, (shouldReconnect) ? language.reconnecting : "");
            }

            if (shouldReconnect) {
                await sock.end();
                return blossom();
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
                qrcode.generate(qr, { small: true });
            }
        }
    });


    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        let msg = messages[0];
        
        if (!msg.message) return;

            const text = msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message.imageMessage?.caption ||
                msg.message.videoMessage?.caption ||
                "";

            if (!text.startsWith(configuration.default_prefix)) return;

            const message_without_prefix = text.slice(1);

            const args = message_without_prefix.split(" ")

            const cmd = args[0];

            const from = msg.key.remoteJid;

            let type = Object.keys(msg.message)[0];


            msg = {msg, blossom: {cmd, args, text, username: msg.pushName, timestamp: msg.messageTimestamp, type}}

            if (commands[cmd]) {
                const command_path = commands[cmd];
                const command = require(command_path);
                await command.run(sock, from, msg);
            } else {
                console.log("Cmd not found!");
            }
        
    });
}

blossom();