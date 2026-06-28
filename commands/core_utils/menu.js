const { decorate } = require("../../helpers/decorator.js")
const util = require('util');

async function run(ctx) {
    const { sock, from, msg, language } = ctx;

    const categories = [
        {
            emoji: "🛠️",
            text: `*${language.menu.utilities}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(language.menu.see_by, ctx.prefix, language.menu.utilities.toLowerCase()) },
            list_item_type: "simple_arrow"
        },
        {
            emoji: "🕹️",
            text: `*${language.menu.entertainment}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(language.menu.see_by, ctx.prefix, language.menu.entertainment.toLowerCase()) },
            list_item_type: "simple_arrow"
        },
        {
            emoji: "📥",
            text: `*${language.menu.downloads}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(language.menu.see_by, ctx.prefix, language.menu.downloads.toLowerCase()) },
            list_item_type: "simple_arrow"
        },
        {
            emoji: "🏆",
            text: `*${language.menu.leveling}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(language.menu.see_by, ctx.prefix, language.menu.leveling.toLowerCase()) },
            list_item_type: "simple_arrow"
        },
        {
            emoji: "📊",
            text: `*${language.menu.group}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(language.menu.see_by, ctx.prefix, language.menu.group.toLowerCase()) },
            list_item_type: "simple_arrow"
        },
        {
            emoji: "⚙️",
            text: `*${language.menu.moderation}*`,
            list_item_type: "emoji_item"
        },
        {
            get text() { return util.format(language.menu.see_by, ctx.prefix, language.menu.moderation.toLowerCase()) },
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
                        type: "text",
                        items: [
                            language.menu.categories_1,
                            util.format(language.menu.categories_2, ctx.prefix)
                        ]
                    },
                    {
                        type: "see_more"
                    },
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