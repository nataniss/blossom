const { decorate } = require("../../helpers/decorator.js")
const util = require('util');
const menu_definitions = require('./menu_definitions.json');
const moment = require("moment");
const humanizeDuration = require("humanize-duration");
const {
    useEnhanced
} = require("../../index.js");
const {
    getProp
} = require("../../helpers/prop_mgr.js");

async function getInfo(ctx) {

    const { getString, from, senderNumber, getAdminStatus, participants, username } = ctx;

    const role = getAdminStatus(senderNumber, participants)

    let role_string

    if (role === "admin") {
        role_string = getString("menu/admin")
    } else if (role === "superadmin") {
        role_string = getString("menu/creator")
    } else {
        role_string = getString("menu/member")
    }

    const uptime_formatted = humanizeDuration(process.uptime() * 1000, { language: getString("language_code"), round: true });
    const time = moment().format(getString("time_format"))
    const date = moment().format(getString("date_format"))

    return [
        {
            emoji: "🤖",
            text: `*${getString("menu/bot_name")}*: ${await getProp("bot_name", false, from)}`,
            list_item_type: "emoji_item"
        },
        {
            emoji: "📦",
            text: `*${getString("menu/bot_version")}*: v${await getProp("bot_version", false, from)}`,
            list_item_type: "emoji_item"
        },
        {
            emoji: "👤",
            text: `*${getString("menu/user")}*: ${username}`,
            list_item_type: "emoji_item"
        },
        {
            emoji: "💼",
            text: `*${getString("menu/group_role")}*: ${role_string}`,
            list_item_type: "emoji_item"
        },
        {
            emoji: "🗓️",
            text: `*${getString("menu/date")}*: ${date}`,
            list_item_type: "emoji_item"
        },
        {
            emoji: "⌚",
            text: `*${getString("menu/time")}*: ${time}`,
            list_item_type: "emoji_item"
        },
        {
            emoji: "⏱️",
            text: `*${getString("menu/bot_uptime")}*: ${uptime_formatted}`,
            list_item_type: "emoji_item"
        }
    ]
}

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

    const { getString, prefix, msg, sock, from, } = ctx;
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

function getMainCategoriesForRows(ctx) {
    const { getString, prefix } = ctx;

    let categories = []

    const categoriesObj = menu_definitions.main.categories;

    for (const [key, categoryData] of Object.entries(categoriesObj)) {

        categories.push({
            header: '',
            title: `${categoryData.emoji} ${getString(`menu/${key}`)}`,
            description: `╰┈➤ ${getString(`menu/${key}_description`)}`,
            id: `${prefix}menu ${getString(`menu/${key}`)}`
        });
    }

    return categories;
}

async function run(ctx) {
    const { sock, from, msg, getString, args, senderNumber, participants, getAdminStatus, prefix } = ctx;

    const useButtons = useEnhanced && (await getProp("use_buttons", false, from) === true);

    if (args.length > 0) {
        const categoryQuery = args[0];
        const categoriesObj = menu_definitions.main.categories;

        let foundCategoryKey = null;
        for (const key of Object.keys(categoriesObj)) {
            const translatedName = getString(`menu/${key}`);
            if (
                key.toLowerCase() === categoryQuery.trim().toLowerCase() ||
                (translatedName && translatedName.toLowerCase() === categoryQuery.trim().toLowerCase())
            ) {
                foundCategoryKey = key;
                break;
            }
        }


        if (foundCategoryKey && categoriesObj[foundCategoryKey].needs_admin) {
            const adminStatus = getAdminStatus(senderNumber, participants);

            if (!adminStatus || (adminStatus !== 'admin' && adminStatus !== 'superadmin')) {
                await sock.sendMessage(
                    from,
                    {
                        react: {
                            text: '❌',
                            key: msg.key
                        }
                    }
                );

                await sock.sendMessage(from, {
                    text: await decorate({
                        emoji: "🧪",
                        title: "menu",
                        content: [{ type: "text", items: [getString("menu/attention_only_admins")] }]
                    })
                }, { quoted: msg });

                return;
            }
        }
    }

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

        if (!useButtons) {

            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🧪",
                    title: "menu",
                    content: [
                        {
                            type: "list_complex",
                            padding: 1,
                            items: await getInfo(ctx)
                        },
                        {
                            type: "text",
                            padding: 1,
                            items: [util.format(getString("menu/select_category_no_btns"), prefix)]
                        },
                        {
                            type: "list_complex",
                            padding: 1,
                            items: getMainCategories(ctx)
                        }
                    ]
                })
            }, { quoted: msg });
        } else {
            await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "🧪",
                    title: "menu",
                    content: [
                        {
                            type: "list_complex",
                            padding: 1,
                            items: await getInfo(ctx)
                        }
                    ]
                }),
                footer: getString("menu/footer"),
                buttons: [{
                    text: `${getString("menu/select_a_category")}`,
                    sections: [{
                        title: `⚙️ ${getString("menu/categories")}`,
                        rows: getMainCategoriesForRows(ctx)
                    }]
                }]
            }, { quoted: msg });
        }

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

    if (!useButtons) {
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
    } else {
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
            }),
            footer: getString("menu/other_footer"),
            buttons: [{
                text: `${getString("menu/select_another_category")}`,
                sections: [{
                    title: `⚙️ ${getString("menu/categories")}`,
                    rows: getMainCategoriesForRows(ctx)
                }]
            }]
        }, { quoted: msg });
    }
    /*
                    
                    */
}

module.exports = { run }