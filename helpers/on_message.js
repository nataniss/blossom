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
            username: msg.pushName,
            xp: 0,
            level: 0,
            prestige: 0
        }
    }

    if (!index.profiles[from][senderNumber].prestige) {
        index.profiles[from][senderNumber].prestige = 0
    }

    if (!index.profiles[from][senderNumber].messages) {
        index.profiles[from][senderNumber].messages = 0
    }

    if (!index.profiles[from][senderNumber].xp) {
        index.profiles[from][senderNumber].xp = 0
    }

    if (!index.profiles[from][senderNumber].level) {
        index.profiles[from][senderNumber].level = 0
    }

        const prestige_warning = await decorate({
        emoji: "🌠",
        title: getString("prestige/prestige").toLowerCase(),
        content: [{
            type: "text", items: [
                util.format(getString("prestige/warning_1"), msg.pushName, util.format(await getProp("prestige_point_format", false, from), index.profiles[from][senderNumber].level - 20)),
                getString("prestige/warning_2"),
                getString("prestige/warning_3"),
                util.format(getString("prestige/warning_4"), getString("prestige/yes_message"))
            ]
        }]
    })

    const messageBody = msg.message;
    if (!messageBody) return;

    const messageType = Object.keys(messageBody)[0];
    const contextInfo = messageBody[messageType]?.contextInfo;

    if (contextInfo && contextInfo.quotedMessage) {

        const quotedMsg = contextInfo.quotedMessage;
        const quotedText = quotedMsg.conversation;

        if (quotedText === prestige_warning && ctx.text === getString("prestige/yes_message")) {

            if (index.profiles[from][senderNumber].level < 20) {
                return
            }
            
            index.profiles[from][senderNumber].prestige = index.profiles[from][senderNumber].prestige + (index.profiles[from][senderNumber].level - 20)
            index.profiles[from][senderNumber].xp = 0
            index.profiles[from][senderNumber].level = 0


            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🌠",
                    title: getString("prestige/prestige").toLowerCase(),
                    content: [{
                        type: "text", items: [
                            util.format(getString("prestige/done"), util.format(getProp("prestige_point_format"), index.profiles[from][senderNumber].level))
                        ]
                    }]
                })
            }, { quoted: msg })
        }
    }

    if (await getProp("leveling", false, from)) {
        index.profiles[from][senderNumber].messages = (index.profiles[from][senderNumber].messages || 0) + 1
        index.profiles[from][senderNumber].xp = (index.profiles[from][senderNumber].xp || 0) + (1 * (1 + (index.profiles[from][senderNumber].prestige * 0.03)))

        if (index.profiles[from][senderNumber].xp >= (index.profiles[from][senderNumber].level + 1) * 50) {
            index.profiles[from][senderNumber].level = index.profiles[from][senderNumber].level + 1
        }
    }

    console.log(index.profiles)
}

module.exports = { run } 