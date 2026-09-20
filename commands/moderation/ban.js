const { decorate } = require("../../helpers/decorator.js")
const { jidNormalizedUser } = require('@whiskeysockets/baileys');
const util = require('util');

async function run(ctx) {
    const { sock, msg, from, getString, args, participants } = ctx;

    const bot_jid = sock.user.id.split(':')[0] + '@s.whatsapp.net'

    const bot = participants.find(p => p.phoneNumber === bot_jid)

    const is_bot_admin = bot?.admin === 'admin' || bot?.admin === 'superadmin'

    if (!is_bot_admin) {

        await sock.sendMessage(
            from,
            {
                react: {
                    text: '❌',
                    key: msg.key
                }
            }
        );

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "⚖️",
                title: getString("ban/ban").toLowerCase(),
                content: [
                    {
                        type: "text",
                        padding: 1,
                        items: [
                            `${getString("ban/bot_not_admin")}`,
                            `${getString("ban/no_action")}`
                        ]
                    }
                ]
            })
        }, { quoted: msg })
    }

    const sender_jid = msg.key.participant;

    const sender = participants.find(user => user.id === sender_jid)

    const sender_previligies = sender.admin ?? null

    if (sender_previligies == null) {

        await sock.sendMessage(
            from,
            {
                react: {
                    text: '❌',
                    key: msg.key
                }
            }
        );

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "⚖️",
                title: getString("ban/ban").toLowerCase(),
                content: [
                    {
                        type: "text",
                        padding: 1,
                        items: [
                            `${getString("ban/not_admin")}`,
                            `${getString("ban/no_action")}`
                        ]
                    }
                ]
            })
        }, { quoted: msg })
    }

    const messageContent = msg.message;

    const contextInfo =
        messageContent?.extendedTextMessage?.contextInfo ||
        messageContent?.imageMessage?.contextInfo ||
        messageContent?.videoMessage?.contextInfo ||
        messageContent?.audioMessage?.contextInfo;

    const quotedParticipantJid = contextInfo?.participant;

    let users_to_ban = [];

    if (quotedParticipantJid) users_to_ban.push(quotedParticipantJid);

    users_to_ban = [...users_to_ban, ...args]

    users_to_ban = users_to_ban.map(user => {
        if (user.startsWith("@")) {
            return user.split('@')[1] + "@lid";
        }
        return user;
    });

    await sock.sendMessage(
        from,
        {
            react: {
                text: '⏳',
                key: msg.key
            }
        }
    );

    if (users_to_ban.length === 0) {

        await sock.sendMessage(
            from,
            {
                react: {
                    text: '❌',
                    key: msg.key
                }
            }
        );

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: "⚖️",
                title: getString("ban/ban").toLowerCase(),
                content: [
                    {
                        type: "text",
                        padding: 1,
                        items: [
                            `${getString("ban/no_users")}`,
                            `${getString("ban/no_action")}`
                        ]
                    }
                ]
            })
        }, { quoted: msg })
    }

    successes = 0;

    for (const user of users_to_ban) {
        const user_data = participants.find(u => u.id === user)

        if (user === bot?.id) {
            if (users_to_ban.length == 1) {
                await sock.sendMessage(
                    from,
                    {
                        react: {
                            text: '❌',
                            key: msg.key
                        }
                    }
                );

                return await sock.sendMessage(from, {
                    text: await decorate({
                        emoji: "⚖️",
                        title: getString("ban/ban").toLowerCase(),
                        content: [
                            {
                                type: "text",
                                padding: 1,
                                items: [
                                    `${getString("ban/bot_ban")}`,
                                    `${getString("ban/no_action")}`
                                ]
                            }
                        ]
                    })
                }, { quoted: msg })
            } else {
                continue
            }
        }

        if (user === sender_jid) {
            if (users_to_ban.length == 1) {
                await sock.sendMessage(
                    from,
                    {
                        react: {
                            text: '❌',
                            key: msg.key
                        }
                    }
                );

                return await sock.sendMessage(from, {
                    text: await decorate({
                        emoji: "⚖️",
                        title: getString("ban/ban").toLowerCase(),
                        content: [
                            {
                                type: "text",
                                padding: 1,
                                items: [
                                    `${getString("ban/yourself_ban")}`,
                                    `${getString("ban/no_action")}`
                                ]
                            }
                        ]
                    })
                }, { quoted: msg })
            } else {
                continue
            }
        }

    if (user_data.admin === 'superadmin') {
        if (users_to_ban.length > 1) {
            continue
        } else {
            await sock.sendMessage(
                from,
                {
                    react: {
                        text: '❌',
                        key: msg.key
                    }
                }
            );

            return await sock.sendMessage(from, {
                text: await decorate({
                    emoji: "⚖️",
                    title: getString("ban/ban").toLowerCase(),
                    content: [
                        {
                            type: "text",
                            padding: 1,
                            items: [
                                `${getString("ban/user_is_group_creator")}`,
                                `${getString("ban/no_action")}`
                            ]
                        }
                    ]
                })
            }, { quoted: msg })
        }
    } else {
        try {
            await sock.groupParticipantsUpdate(
                from,
                [user],
                "remove"
            );
            successes++;
        } catch {
            // ignored
        }
    }
}

if (successes >= 1) {
    await sock.sendMessage(
        from,
        {
            react: {
                text: '✅️',
                key: msg.key
            }
        }
    );

    await sock.sendMessage(from, { text: `⚖️ ${util.format(getString("ban/banned_success"), successes, successes == 1 ? getString("ban/user") : getString("ban/users"))}` }, { quoted: msg })
} else {
    await sock.sendMessage(
        from,
        {
            react: {
                text: '❌',
                key: msg.key
            }
        }
    );

    await sock.sendMessage(from, { text: `⚖️ ${getString("ban/banned_failed")}` }, { quoted: msg })
}

}

module.exports = {
    run
}