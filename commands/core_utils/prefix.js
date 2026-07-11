const { decorate } = require("../../helpers/decorator.js");
const util = require('util');
const { loadConfig } = require("../../index.js");
const { mkdir, writeFile, readFile, readdir } = require('node:fs/promises');

async function readJson(path, fallback = null) {
    try {
        const data = await readFile(path, "utf8");
        return JSON.parse(data);
    } catch (e) {
        if (e.code === 'ENOENT' && fallback !== null) return fallback;
        throw e;
    }
}

async function writeJson(path, data) {
    await writeFile(path, JSON.stringify(data, null, 2), 'utf8');
}

async function updateSpecificPrefix(from, newPrefix) {
    const dirPath = `./database/${from}`;
    const filePath = `${dirPath}/definitions.json`;
    await mkdir(dirPath, { recursive: true });
    
    const data = await readJson(filePath, {});
    const oldPrefix = data.prefix || null;
    data.prefix = newPrefix;
    await writeJson(filePath, data);
    return oldPrefix;
}

async function updateAllPrefixes(newPrefix) {
    try {
        const folders = await readdir('./database');
        for (const folder of folders) {
            const filePath = `./database/${folder}/definitions.json`;
            const data = await readJson(filePath, {});
            data.prefix = newPrefix;
            await writeJson(filePath, data);
        }
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
    }
}

async function run(ctx) {
    const { sock, from, msg, getString, args, prefix, cmd } = ctx;

    const sendSyntaxError = async () => {
        await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🎭",
                title: "prefix",
                content: [{ type: "text", items: [util.format(getString("generic/incorrect_syntax"), prefix, cmd)] }]
            })
        }, { quoted: msg });
    };

    const config = await readJson("./bot_config.json");

    if (args.length === 1 && ['-r', '--reset'].includes(args[0])) {
        const oldPrefix = await updateSpecificPrefix(from, config.default_prefix);
        
        const stringKey = oldPrefix ? "prefix/changed_to_reset" : "prefix/changed_to_reset_generic";
        const message = oldPrefix 
            ? util.format(getString(stringKey), oldPrefix, config.default_prefix)
            : util.format(getString(stringKey), config.default_prefix);

        await sock.sendMessage(from, {
            text: await decorate({ emoji: "🎭", title: "prefix", content: [{ type: "text", items: [message] }] })
        }, { quoted: msg });
        return;
    }

    if (args.length === 1 && ['-ra', '--reset-all'].includes(args[0])) {
        await updateAllPrefixes(config.default_prefix);

        await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🎭",
                title: "prefix",
                content: [{ type: "text", items: [getString("prefix/changed_to_reset_all_not_specific")] }]
            })
        }, { quoted: msg });
        return;
    }

    if (args.length === 1) {
        const newPrefix = args[0];

        if (config.default_prefix === newPrefix) {
            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎭",
                    title: "prefix",
                    content: [{ type: "text", items: [util.format(getString("prefix/same_prefix"), prefix), util.format(getString("prefix/same_prefix2"), prefix)] }]
                })
            }, { quoted: msg });
            return;
        }

        config.default_prefix = newPrefix;
        await writeJson('./bot_config.json', config);
        await loadConfig();

        await updateSpecificPrefix(from, newPrefix);

        await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🎭",
                title: "prefix",
                content: [{ type: "text", items: [util.format(getString("prefix/changed_to_global_not_overriten"), prefix, newPrefix), util.format(getString("prefix/changed_to_global_not_overriten_2"), newPrefix)] }]
            })
        }, { quoted: msg });
        return;
    }

    if (args.length === 2) {
        const [newPrefix, flag] = args;

        if (['-ra', '--reset-all'].includes(flag)) {
            config.default_prefix = newPrefix;
            await writeJson('./bot_config.json', config);
            await loadConfig();

            await updateAllPrefixes(newPrefix);

            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎭",
                    title: "prefix",
                    content: [{ type: "text", items: [util.format(getString("prefix/changed_to_reset_all"), newPrefix)] }]
                })
            }, { quoted: msg });
            return;
        }

        if (['-s', '--specific'].includes(flag)) {
            if (prefix === newPrefix) {
                await sock.sendMessage(from, {
                    text: await decorate({
                        emoji: "🎭",
                        title: "prefix",
                        content: [{ type: "text", items: [util.format(getString("prefix/same_prefix_not_global"), prefix), util.format(getString("prefix/same_prefix2_not_global"), prefix)] }]
                    })
                }, { quoted: msg });
                return;
            }

            const oldPrefix = await updateSpecificPrefix(from, newPrefix);

            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎭",
                    title: "prefix",
                    content: [{ type: "text", items: [util.format(getString("prefix/changed_to_not_global"), oldPrefix || prefix, newPrefix), util.format(getString("prefix/changed_to_not_global_2"))] }]
                })
            }, { quoted: msg });
            return;
        }
    }

    await sendSyntaxError();
}

module.exports = { run };