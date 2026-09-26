const index = require("../../index.js")
const { decorate } = require("../../helpers/decorator.js");
const { getProp } = require("../../helpers/prop_mgr.js");
const util = require('util');

function getGroupPosition(targetKey, obj) {
    const sortedParticipants = Object.entries(obj).sort((a, b) => {
        return b[1].messages - a[1].messages;
    });

    const index = sortedParticipants.findIndex(([key]) => key === targetKey);

    return index === -1 ? -1 : index + 1;
}

async function run(ctx) {
    const { sock, from, msg, getString, senderNumber } = ctx;

    const groupData = await sock.groupMetadata(from)
    const groupName = groupData.subject || "Unknown"

    const values = {
        messages: (index.profiles[from][senderNumber].messages || 0),
        commands: (index.profiles[from][senderNumber].commands || 0),
        currency_name: await getProp("currency", false, from),
        currency_emoji: await getProp("currency_emoji", false, from),
        currency_format: await getProp("currency_format"),
        leveling: await getProp("leveling", false, from),
        group_pos: getGroupPosition(senderNumber, index.profiles[from]),
        username: msg.pushName || "Unknown"
    }

    let group_pos_emoji = "🏅"

    if (values.group_pos < 4) {
        group_pos_emoji = ["🥇", "🥈", "🥉"][values.group_pos - 1]
    }

    await sock.sendMessage(from, {
        text: await decorate({
            emoji: "👤",
            title: getString("profile/profile").toLowerCase(),
            content: [
                {
                    type: "text",
                    padding_end: 1,
                    items: [getString("profile/your_info")]
                },
                {
                    type: "list_complex",
                    padding: 1,
                    items: [
                        {
                            emoji: "🏷️",
                            text: `*${getString("profile/name")}:* ${values.username}`,
                            list_item_type: "emoji_item"
                        },
                    ]
                },
                {
                    type: "text",
                    padding: 1,
                    items: [util.format(getString("profile/data_of_group"), groupName)]
                },
                {
                    type: "list_complex",
                    padding: 1,
                    items: [
                        {
                            emoji: "⭐",
                            text: `*${getString("profile/xp")}:* ${values.leveling ? values.messages : getString("profile/leveling_off")}`,
                            list_item_type: "emoji_item"
                        },
                        {
                            emoji: "🔌",
                            text: `*${getString("profile/commands")}:* ${values.leveling ? values.commands : getString("profile/leveling_off")}`,
                            list_item_type: "emoji_item"
                        },
                        {
                            emoji: group_pos_emoji,
                            text: `*${getString("profile/group_rank")}:* ${values.leveling ? util.format(getString("number_format"), values.group_pos) : getString("profile/leveling_off")}`,
                            list_item_type: "emoji_item"
                        }
                    ]
                },
                {
                    type: "text",
                    padding: 1,
                    items: [getString("profile/data_of_all_groups")]
                },
                {
                    type: "list_complex",
                    padding: 1,
                    items: [
                        {
                            emoji: values.currency_emoji,
                            text: `*${values.currency_name[0].toUpperCase() + values.currency_name.slice(1)}:* ${util.format(values.currency_format, -1)}`,
                            list_item_type: "emoji_item"
                        }
                    ]
                }]
        })
    }, { quoted: msg })
}

module.exports = { run }