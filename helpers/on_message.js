const { decorate } = require("./decorator.js");
const util = require('util');

async function run(ctx) {
    const { sock, from, msg, getString, text } = ctx;
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
}

module.exports = { run }