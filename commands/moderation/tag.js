const util = require('util');
const { decorate } = require("../../helpers/decorator.js")

async function run(ctx) {
    const { sock, msg, from, getString, senderNumber, getBotAdminStatus, getPhoneNumberFromJid, getSenderJid, getBotJid, getAdminStatus, args, participants, cmd } = ctx;

    const sender_previligies = getAdminStatus(senderNumber, participants);


    if (sender_previligies == null) {
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });

        return await sock.sendMessage(from, {
            text: await decorate({
                emoji: '🏷️',
                title: getString(`tagall/tagall`).toLowerCase(),
                content: [
                    {
                        type: "text",
                        padding: 1,
                        items: [
                            `${getString(`tagall/not_admin`)}`
                        ]
                    }
                ]
            })
        }, { quoted: msg })
    }

    const users_to_mention = participants.map(user => user.phoneNumber)

    await sock.sendMessage(from, {
        text: await decorate({
            emoji: '🏷️',
            title: getString(`tagall/tagall`).toLowerCase(),
            content: [
                {
                    type: "text",
                    padding: 1,
                    items: [
                        util.format(getString(`tagall/tag`), `@${senderNumber}`),
                        `_${(args.length === 0) ? getString("tagall/no_reason") : "“" + args.join(" ") + "”"}_`
                    ]
                }
            ]
        }), mentions: users_to_mention
    }, { quoted: msg })
}

module.exports = { run }