const { decorate } = require("./decorator.js");
const { getProp } = require("./prop_mgr.js");
const util = require('util');
const index = require("../index.js")

async function run(ctx) {
    const { sock, from, msg, getString, text, senderNumber } = ctx;

    try {
        if (text.toLowerCase() === getString("prefix_message").toLowerCase()) {
            sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🎭",
                    title: getString("prefix_message").toLowerCase(),
                    content: [{ type: "text", items: [util.format(getString("prefix/its"), ctx.prefix)] }]
                })
            }, { quoted: msg })
        }
    } catch (e) {
        console.error(e)
    }

    if (!index.profiles[from]) {
        index.profiles[from] = {};
    }

    if (!index.profiles[from][senderNumber]) {
        index.profiles[from][senderNumber] = {
            messages: 0,
            username: msg.pushName || await getString("Unknown")
        }
    }

    if (await getProp("leveling", false, from)) {
        index.profiles[from][senderNumber].messages = (index.profiles[from][senderNumber].messages || 0) + 1
    }
}

module.exports = { run }