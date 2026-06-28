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
const util = require('util');

const GROUP_CACHE = new Map();

const userArgs = process.argv.slice(2)

if (userArgs.includes("--reset")) {
    if (fs.existsSync("./blossom_auth_info/creds.json")) {
        (async () => {
            await fsp.rm("./blossom_auth_info", {
                recursive: true,
                force: true
            });
        })();
    }
}

async function runCommand(commandPath, ctx, language) {
    try {

        delete require.cache[require.resolve(commandPath)];

        const command = require(commandPath);

        if (!command.run) {
            throw new Error(language.no_run);

        }

        await Promise.resolve(command.run(ctx));

    } catch (err) {

        const log_stack = err.stack
            .split('\n')
            .map(line => chalk.rgb(255, 8, 0)("├ ") + chalk.rgb(255, 167, 167)(line))
            .join('\n');

        console.log(chalk.rgb(255, 8, 0)("\n╭ [×]"), chalk.rgb(255, 167, 167)(util.format(language.failed_to_run_terminal, ctx.cmd)));
        console.log(chalk.rgb(255, 8, 0)("│ "))
        console.log(log_stack)
        console.log(chalk.rgb(255, 8, 0)("│ "))
        console.log(chalk.rgb(255, 8, 0)("╰ "))


        try {
            await ctx.sock.sendMessage(ctx.from, {
                text: util.format(language.failed_to_run, ctx.cmd, err.message)
            }, { quoted: ctx.msg });
        } catch (_) { }

    }
}

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
        default_prefix: "!",
        style: "blossom_default"
    }

    fs.writeFileSync(
        'bot_config.json',
        JSON.stringify(config, null, 2),
        'utf8'
    );

    return config;
}

console.log(chalk.rgb(255, 180, 255)('─ [㋡]'), chalk.rgb(255, 225, 255)('Blossom Bot v1.0'), "\n")

let connection_tries = 0;

let shouldSendSessionFoundMessage = true;

let connected = false;

let commands;

async function blossom() {

    let configuration;


    await fsp.mkdir("./database/", { recursive: true });

    commands = await loadCommands();

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

    if (!fs.existsSync("./blossom_auth_info/creds.json")) {
        preferred_connection = await select({
            message: language.connection_method_ask,
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
    } else {
        if (shouldSendSessionFoundMessage) {
            console.log(chalk.rgb(0, 255, 0)("╭ [✓]"), chalk.rgb(167, 255, 167)(language.connecting));
        } else {
            shouldSendSessionFoundMessage = true
        }
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

        console.log(chalk.rgb(255, 174, 0)("\n─ [◎]"),
            chalk.rgb(255, 220, 167)(language.pair),
            chalk.rgb(255, 220, 167)(
                code.slice(0, 4) + "-" + code.slice(4)
            ), "\n"
        );
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === 'open') {
            console.log(chalk.rgb(0, 255, 0)("╰ [✓]"), chalk.rgb(167, 255, 167)(language.connected_to_wa));
            connected = true;
        }

        else if (connection === 'close') {

            const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
            if ((lastDisconnect?.error)?.output?.statusCode == 515) {
                console.log(chalk.rgb(0, 255, 0)("╭ [✓]"), chalk.rgb(167, 255, 167)(language.success_restart));
                shouldSendSessionFoundMessage = false
            } else {
                if (connection_tries >= 3) {

                    console.log(chalk.rgb(255, 8, 0)("╰ [×]"), chalk.rgb(255, 167, 167)(language.tries_exceeded), "\n");

                    await sock.end();

                    await fsp.rm("./blossom_auth_info", {
                        recursive: true,
                        force: true
                    });

                    connection_tries = 0;

                    return blossom();
                } else {
                    console.log(chalk.rgb(255, 8, 0)((connected) ? "\n─ [×]" : "╰" + " [×]"), chalk.rgb(255, 167, 167)(language.failed_to_connect, (shouldReconnect) ? language.reconnecting : ""), "\n");
                    connected = false
                    connection_tries++;
                }
            }

            if (shouldReconnect) {
                await sock.end();
                return blossom();
            } else {
                console.log(chalk.rgb(255, 0, 0)("╭ [×]"), chalk.rgb(255, 167, 167)(language.closed));
                (async () => {
                    await fsp.rm("./blossom_auth_info", { recursive: true, force: true });
                })();
                console.log(chalk.rgb(255, 8, 0)("╰ [×]"), chalk.rgb(255, 167, 167)(language.new_session), "\n");
                blossom();
            }
        }

        if (preferred_connection === "qr") {
            if (qr) {
                console.log(chalk.rgb(255, 174, 0)("\n─ [◎]"), chalk.rgb(255, 220, 167)(language.scan_qr));
                qrcode.generate(qr, { small: true });
            }
        }
    });


    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        let msg = messages[0];

        const from = msg.key.remoteJid;

        if (!msg.message) return;

        const text = msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            msg.message.videoMessage?.caption ||
            "";

        const isGroup = from.endsWith('@g.us');
        let senderNumber = "";
        let participants = [];
        const lid = msg.key.participant || msg.key.remoteJid;
        const now = Date.now();
        const cachedData = GROUP_CACHE.get(from);

        if (isGroup) {
            if (cachedData && (now - cachedData.timestamp) < (1000 * 60 * 10)) {
                participants = cachedData.participants;
            } else {
                try {
                    const metadata = await sock.groupMetadata(from);
                    participants = metadata.participants;
                    GROUP_CACHE.set(from, {
                        participants: participants,
                        timestamp: now
                    });
                } catch (e) {
                    console.error("Error checking group metadata:", e);
                    if (cachedData) {
                        participants = cachedData.participants;
                    } else {
                        return;
                    }
                }
            }

            const match = participants.find(p => p.id === lid);
            if (match && match.phoneNumber) {
                senderNumber = match.phoneNumber.split('@')[0];
            }
        } else {
            return
        }

        if (!text.startsWith(configuration.default_prefix)) return;

        const message_without_prefix =
            text.slice(configuration.default_prefix.length);

        const args = message_without_prefix.trim().split(/\s+/);
        const cmd = args.shift().toLowerCase();
        let msg_type = Object.keys(msg.message)[0];

        const ctx = {
            sock,
            from,
            msg,
            cmd,
            args,
            text,
            username: msg.pushName,
            timestamp: msg.messageTimestamp,
            type: msg_type,
            senderNumber,
            participants,
            language,
            prefix: configuration.default_prefix
        };

        if (commands[cmd]) {
            await runCommand(commands[cmd], ctx, language);
        } else {
            await runCommand(path.resolve("./helpers/command_not_found"), ctx, language);
        }

    });
}

blossom();

module.exports = {
    loadCommands
}