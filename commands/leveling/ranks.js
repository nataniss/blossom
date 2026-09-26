const index = require("../../index.js")
const { decorate } = require("../../helpers/decorator.js");
const { getProp } = require("../../helpers/prop_mgr.js");
const util = require('util');

function getRankName(rank, getString) {
    switch (rank) {
        case ("xp"):
            return getString("rank/ranking_xp")
        case ("desc:xp"):
            return getString("rank/ranking_desc_xp")
    }
}

async function getContent(ctx) {
    const { from, getString, args } = ctx;

    let content = [];

    if (!await getProp("leveling", false, from)) {
        content.push({
            type: "list_complex",
            padding: 1,
            items: [
                {
                    type: "simple_item",
                    text: getString("rank/leveling_off")
                }
            ]
        });

        return content
    }

    const profiles = index?.profiles?.[from];
    if (!profiles) {
        return [];
    }

let entries = Object.entries(profiles)
        .map(([key, data]) => ({
            id: key,
            messages: data.messages ?? 0,
            username: data.username ?? key
        }))
        .filter(user => user.messages > 0); // Adicionado para remover quem tem 0 mensagens

    const isDescXp = args && args[0] === "desc:xp";

    entries.sort((a, b) => {
        if (isDescXp) {
            return a.messages - b.messages;
        } else {
            return b.messages - a.messages;
        }
    });

    const max_entries = await getProp("max_rank_entries", false, from) || 10;

    entries = entries.slice(0, max_entries);


    content.push({
        type: "text",
        items: [`*${getRankName(args[0], getString)}*`]
    });

    content.push({
        type: "see_more",
        padding: 1
    });

    let listItems = [];

    entries.forEach((user, indexNumber) => {
        const position = indexNumber + 1;

        let emoji = "🏅";
        if (position === 1) emoji = "🥇";
        else if (position === 2) emoji = "🥈";
        else if (position === 3) emoji = "🥉";

        const formattedPosition = util.format(getString("number_format"), position);
        const titleText = `*${formattedPosition}:* ${user.username}`;

        const xpLabel = getString("rank/xp");
        const xpText = `*${xpLabel}*: ${user.messages}`;

        listItems.push({
            emoji: emoji,
            text: `${titleText}`,
            list_item_type: "emoji_item"
        });

        listItems.push({
            emoji: "⭐",
            text: xpText,
            list_item_type: "emoji_arrow"
        });
    });

    content.push({
        type: "list_complex",
        items: listItems
    });

    return content;
}

async function run(ctx) {
    const { sock, from, msg, getString, args, prefix, cmd } = ctx;

    const availableRankTypes = ["xp", "desc:xp"]

    if (args.length !== 1 || !availableRankTypes.includes(args[0])) {
        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "📊",
                title: getString("rank/rank").toLowerCase(),
                content: [{ type: "text", items: [util.format(getString("generic/incorrect_syntax"), prefix, cmd)] }]
            })
        }, { quoted: msg });
    }

    await sock.sendMessage(from, {
        text: await decorate({
            emoji: "📊",
            title: getString("rank/rank").toLowerCase(),
            content: await getContent(ctx)
        })
    }, { quoted: msg });
}

module.exports = { run }