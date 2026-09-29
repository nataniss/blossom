const { decorate } = require("../../helpers/decorator.js")
const util = require('util');

async function run(ctx) {
    const { sock, msg, from, getString, senderNumber, getBotAdminStatus, getSenderJid, getBotJid, getAdminStatus, cmd, participants } = ctx;

    const botAdmin = await getBotAdminStatus(sock, participants);
    const is_bot_admin = botAdmin === 'admin' || botAdmin === 'superadmin';

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
                emoji: "🔒",
                title: getString("close/close").toLowerCase(),
                content: [
                    {
                        type: "text",
                        padding: 1,
                        items: [
                            `${getString("close/bot_not_admin")}`
                        ]
                    }
                ]
            })
        }, { quoted: msg })
    }

    const sender_previligies = getAdminStatus(senderNumber, participants);

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
                emoji: "🔒",
                title: getString("close/close").toLowerCase(),
                content: [
                    {
                        type: "text",
                        padding: 1,
                        items: [
                            `${getString("close/not_admin")}`,
                            `${getString("close/no_action")}`
                        ]
                    }
                ]
            })
        }, { quoted: msg })
    }

    const action = (cmd === "close") ? 'announcement' : 'not_announcement'
    const emoji = (cmd === "close") ? '🔒' : '🔓'
    const action_text = (cmd === "close") ? getString("close/success") : getString("open/success")

    await sock.groupSettingUpdate(from, action);

    await sock.sendMessage(
        from,
        {
            react: {
                text: emoji,
                key: msg.key
            }
        }
    );

    await sock.sendMessage(from, { text: `${emoji} ${action_text}` }, { quoted: msg })
}

module.exports = { run }