const { decorate } = require("../../helpers/decorator.js")
const util = require('util');

function rateLatency(time, language) {
    if (time< 1.0) return "⚡ ⁞ " + language.ping.fast;
    if (time<= 2.5) return "🐇 ⁞ " + language.ping.average;
    if (time<= 5.0) return "⏳ ⁞ " + language.ping.slow;
    return "🐌 ⁞ " + language.ping.extremely_slow;
}

function rateTransmissionSpeed(time, language) {
    if (time < 0.3) return "⚡ ⁞ " + language.ping.fast;
    if (time <= 0.8) return "🐇 ⁞ " + language.ping.average;
    if (time <= 2.0) return "⏳ ⁞ " + language.ping.slow;
    return "🐌 ⁞ " + language.ping.extremely_slow;
}

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

    const response_latency = rateLatency(latency, language)

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
                            type: "list_complex",
                            padding: 1,
                            items: [
                                {
                                    emoji: "📡",
                                    text: `${language.ping.latency} ${latency.toFixed(2)}s`,
                                    list_item_type: "emoji_item"
                                },
                                {
                                    emoji: "📡",
                                    text: `*${latency.toFixed(2)}s (${rateLatency(latency, language)})*`,
                                    list_item_type: "emoji_arrow"
                                }
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
                            type: "list_complex",
                            padding: 1,
                            items: [
                                {
                                    emoji: "📡",
                                    text: `${language.ping.latency}`,
                                    list_item_type: "emoji_item"
                                },
                                {
                                    emoji: "📡",
                                    text: `*${latency.toFixed(2)}s (${rateLatency(latency, language)})*`,
                                    list_item_type: "emoji_arrow"
                                },
                                {
                                    emoji: "📡",
                                    text: `${language.ping.transmission_speed}`,
                                    list_item_type: "emoji_item"
                                },
                                {
                                    emoji: "📡",
                                    text: `*${((date_before - date_after) / 1000).toFixed(2)}s (${rateTransmissionSpeed((date_before - date_after) / 1000, language)})*`,
                                    list_item_type: "emoji_arrow"
                                },
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