const { decorate } = require("../../helpers/decorator.js")
const util = require('util');
const menu_definitions = require('./menu_definitions.json');

function getMainCategories(ctx) {
    let categories = [];

    const { getString } = ctx;

    const categoriesObj = menu_definitions.main.categories;

    for (const [key, categoryData] of Object.entries(categoriesObj)) {

        categories.push({
            emoji: categoryData.emoji,
            text: `*${getString(`menu/${key}`)}*`,
            list_item_type: "emoji_item"
        });

        const currentKey = key;
        categories.push({
            get text() {
                return util.format(
                    getString("menu/see_by"),
                    ctx.prefix,
                    getString(`menu/${currentKey}`).toLowerCase()
                );
            },
            list_item_type: "simple_arrow"
        });
    }

    return categories;
}

async function getCategory(categoryQuery, ctx) {
    if (!categoryQuery) return null;

    const { getString, prefix, msg, sock, from } = ctx;
    const categoriesObj = menu_definitions.main.categories;
    const normalizedQuery = categoryQuery.trim().toLowerCase();

    let foundCategoryKey = null;

    for (const key of Object.keys(categoriesObj)) {
        const translatedName = getString(`menu/${key}`);

        if (
            key.toLowerCase() === normalizedQuery ||
            (translatedName && translatedName.toLowerCase() === normalizedQuery)
        ) {
            foundCategoryKey = key;
            break;
        }
    }

    if (!foundCategoryKey || !menu_definitions[foundCategoryKey]) {
        return null;
    }

    await sock.sendMessage(
        from,
        {
            react: {
                text: menu_definitions.main.categories[foundCategoryKey].emoji ?? "🧪",
                key: msg.key
            }
        }
    );

    const categoryData = menu_definitions[foundCategoryKey];
    const items = [];

    for (const cmd of categoryData.commands || []) {
        const formattedAliases = cmd.aliases
            .map(alias => `${prefix}${alias}`)
            .join(', ');

        items.push({
            emoji: cmd.emoji,
            text: formattedAliases,
            list_item_type: "emoji_item"
        });
    }

    return {
        items: items,
        emoji: menu_definitions.main.categories[foundCategoryKey].emoji,
        name: foundCategoryKey
    };
}

async function run(ctx) {
    const { sock, from, msg, getString, args } = ctx;

    if (args.length === 0) {
        await sock.sendMessage(
            from,
            {
                react: {
                    text: '🧪',
                    key: msg.key
                }
            }
        );


        await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🧪",
                title: "menu",
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: getMainCategories(ctx)
                    }
                ]
            })
        }, { quoted: msg });

        return;
    }

    const categoryItems = await getCategory(args[0], ctx);

    if (!categoryItems) {
        await sock.sendMessage(from, {
            text: await decorate({
                emoji: "🧪",
                title: "menu",
                content: [{ type: "text", items: [getString("menu/error_invalid_category")] }]
            })
        }, { quoted: msg });

        return;
    }

    await sock.sendMessage(from, {
        text: await decorate({
            emoji: categoryItems.emoji ?? "🧪",
            title: "menu",
            content: [
                {
                    type: "text",
                    padding_end: 1,
                    items: [util.format(getString("menu/viewing_commands_of"), getString(`menu/${categoryItems.name}`))]
                },
                {
                    type: "list_complex",
                    padding: 1,
                    items: categoryItems.items
                }
            ]
        })
    }, { quoted: msg });
}

module.exports = {
    run
}