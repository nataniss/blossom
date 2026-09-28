const { decorate } = require("./decorator.js");
const { getProp } = require("./prop_mgr.js");
const util = require('util');
const index = require("../index.js")

async function run(ctx) {
    const { sock, from, msg, getString, text, senderNumber, prefix } = ctx;

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
            commands: 0
        }
    }

    if (!index.profiles[from][senderNumber].messages) {
        index.profiles[from][senderNumber].messages = 0
    }

    if (!index.profiles[from][senderNumber].xp) {
        index.profiles[from][senderNumber].xp = 0
    }

    if (!index.profiles[from][senderNumber].commands) {
        index.profiles[from][senderNumber].xp = 0
    }

    index.profiles[from][senderNumber].messages = (index.profiles[from][senderNumber].messages || 0) + 1

    if (text.trim().startsWith(prefix)) {
        index.profiles[from][senderNumber].commands = (index.profiles[from][senderNumber].commands || 0) + 1
    }

    if (await getProp("leveling", false, from)) {
        previous_xp = (index.profiles[from][senderNumber].xp || 0)
        index.profiles[from][senderNumber].xp = (index.profiles[from][senderNumber].xp || 0) + 1

        let points_goal = await getProp("level_points_goal", false, from)

        if (await getProp("level_up_message", false, from) && Math.floor(previous_xp / points_goal) !== Math.floor((index.profiles[from][senderNumber].xp || 0) / points_goal)) {
            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🌟",
                    title: getString("level_up/level_up").toLowerCase(),
                    content: [
                        {
                            type: "text",
                            padding_end: 1,
                            items: [util.format(getString("level_up/message"), `@${senderNumber}`)]
                        },
                        {
                            type: "list_complex",
                            padding: 1,
                            items: [
                                {
                                    emoji: "🏆",
                                    text: `*${getString("level_up/level")}:* ${util.format(
                                        getString("level_up/upgrade_format"),
                                        Math.floor(previous_xp / points_goal),
                                        Math.floor((index.profiles[from][senderNumber].xp || 0) / points_goal)
                                    )}`,
                                    list_item_type: "emoji_item"
                                },
                                {
                                    emoji: "⭐",
                                    text: `*${getString("level_up/xp")}:* ${util.format(
                                        getString("level_up/upgrade_format"),
                                        previous_xp,
                                        (index.profiles[from][senderNumber].xp || 0)
                                    )}`,
                                    list_item_type: "emoji_item"
                                }
                            ]
                        },
                        {
                            type: "text",
                            padding_start: 1,
                            items: [
                                getString("level_up/footer"),
                                util.format(getString("level_up/footer_2"), `${prefix}profile`)
                            ]
                        },
                    ]
                }),
                mentions: [`${senderNumber}@s.whatsapp.net`]
            }, { quoted: msg })
        }
    }
}

module.exports = { run } 