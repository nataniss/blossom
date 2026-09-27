const { decorate } = require("../../helpers/decorator.js");
const { getProp } = require("../../helpers/prop_mgr.js");
const util = require('util');
const index = require("../../index.js")


async function run(ctx) {
    const { sock, from, msg, getString, text, senderNumber } = ctx;

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

    if (index.profiles[from][senderNumber].level < 20) {
        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🌠",
                title: getString("prestige/prestige").toLowerCase(),
                content: [{
                    type: "text", items: [
                        getString("prestige/prestige_not_enough_levels")
                    ]
                }]
            })
        }, { quoted: msg })
    } else {
        return await sock.sendMessage(from, {
            text: prestige_warning
        }, { quoted: msg })
    }
}

module.exports = {
    run
}