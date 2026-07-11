const { decorate } = require("../../helpers/decorator.js");
const util = require('util');
const { loadConfig } = require("../../index.js");
const { mkdir, writeFile, readFile } = require('node:fs/promises');

async function run(ctx) {
    const { sock, from, msg, getString, args } = ctx;

    if (args.length === 0 || args.length > 2) {
        await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🎭",
                title: "prefix",
                content: [
                    {
                        type: "text",
                        items: [
                            util.format(getString("generic/incorrect_syntax"), ctx.prefix, ctx.cmd)
                        ]
                    }
                ]
            })
        }, { quoted: msg });

        return;
    }

    if (args.length === 1) {
        const configFile = await readFile("./bot_config.json", "utf8");
        const config = JSON.parse(configFile);

        if (config.default_prefix === args[0]) {
            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎭",
                    title: "prefix",
                    content: [
                        {
                            type: "text",
                            items: [
                                util.format(getString("prefix/same_prefix"), ctx.prefix),
                                util.format(getString("prefix/same_prefix2"), ctx.prefix)
                            ]
                        }
                    ]
                })
            }, { quoted: msg });

            return;
        }

        config.default_prefix = args[0];

        await writeFile('./bot_config.json', JSON.stringify(config, null, 2), 'utf8');
        await loadConfig();

        await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🎭",
                title: "prefix",
                content: [
                    {
                        type: "text",
                        items: [
                            util.format(getString("prefix/changed_to_global_not_overriten"), ctx.prefix, args[0]),
                            util.format(getString("prefix/changed_to_global_not_overriten_2"))
                        ]
                    }
                ]
            })
        }, { quoted: msg });

        return;
    }

    if (args.length === 2) {
        switch (args[1]) {
            case '--specific':
            case '-s': {
                let old_prefix = ctx.prefix;

                await mkdir(`./database/${from}`, { recursive: true });
                try {
                    await writeFile(`./database/${from}/definitions.json`, JSON.stringify({ prefix: args[0] }), { flag: 'wx' });
                } catch (error) {
                    if (error.code === 'EEXIST') {
                        const existingFile = await readFile(`./database/${from}/definitions.json`, "utf8");
                        const existing_data = JSON.parse(existingFile);

                        if (existing_data.prefix === args[0]) {
                            await sock.sendMessage(from, {
                                text: await decorate({
                                    emoji: "🎭",
                                    title: "prefix",
                                    content: [
                                        {
                                            type: "text",
                                            items: [
                                                util.format(getString("prefix/same_prefix_not_global"), ctx.prefix),
                                                util.format(getString("prefix/same_prefix2_not_global"), ctx.prefix)
                                            ]
                                        }
                                    ]
                                })
                            }, { quoted: msg });

                            return;
                        }

                        old_prefix = existing_data.prefix;
                        existing_data.prefix = args[0];

                        await writeFile(`./database/${from}/definitions.json`, JSON.stringify(existing_data, null, 2), 'utf8');
                    } else {
                        throw error;
                    }
                }

                await sock.sendMessage(from, {
                    text: await decorate({
                        emoji: "🎭",
                        title: "prefix",
                        content: [
                            {
                                type: "text",
                                items: [
                                    util.format(getString("prefix/changed_to_not_global"), old_prefix, args[0]),
                                    util.format(getString("prefix/changed_to_not_global_2"))
                                ]
                            }
                        ]
                    })
                }, { quoted: msg });

                return;
            }
            case '--reset':
            case '-r': {
                let old_prefix = null;

                await mkdir(`./database/${from}`, { recursive: true });
                try {
                    await writeFile(`./database/${from}/definitions.json`, JSON.stringify({ prefix: ctx.prefix }), { flag: 'wx' });
                } catch (error) {
                    if (error.code === 'EEXIST') {
                        const existingFile = await readFile(`./database/${from}/definitions.json`, "utf8");
                        const existing_data = JSON.parse(existingFile);
                        
                        old_prefix = existing_data.prefix;

                        existing_data.prefix = ctx.prefix;

                        await writeFile(`./database/${from}/definitions.json`, JSON.stringify(existing_data, null, 2), 'utf8');
                    } else {
                        throw error;
                    }
                }
                
                let deco_reset;
                if (old_prefix !== null) {
                    deco_reset = {
                        emoji: "🎭",
                        title: "prefix",
                        content: [
                            {
                                type: "text",
                                items: [
                                    util.format(getString("prefix/changed_to_reset"), old_prefix, args[0]),
                                ]
                            }
                        ]
                    };
                } else {
                    deco_reset = {
                        emoji: "🎭",
                        title: "prefix",
                        content: [
                            {
                                type: "text",
                                items: [
                                    util.format(getString("prefix/changed_to_reset_generic"), args[0]),
                                ]
                            }
                        ]
                    };
                }

                await sock.sendMessage(from, {
                    text: await decorate(deco_reset)
                }, { quoted: msg });

                return;
            }
            default: {
                await sock.sendMessage(from, {
                    text: await decorate({
                        emoji: "🎭",
                        title: "prefix",
                        content: [
                            {
                                type: "text",
                                items: [
                                    util.format(getString("generic/incorrect_syntax"), ctx.prefix, ctx.cmd)
                                ]
                              }
                        ]
                    })
                }, { quoted: msg });

                return;
            }
        }
    }
}

module.exports = { run };