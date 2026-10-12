const { decorate } = require("../../helpers/decorator.js")
const util = require('util');

async function run(ctx) {
    const { sock, msg, from, getString, senderNumber, getBotAdminStatus, getPhoneNumberFromJid, getSenderJid, getBotJid, getAdminStatus, args, participants, cmd } = ctx;

    const botAdmin = await getBotAdminStatus(sock, participants);
    const is_bot_admin = botAdmin === 'admin' || botAdmin === 'superadmin';

    const messages_emoji = (cmd === "promote") ? '📈' : '📉'

    if (!is_bot_admin) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: messages_emoji,
                title: getString(`${cmd}/${cmd}`).toLowerCase(),
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: [
                            {
                                text: `${getString(`${cmd}/bot_not_admin`)}`,
                                list_item_type: "simple_item"
                            },
                            {
                                text: `${getString(`${cmd}/no_action`)}`,
                                list_item_type: "simple_item"
                            }
                        ]
                    }
                ]
            })
        }, { quoted: msg })
    }

    const sender_previligies = getAdminStatus(senderNumber, participants);

    if (sender_previligies == null) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: messages_emoji,
                title: getString(`${cmd}/${cmd}`).toLowerCase(),
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: [
                            {
                                text: `${getString(`${cmd}/not_admin`)}`,
                                list_item_type: "simple_item"
                            },
                            {
                                text: `${getString(`${cmd}/no_action`)}`,
                                list_item_type: "simple_item"
                            }
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

    let users_to_change_role = [];

    if (quotedParticipantJid) users_to_change_role.push(quotedParticipantJid);

    users_to_change_role = [...users_to_change_role, ...args]

    users_to_change_role = users_to_change_role.map(user => {
        if (user.startsWith("@")) {
            return user.split('@')[1] + "@lid";
        }
        return user;
    });

    await sock.sendMessage(from, { react: { text: '⏳', key: msg.key } });

    if (users_to_change_role.length === 0) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: messages_emoji,
                title: getString(`${cmd}/${cmd}`).toLowerCase(),
                content: [
                    {
                        type: "list_complex",
                        padding: 1,
                        items: [
                            {
                                text: `${getString(`${cmd}/no_users`)}`,
                                list_item_type: "simple_item"
                            },
                            {
                                text: `${getString(`${cmd}/no_action`)}`,
                                list_item_type: "simple_item"
                            }
                        ]
                    }
                ]
            })
        }, { quoted: msg })
    }

    let successes = 0;

    for (const user of users_to_change_role) {
        const user_data = participants.find(u => u.id === user);

        if (user === getBotJid(sock, participants)) {
            if (users_to_change_role.length == 1) {
                await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });

                return await sock.sendMessage(from, {
                    text: await decorate({
                        emoji: messages_emoji,
                        title: getString(`${cmd}/${cmd}`).toLowerCase(),
                        content: [
                            {
                                type: "list_complex",
                                padding: 1,
                                items: [
                                    {
                                        text: `${getString(`${cmd}/bot_ban`)}`,
                                        list_item_type: "simple_item"
                                    },
                                    {
                                        text: `${getString(`${cmd}/no_action`)}`,
                                        list_item_type: "simple_item"
                                    }
                                ]
                            }
                        ]
                    })
                }, { quoted: msg })
            } else {
                continue;
            }
        }

        if (user === getSenderJid(senderNumber, participants)) {
            if (users_to_change_role.length == 1) {
                await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });

                return await sock.sendMessage(from, {
                    text: await decorate({
                        emoji: messages_emoji,
                        title: getString(`${cmd}/${cmd}`).toLowerCase(),
                        content: [
                            {
                                type: "list_complex",
                                padding: 1,
                                items: [
                                    {
                                        text: `${getString(`${cmd}/yourself_${cmd}`)}`,
                                        list_item_type: "simple_item"
                                    },
                                    {
                                        text: `${getString(`${cmd}/no_action`)}`,
                                        list_item_type: "simple_item"
                                    }
                                ]
                            }
                        ]
                    })
                }, { quoted: msg })
            } else {
                continue;
            }
        }

        if (!user_data) {
            if (users_to_change_role.length === 1) {
                await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
                return await sock.sendMessage(from, { text: `⚖️ ${getString(`${cmd}/failed`)}` }, { quoted: msg });
            } else {
                continue;
            }
        }

        if (user_data.admin === 'superadmin') {
            if (users_to_change_role.length > 1) {
                continue;
            } else {
                await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });

                return await sock.sendMessage(from, {
                    text: await decorate({
                        emoji: messages_emoji,
                        title: getString(`${cmd}/${cmd}`).toLowerCase(),
                        content: [
                            {
                                type: "list_complex",
                                padding: 1,
                                items: [
                                    {
                                        text: `${getString(`${cmd}/user_is_group_creator`)}`,
                                        list_item_type: "simple_item"
                                    },
                                    {
                                        text: `${getString(`${cmd}/no_action`)}`,
                                        list_item_type: "simple_item"
                                    }
                                ]
                            }
                        ]
                    })
                }, { quoted: msg })
            }
        }

        const phoneNumber = getPhoneNumberFromJid(user, participants);
        const targetAdminStatus = getAdminStatus(phoneNumber?.replace("@s.whatsapp.net", ""), participants);

        const isValidRequirement = (cmd === "promote") ? (targetAdminStatus === null) : (targetAdminStatus === 'admin');

        if (!isValidRequirement) {
            if (users_to_change_role.length === 1) {
                await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });

                return await sock.sendMessage(from, {
                    text: await decorate({
                        emoji: messages_emoji,
                        title: getString(`${cmd}/${cmd}`).toLowerCase(),
                        content: [
                            {
                                type: "list_complex",
                                padding: 1,
                                items: [
                                    {
                                        text: `${getString(`${cmd}/invalid_requirement`)}`,
                                        list_item_type: "simple_item"
                                    },
                                    {
                                        text: `${getString(`${cmd}/no_action`)}`,
                                        list_item_type: "simple_item"
                                    }
                                ]
                            }
                        ]
                    })
                }, { quoted: msg });
            } else {
                continue;
            }
        }

        try {
            await sock.groupParticipantsUpdate(
                from,
                [user],
                cmd
            );
            successes++;
        } catch {
            // ignored
        }
    }

    if (successes >= 1) {
        await sock.sendMessage(from, { react: { text: '✅️', key: msg.key } });

        await sock.sendMessage(from, { text: `${messages_emoji} ${util.format(getString(`${cmd}/success`), successes, successes == 1 ? getString(`${cmd}/user`) : getString(`${cmd}/users`))}` }, { quoted: msg })
    } else {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });

        await sock.sendMessage(from, { text: `${messages_emoji} ${getString(`${cmd}/failed`)}` }, { quoted: msg })
    }
}

module.exports = {
    run
}