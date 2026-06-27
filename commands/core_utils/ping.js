const { decorate } = require("../../helpers/decorator.js")
const util = require('util');

async function run(ctx) {
    const { sock, from, msg, language } = ctx;

    await sock.sendMessage(
        from,
        {
            react: {
                text: '🏓',
                key: msg.key
            }
        }
    );


    const date_after = Date.now()

    const currentHour = new Date(date_after).getHours();

    const latency = (Date.now() - msg.messageTimestamp * 1000) / 1000;

    const greetings = [
        language.ping.good_morning,
        language.ping.good_afernoon,
        language.ping.good_night,
    ]

    let greeting = ""

    if (currentHour >= 6 || currentHour <= 12) {
        greeting = greetings[0]
    } else if (currentHour > 12 || currentHour <= 18) {
        greeting = greetings[1]
    } else {
        greeting = greetings[2]
    }

    greeting = util.format(greeting, "@" + ctx.senderNumber)

    const ping_message = await sock.sendMessage(
        from,
        {
            text: await decorate(
                {
                    emoji: "🏓",
                    title: "ping",
                    content: [
                        {
                            type: "text",
                            padding_end: 1,
                            items: [
                                `${greeting}`
                            ]
                        },
                        {
                            type: "list",
                            padding: 1,
                            items: [
                                `📡 Latency: ${(latency).toFixed(2)}s`,
                                `📡 ${language.ping.transmission_speed} ${language.ping.calculating}`
                            ]
                        }
                    ]
                }
            ),
            mentions: [ctx.senderNumber + "@s.whatsapp.net"]
        },
        { quoted: msg }
    );

    const date_before = Date.now()

    await sock.sendMessage(
        from,
        {
            text: await decorate(
                {
                    emoji: "🏓",
                    title: "ping",
                    content: [
                        {
                            type: "text",
                            padding_end: 1,
                            items: [
                                `${greeting}`
                            ]
                        },
                        {
                            type: "list",
                            padding: 1,
                            items: [
                                `📡 ${language.ping.latency} ${latency.toFixed(2)}s`,
                                `📡 ${language.ping.transmission_speed} ${((date_before - date_after) / 1000).toFixed(2)}s`
                            ]
                        }
                    ]
                }
            ), edit: ping_message.key,
            mentions: [ctx.senderNumber + "@s.whatsapp.net"]
        },
    );
}

module.exports = { run };