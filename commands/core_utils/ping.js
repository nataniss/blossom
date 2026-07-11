const { decorate } = require("../../helpers/decorator.js")
const util = require('util');

function rateLatency(time, getString) {
    if (time < 1.0) return "⚡ ⁞ " + getString("ping/fast");
    if (time <= 2.5) return "🐇 ⁞ " + getString("ping/average");
    if (time <= 5.0) return "⏳ ⁞ " + getString("ping/slow");
    return "🐌 ⁞ " + getString("ping/extremely_slow");
}

function rateTransmissionSpeed(time, getString) {
    if (time < 0.3) return "⚡ ⁞ " + getString("ping/fast");
    if (time <= 0.8) return "🐇 ⁞ " + getString("ping/average");
    if (time <= 2.0) return "⏳ ⁞ " + getString("ping/slow");
    return "🐌 ⁞ " + getString("ping/extremely_slow");
}

async function run(ctx) {
    const { sock, from, msg, getString } = ctx;

    await sock.sendMessage(
        from,
        {
            react: {
                text: '🏓',
                key: msg.key
            }
        }
    );

    const end = Date.now();
    const currentHour = new Date(end).getHours();
    const latency = (Date.now() - msg.messageTimestamp * 1000) / 1000;

    const greetings = [
        getString("ping/good_morning"),
        getString("ping/good_afternoon"),
        getString("ping/good_night"),
    ];

    let greeting = "";

    if (currentHour >= 6 && currentHour < 12) {
        greeting = greetings[0];
    } else if (currentHour >= 12 && currentHour < 18) {
        greeting = greetings[1];
    } else {
        greeting = greetings[2];
    }

    greeting = util.format(greeting, "@" + ctx.senderNumber);

    const response_latency = rateLatency(latency, getString);

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
                                    text: `${getString("ping/latency")} ${latency.toFixed(2)}s`,
                                    list_item_type: "emoji_item"
                                },
                                {
                                    emoji: "📡",
    
                                    text: `*${latency.toFixed(2)}s (${rateLatency(latency, getString)})*`,
                                    list_item_type: "emoji_arrow"
                                },
                                {
                                    emoji: "📡",
                                    text: `${getString("ping/transmission_speed")}`,
                                    list_item_type: "emoji_item"
                                },
                                {
                                    emoji: "📡",
                                    text: `*${getString("ping/calculating")}*`,
                                    list_item_type: "emoji_arrow"
                                },
                            ]
                        }
                    ]
                }
            ),
            mentions: [ctx.senderNumber + "@s.whatsapp.net"]
        },
        { quoted: msg }
    );

    const start = Date.now();

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
                                    text: `${getString("ping/latency")}`,
                                    list_item_type: "emoji_item"
                                },
                                {
                                    emoji: "📡",
                                    text: `*${latency.toFixed(2)}s (${rateLatency(latency, getString)})*`,
                                    list_item_type: "emoji_arrow"
                                },
                                {
                                    emoji: "📡",
                                    text: `${getString("ping/transmission_speed")}`,
                                    list_item_type: "emoji_item"
                                },
                                {
                                    emoji: "📡",
                                    text: `*${((start - end) / 1000).toFixed(2)}s (${rateTransmissionSpeed((start - end) / 1000, getString)})*`,
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