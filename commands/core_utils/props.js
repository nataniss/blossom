const { decorate } = require("../../helpers/decorator.js")
const { getProp, setProp } = require("../../helpers/prop_mgr.js");
const util = require('util');

// todo: help

function parsePrimitive(value) {
    const trimmed = value.trim();

    if (trimmed.toLowerCase() === 'true') return true;
    if (trimmed.toLowerCase() === 'false') return false;

    if (trimmed.toLowerCase() === 'null') return null;
    if (trimmed.toLowerCase() === 'undefined') return undefined;

    if (trimmed !== '' && !isNaN(trimmed)) {
        return Number(trimmed);
    }

    return value;
}


async function run(ctx) {
    const { sock, from, msg, getString, cmd, args } = ctx;

    if (cmd === "getprop") {
        if (args.length !== 1) return sock.sendMessage(from, {
            text: await decorate({
                emoji: "🎭",
                title: getString("props"),
                content: [{ type: "text", items: [util.format(getString("generic/incorrect_syntax"), ctx.prefix, cmd)] }]
            })
        }, { quoted: msg })

        let prop_global;
        let prop_local;
        let is_same = false;

        try {
            prop_global = await getProp(args[0], true);

            prop_local = await getProp(args[0], false, from);
        } catch (e) {
            if (e.message === `Property "${args[0]}" does not exist.`) {
                return sock.sendMessage(from, {
                    text: await decorate({
                        emoji: "🎭",
                        title: getString("props"),
                        content: [{ type: "text", items: [util.format(getString("getprop/non_existent"), args[0])] }]
                    })
                }, { quoted: msg })
            } else {
                throw e;
            }
        }

        if (prop_local === prop_global) {
            is_same = true;
        }

        if (is_same) {
            return sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎭",
                    title: getString("props"),
                    content: [{ type: "text", items: [util.format(getString("getprop/global_prop"), prop_global)] }]
                })
            }, { quoted: msg })
        } else {
            return sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎭",
                    title: getString("props"),
                    content: [{ type: "text", items: [util.format(getString("getprop/global_prop"), prop_global), util.format(getString("getprop/local_prop"), prop_local)] }]
                })
            }, { quoted: msg })
        }
    } else {
        const global = (args[1] === "-s") ? false : true;

        if (!global) {
            if (args.length < 3) return sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎭",
                    title: getString("props"),
                    content: [{ type: "text", items: [util.format(getString("generic/incorrect_syntax"), ctx.prefix, cmd)] }]
                })
            }, { quoted: msg })
        } else {
            if (args.length < 2) return sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎭",
                    title: getString("props"),
                    content: [{ type: "text", items: [util.format(getString("generic/incorrect_syntax"), ctx.prefix, cmd)] }]
                })
            }, { quoted: msg })
        }

        const prop_to_change = args[0]
        let change_to;

        if (args[1] === "-s") {
            change_to = args.slice(2).join(' ');
        } else {
            change_to = args.slice(1).join(' ');
        }

        const converted_value = parsePrimitive(change_to)

        try {
            if (global) {
                await setProp(prop_to_change, converted_value, true);
            } else {
                await setProp(prop_to_change, converted_value, false, from);
            }

            return sock.sendMessage(from, {
                react: {
                    text: "✅",
                    key: msg.key
                }
            })
        } catch (e) {
            if (e.message === `Property "${args[0]}" does not exist.`) {
                return sock.sendMessage(from, {
                    text: await decorate({
                        emoji: "🎭",
                        title: getString("props"),
                        content: [{ type: "text", items: [util.format(getString("setprop/non_existent"), args[0])] }]
                    })
                }, { quoted: msg })
            } else if (e.message.startsWith(`Property "${args[0]}" expects a`)) {

                const error_message = e.message.split(/\s+/)

                return sock.sendMessage(from, {
                    text: await decorate({
                        emoji: "🎭",
                        title: getString("props"),
                        content: [{ type: "text", items: [util.format(getString("setprop/type_error"), prop_to_change, error_message[4].slice(0, -1), error_message[6].slice(0, -1))] }]
                    })
                }, { quoted: msg })
            }
        }
    }
}

module.exports = { run }