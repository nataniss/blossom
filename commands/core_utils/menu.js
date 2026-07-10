const { decorate } = require("../../helpers/decorator.js")
const util = require('util');

async function run(ctx) {
    const { sock, from, msg, getString } = ctx;

    const categories = [
        {
            emoji: "🛠️",
            text: `*${getString("menu/utilities")}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(getString("menu/see_by"), ctx.prefix, getString("menu/utilities").toLowerCase()) },
            list_item_type: "simple_arrow"
        },
        {
            emoji: "🕹️",
            text: `*${getString("menu/entertainment")}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(getString("menu/see_by"), ctx.prefix, getString("menu/entertainment").toLowerCase()) },
            list_item_type: "simple_arrow"
        },
        {
            emoji: "📥",
            text: `*${getString("menu/downloads")}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(getString("menu/see_by"), ctx.prefix, getString("menu/downloads").toLowerCase()) },
            list_item_type: "simple_arrow"
        },
        {
            emoji: "🏆",
            text: `*${getString("menu/leveling")}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(getString("menu/see_by"), ctx.prefix, getString("menu/leveling").toLowerCase()) },
            list_item_type: "simple_arrow"
        },
        {
            emoji: "📊",
            text: `*${getString("menu/group")}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(getString("menu/see_by"), ctx.prefix, getString("menu/group").toLowerCase()) },
            list_item_type: "simple_arrow"
        },
        {
            emoji: "⚙️",
            text: `*${getString("menu/moderation")}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(getString("menu/see_by"), ctx.prefix, getString("menu/moderation").toLowerCase()) },
            list_item_type: "simple_arrow"
        },
    ]

    if (ctx.args.length === 0) {
        await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🧪",
                title: "menu",
                content: [
                    
                    {
                        type: "list_complex",
                        padding: 1,
                        items: categories
                    }
                ]
            })
        }, { quoted: msg })

        return
    }
}

module.exports = {
    run
}